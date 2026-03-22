# Firekid Scraper

> The most advanced Playwright-based web scraping framework with built-in anti-bot evasion, Cloudflare bypass, and intelligent pattern learning.

[![npm version](https://img.shields.io/npm/v/@firekid/scraper.svg)](https://www.npmjs.com/package/@firekid/scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)

## Features

- **Ghost Mode** - Advanced browser fingerprint randomization (Canvas, WebGL, Audio, Fonts)
- **Cloudflare Ready** - Automatic challenge detection with smart manual fallback
- **Record & Replay** - Visual workflow recorder that generates reusable scripts
- **40+ Commands** - Powerful DSL for complex scraping flows
- **Plugin System** - Extensible architecture with hot-reloading
- **Auto Mode** - Intelligent site detection and strategy selection
- **Smart Fetch** - Automatic referer handling for CDN downloads
- **Self-Healing** - Multi-strategy selector fallbacks
- **Distributed** - Parallel scraping with worker pools
- **Pattern Learning** - Remembers successful scraping strategies

## Installation

### As CLI Tool (Global)
```bash
npm install -g @firekid/scraper
npx playwright install chromium
```

### As NPM Package (In Your Project)
```bash
npm install @firekid/scraper
```

### With Docker
```bash
docker-compose up -d
```

See [Docker Guide](./docs/docker.md) for details.

## Quick Start

### CLI Usage
```bash
# Interactive mode
firekid-scraper

# Record mode (opens browser, watches your actions)
firekid-scraper --record --url https://example.com

# Auto mode (intelligent scraping)
firekid-scraper --auto --url https://example.com

# Run command file
firekid-scraper --cmd commands/mysite.cmd
```

### Library Usage
```javascript
import { FirekidScraper } from '@firekid/scraper'

const scraper = new FirekidScraper({
  headless: true,
  bypassCloudflare: true
})

// Auto mode - intelligent scraping
const data = await scraper.auto('https://example.com')

// Or extract with selectors
const data = await scraper.extract('https://example.com', {
  title: 'h1',
  price: '.price',
  image: 'img.product'
})
```

## Command System

Create `.cmd` files for reusable scraping workflows:

```cmd
// mysite.cmd
GOTO https://example.com

// Search for products
WAIT input#search
TYPE input#search "shoes"
PRESS Enter
WAITLOAD

// Handle pagination
PAGINATE .next-page

// Extract data
SCAN .product-item
EXTRACT .product-title
EXTRACT .product-price
```

Run with:
```bash
firekid-scraper --cmd commands/mysite.cmd
```

## Available Commands

**Navigation:**
- `GOTO url` - Navigate to URL
- `BACK` - Go back
- `FORWARD` - Go forward
- `REFRESH` - Reload page

**Interaction:**
- `CLICK selector` - Click element
- `TYPE selector text` - Type text
- `PRESS key` - Press keyboard key
- `SELECT selector option` - Select dropdown
- `CHECK selector` - Check checkbox
- `UPLOAD selector path` - Upload file
- `SCROLL selector` - Scroll to element

**Extraction:**
- `SCAN selector` - Scan elements
- `EXTRACT selector attr` - Extract attribute
- `SCREENSHOT path` - Take screenshot

**Wait:**
- `WAIT selector` - Wait for selector
- `WAITLOAD` - Wait for network idle

**Pagination:**
- `PAGINATE selector` - Click next until end
- `INFINITESCROLL` - Scroll until no more content

**Network:**
- `FETCH url` - Fetch with auto-referer
- `DOWNLOAD url path` - Download file

**Cloudflare:**
- `BYPASS_CLOUDFLARE mode` - Handle Cloudflare

**Flow Control:**
- `REPEAT selector` - Loop over elements
- `IF selector` - Conditional execution

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Command Reference](./docs/commands.md)
- [Plugin Development](./docs/plugins.md)
- [API Reference](./docs/API.md)
- [Examples](./docs/examples.md)

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## License

MIT License - see LICENSE file for details

---

Built with Playwright and TypeScript
