import path from 'path'
import type { Page } from 'playwright'
import type { ScrapingResult, DownloadFlow, DownloadButton, FileLink } from '../types.js'
import { logger } from '../logger/logger.js'
import { SmartFetch } from '../network/smart-fetch.js'

export interface DownloaderOptions {
  outputDir?: string
  validateUrl?: (url: string) => Promise<void> | void
}

const FILE_EXTENSIONS = /\.(mp4|mp3|pdf|zip|rar|exe|dmg|apk|avi|mkv|mov|wav|flac)$/i

export function sanitizeFilename(name: string, fallback: string): string {
  const base = path.basename(name.replace(/\\/g, '/'))
  const cleaned = base
    .replace(/[\u0000-\u001f<>:"|?*]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 200)

  return cleaned || fallback
}

export class DownloaderMode {
  private page: Page
  private smartFetch: SmartFetch
  private outputDir: string

  constructor(page: Page, options: DownloaderOptions = {}) {
    this.page = page
    this.outputDir = options.outputDir ?? './downloads'
    this.smartFetch = new SmartFetch({ validateUrl: options.validateUrl })
    this.smartFetch.setPageContext(page)
  }

  async execute(url: string): Promise<ScrapingResult> {
    logger.info('[downloader-mode] Analyzing download flow...')

    const flow = await this.detectDownloadFlow()

    if (!flow) {
      return {
        success: false,
        data: {},
        errors: ['No download flow detected'],
        timestamp: Date.now()
      }
    }

    logger.info(`[downloader-mode] Flow type: ${flow.type}`)

    try {
      let downloadedFiles: string[] = []
      const errors: string[] = []

      if (flow.type === 'DIRECT' && flow.links) {
        const outcome = await this.downloadDirectLinks(flow.links)
        downloadedFiles = outcome.files
        errors.push(...outcome.errors)
      } else if (flow.type === 'BUTTON_CLICK' && flow.button) {
        downloadedFiles = await this.downloadViaButton(flow.button)
      }

      return {
        success: downloadedFiles.length > 0 && errors.length === 0,
        data: {
          flow: flow.type,
          files: downloadedFiles
        },
        errors,
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

  private async detectDownloadFlow(): Promise<DownloadFlow | null> {
    const directLinks = await this.findDirectLinks()
    if (directLinks.length > 0) {
      return {
        type: 'DIRECT',
        steps: ['Found direct download links'],
        links: directLinks
      }
    }

    const downloadButton = await this.findDownloadButton()
    if (downloadButton) {
      return {
        type: 'BUTTON_CLICK',
        steps: ['Click download button', 'Wait for file'],
        button: downloadButton
      }
    }

    return null
  }

  private async findDirectLinks(): Promise<FileLink[]> {
    const pattern = FILE_EXTENSIONS.source

    return await this.page.evaluate((source) => {
      const matcher = new RegExp(source, 'i')
      const seen = new Set<string>()
      const fileLinks: FileLink[] = []

      for (const link of Array.from(document.querySelectorAll('a[href]'))) {
        const href = (link as HTMLAnchorElement).href
        if (!href || seen.has(href)) continue

        let pathname = ''
        try {
          pathname = new URL(href).pathname
        } catch {
          continue
        }

        const match = pathname.match(matcher)
        if (!match) continue

        seen.add(href)
        fileLinks.push({
          url: href,
          selector: link.id ? `#${CSS.escape(link.id)}` : `a[href=${JSON.stringify(link.getAttribute('href'))}]`,
          extension: match[1]
        })
      }

      return fileLinks
    }, pattern)
  }

  private async findDownloadButton(): Promise<DownloadButton | null> {
    const buttons = await this.page.evaluate(() => {
      const uniqueSelector = (el: Element): string => {
        if (el.id) return `#${CSS.escape(el.id)}`

        const parts: string[] = []
        let node: Element | null = el

        while (node && node.nodeType === 1 && node !== document.documentElement) {
          const tag = node.tagName.toLowerCase()

          if (node.id) {
            parts.unshift(`#${CSS.escape(node.id)}`)
            break
          }

          const parent: Element | null = node.parentElement
          const siblings = parent
            ? Array.from(parent.children).filter(c => c.tagName === node!.tagName)
            : []

          parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(node) + 1})` : tag)
          node = parent
        }

        return parts.join(' > ')
      }

      const candidates = Array.from(document.querySelectorAll('button, a, [class*="download"]'))
      const scored: Array<{ selector: string; score: number; text: string; href?: string }> = []

      for (const el of candidates) {
        const text = (el.textContent || '').trim().toLowerCase().slice(0, 100)
        const className = String(el.getAttribute('class') || '').toLowerCase()
        const href = (el as HTMLAnchorElement).href

        let score = 0

        if (text.includes('download')) score += 10
        if (className.includes('download')) score += 10
        if (el.hasAttribute('download')) score += 20
        if (href && href.includes('download')) score += 5
        if (text.includes('get')) score += 3
        if (text.includes('save')) score += 3

        if (score > 0) {
          scored.push({ selector: uniqueSelector(el), score, text, href })
        }
      }

      return scored.sort((a, b) => b.score - a.score)
    })

    return buttons.length > 0 ? buttons[0] : null
  }

  private async downloadDirectLinks(links: FileLink[]): Promise<{ files: string[]; errors: string[] }> {
    const files: string[] = []
    const errors: string[] = []
    const used = new Set<string>()

    for (const [index, link] of links.entries()) {
      const fallback = `download-${Date.now()}-${index}.${link.extension || 'bin'}`
      let name = fallback

      try {
        name = sanitizeFilename(decodeURIComponent(path.posix.basename(new URL(link.url).pathname)), fallback)
      } catch {
        name = fallback
      }

      if (used.has(name)) {
        const parsed = path.parse(name)
        name = `${parsed.name}-${index}${parsed.ext}`
      }
      used.add(name)

      const outputPath = path.join(this.outputDir, name)

      logger.info(`[downloader-mode] Downloading ${link.url}`)

      try {
        await this.smartFetch.download(link.url, outputPath)
        files.push(outputPath)
      } catch (err: any) {
        logger.warn(`[downloader-mode] Failed ${link.url}: ${err.message}`)
        errors.push(`${link.url}: ${err.message}`)
      }
    }

    return { files, errors }
  }

  private async downloadViaButton(button: DownloadButton): Promise<string[]> {
    logger.info(`[downloader-mode] Clicking download button: ${button.selector}`)

    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 30000 }),
      this.page.click(button.selector)
    ])

    const filename = sanitizeFilename(download.suggestedFilename(), `download-${Date.now()}.bin`)
    const outputPath = path.join(this.outputDir, filename)

    await download.saveAs(outputPath)
    logger.info(`[downloader-mode] Saved to ${outputPath}`)

    return [outputPath]
  }
}
