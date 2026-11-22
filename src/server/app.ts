import crypto from 'crypto'
import fs from 'fs'
import http from 'http'
import path from 'path'
import express, { type Request, type Response, type NextFunction } from 'express'
import { rateLimit } from 'express-rate-limit'
import { FirekidScraper } from '../core/scraper.js'
import { logger } from '../logger/logger.js'
import { config } from '../config.js'
import { assertPublicUrl } from './url-guard.js'

const MAX_SELECTORS = 50
const MAX_SELECTOR_LENGTH = 500

function safeEqual(a: string, b: string): boolean {
  const left = crypto.createHash('sha256').update(a).digest()
  const right = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(left, right)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms)

    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      err => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

function parseSelectors(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0 || entries.length > MAX_SELECTORS) return null

  const selectors: Record<string, string> = {}

  for (const [key, selector] of entries) {
    if (typeof selector !== 'string' || selector.length === 0 || selector.length > MAX_SELECTOR_LENGTH) {
      return null
    }
    selectors[key] = selector
  }

  return selectors
}

export function createApp(): express.Express {
  const app = express()
  let active = 0

  app.disable('x-powered-by')

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() })
  })

  if (config.rateLimit.enabled) {
    app.use(rateLimit({
      windowMs: config.rateLimit.window,
      limit: config.rateLimit.max,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' }
    }))
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    const provided = req.headers['x-api-key']

    if (typeof provided !== 'string' || !safeEqual(provided, config.server.apiKey)) {
      res.status(401).json({ error: 'Invalid API key' })
      return
    }

    next()
  })

  app.use(express.json({ limit: '100kb' }))

  const acquireSlot = (req: Request, res: Response, next: NextFunction) => {
    if (active >= config.server.maxConcurrent) {
      res.status(429).json({ error: 'Server is busy, try again shortly' })
      return
    }

    active++
    let released = false

    res.on('close', () => {
      if (released) return
      released = true
      active--
    })

    next()
  }

  app.post('/scrape', acquireSlot, async (req: Request, res: Response) => {
    const { url, mode = 'auto', selectors } = req.body ?? {}

    if (typeof url !== 'string' || !url) {
      res.status(400).json({ error: 'URL is required' })
      return
    }

    if (mode !== 'auto' && mode !== 'extract') {
      res.status(400).json({ error: 'Mode must be "auto" or "extract"' })
      return
    }

    const parsedSelectors = mode === 'extract' ? parseSelectors(selectors) : null

    if (mode === 'extract' && !parsedSelectors) {
      res.status(400).json({ error: 'Extract mode needs a selectors object of strings' })
      return
    }

    try {
      await assertPublicUrl(url)
    } catch (err) {
      res.status(400).json({ error: (err as Error).message })
      return
    }

    const scraper = new FirekidScraper({ urlGuard: assertPublicUrl })

    try {
      const work = mode === 'auto'
        ? scraper.auto(url)
        : scraper.extract(url, parsedSelectors as Record<string, string>)

      const result = await withTimeout(work, config.server.requestTimeout)

      res.json({ success: true, result })
    } catch (err: any) {
      logger.error('[api] Scraping error:', err)
      res.status(500).json({ error: 'Scraping failed' })
    } finally {
      await scraper.close()
    }
  })

  app.post('/command', acquireSlot, async (req: Request, res: Response) => {
    const { filePath } = req.body ?? {}

    if (typeof filePath !== 'string' || !filePath) {
      res.status(400).json({ error: 'File path is required' })
      return
    }

    const baseDir = path.resolve(config.server.commandDir)
    const requested = path.resolve(baseDir, filePath)

    if (path.extname(requested) !== '.cmd') {
      res.status(400).json({ error: 'Only .cmd files can be run' })
      return
    }

    let resolved: string

    try {
      const realBase = fs.realpathSync(baseDir)
      resolved = fs.realpathSync(requested)

      const relative = path.relative(realBase, resolved)
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        res.status(400).json({ error: 'File must be inside the commands directory' })
        return
      }
    } catch {
      res.status(404).json({ error: 'Command file not found' })
      return
    }

    const scraper = new FirekidScraper({ urlGuard: assertPublicUrl })

    try {
      const result = await withTimeout(
        scraper.runCommandFile(resolved, { workDir: path.resolve(config.server.outputDir) }),
        config.server.requestTimeout
      )

      res.json({ success: true, result })
    } catch (err: any) {
      logger.error('[api] Command execution error:', err)
      res.status(500).json({ error: 'Command execution failed' })
    } finally {
      await scraper.close()
    }
  })

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err)
      return
    }

    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body too large' })
      return
    }

    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body must be valid JSON' })
      return
    }

    logger.error('[api] Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

export async function startServer(
  port: number = config.server.port,
  host: string = config.server.host
): Promise<http.Server> {
  if (!config.server.apiKey) {
    throw new Error('API_KEY must be set before the API server can start')
  }

  const app = createApp()

  const server = await new Promise<http.Server>((resolve, reject) => {
    const instance = app.listen(port, host, () => resolve(instance))
    instance.once('error', reject)
  })

  logger.info(`[server] Firekid API server running on ${host}:${port}`)
  console.log(`\nFirekid Scraper API Server`)
  console.log(`Listening: ${host}:${port}`)
  console.log(`Health: http://${host}:${port}/health\n`)

  const shutdown = () => {
    server.close(() => process.exit(0))
  }

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)

  return server
}
