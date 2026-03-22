import { WebSocket, WebSocketServer } from 'ws'
import { logger } from '../logger/logger.js'

export class IPCManager {
  private server: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private handlers: Map<string, (data: any) => any> = new Map()

  startServer(port: number = 8080): void {
    this.server = new WebSocketServer({ port })

    this.server.on('connection', (ws: WebSocket) => {
      logger.info('[ipc] Client connected')
      this.clients.add(ws)

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString())
          await this.handleMessage(ws, message)
        } catch (err: any) {
          logger.error(`[ipc] Message error: ${err.message}`)
        }
      })

      ws.on('close', () => {
        logger.info('[ipc] Client disconnected')
        this.clients.delete(ws)
      })

      ws.on('error', (err) => {
        logger.error(`[ipc] WebSocket error: ${err.message}`)
      })
    })

    logger.info(`[ipc] Server started on port ${port}`)
  }

  private async handleMessage(ws: WebSocket, message: any): Promise<void> {
    const { type, data, id } = message

    const handler = this.handlers.get(type)

    if (handler) {
      try {
        const result = await handler(data)
        this.send(ws, { type: `${type}:response`, data: result, id })
      } catch (err: any) {
        this.send(ws, { type: `${type}:error`, data: err.message, id })
      }
    } else {
      logger.warn(`[ipc] No handler for message type: ${type}`)
    }
  }

  registerHandler(type: string, handler: (data: any) => any): void {
    this.handlers.set(type, handler)
    logger.info(`[ipc] Registered handler: ${type}`)
  }

  send(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  broadcast(message: any): void {
    const data = JSON.stringify(message)
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }

    logger.debug(`[ipc] Broadcast to ${this.clients.size} clients`)
  }

  close(): void {
    for (const client of this.clients) {
      client.close()
    }

    if (this.server) {
      this.server.close()
      logger.info('[ipc] Server closed')
    }
  }

  getClientCount(): number {
    return this.clients.size
  }
}
