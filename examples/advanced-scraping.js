import { FirekidScraper } from '@firekid/scraper'
import { DataExporter } from '@firekid/scraper'
import { WebhookNotifier } from '@firekid/scraper'
import { DistributedEngine } from '@firekid/scraper'

async function advancedScraping() {
  const exporter = new DataExporter()
  const webhook = new WebhookNotifier('https://your-webhook.com/endpoint')
  const engine = new DistributedEngine(10)

  try {
    await engine.initialize()

    const urls = [
      'https://example.com/category1',
      'https://example.com/category2',
      'https://example.com/category3'
    ]

    for (let i = 0; i < urls.length; i++) {
      await engine.addTask({
        id: `task-${i}`,
        url: urls[i],
        mode: 'scrape',
        options: {
          selectors: {
            title: 'h1',
            items: '.product-item'
          }
        },
        priority: i === 0 ? 10 : 1,
        retries: 0
      })
    }

    await webhook.sendProgress('scraping-job', 0)

    const results = await engine.processTasks()

    await webhook.sendProgress('scraping-job', 100)

    const allData = results.flatMap(r => r.data?.items || [])

    await exporter.toJSON(allData, './output/results.json')
    await exporter.toCSV(allData, './output/results.csv')

    await webhook.sendSuccess('scraping-job', {
      totalItems: allData.length,
      totalPages: results.length
    })

    console.log(`Scraped ${allData.length} items from ${results.length} pages`)

    await engine.shutdown()
  } catch (err) {
    console.error('Scraping failed:', err)
    await webhook.sendError('scraping-job', err.message)
    await engine.shutdown()
  }
}

advancedScraping()
