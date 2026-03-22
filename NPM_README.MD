# Firekid Scraper

Advanced web scraping framework built on Playwright with intelligent anti-detection, automatic healing, and distributed crawling capabilities.

## Features

**Anti-Detection & Stealth:**
- Ghost fingerprinting system spoofs canvas, WebGL, audio, fonts, and navigator properties
- Cloudflare bypass with automatic fallback to manual solving
- Behavioral profiles that mimic human interaction patterns
- Network forensics cleaning removes tracking artifacts

**Intelligent Automation:**
- Self-healing selectors with 7 fallback strategies
- Pattern caching with SQLite storage for learned behaviors
- Smart fetch with automatic referer chain management
- Action recorder captures and replays user interactions

**Distributed Crawling:**
- Queue-based task distribution across multiple workers
- Browser worker pool with resource management
- Rate limiting with configurable windows and thresholds
- Session persistence and recovery

**Developer Experience:**
- Simple command-based scripting language
- Plugin system for extensibility
- Multiple scraping modes: auto, manual, SSR, infinite scroll, pagination
- Built-in scheduler for recurring tasks
- Webhook notifications and database export

## Installation

```bash
npm install @firekid/scraper
npx playwright install chromium
```

### Global CLI Installation

```bash
npm install -g @firekid/scraper
firekid-scraper --help
```

### Docker Installation

```bash
docker pull firekid/scraper:latest
docker run -v $(pwd)/data:/data firekid/scraper
```

## Quick Start

### Basic Scraping

```javascript
import { FirekidScraper } from '@firekid/scraper'

const scraper = new FirekidScraper({
  headless: true,
  bypassCloudflare: true
})

await scraper.init()

const data = await scraper.scrape('https://example.com', {
  selectors: {
    title: 'h1',
    content: '.article-body',
    author: '.author-name'
  }
})

console.log(data)
await scraper.close()
```

### Command-Based Scripting

```javascript
const scraper = new FirekidScraper()
await scraper.init()

await scraper.runCommands(`
GOTO https://example.com
WAIT .product-list
EXTRACT .product-title text AS titles
EXTRACT .product-price text AS prices
SCREENSHOT products.png
`)

await scraper.close()
```

### Auto Mode

```javascript
const scraper = new FirekidScraper()
await scraper.init()

const data = await scraper.auto('https://example.com/products', {
  depth: 2,
  extractPattern: 'product'
})

await scraper.close()
```

## Core API

### FirekidScraper

Main scraper class that orchestrates all operations.

**Constructor Options:**

```javascript
new FirekidScraper({
  headless: boolean,           // Run browser in headless mode (default: true)
  bypassCloudflare: boolean,   // Enable Cloudflare bypass (default: false)
  useGhost: boolean,           // Enable fingerprint spoofing (default: true)
  browserArgs: string[],       // Additional Chromium arguments
  timeout: number,             // Default timeout in ms (default: 30000)
  userAgent: string,           // Custom user agent
  viewport: { width, height }, // Browser viewport size
  proxy: string,               // Proxy URL (http://user:pass@host:port)
  rateLimit: {                 // Rate limiting configuration
    enabled: boolean,
    max: number,
    window: number
  }
})
```

**Methods:**

`await scraper.init()`: Initialize browser and context.

`await scraper.close()`: Close browser and cleanup resources.

`await scraper.goto(url)`: Navigate to URL with anti-detection measures.

`await scraper.scrape(url, options)`: Extract data using CSS selectors.

Options:
- `selectors`: Object mapping field names to CSS selectors
- `attribute`: Extract attribute instead of text (default: text)
- `multiple`: Return array of all matches (default: false)
- `screenshot`: Take screenshot after extraction

`await scraper.runCommands(script)`: Execute command-based script.

`await scraper.auto(url, options)`: Automatically detect and extract data.

Options:
- `depth`: Maximum crawl depth (default: 1)
- `extractPattern`: Pattern hint (product, article, listing, etc)
- `followLinks`: Follow pagination/navigation links

`await scraper.paginate(url, selector, options)`: Scrape paginated content.

Options:
- `maxPages`: Maximum pages to scrape
- `waitBetween`: Delay between pages in ms
- `nextSelector`: Selector for next page button

