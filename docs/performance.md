# Performance Guide

Optimize your Firekid Scraper performance.

## Browser Optimization

### Use Headless Mode

```javascript
const scraper = new FirekidScraper({
  headless: true
})
```

Headless mode is 30-50% faster.

### Block Unnecessary Resources

```javascript
import { NetworkCleaner } from '@firekid/scraper'

const cleaner = new NetworkCleaner()
await cleaner.optimizeRequests(page)
```

Blocks images, fonts, and media for faster loading.

### Reuse Browser Instances

```javascript
import { BrowserManager } from '@firekid/scraper'

const manager = new BrowserManager()
const browser = await manager.launch('main')

// Reuse for multiple pages
const context1 = await manager.createContext('main')
const context2 = await manager.createContext('main')
```

## Distributed Scraping

### Use Worker Pools

```javascript
const engine = new DistributedEngine(10)
```

Optimal: 5-10 workers depending on CPU cores and RAM.

### Prioritize Tasks

```javascript
await engine.addTask({
  id: 'urgent-task',
  url: 'https://example.com',
  mode: 'scrape',
  options: {},
  priority: 10,
  retries: 0
})
```

Higher priority tasks execute first.

## Network Optimization

### Enable Rate Limiting

```javascript
import { RateLimiter } from '@firekid/scraper'

const limiter = new RateLimiter(100, 60000)
await limiter.waitForSlot()
```

Prevents overwhelming target servers.

### Use Proxy Rotation

```javascript
const proxies = ['proxy1.com', 'proxy2.com', 'proxy3.com']
const proxy = proxies[Math.floor(Math.random() * proxies.length)]
```

Distribute load across multiple IPs.

## Data Processing

### Stream Large Datasets

```javascript
import { DataExporter } from '@firekid/scraper'

const exporter = new DataExporter()

for (const item of items) {
  await exporter.appendToFile(item, './output/stream.jsonl')
}
```

Instead of loading all data in memory.

### Use Database for Storage

```javascript
import { DatabaseOutput } from '@firekid/scraper'

const db = new DatabaseOutput()
db.insert(url, data)
```

More efficient than file I/O for large datasets.

## Selector Optimization

### Use Specific Selectors

```javascript
// Slow
const data = await page.locator('div div div .item')

// Fast
const data = await page.locator('#product-list .item')
```

More specific = faster matching.

### Cache Pattern Recognition

```javascript
import { PatternCache } from '@firekid/scraper'

const cache = new PatternCache()
const pattern = cache.load('example.com')
```

Reuse successful patterns.

## Memory Management

### Close Resources

```javascript
await scraper.close()
await browser.close()
```

Always cleanup after scraping.

### Limit Queue Size

```javascript
const queue = new TaskQueue()

if (queue.getStats().pending > 1000) {
  await queue.processSome(100)
}
```

Process in batches for large workloads.

## Monitoring

### Track Performance

```javascript
const start = Date.now()
await scraper.auto(url)
const duration = Date.now() - start

console.log(`Scraped in ${duration}ms`)
```

### Use Health Checks

```javascript
import { HealthMonitor } from '@firekid/scraper'

const monitor = new HealthMonitor()
const status = await monitor.check(page)

if (!status.healthy) {
  console.log('Issues:', status.checks)
}
```

## Best Practices

1. **Batch requests** - Group similar tasks
2. **Use caching** - Store and reuse results
3. **Implement retry logic** - Handle transient failures
4. **Monitor resource usage** - CPU, RAM, network
5. **Scale horizontally** - Use distributed mode
6. **Optimize selectors** - Specific and fast
7. **Clean up** - Close browsers and connections
8. **Use webhooks** - Async notifications
9. **Enable compression** - For data transfer
10. **Profile regularly** - Identify bottlenecks

## Benchmarks

Typical performance on modern hardware:

- **Simple page scrape**: 1-3 seconds
- **Pagination (10 pages)**: 10-30 seconds
- **Infinite scroll**: 30-60 seconds
- **Distributed (100 pages)**: 2-5 minutes

Performance varies based on:
- Target site speed
- Network latency
- Cloudflare challenges
- Data complexity
- Resource limits
