import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { chromium, type Browser, type Page } from 'playwright'
import { CommandParser } from '../src/engine/cmd-parser.js'
import { CommandExecutor } from '../src/engine/cmd-executor.js'

const html = `
  <html><body>
    <h1 id="title">Hello</h1>
    <ul>
      <li class="item"><a href="/a">Alpha</a></li>
      <li class="item"><a href="/b">Beta</a></li>
    </ul>
    <input name="q" />
  </body></html>
`

describe('CommandExecutor', () => {
  let browser: Browser
  let page: Page
  let workDir: string

  beforeAll(async () => {
    const args = process.env.NO_SANDBOX === 'true' ? ['--no-sandbox'] : []
    browser = await chromium.launch({ headless: true, args })
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firekid-exec-'))
  })

  afterAll(async () => {
    await browser.close()
    fs.rmSync(workDir, { recursive: true, force: true })
  })

  async function run(script: string, options = {}) {
    page = await browser.newPage()
    await page.setContent(html)

    const parser = new CommandParser()
    const executor = new CommandExecutor(page, 'about:blank', options)
    const result = await executor.execute(parser.parse(script))

    await page.close()
    return result
  }

  it('stores extracted data under the AS name and reuses it', async () => {
    page = await browser.newPage()
    await page.setContent(html)

    const parser = new CommandParser()
    const executor = new CommandExecutor(page, 'about:blank')
    const result = await executor.execute(
      parser.parse('EXTRACT #title text AS heading\nTYPE input[name=q] "{{heading}} world"')
    )

    expect(result.variables.heading).toBe('Hello')
    expect(result.extracted[0]).toMatchObject({ name: 'heading', count: 1 })
    expect(result.errors).toHaveLength(0)
    expect(await page.inputValue('input[name=q]')).toBe('Hello world')

    await page.close()
  })

  it('supports html and attr: extraction types', async () => {
    const result = await run('EXTRACT li.item html AS markup\nEXTRACT li.item a attr:href AS links')

    expect(result.errors).toHaveLength(0)
    expect(String((result.variables.markup as string[])[0])).toContain('Alpha')
  })

  it('exposes the iteration index inside REPEAT', async () => {
    const result = await run('REPEAT .item\n  EXTRACT .item text AS seen')

    expect(result.errors).toHaveLength(0)
    expect(result.variables.index).toBe(2)
    expect(result.variables.count).toBe(2)
  })

  it('reports failure when every step fails', async () => {
    const result = await run('GOTO\nPRESS')

    expect(result.errors).toHaveLength(2)
    expect(result.success).toBe(false)
  })

  it('reports success when some steps succeed', async () => {
    const result = await run('EXTRACT #title text\nSCROLL')

    expect(result.errors).toHaveLength(1)
    expect(result.success).toBe(true)
  })

  it('keeps file writes inside the working directory', async () => {
    const outside = path.join(os.tmpdir(), `firekid-escape-${Date.now()}.png`)

    const result = await run(`SCREENSHOT ${outside}\nSCREENSHOT inside.png`, { workDir })

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].error).toContain('outside the working directory')
    expect(fs.existsSync(outside)).toBe(false)
    expect(fs.existsSync(path.join(workDir, 'inside.png'))).toBe(true)
  })

  it('rejects URLs the validator refuses', async () => {
    const result = await run('GOTO http://169.254.169.254/latest', {
      validateUrl: () => {
        throw new Error('blocked')
      }
    })

    expect(result.errors[0].error).toBe('blocked')
  })
})
