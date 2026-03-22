import fs from 'fs'
import path from 'path'
import { glob } from 'glob'
import type { Plugin } from '../types.js'
import { logger } from '../logger/logger.js'

export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map()
  private pluginDirs: string[] = ['./plugins']

  addPluginDirectory(dir: string): void {
    if (!this.pluginDirs.includes(dir)) {
      this.pluginDirs.push(dir)
      logger.info(`[plugin-loader] Added plugin directory: ${dir}`)
    }
  }

  async loadAll(): Promise<void> {
    logger.info('[plugin-loader] Loading all plugins...')

    for (const dir of this.pluginDirs) {
      if (!fs.existsSync(dir)) continue

      const patterns = [
        `${dir}/**/*.plu.js`,
        `${dir}/**/*.act.js`,
        `${dir}/**/*.ext.js`,
        `${dir}/**/*.flt.js`,
        `${dir}/**/*.out.js`,
        `${dir}/**/*.prs.js`
      ]

      for (const pattern of patterns) {
        const files = await glob(pattern)

        for (const file of files) {
          await this.loadPlugin(file)
        }
      }
    }

    logger.info(`[plugin-loader] Loaded ${this.plugins.size} plugins`)
  }

  async loadPlugin(filePath: string): Promise<void> {
    try {
      const module = await import(filePath)
      const plugin: Plugin = module.default

      if (!plugin.name || !plugin.type || !plugin.execute) {
        logger.warn(`[plugin-loader] Invalid plugin: ${filePath}`)
        return
      }

      this.plugins.set(plugin.name, plugin)
      logger.info(`[plugin-loader] Loaded plugin: ${plugin.name} (${plugin.type})`)
    } catch (err: any) {
      logger.error(`[plugin-loader] Failed to load ${filePath}: ${err.message}`)
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
