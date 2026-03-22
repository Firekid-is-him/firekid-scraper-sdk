import { chromium, type Browser, type BrowserContext } from 'playwright'
import { applyGhost } from '../ghost/index.js'
import { logger } from '../logger/logger.js'
import type { Seed } from '../types.js'

export class BrowserManager {
  private browsers: Map<string, Browser> = new Map()
  private contexts: Map<string, BrowserContext> = new Map()

  async launch(id: string = 'default', headless: boolean = true): Promise<Browser> {
    if (this.browsers.has(id)) {
      return this.browsers.get(id)!
    }

    logger.info(`[browser-manager] Launching browser: ${id}`)

    const browser = await chromium.launch({
      headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    })

    this.browsers.set(id, browser)
    return browser
  }

  async createContext(browserId: string = 'default', seed?: Seed): Promise<BrowserContext> {
    const browser = this.browsers.get(browserId)
    
    if (!browser) {
      throw new Error(`Browser ${browserId} not found`)
    }

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })

    await applyGhost(context, { seed })

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
