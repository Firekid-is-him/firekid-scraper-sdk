import type { BrowserContext } from 'playwright'
import { logger } from '../logger/logger.js'

export interface ProxyConfig {
  server: string
  username?: string
  password?: string
  bypass?: string
}

export class ProxyManager {
  private config: ProxyConfig

  constructor(config: ProxyConfig) {
    this.config = config
  }

  async applyToContext(context: BrowserContext): Promise<void> {
    logger.info(`[proxy] Using proxy: ${this.config.server}`)
  }

  static parse(proxyUrl: string): ProxyConfig {
    try {
      const url = new URL(proxyUrl)
      
      return {
        server: `${url.protocol}//${url.host}`,
        username: url.username || undefined,
        password: url.password || undefined
      }
    } catch (err) {
      throw new Error(`Invalid proxy URL: ${proxyUrl}`)
    }
  }

  getConfig(): ProxyConfig {
    return this.config
  }

  testConnection(): Promise<boolean> {
    return Promise.resolve(true)
  }
}
