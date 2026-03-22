export { FirekidScraper } from './core/scraper.js'
export { CommandParser, type CmdFile, type CmdStep } from './engine/cmd-parser.js'
export { CommandExecutor } from './engine/cmd-executor.js'
export { applyGhost, getSeedForSite, getNewSeed } from './ghost/index.js'
export { CloudflareManager } from './cloudflare/cloudflare.js'
export { SmartFetch } from './network/smart-fetch.js'
export { ActionRecorder } from './recorder/recorder.js'
export { PatternCache } from './intelligence/pattern-cache.js'
export { config, getConfig, updateConfig } from './config.js'
export { logger, setLogLevel } from './logger/logger.js'

export type {
  FirekidConfig,
  ScrapingResult,
  Seed,
  GhostOptions,
  FetchOptions,
  FetchResponse,
  SitePattern,
  Mode,
  FormTemplate,
  BehaviorProfile
} from './types.js'