`await scraper.infiniteScroll(url, options)`: Scrape infinite scroll pages.

Options:
- `maxScrolls`: Maximum scroll iterations
- `itemSelector`: Selector for items to extract
- `scrollDelay`: Delay between scrolls in ms

### Plugin System

Extend functionality through plugins.

**Loading Plugins:**

```javascript
const scraper = new FirekidScraper()
await scraper.loadPlugin('./plugins/custom-plugin.js')
```

**Plugin Structure:**

```javascript
export default {
  name: 'custom-extractor',
  type: 'extractor',
  
  async execute(page, options) {
    const data = await page.evaluate(() => {
      return {
        title: document.title,
        meta: Array.from(document.querySelectorAll('meta'))
          .map(m => ({ name: m.name, content: m.content }))
      }
    })
    return data
  }
}
```

**Plugin Types:**
- `scraping`: Custom scraping logic
- `action`: Custom page actions
- `extractor`: Data extraction methods
- `filter`: Data filtering and validation
- `output`: Custom output formats
- `parser`: Data parsing and transformation

### Distributed Scraping

Scale scraping across multiple workers.

```javascript
import { DistributedEngine } from '@firekid/scraper'

const engine = new DistributedEngine({
  workers: 5,
  queueSize: 100,
  retries: 3
})

await engine.init()

engine.addTask({
  id: 'task-1',
  url: 'https://example.com',
  mode: 'scrape',
  options: {
    selectors: { title: 'h1' }
  },
  priority: 10
})

engine.on('taskComplete', (result) => {
  console.log('Task completed:', result)
})

engine.on('taskFailed', (error) => {
  console.error('Task failed:', error)
})

await engine.start()
```

## Command Reference

Commands use simple syntax for browser automation.

### Navigation Commands

`GOTO url`: Navigate to URL.
Example: `GOTO https://example.com`

`BACK`: Go back in history.

`FORWARD`: Go forward in history.

`REFRESH`: Reload current page.

### Interaction Commands

`CLICK selector`: Click element.
Example: `CLICK button.submit`

`TYPE selector text`: Type text into input.
Example: `TYPE input[name="search"] laptop`

`PRESS key`: Press keyboard key.
Example: `PRESS Enter`

`SELECT selector value`: Select dropdown option.
Example: `SELECT select[name="country"] US`

`CHECK selector`: Check checkbox.
Example: `CHECK input[type="checkbox"]`

`UPLOAD selector filepath`: Upload file.
Example: `UPLOAD input[type="file"] ./document.pdf`

### Wait Commands

`WAIT selector`: Wait for element to appear.
Example: `WAIT .product-list`

`WAITLOAD`: Wait for page load.

### Scroll Commands

`SCROLL selector`: Scroll element into view.
Example: `SCROLL .footer`

`SCROLLDOWN pixels`: Scroll down by pixels.
Example: `SCROLLDOWN 500`

### Extraction Commands

`SCAN`: Analyze page structure.

`EXTRACT selector type AS variable`: Extract data.
Types: text, html, attr:name, href, src
Example: `EXTRACT h1 text AS title`

`SCREENSHOT filename`: Take screenshot.
Example: `SCREENSHOT page.png`

### Advanced Commands

`PAGINATE selector`: Auto-paginate through results.
Example: `PAGINATE .next-page`

`INFINITESCROLL count`: Scroll and load more items.
Example: `INFINITESCROLL 10`

`FETCH url`: Fetch URL with smart referer.
Example: `FETCH https://api.example.com/data`

`DOWNLOAD url`: Download file.
Example: `DOWNLOAD https://example.com/file.pdf`

`REFERER url`: Set custom referer.
Example: `REFERER https://google.com`

`BYPASS_CLOUDFLARE`: Attempt Cloudflare bypass.

### Flow Control

`REPEAT selector`: Loop over matching elements.
```
REPEAT .product
  EXTRACT .title text AS titles
  EXTRACT .price text AS prices
```

`IF selector`: Conditional execution.
```
IF .login-button
  CLICK .login-button
  TYPE input[name="username"] admin
```

`LOOP count`: Repeat commands N times.
```
LOOP 5
  SCROLLDOWN 300
  WAIT 1000
```

