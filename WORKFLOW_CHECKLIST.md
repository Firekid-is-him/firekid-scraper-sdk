# Workflow Configuration Checklist

Use this checklist to verify your GitHub Actions workflows are correctly configured.

## Pre-Deployment Checklist

### ✅ GitHub Secrets Configuration

- [ ] **PRIVATE_REPO_TOKEN** created with `repo` scope
- [ ] **PUBLIC_REPO_TOKEN** created with `repo` + `write:packages` scopes
- [ ] **PUBLIC_REPO_NAME** set (format: `username/firekid-scraper`)
- [ ] **PUBLIC_REPO_URL** set (format: `github.com/username/firekid-scraper.git`)
- [ ] **NPM_TOKEN** created from npmjs.com (Automation token)
- [ ] All secrets added to **private repository** (not public)

### ✅ Repository Setup

- [ ] Private repository exists
- [ ] Public repository created (empty, no initialization)
- [ ] Public repository is accessible with PUBLIC_REPO_TOKEN
- [ ] npm package name `@firekid/scraper` is available

### ✅ Workflow Files

- [ ] `.github/workflows/sync-public.yml` exists
- [ ] `.github/workflows/publish-npm.yml` exists
- [ ] `.github/workflows/test.yml` exists
- [ ] No `YOUR_USERNAME` placeholders in workflows
- [ ] All workflows use secrets (not hardcoded values)

### ✅ Configuration Files

- [ ] `.syncignore` exists and lists private files
- [ ] `package.json` has correct package name: `@firekid/scraper`
- [ ] `package.json` has dual exports (CJS + ESM)
- [ ] `tsup.config.ts` generates both .cjs and .js files

## Testing Workflows

### Step 1: Test Sync (Dry Run)

```bash
# This won't create a release
gh workflow run sync-public.yml \
  -f version=0.0.1-test \
  -f create_release=false
```

**Verify:**
- [ ] Workflow runs without errors
- [ ] Public repo receives files
- [ ] Private files (PRIVATE_README.md, .syncignore) NOT in public repo
- [ ] package.json version updated to 0.0.1-test

### Step 2: Test npm Publish (Dry Run)

```bash
# This won't actually publish
gh workflow run publish-npm.yml \
  -f version=0.0.1-test \
  -f tag=beta \
  -f dry_run=true
```

**Verify:**
- [ ] Workflow runs without errors
- [ ] Build completes successfully
- [ ] Tests pass (or skip if none)
- [ ] Dry run shows what would be published
- [ ] No actual npm package created

### Step 3: Full Release Test

```bash
# 1. Sync to public with release
gh workflow run sync-public.yml \
  -f version=0.1.0-beta \
  -f create_release=true

# Wait for completion, then:

# 2. Publish to npm with beta tag
gh workflow run publish-npm.yml \
  -f version=0.1.0-beta \
  -f tag=beta \
  -f dry_run=false
```

**Verify:**
- [ ] Public repo has v0.1.0-beta release
- [ ] npm shows `@firekid/scraper@beta`
- [ ] Can install: `npm install @firekid/scraper@beta`
- [ ] Package works in test project

## Production Release Checklist

### Before Release

- [ ] All tests passing locally
- [ ] Version number incremented in CHANGELOG.md
- [ ] Breaking changes documented
- [ ] README updated if needed
- [ ] Examples tested

### Release Steps

1. **Update Version**
   ```bash
   # Example: 1.0.0
   VERSION="1.0.0"
   ```

2. **Sync to Public**
   ```bash
   gh workflow run sync-public.yml \
     -f version=$VERSION \
     -f create_release=true
   ```
   - [ ] Workflow completed successfully
   - [ ] Check public repo for release

3. **Publish to npm**
   ```bash
   gh workflow run publish-npm.yml \
     -f version=$VERSION \
     -f tag=latest \
     -f dry_run=false
   ```
   - [ ] Workflow completed successfully
   - [ ] Package appears on npmjs.com

4. **Post-Release Verification**
   ```bash
   # Install and test
   npm install -g @firekid/scraper@latest
   firekid-scraper --version
   firekid-scraper --help
   ```
   - [ ] CLI installs correctly
   - [ ] Version matches release
   - [ ] Basic commands work

### After Release

- [ ] Update CHANGELOG.md with release date
- [ ] Announce on social media / Discord
- [ ] Monitor GitHub issues for bug reports
- [ ] Check npm download stats

## Troubleshooting

### Sync Workflow Fails

**Check:**
- [ ] PRIVATE_REPO_TOKEN has access to private repo
- [ ] PUBLIC_REPO_TOKEN has push access to public repo
- [ ] PUBLIC_REPO_URL is correct format
- [ ] .syncignore syntax is valid
- [ ] No merge conflicts in public repo

**Common Errors:**
- `remote: Repository not found` → Check PUBLIC_REPO_URL
- `Permission denied` → Check token scopes
- `non-fast-forward` → May need `--force` (already in workflow)

### Publish Workflow Fails

**Check:**
- [ ] PUBLIC_REPO_NAME matches actual repo
- [ ] NPM_TOKEN is valid and active
- [ ] Version in package.json matches input
- [ ] Build completes without errors
- [ ] Package name not already taken

**Common Errors:**
- `Version mismatch` → Sync workflow should update version first
- `E403: Forbidden` → Check NPM_TOKEN or package name availability
- `ENEEDAUTH` → NPM_TOKEN not set correctly

### Package Installation Fails

**Check:**
- [ ] package.json exports field correct
- [ ] Both CJS and ESM files generated
- [ ] Dependencies listed correctly
- [ ] Peer dependencies specified

## Quick Reference

### View Workflow Runs
```bash
gh run list --workflow=sync-public.yml
gh run list --workflow=publish-npm.yml
```

### View Workflow Logs
```bash
gh run view --log
```

### Cancel Running Workflow
```bash
gh run cancel <run-id>
```

### Re-run Failed Workflow
```bash
gh run rerun <run-id>
```

## Success Criteria

A successful deployment means:
- [x] Public repo updated with new version
- [x] GitHub release created
- [x] npm package published
- [x] Can install via npm
- [x] CLI works globally
- [x] Can import in Node.js projects
- [x] Both CJS and ESM work

## Getting Help

If workflows fail after following this checklist:
1. Check workflow logs in GitHub Actions
2. Review docs/github-secrets.md
3. Verify all secrets are set correctly
4. Test with dry-run first
5. Create issue if needed
