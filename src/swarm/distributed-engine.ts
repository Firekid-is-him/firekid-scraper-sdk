import { chromium, type Browser } from 'playwright'
import type { WorkerConfig, Task, Seed } from '../types.js'
import { BrowserWorker } from './browser-worker.js'
import { getNewSeed } from '../ghost/seed.js'
import { logger } from '../logger/logger.js'

export class DistributedEngine {
  private workers: BrowserWorker[] = []
  private maxWorkers: number
  private taskQueue: Task[] = []

  constructor(maxWorkers: number = 5) {
    this.maxWorkers = maxWorkers
  }

  async initialize(): Promise<void> {
    logger.info(`[distributed] Initializing ${this.maxWorkers} workers...`)

    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new BrowserWorker(i)
      await worker.initialize()
      this.workers.push(worker)
      logger.info(`[distributed] Worker ${i} initialized`)
    }

    logger.info('[distributed] All workers ready')
  }

  async addTask(task: Task): Promise<void> {
    this.taskQueue.push(task)
    logger.info(`[distributed] Task ${task.id} added to queue`)
  }

  async processTasks(): Promise<any[]> {
    logger.info(`[distributed] Processing ${this.taskQueue.length} tasks...`)

    const results: any[] = []
    const activeTasks = new Set<Promise<any>>()

    while (this.taskQueue.length > 0 || activeTasks.size > 0) {
      while (activeTasks.size < this.maxWorkers && this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!
        const worker = this.findAvailableWorker()

        if (worker) {
          const taskPromise = this.executeTask(worker, task)
            .then(result => {
              results.push(result)
              activeTasks.delete(taskPromise)
            })
            .catch(err => {
              logger.error(`[distributed] Task ${task.id} failed: ${err.message}`)
              activeTasks.delete(taskPromise)
            })

          activeTasks.add(taskPromise)
        } else {
          this.taskQueue.unshift(task)
          break
        }
      }

      if (activeTasks.size > 0) {
        await Promise.race(activeTasks)
      }
    }

    logger.info(`[distributed] Completed ${results.length} tasks`)
    return results
  }

  private findAvailableWorker(): BrowserWorker | null {
    for (const worker of this.workers) {
      if (!worker.isBusy()) {
        return worker
      }
    }
    return null
  }

  private async executeTask(worker: BrowserWorker, task: Task): Promise<any> {
    logger.info(`[distributed] Worker ${worker.getId()} executing task ${task.id}`)
    
    try {
      const result = await worker.execute(task)
      logger.info(`[distributed] Worker ${worker.getId()} completed task ${task.id}`)
      return result
    } catch (err: any) {
      logger.error(`[distributed] Worker ${worker.getId()} failed task ${task.id}: ${err.message}`)
      throw err
    }
  }

  async shutdown(): Promise<void> {
    logger.info('[distributed] Shutting down workers...')

    for (const worker of this.workers) {
      await worker.close()
    }

    this.workers = []
    logger.info('[distributed] All workers shut down')
  }

  getStats(): any {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.isBusy()).length,
      queuedTasks: this.taskQueue.length
    }
  }
}
