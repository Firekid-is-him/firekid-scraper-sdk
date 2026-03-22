# Getting Started with Firekid Scraper

## Installation

### Global Installation
```bash
npm install -g @firekid/scraper
npx playwright install chromium
```

### Project Installation
```bash
npm install @firekid/scraper
```

## Quick Start

### CLI Mode

Run the interactive CLI:
```bash
firekid-scraper
```

Or use command-line options:
```bash
firekid-scraper --auto --url https://example.com
firekid-scraper --record --url https://example.com
firekid-scraper --cmd commands/mysite.cmd
```

### Library Mode

```javascript
import { FirekidScraper } from '@firekid/scraper'

const scraper = new FirekidScraper({
  headless: true,
  bypassCloudflare: true
})

const data = await scraper.auto('https://example.com')
console.log(data)

await scraper.close()
```

## Basic Concepts

### Modes

Firekid has several intelligent modes:

- **Auto Mode** - Automatically detects the best scraping strategy
- **Downloader Mode** - Finds and downloads files
- **Scrape Mode** - Extracts structured content
- **Navigator Mode** - Maps site structure
- **Command Mode** - Runs .cmd scripts

### Commands

Create reusable scraping workflows with .cmd files:

```cmd
GOTO https://example.com
WAIT .content
EXTRACT h1 text
CLICK .next-button
```

See the Command Reference for all available commands.

### Recording

Record your browser actions to generate scripts:

```bash
firekid-scraper --record --url https://example.com
```

1. Browser opens
2. Perform your actions
3. Close browser
4. Script auto-generated

## Configuration

Create a `.env` file:

```
HEADLESS=true
CF_BYPASS=auto
LOG_LEVEL=info
```

See `.env.example` for all options.

## Next Steps

- Read the [Command Reference](./commands.md)
- Check [Examples](./examples.md)
- Learn about [Plugins](./plugins.md)
- Review the [API Reference](./API.md)
