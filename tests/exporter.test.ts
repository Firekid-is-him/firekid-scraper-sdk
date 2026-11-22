import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { DataExporter } from '../src/output/exporter.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('DataExporter', () => {
  const exporter = new DataExporter()
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fk-exp-'))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('should export to JSON', async () => {
    const data = { test: 'data', count: 42 }
    const file = path.join(dir, 'a.json')

    await exporter.toJSON(data, file)

    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(data)
  })

  it('should export array to CSV', async () => {
    const file = path.join(dir, 'a.csv')
    await exporter.toCSV([{ name: 'Item 1', price: 10 }, { name: 'Item 2', price: 20 }], file)

    const content = fs.readFileSync(file, 'utf8')
    expect(content).toContain('name,price')
    expect(content).toContain('Item 1,10')
  })

  it('quotes commas, quotes and newlines in CSV so rows stay intact', async () => {
    const file = path.join(dir, 'b.csv')
    await exporter.toCSV([{ a: 'x,y', b: 'say "hi"', c: 'l1\nl2' }], file)

    expect(fs.readFileSync(file, 'utf8')).toBe('a,b,c\n"x,y","say ""hi""","l1\nl2"')
  })

  it('neutralises spreadsheet formulas but keeps plain numbers', async () => {
    const file = path.join(dir, 'c.csv')
    await exporter.toCSV([{ f: '=1+1', g: '@cmd', n: '-12.5', m: 7 }], file)

    const row = fs.readFileSync(file, 'utf8').split('\n')[1]
    expect(row).toBe("'=1+1,'@cmd,-12.5,7")
  })

  it('uses the union of keys across rows and serialises objects', async () => {
    const file = path.join(dir, 'd.csv')
    await exporter.toCSV([{ a: 1 }, { a: 2, b: { x: 1 } }], file)

    expect(fs.readFileSync(file, 'utf8')).toBe('a,b\n1,\n2,"{""x"":1}"')
  })

  it('escapes scraped data in HTML output', async () => {
    const file = path.join(dir, 'a.html')
    await exporter.toHTML([{ v: '<script>alert(1)</script>', w: '"&"' }], file)

    const html = fs.readFileSync(file, 'utf8')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&amp;')
    expect(html).not.toContain('"&"')
  })

  it('injects escaped data into a custom HTML template', async () => {
    const file = path.join(dir, 'b.html')
    await exporter.toHTML({ v: '<b>' }, file, '<main>{{data}}</main>')

    const html = fs.readFileSync(file, 'utf8')
    expect(html.startsWith('<main>')).toBe(true)
    expect(html).toContain('&lt;b&gt;')
  })

  it('escapes pipes and newlines in Markdown and keeps falsy values', async () => {
    const file = path.join(dir, 'a.md')
    await exporter.toMarkdown([{ a: 'x|y', b: 'l1\nl2', c: 0, d: false, e: null }], file)

    const lines = fs.readFileSync(file, 'utf8').split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[2]).toBe('| x\\|y | l1<br>l2 | 0 | false |  |')
  })

  it('skips empty data for CSV and Markdown', async () => {
    await exporter.toCSV([], path.join(dir, 'e.csv'))
    await exporter.toMarkdown([], path.join(dir, 'e.md'))

    expect(fs.existsSync(path.join(dir, 'e.csv'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'e.md'))).toBe(false)
  })
})
