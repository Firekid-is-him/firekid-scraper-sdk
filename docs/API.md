# API Reference

Complete API documentation for Firekid Scraper.

## FirekidScraper

Main scraper class.

### Constructor

```javascript
import { FirekidScraper } from '@firekid/scraper'

const scraper = new FirekidScraper({
  headless: true,
  bypassCloudflare: true,
  maxWorkers: 5,
  timeout: 30000,
  dataDir: './data',
  logLevel: 'info'
})
```

### Methods

#### auto(url)

Intelligent auto mode.

```javascript
const result = await scraper.auto('https://example.com')
```

Returns: `Promise<ScrapingResult>`

#### extract(url, selectors)

Extract specific data.

```javascript
const data = await scraper.extract('https://example.com', {
  title: 'h1',
  price: '.price',
  image: 'img.product'
})
```

Returns: `Promise<Record<string, any>>`

#### goto(url)

Navigate to URL.

```javascript
await scraper.goto('https://example.com')
```

Returns: `Promise<void>`

#### runCommandFile(filePath)

Execute a .cmd file.

```javascript
const result = await scraper.runCommandFile('./commands/mysite.cmd')
```

Returns: `Promise<ScrapingResult>`

#### close()

Close the browser.

```javascript
await scraper.close()
```

Returns: `Promise<void>`

#### getPage()

Get the Playwright page instance.

```javascript
const page = scraper.getPage()
```

Returns: `Page | null`

## ActionRecorder

Record browser actions.

### Constructor

```javascript
import { ActionRecorder } from '@firekid/scraper'

const recorder = new ActionRecorder()
```

### Methods

#### startRecording(url)

Start recording session.

```javascript
await recorder.startRecording('https://example.com')
```

Returns: `Promise<void>`

## PatternCache

Cache successful scraping patterns.

### Constructor

```javascript
import { PatternCache } from '@firekid/scraper'

const cache = new PatternCache()
```

### Methods

#### save(site, pattern)

Save a pattern.

```javascript
cache.save('example.com', {
  type: 'product',
  selectors: { title: 'h1', price: '.price' },
  flow: ['goto', 'extract'],
  successRate: 0.95
})
```

#### load(site)

Load a pattern.

```javascript
const pattern = cache.load('example.com')
```

Returns: `SitePattern | null`

#### updateSuccessRate(site, success)

Update success rate.

```javascript
cache.updateSuccessRate('example.com', true)
```

## SmartFetch

Intelligent fetching with auto-referer.

### Constructor

```javascript
import { SmartFetch } from '@firekid/scraper'

const fetcher = new SmartFetch()
```

### Methods

#### fetch(options)

Fetch a URL.

```javascript
const response = await fetcher.fetch({
  url: 'https://api.example.com/data',
  autoReferer: true,
  method: 'GET',
  headers: { 'X-Custom': 'value' }
})
```

Returns: `Promise<FetchResponse>`

#### download(url, outputPath, referer)

Download a file.

```javascript
await fetcher.download(
  'https://cdn.example.com/file.pdf',
  './downloads/file.pdf',
  'https://example.com'
)
```

Returns: `Promise<void>`

## CloudflareManager

Handle Cloudflare challenges.

### Constructor

```javascript
import { CloudflareManager } from '@firekid/scraper'

const cfManager = new CloudflareManager()
```

### Methods

#### handleCloudflare(page, url)

Handle Cloudflare protection.

```javascript
const success = await cfManager.handleCloudflare(page, url)
```

Returns: `Promise<boolean>`

#### detect(page)

Detect Cloudflare protection.

```javascript
const isProtected = await cfManager.detect(page)
```

Returns: `Promise<boolean>`

## Types

### ScrapingResult

```typescript
interface ScrapingResult {
  success: boolean
  data: any
  errors: string[]
  timestamp: number
}
```

### FirekidConfig

```typescript
interface FirekidConfig {
  headless?: boolean
  bypassCloudflare?: boolean
  maxWorkers?: number
  timeout?: number
  dataDir?: string
  logLevel?: 'error' | 'warn' | 'info' | 'debug'
}
```

### FetchOptions

```typescript
interface FetchOptions {
  url: string
  referer?: string
  autoReferer?: boolean
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  cookies?: Record<string, string>
  body?: any
  followRedirects?: boolean
  timeout?: number
}
```

## Server API

### Start Server

```javascript
import { startServer } from '@firekid/scraper/server'

await startServer(3000)
```

### Endpoints

#### POST /scrape

Scrape a URL.

```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"url": "https://example.com", "mode": "auto"}'
```

#### POST /command

Run a command file.

```bash
curl -X POST http://localhost:3000/command \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"filePath": "./commands/mysite.cmd"}'
```

#### GET /health

Health check.

```bash
curl http://localhost:3000/health
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Logger

```javascript
import { logger, setLogLevel } from '@firekid/scraper'

setLogLevel('debug')
logger.info('Message')
logger.error('Error message')
```
