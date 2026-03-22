import type { Page } from 'playwright'
import type { SelectorStrategy } from '../types.js'

export const selectorStrategies: SelectorStrategy[] = [
  {
    name: 'ID',
    async execute(page: Page, intent: string): Promise<string | null> {
      const selector = await page.evaluate((keyword) => {
        const elements = document.querySelectorAll('[id]')
        for (const el of elements) {
          const id = el.id.toLowerCase()
          if (id.includes(keyword.toLowerCase())) {
            return `#${el.id}`
          }
        }
        return null
      }, intent)

      return selector
    }
  },

  {
    name: 'Class',
    async execute(page: Page, intent: string): Promise<string | null> {
      const selector = await page.evaluate((keyword) => {
        const elements = document.querySelectorAll('[class]')
        for (const el of elements) {
          const classes = el.className.toString().toLowerCase()
          if (classes.includes(keyword.toLowerCase())) {
            const firstClass = el.className.split(' ')[0]
            return `.${firstClass}`
          }
        }
        return null
      }, intent)

      return selector
    }
  },

  {
    name: 'Text Content',
    async execute(page: Page, intent: string): Promise<string | null> {
      const selector = await page.evaluate((keyword) => {
        const elements = document.querySelectorAll('*')
        for (const el of elements) {
          const text = el.textContent?.trim().toLowerCase() || ''
          if (text.includes(keyword.toLowerCase()) && text.length < 100) {
            const tag = el.tagName.toLowerCase()
            return `${tag}:has-text("${keyword}")`
          }
        }
        return null
      }, intent)

      return selector
    }
  },

  {
    name: 'ARIA Label',
    async execute(page: Page, intent: string): Promise<string | null> {
      const selector = await page.evaluate((keyword) => {
        const elements = document.querySelectorAll('[aria-label]')
        for (const el of elements) {
          const label = el.getAttribute('aria-label')?.toLowerCase() || ''
          if (label.includes(keyword.toLowerCase())) {
            return `[aria-label*="${keyword}"]`
          }
        }
        return null
      }, intent)

      return selector
    }
  },

  {
    name: 'Placeholder',
    async execute(page: Page, intent: string): Promise<string | null> {
      const selector = await page.evaluate((keyword) => {
        const inputs = document.querySelectorAll('input, textarea')
        for (const input of inputs) {
          const placeholder = (input as HTMLInputElement).placeholder?.toLowerCase() || ''
          if (placeholder.includes(keyword.toLowerCase())) {
            return `input[placeholder*="${keyword}"]`
          }
        }
        return null
      }, intent)

      return selector
    }
  },

  {
    name: 'Data Attribute',
    async execute(page: Page, intent: string): Promise<string | null> {
      const selector = await page.evaluate((keyword) => {
        const elements = document.querySelectorAll('[data-testid], [data-test], [data-id]')
        for (const el of elements) {
          const testId = el.getAttribute('data-testid')?.toLowerCase() || ''
          const test = el.getAttribute('data-test')?.toLowerCase() || ''
          const id = el.getAttribute('data-id')?.toLowerCase() || ''

          if (testId.includes(keyword.toLowerCase())) return `[data-testid*="${keyword}"]`
          if (test.includes(keyword.toLowerCase())) return `[data-test*="${keyword}"]`
          if (id.includes(keyword.toLowerCase())) return `[data-id*="${keyword}"]`
        }
        return null
      }, intent)

      return selector
    }
  },

  {
    name: 'Role',
    async execute(page: Page, intent: string): Promise<string | null> {
      const selector = await page.evaluate((keyword) => {
        const roles = ['button', 'link', 'textbox', 'searchbox', 'combobox', 'listbox']
        for (const role of roles) {
          if (keyword.toLowerCase().includes(role)) {
            return `[role="${role}"]`
          }
        }
        return null
      }, intent)

      return selector
    }
  }
]

export function getAllStrategies(): SelectorStrategy[] {
  return selectorStrategies
}
