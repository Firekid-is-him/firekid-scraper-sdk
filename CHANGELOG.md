# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking
- Node.js 20 or newer is required.
- The API server refuses to start without `API_KEY` and binds to `127.0.0.1` by default. Set `API_HOST=0.0.0.0` to listen on all interfaces.
- `/command` only runs `.cmd` files inside `API_COMMAND_DIR`, and files written by `SCREENSHOT`, `DOWNLOAD` and `UPLOAD` are confined to `API_OUTPUT_DIR`.
- The Chromium sandbox is on by default. Set `NO_SANDBOX=true` when running as root or in a container (the Docker image does this).
- `HEADLESS` now defaults to `true`. Previously an unset variable launched a headed browser.
- Removed unused dependencies: `bcrypt`, `jsonwebtoken`, `archiver`, `chokidar`, `playwright-extra`, `puppeteer-extra-plugin-stealth`.
- `API_ENABLED` was removed because nothing read it.

### Fixed
- **packaging**: ESM output was emitted as `.js` without `"type": "module"`, so the package and the `firekid-scraper` binary failed to load on Node versions without module syntax detection. The package now declares `"type": "module"` and ships ESM and CommonJS builds with matching type definitions.
- **packaging**: Duplicate shebang in the CLI build, and `scripts/prestart.js` used `require` in an ESM package.
- **core/scraper**: The documented `scrape()` and `runCommands()` methods did not exist. Added both, plus `runMode()`, `loadPlugin()` and `runPlugin()`.
- **core/scraper**: `userAgent`, `viewport`, `proxy`, `useGhost` and `rateLimit` options were documented but ignored. They are now applied.
- **core/scraper**: The user agent had no `Chrome/` or `Safari/` token and disagreed with the spoofed client hints. User agent and viewport are now derived from the fingerprint seed everywhere a context is created.
- **core/scraper**: Per-site fingerprint persistence was never used because the site host was not passed to the ghost module.
- **core/scraper**: Concurrent `init()` calls could launch several browsers.
- **core/scraper**: `extract()` waited the full timeout for every missing selector one after another. Selectors now resolve in parallel with a short `selectorTimeout`.
- **cmd-parser**: Arguments could not contain spaces. Quoted arguments are now supported. CRLF files parse correctly.
- **cmd-executor**: `success` was always `true`. It is now `true` only when at least one step succeeded.
- **cmd-executor**: `EXTRACT ... AS name` ignored the name and `FETCH url var` stored a value nothing could read. Results are stored and can be used as `{{name}}`, and `REPEAT` and `LOOP` expose `{{index}}` and `{{count}}`.
- **server**: Scrape targets were not restricted, so requests could reach localhost and cloud metadata services. Targets are checked, including every redirect.
- **server**: `API_KEY` was optional, key comparison was not constant time, `/command` accepted any file path, and there was no limit on concurrent browsers or job duration.
- **downloader**: The button fallback selector was just a tag name and clicked the first match on the page. Selectors are now unique. Links with query strings are detected, duplicates are skipped, and each file gets its own sanitized name instead of overwriting the previous one.
- **smart-fetch**: Downloads were buffered fully in memory. They now stream to disk with a size limit and no partial files on failure. Redirects are followed manually so a validator sees each hop.
- **plugin-loader**: Plugin paths resolved against the module instead of the working directory, and invalid plugin types were accepted. Plugins reload when the file changes.
- **paginator / infinite-scroll**: `nextSelector`, `itemSelector`, `waitBetween` and `scrollDelay` were documented but not honoured.
- **workflows**: `sync-public` pushed the full private history to the public repository and interpolated inputs directly into shell commands. It now publishes a clean tree on top of the public history and passes inputs through environment variables. Test and publish workflows use `npm ci`, drop Node 18 and install browsers with their dependencies.
- **docs**: README and API reference described methods, options and classes that did not exist. They now match the code, and documented classes such as `WebhookNotifier`, `DataExporter` and `DatabaseOutput` are exported.

### Added
- `startServer` and `createApp` are exported from the package root.
- `package-lock.json` is committed for reproducible installs.
- Tests for the command executor, API server, URL guard, downloads and plugin loader. Browser tests no longer need network access.

## [1.0.2] - 2026-08-12

### Fixed
- **cmd-parser**: Nested control blocks (`LOOP`/`IF`/`REPEAT` inside another block) were flattened into the parent's children instead of nesting, silently corrupting `.cmd` scripts with nested logic.
- **cmd-parser**: A blank line inside an indented block was treated as the end of the block, silently dropping every step after it.
- **queue**: Retried tasks were re-queued without re-sorting by priority, letting lower-priority tasks jump ahead of a higher-priority retry.
- **ratelimiter**: Tracked keys (e.g. per-URL/per-domain) were never evicted, leaking memory indefinitely over long-running scrapes. Added `prune()` and `trackedKeyCount()` to reclaim expired keys.
- **core/scraper**: `close()` aborted on the first failed resource (e.g. a crashed page), leaking the browser/context and leaving stale internal references. Each resource now closes independently and references are always cleared.
- **smart-fetch / cmd-executor**: The `REFERER` command was a no-op — it logged the value but never applied it. `SmartFetch` now supports `setReferer()`/`clearReferer()`, and `REFERER` correctly affects subsequent `FETCH`/`DOWNLOAD` calls.

---



### Added
- Initial release of Firekid Scraper
- Ghost Mode fingerprint evasion system
- Cloudflare bypass with smart manual fallback
- Action recorder with workflow generation
- 40+ command DSL for scraping
- Plugin system with hot-reloading
- Auto mode with intelligent site detection
- Smart fetch with automatic referer handling
- Self-healing selectors with multi-strategy fallbacks
- Distributed scraping with worker pools
- Pattern learning and caching
- Full TypeScript support with dual CJS/ESM exports
- CLI tool and programmatic API
- HTTP API server mode

### Features
- Canvas, WebGL, Audio, and Font fingerprint randomization
- Turnstile detection and handling
- Network forensics cleaning
- Behavioral profiles for human-like interaction
- Form learning and auto-fill
- Screenshot debugging
- Proxy support
- Rate limiting
- Session management
- Webhook notifications
- Database output support

### Documentation
- Complete API documentation
- Command reference guide
- Plugin development guide
- Example scripts and workflows
- Getting started guide

---

For migration guides and detailed changes, see the [releases page](https://github.com/YOUR_USERNAME/firekid-scraper/releases).
