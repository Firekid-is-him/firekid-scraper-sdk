import Database from 'better-sqlite3'
import type { SitePattern } from '../types.js'
import { logger } from '../logger/logger.js'
import { config } from '../config.js'
import path from 'path'
import fs from 'fs'

export class PatternCache {
  private db: Database.Database

  constructor() {
    const dbPath = config.storage.patternsDb
    const dir = path.dirname(dbPath)
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.initialize()
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site TEXT NOT NULL,
        type TEXT NOT NULL,
        selectors TEXT NOT NULL,
        flow TEXT NOT NULL,
        success_rate REAL DEFAULT 1.0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `)

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_site ON patterns(site)
    `)

    logger.info('[pattern-cache] Database initialized')
  }

  save(site: string, pattern: SitePattern): void {
    const stmt = this.db.prepare(`
      INSERT INTO patterns (site, type, selectors, flow, success_rate)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(
      site,
      pattern.type,
      JSON.stringify(pattern.selectors),
      JSON.stringify(pattern.flow),
      pattern.successRate
    )

    logger.info(`[pattern-cache] Saved pattern for ${site}`)
  }

  load(site: string): SitePattern | null {
    const stmt = this.db.prepare(`
      SELECT * FROM patterns 
      WHERE site = ? 
      ORDER BY success_rate DESC, updated_at DESC 
      LIMIT 1
    `)

    const row = stmt.get(site) as any

    if (!row) return null

    return {
      type: row.type,
      selectors: JSON.parse(row.selectors),
      flow: JSON.parse(row.flow),
      successRate: row.success_rate
    }
  }

  updateSuccessRate(site: string, success: boolean): void {
    const current = this.load(site)
    if (!current) return

    const newRate = success 
      ? Math.min(1.0, current.successRate + 0.1)
      : Math.max(0.1, current.successRate - 0.1)

    const stmt = this.db.prepare(`
      UPDATE patterns 
      SET success_rate = ?, updated_at = strftime('%s', 'now')
      WHERE site = ?
    `)

    stmt.run(newRate, site)

    logger.info(`[pattern-cache] Updated success rate for ${site}: ${newRate}`)
  }

  listAll(): Array<{ site: string; pattern: SitePattern }> {
    const stmt = this.db.prepare(`
      SELECT * FROM patterns 
      ORDER BY success_rate DESC
    `)

    const rows = stmt.all() as any[]

    return rows.map(row => ({
      site: row.site,
      pattern: {
        type: row.type,
        selectors: JSON.parse(row.selectors),
        flow: JSON.parse(row.flow),
        successRate: row.success_rate
      }
    }))
  }

  clear(): void {
    this.db.exec('DELETE FROM patterns')
    logger.info('[pattern-cache] Cleared all patterns')
  }

  close(): void {
    this.db.close()
  }
}
