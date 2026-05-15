import nodePolyfills from '@rolldown/plugin-node-polyfills'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const nodePolyfillIds = [
  'buffer',
  'events',
  'process',
  'stream',
  'string_decoder',
  'util'
]

const nodePolyfillResolvePlugin = {
  name: 'node-polyfill-resolve',
  enforce: 'pre' as const,
  resolveId(id: string) {
    const importId = id.startsWith('node:') ? id.slice(5) : id

    if (!nodePolyfillIds.includes(importId)) {
      return null
    }

    return {
      id: `\0polyfill-node.${importId}.js`,
      moduleSideEffects: false
    }
  }
}

export default defineConfig({
  plugins: [nodePolyfillResolvePlugin, react(), nodePolyfills()],
  build: {
    outDir: 'dist/client',
    rolldownOptions: {
      plugins: [nodePolyfills()]
    }
  },
  optimizeDeps: {
    rolldownOptions: {
      plugins: [nodePolyfills()]
    }
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': '/src'
    }
  }
})
