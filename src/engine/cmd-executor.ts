import fs from 'fs'
import path from 'path'
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
  variables: Record<string, unknown>
}

export interface CommandExecutorOptions {
  /*
   * When set, UPLOAD, DOWNLOAD and SCREENSHOT may only touch paths inside
   * this directory. Relative paths are resolved against it.
   */
  workDir?: string
  /*
   * Called before GOTO, FETCH and DOWNLOAD. Throw to reject the URL.
   */
  validateUrl?: (url: string) => Promise<void> | void
}

export class CommandExecutor {
  private page: Page
  private url: string
  private options: CommandExecutorOptions
  private result: CmdResult = {
    success: false,
    skipped: [],
    extracted: [],
    errors: [],
    variables: {}
  }
  private smartFetch: SmartFetch
  private cfManager: CloudflareManager
  private variables: Record<string, unknown> = this.result.variables
  private stepsRun = 0

  constructor(page: Page, url: string, options: CommandExecutorOptions = {}) {
    this.page = page
    this.url = url
    this.options = options
    this.smartFetch = new SmartFetch({ validateUrl: options.validateUrl })
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

    this.result.success = this.stepsRun > 0 && this.result.errors.length < this.stepsRun
    return this.result
  }

  getVariables(): Record<string, unknown> {
    return { ...this.variables }
  }

