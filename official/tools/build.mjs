import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const official = fileURLToPath(new URL('../', import.meta.url))
const bundledPackages = ['@openuidev/react-lang', '@openuidev/lang-core', '@openuidev/observability', 'zod', 'lucide-react']
const notices = bundledPackages.map(name =>
  name + '\n' + readFileSync(new URL(`../node_modules/${name}/LICENSE`, import.meta.url), 'utf8').trim()
)
await build({
  absWorkingDir: official,
  entryPoints: ['src/entry.js'],
  nodePaths: [fileURLToPath(new URL('../node_modules', import.meta.url))],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  external: ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime'],
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.css': 'text' },
  legalComments: 'eof',
  footer: { js: '/*! Bundled dependency licenses\n' + notices.join('\n\n').replaceAll('*/', '* /') + '\n*/' },
  minifyWhitespace: true,
  minifySyntax: true,
  banner: { js: '// Generated from official/src. Run npm run build in official/.' },
  outfile: 'plugin.js'
})
