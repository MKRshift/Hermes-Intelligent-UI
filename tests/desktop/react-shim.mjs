import { createRequire } from 'node:module'

const require = createRequire(new URL('../../official/package.json', import.meta.url))
const React = require('react')
const runtime = require('react/jsx-runtime')

export const reactExports = useState => ({ ...React, default: React, useState })
export const jsxExports = jsx => ({ ...runtime, jsx, jsxs: jsx })
