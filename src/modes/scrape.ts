import type { Page } from 'playwright'
import type { ScrapingResult } from '../types.js'
import { logger } from '../logger/logger.js'

export class ScrapeMode {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async execute(url: string): Promise<ScrapingResult> {
    logger.info('[scrape-mode] Extracting content...')

    try {
      const data = await this.extractContent()

      return {
        success: true,
        data,
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

  private async extractContent(): Promise<any> {
    return await this.page.evaluate(() => {
      const result: any = {}

      const title = document.querySelector('h1')?.textContent?.trim()
      if (title) result.title = title

      const description = document.querySelector('meta[name="description"]')?.getAttribute('content')
      if (description) result.description = description

      const images = Array.from(document.querySelectorAll('img[src]'))
        .map(img => (img as HTMLImageElement).src)
        .filter(Boolean)
      if (images.length > 0) result.images = images

      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          text: (a as HTMLAnchorElement).textContent?.trim(),
          href: (a as HTMLAnchorElement).href
        }))
        .filter(l => l.text && l.href)
      if (links.length > 0) result.links = links

      const paragraphs = Array.from(document.querySelectorAll('p'))
        .map(p => p.textContent?.trim())
        .filter(Boolean)
      if (paragraphs.length > 0) result.content = paragraphs

      return result
    })
  }
}
