import Database from 'better-sqlite3'
import { logger } from '../logger/logger.js'
import path from 'path'
import fs from 'fs'

export class DatabaseOutput {
  private db: Database.Database

  constructor(dbPath: string = './data/output.db') {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.initialize()
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scrape_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `)

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_url ON scrape_results(url)
    `)

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_timestamp ON scrape_results(timestamp)
    `)

    logger.info('[database] Database initialized')
  }

  insert(url: string, data: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO scrape_results (url, data)
      VALUES (?, ?)
    `)

    stmt.run(url, JSON.stringify(data))
    logger.info(`[database] Inserted result for ${url}`)
  }

  query(url?: string, limit: number = 100): any[] {
    let stmt

    if (url) {
      stmt = this.db.prepare(`
        SELECT * FROM scrape_results 
        WHERE url = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `)
      return stmt.all(url, limit) as any[]
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM scrape_results 
        ORDER BY timestamp DESC 
        LIMIT ?
      `)
      return stmt.all(limit) as any[]
    }
  }

  deleteOld(maxAge: number = 86400000): void {
    const cutoff = Date.now() - maxAge
    const stmt = this.db.prepare('DELETE FROM scrape_results WHERE timestamp < ?')
    const result = stmt.run(Math.floor(cutoff / 1000))
    logger.info(`[database] Deleted ${result.changes} old records`)
  }

  createTable(tableName: string, schema: Record<string, string>): void {
    const columns = Object.entries(schema)
      .map(([name, type]) => `${name} ${type}`)
      .join(', ')

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ${columns},
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `)

    logger.info(`[database] Created table: ${tableName}`)
  }

  insertIntoTable(tableName: string, data: Record<string, any>): void {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')

    const stmt = this.db.prepare(`
      INSERT INTO ${tableName} (${keys.join(', ')})
      VALUES (${placeholders})
    `)

    stmt.run(...values)
  }

  close(): void {
    this.db.close()
    logger.info('[database] Database closed')
  }

  vacuum(): void {
    this.db.exec('VACUUM')
    logger.info('[database] Database vacuumed')
  }
}
