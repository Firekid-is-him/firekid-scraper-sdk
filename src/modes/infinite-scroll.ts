import type { Page } from 'playwright'
import type { ScrapingResult } from '../types.js'
import { logger } from '../logger/logger.js'

export class InfiniteScrollMode {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async execute(url: string, maxScrolls: number = 50): Promise<ScrapingResult> {
    logger.info('[infinite-scroll] Starting infinite scroll scraping...')

    try {
      const scrollCount = await this.scrollToBottom(maxScrolls)

      const data = await this.extractAllContent()

      return {
        success: true,
        data: {
          scrolls: scrollCount,
          items: data
        },
        errors: [],
        timestamp: Date.now()
      }
    } catch (err: any) {
      return {
        success: false,
        data: {},
        errors: [err.message],
        timestamp: Date.now()
      }
    }
  }

  private async scrollToBottom(maxScrolls: number): Promise<number> {
    let previousHeight = 0
    let scrollCount = 0
    let noChangeCount = 0

    while (scrollCount < maxScrolls) {
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight)

      if (currentHeight === previousHeight) {
        noChangeCount++
        if (noChangeCount >= 3) {
          logger.info(`[infinite-scroll] No more content after ${scrollCount} scrolls`)
          break
        }
      } else {
        noChangeCount = 0
      }

      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })

      await this.page.waitForTimeout(1000)

      const loadingIndicator = await this.page.locator('[class*="loading"], [class*="spinner"]').count()
      if (loadingIndicator > 0) {
        await this.page.waitForTimeout(2000)
      }

      previousHeight = currentHeight
      scrollCount++

      logger.info(`[infinite-scroll] Scroll ${scrollCount}/${maxScrolls}`)
    }

    return scrollCount
  }

  private async extractAllContent(): Promise<any[]> {
    return await this.page.evaluate(() => {
      const items = document.querySelectorAll('[class*="item"], [class*="post"], [class*="card"]')
      const results: any[] = []

      for (const item of items) {
        const title = item.querySelector('h1, h2, h3, h4')?.textContent?.trim()
        const link = item.querySelector('a[href]')?.getAttribute('href')
        const image = item.querySelector('img[src]')?.getAttribute('src')

        if (title || link) {
          results.push({ title, link, image })
        }
      }

      return results
    })
  }

  async detectScrollTrigger(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const loadMore = document.querySelector('[class*="load-more"], [class*="show-more"]')
      if (loadMore) {
        return loadMore.className
      }
      return null
    })
  }
}
