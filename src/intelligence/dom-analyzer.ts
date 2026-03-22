import type { Page } from 'playwright'
import { logger } from '../logger/logger.js'

export class DOMAnalyzer {
  async analyze(page: Page): Promise<any> {
    logger.info('[dom-analyzer] Analyzing page structure...')

    return await page.evaluate(() => {
      const structure = {
        forms: 0,
        inputs: 0,
        buttons: 0,
        links: 0,
        images: 0,
        videos: 0,
        tables: 0,
        lists: 0,
        sections: 0,
        depth: 0,
        complexity: 0
      }

      structure.forms = document.querySelectorAll('form').length
      structure.inputs = document.querySelectorAll('input, textarea, select').length
      structure.buttons = document.querySelectorAll('button, input[type="submit"]').length
      structure.links = document.querySelectorAll('a[href]').length
      structure.images = document.querySelectorAll('img').length
      structure.videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length
      structure.tables = document.querySelectorAll('table').length
      structure.lists = document.querySelectorAll('ul, ol').length
      structure.sections = document.querySelectorAll('section, article, div[class*="container"]').length

      function getDepth(element: Element, depth: number = 0): number {
        if (!element.children.length) return depth
        let maxChildDepth = depth
        for (const child of Array.from(element.children)) {
          maxChildDepth = Math.max(maxChildDepth, getDepth(child, depth + 1))
        }
        return maxChildDepth
      }

      structure.depth = getDepth(document.body)
      structure.complexity = document.querySelectorAll('*').length

      return structure
    })
  }

  async identifyContentAreas(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const areas: any[] = []
      const candidates = document.querySelectorAll('main, article, section, div[class*="content"], div[id*="content"]')

      for (const el of candidates) {
        const rect = el.getBoundingClientRect()
        const text = el.textContent?.trim() || ''
        
        if (text.length > 100 && rect.height > 200) {
          areas.push({
            tag: el.tagName.toLowerCase(),
            id: el.id,
            class: el.className,
            textLength: text.length,
            height: rect.height,
            selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`
          })
        }
      }

      return areas.sort((a, b) => b.textLength - a.textLength)
    })
  }

  async detectSPA(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const hasReactRoot = !!document.querySelector('[id*="root"], [id*="app"]')
      const hasVueApp = !!(window as any).__VUE__
      const hasAngular = !!(window as any).ng
      const hasDataReactRoot = !!document.querySelector('[data-reactroot]')

      return hasReactRoot || hasVueApp || hasAngular || hasDataReactRoot
    })
  }

  async findDataTables(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const tables: any[] = []
      const tableElements = document.querySelectorAll('table')

      for (const table of tableElements) {
        const rows = table.querySelectorAll('tr')
        const headers = Array.from(table.querySelectorAll('th')).map((th: Element) => th.textContent?.trim())
        
        if (rows.length > 2 && headers.length > 0) {
          tables.push({
            selector: table.id ? `#${table.id}` : 'table',
            rows: rows.length,
            columns: headers.length,
            headers
          })
        }
      }

      return tables
    })
  }
}
