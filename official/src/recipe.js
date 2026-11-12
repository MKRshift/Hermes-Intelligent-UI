import { jsx, jsxs } from 'react/jsx-runtime'
import { useState } from 'react'
import { clean, parts, fnum, BORDER, sub, btn, titleCss, rowCss, shell, empty } from './shared.js'

function parseRecipe(attrs) {
  const base = Number(attrs.servings)
  const rows = clean(attrs.ingredients, 1350).split(';').filter(row => row.trim())
  const steps = parts(attrs.steps, '|', 12, 260)
  if (!Number.isInteger(base) || base < 1 || base > 100 || rows.length < 1 || rows.length > 20 || !steps.length) return null
  const ingredients = []
  for (const row of rows) {
    const cells = row.split('|').map(cell => cell.trim())
    if (cells.length !== 3 || !/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(cells[0]) || !cells[2]) return null
    const amount = Number(cells[0].replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return null
    ingredients.push({ amount, unit: clean(cells[1], 24), name: clean(cells[2], 100) })
  }
  return { base, ingredients, steps }
}

function RecipeWidget({ attrs }) {
  const recipe = parseRecipe(attrs)
  const [servings, setServings] = useState(() => recipe?.base ?? 1)
  const [checked, setChecked] = useState({})
  if (!recipe) return shell(attrs, empty('The recipe could not be read. Ask Hermes to regenerate the interactive recipe.'), 'Interactive recipe')
  const tick = key => setChecked(current => ({ ...current, [key]: !current[key] }))
  const servingsButton = (delta, label) => jsx('button', {
    type: 'button', 'aria-label': label, style: btn, disabled: servings + delta < 1 || servings + delta > 100,
    onClick: () => setServings(current => Math.min(100, Math.max(1, current + delta))), children: delta < 0 ? '−' : '+'
  })
  const checkRow = (key, text, amount) => jsxs('label', {
    style: { display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'start', gap: 9, padding: '7px 0', borderBottom: `1px solid ${BORDER}` },
    children: [
      jsx('input', { type: 'checkbox', checked: Boolean(checked[key]), onChange: () => tick(key) }),
      jsx('span', { style: { textDecoration: checked[key] ? 'line-through' : undefined, overflowWrap: 'anywhere' }, children: text }),
      amount && jsx('strong', { style: { fontVariantNumeric: 'tabular-nums' }, children: amount })
    ]
  }, key)
  return shell(attrs, jsxs('div', { style: { display: 'grid', gap: 14 }, children: [
    jsxs('div', { style: rowCss, children: [
      servingsButton(-1, 'Decrease servings'),
      jsx('output', { 'aria-live': 'polite', style: { minWidth: 70, textAlign: 'center', fontWeight: 650 }, children: `${servings} servings` }),
      servingsButton(1, 'Increase servings'),
      jsx('button', { type: 'button', style: btn, onClick: () => { setServings(recipe.base); setChecked({}) }, children: 'Reset recipe' })
    ] }),
    jsx('div', { style: sub, children: 'Ingredient amounts scale. Check off ingredients and steps as you go.' }),
    jsxs('div', { children: [jsx('h4', { style: titleCss, children: 'Ingredients' }),
      recipe.ingredients.map(({ name, amount, unit }, i) => checkRow(`ingredient-${i}`, name, [fnum(amount * servings / recipe.base), unit].filter(Boolean).join(' ')))
    ] }),
    jsxs('div', { children: [jsx('h4', { style: titleCss, children: 'Method' }),
      recipe.steps.map((step, i) => checkRow(`step-${i}`, `${i + 1}. ${step}`))
    ] })
  ] }), 'Interactive recipe')
}

export { RecipeWidget }
