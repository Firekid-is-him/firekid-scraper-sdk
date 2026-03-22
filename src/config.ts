import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

export const config = {
  browser: {
    headless: process.env.HEADLESS === 'true',
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
    maxWorkers: parseInt(process.env.MAX_QUEUE_WORKERS || '5', 10)
  },

  cloudflare: {
    bypass: process.env.CF_BYPASS || 'auto',
    turnstileSolver: process.env.TURNSTILE_SOLVER || 'manual'
  },

  captcha: {
    apiKey: process.env.CAPTCHA_API_KEY || ''
  },

  server: {
    enabled: process.env.API_ENABLED === 'true',
    port: parseInt(process.env.API_PORT || '3000', 10),
    apiKey: process.env.API_KEY || ''
  },

  proxy: {
    enabled: process.env.PROXY_ENABLED === 'true',
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
    recordScreenshots: process.env.RECORD_SCREENSHOTS === 'true'
  },

  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '3600000', 10)
  },

  advanced: {
    enableTelemetry: process.env.ENABLE_TELEMETRY === 'true',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true'
  }
}

export function getConfig() {
  return config
}

export function updateConfig(updates: Partial<typeof config>) {
  Object.assign(config, updates)
}
