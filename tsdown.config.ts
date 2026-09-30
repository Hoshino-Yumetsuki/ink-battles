import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/server/index.ts"],
  outDir: "dist/server",
  format: ["esm"],
  outExtensions: () => ({ js: ".js" }),
  platform: "node",
  tsconfig: "tsconfig.json",
  clean: true,
  minify: true,
  deps: {
    neverBundle: true
  }
})
