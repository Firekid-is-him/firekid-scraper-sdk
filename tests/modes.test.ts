import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { FirekidScraper } from '../src/core/scraper.js'
import { AutoMode } from '../src/modes/auto.js'
import { startFixtureServer, type FixtureServer } from './helpers/fixtures.js'

describe('modes', () => {
  let fixtures: FixtureServer
  let scraper: FirekidScraper | null = null

  const make = (options = {}) => {
    scraper = new FirekidScraper({ headless: true, bypassCloudflare: false, selectorTimeout: 1000, timeout: 10000, ...options })
    return scraper
  }

  beforeAll(async () => { fixtures = await startFixtureServer() })
  afterAll(async () => { await fixtures.close() })
  afterEach(async () => { await scraper?.close(); scraper = null })

  describe('auto', () => {
    it('runs on an ordinary page without throwing', async () => {
      const result = await make().auto(`${fixtures.url}/blank`)
      expect(result).toHaveProperty('success')
    })

    it('detects a Download button without Playwright-only selectors', async () => {
      const s = make()
      await s.goto(`${fixtures.url}/download`)
      const mode = await (new AutoMode(s.getPage()!) as any).detectBestMode()
      expect(mode).toBe('downloader')
    })

    it('picks navigator for a plain page and scrape for a tall one', async () => {
      const s = make()
      await s.goto(`${fixtures.url}/blank`)
      expect(await (new AutoMode(s.getPage()!) as any).detectBestMode()).toBe('navigator')

      await s.goto(`${fixtures.url}/tall`)
      expect(await (new AutoMode(s.getPage()!) as any).detectBestMode()).toBe('scrape')
    })
  })

  describe('paginate', () => {
    it('collects plain-text items when itemSelector is given', async () => {
      const result = await make().paginate(`${fixtures.url}/plain/1`, 'a.next', { maxPages: 5, itemSelector: '.entry', waitBetween: 50 })

      expect(result.success).toBe(true)
      expect(result.data.totalPages).toBe(3)
      expect(result.data.totalItems).toBe(9)
      expect(result.data.items[0].text).toBe('Page 1 item 1')
      expect(result.data.items[8].text).toBe('Page 3 item 3')
    })

    it('still returns title and link for headed items', async () => {
      const result = await make().paginate(`${fixtures.url}/titled/1`, 'a.next', { maxPages: 5, itemSelector: '.card', waitBetween: 50 })

      expect(result.data.totalItems).toBe(6)
      expect(result.data.items[0]).toMatchObject({ title: 'Title 1-1', link: '/x1' })
    })

    it('respects maxPages', async () => {
      const result = await make().paginate(`${fixtures.url}/plain/1`, 'a.next', { maxPages: 2, itemSelector: '.entry', waitBetween: 50 })
      expect(result.data.totalItems).toBe(6)
    })
  })

  describe('infiniteScroll', () => {
    it('collects every plain row with itemSelector', async () => {
      const result = await make().infiniteScroll(`${fixtures.url}/scroll`, { maxScrolls: 15, itemSelector: '.row', scrollDelay: 300 })

      expect(result.success).toBe(true)
      expect(result.data.items).toHaveLength(50)
      expect(result.data.items[49].text).toBe('row 50')
    }, 30000)
  })
})
