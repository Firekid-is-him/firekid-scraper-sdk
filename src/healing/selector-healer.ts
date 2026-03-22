import type { Page } from 'playwright'
import { selectorStrategies } from './selector-matrix.js'
import { logger } from '../logger/logger.js'

export class SelectorHealer {
  async heal(page: Page, brokenSelector: string, intent: string): Promise<string | null> {
    logger.warn(`[selector-healer] Selector failed: ${brokenSelector}, attempting to heal...`)

    for (const strategy of selectorStrategies) {
      try {
        const newSelector = await strategy.execute(page, intent)
        
        if (newSelector) {
          const exists = await page.locator(newSelector).count() > 0
          
          if (exists) {
            logger.info(`[selector-healer] Healed using "${strategy.name}" strategy: ${newSelector}`)
            return newSelector
          }
        }
      } catch (err) {
        continue
      }
    }

    logger.error(`[selector-healer] Could not heal selector for intent: ${intent}`)
    return null
  }

  async findBestSelector(page: Page, intent: string): Promise<string | null> {
    const candidates: Array<{ selector: string; strategy: string }> = []

    for (const strategy of selectorStrategies) {
      try {
        const selector = await strategy.execute(page, intent)
        
        if (selector) {
          const count = await page.locator(selector).count()
          if (count > 0) {
            candidates.push({ selector, strategy: strategy.name })
          }
        }
      } catch {
        continue
      }
    }

    if (candidates.length === 0) return null

    logger.info(`[selector-healer] Found ${candidates.length} selector candidates for "${intent}"`)
    
    return candidates[0].selector
  }

  async testSelector(page: Page, selector: string): Promise<boolean> {
    try {
      const count = await page.locator(selector).count()
      return count > 0
    } catch {
      return false
    }
  }

  async suggestAlternatives(page: Page, selector: string): Promise<string[]> {
    const alternatives: string[] = []

    try {
      const element = await page.locator(selector).first()
      
      const id = await element.getAttribute('id')
      if (id) alternatives.push(`#${id}`)

      const className = await element.getAttribute('class')
      if (className) {
        const classes = className.split(' ').filter(Boolean)
        if (classes.length > 0) {
          alternatives.push(`.${classes[0]}`)
        }
      }

      const tag = await element.evaluate(el => el.tagName.toLowerCase())
      alternatives.push(tag)

      const text = await element.textContent()
      if (text && text.length < 50) {
        alternatives.push(`${tag}:has-text("${text.trim()}")`)
      }

    } catch {
      logger.warn(`[selector-healer] Could not suggest alternatives for: ${selector}`)
    }

    return alternatives
  }
}