## Configuration

### Environment Variables

`HEADLESS`: Run in headless mode (true/false)
`MAX_QUEUE_WORKERS`: Maximum concurrent workers (number)
`BROWSER_TIMEOUT`: Browser timeout in ms (number)
`CF_BYPASS`: Cloudflare bypass mode (auto/manual/skip)
`TURNSTILE_SOLVER`: Turnstile solver (skip/manual/2captcha/capsolver)
`CAPTCHA_API_KEY`: API key for captcha solver
`API_ENABLED`: Enable web API (true/false)
`API_PORT`: API server port (number)
`API_KEY`: API authentication key
`PROXY_ENABLED`: Enable proxy (true/false)
`PROXY_URL`: Proxy URL
`DATA_DIR`: Data storage directory
`PATTERNS_DB`: Pattern cache database path
`SESSIONS_DB`: Session storage database path
`LOG_LEVEL`: Logging level (error/warn/info/debug)
`RECORD_SCREENSHOTS`: Record screenshots (true/false)
`RATE_LIMIT_ENABLED`: Enable rate limiting (true/false)
`RATE_LIMIT_MAX`: Max requests per window (number)
`RATE_LIMIT_WINDOW`: Rate limit window in ms (number)

### Configuration File

Create `.env` file in project root:

```env
HEADLESS=true
MAX_QUEUE_WORKERS=5
BROWSER_TIMEOUT=30000
CF_BYPASS=auto
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=3600000
```

## Advanced Usage

### Custom Behavioral Profiles

```javascript
const scraper = new FirekidScraper()
await scraper.init()

await scraper.setProfile('human')

await scraper.goto('https://example.com')
```

Available profiles:
- `fast`: 30-60ms delays, minimal randomization
- `normal`: 80-120ms delays, moderate randomization
- `careful`: 120-180ms delays, high randomization
- `human`: 50-150ms delays, natural patterns

### Pattern Learning

```javascript
const scraper = new FirekidScraper()
await scraper.init()

await scraper.goto('https://example.com/products')

const pattern = await scraper.learnPattern('product', {
  containerSelector: '.product-card',
  fields: ['title', 'price', 'image']
})

const products = await scraper.applyPattern('product')
```

### Self-Healing Selectors

```javascript
const scraper = new FirekidScraper()
await scraper.init()

const healer = scraper.getHealer()

const element = await healer.find('.old-selector', {
  strategies: ['id', 'className', 'text', 'position'],
  savePattern: true
})
```

### Webhook Integration

```javascript
const scraper = new FirekidScraper({
  webhook: {
    url: 'https://your-api.com/webhook',
    events: ['scrapeComplete', 'error']
  }
})

await scraper.init()
await scraper.scrape('https://example.com')
```

### Database Export

```javascript
const scraper = new FirekidScraper()
await scraper.init()

const data = await scraper.scrape('https://example.com', {
  selectors: { title: 'h1' }
})

await scraper.exportToDatabase(data, {
  type: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'scraping',
    user: 'user',
    password: 'pass'
  },
  table: 'products'
})
```

### Scheduled Tasks

```javascript
import { TaskScheduler } from '@firekid/scraper'

const scheduler = new TaskScheduler()

scheduler.schedule('daily-scrape', '0 0 * * *', async () => {
  const scraper = new FirekidScraper()
  await scraper.init()
  await scraper.scrape('https://example.com')
  await scraper.close()
})
```

## Examples

### Product Scraper

```javascript
import { FirekidScraper } from '@firekid/scraper'

const scraper = new FirekidScraper({ headless: true })
await scraper.init()

const products = await scraper.paginate('https://store.example.com/products', '.next-page', {
  maxPages: 10,
  selectors: {
    title: '.product-title',
    price: '.product-price',
    image: 'img.product-image',
    rating: '.product-rating'
  }
})

await scraper.export(products, 'json', './products.json')
await scraper.close()
```

### Login and Scrape

```javascript
const scraper = new FirekidScraper()
await scraper.init()

await scraper.runCommands(`
GOTO https://example.com/login
TYPE input[name="username"] myuser
TYPE input[name="password"] mypass
CLICK button[type="submit"]
WAITLOAD
GOTO https://example.com/dashboard
EXTRACT .data-table text AS tableData
`)

await scraper.close()
```

