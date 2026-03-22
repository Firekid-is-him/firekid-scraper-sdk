import { EventEmitter } from 'events'
import { logger } from '../logger/logger.js'

export type EventName = 
  | 'scrape:start'
  | 'scrape:complete'
  | 'scrape:error'
  | 'page:loaded'
  | 'data:extracted'
  | 'cloudflare:detected'
  | 'cloudflare:solved'
  | 'download:start'
  | 'download:complete'

export class SignalManager extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(100)
  }

  emit(event: EventName, ...args: any[]): boolean {
    logger.debug(`[signals] Event emitted: ${event}`)
    return super.emit(event, ...args)
  }

  on(event: EventName, listener: (...args: any[]) => void): this {
    logger.debug(`[signals] Listener registered: ${event}`)
    return super.on(event, listener)
  }

  once(event: EventName, listener: (...args: any[]) => void): this {
    logger.debug(`[signals] One-time listener registered: ${event}`)
    return super.once(event, listener)
  }

  off(event: EventName, listener: (...args: any[]) => void): this {
    logger.debug(`[signals] Listener removed: ${event}`)
    return super.off(event, listener)
  }

  async waitFor(event: EventName, timeout?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = timeout ? setTimeout(() => {
        this.off(event, handler)
        reject(new Error(`Timeout waiting for ${event}`))
      }, timeout) : null

      const handler = (data: any) => {
        if (timer) clearTimeout(timer)
        resolve(data)
      }

      this.once(event, handler)
    })
  }

  listEventNames(): EventName[] {
    return super.eventNames() as EventName[]
  }

  listenerCount(event: EventName): number {
    return super.listenerCount(event)
  }
}

export const signals = new SignalManager()
