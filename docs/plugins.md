# Plugin Development Guide

Firekid Scraper has a powerful plugin system that allows you to extend functionality.

## Plugin Types

There are 6 plugin types:

1. **Scraping** (.plu) - Custom scraping logic
2. **Actions** (.act) - Custom page actions
3. **Extractors** (.ext) - Data extraction utilities
4. **Filters** (.flt) - Data filtering logic
5. **Outputs** (.out) - Custom output formats
6. **Parsers** (.prs) - Text parsing utilities

## Plugin Structure

Every plugin must export a default object with:

```javascript
export default {
  name: 'plugin-name',
  type: 'scraping',
  version: '1.0.0',
  
  async execute(context) {
    // Plugin logic here
    return result
  }
}
```

## Creating a Scraping Plugin

```javascript
// plugins/scraping/article-extractor.plu.js
export default {
  name: 'article-extractor',
  type: 'scraping',
  version: '1.0.0',
  
  async execute(context) {
    const { page } = context

    return await page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent,
        author: document.querySelector('[rel="author"]')?.textContent,
        content: document.querySelector('article')?.textContent,
        date: document.querySelector('time')?.getAttribute('datetime')
      }
    })
  }
}
```

## Creating an Action Plugin

```javascript
// plugins/actions/scroll-to-bottom.act.js
export default {
  name: 'scroll-to-bottom',
  type: 'action',
  version: '1.0.0',
  
  async execute(context) {
    const { page } = context

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })

    return { success: true }
  }
}
```

## Creating an Extractor Plugin

```javascript
// plugins/extractors/url-extractor.ext.js
export default {
  name: 'url-extractor',
  type: 'extractor',
  version: '1.0.0',
  
  async execute(context) {
    const { text } = context

    const urlRegex = /https?:\/\/[^\s]+/g
    const urls = text.match(urlRegex) || []

    return {
      urls,
      count: urls.length
    }
  }
}
```

## Plugin Directory Structure

```
plugins/
├── scraping/
│   └── *.plu.js
├── actions/
│   └── *.act.js
├── extractors/
│   └── *.ext.js
├── filters/
│   └── *.flt.js
├── outputs/
│   └── *.out.js
└── parsers/
    └── *.prs.js
```

## Using Plugins

### Load All Plugins

```javascript
import { PluginLoader } from '@firekid/scraper'

const loader = new PluginLoader()
await loader.loadAll()
```

### Execute a Plugin

```javascript
const result = await loader.executePlugin('article-extractor', {
  page: myPage
})
```

### Get Plugins by Type

```javascript
const scrapers = loader.getPluginsByType('scraping')
```

## Context Object

The context object passed to plugins varies by type:

### Scraping Plugins
- `page`: Playwright Page object
- `url`: Current URL
- Custom options

### Action Plugins
- `page`: Playwright Page object
- `selector`: Target selector (optional)
- Custom options

### Extractor Plugins
- `text`: Text to extract from
- Custom options

### Filter Plugins
- `data`: Data array to filter
- Custom filter criteria

### Output Plugins
- `data`: Data to output
- `filepath`: Output file path
- Custom options

### Parser Plugins
- `text`: Text to parse
- Custom options

## Best Practices

1. **Always validate input** - Check context parameters
2. **Handle errors gracefully** - Return error objects instead of throwing
3. **Use async/await** - All execute methods should be async
4. **Keep plugins focused** - One plugin, one job
5. **Document your plugins** - Add JSDoc comments
6. **Version properly** - Use semantic versioning

## Publishing Plugins

To share plugins:

1. Create a npm package
2. Name it `firekid-plugin-[name]`
3. Include plugin files in `plugins/` directory
4. Document usage in README

## Examples

See the `/plugins` directory for complete examples:
- `product-extractor.plu.js`
- `smart-wait.act.js`
- `email-extractor.ext.js`
- `price-filter.flt.js`
- `json-lines-output.out.js`
- `date-parser.prs.js`
