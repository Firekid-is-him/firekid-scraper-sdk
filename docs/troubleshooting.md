# Troubleshooting Guide

Common issues and solutions for Firekid Scraper.

## Installation Issues

### Playwright Installation Fails

**Problem:** `npx playwright install chromium` fails

**Solution:**
```bash
# Try with sudo (Linux/Mac)
sudo npx playwright install chromium

# Or install system dependencies
npx playwright install-deps chromium
```

### Module Resolution Errors

**Problem:** Cannot find module '@firekid/scraper'

**Solution:**
```bash
# Rebuild the project
npm run build

# Check package.json exports
npm ls @firekid/scraper
```

## Runtime Issues

### Cloudflare Bypass Not Working

**Problem:** Stuck on Cloudflare challenge

**Solutions:**
1. Use manual mode: Set `CF_BYPASS=manual` in `.env`
2. Update user agent
3. Try with headed browser: `headless: false`
4. Clear sessions: Delete `./data/sessions.db`

### Selectors Not Working

**Problem:** Elements not found

**Solutions:**
1. Wait for element: Add `WAIT selector` before actions
2. Use self-healing: Enable in config
3. Check selector with browser DevTools
4. Try alternative selectors (ID, class, text)

### Memory Issues

**Problem:** Out of memory errors

**Solutions:**
1. Reduce `MAX_QUEUE_WORKERS` in `.env`
2. Close browser between tasks
3. Enable garbage collection:
```bash
node --max-old-space-size=4096 your-script.js
```

### Timeout Errors

**Problem:** Navigation timeout

**Solutions:**
1. Increase timeout in config: `timeout: 60000`
2. Use `WAITLOAD` after navigation
3. Check network connectivity
4. Try different wait strategies

## Performance Issues

### Slow Scraping

**Solutions:**
1. Disable images: Use network blocker
2. Reduce workers
3. Use headless mode
4. Optimize selectors

### High CPU Usage

**Solutions:**
1. Limit concurrent browsers
2. Use distributed mode for heavy workloads
3. Add delays between requests

## Data Issues

### Empty Results

**Problem:** No data extracted

**Solutions:**
1. Verify selectors in DevTools
2. Check page load state
3. Use `SCAN` to debug
4. Enable screenshot debugging

### Incorrect Data

**Problem:** Wrong data extracted

**Solutions:**
1. Verify selector specificity
2. Check for dynamic content
3. Wait for AJAX loads
4. Use data validation

## API Issues

### Rate Limiting

**Problem:** Too many requests

**Solutions:**
1. Enable rate limiter in config
2. Add delays between requests
3. Use proxy rotation
4. Implement backoff strategy

### Authentication Errors

**Problem:** 401/403 errors

**Solutions:**
1. Check API key validity
2. Verify request headers
3. Use session management
4. Check token expiration

## Platform-Specific Issues

### Windows

- Use forward slashes in paths: `./data/file.json`
- Run as Administrator if permission errors
- Check Windows Defender exclusions

### Linux

- Install system dependencies: `sudo apt install libnss3`
- Check file permissions
- Verify Node.js version

### macOS

- Allow browser in Security & Privacy settings
- Check Gatekeeper settings
- Verify Node.js installation

## Debugging Tips

### Enable Debug Logging

```javascript
import { setLogLevel } from '@firekid/scraper'
setLogLevel('debug')
```

### Use Screenshots

```cmd
SCREENSHOT ./debug/page.png
```

### Check Network Calls

```javascript
import { NetworkInterceptor } from '@firekid/scraper'

const interceptor = new NetworkInterceptor()
await interceptor.enableRequestLogging(page)
```

### Test Selectors

```javascript
const exists = await page.locator('selector').count() > 0
console.log('Selector exists:', exists)
```

## Getting Help

1. Check [GitHub Issues](https://github.com/YOUR_USERNAME/firekid-scraper/issues)
2. Read documentation
3. Enable debug logging
4. Provide minimal reproduction
5. Include system info

## Reporting Bugs

Include:
- OS and version
- Node.js version
- Firekid Scraper version
- Error message
- Steps to reproduce
- Expected vs actual behavior
