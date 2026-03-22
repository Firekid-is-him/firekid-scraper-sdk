# Migration Guide

Migrating to Firekid Scraper from other tools.

## From Puppeteer

### Basic Scraping

**Puppeteer:**
```javascript
const browser = await puppeteer.launch()
const page = await browser.newPage()
await page.goto('https://example.com')
const title = await page.title()
await browser.close()
```

**Firekid:**
```javascript
import { FirekidScraper } from '@firekid/scraper'

const scraper = new FirekidScraper()
await scraper.goto('https://example.com')
const page = scraper.getPage()
const title = await page.title()
await scraper.close()
```

### With Anti-Detection

**Puppeteer (with plugins):**
```javascript
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
```

**Firekid (built-in):**
```javascript
const scraper = new FirekidScraper()
```

## From Playwright

### Simple Migration

Firekid is built on Playwright, so most code works as-is.

**Playwright:**
```javascript
const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()
```

**Firekid:**
```javascript
const scraper = new FirekidScraper()
const page = scraper.getPage()
```

### Added Features

Firekid adds:
- Cloudflare bypass
- Self-healing selectors
- Pattern learning
- Command system
- Distributed scraping

## From Scrapy

### Project Structure

**Scrapy:**
```
myproject/
├── scrapy.cfg
├── myproject/
│   ├── spiders/
│   ├── items.py
│   └── settings.py
```

**Firekid:**
```
myproject/
├── package.json
├── commands/
└── src/
    └── scraper.js
```

### Spider to Scraper

**Scrapy:**
```python
class MySpider(scrapy.Spider):
    name = 'myspider'
    start_urls = ['http://example.com']
    
    def parse(self, response):
        yield {
            'title': response.css('h1::text').get()
        }
```

**Firekid:**
```javascript
const scraper = new FirekidScraper()
const data = await scraper.extract('http://example.com', {
  title: 'h1'
})
```

## From Selenium

### WebDriver to Playwright

**Selenium:**
```python
driver = webdriver.Chrome()
driver.get('https://example.com')
element = driver.find_element(By.CSS_SELECTOR, 'h1')
```

**Firekid:**
```javascript
const scraper = new FirekidScraper()
await scraper.goto('https://example.com')
const page = scraper.getPage()
const element = await page.locator('h1')
```

### Wait Strategies

**Selenium:**
```python
WebDriverWait(driver, 10).until(
    EC.presence_of_element_located((By.ID, "myElement"))
)
```

**Firekid:**
```javascript
await page.waitForSelector('#myElement', { timeout: 10000 })
```

## Breaking Changes

### From v0.x to v1.0

1. **Module System**: Now uses dual ESM/CJS
2. **Config**: Changed from object to .env file
3. **Commands**: New DSL syntax
4. **API**: RESTful endpoints changed

### Configuration

**Old:**
```javascript
const config = {
  headless: true,
  bypass: true
}
```

**New:**
```
HEADLESS=true
CF_BYPASS=auto
```

### Imports

**Old:**
```javascript
const { Scraper } = require('firekid-scraper')
```

**New:**
```javascript
import { FirekidScraper } from '@firekid/scraper'
```

## Best Practices

### Gradual Migration

1. Start with simple pages
2. Test thoroughly
3. Migrate complex flows gradually
4. Keep old code until verified

### Testing

Run both old and new in parallel:
```javascript
const oldResult = await oldScraper.run()
const newResult = await firekidScraper.run()
assert.deepEqual(oldResult, newResult)
```

### Performance Comparison

Benchmark before and after:
```javascript
console.time('firekid')
await firekidScraper.run()
console.timeEnd('firekid')
```

## Common Issues

### Module Resolution

If imports fail:
```bash
npm run build
```

### Type Errors

Update tsconfig.json:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

### Runtime Errors

Check for breaking API changes in CHANGELOG.md.

## Support

Need help migrating? Create an issue on GitHub with:
- Current tool/version
- Sample code
- Expected behavior
- Actual behavior
