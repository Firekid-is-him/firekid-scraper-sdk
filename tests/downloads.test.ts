import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import http from 'http'
import os from 'os'
import path from 'path'
import type { AddressInfo } from 'net'
import { chromium, type Browser } from 'playwright'
import { SmartFetch } from '../src/network/smart-fetch.js'
import { DownloaderMode, sanitizeFilename } from '../src/modes/downloader.js'
import { PluginLoader } from '../src/engine/plugin-loader.js'

describe('downloads', () => {
  let server: http.Server
  let base: string
  let browser: Browser
  let dir: string

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/redirect') {
        res.writeHead(302, { location: '/file.pdf' })
        res.end()
      } else if (req.url?.startsWith('/file.pdf')) {
        res.writeHead(200, { 'content-type': 'application/pdf' })
        res.end(Buffer.from('%PDF-test'))
      } else if (req.url === '/other.pdf') {
        res.writeHead(200, { 'content-type': 'application/pdf' })
        res.end(Buffer.from('%PDF-other'))
      } else if (req.url === '/big') {
        res.writeHead(200, { 'content-type': 'application/octet-stream' })
        res.end(Buffer.alloc(4096))
      } else if (req.url === '/missing') {
        res.writeHead(404)
        res.end('nope')
      } else if (req.url === '/links') {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end(`<a href="/file.pdf?token=1">one</a><a href="/other.pdf">two</a><a href="/file.pdf?token=1">dup</a>`)
      } else {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end('<button>Cancel</button><button class="x">Other</button>')
      }
    })

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

    const args = process.env.NO_SANDBOX === 'true' ? ['--no-sandbox'] : []
    browser = await chromium.launch({ headless: true, args })
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firekid-dl-'))
  })

  afterAll(async () => {
    await browser.close()
    server.close()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('streams a download to disk and leaves no partial file', async () => {
    const target = path.join(dir, 'a', 'file.pdf')

    await new SmartFetch().download(`${base}/file.pdf`, target)

    expect(fs.readFileSync(target, 'utf8')).toBe('%PDF-test')
    expect(fs.existsSync(`${target}.part`)).toBe(false)
  })

  it('follows redirects and validates each hop', async () => {
    const seen: string[] = []
    const fetcher = new SmartFetch({ validateUrl: url => { seen.push(url) } })

    const response = await fetcher.fetch({ url: `${base}/redirect` })

    expect(response.status).toBe(200)
    expect(seen).toEqual([`${base}/redirect`, `${base}/file.pdf`])
  })

  it('stops a redirect when the validator rejects the target', async () => {
    const fetcher = new SmartFetch({
      validateUrl: url => {
        if (url.endsWith('/file.pdf')) throw new Error('blocked hop')
      }
    })

    await expect(fetcher.fetch({ url: `${base}/redirect` })).rejects.toThrow('blocked hop')
  })

  it('fails on error status and cleans up', async () => {
    const target = path.join(dir, 'missing.bin')

    await expect(new SmartFetch().download(`${base}/missing`, target)).rejects.toThrow('status 404')
    expect(fs.existsSync(target)).toBe(false)
  })

  it('enforces the size limit', async () => {
    const target = path.join(dir, 'big.bin')

    await expect(new SmartFetch({ maxDownloadBytes: 1000 }).download(`${base}/big`, target)).rejects.toThrow('limit')
    expect(fs.existsSync(target)).toBe(false)
    expect(fs.existsSync(`${target}.part`)).toBe(false)
  })

  it('downloads each unique link under its own name', async () => {
    const outputDir = path.join(dir, 'direct')
    const page = await browser.newPage()
    await page.goto(`${base}/links`)

    const result = await new DownloaderMode(page, { outputDir }).execute(`${base}/links`)
    await page.close()

    expect(result.success).toBe(true)
    expect(fs.readdirSync(outputDir).sort()).toEqual(['file.pdf', 'other.pdf'])
  })

  it('does not report success when nothing could be downloaded', async () => {
    const page = await browser.newPage()
    await page.goto(`${base}/`)

    const result = await new DownloaderMode(page, { outputDir: path.join(dir, 'none') }).execute(base)
    await page.close()

    expect(result.success).toBe(false)
  })

  it('sanitizes filenames', () => {
    expect(sanitizeFilename('../../etc/passwd', 'x')).toBe('passwd')
    expect(sanitizeFilename('..\\..\\evil.exe', 'x')).toBe('evil.exe')
    expect(sanitizeFilename('..', 'fallback.bin')).toBe('fallback.bin')
    expect(sanitizeFilename('a<b>c?.zip', 'x')).toBe('a_b_c_.zip')
  })
})

describe('plugin loader', () => {
  it('loads plugins from a relative directory regardless of module location', async () => {
    const loader = new PluginLoader()
    await loader.loadAll()

    const names = loader.listPlugins().map(p => p.name)

    expect(names).toContain('smart-wait')
    expect(loader.getPluginsByType('action').length).toBeGreaterThan(0)
  })

  it('rejects modules that are not valid plugins', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firekid-plugin-'))
    const file = path.join(dir, 'bad.plu.js')
    fs.writeFileSync(file, `export default { name: 'bad', type: 'nonsense', execute() {} }`)

    const loader = new PluginLoader()
    await loader.loadPlugin(file)

    expect(loader.getPlugin('bad')).toBeUndefined()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('picks up changes when a plugin is reloaded', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firekid-plugin-'))
    const file = path.join(dir, 'v.plu.js')
    const write = (v: string) =>
      fs.writeFileSync(file, `export default { name: 'v', type: 'scraping', version: '${v}', async execute() { return '${v}' } }`)

    const loader = new PluginLoader()
    write('1')
    await loader.loadPlugin(file)
    const first = await loader.executePlugin('v', {})

    write('2')
    fs.utimesSync(file, new Date(), new Date(Date.now() + 5000))
    await loader.loadPlugin(file)
    const second = await loader.executePlugin('v', {})

    expect([first, second]).toEqual(['1', '2'])
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
