import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'bin/firekid-scraper': 'bin/firekid-scraper.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  shims: true,
  skipNodeModulesBundle: true,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js'
    }
  },
  esbuildOptions(options) {
    options.banner = {
      js: format === 'cjs' 
        ? '' 
        : '#!/usr/bin/env node\n'
    }
  }
})
