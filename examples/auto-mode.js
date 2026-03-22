import { FirekidScraper } from '@firekid/scraper'

async function autoScrape() {
  const scraper = new FirekidScraper()

  try {
    const result = await scraper.auto('https://example.com')

    console.log('Mode used:', result.data.mode)
    console.log('Data:', result.data)

    await scraper.close()
  } catch (err) {
    console.error('Error:', err)
    await scraper.close()
  }
}

autoScrape()
