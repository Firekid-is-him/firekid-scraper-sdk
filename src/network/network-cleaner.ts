import type { Page } from 'playwright'
import { logger } from '../logger/logger.js'

export class NetworkCleaner {
  async removeTraces(page: Page): Promise<void> {
    await page.evaluate(() => {
      delete (window as any).__playwright
      delete (window as any).__pw_manual
      delete (window as any).__PW_inspect
    })

    logger.debug('[network-cleaner] Removed Playwright traces')
  }

  async cleanHeaders(page: Page): Promise<void> {
    await page.route('**/*', async (route) => {
      const headers = route.request().headers()
      
      delete headers['sec-fetch-site']
      delete headers['sec-fetch-mode']
      delete headers['sec-fetch-dest']
      
      await route.continue({ headers })
    })

    logger.debug('[network-cleaner] Cleaned suspicious headers')
  }

  async blockTrackers(page: Page): Promise<void> {
    const trackers = [
      '*google-analytics.com*',
      '*googletagmanager.com*',
      '*doubleclick.net*',
      '*facebook.com/tr*',
      '*hotjar.com*',
      '*mixpanel.com*'
    ]

    for (const tracker of trackers) {
      await page.route(tracker, route => route.abort())
    }

    logger.debug('[network-cleaner] Blocked analytics trackers')
  }

  async optimizeRequests(page: Page): Promise<void> {
    const blocklist = ['image', 'font', 'media']
    
    await page.route('**/*', async (route) => {
      const type = route.request().resourceType()
      
      if (blocklist.includes(type)) {
        await route.abort()
      } else {
        await route.continue()
      }
    })

    logger.debug('[network-cleaner] Optimized network requests')
  }
}
