import type { Page, BrowserContext, Browser } from 'playwright'

export interface FirekidConfig {
  headless?: boolean
  bypassCloudflare?: boolean
  maxWorkers?: number
  timeout?: number
  dataDir?: string
  logLevel?: 'error' | 'warn' | 'info' | 'debug'
}

export interface ScrapingResult {
  success: boolean
  data: any
  errors: string[]
  timestamp: number
}

export type CmdAction =
  | 'GOTO' | 'BACK' | 'FORWARD' | 'REFRESH'
  | 'CLICK' | 'TYPE' | 'PRESS' | 'SELECT' | 'CHECK' | 'UPLOAD'
  | 'WAIT' | 'WAITLOAD' | 'SCROLL' | 'SCROLLDOWN'
  | 'SCAN' | 'EXTRACT' | 'SCREENSHOT'
  | 'PAGINATE' | 'INFINITESCROLL'
  | 'FETCH' | 'DOWNLOAD' | 'REFERER'
  | 'BYPASS_CLOUDFLARE'
  | 'REPEAT' | 'IF' | 'LOOP'

export interface CmdStep {
  action: CmdAction
  args: string[]
  children?: CmdStep[]
  line: number
}

export interface CmdFile {
  site: string
  steps: CmdStep[]
  raw: string
}

export interface Seed {
  id: string
  chromeVersion: string
  screenWidth: number
  screenHeight: number
  language: string
  timezone: string
  canvasNoise: number
  webglVendor: string
  webglRenderer: string
  audioNoise: number
  fonts: string[]
}

export interface GhostOptions {
  siteHost?: string
  fresh?: boolean
  seed?: Seed
}

export interface CFTokens {
  cfClearance?: string
  cfBm?: string
  headers?: Record<string, string>
}

export interface TurnstileOptions {
  mode?: 'auto' | 'manual' | 'skip'
  timeout?: number
}

export interface FetchOptions {
  url: string
  referer?: string
  autoReferer?: boolean
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  cookies?: Record<string, string>
  body?: any
  followRedirects?: boolean
  timeout?: number
}

export interface FetchResponse {
  status: number
  headers: Record<string, string>
  data: any
}

export interface SitePattern {
  type: string
  selectors: Record<string, string>
  flow: string[]
  successRate: number
}

export interface Pattern {
  name: string
  indicators: string[]
  extract: (page: Page) => Promise<any>
}

export interface RecordedAction {
  type: string
  selectors: SelectorSet
  value?: string
  timestamp: number
  element?: any
  text?: string
  fieldType?: string
}

export interface SelectorSet {
  primary: string
  fallbacks: string[]
}

export interface DetectedPatterns {
  hasFormSubmission?: FormPattern | null
  hasPagination?: PaginationPattern | null
  hasInfiniteScroll?: ScrollPattern | null
  hasDownloadFlow?: boolean
  hasLogin?: boolean
  hasSearch?: boolean
}

export interface FormPattern {
  type: 'FORM_SUBMISSION'
  fields: Array<{
    selector: string
    type: string
    placeholder: string
  }>
  submitButton: string
}

export interface PaginationPattern {
  type: 'PAGINATION'
  nextButton: string
  timesClicked: number
}

export interface ScrollPattern {
  type: 'INFINITE_SCROLL'
  totalScrolls: number
}

export interface SelectorStrategy {
  name: string
  execute: (page: Page, intent: string) => Promise<string | null>
}

export type Mode = 'downloader' | 'scrape' | 'navigator' | 'ssr' | 'api-hunter' | 'auto'

export interface ModeResult {
  mode: Mode
  success: boolean
  data: any
  errors: string[]
}

export interface FormField {
  selector: string
  fallbackSelectors: string[]
  type: FieldType
  label: string | null
  placeholder: string
  required: boolean
  validation: ValidationRule[]
}

export type FieldType = 'email' | 'password' | 'username' | 'phone' | 'name' | 'text'

export interface ValidationRule {
  type: 'regex' | 'minlength' | 'maxlength'
  value?: any
  pattern?: string
}

export interface FormTemplate {
  fields: FormField[]
  submitButton: string
  formType: FormType
}

export type FormType = 'LOGIN' | 'REGISTRATION' | 'SEARCH' | 'CONTACT' | 'GENERIC'

export interface BehaviorProfile {
  typingSpeed: { min: number; max: number }
  mouseMovements: Array<{ x: number; y: number; timestamp: number }>
  scrollPatterns: Array<{ y: number; timestamp: number }>
  pauseDistribution: number[]
  clickTiming: Array<{ timestamp: number }>
}

export interface Task {
  id: string
  url: string
  mode: Mode
  options: any
  priority: number
  retries: number
}

export interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
}

export interface Plugin {
  name: string
  type: 'scraping' | 'action' | 'extractor' | 'filter' | 'output' | 'parser'
  version: string
  execute: (context: any) => Promise<any>
}

export interface Session {
  id: string
  url: string
  cookies: any[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  fingerprint: Seed
  timestamp: number
}

export interface WorkerConfig {
  id: number
  browser: Browser
  context: BrowserContext
  seed: Seed
}

export interface DownloadFlow {
  type: 'DIRECT' | 'BUTTON_CLICK' | 'VIDEO_EXTRACTION' | 'NETWORK_INTERCEPT'
  steps: string[]
  links?: any[]
  button?: any
  method?: any
}

export interface VideoMethod {
  type: 'DIRECT_SRC' | 'SOURCE_ELEMENT' | 'HLS' | 'DASH' | 'UNKNOWN'
  url?: string
}

export interface DownloadButton {
  selector: string
  score: number
  text: string
  href?: string
}

export interface FileLink {
  url: string
  selector: string
  extension?: string
}

export interface Mutation {
  headers?: Record<string, string>
  delays?: number[]
  ghost?: any
  scrollPattern?: string
  clickPattern?: string
}

export interface Prediction {
  element: string
  confidence: number
  timestamp: number
}
