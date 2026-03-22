#!/usr/bin/env node

import { Command } from 'commander'
import { intro, outro, text, select, confirm, spinner } from '@clack/prompts'
import { FirekidScraper } from '../src/core/scraper.js'
import { ActionRecorder } from '../src/recorder/recorder.js'
import { logger } from '../src/logger/logger.js'
import { readFileSync } from 'fs'
import { join } from 'path'

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
)

const program = new Command()

program
  .name('firekid-scraper')
  .description('The most advanced web scraping machine ever built')
  .version(packageJson.version)

program
  .option('-u, --url <url>', 'URL to scrape')
  .option('-m, --mode <mode>', 'Scraping mode (auto, downloader, scrape, navigator)')
  .option('--cmd <file>', 'Run command file')
  .option('--record', 'Record browser actions')
  .option('--auto', 'Use intelligent auto mode')
  .option('--headless', 'Run in headless mode')
  .option('--server', 'Start API server')
  .option('-p, --port <port>', 'API server port', '3000')

program.parse()

const options = program.opts()

async function main() {
  intro('Firekid Scraper')

  if (options.server) {
    const { startServer } = await import('../src/server/app.js')
    await startServer(parseInt(options.port, 10))
    return
  }

  const scraper = new FirekidScraper({
    headless: options.headless !== false
  })

  if (options.record) {
    const url = options.url || await text({
      message: 'Enter URL to record:',
      placeholder: 'https://example.com'
    }) as string

    const s = spinner()
    s.start('Starting recorder...')

    const recorder = new ActionRecorder()
    await recorder.startRecording(url)

    s.stop('Recording complete!')
    outro('Command file generated')
    return
  }

  if (options.cmd) {
    const s = spinner()
    s.start(`Running command file: ${options.cmd}`)

    await scraper.runCommandFile(options.cmd)

    s.stop('Execution complete!')
    outro('Done')
    return
  }

  if (options.auto || options.url) {
    const url = options.url || await text({
      message: 'Enter URL to scrape:',
      placeholder: 'https://example.com'
    }) as string

    const s = spinner()
    s.start('Scraping...')

    const result = await scraper.auto(url as string)

    s.stop('Scraping complete!')
    console.log('\nResults:', result)
    outro('Done')
    return
  }

  const action = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'auto', label: 'Auto scrape a URL' },
      { value: 'record', label: 'Record browser actions' },
      { value: 'command', label: 'Run command file' },
      { value: 'server', label: 'Start API server' }
    ]
  })

  if (action === 'auto') {
    const url = await text({
      message: 'Enter URL:',
      placeholder: 'https://example.com'
    })

    const s = spinner()
    s.start('Scraping...')

    const result = await scraper.auto(url as string)

    s.stop('Complete!')
    console.log('\nResults:', result)
  } else if (action === 'record') {
    const url = await text({
      message: 'Enter URL to record:',
      placeholder: 'https://example.com'
    })

    const recorder = new ActionRecorder()
    await recorder.startRecording(url as string)
  } else if (action === 'command') {
    const file = await text({
      message: 'Enter command file path:',
      placeholder: 'commands/mysite.cmd'
    })

    await scraper.runCommandFile(file as string)
  } else if (action === 'server') {
    const port = await text({
      message: 'Enter port:',
      placeholder: '3000'
    })

    const { startServer } = await import('../src/server/app.js')
    await startServer(parseInt(port as string, 10))
  }

  outro('Done')
}

main().catch((err) => {
  logger.error('CLI error:', err)
  process.exit(1)
})
