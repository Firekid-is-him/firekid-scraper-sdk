import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { FirekidScraper } from '../src/core/scraper.js'
import { startFixtureServer, type FixtureServer } from './helpers/fixtures.js'

describe('FirekidScraper behavior', () => {
  let fixtures: FixtureServer

  const make = (options = {}) => new FirekidScraper({ headless: true, bypassCloudflare: false, selectorTimeout: 1000, timeout: 10000, ...options })

  beforeAll(async () => { fixtures = await startFixtureServer() })
  afterAll(async () => { await fixtures.close() })

  it('runs parallel calls on one instance one after another', async () => {
    const scraper = make()

    try {
      const results = await Promise.all([
        scraper.extract(`${fixtures.url}/plain/1`, { n: '.entry' }),
        scraper.extract(`${fixtures.url}/plain/2`, { n: '.entry' }),
        scraper.extract(`${fixtures.url}/plain/3`, { n: '.entry' })
      ])

      expect(results.map(r => r.n)).toEqual(['Page 1 item 1', 'Page 2 item 1', 'Page 3 item 1'])
    } finally {
      await scraper.close()
    }
  })

  it('keeps the queue alive after a failed call', async () => {
    const scraper = make({ urlGuard: async (url: string) => { if (url.includes('/blocked')) throw new Error('blocked by guard') } })

    try {
      const failing = scraper.goto(`${fixtures.url}/blocked`)
      const following = scraper.extract(`${fixtures.url}/`, { h: 'h1' })

      await expect(failing).rejects.toThrow('blocked by guard')
      await expect(following).resolves.toEqual({ h: 'Fixture Home' })
    } finally {
      await scraper.close()
    }
  })

  it('lets close() wait for running work', async () => {
    const scraper = make()
    const pending = scraper.extract(`${fixtures.url}/slow`, { p: 'p' })

    await scraper.close()
    await expect(pending).resolves.toEqual({ p: 'slow' })
  })

  it('reports HTTP error statuses in scrape errors', async () => {
    const scraper = make()

    try {
      const result = await scraper.scrape(`${fixtures.url}/missing`, { selectors: { body: 'p' } })

      expect(result.success).toBe(false)
      expect(result.data.body).toBe('gone')
      expect(result.errors).toContain(`HTTP 404 for ${fixtures.url}/missing`)
    } finally {
      await scraper.close()
    }
  })

  it('does not flag successful responses', async () => {
    const scraper = make()

    try {
      const result = await scraper.scrape(`${fixtures.url}/`, { selectors: { h: 'h1' } })
      expect(result).toMatchObject({ success: true, errors: [] })
    } finally {
      await scraper.close()
    }
  })

  it('rejects scrape() without selectors before launching a browser', async () => {
    const scraper = make()

    await expect(scraper.scrape(`${fixtures.url}/`, {} as any)).rejects.toThrow(/selectors/)
    await expect(scraper.scrape(`${fixtures.url}/`, { selectors: {} })).rejects.toThrow(/selectors/)
    expect(scraper.getBrowser()).toBeNull()
  })

  it('throws when a plugin file is missing or invalid', async () => {
    const scraper = make()
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fk-plugin-'))

    try {
      await expect(scraper.loadPlugin(path.join(dir, 'nope.ext.js'))).rejects.toThrow(/Failed to load plugin/)

      const invalid = path.join(dir, 'bad.ext.js')
      fs.writeFileSync(invalid, 'export default { name: "bad" }')
      await expect(scraper.loadPlugin(invalid)).rejects.toThrow(/not a valid plugin/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('loads and runs a valid plugin', async () => {
    const scraper = make()
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fk-plugin-'))
    const file = path.join(dir, 'title.ext.js')
    fs.writeFileSync(file, "export default { name: 'title', type: 'extractor', version: '1.0.0', async execute({ page }) { return await page.title() } }")

    try {
      await scraper.goto(`${fixtures.url}/`)
      await scraper.loadPlugin(file)
      expect(await scraper.runPlugin('title')).toBe('Home')
    } finally {
      await scraper.close()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('applies the urlGuard to auto mode navigation', async () => {
    const seen: string[] = []
    const scraper = make({ urlGuard: async (url: string) => { seen.push(url) } })

    try {
      await scraper.auto(`${fixtures.url}/blank`)
      expect(seen[0]).toBe(`${fixtures.url}/blank`)
    } finally {
      await scraper.close()
    }
  })
})
