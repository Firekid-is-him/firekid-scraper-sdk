import type { Page } from 'playwright'

export async function productScraperTemplate(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const selectors = {
      title: ['h1', '[class*="product-title"]', '[class*="product-name"]', '[itemprop="name"]'],
      price: ['[class*="price"]', '[itemprop="price"]', '[data-price]'],
      image: ['[class*="product-image"] img', '[class*="main-image"]', '[itemprop="image"]'],
      description: ['[class*="description"]', '[itemprop="description"]', '[class*="detail"]'],
      rating: ['[class*="rating"]', '[itemprop="ratingValue"]'],
      availability: ['[class*="stock"]', '[class*="availability"]', '[itemprop="availability"]']
    }

    const result: any = {}

    for (const [key, selectorList] of Object.entries(selectors)) {
      for (const selector of selectorList) {
        const element = document.querySelector(selector)
        if (element) {
          if (key === 'image') {
            result[key] = (element as HTMLImageElement).src
          } else {
            result[key] = element.textContent?.trim()
          }
          break
        }
      }
    }

    return result
  })
}
