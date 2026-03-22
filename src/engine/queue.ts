import type { Task, QueueStats } from '../types.js'
import { logger } from '../logger/logger.js'

export class TaskQueue {
  private pending: Task[] = []
  private processing: Map<string, Task> = new Map()
  private completed: Task[] = []
  private failed: Task[] = []

  add(task: Task): void {
    this.pending.push(task)
    this.pending.sort((a, b) => b.priority - a.priority)
    logger.info(`[queue] Added task ${task.id} (priority: ${task.priority})`)
  }

  next(): Task | null {
    const task = this.pending.shift()
    
    if (task) {
      this.processing.set(task.id, task)
      logger.info(`[queue] Processing task ${task.id}`)
    }

    return task || null
  }

  complete(taskId: string): void {
    const task = this.processing.get(taskId)
    this.processing.delete(taskId)
    if (task) {
      this.completed.push(task)
      logger.info(`[queue] Task ${taskId} completed`)
    }
  }

  fail(taskId: string, error: string): void {
    const task = this.processing.get(taskId)
    this.processing.delete(taskId)
    
    if (task) {
      task.retries++
      
      if (task.retries < 3) {
        task.priority = Math.max(0, task.priority - 1)
        this.pending.push(task)
        logger.warn(`[queue] Task ${taskId} failed, retrying (${task.retries}/3)`)
      } else {
        this.failed.push(task)
        logger.error(`[queue] Task ${taskId} failed permanently: ${error}`)
      }
    }
  }

  getStats(): QueueStats {
    return {
      pending: this.pending.length,
      processing: this.processing.size,
      completed: this.completed.length,
      failed: this.failed.length
    }
  }

  clear(): void {
    this.pending = []
    this.processing.clear()
    this.completed = []
    this.failed = []
    logger.info('[queue] Queue cleared')
  }

  getPending(): Task[] {
    return [...this.pending]
  }

  getCompleted(): Task[] {
    return [...this.completed]
  }

  getFailed(): Task[] {
    return [...this.failed]
  }

  isEmpty(): boolean {
    return this.pending.length === 0 && this.processing.size === 0
  }
}
