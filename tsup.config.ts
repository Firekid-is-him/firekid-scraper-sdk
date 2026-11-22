import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'bin/firekid-scraper': 'bin/firekid-scraper.ts'
  },
  format: ['cjs', 'esm'],
  dts: { entry: { index: 'src/index.ts' } },
  sourcemap: false,
  clean: true,
  splitting: false,
  minify: false,
  shims: true,
  skipNodeModulesBundle: true,
  target: 'node20'
})
