# Firekid Scraper

Advanced web scraping framework built on Playwright with anti-detection, selector healing, and distributed crawling.

**GitHub:** [Firekid-is-him/firekid-scraper-sdk](https://github.com/Firekid-is-him/firekid-scraper-sdk)

## Features

**Anti-detection**
- Ghost fingerprinting spoofs canvas, WebGL, audio, fonts and navigator properties
- User agent, viewport and client hints are generated from the same fingerprint seed, so they always agree
- Cloudflare detection with automatic handling and a manual fallback
- Human-like typing, clicking and scrolling helpers

**Automation**
- Auto mode that picks a strategy per site
- Selector healing with several fallback strategies
- Pattern cache and session storage backed by SQLite
- Smart fetch with automatic referer handling and streamed downloads
- Action recorder that generates command files

**Scale**
- Worker pool with a task queue
- Per-host rate limiting
- Task scheduler with cron expressions

**Tooling**
- Small command language for scripted flows
- Plugin system
- Webhook notifications, JSON/CSV/HTML/Markdown export and SQLite output
- Optional HTTP API with authentication and SSRF protection

## Requirements

Node.js 20 or newer.

## Installation

```bash
npm install @firekid/scraper
npx playwright install chromium
```

Global CLI:

```bash
npm install -g @firekid/scraper
firekid-scraper --help
```

The package ships both ESM and CommonJS builds.

```javascript
import { FirekidScraper } from '@firekid/scraper'
const { FirekidScraper } = require('@firekid/scraper')
```

## Quick Start

### Extract with selectors

```javascript
import { FirekidScraper } from '@firekid/scraper'

const scraper = new FirekidScraper()

const result = await scraper.scrape('https://example.com', {
  selectors: {
    title: 'h1',
    author: '.author-name'
  }
})

console.log(result.data)
await scraper.close()
```

The browser starts on first use, so calling `init()` yourself is optional.

### Command scripts

```javascript
const scraper = new FirekidScraper()

const result = await scraper.runCommands(`
GOTO https://example.com
WAIT .product-list
EXTRACT .product-title text AS titles
EXTRACT .product-price text AS prices
SCREENSHOT products.png
`)

console.log(result.data)
await scraper.close()
```

### Auto mode

```javascript
const scraper = new FirekidScraper()
const result = await scraper.auto('https://example.com/products')
await scraper.close()
```

## Core API

### FirekidScraper

```javascript
new FirekidScraper({
  headless: true,
  bypassCloudflare: true,
  useGhost: true,
  browserArgs: [],
  timeout: 30000,
  selectorTimeout: 5000,
  userAgent: 'custom user agent',
  viewport: { width: 1280, height: 800 },
  proxy: 'http://user:pass@host:8080',
  rateLimit: { enabled: true, max: 10, window: 60000 },
  urlGuard: async (url) => {}
})
```

| Option | Default | Notes |
| --- | --- | --- |
| `headless` | `true` | Set `HEADLESS=false` or pass `false` to see the browser |
| `bypassCloudflare` | `true` | Defaults to `false` when `CF_BYPASS=skip` |
| `useGhost` | `true` | Turns fingerprint spoofing on or off |
| `browserArgs` | `[]` | Extra Chromium arguments |
| `timeout` | `30000` | Navigation timeout in ms |
| `selectorTimeout` | `5000` | How long extraction waits for each selector |
| `userAgent` | from fingerprint | Overrides the generated user agent |
| `viewport` | from fingerprint | Overrides the generated viewport |
| `proxy` | none | Also read from `PROXY_ENABLED` and `PROXY_URL` |
| `rateLimit` | off | Applied per host before each navigation |
| `urlGuard` | none | Called before every navigation, throw to reject |

The Chromium sandbox stays on unless `NO_SANDBOX=true` is set. Set it when running as root or in a container.

**Methods**

`init(url?)` starts the browser. Calling it twice is safe.

`goto(url)` navigates with anti-detection and Cloudflare handling.

`scrape(url, options)` extracts data and returns `{ success, data, errors, timestamp }`.
- `selectors`: object of field name to CSS selector
- `attribute`: read this attribute instead of text
- `multiple`: return every match as an array
- `screenshot`: `true` or a file path

`extract(url, selectors)` returns an object of values, with `null` for selectors that did not match.

`auto(url)` detects the best strategy and runs it.

`runMode(url, mode)` runs one mode: `auto`, `downloader`, `scrape`, `navigator`, `ssr` or `api-hunter`.

`paginate(url, nextSelector?, options?)` with `maxPages`, `waitBetween`, `nextSelector`, `itemSelector`.

`infiniteScroll(url, options?)` with `maxScrolls`, `itemSelector`, `scrollDelay`.

`runCommands(script, options?)` and `runCommandFile(path, options?)` execute the command language. Options are `workDir` (confines file paths) and `validateUrl`.

`loadPlugin(path)` and `runPlugin(name, options?)`.

`getPage()`, `getContext()`, `getBrowser()` return the Playwright objects.

`close()` shuts everything down. Safe to call before `init()`.

## Command Language

One command per line. Lines starting with `//` are comments. Indented lines belong to the command above them.

Arguments are split on whitespace. Wrap an argument in single or double quotes to keep spaces together:

```
CLICK ".product-list .item"
TYPE input[name=q] "red running shoes"
```

Quotes in the middle of a token are kept as written, so `a[href="/next"]` works unquoted.

**Variables**

`EXTRACT` and `FETCH` accept `AS name` to store their result. Use it later as `{{name}}`:

```
EXTRACT h1 text AS heading
TYPE input[name=q] "{{heading}}"
```

Inside `REPEAT` and `LOOP`, `{{index}}` is the current iteration (starting at 1) and `{{count}}` is the total.

**Navigation:** `GOTO url`, `BACK`, `FORWARD`, `REFRESH`

**Interaction:** `CLICK selector`, `TYPE selector text`, `PRESS key`, `SELECT selector value`, `CHECK selector`, `UPLOAD selector path`

**Waiting and scrolling:** `WAIT selector|ms`, `WAITLOAD`, `SCROLL selector`, `SCROLLDOWN pixels`

**Extraction:** `SCAN selector`, `EXTRACT selector [text|html|attr:name|name] [AS var]`, `SCREENSHOT path`

**Pagination:** `PAGINATE selector [maxPages]`, `INFINITESCROLL [maxScrolls]`

**Network:** `FETCH url [AS var]`, `DOWNLOAD url [path] [referer]`, `REFERER url`, `BYPASS_CLOUDFLARE`

**Flow:** `REPEAT selector`, `IF selector`, `LOOP count`

```
REPEAT .product
  EXTRACT .title text AS title_{{index}}
```

A step that fails is skipped and recorded in `errors`. `success` is `true` when at least one step succeeded.

## Plugins

Plugin files end in `.plu.js`, `.act.js`, `.ext.js`, `.flt.js`, `.out.js` or `.prs.js` and export a default object. `execute` receives a single context object:

```javascript
export default {
  name: 'title-extractor',
  type: 'extractor',
  version: '1.0.0',

  async execute({ page }) {
    return await page.title()
  }
}
```

Types: `scraping`, `action`, `extractor`, `filter`, `output`, `parser`.

```javascript
import { PluginLoader } from '@firekid/scraper'

const loader = new PluginLoader()
loader.addPluginDirectory('./my-plugins')
await loader.loadAll()

const title = await loader.executePlugin('title-extractor', { page: scraper.getPage() })
```

`./plugins` in the current working directory is loaded by default. Through the scraper, `scraper.loadPlugin(file)` then `scraper.runPlugin(name, options)` passes `{ page, scraper, ...options }`.

## Distributed Scraping

```javascript
import { DistributedEngine } from '@firekid/scraper'

const engine = new DistributedEngine(5)
await engine.initialize()

await engine.addTask({
  id: 'task-1',
  url: 'https://example.com',
  mode: 'scrape',
  options: {},
  priority: 1,
  retries: 0
})

const results = await engine.processTasks()
console.log(engine.getStats())

await engine.shutdown()
```

## Building Blocks

Each of these is exported on its own.

```javascript
import {
  TaskScheduler,
  WebhookNotifier,
  DataExporter,
  DatabaseOutput,
  SelectorHealer,
  NetworkInterceptor,
  PatternCache,
  SessionManager,
  RateLimiter
} from '@firekid/scraper'
```

**Scheduling**

```javascript
const scheduler = new TaskScheduler()

scheduler.schedule('daily', '0 0 * * *', async () => {
  const scraper = new FirekidScraper()
  await scraper.auto('https://example.com')
  await scraper.close()
})
```

**Webhooks**

```javascript
const hook = new WebhookNotifier('https://your-api.com/webhook')
await hook.sendSuccess('task-1', data)
await hook.sendError('task-1', 'message')
```

**Export**

```javascript
const exporter = new DataExporter()
await exporter.toJSON(data, './out/data.json')
await exporter.toCSV(rows, './out/data.csv')

const db = new DatabaseOutput('./data/output.db')
db.insert('https://example.com', data)
```

**Selector healing**

```javascript
const healer = new SelectorHealer()
const working = await healer.heal(scraper.getPage(), '.old-selector', 'product title')
```

**Blocking heavy resources**

```javascript
const interceptor = new NetworkInterceptor()
await interceptor.blockResources(scraper.getPage(), ['image', 'font', 'media'])
```

## CLI

```bash
firekid-scraper --url https://example.com
firekid-scraper --auto --url https://example.com
firekid-scraper --mode ssr --url https://example.com
firekid-scraper --cmd commands/mysite.cmd
firekid-scraper --record --url https://example.com
firekid-scraper --server --port 3000
firekid-scraper --headed
```

Running without flags opens an interactive menu.

## HTTP API

```bash
API_KEY=$(openssl rand -hex 32) firekid-scraper --server
```

The server refuses to start without `API_KEY`. It listens on `127.0.0.1` by default; set `API_HOST=0.0.0.0` only behind a trusted network or reverse proxy.

Every route except `/health` needs an `x-api-key` header.

`POST /scrape` with `{ "url": "...", "mode": "auto" }` or `{ "url": "...", "mode": "extract", "selectors": { "title": "h1" } }`.

`POST /command` with `{ "filePath": "site.cmd" }`. Only `.cmd` files inside `API_COMMAND_DIR` can be run, and files written by `SCREENSHOT`, `DOWNLOAD` and `UPLOAD` are confined to `API_OUTPUT_DIR`.

Requests to loopback, private and link-local addresses are rejected, including through redirects. Set `API_ALLOW_PRIVATE_URLS=true` to turn that off. At most `API_MAX_CONCURRENT` jobs run at once and each is cut off after `API_REQUEST_TIMEOUT` ms.

## Configuration

Environment variables, usually set in a `.env` file:

| Variable | Default | Purpose |
| --- | --- | --- |
| `HEADLESS` | `true` | Run without a window |
| `NO_SANDBOX` | `false` | Disable the Chromium sandbox (root or containers) |
| `BROWSER_TIMEOUT` | `30000` | Navigation timeout in ms |
| `MAX_QUEUE_WORKERS` | `5` | Worker pool size |
| `CF_BYPASS` | `auto` | `auto`, `manual` or `skip` |
| `TURNSTILE_SOLVER` | `manual` | Turnstile solver |
| `TURNSTILE_TIMEOUT` | `120000` | Turnstile wait in ms |
| `CAPTCHA_API_KEY` | none | Key for a captcha service |
| `PROXY_ENABLED` | `false` | Use `PROXY_URL` for all browsers |
| `PROXY_URL` | none | `http://user:pass@host:port` |
| `API_HOST` | `127.0.0.1` | Bind address |
| `API_PORT` | `3000` | Port |
| `API_KEY` | none | Required to start the server |
| `API_MAX_CONCURRENT` | `2` | Parallel jobs |
| `API_REQUEST_TIMEOUT` | `120000` | Per job limit in ms |
| `API_COMMAND_DIR` | `./commands` | Where `.cmd` files may be read from |
| `API_OUTPUT_DIR` | `./output` | Where command files may write |
| `API_ALLOW_PRIVATE_URLS` | `false` | Allow private network targets |
| `DATA_DIR` | `./data` | Data directory |
| `PATTERNS_DB` | `./data/patterns.db` | Pattern cache |
| `SESSIONS_DB` | `./data/sessions.db` | Session store |
| `LOG_LEVEL` | `info` | `error`, `warn`, `info`, `debug` |
| `RATE_LIMIT_ENABLED` | `true` | Rate limit the API |
| `RATE_LIMIT_MAX` | `100` | Requests per window |
| `RATE_LIMIT_WINDOW` | `3600000` | Window in ms |

## Docker

```bash
git clone https://github.com/Firekid-is-him/firekid-scraper-sdk
cd firekid-scraper-sdk
API_KEY=$(openssl rand -hex 32) docker compose up -d --build
```

The container runs the API server as a non-root user and publishes port 3000 on `127.0.0.1` only. Mount `./commands` for command files and `./output` and `./downloads` for results.

## TypeScript

Type definitions are included.

```typescript
import { FirekidScraper, type FirekidConfig, type ScrapingResult } from '@firekid/scraper'

const options: FirekidConfig = { headless: true }
const scraper = new FirekidScraper(options)

const result: ScrapingResult = await scraper.scrape('https://example.com', {
  selectors: { title: 'h1' }
})
```

## Troubleshooting

**Browser fails to start in Docker or as root.** Set `NO_SANDBOX=true`.

**Cloudflare challenge does not clear.** Set `CF_BYPASS=manual` and run with `headless: false` so you can solve it.

**Selector returns `null`.** Raise `selectorTimeout`, or use `SelectorHealer` to find a replacement.

**Too many requests.** Pass `rateLimit: { enabled: true, max: 10, window: 60000 }`.

## Contributing

Contributions are welcome. Read the contributing guidelines before opening a pull request.

## License

MIT. See the LICENSE file.

## Support

- Repository: https://github.com/Firekid-is-him/firekid-scraper-sdk
- Issues: report bugs and request features on GitHub
- Guides: the docs folder
- Samples: the examples folder

See CHANGELOG.md for version history.
