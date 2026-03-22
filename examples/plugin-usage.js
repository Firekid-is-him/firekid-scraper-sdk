import { FirekidScraper } from '@firekid/scraper'
import { PluginLoader } from '@firekid/scraper'

async function usePlugin() {
  const loader = new PluginLoader()
  await loader.loadAll()

  const scraper = new FirekidScraper()
  await scraper.goto('https://example-shop.com/product')

  const page = scraper.getPage()

  const productData = await loader.executePlugin('product-extractor', {
    page
  })

  console.log('Product data:', productData)

  await scraper.close()
}

usePlugin()
