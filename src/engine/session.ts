import Database from 'better-sqlite3'
import type { Session } from '../types.js'
import { logger } from '../logger/logger.js'
import { config } from '../config.js'
import path from 'path'
import fs from 'fs'

export class SessionManager {
  private db: Database.Database

  constructor() {
    const dbPath = config.storage.sessionsDb
    const dir = path.dirname(dbPath)
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.initialize()
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        cookies TEXT NOT NULL,
        local_storage TEXT,
        session_storage TEXT,
        fingerprint TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `)

    logger.info('[session-manager] Database initialized')
  }

  save(session: Session): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions 
      (id, url, cookies, local_storage, session_storage, fingerprint, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      session.id,
      session.url,
      JSON.stringify(session.cookies),
      JSON.stringify(session.localStorage),
      JSON.stringify(session.sessionStorage),
      JSON.stringify(session.fingerprint),
      session.timestamp
    )

    logger.info(`[session-manager] Saved session: ${session.id}`)
  }

  load(id: string): Session | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?')
    const row = stmt.get(id) as any

    if (!row) return null

    return {
      id: row.id,
      url: row.url,
      cookies: JSON.parse(row.cookies),
      localStorage: JSON.parse(row.local_storage),
      sessionStorage: JSON.parse(row.session_storage),
      fingerprint: JSON.parse(row.fingerprint),
      timestamp: row.timestamp
    }
  }

  loadByUrl(url: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      WHERE url = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `)
    
    const row = stmt.get(url) as any

    if (!row) return null

    return {
      id: row.id,
      url: row.url,
      cookies: JSON.parse(row.cookies),
      localStorage: JSON.parse(row.local_storage),
      sessionStorage: JSON.parse(row.session_storage),
      fingerprint: JSON.parse(row.fingerprint),
      timestamp: row.timestamp
    }
  }

  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?')
    stmt.run(id)
    logger.info(`[session-manager] Deleted session: ${id}`)
  }

  listAll(): Session[] {
    const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY timestamp DESC')
    const rows = stmt.all() as any[]

    return rows.map(row => ({
      id: row.id,
      url: row.url,
      cookies: JSON.parse(row.cookies),
      localStorage: JSON.parse(row.local_storage),
      sessionStorage: JSON.parse(row.session_storage),
      fingerprint: JSON.parse(row.fingerprint),
      timestamp: row.timestamp
    }))
  }

  clearOld(maxAge: number = 86400000): void {
    const cutoff = Date.now() - maxAge
    const stmt = this.db.prepare('DELETE FROM sessions WHERE timestamp < ?')
    const result = stmt.run(Math.floor(cutoff / 1000))
    logger.info(`[session-manager] Cleared ${result.changes} old sessions`)
  }

  close(): void {
    this.db.close()
  }
}
