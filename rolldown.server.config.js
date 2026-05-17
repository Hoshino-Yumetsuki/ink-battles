import { defineConfig } from 'rolldown'
import pkg from './package.json' with { type: 'json' }

const external = new RegExp(
  `^(node:|${[...Object.getOwnPropertyNames(pkg.devDependencies ? pkg.devDependencies : []), ...Object.getOwnPropertyNames(pkg.dependencies ? pkg.dependencies : [])].join('|')})`
)

const config = {
  input: './src/server/index.ts'
}

export default defineConfig([
  {
    ...config,
    output: [{ file: 'dist/server/index.js', format: 'es', minify: true }],
    external
  }
])
