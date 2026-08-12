# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
