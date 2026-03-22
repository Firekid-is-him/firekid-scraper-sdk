export default {
  name: 'product-extractor',
  type: 'scraping',
  version: '1.0.0',
  
  async execute(context) {
    const { page } = context

    return await page.evaluate(() => {
      const product = {
        title: document.querySelector('h1, [class*="product-title"]')?.textContent?.trim(),
        price: document.querySelector('[class*="price"]')?.textContent?.trim(),
        description: document.querySelector('[class*="description"]')?.textContent?.trim(),
        images: Array.from(document.querySelectorAll('[class*="product"] img'))
          .map(img => img.src),
        rating: document.querySelector('[class*="rating"]')?.textContent?.trim(),
        availability: document.querySelector('[class*="stock"], [class*="availability"]')?.textContent?.trim()
      }

      return product
    })
  }
}
