import type { Page } from 'playwright'
import type { ScrapingResult, Mode } from '../types.js'
import { logger } from '../logger/logger.js'
import { DownloaderMode } from './downloader.js'
import { ScrapeMode } from './scrape.js'
import { NavigatorMode } from './navigator.js'

export class AutoMode {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async execute(url: string): Promise<ScrapingResult> {
    logger.info('[auto-mode] Analyzing site...')

    const mode = await this.detectBestMode()
    logger.info(`[auto-mode] Selected mode: ${mode}`)

    let result: ScrapingResult

    switch (mode) {
      case 'downloader':
        const downloader = new DownloaderMode(this.page)
        result = await downloader.execute(url)
        break

      case 'scrape':
        const scraper = new ScrapeMode(this.page)
        result = await scraper.execute(url)
        break

      case 'navigator':
        const navigator = new NavigatorMode(this.page)
        result = await navigator.execute(url)
        break

      default:
        result = {
          success: false,
          data: {},
          errors: ['Unknown mode'],
          timestamp: Date.now()
        }
    }

    return result
  }

  private async detectBestMode(): Promise<Mode> {
    const indicators = await this.page.evaluate(() => {
      const hasDownloadButton = !!document.querySelector('a[download], button:has-text("Download")')
      const hasVideoPlayer = !!document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]')
      const hasFileLinks = !!document.querySelector('a[href$=".mp4"], a[href$=".pdf"], a[href$=".zip"]')
      
      const hasPagination = !!document.querySelector('.pagination, .next, [class*="page-"]')
      const hasInfiniteScroll = document.body.scrollHeight > window.innerHeight * 3
      
      const hasForm = !!document.querySelector('form')
      const hasSearch = !!document.querySelector('input[type="search"], input[placeholder*="search"]')
      
      return {
        hasDownloadButton,
        hasVideoPlayer,
        hasFileLinks,
        hasPagination,
        hasInfiniteScroll,
        hasForm,
        hasSearch
      }
    })

    if (indicators.hasDownloadButton || indicators.hasVideoPlayer || indicators.hasFileLinks) {
      return 'downloader'
    }

    if (indicators.hasPagination || indicators.hasInfiniteScroll) {
      return 'scrape'
    }

    return 'navigator'
  }
}
