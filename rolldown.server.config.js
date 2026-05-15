import { defineConfig } from 'rolldown'
import pkg from './package.json' with { type: 'json' }

const external = new RegExp(
  `^(node:|${[
    ...Object.getOwnPropertyNames(
      pkg.devDependencies ? pkg.devDependencies : []
    ),
    ...Object.getOwnPropertyNames(pkg.dependencies ? pkg.dependencies : [])
  ].join('|')})`
)

export default defineConfig({
  input: './src/server/start.ts',
  output: [{ file: 'dist/server/index.js', format: 'es', minify: true }],
  platform: 'node',
  external
})