### Infinite Scroll

```javascript
const scraper = new FirekidScraper()
await scraper.init()

const items = await scraper.infiniteScroll('https://example.com/feed', {
  maxScrolls: 20,
  itemSelector: '.feed-item',
  scrollDelay: 1000,
  extractFields: {
    content: '.feed-content',
    author: '.feed-author',
    timestamp: '.feed-time'
  }
})

await scraper.close()
```

### API Hunting

```javascript
import { APIHunter } from '@firekid/scraper'

const hunter = new APIHunter()
await hunter.init()

const apis = await hunter.hunt('https://example.com', {
  captureXHR: true,
  captureFetch: true,
  captureWebSocket: true
})

console.log('Discovered APIs:', apis)
await hunter.close()
```

### Video Download

```javascript
const scraper = new FirekidScraper()
await scraper.init()

await scraper.runCommands(`
GOTO https://video-site.com/video/123
WAIT video
BYPASS_CLOUDFLARE
DOWNLOAD https://cdn.video-site.com/videos/file.mp4
`)

await scraper.close()
```

## TypeScript Support

Full TypeScript definitions included.

```typescript
import { FirekidScraper, ScraperOptions, ScrapeResult } from '@firekid/scraper'

interface Product {
  title: string
  price: number
  image: string
}

const scraper = new FirekidScraper({
  headless: true,
  bypassCloudflare: true
})

await scraper.init()

const result: ScrapeResult<Product> = await scraper.scrape('https://example.com', {
  selectors: {
    title: 'h1.product-title',
    price: '.price',
    image: 'img.main'
  }
})

await scraper.close()
```

## Docker Usage

### Using Docker Compose

```yaml
version: '3.8'
services:
  scraper:
    image: firekid/scraper:latest
    volumes:
      - ./data:/data
      - ./output:/output
    environment:
      - HEADLESS=true
      - LOG_LEVEL=info
    command: firekid-scraper run ./scripts/scrape.cmd
```

### Custom Dockerfile

```dockerfile
FROM firekid/scraper:latest

COPY ./scripts /app/scripts
COPY ./plugins /app/plugins

WORKDIR /app
CMD ["firekid-scraper", "run", "./scripts/main.cmd"]
```

## Performance Optimization

### Connection Pooling

```javascript
const scraper = new FirekidScraper({
  browserArgs: [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu'
  ]
})
```

### Resource Blocking

```javascript
await scraper.optimizeRequests({
  blockImages: true,
  blockFonts: true,
  blockMedia: true
})
```

### Parallel Scraping

```javascript
import { DistributedEngine } from '@firekid/scraper'

const engine = new DistributedEngine({ workers: 10 })
await engine.init()

const urls = ['url1', 'url2', 'url3']
urls.forEach((url, i) => {
  engine.addTask({
    id: `task-${i}`,
    url,
    mode: 'scrape',
    priority: 10
  })
})

await engine.start()
```

## Troubleshooting

### Cloudflare Challenges

If automatic bypass fails, enable manual solving:

```javascript
const scraper = new FirekidScraper({
  bypassCloudflare: true,
  cloudflareMode: 'manual'
})
```

The browser will open in headed mode for manual solving.

### Memory Issues

Reduce memory usage by limiting concurrent workers:

```javascript
const scraper = new FirekidScraper({
  maxWorkers: 3,
  timeout: 15000
})
```

### Rate Limiting

Implement delays between requests:

```javascript
const scraper = new FirekidScraper({
  rateLimit: {
    enabled: true,
    max: 10,
    window: 60000
  }
})
```

### Selector Not Found

Enable self-healing selectors:

```javascript
const element = await scraper.healSelector('.old-selector', {
  savePattern: true,
  strategies: ['id', 'className', 'text']
})
```

## Contributing

Contributions are welcome. Please read the contributing guidelines before submitting pull requests.

## License

MIT License. See LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: Report bugs and request features
- Documentation: Complete guides in the docs folder
- Examples: Sample scripts in the examples folder

## Changelog

See CHANGELOG.md for version history and release notes.
