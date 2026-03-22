import type { Page, Route, Request } from 'playwright'
import { logger } from '../logger/logger.js'

export class NetworkInterceptor {
  private interceptedRequests: Map<string, any> = new Map()
  private interceptedResponses: Map<string, any> = new Map()

  async enableRequestLogging(page: Page): Promise<void> {
    page.on('request', (request: Request) => {
      const data = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      }

      this.interceptedRequests.set(request.url(), data)
      logger.debug(`[interceptor] Request: ${request.method()} ${request.url()}`)
    })

    page.on('response', async (response) => {
      const data = {
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: Date.now()
      }

      this.interceptedResponses.set(response.url(), data)
      logger.debug(`[interceptor] Response: ${response.status()} ${response.url()}`)
    })

    logger.info('[interceptor] Request logging enabled')
  }

  async interceptAPI(page: Page, pattern: string, handler: (route: Route) => Promise<void>): Promise<void> {
    await page.route(pattern, handler)
    logger.info(`[interceptor] Intercepting API calls matching: ${pattern}`)
  }

  async mockResponse(page: Page, url: string, response: any): Promise<void> {
    await page.route(url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })

    logger.info(`[interceptor] Mocking response for: ${url}`)
  }

  async blockResources(page: Page, types: string[]): Promise<void> {
    await page.route('**/*', async (route) => {
      const type = route.request().resourceType()
      
      if (types.includes(type)) {
        await route.abort()
      } else {
        await route.continue()
      }
    })

    logger.info(`[interceptor] Blocking resource types: ${types.join(', ')}`)
  }

  async captureJSON(page: Page, pattern: string): Promise<any[]> {
    const captured: any[] = []

    page.on('response', async (response) => {
      const url = response.url()
      
      if (url.includes(pattern)) {
        try {
          const json = await response.json()
          captured.push({ url, data: json, timestamp: Date.now() })
          logger.info(`[interceptor] Captured JSON from: ${url}`)
        } catch {
          logger.debug(`[interceptor] Non-JSON response from: ${url}`)
        }
      }
    })

    return captured
  }

  getRequests(): Array<{ url: string; method: string; headers: any; timestamp: number }> {
    return Array.from(this.interceptedRequests.values())
  }

  getResponses(): Array<{ url: string; status: number; headers: any; timestamp: number }> {
    return Array.from(this.interceptedResponses.values())
  }

  clearLogs(): void {
    this.interceptedRequests.clear()
    this.interceptedResponses.clear()
    logger.info('[interceptor] Logs cleared')
  }

  findRequest(urlPattern: string): any {
    for (const [url, data] of this.interceptedRequests) {
      if (url.includes(urlPattern)) {
        return data
      }
    }
    return null
  }

  findResponse(urlPattern: string): any {
    for (const [url, data] of this.interceptedResponses) {
      if (url.includes(urlPattern)) {
        return data
      }
    }
    return null
  }
}