  private interpolate(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      if (!(key in this.variables)) return match
      const value = this.variables[key]
      if (value === null || value === undefined) return ''
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
    })
  }

  private async runStep(cmdStep: CmdStep): Promise<void> {
    const { action, line } = cmdStep
    const args = cmdStep.args.map(a => this.interpolate(a))
    this.stepsRun++
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
        case 'INFINITESCROLL': await this.infiniteScroll(args); break

        case 'FETCH': await this.fetch(args); break
        case 'DOWNLOAD': await this.download(args); break
        case 'REFERER': await this.setReferer(args); break

        case 'BYPASS_CLOUDFLARE': await this.bypassCloudflare(args); break

        case 'REPEAT': await this.repeat(cmdStep, args); break
        case 'IF': await this.conditional(cmdStep, args); break
        case 'LOOP': await this.loop(cmdStep, args); break
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(`Line ${line} SKIPPED - ${action}: ${msg}`)
      this.result.errors.push({ line, action, error: msg })
      this.result.skipped.push(`Line ${line}: ${action} ${args.join(' ')}`)
    }
  }

  private splitAlias(args: string[]): { args: string[]; name: string | null } {
    const index = args.findIndex(a => a.toUpperCase() === 'AS')
    if (index === -1) return { args, name: null }

    const name = args[index + 1]
    if (!name) throw new Error('AS requires a variable name')
    if (!/^\w+$/.test(name)) throw new Error(`Invalid variable name: ${name}`)

    return { args: args.slice(0, index), name }
  }

  private resolvePath(target: string): string {
    const workDir = this.options.workDir
    if (!workDir) return target

    fs.mkdirSync(workDir, { recursive: true })
    const base = fs.realpathSync(path.resolve(workDir))
    const resolved = path.resolve(base, target)

    const escapes = (p: string) => {
      const rel = path.relative(base, p)
      return rel.startsWith('..') || path.isAbsolute(rel)
    }

    let probe = resolved
    while (!fs.existsSync(probe)) {
      const parent = path.dirname(probe)
      if (parent === probe) break
      probe = parent
    }

    if (escapes(resolved) || escapes(fs.realpathSync(probe))) {
      throw new Error(`Path is outside the working directory: ${target}`)
    }

    return resolved
  }

  private async checkUrl(url: string): Promise<void> {
    if (this.options.validateUrl) {
      await this.options.validateUrl(url)
    }
  }

  private async goto(args: string[]) {
    const url = args[0]
    if (!url) throw new Error('GOTO requires a URL')
    await this.checkUrl(url)
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.browser.timeout })
    this.url = url
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
    await this.page.setInputFiles(selector, this.resolvePath(filePath))
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
    await this.page.locator(selector).first().scrollIntoViewIfNeeded()
  }

  private async scrollDown(args: string[]) {
    const parsed = parseInt(args[0] || '500', 10)
    const pixels = Number.isFinite(parsed) ? parsed : 500
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

  private async extract(rawArgs: string[]) {
    const { args, name } = this.splitAlias(rawArgs)
    const selector = args[0]
    const attr = args[1] || 'text'
    if (!selector) throw new Error('EXTRACT requires a selector')

    const elements = await this.page.$$(selector)
    const data: Array<string | null | undefined> = []

    for (const el of elements) {
      if (attr === 'text') {
        const text = await el.textContent()
        data.push(text?.trim())
      } else if (attr === 'html') {
        data.push(await el.innerHTML())
      } else if (attr.startsWith('attr:')) {
        data.push(await el.getAttribute(attr.slice(5)))
      } else {
        data.push(await el.getAttribute(attr))
      }
    }

    const entry: Record<string, unknown> = { selector, attr, count: data.length, data }
    if (name) {
      entry.name = name
      this.variables[name] = data.length === 1 ? data[0] : data
    }

    this.result.extracted.push(entry)
    highlight(this.url, { selector, attr, count: data.length })
  }

  private async screenshot(args: string[]) {
    const target = args[0] || `screenshot-${Date.now()}.png`
    const outputPath = this.resolvePath(target)
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true })
    await this.page.screenshot({ path: outputPath, fullPage: true })
    logger.info(`Screenshot saved: ${outputPath}`)
  }

  private async paginate(args: string[]) {
    const selector = args[0]
    if (!selector) throw new Error('PAGINATE requires a selector')

    const parsed = parseInt(args[1] || '50', 10)
    const maxPages = Number.isFinite(parsed) && parsed > 0 ? parsed : 50

    let page = 1
    while (page < maxPages) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 })
        logger.info(`Clicking next page (${page})`)
        await this.page.click(selector)
        await this.page.waitForLoadState('networkidle')
        page++
      } catch {
        break
      }
    }

    logger.info(`Pagination complete - ${page} pages`)
  }

  private async infiniteScroll(args: string[]) {
    const parsed = parseInt(args[0] || '50', 10)
    const maxAttempts = Number.isFinite(parsed) && parsed > 0 ? parsed : 50

    let previousHeight = 0
    let attempts = 0
    let unchanged = 0

    while (attempts < maxAttempts) {
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight)

      if (currentHeight === previousHeight) {
        unchanged++
        if (unchanged >= 3) break
      } else {
        unchanged = 0
      }

      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await this.page.waitForTimeout(1000)

      previousHeight = currentHeight
      attempts++
    }

    logger.info(`Infinite scroll complete - ${attempts} scrolls`)
  }

  private async fetch(rawArgs: string[]) {
    const { args, name } = this.splitAlias(rawArgs)
    const url = args[0]
    const varName = name || args[1]
    if (!url) throw new Error('FETCH requires a URL')

    await this.checkUrl(url)

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
    const outputPath = this.resolvePath(args[1] || `./downloads/${Date.now()}.bin`)
    const referer = args[2]
    if (!url) throw new Error('DOWNLOAD requires a URL')

    await this.checkUrl(url)

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
    this.smartFetch.setReferer(referer)
    logger.info(`Set manual Referer: ${referer}`)
  }

  private async bypassCloudflare(args: string[]) {
    if (args[0] === 'skip') return
    await this.cfManager.handleCloudflare(this.page, this.page.url())
  }

  private async runChildren(stepCmd: CmdStep, index: number, total: number) {
    this.variables.index = index
    this.variables.count = total

    for (const child of stepCmd.children ?? []) {
      await this.runStep(child)
    }
  }

  private async repeat(stepCmd: CmdStep, args: string[]) {
    const selector = args[0]
    if (!selector) throw new Error('REPEAT requires a selector')
    if (!stepCmd.children?.length) throw new Error('REPEAT has no child commands')

    const total = (await this.page.$$(selector)).length
    step(this.url, `REPEAT ${total}x over "${selector}"`, { mode: 'cmd', step: 'REPEAT' })

    for (let i = 0; i < total; i++) {
      step(this.url, `  REPEAT iteration ${i + 1}/${total}`, { mode: 'cmd' })
      await this.runChildren(stepCmd, i + 1, total)
    }
  }

  private async conditional(stepCmd: CmdStep, args: string[]) {
    const selector = args[0]
    if (!selector) throw new Error('IF requires a selector')
    if (!stepCmd.children?.length) throw new Error('IF has no child commands')

    const exists = await this.page.locator(selector).count() > 0

    if (exists) {
      for (const child of stepCmd.children) {
        await this.runStep(child)
      }
    }
  }

  private async loop(stepCmd: CmdStep, args: string[]) {
    const parsed = parseInt(args[0] || '1', 10)
    const total = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
    if (!stepCmd.children?.length) throw new Error('LOOP has no child commands')

    for (let i = 0; i < total; i++) {
      step(this.url, `  LOOP iteration ${i + 1}/${total}`, { mode: 'cmd' })
      await this.runChildren(stepCmd, i + 1, total)
    }
  }
}
