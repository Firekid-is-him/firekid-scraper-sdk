import type { Page } from 'playwright'
import type { CmdFile, CmdStep } from '../types.js'
import { logger, step, highlight } from '../logger/logger.js'
import { config } from '../config.js'
import { SmartFetch } from '../network/smart-fetch.js'
import { CloudflareManager } from '../cloudflare/cloudflare.js'

export interface CmdResult {
  success: boolean
  skipped: string[]
  extracted: Record<string, unknown>[]
  errors: { line: number; action: string; error: string }[]
}

export class CommandExecutor {
  private page: Page
  private url: string
  private result: CmdResult = {
    success: false,
    skipped: [],
    extracted: [],
    errors: [],
  }
  private smartFetch: SmartFetch
  private cfManager: CloudflareManager
  private variables: Record<string, any> = {}

  constructor(page: Page, url: string) {
    this.page = page
    this.url = url
    this.smartFetch = new SmartFetch()
    this.smartFetch.setPageContext(page)
    this.cfManager = new CloudflareManager()
  }

  async execute(cmd: CmdFile): Promise<CmdResult> {
    logger.info(`Executing ${cmd.site}.cmd - ${cmd.steps.length} steps`)

    for (const step of cmd.steps) {
      await this.runStep(step)
    }

    if (this.result.errors.length > 0) {
      logger.warn(`Completed with ${this.result.errors.length} skipped steps`)
      for (const err of this.result.errors) {
        logger.warn(`  Line ${err.line} - ${err.action}: ${err.error}`)
      }
    }

    this.result.success = true
    return this.result
  }

