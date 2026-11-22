import path from 'path'
import { chromium, type Browser, type BrowserContext, type Page, type Locator, type LaunchOptions } from 'playwright'
import type {
  FirekidConfig,
  ScrapingResult,
  ScrapeOptions,
  PaginateOptions,
  InfiniteScrollOptions,
  Mode,
  CmdFile
} from '../types.js'
import { applyGhost } from '../ghost/index.js'
import { getNewSeed, getSeedForSite, buildUserAgent, buildViewport, alignSeedToBrowser } from '../ghost/seed.js'
import { CloudflareManager } from '../cloudflare/cloudflare.js'
import { CommandParser } from '../engine/cmd-parser.js'
import { CommandExecutor, type CommandExecutorOptions } from '../engine/cmd-executor.js'
import { PluginLoader } from '../engine/plugin-loader.js'
import { RateLimiter } from '../engine/ratelimiter.js'
import { ProxyManager } from '../network/proxy.js'
import { logger } from '../logger/logger.js'
import { config } from '../config.js'

interface ResolvedConfig {
  headless: boolean
  bypassCloudflare: boolean
  useGhost: boolean
  browserArgs: string[]
  maxWorkers: number
  timeout: number
  selectorTimeout: number
  dataDir: string
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  userAgent?: string
  viewport?: { width: number; height: number }
  proxy?: string
  urlGuard?: (url: string) => Promise<void> | void
}

function hostOf(url?: string): string | undefined {
  if (!url) return undefined

  try {
    return new URL(url).hostname || undefined
  } catch {
    return undefined
  }
}

export class FirekidScraper {
  private config: ResolvedConfig
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private cfManager: CloudflareManager
  private rateLimiter: RateLimiter | null
  private plugins: PluginLoader | null = null
  private initPromise: Promise<void> | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private lastStatus: number | null = null

  constructor(userConfig: FirekidConfig = {}) {
    this.config = {
      headless: userConfig.headless ?? config.browser.headless,
      bypassCloudflare: userConfig.bypassCloudflare ?? config.cloudflare.bypass !== 'skip',
      useGhost: userConfig.useGhost ?? true,
      browserArgs: userConfig.browserArgs ?? [],
      maxWorkers: userConfig.maxWorkers ?? config.browser.maxWorkers,
      timeout: userConfig.timeout ?? config.browser.timeout,
      selectorTimeout: userConfig.selectorTimeout ?? 5000,
      dataDir: userConfig.dataDir ?? config.storage.dataDir,
      logLevel: userConfig.logLevel ?? config.logging.level,
      userAgent: userConfig.userAgent,
      viewport: userConfig.viewport,
      proxy: userConfig.proxy ?? (config.proxy.enabled && config.proxy.url ? config.proxy.url : undefined),
      urlGuard: userConfig.urlGuard
    }

    const limit = userConfig.rateLimit
    this.rateLimiter = limit?.enabled
      ? new RateLimiter(limit.max ?? 100, limit.window ?? 60000)
      : null

    this.cfManager = new CloudflareManager()
  }

  async init(url?: string): Promise<void> {
    if (this.browser) return

    if (!this.initPromise) {
      this.initPromise = this.launch(url).finally(() => {
        this.initPromise = null
      })
    }

    await this.initPromise
  }

  private async launch(url?: string): Promise<void> {
    logger.info('Initializing Firekid Scraper...')

    const args = ['--disable-blink-features=AutomationControlled', ...this.config.browserArgs]
    if (config.browser.noSandbox) args.push('--no-sandbox')

    const launchOptions: LaunchOptions = {
      headless: this.config.headless,
      args
    }

    if (this.config.proxy) {
      launchOptions.proxy = ProxyManager.parse(this.config.proxy)
    }

    const browser = await chromium.launch(launchOptions)

    try {
      const seed = this.config.useGhost
        ? alignSeedToBrowser(this.pickSeed(url), browser.version())
        : null

      const userAgent = this.config.userAgent ?? (seed ? buildUserAgent(seed) : undefined)

      const context = await browser.newContext({
        viewport: this.config.viewport ?? (seed ? buildViewport(seed) : { width: 1920, height: 1080 }),
        userAgent
      })

      if (seed) {
        await applyGhost(context, { seed, userAgent })
      }

      const guard = this.config.urlGuard
      if (guard) {
        await context.route('**/*', async (route) => {
          const request = route.request()

          if (!request.isNavigationRequest()) {
            await route.continue()
            return
          }

          try {
            await guard(request.url())
            await route.continue()
          } catch (err) {
            logger.warn(`Blocked navigation to ${request.url()}: ${(err as Error).message}`)
            await route.abort('blockedbyclient')
          }
        })
      }

      this.browser = browser
      this.context = context
      this.page = await context.newPage()
    } catch (err) {
      await browser.close().catch(() => undefined)
      throw err
    }

    logger.info('Firekid Scraper initialized')
  }

