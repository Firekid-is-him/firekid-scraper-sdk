# Frequently Asked Questions

## General

### What is Firekid Scraper?

Firekid Scraper is an advanced Playwright-based web scraping framework with built-in anti-bot evasion, Cloudflare bypass, and intelligent pattern learning.

### Is it free?

Yes, the open-source version is free under MIT license. Premium features are available separately.

### What browsers are supported?

Currently supports Chromium via Playwright. Firefox and WebKit support coming soon.

## Installation

### Why does installation take so long?

Playwright downloads browser binaries (~100MB). This is normal.

### Can I use with existing Playwright setup?

Yes, Firekid works alongside existing Playwright code.

### Do I need Python?

No, Firekid is pure TypeScript/JavaScript.

## Usage

### Can I scrape JavaScript-heavy sites?

Yes, Firekid uses Playwright which executes JavaScript.

### Does it work with SPAs?

Yes, use SSR mode for React/Vue/Angular apps.

### Can I scrape behind login?

Yes, use recording mode or command files to handle login flows.

### How do I handle pagination?

Use PAGINATE command or PaginatorMode for automatic pagination.

## Cloudflare

### Does it really bypass Cloudflare?

Yes, with 70-90% success rate. Manual fallback available.

### What about Turnstile?

Automatic detection with manual solve option.

### Can I use captcha solving services?

Yes, integrate via plugin system.

## Performance

### How fast is it?

1-3 seconds for simple pages. Varies by site complexity.

### Can I run multiple scrapers?

Yes, use DistributedEngine for parallel scraping.

### Does it support proxies?

Yes, configure in .env or pass to scraper.

## Data

### What output formats are supported?

JSON, CSV, HTML, Markdown, and database output.

### Can I stream data?

Yes, use appendToFile for large datasets.

### How do I handle duplicates?

Implement deduplication logic in your code.

## Errors

### Why do my selectors keep breaking?

Use self-healing selectors or selector-matrix strategies.

### What if a site changes layout?

Pattern cache will attempt to adapt. May need to update selectors.

### How do I debug failures?

Enable debug logging and use screenshots.

## Legal

### Is web scraping legal?

Depends on jurisdiction and use case. Consult a lawyer.

### Should I respect robots.txt?

Yes, always check and respect robots.txt.

### What about Terms of Service?

Always comply with target site's ToS.

## Deployment

### Can I deploy to cloud?

Yes, works on AWS, Azure, GCP, Heroku, etc.

### Do I need special permissions?

Needs ability to run Chromium. Some clouds require special config.

### How much RAM is needed?

Minimum 2GB. Recommended 4-8GB for distributed mode.

## API

### Is there a REST API?

Yes, start with --server flag.

### Can I integrate with my app?

Yes, use as npm package in your Node.js app.

### Does it support webhooks?

Yes, WebhookNotifier for real-time notifications.

## Plugins

### How do I create plugins?

See docs/plugins.md for complete guide.

### Can I share plugins?

Yes, publish as npm package with firekid-plugin- prefix.

### Are there community plugins?

Check npm for firekid-plugin-* packages.

## Troubleshooting

### Browser won't start

Run: npx playwright install chromium

### Module not found errors

Run: npm run build

### Out of memory

Reduce MAX_QUEUE_WORKERS or increase Node.js heap.

## Contributing

### How can I contribute?

See CONTRIBUTING.md for guidelines.

### Where do I report bugs?

GitHub Issues on the repository.

### Can I request features?

Yes, create an issue with [Feature Request] tag.

## Comparison

### vs Puppeteer?

Built on Playwright (Puppeteer successor). More features, better anti-detection.

### vs Selenium?

Faster, more modern, better JavaScript support.

### vs Scrapy?

Scrapy is Python-based. Firekid is TypeScript with built-in Cloudflare bypass.

### vs Playwright?

Firekid adds: Ghost mode, Cloudflare bypass, self-healing, pattern learning, distributed scraping.

## Support

### Where can I get help?

1. Check documentation
2. Search GitHub Issues
3. Create new issue
4. Discord community (coming soon)

### Is there paid support?

Contact for enterprise support options.

### How often is it updated?

Regular updates. Check CHANGELOG.md for releases.
