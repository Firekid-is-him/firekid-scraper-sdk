import { logger } from '../logger/logger.js'

export class WebhookNotifier {
  private webhookUrl: string

  constructor(url: string) {
    this.webhookUrl = url
  }

  async send(data: any): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }

      logger.info('[webhook] Notification sent successfully')
    } catch (err: any) {
      logger.error(`[webhook] Failed to send notification: ${err.message}`)
      throw err
    }
  }

  async sendSuccess(taskId: string, data: any): Promise<void> {
    await this.send({
      event: 'scrape.success',
      taskId,
      data,
      timestamp: Date.now()
    })
  }

  async sendError(taskId: string, error: string): Promise<void> {
    await this.send({
      event: 'scrape.error',
      taskId,
      error,
      timestamp: Date.now()
    })
  }

  async sendProgress(taskId: string, progress: number): Promise<void> {
    await this.send({
      event: 'scrape.progress',
      taskId,
      progress,
      timestamp: Date.now()
    })
  }

  async sendCustom(event: string, payload: any): Promise<void> {
    await this.send({
      event,
      ...payload,
      timestamp: Date.now()
    })
  }
}
