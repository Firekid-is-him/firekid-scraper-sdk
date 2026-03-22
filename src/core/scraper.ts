import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import type { FirekidConfig, ScrapingResult, Mode } from '../types.js'
import { applyGhost } from '../ghost/index.js'
import { CloudflareManager } from '../cloudflare/cloudflare.js'
import { CommandParser } from '../engine/cmd-parser.js'
import { CommandExecutor } from '../engine/cmd-executor.js'
import { logger } from '../logger/logger.js'
import { config } from '../config.js'

export class FirekidScraper {
  private config: FirekidConfig
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private cfManager: CloudflareManager

  constructor(userConfig: FirekidConfig = {}) {
    this.config = {
      headless: userConfig.headless ?? config.browser.headless,
      bypassCloudflare: userConfig.bypassCloudflare ?? true,
      maxWorkers: userConfig.maxWorkers ?? config.browser.maxWorkers,
      timeout: userConfig.timeout ?? config.browser.timeout,
      dataDir: userConfig.dataDir ?? config.storage.dataDir,
      logLevel: userConfig.logLevel ?? config.logging.level
    }

    this.cfManager = new CloudflareManager()
  }

  async init(): Promise<void> {
    if (this.browser) return

    logger.info('Initializing Firekid Scraper...')

    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    })

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })

    await applyGhost(this.context)

    this.page = await this.context.newPage()

    logger.info('Firekid Scraper initialized')
  }

  async goto(url: string): Promise<void> {
    await this.init()
    if (!this.page) throw new Error('Page not initialized')

    logger.info(`Navigating to ${url}`)
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: this.config.timeout
    })

    if (this.config.bypassCloudflare) {
      await this.cfManager.handleCloudflare(this.page, url)
    }
  }

  async extract(url: string, selectors: Record<string, string>): Promise<any> {
    await this.goto(url)
    if (!this.page) throw new Error('Page not initialized')

    const data: Record<string, any> = {}

    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const element = await this.page.locator(selector).first()
        const text = await element.textContent()
        data[key] = text?.trim() || null
      } catch (err) {
        logger.warn(`Failed to extract ${key} with selector ${selector}`)
        data[key] = null
      }
    }

    return data
  }

  async auto(url: string): Promise<ScrapingResult> {
    await this.goto(url)
    if (!this.page) throw new Error('Page not initialized')

    logger.info('Running auto mode...')

    const { AutoMode } = await import('../modes/auto.js')
    const autoMode = new AutoMode(this.page)
    
    return await autoMode.execute(url)
  }

  async runCommandFile(filePath: string): Promise<ScrapingResult> {
    await this.init()
    if (!this.page) throw new Error('Page not initialized')

    const parser = new CommandParser()
    const cmdFile = parser.load(filePath)

    logger.info(`Executing command file: ${cmdFile.site}`)

    const executor = new CommandExecutor(this.page, cmdFile.steps[0]?.args[0] || '')
    const result = await executor.execute(cmdFile)

    return {
      success: result.success,
      data: result.extracted,
      errors: result.errors.map(e => e.error),
      timestamp: Date.now()
    }
  }

  async close(): Promise<void> {
    if (this.page) await this.page.close()
    if (this.context) await this.context.close()
    if (this.browser) await this.browser.close()
    
    this.page = null
    this.context = null
    this.browser = null

    logger.info('Firekid Scraper closed')
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
