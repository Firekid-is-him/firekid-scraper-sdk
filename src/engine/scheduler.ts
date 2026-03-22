import Cron from 'croner'
import type { Task } from '../types.js'
import { logger } from '../logger/logger.js'

export class TaskScheduler {
  private jobs: Map<string, any> = new Map()

  schedule(id: string, cronExpression: string, task: () => Promise<void>): void {
    if (this.jobs.has(id)) {
      logger.warn(`[scheduler] Job ${id} already exists, stopping old job`)
      this.stop(id)
    }

    const job = Cron(cronExpression, async () => {
      logger.info(`[scheduler] Running job: ${id}`)
      try {
        await task()
        logger.info(`[scheduler] Job ${id} completed`)
      } catch (err: any) {
        logger.error(`[scheduler] Job ${id} failed: ${err.message}`)
      }
    })

    this.jobs.set(id, job)
    logger.info(`[scheduler] Scheduled job ${id}: ${cronExpression}`)
  }

  scheduleOnce(id: string, delay: number, task: () => Promise<void>): void {
    setTimeout(async () => {
      logger.info(`[scheduler] Running one-time job: ${id}`)
      try {
        await task()
        logger.info(`[scheduler] One-time job ${id} completed`)
      } catch (err: any) {
        logger.error(`[scheduler] One-time job ${id} failed: ${err.message}`)
      }
    }, delay)

    logger.info(`[scheduler] Scheduled one-time job ${id} in ${delay}ms`)
  }

  stop(id: string): void {
    const job = this.jobs.get(id)
    if (job) {
      job.stop()
      this.jobs.delete(id)
      logger.info(`[scheduler] Stopped job: ${id}`)
    }
  }

  stopAll(): void {
    for (const [id, job] of this.jobs) {
      job.stop()
      logger.info(`[scheduler] Stopped job: ${id}`)
    }
    this.jobs.clear()
    logger.info('[scheduler] All jobs stopped')
  }

  listJobs(): string[] {
    return Array.from(this.jobs.keys())
  }

  isRunning(id: string): boolean {
    return this.jobs.has(id)
  }
}
