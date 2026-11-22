import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { glob } from 'glob'
import type { Plugin } from '../types.js'
import { logger } from '../logger/logger.js'

const PLUGIN_SUFFIXES = ['plu', 'act', 'ext', 'flt', 'out', 'prs']
const PLUGIN_TYPES: Plugin['type'][] = ['scraping', 'action', 'extractor', 'filter', 'output', 'parser']

function isPlugin(value: any): value is Plugin {
  return Boolean(
    value
    && typeof value.name === 'string' && value.name
    && typeof value.type === 'string' && PLUGIN_TYPES.includes(value.type)
    && typeof value.execute === 'function'
  )
}

export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map()
  private pluginDirs: string[] = [path.resolve('./plugins')]

  addPluginDirectory(dir: string): void {
    const resolved = path.resolve(dir)

    if (!this.pluginDirs.includes(resolved)) {
      this.pluginDirs.push(resolved)
      logger.info(`[plugin-loader] Added plugin directory: ${resolved}`)
    }
  }

  async loadAll(): Promise<void> {
    logger.info('[plugin-loader] Loading all plugins...')

    for (const dir of this.pluginDirs) {
      if (!fs.existsSync(dir)) continue

      const files = await glob(`**/*.{${PLUGIN_SUFFIXES.join(',')}}.js`, {
        cwd: dir,
        absolute: true,
        nodir: true
      })

      for (const file of files.sort()) {
        await this.loadPlugin(file)
      }
    }

    logger.info(`[plugin-loader] Loaded ${this.plugins.size} plugins`)
  }

  async loadPlugin(filePath: string, options: { throwOnError?: boolean } = {}): Promise<void> {
    const absolute = path.resolve(filePath)

    try {
      const stat = fs.statSync(absolute)
      const version = Math.floor(stat.mtimeMs)
      const module = await import(`${pathToFileURL(absolute).href}?mtime=${version}`)
      const plugin: Plugin = module.default

      if (!isPlugin(plugin)) {
        throw new Error('default export is not a valid plugin (needs name, type and execute)')
      }

      if (this.plugins.has(plugin.name)) {
        logger.warn(`[plugin-loader] Replacing plugin with the same name: ${plugin.name}`)
      }

      this.plugins.set(plugin.name, plugin)
      logger.info(`[plugin-loader] Loaded plugin: ${plugin.name} (${plugin.type})`)
    } catch (err: any) {
      logger.error(`[plugin-loader] Failed to load ${absolute}: ${err.message}`)

      if (options.throwOnError) {
        throw new Error(`Failed to load plugin ${absolute}: ${err.message}`)
      }
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }

  getPluginsByType(type: Plugin['type']): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.type === type)
  }

  async executePlugin(name: string, context: any): Promise<any> {
    const plugin = this.plugins.get(name)

    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`)
    }

    logger.info(`[plugin-loader] Executing plugin: ${name}`)
    return await plugin.execute(context)
  }

  listPlugins(): Array<{ name: string; type: string; version: string }> {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      type: p.type,
      version: p.version
    }))
  }

  unloadPlugin(name: string): void {
    if (this.plugins.delete(name)) {
      logger.info(`[plugin-loader] Unloaded plugin: ${name}`)
    }
  }

  reload(): Promise<void> {
    this.plugins.clear()
    return this.loadAll()
  }
}
