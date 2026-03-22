# GitHub Secrets Configuration Guide

This document explains how to set up GitHub secrets for automated publishing workflows.

## Required Secrets

You need to configure the following secrets in your **private repository**:

### 1. PRIVATE_REPO_TOKEN
**Purpose:** Access the private repository  
**Type:** GitHub Personal Access Token (Classic)  
**Scopes Required:**
- `repo` (Full control of private repositories)

**How to create:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: "Firekid Private Repo Access"
4. Select scope: `repo`
5. Generate and copy the token
6. Add to private repo: Settings → Secrets and variables → Actions → New repository secret
7. Name: `PRIVATE_REPO_TOKEN`
8. Value: [paste token]

### 2. PUBLIC_REPO_TOKEN
**Purpose:** Push to public repository and create releases  
**Type:** GitHub Personal Access Token (Classic)  
**Scopes Required:**
- `repo` (Full control of private repositories)
- `write:packages` (Upload packages to GitHub Package Registry)

**How to create:**
1. Same as above, but select both `repo` and `write:packages` scopes
2. Name: "Firekid Public Repo Access"
3. Add to private repo as secret: `PUBLIC_REPO_TOKEN`

### 3. PUBLIC_REPO_NAME
**Purpose:** Target public repository name  
**Type:** Plain text (not sensitive, but stored as secret for easy updates)  
**Format:** `username/repository-name`  
**Example:** `yourname/firekid-scraper`

**How to create:**
1. Go to private repo: Settings → Secrets and variables → Actions → New repository secret
2. Name: `PUBLIC_REPO_NAME`
3. Value: `your-github-username/firekid-scraper`

### 4. PUBLIC_REPO_URL
**Purpose:** Full Git URL for public repository  
**Type:** Plain text  
**Format:** `github.com/username/repository-name.git`  
**Example:** `github.com/yourname/firekid-scraper.git`

**How to create:**
1. Add as secret: `PUBLIC_REPO_URL`
2. Value: `github.com/your-github-username/firekid-scraper.git`

### 5. NPM_TOKEN
**Purpose:** Publish to npm registry  
**Type:** npm Access Token  
**How to create:**
1. Log in to npmjs.com
2. Go to Account → Access Tokens
3. Click "Generate New Token" → "Classic Token"
4. Type: "Automation"
5. Copy the token
6. Add to private repo as secret: `NPM_TOKEN`

## Summary Table

| Secret Name | Type | Purpose | Required Scopes |
|-------------|------|---------|-----------------|
| PRIVATE_REPO_TOKEN | GitHub PAT | Access private repo | `repo` |
| PUBLIC_REPO_TOKEN | GitHub PAT | Push to public, create releases | `repo`, `write:packages` |
| PUBLIC_REPO_NAME | Text | Public repo identifier | N/A |
| PUBLIC_REPO_URL | Text | Public repo Git URL | N/A |
| NPM_TOKEN | npm token | Publish to npm | Automation |

## Workflow Usage

### Sync to Public Repo
```bash
# In GitHub UI: Actions → Sync to Public Repo → Run workflow
# Or via gh CLI:
gh workflow run sync-public.yml \
  -f version=1.0.0 \
  -f create_release=true
```

**Process:**
1. Checks out private repo using `PRIVATE_REPO_TOKEN`
2. Removes files listed in `.syncignore`
3. Updates version in `package.json`
4. Pushes to public repo using `PUBLIC_REPO_TOKEN` and `PUBLIC_REPO_URL`
5. Creates GitHub release in public repo using `PUBLIC_REPO_NAME`

### Publish to npm
```bash
# In GitHub UI: Actions → Publish to npm → Run workflow
# Or via gh CLI:
gh workflow run publish-npm.yml \
  -f version=1.0.0 \
  -f tag=latest \
  -f dry_run=false
```

**Process:**
1. Checks out public repo using `PUBLIC_REPO_NAME` and `PUBLIC_REPO_TOKEN`
2. Installs dependencies and builds
3. Runs tests
4. Verifies version matches input
5. Publishes to npm using `NPM_TOKEN`

## Complete Setup Steps

### Step 1: Create Public Repository
```bash
# On GitHub, create new public repository
# Name: firekid-scraper
# Don't initialize with README (will be synced from private)
```

### Step 2: Configure Secrets
Add all 5 secrets to your **private repository** (see table above)

### Step 3: Test Sync Workflow
```bash
# Run with dry_run first
gh workflow run sync-public.yml \
  -f version=0.0.1 \
  -f create_release=false
```

### Step 4: Verify Public Repo
Check that files were synced correctly to public repo

### Step 5: Test npm Publish
```bash
# Run with dry_run
gh workflow run publish-npm.yml \
  -f version=0.0.1 \
  -f tag=beta \
  -f dry_run=true
```

### Step 6: Production Release
```bash
# 1. Sync to public
gh workflow run sync-public.yml \
  -f version=1.0.0 \
  -f create_release=true

# 2. Wait for sync to complete

# 3. Publish to npm
gh workflow run publish-npm.yml \
  -f version=1.0.0 \
  -f tag=latest \
  -f dry_run=false
```

## Troubleshooting

### Error: "Resource not accessible by integration"
- Check that tokens have correct scopes
- Verify tokens haven't expired
- Ensure tokens have access to both repos

### Error: "Repository not found"
- Check `PUBLIC_REPO_NAME` format: `username/repo-name`
- Check `PUBLIC_REPO_URL` format: `github.com/username/repo-name.git`
- Verify public repo exists

### Error: "npm publish failed"
- Verify `NPM_TOKEN` is valid
- Check if package name is available on npm
- Ensure version number is incremented

### Error: "Version mismatch"
- Sync workflow updates `package.json` version
- Publish workflow expects version to already match
- Always run sync before publish

## Security Best Practices

1. **Never commit tokens** - Always use secrets
2. **Use separate tokens** - Different tokens for private/public access
3. **Rotate regularly** - Update tokens every 90 days
4. **Minimum permissions** - Only grant required scopes
5. **Audit access** - Review token usage in GitHub settings

## Advanced Configuration

### Custom Branch
To sync/publish from a different branch, modify workflows:

```yaml
git push public HEAD:develop --force  # Instead of main
```

### Scoped Package
Package is already scoped: `@firekid/scraper`

To change scope, update `package.json`:
```json
{
  "name": "@your-scope/scraper"
}
```

### Beta/Alpha Releases
Use different npm tags:
```bash
gh workflow run publish-npm.yml \
  -f version=1.0.0-beta.1 \
  -f tag=beta
```

## Verification

### Check Sync
```bash
# Public repo should have same files minus .syncignore patterns
git clone https://github.com/USERNAME/firekid-scraper.git
ls -la
# Should NOT contain PRIVATE_README.md, .syncignore
```

### Check npm Package
```bash
# After publish
npm view @firekid/scraper
npm install @firekid/scraper
```

### Check GitHub Release
```bash
# Visit public repo releases
https://github.com/USERNAME/firekid-scraper/releases
```

## Questions?

- Check workflow logs in Actions tab
- Verify all secrets are set correctly
- Ensure public repo exists and is accessible
- Test with dry_run first
