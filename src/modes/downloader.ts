import type { Page } from 'playwright'
import type { ScrapingResult, DownloadFlow, DownloadButton, FileLink } from '../types.js'
import { logger } from '../logger/logger.js'
import { SmartFetch } from '../network/smart-fetch.js'

export class DownloaderMode {
  private page: Page
  private smartFetch: SmartFetch

  constructor(page: Page) {
    this.page = page
    this.smartFetch = new SmartFetch()
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

      if (flow.type === 'DIRECT' && flow.links) {
        downloadedFiles = await this.downloadDirectLinks(flow.links)
      } else if (flow.type === 'BUTTON_CLICK' && flow.button) {
        downloadedFiles = await this.downloadViaButton(flow.button)
      }

      return {
        success: true,
        data: {
          flow: flow.type,
          files: downloadedFiles
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
    return await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'))
      const fileLinks: FileLink[] = []

      const fileExtensions = /\.(mp4|mp3|pdf|zip|rar|exe|dmg|apk|avi|mkv|mov|wav|flac)$/i

      for (const link of links) {
        const href = (link as HTMLAnchorElement).href
        if (href && fileExtensions.test(href)) {
          const selector = link.id ? `#${link.id}` : `a[href="${href}"]`
          const ext = href.match(fileExtensions)?.[1]
          
          fileLinks.push({
            url: href,
            selector,
            extension: ext
          })
        }
      }

      return fileLinks
    })
  }

  private async findDownloadButton(): Promise<DownloadButton | null> {
    const buttons = await this.page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button, a, [class*="download"]'))
      const scored: Array<{ selector: string; score: number; text: string; href?: string }> = []

      for (const el of candidates) {
        const text = (el.textContent || '').toLowerCase()
        const className = (el.className || '').toLowerCase()
        const href = (el as HTMLAnchorElement).href

        let score = 0

        if (text.includes('download')) score += 10
        if (className.includes('download')) score += 10
        if (el.hasAttribute('download')) score += 20
        if (href && href.includes('download')) score += 5
        if (text.includes('get')) score += 3
        if (text.includes('save')) score += 3

        if (score > 0) {
          const selector = el.id ? `#${el.id}` : el.tagName.toLowerCase()
          scored.push({ selector, score, text, href })
        }
      }

      return scored.sort((a, b) => b.score - a.score)
    })

    return buttons.length > 0 ? buttons[0] : null
  }

  private async downloadDirectLinks(links: FileLink[]): Promise<string[]> {
    const downloaded: string[] = []

    for (const link of links) {
      const filename = `download-${Date.now()}.${link.extension || 'bin'}`
      const outputPath = `./downloads/${filename}`

      logger.info(`[downloader-mode] Downloading ${link.url}`)
      
      await this.smartFetch.download(link.url, outputPath)
      downloaded.push(outputPath)
    }

    return downloaded
  }

  private async downloadViaButton(button: DownloadButton): Promise<string[]> {
    logger.info(`[downloader-mode] Clicking download button: ${button.selector}`)

    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.click(button.selector)
    ])

    const filename = download.suggestedFilename()
    const outputPath = `./downloads/${filename}`
    
    await download.saveAs(outputPath)
    logger.info(`[downloader-mode] Saved to ${outputPath}`)

    return [outputPath]
  }
}
