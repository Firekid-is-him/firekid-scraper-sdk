import type { BrowserContext } from 'playwright'
import type { Seed } from '../types.js'

export async function applyFontSpoof(context: BrowserContext, seed: Seed): Promise<void> {
  await context.addInitScript((fonts: string[]) => {
    const originalGetComputedStyle = window.getComputedStyle

    window.getComputedStyle = function(element, pseudoElt) {
      const styles = originalGetComputedStyle.call(this, element, pseudoElt)
      
      const originalGetPropertyValue = styles.getPropertyValue
      styles.getPropertyValue = function(property) {
        if (property === 'font-family') {
          const value = originalGetPropertyValue.call(this, property)
          const families = value.split(',').map(f => f.trim())
          
          const filtered = families.filter(family => {
            const cleanFamily = family.replace(/['"]/g, '')
            return fonts.some(f => cleanFamily.includes(f))
          })

          return filtered.length > 0 ? filtered.join(', ') : value
        }
        
        return originalGetPropertyValue.call(this, property)
      }

      return styles
    }
  }, seed.fonts)
}
