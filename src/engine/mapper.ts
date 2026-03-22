import type { Page } from 'playwright'
import { logger } from '../logger/logger.js'

export class DataMapper {
  async mapFields(page: Page, mapping: Record<string, string>): Promise<Record<string, any>> {
    const result: Record<string, any> = {}

    for (const [key, selector] of Object.entries(mapping)) {
      try {
        const value = await this.extractValue(page, selector)
        result[key] = value
      } catch (err) {
        logger.warn(`[mapper] Failed to map ${key}: ${selector}`)
        result[key] = null
      }
    }

    return result
  }

  private async extractValue(page: Page, selector: string): Promise<any> {
    const parts = selector.split('@')
    const actualSelector = parts[0].trim()
    const attribute = parts[1]?.trim()

    const element = page.locator(actualSelector).first()
    const count = await element.count()

    if (count === 0) return null

    if (attribute) {
      if (attribute === 'text') {
        return await element.textContent()
      } else {
        return await element.getAttribute(attribute)
      }
    }

    return await element.textContent()
  }

  async mapList(page: Page, itemSelector: string, fieldMapping: Record<string, string>): Promise<any[]> {
    const items = await page.locator(itemSelector).all()
    const results: any[] = []

    for (const item of items) {
      const mapped: Record<string, any> = {}

      for (const [key, selector] of Object.entries(fieldMapping)) {
        try {
          const subElement = item.locator(selector).first()
          const count = await subElement.count()

          if (count > 0) {
            const parts = selector.split('@')
            const attribute = parts[1]?.trim()

            if (attribute && attribute !== 'text') {
              mapped[key] = await subElement.getAttribute(attribute)
            } else {
              mapped[key] = await subElement.textContent()
            }
          } else {
            mapped[key] = null
          }
        } catch {
          mapped[key] = null
        }
      }

      results.push(mapped)
    }

    logger.info(`[mapper] Mapped ${results.length} items`)
    return results
  }

  async transformData(data: any, transformers: Record<string, (value: any) => any>): Promise<any> {
    const transformed: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      if (transformers[key]) {
        transformed[key] = transformers[key](value)
      } else {
        transformed[key] = value
      }
    }

    return transformed
  }
}
