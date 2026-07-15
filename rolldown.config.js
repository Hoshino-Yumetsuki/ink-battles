import { defineConfig } from 'rolldown'
import pkg from './package.json' with { type: 'json' }

const external = new RegExp(
  `^(node:|${[...Object.getOwnPropertyNames(pkg.devDependencies ? pkg.devDependencies : []), ...Object.getOwnPropertyNames(pkg.dependencies ? pkg.dependencies : [])].join('|')})`
)

export default defineConfig([
  {
    input: {
      index: './src/worker/index.ts',
      app: './src/worker/app.ts'
    },
    output: {
      dir: 'dist/worker',
      format: 'es',
      minify: true,
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name]-[hash].js'
    },
    external
  }
])