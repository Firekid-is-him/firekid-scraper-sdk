import type { Task, QueueStats } from '../types.js'
import { logger } from '../logger/logger.js'

export class TaskQueue {
  private pending: Task[] = []
  private processing: Set<string> = new Set()
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
      this.processing.add(task.id)
      logger.info(`[queue] Processing task ${task.id}`)
    }

    return task || null
  }

  complete(taskId: string): void {
    this.processing.delete(taskId)
    const task = this.findTask(taskId)
    if (task) {
      this.completed.push(task)
      logger.info(`[queue] Task ${taskId} completed`)
    }
  }

  fail(taskId: string, error: string): void {
    this.processing.delete(taskId)
    const task = this.findTask(taskId)
    
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

  private findTask(id: string): Task | undefined {
    return this.pending.find(t => t.id === id) ||
           this.completed.find(t => t.id === id) ||
           this.failed.find(t => t.id === id)
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
