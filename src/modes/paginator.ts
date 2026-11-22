import type { Page } from 'playwright'
import type { ScrapingResult, PaginateOptions } from '../types.js'
import { logger } from '../logger/logger.js'

export class PaginatorMode {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async execute(url: string, input: number | PaginateOptions = {}): Promise<ScrapingResult> {
    const options: PaginateOptions = typeof input === 'number' ? { maxPages: input } : input
    const maxPages = options.maxPages ?? 20
    const waitBetween = options.waitBetween ?? 0

    logger.info('[paginator] Starting pagination scraping...')

    try {
      const allData: any[] = []
      let currentPage = 1

      while (currentPage <= maxPages) {
        logger.info(`[paginator] Scraping page ${currentPage}/${maxPages}`)

        const pageData = await this.extractPageData(options.itemSelector)
        allData.push(...pageData)

        if (currentPage === maxPages) break

        const hasNext = await this.clickNextPage(options.nextSelector)

        if (!hasNext) {
          logger.info(`[paginator] Reached last page at ${currentPage}`)
          break
        }

        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          logger.warn('[paginator] Network did not go idle, continuing')
        })

        if (waitBetween > 0) {
          await this.page.waitForTimeout(waitBetween)
        }

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

  private async extractPageData(itemSelector?: string): Promise<any[]> {
    const explicit = Boolean(itemSelector)
    const selector = itemSelector || '[class*="item"], [class*="result"], [class*="product"]'

    return await this.page.evaluate(({ sel, keepAll }) => {
      const items = document.querySelectorAll(sel)
      const results: any[] = []

      for (const item of items) {
        const title = item.querySelector('h1, h2, h3, h4, [class*="title"]')?.textContent?.trim() || null
        const link = item.querySelector('a[href]')?.getAttribute('href') ?? null
        const image = item.querySelector('img[src]')?.getAttribute('src') ?? null
        const text = (item.textContent || '').replace(/\s+/g, ' ').trim() || null

        if (keepAll ? (title || link || text || image) : title) {
          results.push({ title, text, link, image })
        }
      }

      return results
    }, { sel: selector, keepAll: explicit })
  }

  private async clickNextPage(nextSelector?: string): Promise<boolean> {
    const nextSelectors = nextSelector ? [nextSelector] : [
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
