import dotenv from 'dotenv'

dotenv.config()

function toInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

type CloudflareMode = 'auto' | 'manual' | 'skip'

function toCloudflareMode(value: string | undefined): CloudflareMode {
  return value === 'manual' || value === 'skip' ? value : 'auto'
}

export const config = {
  browser: {
    headless: toBool(process.env.HEADLESS, true),
    timeout: toInt(process.env.BROWSER_TIMEOUT, 30000),
    maxWorkers: toInt(process.env.MAX_QUEUE_WORKERS, 5),
    noSandbox: toBool(process.env.NO_SANDBOX, false)
  },

  cloudflare: {
    bypass: toCloudflareMode(process.env.CF_BYPASS),
    turnstileSolver: process.env.TURNSTILE_SOLVER || 'manual',
    turnstileTimeout: toInt(process.env.TURNSTILE_TIMEOUT, 120000)
  },

  captcha: {
    apiKey: process.env.CAPTCHA_API_KEY || ''
  },

  server: {
    host: process.env.API_HOST || '127.0.0.1',
    port: toInt(process.env.API_PORT, 3000),
    apiKey: process.env.API_KEY || '',
    maxConcurrent: toInt(process.env.API_MAX_CONCURRENT, 2),
    commandDir: process.env.API_COMMAND_DIR || './commands',
    outputDir: process.env.API_OUTPUT_DIR || './output',
    requestTimeout: toInt(process.env.API_REQUEST_TIMEOUT, 120000),
    allowPrivateTargets: toBool(process.env.API_ALLOW_PRIVATE_URLS, false)
  },

  proxy: {
    enabled: toBool(process.env.PROXY_ENABLED, false),
    url: process.env.PROXY_URL || ''
  },

  storage: {
    dataDir: process.env.DATA_DIR || './data',
    patternsDb: process.env.PATTERNS_DB || './data/patterns.db',
    sessionsDb: process.env.SESSIONS_DB || './data/sessions.db'
  },

  logging: {
    level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug'
  },

  recording: {
    autoHideAfterSolve: process.env.AUTO_HIDE_AFTER_SOLVE !== 'false',
    recordScreenshots: toBool(process.env.RECORD_SCREENSHOTS, false)
  },

  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    max: toInt(process.env.RATE_LIMIT_MAX, 100),
    window: toInt(process.env.RATE_LIMIT_WINDOW, 3600000)
  },

  advanced: {
    enableTelemetry: toBool(process.env.ENABLE_TELEMETRY, false),
    enableAnalytics: toBool(process.env.ENABLE_ANALYTICS, false)
  }
}

export function getConfig() {
  return config
}

export function updateConfig(updates: Partial<typeof config>) {
  Object.assign(config, updates)
}
