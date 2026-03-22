import type { Page } from 'playwright'
import type { ScrapingResult } from '../types.js'
import { logger } from '../logger/logger.js'

export class PaginatorMode {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async execute(url: string, maxPages: number = 20): Promise<ScrapingResult> {
    logger.info('[paginator] Starting pagination scraping...')

    try {
      const allData: any[] = []
      let currentPage = 1

      while (currentPage <= maxPages) {
        logger.info(`[paginator] Scraping page ${currentPage}/${maxPages}`)

        const pageData = await this.extractPageData()
        allData.push(...pageData)

        const hasNext = await this.clickNextPage()

        if (!hasNext) {
          logger.info(`[paginator] Reached last page at ${currentPage}`)
          break
        }

        await this.page.waitForLoadState('networkidle')
        currentPage++
      }

      return {
        success: true,
        data: {
          totalPages: currentPage,
          totalItems: allData.length,
          items: allData
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

  private async extractPageData(): Promise<any[]> {
    return await this.page.evaluate(() => {
      const items = document.querySelectorAll('[class*="item"], [class*="result"], [class*="product"]')
      const results: any[] = []

      for (const item of items) {
        const title = item.querySelector('h1, h2, h3, h4, [class*="title"]')?.textContent?.trim()
        const link = item.querySelector('a[href]')?.getAttribute('href')

        if (title) {
          results.push({ title, link })
        }
      }

      return results
    })
  }

  private async clickNextPage(): Promise<boolean> {
    const nextSelectors = [
      'a:has-text("Next")',
      'a[rel="next"]',
      '[class*="next"]',
      '[aria-label*="next" i]',
      'a:has-text(">")'
    ]

    for (const selector of nextSelectors) {
      try {
        const next = this.page.locator(selector).first()
        const count = await next.count()

        if (count > 0) {
          const isDisabled = await next.evaluate(el => {
            return el.classList.contains('disabled') || 
                   el.hasAttribute('disabled') ||
                   el.getAttribute('aria-disabled') === 'true'
          })

          if (!isDisabled) {
            await next.click()
            logger.info(`[paginator] Clicked next page with selector: ${selector}`)
            return true
          }
        }
      } catch {
        continue
      }
    }

    return false
  }

  async detectPaginationType(): Promise<string> {
    return await this.page.evaluate(() => {
      if (document.querySelector('[class*="pagination"]')) return 'numbered'
      if (document.querySelector('a[rel="next"]')) return 'next-prev'
      if (document.querySelector('[class*="load-more"]')) return 'load-more'
      
      return 'unknown'
    })
  }

  async getTotalPages(): Promise<number | null> {
    return await this.page.evaluate(() => {
      const pagination = document.querySelector('[class*="pagination"]')
      if (!pagination) return null

      const numbers = Array.from(pagination.querySelectorAll('a, span'))
        .map(el => parseInt(el.textContent || '0', 10))
        .filter(n => !isNaN(n))

      return Math.max(...numbers, 0) || null
    })
  }
}
