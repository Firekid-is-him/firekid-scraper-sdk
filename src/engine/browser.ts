import { chromium, type Browser, type BrowserContext } from 'playwright'
import { applyGhost } from '../ghost/index.js'
import { getNewSeed, buildUserAgent, buildViewport } from '../ghost/seed.js'
import { logger } from '../logger/logger.js'
import { config } from '../config.js'
import type { Seed } from '../types.js'

export class BrowserManager {
  private browsers: Map<string, Browser> = new Map()
  private contexts: Map<string, BrowserContext> = new Map()

  async launch(id: string = 'default', headless: boolean = true): Promise<Browser> {
    if (this.browsers.has(id)) {
      return this.browsers.get(id)!
    }

    logger.info(`[browser-manager] Launching browser: ${id}`)

    const args = ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage']
    if (config.browser.noSandbox) args.push('--no-sandbox')

    const browser = await chromium.launch({ headless, args })

    this.browsers.set(id, browser)
    return browser
  }

  async createContext(browserId: string = 'default', seed?: Seed): Promise<BrowserContext> {
    const browser = this.browsers.get(browserId)
    
    if (!browser) {
      throw new Error(`Browser ${browserId} not found`)
    }

    const identity = seed ?? getNewSeed()

    const context = await browser.newContext({
      viewport: buildViewport(identity),
      userAgent: buildUserAgent(identity)
    })

    await applyGhost(context, { seed: identity })

    const contextId = `${browserId}-context-${Date.now()}`
    this.contexts.set(contextId, context)

    logger.info(`[browser-manager] Created context: ${contextId}`)

    return context
  }

  async close(id: string): Promise<void> {
    const browser = this.browsers.get(id)
    
    if (browser) {
      await browser.close()
      this.browsers.delete(id)
      logger.info(`[browser-manager] Closed browser: ${id}`)
    }
  }

  async closeAll(): Promise<void> {
    for (const [id, context] of this.contexts) {
      await context.close()
      logger.info(`[browser-manager] Closed context: ${id}`)
    }
    this.contexts.clear()

    for (const [id, browser] of this.browsers) {
      await browser.close()
      logger.info(`[browser-manager] Closed browser: ${id}`)
    }
    this.browsers.clear()

    logger.info('[browser-manager] All browsers closed')
  }

  getBrowser(id: string = 'default'): Browser | undefined {
    return this.browsers.get(id)
  }

  listBrowsers(): string[] {
    return Array.from(this.browsers.keys())
  }

  listContexts(): string[] {
    return Array.from(this.contexts.keys())
  }
}
