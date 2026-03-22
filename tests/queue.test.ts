import { describe, it, expect } from 'vitest'
import { TaskQueue } from '../src/engine/queue.js'

describe('TaskQueue', () => {
  it('should add and process tasks', () => {
    const queue = new TaskQueue()

    queue.add({
      id: 'task-1',
      url: 'https://example.com',
      mode: 'scrape',
      options: {},
      priority: 1,
      retries: 0
    })

    const stats = queue.getStats()
    expect(stats.pending).toBe(1)

    const task = queue.next()
    expect(task).toBeTruthy()
    expect(task?.id).toBe('task-1')
  })

  it('should prioritize tasks', () => {
    const queue = new TaskQueue()

    queue.add({
      id: 'low',
      url: 'https://example.com',
      mode: 'scrape',
      options: {},
      priority: 1,
      retries: 0
    })

    queue.add({
      id: 'high',
      url: 'https://example.com',
      mode: 'scrape',
      options: {},
      priority: 10,
      retries: 0
    })

    const first = queue.next()
    expect(first?.id).toBe('high')
  })

  it('should handle task completion', () => {
    const queue = new TaskQueue()

    queue.add({
      id: 'task-1',
      url: 'https://example.com',
      mode: 'scrape',
      options: {},
      priority: 1,
      retries: 0
    })

    const task = queue.next()
    queue.complete(task!.id)

    const stats = queue.getStats()
    expect(stats.completed).toBe(1)
    expect(stats.processing).toBe(0)
  })
})
