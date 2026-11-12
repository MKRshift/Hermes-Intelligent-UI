import { jsx } from 'react/jsx-runtime'
import { clean, empty, hash } from './shared.js'
import { getWidget } from './widgets.js'
import { LayoutWidget } from './layout-view.js'

function renderDirective({ attrs = {}, sessionId }) {
  if (Object.keys(attrs).length > 26) return empty('Invalid Intelligent UI component.')
  const kind = clean(attrs.kind, 20).toLowerCase()
  const Widget = kind === 'layout' ? LayoutWidget : getWidget(kind)
  if (!Widget) return empty('Unsupported Intelligent UI component: ' + kind)
  const key = kind === 'layout' ? hash(attrs.tree || '') : kind === 'recipe' ? hash(JSON.stringify(attrs)) : undefined
  return jsx(Widget, { attrs, sessionId }, key)
}

export { renderDirective }
