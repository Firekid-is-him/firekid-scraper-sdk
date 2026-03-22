import { FirekidScraper } from '@firekid/scraper'

async function main() {
  const scraper = new FirekidScraper({
    headless: true,
    bypassCloudflare: true
  })

  try {
    console.log('Starting scraper...')

    const data = await scraper.extract('https://example.com', {
      title: 'h1',
      description: 'meta[name="description"]@content',
      links: 'a[href]@href'
    })

    console.log('Extracted data:', data)

    await scraper.close()
  } catch (err) {
    console.error('Error:', err)
    await scraper.close()
  }
}

main()
