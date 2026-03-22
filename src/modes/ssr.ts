import type { Page } from 'playwright'
import type { ScrapingResult } from '../types.js'
import { logger } from '../logger/logger.js'

export class SSRMode {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async execute(url: string): Promise<ScrapingResult> {
    logger.info('[ssr-mode] Scraping server-side rendered app...')

    try {
      await this.waitForHydration()

      const data = await this.extractAfterHydration()

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

  private async waitForHydration(): Promise<void> {
    logger.info('[ssr-mode] Waiting for client-side hydration...')

    await this.page.waitForLoadState('networkidle')

    await this.page.waitForFunction(() => {
      const hasReact = !!(window as any).React || !!document.querySelector('[data-reactroot]')
      const hasVue = !!(window as any).__VUE__ || !!document.querySelector('[data-v-]')
      
      return hasReact || hasVue || document.readyState === 'complete'
    }, { timeout: 10000 }).catch(() => {
      logger.warn('[ssr-mode] Hydration detection timed out, continuing anyway')
    })

    await this.page.waitForTimeout(2000)

    logger.info('[ssr-mode] Hydration complete')
  }

  private async extractAfterHydration(): Promise<any> {
    return await this.page.evaluate(() => {
      const data: any = {}

      data.title = document.querySelector('h1')?.textContent?.trim()

      const main = document.querySelector('main, [role="main"], #root, #app')
      if (main) {
        data.content = Array.from(main.querySelectorAll('p'))
          .map(p => p.textContent?.trim())
          .filter(Boolean)
      }

      data.links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          text: (a as HTMLAnchorElement).textContent?.trim(),
          href: (a as HTMLAnchorElement).href
        }))
        .slice(0, 50)

      return data
    })
  }

  async detectFramework(): Promise<string> {
    return await this.page.evaluate(() => {
      if ((window as any).React || document.querySelector('[data-reactroot]')) return 'React'
      if ((window as any).__VUE__ || document.querySelector('[data-v-]')) return 'Vue'
      if ((window as any).angular || (window as any).ng) return 'Angular'
      if ((window as any).__NUXT__) return 'Nuxt'
      if ((window as any).__NEXT_DATA__) return 'Next.js'
      
      return 'Unknown'
    })
  }
}
