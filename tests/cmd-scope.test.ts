import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FirekidScraper } from '../src/core/scraper.js'
import { startFixtureServer, type FixtureServer } from './helpers/fixtures.js'

describe('command executor scoping and timeouts', () => {
  let fixtures: FixtureServer
  let scraper: FirekidScraper

  beforeAll(async () => {
    fixtures = await startFixtureServer()
    scraper = new FirekidScraper({ headless: true, bypassCloudflare: false, selectorTimeout: 1000, timeout: 10000 })
  })

  afterAll(async () => {
    await scraper.close()
    await fixtures.close()
  })

  const entry = (result: any, name: string) => result.data.find((d: any) => d.name === name)

  it('REPEAT extracts from the current element only', async () => {
    const result = await scraper.runCommands(`GOTO ${fixtures.url}/\nREPEAT .product\n  EXTRACT .title text AS title_{{index}}\n  EXTRACT .price text AS price_{{index}}`)

    expect(entry(result, 'title_1').data).toEqual(['Product 1'])
    expect(entry(result, 'title_2').data).toEqual(['Product 2'])
    expect(entry(result, 'title_3').data).toEqual(['Product 3'])
    expect(entry(result, 'price_3').data).toEqual(['$3.99'])
  })

  it('REPEAT yields nothing for an element without a match', async () => {
    const result = await scraper.runCommands(`GOTO ${fixtures.url}/\nREPEAT .product\n  EXTRACT .badge text AS badge_{{index}}`)

    expect(entry(result, 'badge_1').count).toBe(0)
    expect(entry(result, 'badge_2').data).toEqual(['sale'])
    expect(entry(result, 'badge_3').count).toBe(0)
  })

  it('REPEAT supports :scope and attribute extraction', async () => {
    const result = await scraper.runCommands(`GOTO ${fixtures.url}/\nREPEAT .product\n  EXTRACT .more attr:href AS href_{{index}}\n  EXTRACT :scope class AS cls_{{index}}`)

    expect(entry(result, 'href_2').data).toEqual(['/p/2'])
    expect(entry(result, 'cls_1').data).toEqual(['product'])
  })

  it('scope ends with the loop', async () => {
    const result = await scraper.runCommands(`GOTO ${fixtures.url}/\nREPEAT .product\n  EXTRACT .title text AS t_{{index}}\nEXTRACT .title text AS all`)

    expect(entry(result, 'all').data).toEqual(['Product 1', 'Product 2', 'Product 3'])
  })

  it('IF inside REPEAT checks the current element', async () => {
    const result = await scraper.runCommands(`GOTO ${fixtures.url}/\nREPEAT .product\n  IF .badge\n    EXTRACT .title text AS sale_{{index}}`)

    expect(entry(result, 'sale_2').data).toEqual(['Product 2'])
    expect(entry(result, 'sale_1')).toBeUndefined()
    expect(entry(result, 'sale_3')).toBeUndefined()
  })

  it('CLICK inside REPEAT prefers the current element and falls back to the page', async () => {
    const scoped = await scraper.runCommands(`GOTO ${fixtures.url}/\nREPEAT .product\n  CLICK .more\n  WAITLOAD\n  EXTRACT h2 text AS dummy\n  GOTO ${fixtures.url}/`)
    expect(scoped.success).toBe(true)

    const fallback = await scraper.runCommands(`GOTO ${fixtures.url}/\nREPEAT .product\n  CLICK .global\n  GOTO ${fixtures.url}/`)
    expect(fallback.errors).toEqual([])
  })

  it('nested REPEAT resolves inside the outer element', async () => {
    const result = await scraper.runCommands(`GOTO ${fixtures.url}/\nREPEAT .product\n  REPEAT .title\n    EXTRACT :scope text AS inner_{{index}}`)

    expect(result.errors).toEqual([])
    expect(result.data.length).toBeGreaterThan(0)
  })

  it('LOOP keeps global extraction', async () => {
    const result = await scraper.runCommands(`GOTO ${fixtures.url}/\nLOOP 2\n  EXTRACT .title text AS loop_{{index}}`)

    expect(entry(result, 'loop_1').count).toBe(3)
    expect(entry(result, 'loop_2').count).toBe(3)
  })

  it('uses selectorTimeout for a missing CLICK target', async () => {
    const started = Date.now()
    const result = await scraper.runCommands(`GOTO ${fixtures.url}/\nCLICK .does-not-exist`)
    const elapsed = Date.now() - started

    expect(result.errors.length).toBe(1)
    expect(elapsed).toBeLessThan(5000)
  })

  it('lets a per-call selectorTimeout override the scraper default', async () => {
    const started = Date.now()
    await scraper.runCommands(`GOTO ${fixtures.url}/\nCLICK .does-not-exist`, { selectorTimeout: 300 })

    expect(Date.now() - started).toBeLessThan(2500)
  })
})
