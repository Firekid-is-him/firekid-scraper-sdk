import type { Page } from 'playwright'
import type { ScrapingResult } from '../types.js'
import { logger } from '../logger/logger.js'

export class APIHunterMode {
  private page: Page
  private capturedAPIs: Map<string, any> = new Map()

  constructor(page: Page) {
    this.page = page
  }

  async execute(url: string): Promise<ScrapingResult> {
    logger.info('[api-hunter] Hunting for API calls...')

    try {
      await this.interceptAPICalls()

      await this.triggerInteractions()

      await this.page.waitForTimeout(3000)

      const apis = Array.from(this.capturedAPIs.values())

      return {
        success: true,
        data: {
          totalAPIs: apis.length,
          apis
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

  private async interceptAPICalls(): Promise<void> {
    this.page.on('response', async (response) => {
      const url = response.url()
      const contentType = response.headers()['content-type'] || ''

      if (contentType.includes('application/json') || url.includes('/api/')) {
        try {
          const data = await response.json()
          
          this.capturedAPIs.set(url, {
            url,
            method: response.request().method(),
            status: response.status(),
            headers: response.headers(),
            data,
            timestamp: Date.now()
          })

          logger.info(`[api-hunter] Captured API: ${response.request().method()} ${url}`)
        } catch {
          logger.debug(`[api-hunter] Non-JSON API response: ${url}`)
        }
      }
    })

    logger.info('[api-hunter] API interception enabled')
  }

  private async triggerInteractions(): Promise<void> {
    logger.info('[api-hunter] Triggering interactions to reveal API calls...')

    const buttons = await this.page.locator('button').all()
    
    for (const button of buttons.slice(0, 5)) {
      try {
        await button.click({ timeout: 1000 })
        await this.page.waitForTimeout(500)
      } catch {
        continue
      }
    }

    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })

    await this.page.waitForTimeout(1000)
  }

  async findGraphQLEndpoints(): Promise<string[]> {
    const endpoints: string[] = []

    for (const [url, data] of this.capturedAPIs) {
      if (url.includes('graphql') || data.data?.query) {
        endpoints.push(url)
      }
    }

    return endpoints
  }

  async findRESTEndpoints(): Promise<string[]> {
    const endpoints: string[] = []

    for (const [url] of this.capturedAPIs) {
      if (url.includes('/api/') && !url.includes('graphql')) {
        endpoints.push(url)
      }
    }

    return endpoints
  }

  getCapturedAPIs(): any[] {
    return Array.from(this.capturedAPIs.values())
  }
}
