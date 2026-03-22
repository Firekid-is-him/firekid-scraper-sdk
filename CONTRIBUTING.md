# Contributing to Firekid Scraper

Thank you for your interest in contributing to Firekid Scraper!

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - System info (OS, Node version, etc.)

### Suggesting Features

1. Check if the feature has been requested
2. Create an issue describing:
   - Use case
   - Proposed solution
   - Alternatives considered

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure tests pass: `npm test`
6. Submit a pull request

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/firekid-scraper.git
cd firekid-scraper
npm install
npx playwright install chromium
npm run build
```

## Code Style

- Follow existing code style
- Use TypeScript for new files
- No comments in code (except JSDoc)
- Run `npm run lint` before committing

## Testing

```bash
npm test
```

Add tests for new features in the `tests/` directory.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