  private async runStep(cmdStep: CmdStep): Promise<void> {
    const { action, args, line } = cmdStep
    step(this.url, `${action} ${args.join(' ')}`, { mode: 'cmd', step: action })

    try {
      switch (action) {
        case 'GOTO': await this.goto(args); break
        case 'BACK': await this.page.goBack(); break
        case 'FORWARD': await this.page.goForward(); break
        case 'REFRESH': await this.page.reload(); break
        
        case 'CLICK': await this.click(args); break
        case 'TYPE': await this.type(args); break
        case 'PRESS': await this.press(args); break
        case 'SELECT': await this.select(args); break
        case 'CHECK': await this.check(args); break
        case 'UPLOAD': await this.upload(args); break
        
        case 'WAIT': await this.wait(args); break
        case 'WAITLOAD': await this.page.waitForLoadState('networkidle'); break
        case 'SCROLL': await this.scroll(args); break
        case 'SCROLLDOWN': await this.scrollDown(args); break
        
        case 'SCAN': await this.scan(args); break
        case 'EXTRACT': await this.extract(args); break
        case 'SCREENSHOT': await this.screenshot(args); break
        
        case 'PAGINATE': await this.paginate(args); break
        case 'INFINITESCROLL': await this.infiniteScroll(); break
        
        case 'FETCH': await this.fetch(args); break
        case 'DOWNLOAD': await this.download(args); break
        case 'REFERER': await this.setReferer(args); break
        
        case 'BYPASS_CLOUDFLARE': await this.bypassCloudflare(args); break
        
        case 'REPEAT': await this.repeat(cmdStep); break
        case 'IF': await this.conditional(cmdStep); break
        case 'LOOP': await this.loop(cmdStep); break
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(`Line ${line} SKIPPED - ${action}: ${msg}`)
      this.result.errors.push({ line, action, error: msg })
      this.result.skipped.push(`Line ${line}: ${action} ${args.join(' ')}`)
    }
  }

  private async goto(args: string[]) {
    const url = args[0]
    if (!url) throw new Error('GOTO requires a URL')
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.browser.timeout })
    step(this.url, `GOTO ${url}`, { mode: 'cmd', step: 'GOTO', url })
  }

  private async click(args: string[]) {
    const selector = args[0]
    if (!selector) throw new Error('CLICK requires a selector')
    await this.page.waitForSelector(selector, { timeout: 10000 })
    await this.page.click(selector)
  }

  private async type(args: string[]) {
    const selector = args[0]
    const text = args.slice(1).join(' ')
    if (!selector) throw new Error('TYPE requires a selector')
    if (!text) throw new Error('TYPE requires text')
    await this.page.waitForSelector(selector, { timeout: 10000 })
    await this.page.fill(selector, text)
  }

  private async press(args: string[]) {
    const key = args[0]
    if (!key) throw new Error('PRESS requires a key')
    await this.page.keyboard.press(key)
  }

  private async select(args: string[]) {
    const selector = args[0]
    const value = args[1]
    if (!selector) throw new Error('SELECT requires a selector')
    if (!value) throw new Error('SELECT requires a value')
    await this.page.selectOption(selector, value)
  }

  private async check(args: string[]) {
    const selector = args[0]
    if (!selector) throw new Error('CHECK requires a selector')
    await this.page.check(selector)
  }

  private async upload(args: string[]) {
    const selector = args[0]
    const filePath = args[1]
    if (!selector) throw new Error('UPLOAD requires a selector')
    if (!filePath) throw new Error('UPLOAD requires a file path')
    await this.page.setInputFiles(selector, filePath)
  }

  private async wait(args: string[]) {
    const target = args[0]
    if (!target) throw new Error('WAIT requires a selector or ms value')

    if (/^\d+$/.test(target)) {
      await this.page.waitForTimeout(parseInt(target, 10))
    } else {
      await this.page.waitForSelector(target, { timeout: config.browser.timeout })
    }
  }

  private async scroll(args: string[]) {
    const selector = args[0]
    if (!selector) throw new Error('SCROLL requires a selector')
    await this.page.locator(selector).scrollIntoViewIfNeeded()
  }

  private async scrollDown(args: string[]) {
    const pixels = parseInt(args[0] || '500', 10)
    await this.page.evaluate((px) => window.scrollBy(0, px), pixels)
  }

  private async scan(args: string[]) {
    const selector = args[0]
    if (!selector) throw new Error('SCAN requires a selector')

    const elements = await this.page.$$(selector)
    const found: Record<string, unknown>[] = []

    for (const el of elements) {
      const tag = await el.evaluate(e => e.tagName.toLowerCase())
      const text = await el.textContent()
      const href = await el.getAttribute('href')
      const src = await el.getAttribute('src')
      const id = await el.getAttribute('id')
      const cls = await el.getAttribute('class')
      found.push({ tag, text: text?.trim().slice(0, 100), href, src, id, class: cls })
    }

    this.result.extracted.push({ type: 'scan', selector, count: found.length, found })
    highlight(this.url, { type: 'scan', selector, count: found.length })
    step(this.url, `SCAN found ${found.length} elements matching "${selector}"`, { mode: 'cmd', step: 'SCAN' })
  }

  private async extract(args: string[]) {
    const selector = args[0]
    const attr = args[1] || 'text'
    if (!selector) throw new Error('EXTRACT requires a selector')

    const elements = await this.page.$$(selector)
    const data: any[] = []

    for (const el of elements) {
      if (attr === 'text') {
        const text = await el.textContent()
        data.push(text?.trim())
      } else {
        const value = await el.getAttribute(attr)
        data.push(value)
      }
    }

    this.result.extracted.push({ selector, attr, count: data.length, data })
    highlight(this.url, { selector, attr, count: data.length })
  }

  private async screenshot(args: string[]) {
    const path = args[0] || `screenshot-${Date.now()}.png`
    await this.page.screenshot({ path, fullPage: true })
    logger.info(`Screenshot saved: ${path}`)
  }

  private async paginate(args: string[]) {
    const selector = args[0]
    if (!selector) throw new Error('PAGINATE requires a selector')

    let page = 1
    while (true) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 })
        logger.info(`Clicking next page (${page})`)
        await this.page.click(selector)
        await this.page.waitForLoadState('networkidle')
        page++
      } catch {
        logger.info(`Pagination complete - ${page} pages`)
        break
      }
    }
  }

  private async infiniteScroll() {
    let previousHeight = 0
    let attempts = 0
    const maxAttempts = 50

    while (attempts < maxAttempts) {
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight)
      
      if (currentHeight === previousHeight) {
        break
      }

      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await this.page.waitForTimeout(1000)
      
      previousHeight = currentHeight
      attempts++
    }

    logger.info(`Infinite scroll complete - ${attempts} scrolls`)
  }

  private async fetch(args: string[]) {
    const url = args[0]
    const varName = args[1]
    if (!url) throw new Error('FETCH requires a URL')

    const response = await this.smartFetch.fetch({
      url,
      autoReferer: true
    })

    if (varName) {
      this.variables[varName] = response.data
      logger.info(`Saved response to variable: ${varName}`)
    }

    this.result.extracted.push({
      type: 'fetch',
      url,
      status: response.status,
      data: response.data
    })
  }

  private async download(args: string[]) {
    const url = args[0]
    const outputPath = args[1] || `./downloads/${Date.now()}.bin`
    const referer = args[2]
    if (!url) throw new Error('DOWNLOAD requires a URL')

    logger.info(`Downloading: ${url}`)
    await this.smartFetch.download(url, outputPath, referer)

    this.result.extracted.push({
      type: 'download',
      url,
      path: outputPath
    })
  }

  private async setReferer(args: string[]) {
    const referer = args[0]
    if (!referer) throw new Error('REFERER requires a URL')
    logger.info(`Set manual Referer: ${referer}`)
  }

  private async bypassCloudflare(args: string[]) {
    const mode = args[0] || 'auto'
    await this.cfManager.handleCloudflare(this.page, this.url)
  }

  private async repeat(stepCmd: CmdStep) {
    const selector = stepCmd.args[0]
    if (!selector) throw new Error('REPEAT requires a selector')
    if (!stepCmd.children?.length) throw new Error('REPEAT has no child commands')

    const elements = await this.page.$$(selector)
    step(this.url, `REPEAT ${elements.length}x over "${selector}"`, { mode: 'cmd', step: 'REPEAT' })

    for (let i = 0; i < elements.length; i++) {
      step(this.url, `  REPEAT iteration ${i + 1}/${elements.length}`, { mode: 'cmd' })
      for (const child of stepCmd.children) {
        await this.runStep(child)
      }
    }
  }

  private async conditional(stepCmd: CmdStep) {
    const selector = stepCmd.args[0]
    if (!selector) throw new Error('IF requires a selector')
    if (!stepCmd.children?.length) throw new Error('IF has no child commands')

    const exists = await this.page.locator(selector).count() > 0
    
    if (exists && stepCmd.children) {
      for (const child of stepCmd.children) {
        await this.runStep(child)
      }
    }
  }

  private async loop(stepCmd: CmdStep) {
    const count = parseInt(stepCmd.args[0] || '1', 10)
    if (!stepCmd.children?.length) throw new Error('LOOP has no child commands')

    for (let i = 0; i < count; i++) {
      step(this.url, `  LOOP iteration ${i + 1}/${count}`, { mode: 'cmd' })
      for (const child of stepCmd.children) {
        await this.runStep(child)
      }
    }
  }
}
