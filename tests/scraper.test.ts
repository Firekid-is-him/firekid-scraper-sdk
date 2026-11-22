import { describe, it, expect, afterEach } from 'vitest'
import { FirekidScraper } from '../src/core/scraper.js'
import { config } from '../src/config.js'

const page = (body: string) => `data:text/html,${encodeURIComponent(`<html><body>${body}</body></html>`)}`

describe('FirekidScraper', () => {
  let scraper: FirekidScraper | null = null

  afterEach(async () => {
    await scraper?.close()
    scraper = null
  })

  it('defaults to headless', () => {
    expect(config.browser.headless).toBe(true)
  })

  it('should initialize successfully', async () => {
    scraper = new FirekidScraper({ headless: true })
    await scraper.init()

    expect(scraper.getBrowser()).toBeTruthy()
  })

  it('does not launch two browsers for concurrent init calls', async () => {
    scraper = new FirekidScraper({ headless: true })
    await Promise.all([scraper.init(), scraper.init()])

    expect(scraper.getBrowser()).toBeTruthy()
    expect(scraper.getBrowser()?.contexts()).toHaveLength(1)
  })

  it('should navigate to a URL', async () => {
    scraper = new FirekidScraper({ headless: true, bypassCloudflare: false })

    await scraper.goto(page('<h1>Hello</h1>'))

    expect(await scraper.getPage()?.textContent('h1')).toBe('Hello')
  })

  it('sends a complete user agent that matches the fingerprint', async () => {
    scraper = new FirekidScraper({ headless: true, bypassCloudflare: false })

    await scraper.goto(page('<p>ua</p>'))
    const ua = await scraper.getPage()!.evaluate(() => navigator.userAgent)

    expect(ua).toMatch(/Chrome\/\d+\.0\.0\.0 Safari\/537\.36$/)
    expect(ua).not.toContain('Headless')
  })

  it('honours a custom user agent and viewport', async () => {
    scraper = new FirekidScraper({
      headless: true,
      bypassCloudflare: false,
      userAgent: 'FirekidTest/1.0',
      viewport: { width: 800, height: 600 }
    })

    await scraper.goto(page('<p>custom</p>'))
    const info = await scraper.getPage()!.evaluate(() => ({
      ua: navigator.userAgent,
      width: window.innerWidth
    }))

    expect(info.ua).toBe('FirekidTest/1.0')
    expect(info.width).toBe(800)
  })

  it('extract returns null quickly for missing selectors', async () => {
    scraper = new FirekidScraper({ headless: true, bypassCloudflare: false, selectorTimeout: 500 })

    const started = Date.now()
    const data = await scraper.extract(page('<h1>Title</h1>'), {
      title: 'h1',
      missing: '.nope',
      alsoMissing: '.nada'
    })

    expect(data).toEqual({ title: 'Title', missing: null, alsoMissing: null })
    expect(Date.now() - started).toBeLessThan(3000)
  })

  it('scrape supports attributes and multiple matches', async () => {
    scraper = new FirekidScraper({ headless: true, bypassCloudflare: false, selectorTimeout: 500 })

    const result = await scraper.scrape(
      page('<a class="l" href="/a">A</a><a class="l" href="/b">B</a>'),
      { selectors: { links: '.l', texts: '.l' }, attribute: undefined, multiple: true }
    )

    expect(result.success).toBe(true)
    expect(result.data.links).toEqual(['A', 'B'])

    const hrefs = await scraper.scrape(
      page('<a class="l" href="/a">A</a><a class="l" href="/b">B</a>'),
      { selectors: { links: '.l' }, attribute: 'href', multiple: true }
    )

    expect(hrefs.data.links).toEqual(['/a', '/b'])
  })

  it('scrape reports selectors that did not match', async () => {
    scraper = new FirekidScraper({ headless: true, bypassCloudflare: false, selectorTimeout: 300 })

    const result = await scraper.scrape(page('<h1>x</h1>'), { selectors: { gone: '.gone' } })

    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain('gone')
  })

  it('runCommands executes an inline script', async () => {
    scraper = new FirekidScraper({ headless: true, bypassCloudflare: false })

    const result = await scraper.runCommands(
      `GOTO ${page('<h1>Inline</h1>')}\nEXTRACT h1 text AS heading`
    )

    expect(result.success).toBe(true)
    expect(result.data[0]).toMatchObject({ name: 'heading', data: ['Inline'] })
  })

  it('urlGuard rejects navigation before it happens', async () => {
    scraper = new FirekidScraper({
      headless: true,
      urlGuard: (url) => {
        if (url.includes('blocked.test')) throw new Error('blocked by guard')
      }
    })

    await expect(scraper.goto('http://blocked.test/')).rejects.toThrow('blocked by guard')
  })

  it('close can be called before init', async () => {
    scraper = new FirekidScraper()

    await expect(scraper.close()).resolves.toBeUndefined()
  })
})
