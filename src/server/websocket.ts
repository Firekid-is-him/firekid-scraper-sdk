import { WebSocketServer, WebSocket } from 'ws'
import { logger } from '../logger/logger.js'

export class RealtimeServer {
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()

  start(port: number = 8080): void {
    this.wss = new WebSocketServer({ port })

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('[realtime] Client connected')
      this.clients.add(ws)

      ws.on('close', () => {
        logger.info('[realtime] Client disconnected')
        this.clients.delete(ws)
      })

      ws.on('error', (err) => {
        logger.error(`[realtime] WebSocket error: ${err.message}`)
      })

      ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }))
    })

    logger.info(`[realtime] WebSocket server started on port ${port}`)
  }

  broadcast(event: string, data: any): void {
    const message = JSON.stringify({ event, data, timestamp: Date.now() })

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }

  sendProgress(taskId: string, progress: number): void {
    this.broadcast('progress', { taskId, progress })
  }

  sendComplete(taskId: string, result: any): void {
    this.broadcast('complete', { taskId, result })
  }

  sendError(taskId: string, error: string): void {
    this.broadcast('error', { taskId, error })
  }

  close(): void {
    for (const client of this.clients) {
      client.close()
    }

    if (this.wss) {
      this.wss.close()
      logger.info('[realtime] WebSocket server closed')
    }
  }
}
