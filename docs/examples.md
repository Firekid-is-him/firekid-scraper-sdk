# Examples

Complete examples for common scraping scenarios.

## Basic Scraping

### Extract Product Information

```javascript
import { FirekidScraper } from '@firekid/scraper'

const scraper = new FirekidScraper()

const data = await scraper.extract('https://example-shop.com/product', {
  title: 'h1.product-title',
  price: '.price',
  description: '.description',
  images: 'img.product-image@src'
})

console.log(data)
await scraper.close()
```

### Pagination

```javascript
import { FirekidScraper } from '@firekid/scraper'
import { PaginatorMode } from '@firekid/scraper'

const scraper = new FirekidScraper()
await scraper.goto('https://example.com/products')

const page = scraper.getPage()
const paginator = new PaginatorMode(page)

const result = await paginator.execute(page.url(), 10)

console.log(`Scraped ${result.data.totalItems} items from ${result.data.totalPages} pages`)
await scraper.close()
```

## Advanced Scraping

### With Cloudflare Bypass

```javascript
import { FirekidScraper } from '@firekid/scraper'

const scraper = new FirekidScraper({
  headless: true,
  bypassCloudflare: true
})

await scraper.goto('https://cloudflare-protected-site.com')

const data = await scraper.extract('https://cloudflare-protected-site.com', {
  title: 'h1'
})

await scraper.close()
```

### Recording and Replay

Record actions:
```bash
firekid-scraper --record --url https://example.com
```

Replay:
```bash
firekid-scraper --cmd recorded-1234567890.cmd
```

## Using Modes

### Auto Mode

```javascript
const scraper = new FirekidScraper()
const result = await scraper.auto('https://example.com')
console.log(result)
await scraper.close()
```

### Download Mode

```javascript
import { DownloaderMode } from '@firekid/scraper'

const scraper = new FirekidScraper()
await scraper.goto('https://example.com/files')

const page = scraper.getPage()
const downloader = new DownloaderMode(page)

const result = await downloader.execute(page.url())
console.log(`Downloaded ${result.data.files.length} files`)

await scraper.close()
```

### Infinite Scroll

```javascript
import { InfiniteScrollMode } from '@firekid/scraper'

const scraper = new FirekidScraper()
await scraper.goto('https://infinite-scroll-site.com')

const page = scraper.getPage()
const scroller = new InfiniteScrollMode(page)

const result = await scroller.execute(page.url(), 50)
console.log(`Loaded ${result.data.items.length} items`)

await scraper.close()
```

## Distributed Scraping

```javascript
import { DistributedEngine } from '@firekid/scraper'

const engine = new DistributedEngine(5)
await engine.initialize()

const urls = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3'
]

for (const url of urls) {
  await engine.addTask({
    id: `task-${Date.now()}`,
    url,
    mode: 'scrape',
    options: {},
    priority: 1,
    retries: 0
  })
}

const results = await engine.processTasks()
console.log(`Completed ${results.length} tasks`)

await engine.shutdown()
```

## Data Export

### Export to JSON

```javascript
import { DataExporter } from '@firekid/scraper'

const exporter = new DataExporter()
await exporter.toJSON(data, './output/results.json')
```

### Export to CSV

```javascript
await exporter.toCSV(data, './output/results.csv')
```

### Export to Database

```javascript
import { DatabaseOutput } from '@firekid/scraper'

const db = new DatabaseOutput()
db.insert('https://example.com', data)
```

## Using Plugins

```javascript
import { PluginLoader } from '@firekid/scraper'

const loader = new PluginLoader()
await loader.loadAll()

const result = await loader.executePlugin('product-extractor', {
  page: myPage
})
```

## API Server

Start the server:
```bash
firekid-scraper --server --port 3000
```

Call from Python:
```python
import requests

response = requests.post('http://localhost:3000/scrape', json={
    'url': 'https://example.com',
    'mode': 'auto'
})

data = response.json()
print(data['result'])
```

Call from JavaScript:
```javascript
const response = await fetch('http://localhost:3000/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    mode: 'auto'
  })
})

const data = await response.json()
console.log(data.result)
```

## Webhooks

```javascript
import { WebhookNotifier } from '@firekid/scraper'

const webhook = new WebhookNotifier('https://your-webhook.com/endpoint')

await webhook.sendSuccess('task-123', data)
```

## Scheduling

```javascript
import { TaskScheduler } from '@firekid/scraper'

const scheduler = new TaskScheduler()

scheduler.schedule('daily-scrape', '0 0 * * *', async () => {
  const scraper = new FirekidScraper()
  const data = await scraper.auto('https://example.com')
  console.log('Scraped:', data)
  await scraper.close()
})
```

## Command Files

Create `example.cmd`:
```cmd
GOTO https://example.com

WAIT .products
WAITLOAD

REPEAT .product-item
  EXTRACT .title text
  EXTRACT .price text
  EXTRACT .image src

PAGINATE .next-button
```

Run it:
```bash
firekid-scraper --cmd example.cmd
```
