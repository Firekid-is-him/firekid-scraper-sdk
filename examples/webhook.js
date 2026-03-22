import { FirekidScraper } from '@firekid/scraper'
import { WebhookNotifier } from '@firekid/scraper'

async function scrapeWithWebhook() {
  const webhook = new WebhookNotifier('https://your-webhook-url.com/endpoint')
  const scraper = new FirekidScraper()

  try {
    await webhook.sendProgress('task-123', 0)

    const data = await scraper.auto('https://example.com')

    await webhook.sendProgress('task-123', 100)
    await webhook.sendSuccess('task-123', data)

    await scraper.close()
  } catch (err) {
    await webhook.sendError('task-123', err.message)
    await scraper.close()
  }
}

scrapeWithWebhook()
