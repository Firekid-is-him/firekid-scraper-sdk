import type { Page } from 'playwright'
import type { SelectorSet } from '../types.js'

export class SelectorGenerator {
  async generate(page: Page, element: any): Promise<SelectorSet> {
    const selectors: string[] = []

    if (element.id) {
      selectors.push(`#${element.id}`)
    }

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(Boolean)
      if (classes.length > 0) {
        selectors.push(`.${classes.join('.')}`)
      }
    }

    if (element.tagName) {
      const tag = element.tagName.toLowerCase()
      
      if (element.type) {
        selectors.push(`${tag}[type="${element.type}"]`)
      }
      
      if (element.href) {
        selectors.push(`${tag}[href*="${this.simplifyUrl(element.href)}"]`)
      }

      if (element.textContent) {
        const text = element.textContent.trim().slice(0, 30)
        if (text) {
          selectors.push(`${tag}:has-text("${text}")`)
        }
      }
    }

    const primary = selectors[0] || 'body'
    const fallbacks = selectors.slice(1)

    return { primary, fallbacks }
  }

  private simplifyUrl(url: string): string {
    try {
      const parsed = new URL(url)
      return parsed.pathname
    } catch {
      return url
    }
  }

  async generateCssPath(page: Page, element: any): Promise<string> {
    return await page.evaluate((el) => {
      const path: string[] = []
      let current = el

      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.nodeName.toLowerCase()
        
        if (current.id) {
          selector += `#${current.id}`
          path.unshift(selector)
          break
        } else {
          let sibling = current
          let nth = 1
          
          while (sibling.previousElementSibling) {
            sibling = sibling.previousElementSibling
            if (sibling.nodeName === current.nodeName) {
              nth++
            }
          }
          
          if (nth > 1) {
            selector += `:nth-of-type(${nth})`
          }
        }
        
        path.unshift(selector)
        current = current.parentNode
      }

      return path.join(' > ')
    }, element)
  }
}
