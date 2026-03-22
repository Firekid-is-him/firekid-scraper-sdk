import type { Page } from 'playwright'
import type { Mode } from '../types.js'
import { DOMAnalyzer } from './dom-analyzer.js'
import { FlowDetector } from './flow-detector.js'
import { logger } from '../logger/logger.js'

export class StrategyMatcher {
  private domAnalyzer: DOMAnalyzer
  private flowDetector: FlowDetector

  constructor() {
    this.domAnalyzer = new DOMAnalyzer()
    this.flowDetector = new FlowDetector()
  }

  async findBestStrategy(page: Page, url: string): Promise<Mode> {
    logger.info('[strategy-matcher] Finding best scraping strategy...')

    const dom = await this.domAnalyzer.analyze(page)
    const flows = await this.flowDetector.detect(page)
    const isSPA = await this.domAnalyzer.detectSPA(page)

    const strategy = this.matchStrategy(url, dom, flows, isSPA)
    
    logger.info(`[strategy-matcher] Selected strategy: ${strategy}`)
    
    return strategy
  }

  private matchStrategy(url: string, dom: any, flows: string[], isSPA: boolean): Mode {
    if (this.isVideoSite(url)) return 'downloader'
    if (this.isFileSite(url)) return 'downloader'
    if (dom.videos > 0 || dom.forms === 0 && flows.includes('pagination')) return 'downloader'

    if (flows.includes('pagination') || flows.includes('infinite-scroll')) {
      return 'scrape'
    }

    if (flows.includes('search') && dom.links > 20) {
      return 'navigator'
    }

    if (isSPA) {
      return 'ssr'
    }

    if (dom.tables > 0) {
      return 'scrape'
    }

    return 'auto'
  }

  private isVideoSite(url: string): boolean {
    const videoSites = ['youtube.com', 'vimeo.com', 'dailymotion.com', 'twitch.tv']
    return videoSites.some(site => url.includes(site))
  }

  private isFileSite(url: string): boolean {
    const fileSites = ['mediafire.com', 'mega.nz', 'dropbox.com', 'drive.google.com']
    return fileSites.some(site => url.includes(site))
  }

  async suggestSelectors(page: Page, contentType: string): Promise<Record<string, string>> {
    const selectors: Record<string, string> = {}

    if (contentType === 'product') {
      const productSelectors = await page.evaluate(() => {
        const result: Record<string, string> = {}

        const title = document.querySelector('h1, [class*="title"], [class*="name"]')
        if (title) result.title = 'h1'

        const price = document.querySelector('[class*="price"]')
        if (price) result.price = '[class*="price"]'

        const image = document.querySelector('[class*="product"] img, [class*="image"] img')
        if (image) result.image = '[class*="product"] img'

        const description = document.querySelector('[class*="description"], [class*="detail"]')
        if (description) result.description = '[class*="description"]'

        return result
      })

      return productSelectors
    }

    if (contentType === 'article') {
      const articleSelectors = await page.evaluate(() => {
        const result: Record<string, string> = {}

        const title = document.querySelector('h1, article h1')
        if (title) result.title = 'h1'

        const author = document.querySelector('[class*="author"], [rel="author"]')
        if (author) result.author = '[class*="author"]'

        const content = document.querySelector('article, [class*="content"]')
        if (content) result.content = 'article'

        const date = document.querySelector('time, [class*="date"]')
        if (date) result.date = 'time'

        return result
      })

      return articleSelectors
    }

    return selectors
  }
}
