import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import type { Task, Seed } from '../types.js'
import { applyGhost } from '../ghost/index.js'
import { getNewSeed } from '../ghost/seed.js'
import { logger } from '../logger/logger.js'

export class BrowserWorker {
  private id: number
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private seed: Seed
  private busy: boolean = false

  constructor(id: number) {
    this.id = id
    this.seed = getNewSeed()
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    })

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })

    await applyGhost(this.context, { seed: this.seed })

    this.page = await this.context.newPage()

    logger.info(`[worker-${this.id}] Initialized with seed ${this.seed.id.slice(0, 8)}`)
  }

  async execute(task: Task): Promise<any> {
    this.busy = true

    try {
      if (!this.page) throw new Error('Worker not initialized')

      logger.info(`[worker-${this.id}] Executing task ${task.id}`)

      await this.page.goto(task.url, { waitUntil: 'domcontentloaded' })

      const result = await this.performTask(task)

      this.busy = false
      return result
    } catch (err) {
      this.busy = false
      throw err
    }
  }

  private async performTask(task: Task): Promise<any> {
    if (!this.page) throw new Error('Worker not initialized')

    switch (task.mode) {
      case 'scrape':
        return await this.scrapeData(task)
      
      case 'downloader':
        return await this.downloadFiles(task)
      
      default:
        return await this.extractBasic(task)
    }
  }

  private async scrapeData(task: Task): Promise<any> {
    if (!this.page) throw new Error('Worker not initialized')

    return await this.page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        content: document.body.textContent?.slice(0, 1000)
      }
    })
  }

  private async downloadFiles(task: Task): Promise<any> {
    if (!this.page) throw new Error('Worker not initialized')

    const links = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(href => /\.(pdf|mp4|zip)$/i.test(href))
    })

    return { files: links }
  }

  private async extractBasic(task: Task): Promise<any> {
    if (!this.page) throw new Error('Worker not initialized')

    return await this.page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent,
        links: Array.from(document.querySelectorAll('a[href]')).length,
        images: Array.from(document.querySelectorAll('img[src]')).length
      }
    })
  }

  async close(): Promise<void> {
    if (this.page) await this.page.close()
    if (this.context) await this.context.close()
    if (this.browser) await this.browser.close()

    logger.info(`[worker-${this.id}] Closed`)
  }

  isBusy(): boolean {
    return this.busy
  }

  getId(): number {
    return this.id
  }

  getSeed(): Seed {
    return this.seed
  }
}
