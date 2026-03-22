import type { Page } from 'playwright'
import type { ScrapingResult } from '../types.js'
import { logger } from '../logger/logger.js'

export class NavigatorMode {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async execute(url: string): Promise<ScrapingResult> {
    logger.info('[navigator-mode] Mapping site structure...')

    try {
      const siteMap = await this.buildSiteMap()

      return {
        success: true,
        data: siteMap,
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

  private async buildSiteMap(): Promise<any> {
    const currentUrl = this.page.url()

    const structure = await this.page.evaluate(() => {
      const nav = document.querySelector('nav')
      const menu = document.querySelector('[class*="menu"]')
      const header = document.querySelector('header')

      const navLinks = nav || menu || header

      const links: Array<{ text: string; href: string }> = []

      if (navLinks) {
        const anchors = navLinks.querySelectorAll('a[href]')
        for (const a of anchors) {
          const text = (a as HTMLAnchorElement).textContent?.trim()
          const href = (a as HTMLAnchorElement).href
          if (text && href) {
            links.push({ text, href })
          }
        }
      }

      return {
        title: document.title,
        url: window.location.href,
        navigation: links,
        sections: Array.from(document.querySelectorAll('section, article')).length
      }
    })

    return structure
  }
}
