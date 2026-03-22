# Firekid Scraper - PRIVATE REPOSITORY

## CONFIDENTIAL - DO NOT SHARE

This repository contains proprietary code and algorithms.

## Repository Structure

### Public Code (Synced to GitHub)
- Core scraping engine
- Basic modes (downloader, scraper, navigator)
- Ghost fingerprinting (basic)
- Command system
- Plugin framework
- Network layer
- Cloudflare bypass (basic)

### Private Code (NOT SYNCED)
- `src/premium/` - Advanced AI features
- `src/internal/` - Analytics & telemetry
- `src/experimental/` - R&D projects
- `docs/internal/` - Technical architecture docs
- `scripts/` - Deployment automation

## Deployment

### Setup Required Secrets FIRST

**CRITICAL:** Configure 5 GitHub secrets before running workflows.

See **[docs/github-secrets.md](docs/github-secrets.md)** for complete setup guide.

**Required Secrets:**
1. `PRIVATE_REPO_TOKEN` - Access private repo
2. `PUBLIC_REPO_TOKEN` - Push to public repo & create releases
3. `PUBLIC_REPO_NAME` - Format: `username/firekid-scraper`
4. `PUBLIC_REPO_URL` - Format: `github.com/username/firekid-scraper.git`
5. `NPM_TOKEN` - Publish to npm registry

### Sync to Public Repo
```bash
# Manually trigger via GitHub Actions
# Or use CLI:
gh workflow run sync-public.yml -f version=1.0.0 -f create_release=true
```

### Publish to npm
```bash
# Manually trigger via GitHub Actions
# Or use CLI:
gh workflow run publish-npm.yml -f version=1.0.0 -f tag=latest
```

### Full Release (One Command)
```bash
node scripts/release.js
# Prompts for version and tag
# Syncs to public + publishes to npm
```

## What's Private?

### Advanced Bypass Techniques
- Proprietary Cloudflare bypass methods
- Advanced Turnstile solving
- Custom fingerprint rotation
- Anti-detection algorithms
- TLS fingerprint manipulation

### AI Features (Future)
- Vision-based selector generation
- ML pattern recognition
- Auto-learning scrapers
- Behavioral prediction

### Analytics (Future)
- Usage telemetry
- Performance metrics
- Error tracking
- License validation

## Security Notes

- Never commit `.env` files
- API keys stored in GitHub Secrets only
- Premium features stay in private repo
- No references to private code in public repo
- All deployment scripts are private

## Development Workflow

1. **Develop in private repo** - All features go here first
2. **Test thoroughly** - Ensure everything works
3. **Sync to public** - Run sync workflow (removes private files)
4. **Publish to npm** - Automated from public repo
5. **Tag release** - Create GitHub release

## File Organization

```
Private Repo Structure:
├── src/
│   ├── core/          [PUBLIC]
│   ├── modes/         [PUBLIC]
│   ├── engine/        [PUBLIC]
│   ├── ghost/         [PUBLIC]
│   ├── cloudflare/    [PUBLIC]
│   ├── network/       [PUBLIC]
│   ├── recorder/      [PUBLIC]
│   ├── premium/       [PRIVATE] - Advanced features
│   ├── internal/      [PRIVATE] - Analytics
│   └── experimental/  [PRIVATE] - R&D
├── scripts/           [PRIVATE] - Deployment
├── .github/workflows/ [PRIVATE] - CI/CD
└── docs/internal/     [PRIVATE] - Architecture
```

## Version Management

- Use semantic versioning (MAJOR.MINOR.PATCH)
- Update CHANGELOG.md for each release
- Tag releases in both repos
- Keep version numbers in sync

## Testing Before Release

1. Run tests: `npm test`
2. Build: `npm run build`
3. Test CLI: `node dist/bin/firekid-scraper.js --help`
4. Test as package: `npm link` in another project
5. Verify exports work in both CJS and ESM

## Troubleshooting

### Sync fails
- Check .syncignore is up to date
- Verify PUBLIC_REPO_TOKEN has correct permissions
- Ensure no conflicts in public repo

### npm publish fails
- Verify NPM_TOKEN is valid
- Check package.json version is unique
- Ensure build completed successfully

### Module errors
- Check tsup.config.ts exports both CJS and ESM
- Verify package.json exports field is correct
- Test with both `require()` and `import`

## Contact

For issues with deployment, contact the maintainer.
