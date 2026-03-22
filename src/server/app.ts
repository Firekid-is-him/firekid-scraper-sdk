import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { FirekidScraper } from '../core/scraper.js'
import { logger } from '../logger/logger.js'
import { config } from '../config.js'

const app = express()

app.use(express.json())

const limiter = rateLimit({
  windowMs: config.rateLimit.window,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later'
})

if (config.rateLimit.enabled) {
  app.use(limiter)
}

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key']
  
  if (config.server.apiKey && apiKey !== config.server.apiKey) {
    return res.status(401).json({ error: 'Invalid API key' })
  }
  
  next()
})

app.post('/scrape', async (req, res) => {
  const { url, mode = 'auto', selectors } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  const scraper = new FirekidScraper()

  try {
    let result

    if (mode === 'auto') {
      result = await scraper.auto(url)
    } else if (mode === 'extract' && selectors) {
      result = await scraper.extract(url, selectors)
    } else {
      return res.status(400).json({ error: 'Invalid mode or missing parameters' })
    }

    await scraper.close()

    res.json({ success: true, result })
  } catch (err: any) {
    await scraper.close()
    logger.error('[api] Scraping error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/command', async (req, res) => {
  const { filePath } = req.body

  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' })
  }

  const scraper = new FirekidScraper()

  try {
    const result = await scraper.runCommandFile(filePath)
    await scraper.close()

    res.json({ success: true, result })
  } catch (err: any) {
    await scraper.close()
    logger.error('[api] Command execution error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

export async function startServer(port: number = 3000): Promise<void> {
  app.listen(port, () => {
    logger.info(`[server] Firekid API server running on port ${port}`)
    console.log(`\nFirekid Scraper API Server`)
    console.log(`Port: ${port}`)
    console.log(`Health: http://localhost:${port}/health\n`)
  })
}
