#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('Firekid Scraper - Pre-start Setup\n')

// Create necessary directories
const directories = [
  'data',
  'patterns',
  'sessions',
  'history',
  'output',
  'downloads',
  'logs',
  'commands',
  'instructions',
  'plugins/scraping',
  'plugins/actions',
  'plugins/extractors',
  'plugins/filters',
  'plugins/outputs',
  'plugins/parsers'
]

directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`Created directory: ${dir}`)
  }
})

// Create .env if it doesn't exist
const envPath = path.join(process.cwd(), '.env')
const envExamplePath = path.join(process.cwd(), '.env.example')

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath)
  console.log('Created .env from .env.example')
}

console.log('\nSetup complete!')
console.log('Run "npm start" or "firekid-scraper" to begin\n')
