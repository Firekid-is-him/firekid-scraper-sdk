import type { Page } from 'playwright'
import type { FetchOptions, FetchResponse } from '../types.js'
import { logger } from '../logger/logger.js'
import fs from 'fs'
import path from 'path'

export class SmartFetch {
  private pageContext: Page | null = null
  private lastReferer: string = ''

  setPageContext(page: Page): void {
    this.pageContext = page
  }

  async fetch(options: FetchOptions): Promise<FetchResponse> {
    const {
      url,
      referer,
      autoReferer = true,
      method = 'GET',
      headers = {},
      cookies = {},
      body,
      followRedirects = true,
      timeout = 30000
    } = options

    const finalReferer = referer || (autoReferer && this.pageContext ? this.pageContext.url() : this.lastReferer)

    const finalHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      ...headers
    }

    if (finalReferer) {
      finalHeaders['Referer'] = finalReferer
      logger.info(`[smart-fetch] Auto-Referer: ${finalReferer}`)
    }

    if (Object.keys(cookies).length > 0) {
      const cookieString = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
      finalHeaders['Cookie'] = cookieString
    }

    logger.info(`[smart-fetch] ${method} ${url}`)

    try {
      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        redirect: followRedirects ? 'follow' : 'manual',
        signal: AbortSignal.timeout(timeout)
      })

      const contentType = response.headers.get('content-type') || ''
      let data: any

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else if (contentType.includes('text')) {
        data = await response.text()
      } else {
        data = await response.arrayBuffer()
      }

      this.lastReferer = url

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data
      }
    } catch (err: any) {
      logger.error(`[smart-fetch] Failed: ${err.message}`)
      throw err
    }
  }

  async download(url: string, outputPath: string, referer?: string): Promise<void> {
    logger.info(`[smart-fetch] Downloading ${url} to ${outputPath}`)

    const response = await this.fetch({
      url,
      referer,
      autoReferer: true
    })

    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    if (response.data instanceof ArrayBuffer) {
      fs.writeFileSync(outputPath, Buffer.from(response.data))
    } else if (typeof response.data === 'string') {
      fs.writeFileSync(outputPath, response.data)
    } else {
      fs.writeFileSync(outputPath, JSON.stringify(response.data))
    }

    logger.info(`[smart-fetch] Downloaded to ${outputPath}`)
  }

  getLastReferer(): string {
    return this.lastReferer
  }
}
