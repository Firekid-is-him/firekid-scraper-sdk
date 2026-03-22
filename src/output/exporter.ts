import fs from 'fs'
import path from 'path'
import { logger } from '../logger/logger.js'

export class DataExporter {
  async toJSON(data: any, filePath: string): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    logger.info(`[exporter] Exported to JSON: ${filePath}`)
  }

  async toCSV(data: any[], filePath: string): Promise<void> {
    if (data.length === 0) {
      logger.warn('[exporter] No data to export to CSV')
      return
    }

    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const headers = Object.keys(data[0])
    const rows = data.map(item => 
      headers.map(header => {
        const value = item[header]
        if (value === null || value === undefined) return ''
        const str = String(value)
        return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str
      }).join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')

    fs.writeFileSync(filePath, csv)
    logger.info(`[exporter] Exported to CSV: ${filePath}`)
  }

  async toTXT(data: any, filePath: string): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)

    fs.writeFileSync(filePath, text)
    logger.info(`[exporter] Exported to TXT: ${filePath}`)
  }

  async toHTML(data: any, filePath: string, template?: string): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    let html = template || `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Scraped Data</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h1>Scraped Data</h1>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>
    `

    fs.writeFileSync(filePath, html)
    logger.info(`[exporter] Exported to HTML: ${filePath}`)
  }

  async toMarkdown(data: any[], filePath: string): Promise<void> {
    if (data.length === 0) {
      logger.warn('[exporter] No data to export to Markdown')
      return
    }

    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const headers = Object.keys(data[0])
    const headerRow = `| ${headers.join(' | ')} |`
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`
    
    const dataRows = data.map(item => 
      `| ${headers.map(h => item[h] || '').join(' | ')} |`
    )

    const markdown = [headerRow, separatorRow, ...dataRows].join('\n')

    fs.writeFileSync(filePath, markdown)
    logger.info(`[exporter] Exported to Markdown: ${filePath}`)
  }

  async appendToFile(data: any, filePath: string): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const line = typeof data === 'string' ? data : JSON.stringify(data)
    fs.appendFileSync(filePath, line + '\n')
  }
}
