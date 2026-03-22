# Security Best Practices

Security guidelines for Firekid Scraper.

## API Keys and Credentials

### Never Hardcode Secrets

```javascript
// Bad
const apiKey = 'sk-12345'

// Good
const apiKey = process.env.API_KEY
```

### Use Environment Variables

Create `.env` file:
```
API_KEY=your-key-here
WEBHOOK_URL=https://your-webhook.com
GITHUB_TOKEN=ghp_xxxxx
```

Never commit `.env` to version control.

## Data Protection

### Sanitize User Input

```javascript
function sanitize(input) {
  return input.replace(/[<>\"']/g, '')
}
```

### Validate URLs

```javascript
function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
```

## Network Security

### Use HTTPS

```javascript
const url = 'https://example.com'
```

Always prefer HTTPS over HTTP.

### Verify SSL Certificates

Playwright verifies SSL by default. Don't disable unless necessary.

### Rate Limiting

```javascript
import { RateLimiter } from '@firekid/scraper'

const limiter = new RateLimiter(100, 60000)
```

Prevent abuse and respect server limits.

## Authentication

### Secure API Endpoints

```javascript
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key']
  
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  next()
})
```

### Use JWT Tokens

```javascript
import jwt from 'jsonwebtoken'

const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET)
```

## Data Storage

### Encrypt Sensitive Data

```javascript
import bcrypt from 'bcrypt'

const hashed = await bcrypt.hash(password, 10)
```

### Secure Database Connections

Use parameterized queries to prevent SQL injection.

### Clean Up Old Data

```javascript
const db = new DatabaseOutput()
db.deleteOld(86400000)
```

## Browser Security

### Isolate Contexts

```javascript
const context = await browser.newContext({
  permissions: []
})
```

Limit permissions for each context.

### Clear Sessions

```javascript
await context.clearCookies()
await context.clearPermissions()
```

## Logging

### Never Log Sensitive Data

```javascript
// Bad
logger.info('Password:', password)

// Good
logger.info('User authenticated')
```

### Sanitize Logs

Remove API keys, tokens, and passwords from logs.

## Common Vulnerabilities

### Prevent Path Traversal

```javascript
const safePath = path.join(baseDir, path.basename(userInput))
```

### Avoid Code Injection

Never use `eval()` or `Function()` with user input.

### XSS Prevention

Sanitize all user-generated content.

## Compliance

### GDPR

- Only collect necessary data
- Provide data deletion mechanisms
- Obtain consent for data collection

### Robots.txt

Respect site robots.txt:
```javascript
const robotsUrl = new URL('/robots.txt', baseUrl)
const robots = await fetch(robotsUrl)
```

### Terms of Service

Always comply with target site's ToS.

## Monitoring

### Log Security Events

```javascript
logger.warn('Failed login attempt', { ip, timestamp })
```

### Set Up Alerts

Monitor for:
- Failed authentication
- Rate limit exceeded
- Unusual traffic patterns

## Updates

### Keep Dependencies Updated

```bash
npm audit
npm update
```

### Security Patches

Subscribe to security advisories for Playwright and other dependencies.

## Deployment

### Use Secrets Management

For production:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

### Restrict Network Access

Use firewalls and security groups.

### Enable HTTPS

For API servers:
```javascript
import https from 'https'
import fs from 'fs'

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

https.createServer(options, app).listen(443)
```

## Checklist

- [ ] No hardcoded secrets
- [ ] All API endpoints authenticated
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Sensitive data encrypted
- [ ] HTTPS enforced
- [ ] Dependencies updated
- [ ] Security logging enabled
- [ ] robots.txt respected
- [ ] Regular security audits
