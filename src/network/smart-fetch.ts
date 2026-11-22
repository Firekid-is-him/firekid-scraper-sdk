import type { Page } from 'playwright'
import type { FetchOptions, FetchResponse } from '../types.js'
import { logger } from '../logger/logger.js'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

const FALLBACK_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const MAX_REDIRECTS = 5
const DEFAULT_MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024

export interface SmartFetchOptions {
  /*
   * Called for the initial URL and for every redirect target.
   * Throw to reject the request.
   */
  validateUrl?: (url: string) => Promise<void> | void
  maxDownloadBytes?: number
}

export class SmartFetch {
  private pageContext: Page | null = null
  private lastReferer: string = ''
  private manualReferer: string = ''
  private userAgent: string = FALLBACK_USER_AGENT
  private validateUrl?: (url: string) => Promise<void> | void
  private maxDownloadBytes: number

  constructor(options: SmartFetchOptions = {}) {
    this.validateUrl = options.validateUrl
    this.maxDownloadBytes = options.maxDownloadBytes ?? DEFAULT_MAX_DOWNLOAD_BYTES
  }

  setPageContext(page: Page): void {
    this.pageContext = page
    page.evaluate(() => navigator.userAgent)
      .then(ua => {
        if (ua) this.userAgent = ua
      })
      .catch(() => undefined)
  }

  /*
   * Sets a referer to use on future fetch and download calls until cleared.
   */
  setReferer(referer: string): void {
    this.manualReferer = referer
  }

  clearReferer(): void {
    this.manualReferer = ''
  }

  private buildHeaders(options: FetchOptions): Record<string, string> {
    const { referer, autoReferer = true, headers = {}, cookies = {}, body } = options

    const finalReferer = referer
      || this.manualReferer
      || (autoReferer && this.pageContext ? this.pageContext.url() : this.lastReferer)

    const finalHeaders: Record<string, string> = {
      'User-Agent': this.userAgent,
      'Accept': '*/*',
      ...headers
    }

    if (body !== undefined && body !== null && typeof body !== 'string') {
      const hasType = Object.keys(finalHeaders).some(k => k.toLowerCase() === 'content-type')
      if (!hasType) finalHeaders['Content-Type'] = 'application/json'
    }

    if (finalReferer && finalReferer !== 'about:blank') {
      finalHeaders['Referer'] = finalReferer
      logger.info(`[smart-fetch] Auto-Referer: ${finalReferer}`)
    }

    if (Object.keys(cookies).length > 0) {
      finalHeaders['Cookie'] = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
    }

    return finalHeaders
  }

  private async request(options: FetchOptions): Promise<Response> {
    const {
      url,
      method = 'GET',
      body,
      followRedirects = true,
      timeout = 30000
    } = options

    const headers = this.buildHeaders(options)
    const payload = body === undefined || body === null
      ? undefined
      : typeof body === 'string' ? body : JSON.stringify(body)

    let target = url
    let currentMethod = method
    let currentBody = payload

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (this.validateUrl) await this.validateUrl(target)

      logger.info(`[smart-fetch] ${currentMethod} ${target}`)

      const response = await fetch(target, {
        method: currentMethod,
        headers,
        body: currentBody,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeout)
      })

      const location = response.headers.get('location')
      const isRedirect = response.status >= 300 && response.status < 400 && location

      if (!isRedirect || !followRedirects) return response

      await response.body?.cancel().catch(() => undefined)

      target = new URL(location, target).toString()

      if (response.status === 303 || ((response.status === 301 || response.status === 302) && currentMethod === 'POST')) {
        currentMethod = 'GET'
        currentBody = undefined
      }
    }

    throw new Error(`Too many redirects (more than ${MAX_REDIRECTS})`)
  }

  async fetch(options: FetchOptions): Promise<FetchResponse> {
    try {
      const response = await this.request(options)

      const contentType = response.headers.get('content-type') || ''
      let data: any

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else if (contentType.includes('text')) {
        data = await response.text()
      } else {
        data = await response.arrayBuffer()
      }

      this.lastReferer = options.url

      const headersObj: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headersObj[key] = value
      })

      return {
        status: response.status,
        headers: headersObj,
        data
      }
    } catch (err: any) {
      logger.error(`[smart-fetch] Failed: ${err.message}`)
      throw err
    }
  }

  async download(url: string, outputPath: string, referer?: string): Promise<void> {
    logger.info(`[smart-fetch] Downloading ${url} to ${outputPath}`)

    const response = await this.request({
      url,
      referer,
      autoReferer: true,
      timeout: 60000
    })

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      throw new Error(`Download failed with status ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Download response had no body')
    }

    const declared = parseInt(response.headers.get('content-length') || '', 10)
    if (Number.isFinite(declared) && declared > this.maxDownloadBytes) {
      await response.body.cancel().catch(() => undefined)
      throw new Error(`File is larger than the ${this.maxDownloadBytes} byte limit`)
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })

    const partial = `${outputPath}.part`
    let received = 0
    const limit = this.maxDownloadBytes

    const source = Readable.fromWeb(response.body as any)
    source.on('data', (chunk: Buffer) => {
      received += chunk.length
      if (received > limit) {
        source.destroy(new Error(`File is larger than the ${limit} byte limit`))
      }
    })

    try {
      await pipeline(source, fs.createWriteStream(partial))
      fs.renameSync(partial, outputPath)
    } catch (err) {
      fs.rmSync(partial, { force: true })
      throw err
    }

    this.lastReferer = url
    logger.info(`[smart-fetch] Downloaded to ${outputPath}`)
  }

  getLastReferer(): string {
    return this.lastReferer
  }
}
