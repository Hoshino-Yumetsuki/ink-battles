import createNextJsObfuscator from 'nextjs-obfuscator'

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,
  debugProtection: true,
  debugProtectionInterval: 4000,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: true,
  renameGlobals: false,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 5,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 5,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 1,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  SourceMapMode: false
}

const pluginOptions = {
  enabled: true
}

const withNextJsObfuscator = createNextJsObfuscator(
  obfuscatorOptions,
  pluginOptions
)

const nextConfig = withNextJsObfuscator({})

export default nextConfig
