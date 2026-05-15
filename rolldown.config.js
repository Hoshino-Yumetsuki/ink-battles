import { defineConfig } from 'rolldown'
import pkg from './package.json' with { type: 'json' }

const external = new RegExp(
  `^(node:|${[...Object.getOwnPropertyNames(pkg.devDependencies ? pkg.devDependencies : []), ...Object.getOwnPropertyNames(pkg.dependencies ? pkg.dependencies : [])].join('|')})`
)

const config = {
  input: './src/worker/index.ts'
}

export default defineConfig([
  {
    ...config,
    output: [{ file: 'dist/worker/index.js', format: 'es', minify: true }],
    external
  }
])