  private pickSeed(url?: string) {
    const host = hostOf(url)
    return host ? getSeedForSite(host) : getNewSeed()
  }

  private requirePage(): Page {
    if (!this.page) throw new Error('Page not initialized')
    return this.page
  }

  private async throttle(url: string): Promise<void> {
    if (!this.rateLimiter) return
    await this.rateLimiter.waitForSlot(hostOf(url) ?? 'default')
  }

  /*
   * One scraper owns one page, so calls that drive it run one after another.
   * Use separate FirekidScraper instances for parallel work.
   */
  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task)
    this.queue = run.catch(() => undefined)
    return run
  }

  async goto(url: string): Promise<void> {
    await this.serialize(() => this.navigate(url))
  }

  private async navigate(url: string): Promise<void> {
    await this.init(url)
    const page = this.requirePage()

    if (this.config.urlGuard) {
      await this.config.urlGuard(url)
    }

    await this.throttle(url)

    logger.info(`Navigating to ${url}`)
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: this.config.timeout
    })

    this.lastStatus = response && !response.headers()['cf-mitigated'] ? response.status() : null

    if (this.config.bypassCloudflare) {
      await this.cfManager.handleCloudflare(page, url)
    }
  }

  private async readValue(locator: Locator, attribute?: string): Promise<string | null> {
    const timeout = this.config.selectorTimeout

    if (attribute) {
      return await locator.getAttribute(attribute, { timeout })
    }

    const text = await locator.textContent({ timeout })
    return text?.trim() || null
  }

  private async readSelectors(
    selectors: Record<string, string>,
    options: { attribute?: string; multiple?: boolean }
  ): Promise<{ data: Record<string, any>; errors: string[] }> {
    const page = this.requirePage()
    const errors: string[] = []

    const entries = await Promise.all(
      Object.entries(selectors).map(async ([key, selector]): Promise<[string, any]> => {
        try {
          const locator = page.locator(selector)

          if (options.multiple) {
            await locator.first().waitFor({ state: 'attached', timeout: this.config.selectorTimeout })
            const handles = await locator.all()
            const values = await Promise.all(handles.map(h => this.readValue(h, options.attribute)))
            return [key, values]
          }

          return [key, await this.readValue(locator.first(), options.attribute)]
        } catch (err) {
          logger.warn(`Failed to extract ${key} with selector ${selector}`)
          errors.push(`${key}: ${(err as Error).message.split('\n')[0]}`)
          return [key, options.multiple ? [] : null]
        }
      })
    )

    return { data: Object.fromEntries(entries), errors }
  }

  async extract(url: string, selectors: Record<string, string>): Promise<any> {
    return await this.serialize(async () => {
      await this.navigate(url)

      const { data } = await this.readSelectors(selectors, {})
      return data
    })
  }

  async scrape(url: string, options: ScrapeOptions): Promise<ScrapingResult> {
    const selectors = options?.selectors

    if (!selectors || typeof selectors !== 'object' || Array.isArray(selectors) || Object.keys(selectors).length === 0) {
      throw new Error('scrape() needs options.selectors, an object of name to CSS selector')
    }

    return await this.serialize(async () => {
      await this.navigate(url)
      const page = this.requirePage()

      const { data, errors } = await this.readSelectors(selectors, {
        attribute: options.attribute,
        multiple: options.multiple
      })

      if (this.lastStatus !== null && this.lastStatus >= 400) {
        errors.push(`HTTP ${this.lastStatus} for ${url}`)
      }

      if (options.screenshot) {
        const target = typeof options.screenshot === 'string'
          ? options.screenshot
          : `screenshot-${Date.now()}.png`

        await page.screenshot({ path: target, fullPage: true })
        data.screenshot = target
      }

      return {
        success: errors.length === 0,
        data,
        errors,
        timestamp: Date.now()
      }
    })
  }

  async auto(url: string): Promise<ScrapingResult> {
    return await this.runMode(url, 'auto')
  }

  async runMode(url: string, mode: Mode): Promise<ScrapingResult> {
    return await this.serialize(async () => {
      await this.navigate(url)
      const page = this.requirePage()
      const validateUrl = this.config.urlGuard

      logger.info(`Running ${mode} mode...`)

      switch (mode) {
        case 'auto': {
          const { AutoMode } = await import('../modes/auto.js')
          return await new AutoMode(page, { validateUrl }).execute(url)
        }
        case 'downloader': {
          const { DownloaderMode } = await import('../modes/downloader.js')
          return await new DownloaderMode(page, { validateUrl }).execute(url)
        }
        case 'scrape': {
          const { ScrapeMode } = await import('../modes/scrape.js')
          return await new ScrapeMode(page).execute(url)
        }
        case 'navigator': {
          const { NavigatorMode } = await import('../modes/navigator.js')
          return await new NavigatorMode(page).execute(url)
        }
        case 'ssr': {
          const { SSRMode } = await import('../modes/ssr.js')
          return await new SSRMode(page).execute(url)
        }
        case 'api-hunter': {
          const { APIHunterMode } = await import('../modes/api-hunter.js')
          return await new APIHunterMode(page).execute(url)
        }
        default:
          throw new Error(`Unknown mode: ${mode}`)
      }
    })
  }

  async paginate(url: string, nextSelector?: string, options: PaginateOptions = {}): Promise<ScrapingResult> {
    return await this.serialize(async () => {
      await this.navigate(url)
      const page = this.requirePage()

      const { PaginatorMode } = await import('../modes/paginator.js')
      return await new PaginatorMode(page).execute(url, {
        ...options,
        nextSelector: nextSelector ?? options.nextSelector
      })
    })
  }

  async infiniteScroll(url: string, options: InfiniteScrollOptions = {}): Promise<ScrapingResult> {
    return await this.serialize(async () => {
      await this.navigate(url)
      const page = this.requirePage()

      const { InfiniteScrollMode } = await import('../modes/infinite-scroll.js')
      return await new InfiniteScrollMode(page).execute(url, options)
    })
  }

  async runCommandFile(filePath: string, options: CommandExecutorOptions = {}): Promise<ScrapingResult> {
    const parser = new CommandParser()
    const cmdFile = parser.load(filePath)

    return await this.executeCommands(cmdFile, options)
  }

  async runCommands(script: string, options: CommandExecutorOptions = {}): Promise<ScrapingResult> {
    const parser = new CommandParser()
    const cmdFile = parser.parse(script, 'inline.cmd')

    return await this.executeCommands(cmdFile, options)
  }

  private async executeCommands(cmdFile: CmdFile, options: CommandExecutorOptions): Promise<ScrapingResult> {
    const firstGoto = cmdFile.steps.find(s => s.action === 'GOTO')?.args[0]

    return await this.serialize(async () => {
      await this.init(firstGoto)
      const page = this.requirePage()

      logger.info(`Executing command file: ${cmdFile.site}`)

      const executor = new CommandExecutor(page, firstGoto || '', {
        validateUrl: this.config.urlGuard,
        selectorTimeout: this.config.selectorTimeout,
        ...options
      })
      const result = await executor.execute(cmdFile)

      return {
        success: result.success,
        data: result.extracted,
        errors: result.errors.map(e => e.error),
        timestamp: Date.now()
      }
    })
  }

  async loadPlugin(filePath: string): Promise<void> {
    if (!this.plugins) this.plugins = new PluginLoader()
    await this.plugins.loadPlugin(path.resolve(filePath), { throwOnError: true })
  }

  async runPlugin(name: string, options: Record<string, unknown> = {}): Promise<any> {
    if (!this.plugins) throw new Error('No plugins loaded')

    const page = this.requirePage()
    return await this.plugins.executePlugin(name, { page, scraper: this, ...options })
  }

  async close(): Promise<void> {
    const errors: Error[] = []

    await this.queue.catch(() => undefined)

    if (this.initPromise) {
      await this.initPromise.catch(() => undefined)
    }

    if (this.page) {
      try {
        await this.page.close()
      } catch (err) {
        errors.push(err as Error)
        logger.warn(`Failed to close page: ${(err as Error).message}`)
      }
    }

    if (this.context) {
      try {
        await this.context.close()
      } catch (err) {
        errors.push(err as Error)
        logger.warn(`Failed to close context: ${(err as Error).message}`)
      }
    }

    if (this.browser) {
      try {
        await this.browser.close()
      } catch (err) {
        errors.push(err as Error)
        logger.warn(`Failed to close browser: ${(err as Error).message}`)
      }
    }

    this.page = null
    this.context = null
    this.browser = null

    if (errors.length > 0) {
      logger.error(`Firekid Scraper closed with ${errors.length} error(s)`)
    } else {
      logger.info('Firekid Scraper closed')
    }
  }

  getPage(): Page | null {
    return this.page
  }

  getBrowser(): Browser | null {
    return this.browser
  }

  getContext(): BrowserContext | null {
    return this.context
  }
}
