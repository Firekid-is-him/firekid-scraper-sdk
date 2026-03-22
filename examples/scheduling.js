import { FirekidScraper } from '@firekid/scraper'
import { TaskScheduler } from '@firekid/scraper'

const scheduler = new TaskScheduler()

scheduler.schedule('daily-scrape', '0 0 * * *', async () => {
  console.log('Running daily scrape...')
  
  const scraper = new FirekidScraper()
  
  try {
    const data = await scraper.auto('https://example.com')
    console.log('Scraped data:', data)
  } catch (err) {
    console.error('Scrape failed:', err)
  } finally {
    await scraper.close()
  }
})

console.log('Scheduler started')
console.log('Daily scrape will run at midnight')

process.on('SIGINT', () => {
  scheduler.stopAll()
  process.exit()
})
