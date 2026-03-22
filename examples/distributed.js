import { DistributedEngine } from '@firekid/scraper'

async function distributedScrape() {
  const engine = new DistributedEngine(5)

  try {
    await engine.initialize()

    const urls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3',
      'https://example.com/page4',
      'https://example.com/page5'
    ]

    for (let i = 0; i < urls.length; i++) {
      await engine.addTask({
        id: `task-${i}`,
        url: urls[i],
        mode: 'scrape',
        options: {},
        priority: 1,
        retries: 0
      })
    }

    const results = await engine.processTasks()

    console.log(`Completed ${results.length} tasks`)

    await engine.shutdown()
  } catch (err) {
    console.error('Error:', err)
    await engine.shutdown()
  }
}

distributedScrape()
