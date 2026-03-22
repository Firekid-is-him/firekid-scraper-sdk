import type { Page } from 'playwright'
import * as cheerio from 'cheerio'
import { logger } from '../logger/logger.js'

export class DataExtractor {
  async extractHTML(page: Page): Promise<string> {
    return await page.content()
  }

  async extractWithCheerio(html: string, selectors: Record<string, string>): Promise<Record<string, any>> {
    const $ = cheerio.load(html)
    const result: Record<string, any> = {}

    for (const [key, selector] of Object.entries(selectors)) {
      const parts = selector.split('@')
      const actualSelector = parts[0].trim()
      const attribute = parts[1]?.trim()

      if (attribute && attribute !== 'text') {
        result[key] = $(actualSelector).attr(attribute) || null
      } else {
        result[key] = $(actualSelector).text().trim() || null
      }
    }

    return result
  }

  async extractJSON(page: Page, jsonSelector: string = 'script[type="application/ld+json"]'): Promise<any> {
    return await page.evaluate((selector) => {
      const scripts = document.querySelectorAll(selector)
      const data: any[] = []

      for (const script of scripts) {
        try {
          const json = JSON.parse(script.textContent || '{}')
          data.push(json)
        } catch {
          continue
        }
      }

      return data.length === 1 ? data[0] : data
    }, jsonSelector)
  }

  async extractMetadata(page: Page): Promise<Record<string, any>> {
    return await page.evaluate(() => {
      const meta: Record<string, any> = {}

      const metaTags = document.querySelectorAll('meta')
      for (const tag of metaTags) {
        const name = tag.getAttribute('name') || tag.getAttribute('property')
        const content = tag.getAttribute('content')

        if (name && content) {
          meta[name] = content
        }
      }

      const title = document.querySelector('title')?.textContent
      if (title) meta.title = title

      const canonical = document.querySelector('link[rel="canonical"]')
      if (canonical) meta.canonical = canonical.getAttribute('href')

      return meta
    })
  }

  async extractLinks(page: Page, filter?: string): Promise<Array<{ text: string; href: string }>> {
    return await page.evaluate((filterPattern) => {
      const links = Array.from(document.querySelectorAll('a[href]'))
      const results: Array<{ text: string; href: string }> = []

      for (const link of links) {
        const anchor = link as HTMLAnchorElement
        const href = anchor.href
        const text = anchor.textContent?.trim() || ''

        if (!filterPattern || href.includes(filterPattern)) {
          results.push({ text, href })
        }
      }

      return results
    }, filter)
  }

  async extractImages(page: Page): Promise<Array<{ src: string; alt: string }>> {
    return await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img[src]'))
      return images.map(img => ({
        src: (img as HTMLImageElement).src,
        alt: (img as HTMLImageElement).alt || ''
      }))
    })
  }

  async extractTable(page: Page, tableSelector: string = 'table'): Promise<any[]> {
    return await page.evaluate((selector) => {
      const table = document.querySelector(selector)
      if (!table) return []

      const rows = Array.from(table.querySelectorAll('tr'))
      const data: any[] = []

      const headers = Array.from(rows[0]?.querySelectorAll('th, td') || [])
        .map(cell => cell.textContent?.trim() || '')

      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td'))
        const rowData: Record<string, string> = {}

        cells.forEach((cell, idx) => {
          const header = headers[idx] || `column_${idx}`
          rowData[header] = cell.textContent?.trim() || ''
        })

        data.push(rowData)
      }

      return data
    }, tableSelector)
  }

  async extractAll(page: Page): Promise<Record<string, any>> {
    logger.info('[extractor] Extracting all data...')

    const [metadata, links, images, json] = await Promise.all([
      this.extractMetadata(page),
      this.extractLinks(page),
      this.extractImages(page),
      this.extractJSON(page).catch(() => null)
    ])

    return {
      metadata,
      links,
      images,
      structuredData: json
    }
  }
}
