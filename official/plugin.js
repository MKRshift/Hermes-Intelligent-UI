// Generated from official/src. Run npm run build in official/.

// src/entry.js
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
import * as sdk from "@hermes/plugin-sdk";

// src/shared.js
import { jsx, jsxs } from "react/jsx-runtime";
import { host } from "@hermes/plugin-sdk";
var pluginContext = null;
function setPluginContext(ctx) {
  pluginContext = ctx;
}
function clean(value, limit = 220) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").trim().slice(0, limit) : "";
}
function cleanInput(value, limit = 240) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, (ch) => ch === "\n" ? "\n" : ch === "	" ? " " : ch === "\r" ? "" : " ").slice(0, limit) : "";
}
function parts(value, delimiter = "|", count = 12, limit = 160) {
  return clean(value, 6500).split(delimiter).slice(0, count).map((s) => clean(s, limit)).filter(Boolean);
}
function number(value, fallback = 0) {
  if (value === void 0 || value === null || String(value).trim() === "") return fallback;
  const n = Number(String(value).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.max(-1e12, Math.min(1e12, n)) : fallback;
}
function fnum(n) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat(void 0, { maximumFractionDigits: 2 }).format(n);
}
function hash(value) {
  let x = 2166136261;
  for (let i = 0; i < value.length; i++) x = Math.imul(x ^ value.charCodeAt(i), 16777619);
  return (x >>> 0).toString(36);
}
var COLOR = "var(--ui-text-primary)";
var MUTED = "var(--ui-text-secondary)";
var ACCENT = "var(--ui-accent)";
var BORDER = "var(--ui-stroke-secondary)";
var RADIUS = 14;
var panel = {
  border: `1px solid ${BORDER}`,
  borderRadius: RADIUS,
  padding: "14px 16px",
  margin: "10px 0 14px",
  width: "100%",
  maxWidth: 820,
  boxSizing: "border-box",
  color: COLOR,
  background: "color-mix(in srgb, var(--ui-text-primary) 3%, transparent)",
  fontSize: 13,
  lineHeight: 1.5,
  overflow: "hidden"
};
var sub = { color: MUTED, fontSize: 12 };
var btn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "6px 10px",
  font: "inherit",
  color: COLOR,
  cursor: "pointer",
  background: "transparent",
  maxWidth: "100%",
  textAlign: "left"
};
var titleCss = { fontSize: 13, fontWeight: 650, letterSpacing: "-0.012em", marginBottom: 9 };
var rowCss = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
function header(attrs, fallback) {
  return jsx("div", { style: titleCss, children: clean(attrs.title, 130) || fallback });
}
function shell(attrs, body, fallback = "Interactive UI") {
  const embedded = attrs._nested === "1";
  return jsxs("section", {
    style: embedded ? { ...panel, margin: 0, maxWidth: "none", padding: "10px 11px", height: "100%" } : panel,
    "aria-label": clean(attrs.title, 100) || fallback,
    children: [
      header(attrs, fallback),
      body,
      (attrs.source || attrs.sample === "true") && jsx("div", {
        style: { ...sub, marginTop: 12, paddingTop: 8, borderTop: `1px solid ${BORDER}` },
        children: attrs.sample === "true" ? "Illustrative values \xB7 not live data" : `Source: ${clean(attrs.source, 160)}`
      })
    ]
  });
}
function empty(text) {
  return jsx("div", { style: sub, children: text });
}
function pill(text, key) {
  return jsx("span", { key, style: { ...sub, border: `1px solid ${BORDER}`, borderRadius: 100, padding: "2px 9px" }, children: text });
}
function safeExternalUrl(value) {
  const s = clean(value, 1e3);
  if (/^https?:\/\/[^\s/@?#]+(?:\.[^\s/@?#]+|:\d+)(?:[/?#][^\s]*)?$/i.test(s)) return s;
  return null;
}
function toGap(raw, defaultGap = 10) {
  return Math.max(0, Math.min(32, number(raw, defaultGap)));
}
function insertIntoChat(sessionId, text) {
  const message = clean(text, 500);
  if (!message) return Promise.resolve(false);
  try {
    return Promise.resolve(host.composer.insertText(sessionId ?? null, message, { mode: "block" })).then((ok) => {
      if (!ok) host.notify({ kind: "warning", message: "Open the source chat to add this to its composer." });
      return ok;
    }, () => {
      host.notify({ kind: "error", message: "Could not insert the selected text." });
      return false;
    });
  } catch {
    host.notify({ kind: "error", message: "Could not insert the selected text." });
    return Promise.resolve(false);
  }
}

// src/widgets.js
import { jsx as jsx5 } from "react/jsx-runtime";

// src/recipe.js
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
import { useState } from "react";
function parseRecipe(attrs) {
  const base = Number(attrs.servings);
  const rows = clean(attrs.ingredients, 1350).split(";").filter((row) => row.trim());
  const steps = parts(attrs.steps, "|", 12, 260);
  if (!Number.isInteger(base) || base < 1 || base > 100 || rows.length < 1 || rows.length > 20 || !steps.length) return null;
  const ingredients = [];
  for (const row of rows) {
    const cells = row.split("|").map((cell) => cell.trim());
    if (cells.length !== 3 || !/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(cells[0]) || !cells[2]) return null;
    const amount = Number(cells[0].replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e5) return null;
    ingredients.push({ amount, unit: clean(cells[1], 24), name: clean(cells[2], 100) });
  }
  return { base, ingredients, steps };
}
function RecipeWidget({ attrs }) {
  const recipe = parseRecipe(attrs);
  const [servings, setServings] = useState(() => recipe?.base ?? 1);
  const [checked, setChecked] = useState({});
  if (!recipe) return shell(attrs, empty("The recipe could not be read. Ask Hermes to regenerate the interactive recipe."), "Interactive recipe");
  const tick = (key) => setChecked((current) => ({ ...current, [key]: !current[key] }));
  const servingsButton = (delta, label) => jsx2("button", {
    type: "button",
    "aria-label": label,
    style: btn,
    disabled: servings + delta < 1 || servings + delta > 100,
    onClick: () => setServings((current) => Math.min(100, Math.max(1, current + delta))),
    children: delta < 0 ? "\u2212" : "+"
  });
  const checkRow = (key, text, amount) => jsxs2("label", {
    style: { display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "start", gap: 9, padding: "7px 0", borderBottom: `1px solid ${BORDER}` },
    children: [
      jsx2("input", { type: "checkbox", checked: Boolean(checked[key]), onChange: () => tick(key) }),
      jsx2("span", { style: { textDecoration: checked[key] ? "line-through" : void 0, overflowWrap: "anywhere" }, children: text }),
      amount && jsx2("strong", { style: { fontVariantNumeric: "tabular-nums" }, children: amount })
    ]
  }, key);
  return shell(attrs, jsxs2("div", { style: { display: "grid", gap: 14 }, children: [
    jsxs2("div", { style: rowCss, children: [
      servingsButton(-1, "Decrease servings"),
      jsx2("output", { "aria-live": "polite", style: { minWidth: 70, textAlign: "center", fontWeight: 650 }, children: `${servings} servings` }),
      servingsButton(1, "Increase servings"),
      jsx2("button", { type: "button", style: btn, onClick: () => {
        setServings(recipe.base);
        setChecked({});
      }, children: "Reset recipe" })
    ] }),
    jsx2("div", { style: sub, children: "Ingredient amounts scale. Check off ingredients and steps as you go." }),
    jsxs2("div", { children: [
      jsx2("h4", { style: titleCss, children: "Ingredients" }),
      recipe.ingredients.map(({ name, amount, unit }, i) => checkRow(`ingredient-${i}`, name, [fnum(amount * servings / recipe.base), unit].filter(Boolean).join(" ")))
    ] }),
    jsxs2("div", { children: [
      jsx2("h4", { style: titleCss, children: "Method" }),
      recipe.steps.map((step, i) => checkRow(`step-${i}`, `${i + 1}. ${step}`))
    ] })
  ] }), "Interactive recipe");
}

// src/data-widgets.js
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
import { useState as useState2 } from "react";
import { host as host2 } from "@hermes/plugin-sdk";

// src/arithmetic.js
function validNumeric2(s) {
  const v = String(s ?? "").trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,2})?$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= 1e12 ? n : null;
}
function safeFormula(expr, vars = {}) {
  if (typeof expr !== "string" || !expr.trim() || expr.length > 240) return { ok: false, error: "Missing or oversized expression" };
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i])) {
      i++;
      continue;
    }
    const m = /^(?:[A-Za-z_][A-Za-z_0-9]*|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[()+\-*/^])/.exec(expr.slice(i));
    if (!m) return { ok: false, error: "Unsupported expression character" };
    tokens.push(m[0]);
    i += m[0].length;
    if (tokens.length > 100) return { ok: false, error: "Expression is too complex" };
  }
  let at = 0, level = 0, ops = 0;
  const peek = () => tokens[at];
  const take = () => tokens[at++];
  const guard = (v) => {
    if (++ops > 120 || !Number.isFinite(v) || Math.abs(v) > 1e12) throw Error("Calculation is out of range");
    return v;
  };
  function atom2() {
    if (++level > 16) throw Error("Expression is too deeply nested");
    let v, t = take();
    if (t === "(") {
      v = add();
      if (take() !== ")") throw Error("Unclosed parentheses");
    } else if (t === "-" || t === "+") {
      v = (t === "-" ? -1 : 1) * atom2();
    } else if (t && /^[A-Za-z_]/.test(t)) {
      if (!Object.prototype.hasOwnProperty.call(vars, t) || !Number.isFinite(vars[t])) throw Error(`Unknown input: ${t}`);
      v = vars[t];
    } else {
      v = validNumeric2(t);
      if (v === null) throw Error("Invalid number or expression");
    }
    level--;
    return guard(v);
  }
  function power() {
    let v = atom2();
    if (peek() === "^") {
      take();
      const e = power();
      if (Math.abs(e) > 12) throw Error("Exponent is too large");
      v = guard(v ** e);
    }
    return v;
  }
  function mul() {
    let v = power();
    while (peek() === "*" || peek() === "/") {
      const op = take(), b = power();
      if (op === "/" && b === 0) throw Error("Cannot divide by zero");
      v = guard(op === "*" ? v * b : v / b);
    }
    return v;
  }
  function add() {
    let v = mul();
    while (peek() === "+" || peek() === "-") {
      const op = take(), b = mul();
      v = guard(op === "+" ? v + b : v - b);
    }
    return v;
  }
  try {
    const value = add();
    if (at !== tokens.length) throw Error("Unexpected expression token");
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: clean(e?.message || "Invalid expression", 120) };
  }
}
function parseCalcInputs(src) {
  return clean(src, 1300).split("|").slice(0, 6).map((item) => {
    const [name, def, lo, hi, step] = item.split(":");
    if (!/^[a-zA-Z][a-zA-Z_0-9]{0,20}$/.test(name || "")) return null;
    const [d, min, max, st] = [def, lo, hi, step].map(validNumeric2);
    if ([d, min, max, st].some((x) => x === null) || min >= max || st <= 0) return null;
    return { name, min, max, step: st, value: Math.min(max, Math.max(min, d)) };
  }).filter(Boolean).filter((v, i, all) => all.findIndex((x) => x.name === v.name) === i);
}

// src/data-widgets.js
function StatWidget({ attrs }) {
  const labels = parts(attrs.labels || attrs.label, "|", 6, 65);
  const values = parts(attrs.values || attrs.value, "|", 6, 80);
  const details = parts(attrs.details || attrs.detail, "|", 6, 100);
  return shell(attrs, jsx3("div", {
    style: { display: "grid", gridTemplateColumns: `repeat(${Math.max(1, Math.min(3, values.length))},minmax(0,1fr))`, gap: 12 },
    children: values.map((v, i) => jsxs3("div", { style: { minWidth: 0 }, children: [
      jsx3("div", { style: sub, children: labels[i] || "Metric" }),
      jsx3("div", { style: { fontSize: 25, fontWeight: 690, letterSpacing: "-.035em", overflowWrap: "anywhere" }, children: v }),
      details[i] && jsx3("div", { style: sub, children: details[i] })
    ] }, i))
  }), "Metrics");
}
function ProgressWidget({ attrs }) {
  const val = number(attrs.value);
  const max = Math.max(1e-5, number(attrs.max, 100));
  const pct = Math.max(0, Math.min(100, val / max * 100));
  return shell(attrs, jsxs3("div", { children: [
    jsxs3("div", { style: { ...rowCss, justifyContent: "space-between", marginBottom: 8 }, children: [jsx3("span", { style: sub, children: clean(attrs.label) || "Progress" }), jsx3("strong", { children: `${fnum(val)} / ${fnum(max)}${clean(attrs.unit, 12)}` })] }),
    jsx3("div", { style: { height: 8, background: `color-mix(in srgb, ${MUTED} 13%, transparent)`, borderRadius: 99, overflow: "hidden" }, children: jsx3("div", { style: { height: "100%", width: `${pct}%`, background: ACCENT, borderRadius: 99 } }) }),
    attrs.detail && jsx3("div", { style: { ...sub, marginTop: 9 }, children: clean(attrs.detail, 250) })
  ] }), "Progress");
}
function ChartWidget({ attrs, line }) {
  const labels = parts(attrs.labels, "|", 16, 40);
  const raw = parts(attrs.values, "|", 16, 28).map((x) => number(x, NaN));
  const pairs = labels.map((label, i) => ({ label, value: raw[i] })).filter((x) => Number.isFinite(x.value));
  const [asTable, setAsTable] = useState2(false);
  if (!pairs.length) return empty("No numeric chart data provided.");
  const lo = Math.min(0, ...pairs.map((x) => x.value));
  const hi = Math.max(1, ...pairs.map((x) => x.value));
  const pct = (x) => Math.max(0, Math.min(100, (x - lo) / Math.max(1e-8, hi - lo) * 100));
  const chart = line ? jsxs3("div", { children: [
    jsx3("svg", { viewBox: "0 0 600 175", width: "100%", height: 175, role: "img", "aria-label": clean(attrs.title) || "Line chart", style: { overflow: "visible" }, children: jsxs3("g", { children: [
      [0, 1, 2, 3].map((i) => jsx3("line", { x1: 30, x2: 580, y1: 25 + i * 40, y2: 25 + i * 40, stroke: BORDER, strokeWidth: 1 }, i)),
      jsx3("polyline", { points: pairs.map((p, i) => `${35 + i * 540 / Math.max(1, pairs.length - 1)},${150 - 125 * pct(p.value) / 100}`).join(" "), fill: "none", stroke: ACCENT, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" }),
      pairs.map((p, i) => jsx3("circle", { cx: 35 + i * 540 / Math.max(1, pairs.length - 1), cy: 150 - 125 * pct(p.value) / 100, r: 3.7, fill: ACCENT }, i))
    ] }) }),
    jsx3("div", { style: { ...rowCss, justifyContent: "space-between" }, children: pairs.filter((_, i) => pairs.length <= 7 || i === 0 || i === pairs.length - 1 || i % Math.ceil(pairs.length / 5) === 0).map((p, i) => jsx3("span", { style: sub, children: p.label }, i)) })
  ] }) : jsx3("div", { style: { display: "grid", gap: 9 }, children: pairs.map((p, i) => jsxs3("div", { style: { display: "grid", gridTemplateColumns: "minmax(70px,115px) 1fr auto", gap: 10, alignItems: "center" }, children: [
    jsx3("span", { style: { ...sub, overflowWrap: "anywhere" }, children: p.label }),
    jsx3("div", { style: { height: 12, borderRadius: 5, background: `color-mix(in srgb, ${MUTED} 11%, transparent)`, overflow: "hidden" }, children: jsx3("div", { style: { height: "100%", width: `${pct(p.value)}%`, background: ACCENT, borderRadius: 5 } }) }),
    jsx3("span", { style: { ...sub, fontVariantNumeric: "tabular-nums" }, children: `${fnum(p.value)}${clean(attrs.unit, 12)}` })
  ] }, i)) });
  const table = jsx3("table", { style: { width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }, children: jsx3("tbody", { children: pairs.map((p, i) => jsxs3("tr", { children: [jsx3("td", { style: { padding: "6px 4px", borderBottom: `1px solid ${BORDER}` }, children: p.label }), jsx3("td", { style: { padding: "6px 4px", textAlign: "right", borderBottom: `1px solid ${BORDER}` }, children: `${fnum(p.value)}${clean(attrs.unit, 12)}` })] }, i)) }) });
  return shell(attrs, jsxs3("div", { children: [
    jsx3("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 9 }, children: jsx3("button", { type: "button", style: { ...btn, fontSize: 11, padding: "4px 8px" }, onClick: () => setAsTable(!asTable), children: asTable ? "Show chart" : "View data" }) }),
    asTable ? table : chart,
    attrs.detail && jsx3("div", { style: { ...sub, marginTop: 10 }, children: clean(attrs.detail, 320) })
  ] }), line ? "Line chart" : "Bar chart");
}
var chartColors = [ACCENT, "#a78bfa", "#38bdf8", "#f59e0b", "#fb7185", "#2dd4bf", "#94a3b8"];
function CalculatorWidget({ attrs, sessionId }) {
  const inputs = parseCalcInputs(attrs.inputs);
  const labels = parts(attrs.labels, "|", 6, 70);
  const defaults = () => Object.fromEntries(inputs.map((x) => [x.name, x.value]));
  const [values, setValues] = useState2(defaults);
  const computed = safeFormula(attrs.expression || attrs.formula || "", values);
  const set = (input, raw) => {
    const n = validNumeric2(raw);
    if (n === null) return;
    setValues((old) => ({ ...old, [input.name]: Math.min(input.max, Math.max(input.min, n)) }));
  };
  if (!inputs.length) return empty("Calculator needs valid inputs.");
  const controls = inputs.map((input, i) => jsxs3("div", { style: { display: "grid", gap: 4, minWidth: 0 }, children: [
    jsxs3("label", { htmlFor: `intui-${hash(attrs.title + "|" + input.name)}`, style: { ...sub, fontWeight: 600 }, children: [labels[i] || input.name] }),
    jsxs3("div", { style: { display: "flex", gap: 9, alignItems: "center" }, children: [
      jsx3("input", { id: `intui-${hash(attrs.title + "|" + input.name)}`, type: "range", min: input.min, max: input.max, step: input.step, value: values[input.name], onChange: (e) => set(input, e.target.value), style: { flex: 1, accentColor: ACCENT, minWidth: 0 } }),
      jsx3("input", { type: "number", "aria-label": `${labels[i] || input.name} value`, min: input.min, max: input.max, step: input.step, value: values[input.name], onChange: (e) => set(input, e.target.value), style: { ...btn, width: 92, fontVariantNumeric: "tabular-nums", padding: "6px 8px", boxSizing: "border-box" } })
    ] })
  ] }, input.name));
  return shell(attrs, jsxs3("div", { children: [
    jsx3("div", { style: { display: "grid", gap: 13 }, children: controls }),
    jsxs3("div", { style: { background: `color-mix(in srgb, ${ACCENT} 8%, transparent)`, padding: 13, borderRadius: 10, marginTop: 16 }, children: [
      jsx3("div", { style: sub, children: clean(attrs.result || attrs.output, 100) || "Result" }),
      jsx3("div", { role: "status", "aria-live": "polite", style: { fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }, children: computed.ok ? `${fnum(computed.value)} ${clean(attrs.unit, 24)}`.trim() : `Error: ${computed.error}` })
    ] }),
    jsx3("div", { style: { ...rowCss, marginTop: 10 }, children: [
      jsx3("button", { type: "button", style: btn, onClick: () => setValues(defaults()), children: "Reset inputs" }),
      jsx3("button", { type: "button", disabled: !computed.ok, style: { ...btn, opacity: computed.ok ? 1 : 0.4 }, onClick: () => void insertIntoChat(sessionId, `${clean(attrs.result || attrs.output, 80) || "Result"}: ${fnum(computed.value)} ${clean(attrs.unit, 24)}`.trim()), children: "Use result in chat" })
    ] }),
    attrs.detail && jsx3("div", { style: { ...sub, marginTop: 8 }, children: clean(attrs.detail, 350) })
  ] }), "Interactive calculator");
}
function DonutWidget({ attrs }) {
  const labels = parts(attrs.labels, "|", 8, 85);
  const nums = parts(attrs.values, "|", 8, 40).map(validNumeric2);
  const items = labels.map((label, i) => ({ label, value: nums[i] })).filter((x) => x.value !== null && x.value >= 0);
  const total = items.reduce((acc, x) => acc + x.value, 0);
  if (!items.length || total <= 0) return empty("Donut chart requires positive values.");
  const c = 2 * Math.PI * 47;
  let offset = 0;
  const arcs = items.map((item, i) => {
    const fraction = item.value / total;
    const element = jsx3("circle", {
      cx: 70,
      cy: 70,
      r: 47,
      fill: "none",
      stroke: chartColors[i % chartColors.length],
      strokeWidth: 17,
      strokeDasharray: `${fraction * c} ${c}`,
      strokeDashoffset: -offset * c,
      transform: "rotate(-90 70 70)"
    }, i);
    offset += fraction;
    return element;
  });
  return shell(attrs, jsxs3("div", { style: { display: "grid", gridTemplateColumns: "minmax(130px,190px) 1fr", gap: 12, alignItems: "center" }, children: [
    jsx3("svg", { viewBox: "0 0 140 140", role: "img", "aria-label": `Part-to-whole chart with total ${fnum(total)}`, children: jsxs3("g", { children: [
      ...arcs,
      jsx3("text", { x: 70, y: 69, textAnchor: "middle", fontSize: 17, fontWeight: 700, fill: COLOR, children: fnum(total) }),
      jsx3("text", { x: 70, y: 84, textAnchor: "middle", fontSize: 9, fill: MUTED, children: "Total" })
    ] }) }),
    jsx3("div", { style: { display: "grid", gap: 9 }, children: items.map((x, i) => jsxs3("div", { style: { display: "grid", gridTemplateColumns: "10px 1fr auto", alignItems: "center", gap: 7 }, children: [
      jsx3("span", { style: { width: 9, height: 9, borderRadius: 2, background: chartColors[i % chartColors.length] } }),
      jsx3("span", { style: { ...sub, overflowWrap: "anywhere" }, children: x.label }),
      jsx3("span", { style: { fontVariantNumeric: "tabular-nums", fontSize: 12 }, children: `${(100 * x.value / total).toFixed(1)}%` })
    ] }, i)) })
  ] }), "Donut chart");
}
function MatrixWidget({ attrs, sessionId }) {
  const options = parts(attrs.options, "|", 6, 80), criteria = parts(attrs.criteria, "|", 6, 80);
  const rows = clean(attrs.scores, 1600).split(";").slice(0, 6).map((r) => r.split("|").slice(0, 6).map(validNumeric2));
  const initial = parts(attrs.weights, "|", 6, 20).map((x) => validNumeric2(x) ?? 1);
  const [weights, setWeights] = useState2(() => criteria.map((_, i) => Math.min(5, Math.max(0, initial[i] ?? 1))));
  if (!criteria.length || options.length < 2 || rows.length !== options.length || rows.some((r) => r.length !== criteria.length || r.some((x) => x === null || x < 0 || x > 10))) return empty("Comparison requires 2\u20136 options and scores (0\u201310) for every criterion.");
  const total = weights.reduce((s, n) => s + n, 0);
  const rankings = options.map((option, i) => ({ option, score: total > 0 ? rows[i].reduce((s, x, j) => s + x * weights[j], 0) / total : null })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const copy = async () => {
    const text = `Compare my selection: ${rankings.map((r) => `${r.option} ${r.score === null ? "unrated" : r.score.toFixed(2) + "/10"}`).join(", ")}. Criteria weights: ${criteria.map((c, i) => `${c}=${weights[i]}`).join(", ")}.`;
    try {
      const ok = await host2.composer.insertText(sessionId ?? null, text, { mode: "block" });
      if (!ok) host2.notify({ kind: "warning", message: "Open this chat to insert the ranking." });
    } catch {
      host2.notify({ kind: "error", message: "Cannot insert the comparison." });
    }
  };
  return shell(attrs, jsxs3("div", { children: [
    jsx3("div", { style: { ...sub, marginBottom: 11 }, children: "Adjust criterion weights (0\u20135). Scores are supplied by the answer, not recalculated." }),
    jsx3("div", { style: { display: "grid", gap: 9 }, children: criteria.map((c, i) => jsxs3("label", { style: { display: "grid", gridTemplateColumns: "minmax(70px,125px) 1fr 25px", alignItems: "center", gap: 10 }, children: [
      jsx3("span", { style: sub, children: c }),
      jsx3("input", { type: "range", min: 0, max: 5, step: 1, value: weights[i], onChange: (e) => {
        const n = Number(e.target.value);
        setWeights((a) => a.map((v, j) => j === i ? n : v));
      }, style: { width: "100%", accentColor: ACCENT } }),
      jsx3("span", { style: { ...sub, fontVariantNumeric: "tabular-nums" }, children: String(weights[i]) })
    ] }, i)) }),
    jsx3("div", { style: { display: "grid", gap: 8, marginTop: 13 }, children: rankings.map((r, i) => jsxs3("div", { style: { display: "grid", gridTemplateColumns: "24px minmax(0,1fr) auto", gap: 9, alignItems: "center", padding: "9px 11px", border: `1px solid ${BORDER}`, borderRadius: 9 }, children: [
      jsx3("span", { style: { color: ACCENT, fontWeight: 650 }, children: String(i + 1) }),
      jsx3("span", { style: { fontWeight: 550, overflowWrap: "anywhere" }, children: r.option }),
      jsx3("span", { style: { fontVariantNumeric: "tabular-nums" }, children: r.score === null ? "Set weights" : `${r.score.toFixed(2)} / 10` })
    ] }, r.option)) }),
    jsx3("button", { type: "button", style: { ...btn, marginTop: 12 }, onClick: () => void copy(), children: "Use ranking in chat" })
  ] }), "Adjustable comparison");
}
function DiagramWidget({ attrs }) {
  const nodes = parts(attrs.nodes || attrs.items, "|", 9, 65);
  const details = parts(attrs.details, "|", 9, 180);
  const links = parts(attrs.links, "|", 16, 15).map((x) => {
    const m = /^(\d+)>(\d+)$/.exec(x);
    return m ? [+m[1], +m[2]] : null;
  }).filter((p) => p && p[0] < nodes.length && p[1] < nodes.length && p[0] !== p[1]);
  const [selected, setSelected] = useState2(0);
  if (nodes.length < 2) return empty("Diagram requires at least two nodes.");
  const columns = Math.min(3, nodes.length), rows = Math.ceil(nodes.length / columns), w = 580, h = rows * 98 + 16, unit = w / columns;
  const coords = nodes.map((_, i) => ({ x: (i % columns + 0.5) * unit, y: 60 + Math.floor(i / columns) * 98 }));
  const id = `arrow-${hash(JSON.stringify(attrs))}`;
  return shell(attrs, jsxs3("div", { children: [
    jsx3("svg", { viewBox: `0 0 ${w} ${h}`, width: "100%", role: "img", "aria-label": `Diagram: ${nodes.join(", ")}`, children: jsxs3("g", { children: [
      jsx3("defs", { children: jsx3("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", children: jsx3("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: ACCENT }) }) }),
      links.map(([a, b], i) => jsx3("line", { x1: coords[a].x, y1: coords[a].y, x2: coords[b].x, y2: coords[b].y, stroke: ACCENT, strokeWidth: 1.8, opacity: 0.65, markerEnd: `url(#${id})` }, i)),
      nodes.map((t, i) => jsxs3("g", { children: [
        jsx3("rect", { x: coords[i].x - unit * 0.36, y: coords[i].y - 27, width: unit * 0.72, height: 54, rx: 10, fill: "var(--ui-bg-primary, var(--background))", stroke: selected === i ? ACCENT : BORDER, strokeWidth: selected === i ? 2 : 1.5 }),
        jsx3("text", { x: coords[i].x, y: coords[i].y + 5, textAnchor: "middle", fontSize: 13, fill: COLOR, children: t.length > 22 ? t.slice(0, 21) + "\u2026" : t })
      ] }, i))
    ] }) }),
    jsx3("div", { style: { ...rowCss, gap: 6 }, children: nodes.map((x, i) => jsx3("button", { type: "button", style: { ...btn, borderColor: selected === i ? ACCENT : BORDER, fontSize: 11 }, onClick: () => setSelected(i), children: x }, i)) }),
    details[selected] && jsx3("div", { style: { ...sub, marginTop: 8 }, children: details[selected] })
  ] }), "Flow diagram");
}
function GaugeWidget({ attrs }) {
  const val = number(attrs.value), max = number(attrs.max, 100), min = number(attrs.min, 0);
  const pct = max > min ? Math.max(0, Math.min(1, (val - min) / (max - min))) : 0;
  const circumference = 2 * Math.PI * 44;
  return shell(attrs, jsxs3("div", { style: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }, children: [
    jsx3("svg", { viewBox: "0 0 120 120", width: 120, height: 120, role: "img", "aria-label": `${clean(attrs.label || "Gauge")}: ${fnum(val)} of ${fnum(max)}`, children: jsxs3("g", { children: [
      jsx3("circle", { cx: 60, cy: 60, r: 44, stroke: BORDER, strokeWidth: 12, fill: "none" }),
      jsx3("circle", { cx: 60, cy: 60, r: 44, stroke: ACCENT, strokeWidth: 12, fill: "none", strokeLinecap: "round", strokeDasharray: `${circumference * pct} ${circumference}`, transform: "rotate(-90 60 60)" }),
      jsx3("text", { x: 60, y: 65, textAnchor: "middle", fill: COLOR, fontSize: 20, fontWeight: 700, children: `${Math.round(pct * 100)}%` })
    ] }) }),
    jsxs3("div", { style: { display: "grid", gap: 3 }, children: [
      jsx3("span", { style: sub, children: clean(attrs.label) || "Current value" }),
      jsx3("strong", { style: { fontSize: 24, fontVariantNumeric: "tabular-nums" }, children: `${fnum(val)} ${clean(attrs.unit, 16)}`.trim() }),
      jsx3("span", { style: sub, children: `Range: ${fnum(min)} \u2013 ${fnum(max)}` }),
      attrs.detail && jsx3("span", { style: sub, children: clean(attrs.detail, 320) })
    ] })
  ] }), "Gauge");
}
function ScatterWidget({ attrs }) {
  const names = parts(attrs.labels, "|", 24, 55);
  const raw = parts(attrs.points, "|", 24, 70);
  const points = raw.map((chunk, i) => {
    const found = /^\s*([+\-]?(?:\d+(?:\.\d*)?|\.\d+))\s*:\s*([+\-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$/.exec(chunk);
    if (!found) return null;
    const x = validNumeric2(found[1]), y = validNumeric2(found[2]);
    return x === null || y === null ? null : { x, y, label: names[i] || `Point ${i + 1}` };
  }).filter(Boolean);
  if (!points.length) return empty('Scatter plot needs points="1:3|2:5".');
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const px = (x) => 45 + (x - minX) / Math.max(1e-10, maxX - minX) * 490;
  const py = (y) => 165 - (y - minY) / Math.max(1e-10, maxY - minY) * 135;
  return shell(attrs, jsx3("div", { children: jsx3("svg", { viewBox: "0 0 580 200", width: "100%", role: "img", "aria-label": `Scatter plot: ${points.length} data points`, children: jsxs3("g", { children: [
    [0, 1, 2, 3].map((i) => jsx3("line", { x1: 45, x2: 535, y1: 30 + i * 45, y2: 30 + i * 45, stroke: BORDER }, i)),
    jsx3("line", { x1: 45, x2: 45, y1: 30, y2: 165, stroke: MUTED }),
    jsx3("text", { x: 535, y: 192, textAnchor: "end", fontSize: 12, fill: MUTED, children: clean(attrs.x || attrs.xlabel, 40) || `X (${fnum(minX)} to ${fnum(maxX)})` }),
    jsx3("text", { x: 46, y: 16, textAnchor: "start", fontSize: 12, fill: MUTED, children: clean(attrs.y || attrs.ylabel, 40) || `Y (${fnum(minY)} to ${fnum(maxY)})` }),
    points.map((p, i) => jsx3("circle", { cx: px(p.x), cy: py(p.y), r: 5, fill: ACCENT, stroke: "var(--ui-bg-primary,transparent)", strokeWidth: 1.5, children: jsx3("title", { children: `${p.label}: (${fnum(p.x)}, ${fnum(p.y)})` }) }, i))
  ] }) }) }), "Scatter plot");
}
function SparklineWidget({ attrs }) {
  const raw = parts(attrs.values, "|", 30, 28), v = raw.map(validNumeric2);
  if (v.length < 2 || v.some((x) => x === null)) return empty("Sparkline needs at least two numeric values.");
  const lo = Math.min(...v), hi = Math.max(...v), range = Math.max(1e-9, hi - lo);
  return shell(attrs, jsxs3("div", { style: { display: "flex", alignItems: "center", gap: 14 }, children: [
    jsx3("svg", { viewBox: "0 0 200 65", width: "55%", height: 65, role: "img", "aria-label": "Trend sparkline", children: jsx3("polyline", {
      fill: "none",
      stroke: ACCENT,
      strokeWidth: 3,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      points: v.map((x, i) => `${5 + i * 190 / (v.length - 1)},${57 - 50 * (x - lo) / range}`).join(" ")
    }) }),
    jsxs3("div", { style: { display: "grid", gap: 4 }, children: [
      jsx3("div", { style: { ...sub }, children: clean(attrs.label, 80) || "Latest" }),
      jsx3("div", { style: { fontWeight: 690, fontSize: 21 }, children: `${fnum(v.at(-1))} ${clean(attrs.unit, 16)}`.trim() })
    ] })
  ] }), "Trend");
}

// src/content-widgets.js
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
import { useState as useState3 } from "react";
import { host as host3 } from "@hermes/plugin-sdk";
function TableWidget({ attrs }) {
  const cols = parts(attrs.columns || attrs.headers, "|", 7, 80);
  const rows = clean(attrs.rows, 1e4).split(";").slice(0, 80).map((row) => row.split("|").slice(0, cols.length || 5).map((x) => clean(x, 180)));
  const [search, setSearch] = useState3("");
  const [sort, setSort] = useState3({ column: -1, dir: 1 });
  if (!cols.length || !rows.length) return empty("Table needs columns and rows.");
  const query = search.toLowerCase().trim();
  const filtered = rows.filter((row) => !query || row.some((v) => v.toLowerCase().includes(query))).sort((a, b) => {
    if (sort.column < 0) return 0;
    const av = a[sort.column] ?? "", bv = b[sort.column] ?? "";
    const an = validNumeric(av.replaceAll(",", "")), bn = validNumeric(bv.replaceAll(",", ""));
    return sort.dir * (an !== null && bn !== null ? an - bn : av.localeCompare(bv, void 0, { numeric: true, sensitivity: "base" }));
  });
  const order = (column) => setSort((old) => old.column === column ? { column, dir: -old.dir } : { column, dir: 1 });
  const cell = { padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, verticalAlign: "top", overflowWrap: "anywhere", textAlign: "left" };
  return shell(attrs, jsxs4("div", { children: [
    jsxs4("div", { style: { ...rowCss, justifyContent: "space-between", marginBottom: 9 }, children: [
      jsx4("input", { type: "search", value: search, onChange: (e) => setSearch(e.target.value.slice(0, 120)), placeholder: "Filter rows\u2026", "aria-label": "Filter table rows", style: { ...btn, width: "min(230px,100%)", fontSize: 12 } }),
      jsx4("span", { style: sub, children: `${filtered.length} of ${rows.length} rows` })
    ] }),
    jsx4("div", { style: { overflowX: "auto" }, children: jsxs4("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 }, children: [
      jsx4("thead", { children: jsx4("tr", { children: cols.map((c, i) => jsx4("th", { scope: "col", style: { ...cell, color: MUTED, fontWeight: 580 }, children: jsx4("button", { type: "button", onClick: () => order(i), "aria-label": `Sort by ${c}`, style: { border: 0, background: "transparent", color: "inherit", font: "inherit", cursor: "pointer", textAlign: "left", padding: 0 }, children: c + (sort.column === i ? sort.dir > 0 ? " \u2191" : " \u2193" : "") }) }, i)) }) }),
      jsx4("tbody", { children: filtered.map((r, i) => jsx4("tr", { children: cols.map((_, j) => jsx4("td", { style: cell, children: r[j] || "\u2014" }, j)) }, i)) })
    ] }) })
  ] }), "Table");
}
function StepsWidget({ attrs }) {
  const items = parts(attrs.items || attrs.steps, "|", 14, 180);
  const details = parts(attrs.details, "|", 14, 220);
  return shell(attrs, jsx4("ol", { style: { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }, children: items.map((v, i) => jsxs4("li", { style: { display: "flex", alignItems: "flex-start", gap: 12 }, children: [
    jsx4("span", { style: { display: "inline-flex", flexShrink: 0, width: 23, height: 23, borderRadius: 100, alignItems: "center", justifyContent: "center", background: `color-mix(in srgb, ${ACCENT} 17%, transparent)`, color: ACCENT, fontSize: 12, fontWeight: 650 }, children: String(i + 1) }),
    jsxs4("div", { children: [jsx4("div", { style: { fontWeight: 540 }, children: v }), details[i] && jsx4("div", { style: sub, children: details[i] })] })
  ] }, i)) }), "Steps");
}
function CardsWidget({ attrs }) {
  const labels = parts(attrs.labels || attrs.items, "|", 8, 110);
  const values = parts(attrs.values, "|", 8, 100);
  const details = parts(attrs.details, "|", 8, 240);
  return shell(attrs, jsx4("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,175px),1fr))", gap: 10 }, children: labels.map((label, i) => jsxs4("div", { style: { border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, minWidth: 0 }, children: [
    jsx4("div", { style: { fontWeight: 630 }, children: label }),
    values[i] && jsx4("div", { style: { fontSize: 20, fontWeight: 650, marginTop: 5 }, children: values[i] }),
    details[i] && jsx4("div", { style: { ...sub, marginTop: 5 }, children: details[i] })
  ] }, i)) }), "Cards");
}
function ChecklistWidget({ attrs, sessionId }) {
  const items = parts(attrs.items, "|", 20, 190);
  const key = "checks:" + hash((sessionId || "new") + "|" + JSON.stringify(attrs));
  const [checked, setChecked] = useState3(() => {
    const saved = pluginContext?.storage?.get(key, []);
    return Array.isArray(saved) ? saved.filter((n) => Number.isInteger(n) && n >= 0 && n < items.length) : [];
  });
  const toggle = (i) => {
    const next = checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i];
    setChecked(next);
    pluginContext?.storage?.set(key, next);
  };
  return shell(attrs, jsxs4("div", { children: [
    jsx4("div", { style: { ...sub, marginBottom: 10 }, children: `${checked.length} of ${items.length} complete` }),
    jsx4("div", { style: { display: "grid", gap: 9 }, children: items.map((item, i) => jsxs4("label", { style: { display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer" }, children: [
      jsx4("input", { type: "checkbox", checked: checked.includes(i), onChange: () => toggle(i), style: { accentColor: ACCENT, marginTop: 3 } }),
      jsx4("span", { style: { textDecoration: checked.includes(i) ? "line-through" : "none", opacity: checked.includes(i) ? 0.62 : 1 }, children: item })
    ] }, i)) })
  ] }), "Checklist");
}
function TabsWidget({ attrs }) {
  const tabs = parts(attrs.tabs || attrs.labels, "|", 8, 70);
  const content = parts(attrs.contents || attrs.details, "|", 8, 900);
  const [active, setActive] = useState3(0);
  return shell(attrs, jsxs4("div", { children: [
    jsx4("div", { style: { ...rowCss, gap: 6, marginBottom: 10 }, role: "tablist", children: tabs.map((t, i) => jsx4("button", { type: "button", role: "tab", "aria-selected": active === i, style: { ...btn, fontSize: 12, background: active === i ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent", borderColor: active === i ? ACCENT : BORDER }, onClick: () => setActive(i), children: t }, i)) }),
    jsx4("div", { role: "tabpanel", style: { whiteSpace: "pre-wrap", minHeight: 30 }, children: content[active] || "\u2014" })
  ] }), "Tabs");
}
function OptionsWidget({ attrs, sessionId }) {
  const choices = parts(attrs.choices || attrs.items, "|", 12, 100);
  const [selected, setSelected] = useState3("");
  const insert = async (choice) => {
    setSelected(choice);
    const text = clean(attrs.prompt, 200).replaceAll("[choice]", choice).replaceAll("{choice}", choice) || `I choose: ${choice}`;
    try {
      const ok = await host3.composer.insertText(sessionId ?? null, text, { mode: "block" });
      if (!ok) host3.notify({ kind: "warning", message: "Open this chat to add your selection." });
    } catch {
      host3.notify({ kind: "error", message: "Cannot insert into the composer." });
    }
  };
  return shell(attrs, jsxs4("div", { children: [
    attrs.detail && jsx4("div", { style: { ...sub, marginBottom: 12 }, children: clean(attrs.detail, 300) }),
    jsx4("div", { style: { ...rowCss, gap: 8 }, children: choices.map((c, i) => jsx4("button", { type: "button", style: { ...btn, background: selected === c ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : "transparent", borderColor: selected === c ? ACCENT : BORDER }, onClick: () => void insert(c), children: c }, i)) }),
    jsx4("div", { style: { ...sub, marginTop: 11 }, children: "Selecting an option adds it to this chat\u2019s composer. Review it before sending." })
  ] }), "Choose an option");
}
function NoticeWidget({ attrs }) {
  return shell(attrs, jsxs4("div", { style: { display: "grid", gap: 8 }, children: [
    jsx4("div", { style: { whiteSpace: "pre-wrap" }, children: clean(attrs.text || attrs.body || attrs.detail, 2500) }),
    attrs.tags && jsx4("div", { style: rowCss, children: parts(attrs.tags, "|", 10, 50).map((t, i) => pill(t, i)) })
  ] }), "Note");
}
function TimelineWidget({ attrs }) {
  const items = parts(attrs.items, "|", 12, 110), dates = parts(attrs.dates, "|", 12, 65), details = parts(attrs.details, "|", 12, 180);
  const statuses = parts(attrs.statuses, "|", 12, 25);
  return shell(attrs, jsx4("ol", { style: { padding: 0, margin: 0, listStyle: "none", display: "grid", gap: 0 }, children: items.map((x, i) => jsxs4("li", { style: { display: "grid", gridTemplateColumns: "minmax(65px,95px) 18px 1fr", gap: 9, alignItems: "stretch" }, children: [
    jsx4("div", { style: { ...sub, paddingTop: 5, textAlign: "right" }, children: dates[i] || `#${i + 1}` }),
    jsxs4("div", { style: { display: "flex", flexDirection: "column", alignItems: "center" }, children: [
      jsx4("div", { style: { width: 11, height: 11, marginTop: 7, borderRadius: "50%", border: `2px solid ${statuses[i] === "done" ? ACCENT : BORDER}`, background: statuses[i] === "done" ? ACCENT : "transparent" } }),
      i !== items.length - 1 && jsx4("div", { style: { width: 1, minHeight: 18, background: BORDER, flex: 1 } })
    ] }),
    jsxs4("div", { style: { paddingBottom: 18 }, children: [
      jsx4("div", { style: { fontWeight: 580 }, children: x }),
      details[i] && jsx4("div", { style: sub, children: details[i] }),
      statuses[i] && jsx4("div", { style: { ...sub, marginTop: 2 }, children: statuses[i] })
    ] })
  ] }, i)) }), "Timeline");
}
function AccordionWidget({ attrs }) {
  const labels = parts(attrs.labels || attrs.items, "|", 12, 120);
  const content = parts(attrs.contents || attrs.details, "|", 12, 1e3);
  return shell(attrs, jsx4("div", { style: { display: "grid", gap: 6 }, children: labels.map((x, i) => jsxs4("details", {
    style: { border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px" },
    children: [
      jsx4("summary", { style: { cursor: "pointer", fontWeight: 560 }, children: x }),
      jsx4("p", { style: { ...sub, margin: "8px 0 2px", whiteSpace: "pre-wrap" }, children: content[i] || "\u2014" })
    ]
  }, i)) }), "Expandable sections");
}
function KeyValueWidget({ attrs }) {
  const labels = parts(attrs.labels || attrs.keys, "|", 16, 90), values = parts(attrs.values, "|", 16, 170);
  return shell(attrs, jsx4("dl", { style: { margin: 0, display: "grid", gridTemplateColumns: "minmax(85px,0.7fr) minmax(0,1.3fr)", gap: "9px 14px" }, children: labels.flatMap((key, i) => [
    jsx4("dt", { style: { ...sub, overflowWrap: "anywhere" }, children: key }, `k${i}`),
    jsx4("dd", { style: { margin: 0, fontWeight: 570, overflowWrap: "anywhere" }, children: values[i] || "\u2014" }, `v${i}`)
  ]) }), "Properties");
}

// src/widgets.js
var handlers = { recipe: RecipeWidget, accordion: AccordionWidget, kv: KeyValueWidget, keyvalue: KeyValueWidget, gauge: GaugeWidget, scatter: ScatterWidget, sparkline: SparklineWidget, metric: StatWidget, stats: StatWidget, progress: ProgressWidget, bars: ChartWidget, bar: ChartWidget, line: ({ attrs }) => jsx5(ChartWidget, { attrs, line: true }), table: TableWidget, steps: StepsWidget, cards: CardsWidget, checklist: ChecklistWidget, tabs: TabsWidget, options: OptionsWidget, notice: NoticeWidget, calc: CalculatorWidget, calculator: CalculatorWidget, donut: DonutWidget, pie: DonutWidget, timeline: TimelineWidget, matrix: MatrixWidget, compare: MatrixWidget, diagram: DiagramWidget, flow: DiagramWidget };
function getWidget(kind) {
  return Object.hasOwn(handlers, kind) ? handlers[kind] : null;
}

// src/layout-view.js
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
import { useState as useState4 } from "react";

// src/layout-state.js
function parseTree(source) {
  if (typeof source !== "string" || source.length === 0 || source.length > 1800)
    return { ok: false, error: "Layout must contain 1\u20131,800 characters" };
  let p = 0, count = 0;
  const raw = source;
  const skip = () => {
    while (p < raw.length && /\s/.test(raw[p])) p++;
  };
  const fail = (m) => {
    throw Error(`${m} near character ${p + 1}`);
  };
  const ident = () => {
    skip();
    const m = /^[a-z][a-z0-9]{0,22}/.exec(raw.slice(p));
    if (!m) fail("Expected component or property name");
    p += m[0].length;
    return m[0];
  };
  const val = () => {
    const start = p;
    while (p < raw.length && raw[p] !== ";" && raw[p] !== ")") p++;
    if (p - start > 4e3) fail("Property is too long");
    let value = raw.slice(start, p).trim();
    if (value.includes('"') || /[\u0000-\u0008\u000b-\u001f]/.test(value)) fail("Unsupported property character");
    try {
      if (/%[0-9a-f]{2}/i.test(value)) value = decodeURIComponent(value);
    } catch {
      fail("Bad percent-encoded property");
    }
    return clean(value, 4e3);
  };
  function node(depth) {
    if (depth > 5 || ++count > 32) fail("Layout is too large");
    const type = canonicalNodeType(ident()), attrs = /* @__PURE__ */ Object.create(null), children = [];
    const containers = [...LAYOUT_CONTAINERS];
    const primitives = ["heading", "text", "caption", "badge", "divider", "link", "action", "spacer", "input", "select", "toggle", "segmented", "textinput", "textarea", "dateinput", "submit", "derive", "result", "listitem", "quote", "code", "markdown"];
    if (!LAYOUT_CONTAINERS.has(type) && !primitives.includes(type) && !getWidget(type)) fail(`Unsupported component ${type}`);
    skip();
    if (raw[p] === "(") {
      p++;
      skip();
      let attributes = 0;
      while (raw[p] !== ")") {
        if (++attributes > 18) fail("Too many properties");
        const key = ident();
        skip();
        if (raw[p++] !== "=") fail("Expected =");
        const value = val();
        if (Object.hasOwn(attrs, key)) fail("Duplicate property");
        attrs[key] = value;
        if (raw[p] === ";") {
          p++;
          skip();
          if (raw[p] === ")") fail("Trailing property separator");
        } else if (raw[p] !== ")") fail("Expected ; or )");
        if (p >= raw.length) fail("Unclosed properties");
      }
      p++;
      skip();
    }
    if (raw[p] === "[") {
      if (!containers.includes(type)) fail("Only layout containers accept children");
      p++;
      skip();
      if (raw[p] === "]") fail("Empty container");
      for (; ; ) {
        children.push(node(depth + 1));
        skip();
        if (raw[p] === "~") {
          p++;
          skip();
          continue;
        }
        if (raw[p] === "]") {
          p++;
          break;
        }
        fail("Expected ~ or ]");
      }
    } else if (containers.includes(type)) fail(`${type} needs children in brackets`);
    if (type === "tabview" && (children.length < 1 || children.length > 8 || children.some((x) => x.type !== "tab"))) fail("Tabs require 1\u20138 tab children");
    return { type, attrs, children };
  }
  try {
    const tree = node(0);
    skip();
    if (p !== raw.length) fail("Unexpected trailing content");
    return { ok: true, tree, nodeCount: count };
  } catch (e) {
    return { ok: false, error: clean(e?.message || "Invalid layout", 130) };
  }
}
var LAYOUT_CONTAINERS = /* @__PURE__ */ new Set(["col", "row", "grid", "card", "section", "stack", "carousel", "box", "list", "form", "tabview", "tab", "when"]);
var NODE_ALIASES = {
  title: "heading",
  label: "caption",
  button: "action",
  slider: "input",
  checkbox: "toggle",
  segmentedcontrol: "segmented",
  radiogroup: "segmented",
  textinput: "textinput",
  markdown: "markdown",
  textarea: "textarea",
  datepicker: "dateinput",
  date: "dateinput",
  listitem: "listitem"
};
function canonicalNodeType(name) {
  return NODE_ALIASES[name] || name;
}
function safeCondition(expression, vars) {
  const condition = clean(expression, 240);
  if (!condition) return { ok: false, error: "Condition is empty" };
  const m = /^(.*?)\s*(>=|<=|==|!=|>|<)\s*(.*?)$/.exec(condition);
  if (!m) {
    const n = safeFormula(condition, vars);
    return n.ok ? { ok: true, value: n.value !== 0 } : n;
  }
  const left = safeFormula(m[1], vars), right = safeFormula(m[3], vars);
  if (!left.ok) return left;
  if (!right.ok) return right;
  const a = left.value, b = right.value;
  const value = { "==": () => a === b, "!=": () => a !== b, ">": () => a > b, "<": () => a < b, ">=": () => a >= b, "<=": () => a <= b }[m[2]]();
  return { ok: true, value };
}
var VARIABLE_NAME = /^[A-Za-z][A-Za-z0-9_]{0,20}$/;
var CONTROL_TYPES = /* @__PURE__ */ new Set(["input", "select", "toggle", "segmented", "textinput", "textarea", "dateinput"]);
function layoutStateKey(attrs, sessionId) {
  if (attrs.persist !== "true" || !sessionId || !/^[A-Za-z0-9_-]{1,64}$/.test(attrs.id || "")) return null;
  return "layout-state:v1:" + hash(`${sessionId}|${attrs.id}|${attrs.tree || ""}`);
}
function restoreLayoutValues(prepared, key) {
  const defaults = { ...prepared.defaults };
  if (!key) return defaults;
  let stored;
  try {
    stored = pluginContext?.storage?.get(key, null);
  } catch {
    return defaults;
  }
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return defaults;
  for (const def of prepared.controls) {
    const value = stored[def.name];
    if (def.kind === "textinput" || def.kind === "textarea") {
      if (typeof value === "string") defaults[def.name] = cleanInput(value, def.maxlen);
    } else if (def.kind === "dateinput") {
      if (typeof value === "string" && validDate(value)) defaults[def.name] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      if (def.kind === "input" && value >= def.min && value <= def.max) defaults[def.name] = value;
      else if ((def.kind === "select" || def.kind === "segmented") && def.options.includes(value)) defaults[def.name] = value;
      else if (def.kind === "toggle" && (value === 0 || value === 1)) defaults[def.name] = value;
    }
  }
  return defaults;
}
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
function validateLayoutForm(prepared, values) {
  const errors = [];
  for (const def of prepared.controls) {
    const value = values[def.name];
    if (def.required) {
      const missing = def.kind === "textinput" || def.kind === "textarea" || def.kind === "dateinput" ? !String(value ?? "").trim() : value === null || value === void 0 || def.kind === "toggle" && value !== 1;
      if (missing) errors.push(`${def.label || def.name} is required`);
    }
    if ((def.kind === "textinput" || def.kind === "textarea") && String(value ?? "").trim().length > 0 && String(value).trim().length < def.minlen)
      errors.push(`${def.label || def.name} needs at least ${def.minlen} characters`);
    if (def.kind === "dateinput" && String(value ?? "") && !validDate(value)) errors.push(`${def.label || def.name} must be a valid date`);
  }
  return errors.slice(0, 6);
}
function formDraft(prepared, values, vars, template) {
  const resolved = resolveBindingText(template || "", vars);
  if (resolved.problems.length) return { ok: false, error: "Unknown value in submission: " + resolved.problems[0] };
  if (resolved.text.trim()) return { ok: true, text: cleanInput(resolved.text, 500) };
  const parts2 = prepared.controls.map((d) => `${d.label || d.name}: ${String(values[d.name] ?? "").slice(0, 140)}`);
  return { ok: true, text: cleanInput(parts2.join("\n"), 500) };
}
function prepareLayoutState(tree) {
  const controls = [], derivations = [], names = /* @__PURE__ */ new Set();
  function visit(node) {
    const a = node.attrs || {}, t = node.type;
    if (CONTROL_TYPES.has(t) || t === "derive" || t === "result" && a.name) {
      const name = a.name || "";
      if (!VARIABLE_NAME.test(name)) throw Error("Every named input or result needs a valid name");
      if (names.has(name)) throw Error("Duplicate state name: " + name);
      names.add(name);
      if (CONTROL_TYPES.has(t)) {
        if (controls.length >= 8) throw Error("A layout supports at most 8 controls");
        const meta = { label: clean(a.label || name, 80), required: a.required === "true", minlen: Math.max(0, Math.min(120, Math.round(number(a.minlen, 0)))) };
        if (t === "input") {
          const lo = validNumeric2(a.min ?? "0"), hi = validNumeric2(a.max ?? "100");
          const step = validNumeric2(a.step ?? "1"), def = validNumeric2(a.value ?? "0");
          if ([lo, hi, step, def].some((x) => x === null) || lo >= hi || step <= 0 || step > hi - lo) throw Error("Invalid range for " + name);
          controls.push({ ...meta, kind: t, name, min: lo, max: hi, step, default: Math.max(lo, Math.min(hi, def)) });
        } else if (t === "select" || t === "segmented") {
          const options = parts(a.values, "|", 12, 30).map(validNumeric2);
          if (!options.length || options.some((x) => x === null) || new Set(options).size !== options.length) throw Error("Invalid numeric choices for " + name);
          const def = validNumeric2(a.value ?? String(options[0]));
          if (def === null || !options.includes(def)) throw Error("Default choice is not among options for " + name);
          controls.push({ ...meta, kind: t, name, options, default: def });
        } else if (t === "textinput" || t === "textarea") {
          const maxLimit = t === "textarea" ? 360 : 160;
          const maxlen = Math.max(1, Math.min(maxLimit, Math.round(number(a.maxlen, maxLimit))));
          controls.push({ ...meta, kind: t, name, maxlen, default: clean(a.value, maxlen) });
        } else if (t === "dateinput") {
          if (a.value && !validDate(a.value)) throw Error("Date must be YYYY-MM-DD for " + name);
          controls.push({ ...meta, kind: t, name, default: a.value || "" });
        } else {
          if (a.value !== void 0 && !["0", "1"].includes(a.value)) throw Error("Toggle value must be 0 or 1");
          controls.push({ ...meta, kind: t, name, default: a.value === "1" ? 1 : 0 });
        }
      } else {
        if (derivations.length >= 8) throw Error("A layout supports at most 8 calculated variables");
        const expression = a.expression || a.expr || "";
        if (!expression || expression.length > 240) throw Error("Missing or oversized formula for " + name);
        derivations.push({ name, expression });
      }
    } else if (t === "derive") throw Error("A derived variable requires a name");
    for (const child of node.children || []) visit(child);
  }
  try {
    visit(tree);
    return { ok: true, controls, derivations, defaults: Object.fromEntries(controls.map((v) => [v.name, v.default])) };
  } catch (e) {
    return { ok: false, error: clean(e?.message || "Invalid controls", 150) };
  }
}
function computeLayoutState(prepared, inputs) {
  const vars = { ...inputs }, pending = [...prepared.derivations], problems = [];
  for (let pass = 0; pass < prepared.derivations.length && pending.length; pass++) {
    for (let i = pending.length - 1; i >= 0; i--) {
      const d = pending[i], calc = safeFormula(d.expression, vars);
      if (calc.ok) {
        vars[d.name] = calc.value;
        pending.splice(i, 1);
      }
    }
  }
  for (const item of pending) {
    const calc = safeFormula(item.expression, vars);
    problems.push(`${item.name}: ${calc.error || "Unresolved formula"}`);
  }
  return { vars, problems };
}
function resolveBindingText(raw, vars) {
  if (typeof raw !== "string") return { text: "", problems: [] };
  const problems = [];
  const fragments = raw.split(/([|;])/g).map((fragment) => {
    const v = fragment.trim();
    if (v.startsWith("=") && v.length > 1) {
      const result = safeFormula(v.slice(1), vars);
      if (result.ok) return String(result.value);
      problems.push(result.error);
      return "\u2014";
    }
    return fragment.replace(/\$([A-Za-z][A-Za-z0-9_]{0,20})\b/g, (token, name) => {
      if (!Object.hasOwn(vars, name)) {
        problems.push("Unknown variable: " + name);
        return "\u2014";
      }
      return typeof vars[name] === "string" ? vars[name].trim() : String(vars[name]);
    });
  });
  return { text: fragments.join(""), problems };
}
function bindAttrs(attrs, vars) {
  const out = { ...attrs }, problems = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (["expression", "expr", "source", "url", "inputs", "sample", "name", "kind", "test"].includes(k)) continue;
    const result = resolveBindingText(v, vars);
    out[k] = result.text;
    problems.push(...result.problems);
  }
  return { attrs: out, problems };
}

// src/layout-view.js
function ControlNode({ node, context }) {
  const a = node.attrs, def = context.prepared.controls.find((x) => x.name === a.name);
  if (!def) return empty("Control is not registered");
  const value = context.values[def.name];
  const label = clean(a.label || def.name, 100);
  const set = (raw) => {
    if (def.kind === "textinput" || def.kind === "textarea" || def.kind === "dateinput") {
      if (def.kind === "dateinput") {
        if (raw !== "" && !validDate(raw)) return;
        context.setValues((old) => ({ ...old, [def.name]: raw }));
        return;
      }
      context.setValues((old) => ({ ...old, [def.name]: cleanInput(String(raw ?? ""), def.maxlen) }));
      return;
    }
    const n = validNumeric2(raw);
    if (n === null) return;
    const next = def.kind === "toggle" ? n ? 1 : 0 : def.kind === "select" || def.kind === "segmented" ? def.options.includes(n) ? n : value : Math.max(def.min, Math.min(def.max, n));
    context.setValues((old) => ({ ...old, [def.name]: next }));
  };
  const heading = jsx6("label", { style: { ...sub, fontWeight: 620 }, children: label + (def.required ? " *" : "") });
  let field;
  if (def.kind === "textinput" || def.kind === "textarea" || def.kind === "dateinput") {
    const common = {
      value: String(value ?? ""),
      "aria-label": label,
      onChange: (e) => set(e.target.value),
      placeholder: clean(a.placeholder, 100),
      maxLength: def.maxlen,
      style: { ...btn, boxSizing: "border-box", width: "100%", minWidth: 0 }
    };
    field = def.kind === "textarea" ? jsx6("textarea", { ...common, rows: Math.max(2, Math.min(5, Math.round(number(a.rows, 3)))) }) : jsx6("input", { ...common, type: def.kind === "dateinput" ? "date" : "text", min: def.kind === "dateinput" ? "1900-01-01" : void 0, max: def.kind === "dateinput" ? "2100-12-31" : void 0 });
  } else if (def.kind === "toggle") field = jsx6("button", {
    type: "button",
    role: "switch",
    "aria-checked": value === 1,
    "aria-label": label,
    onClick: () => set(value === 1 ? 0 : 1),
    style: { ...btn, width: "fit-content", background: value === 1 ? `color-mix(in srgb, ${ACCENT} 15%, transparent)` : "transparent", borderColor: value === 1 ? ACCENT : BORDER },
    children: value === 1 ? "On" : "Off"
  });
  else if (def.kind === "select" || def.kind === "segmented") {
    const opts = parts(a.labels, "|", 12, 90);
    if (def.kind === "segmented") field = jsx6("div", { role: "group", "aria-label": label, style: { ...rowCss, gap: 5 }, children: def.options.map((v, i) => jsx6("button", {
      type: "button",
      "aria-pressed": value === v,
      onClick: () => set(String(v)),
      style: { ...btn, borderColor: value === v ? ACCENT : BORDER, background: value === v ? `color-mix(in srgb, ${ACCENT} 12%, transparent)` : "transparent" },
      children: opts[i] || fnum(v)
    }, String(v))) });
    else field = jsx6("select", { value: String(value), "aria-label": label, onChange: (e) => set(e.target.value), style: { ...btn, minWidth: 100, maxWidth: 240 }, children: def.options.map((v, i) => jsx6("option", { value: String(v), children: opts[i] || fnum(v) }, String(v))) });
  } else {
    const slider = jsx6("input", {
      type: "range",
      min: def.min,
      max: def.max,
      step: def.step,
      value,
      onChange: (e) => set(e.target.value),
      "aria-label": label,
      style: { accentColor: ACCENT, width: "100%", minWidth: 0 }
    });
    const numeric = jsx6("input", {
      type: "number",
      min: def.min,
      max: def.max,
      step: def.step,
      value,
      onChange: (e) => set(e.target.value),
      "aria-label": `${label} numeric value`,
      style: { ...btn, padding: "6px 8px", width: 100, boxSizing: "border-box" }
    });
    field = jsxs5("div", { style: { display: "flex", gap: 9, alignItems: "center", minWidth: 0 }, children: [slider, numeric] });
  }
  return jsxs5("div", { style: { display: "grid", gap: 5, minWidth: 0 }, children: [
    heading,
    field,
    a.hint && jsx6("div", { style: sub, children: clean(a.hint, 180) })
  ] });
}
function ResultNode({ node, context, sessionId }) {
  const a = node.attrs;
  const label = clean(a.label || a.name || "Calculated result", 100);
  const expression = a.expression || a.expr || "";
  const result = a.name && Object.hasOwn(context.vars, a.name) ? { ok: true, value: context.vars[a.name] } : safeFormula(expression, context.vars);
  const unit = clean(a.unit, 20);
  const decimalsRaw = validNumeric2(a.decimals ?? "2");
  const decimals = Math.max(0, Math.min(6, Math.floor(decimalsRaw ?? 2)));
  const output = result.ok ? `${new Intl.NumberFormat(void 0, { maximumFractionDigits: decimals }).format(result.value)}${unit ? " " + unit : ""}` : `Error: ${clean(result.error || "Invalid formula", 100)}`;
  return jsxs5("div", { style: { minWidth: 0, padding: "10px 12px", borderRadius: 12, background: `color-mix(in srgb, ${ACCENT} 8%, transparent)` }, children: [
    jsx6("div", { style: sub, children: label }),
    jsx6("div", { role: "status", "aria-live": "polite", style: { fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }, children: output }),
    a.share !== "false" && jsx6("button", {
      type: "button",
      disabled: !result.ok,
      style: { ...btn, marginTop: 9, fontSize: 11, opacity: result.ok ? 1 : 0.4 },
      onClick: () => void insertIntoChat(sessionId, `${label}: ${output}`),
      children: "Use result in chat"
    })
  ] });
}
function FormSubmitNode({ node, context, sessionId }) {
  const [error, setError] = useState4("");
  const a = node.attrs;
  const submit = () => {
    const issues = validateLayoutForm(context.prepared, context.values);
    if (issues.length) {
      setError(issues.join("; "));
      return;
    }
    const draft = formDraft(context.prepared, context.values, context.vars, a.prompt || "");
    if (!draft.ok) {
      setError(draft.error);
      return;
    }
    setError("");
    void insertIntoChat(sessionId, draft.text);
  };
  return jsxs5("div", { style: { display: "grid", gap: 6 }, children: [
    jsx6("button", { type: "button", style: { ...btn, width: "fit-content" }, onClick: submit, children: clean(a.text || a.label, 120) || "Add form to chat" }),
    error && jsx6("div", { role: "alert", style: { ...sub, color: "var(--ui-text-danger, #e66)" }, children: error })
  ] });
}
function LayoutTabs({ node, sessionId, path, context }) {
  const [active, setActive] = useState4(0);
  const index = Math.min(Math.max(0, active), node.children.length - 1);
  const current = node.children[index];
  return jsxs5("section", { style: { minWidth: 0 }, children: [
    jsx6("div", { role: "tablist", "aria-label": clean(node.attrs.label, 100) || "Sections", style: { ...rowCss, gap: 6, borderBottom: `1px solid ${BORDER}`, paddingBottom: 8, marginBottom: 10 }, children: node.children.map((n, i) => jsx6("button", {
      type: "button",
      role: "tab",
      "aria-selected": i === index,
      style: { ...btn, fontSize: 12, color: i === index ? ACCENT : COLOR, borderColor: i === index ? ACCENT : BORDER },
      onClick: () => setActive(i),
      children: clean(n.attrs.label || n.attrs.title, 90) || `Tab ${i + 1}`
    }, i)) }),
    jsx6("div", { role: "tabpanel", children: current.children.map((child, i) => jsx6("div", { key: `${index}-${i}`, style: { marginBottom: 8, minWidth: 0 }, children: renderTreeNode(child, sessionId, `${path}-${index}-${i}`, context) })) })
  ] });
}
function renderTreeNode(node, sessionId, path = "n", context = null) {
  const raw = node.attrs, t = node.type;
  const resolved = context ? bindAttrs(raw, context.vars) : { attrs: raw, problems: [] };
  const a = resolved.attrs;
  if (context) context.problems.push(...resolved.problems);
  if (t === "when") {
    const cond = safeCondition(raw.test || raw.expression, context?.vars || {});
    if (!cond.ok) {
      if (context) context.problems.push("Condition: " + clean(cond.error, 90));
      return empty("Conditional section unavailable");
    }
    if (!cond.value) return null;
  }
  if (t === "tabview") return jsx6(LayoutTabs, { node, sessionId, path, context });
  if (t === "tab") return empty("A tab must be inside tabview");
  if (t === "submit") return jsx6(FormSubmitNode, { node, sessionId, context });
  if (LAYOUT_CONTAINERS.has(t)) {
    const children = node.children.map((child, i) => jsx6("div", { style: { minWidth: 0 }, children: renderTreeNode(child, sessionId, `${path}${i}`, context) }, `${path}${i}`));
    const gap = toGap(a.gap, 10);
    let style = { display: "flex", flexDirection: "column", gap, minWidth: 0 };
    if (t === "row") style = { ...style, flexDirection: "row", flexWrap: a.wrap === "false" ? "nowrap" : "wrap", alignItems: "start" };
    if (t === "grid") {
      const cols = Math.max(1, Math.min(4, Math.round(number(a.cols || a.columns, 2))));
      const min = Math.max(130, Math.min(320, Math.floor(660 / cols) - 25));
      style = { display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${min}px),1fr))`, gap, minWidth: 0 };
    }
    if (t === "box") style = { ...style, padding: Math.max(0, Math.min(24, number(a.padding, 8))), borderRadius: 10 };
    if (t === "list") style = { ...style, gap: 3, paddingLeft: 5 };
    if (t === "card") style = { ...style, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, background: "color-mix(in srgb, var(--ui-text-primary) 2%, transparent)" };
    if (t === "section") style = { ...style, padding: "3px 0 12px", borderBottom: `1px solid ${BORDER}` };
    if (t === "form") style = { ...style, padding: "12px", borderRadius: 12, border: `1px solid ${BORDER}` };
    if (t === "carousel") style = { ...style, flexDirection: "row", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 8 };
    if (t === "carousel") return jsx6("div", { style, children: children.map((child, i) => jsx6("div", { key: i, style: { flex: "0 0 min(78%,235px)", scrollSnapAlign: "start" }, children: child }, i)) });
    return jsx6("div", { style, children });
  }
  if (CONTROL_TYPES.has(t)) return jsx6(ControlNode, { node, context });
  if (t === "derive") return null;
  if (t === "result") return jsx6(ResultNode, { node, context, sessionId });
  if (t === "heading") return jsx6("h4", { style: { fontSize: Math.max(12, Math.min(25, number(a.size, 18))), fontWeight: 700, margin: 0, lineHeight: 1.2 }, children: clean(a.text, 360) });
  if (t === "text") return jsx6("p", { style: { fontSize: 13, margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }, children: clean(a.text, 1400) });
  if (t === "caption") return jsx6("span", { style: sub, children: clean(a.text, 600) });
  if (t === "quote") return jsx6("blockquote", { style: { margin: "2px 0", padding: "9px 12px", borderLeft: `3px solid ${ACCENT}`, background: `color-mix(in srgb, ${ACCENT} 5%, transparent)`, borderRadius: 5 }, children: clean(a.text, 1200) });
  if (t === "code") return jsx6("pre", { style: { fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: 10, borderRadius: 8, border: `1px solid ${BORDER}` }, children: jsx6("code", { children: clean(a.text, 1500) }) });
  if (t === "markdown") return jsx6("p", { style: { margin: 0, whiteSpace: "pre-wrap", fontSize: 13 }, children: clean(a.text, 1200) });
  if (t === "listitem") return jsx6("div", { style: { display: "flex", gap: 8, alignItems: "start" }, children: [jsx6("span", { "aria-hidden": "true", style: { color: ACCENT }, children: "\u2022" }), jsx6("span", { children: clean(a.text, 450) })] });
  if (t === "badge") return pill(clean(a.text, 65), path);
  if (t === "divider") return jsx6("hr", { style: { height: 1, border: 0, background: BORDER, width: "100%", margin: 0 } });
  if (t === "spacer") return jsx6("div", { style: { flex: 1, minHeight: 1 } });
  if (t === "link") {
    const href = safeExternalUrl(a.url);
    return href ? jsx6("a", { href, target: "_blank", rel: "noopener noreferrer", style: { color: ACCENT, textDecoration: "underline", overflowWrap: "anywhere" }, children: clean(a.text || href, 150) }) : empty("Invalid link URL");
  }
  if (t === "action") return jsx6("button", { type: "button", style: btn, onClick: () => void insertIntoChat(sessionId, a.prompt || a.text), children: clean(a.text || "Use in chat", 100) });
  const Widget = getWidget(t);
  return Widget ? jsx6(Widget, { attrs: { ...a, _nested: "1" }, sessionId }) : empty("Unsupported item");
}
function LayoutWidget({ attrs, sessionId }) {
  const parsed = parseTree(attrs.tree);
  const prepared = parsed.ok ? prepareLayoutState(parsed.tree) : { ok: false, error: "No valid layout yet", controls: [], derivations: [], defaults: {} };
  const persistenceKey = layoutStateKey(attrs, sessionId);
  const [values, setRawValues] = useState4(() => prepared.ok ? restoreLayoutValues(prepared, persistenceKey) : {});
  const setValues = (next) => setRawValues((current) => {
    const result = typeof next === "function" ? next(current) : next;
    if (persistenceKey) {
      try {
        pluginContext?.storage?.set(persistenceKey, result);
      } catch {
      }
    }
    return result;
  });
  if (!parsed.ok) return shell(attrs, empty(`Layout syntax error: ${parsed.error}`), "Composed layout");
  if (!prepared.ok) return shell(attrs, empty(`Layout state error: ${prepared.error}`), "Composed layout");
  const derived = computeLayoutState(prepared, values);
  const context = { prepared, values, setValues, vars: derived.vars, problems: [...derived.problems] };
  const tree = renderTreeNode(parsed.tree, sessionId, "n", context);
  const problems = [...new Set(context.problems)].slice(0, 4);
  const controls = prepared.controls;
  const snapshot = () => {
    const inputs = controls.map((d) => `${clean(d.name, 25)}=${typeof values[d.name] === "string" ? JSON.stringify(clean(values[d.name], d.maxlen || 120)) : values[d.name]}`).join(", ");
    const outputs = prepared.derivations.filter((d) => Object.hasOwn(derived.vars, d.name)).map((d) => `${d.name}=${derived.vars[d.name]}`).join(", ");
    return `Scenario inputs: ${inputs}${outputs ? "; calculated: " + outputs : ""}`;
  };
  return shell(attrs, jsxs5("div", { children: [
    controls.length > 0 && jsxs5("div", { style: { ...rowCss, justifyContent: "flex-end", paddingBottom: 11, marginBottom: 11, borderBottom: `1px solid ${BORDER}` }, children: [
      jsx6("span", { style: { ...sub, marginRight: "auto" }, children: `${controls.length} linked ${controls.length === 1 ? "control" : "controls"} \xB7 ${persistenceKey ? "saved locally" : "local to this message"}` }),
      jsx6("button", { type: "button", style: { ...btn, fontSize: 11 }, onClick: () => setValues({ ...prepared.defaults }), children: "Reset" }),
      persistenceKey && jsx6("button", { type: "button", style: { ...btn, fontSize: 11 }, onClick: () => {
        setValues({ ...prepared.defaults });
        try {
          pluginContext?.storage?.set(persistenceKey, null);
        } catch {
        }
      }, children: "Clear saved" }),
      jsx6("button", { type: "button", style: { ...btn, fontSize: 11 }, onClick: () => void insertIntoChat(sessionId, snapshot()), children: "Use scenario in chat" })
    ] }),
    problems.length > 0 && jsx6("div", { role: "alert", style: { ...sub, padding: "8px 10px", marginBottom: 9, border: `1px solid ${BORDER}`, borderRadius: 8 }, children: "Some calculations could not resolve: " + problems.join("; ") }),
    tree
  ] }), "Composed layout");
}

// src/catalog.js
var NATIVE_MARKER = "[HERMES NATIVE UI]";
var RECIPE_EXAMPLE = '::intui{kind="recipe" title="Vanilla cake" servings="8" ingredients="240|g|flour;150|g|sugar;115|g|butter;2||eggs;120|ml|milk;2|tsp|baking powder;1|tsp|vanilla" steps="Heat oven to 175 \xB0C and grease the pan.|Cream butter and sugar. Beat in eggs and vanilla.|Fold in flour and baking powder, alternating with milk.|Bake until a skewer comes out clean, about 30 minutes.|Cool before slicing."}';
var NATIVE_GROUPS = [
  {
    match: /\b(?:charts?|graphs?|plots?|trends?|bars?|lines?|pie|donut|scatter|sparkline|visuali[sz]e|data)\b/i,
    examples: [
      '::intui{kind="bars" title="Weekly totals" labels="Mon|Tue" values="12|19" sample="true"}',
      '::intui{kind="line" title="Trend" labels="Jan|Feb|Mar" values="5|8|11" sample="true"}',
      '::intui{kind="donut" title="Budget split" labels="Parts|Labor" values="40|60" sample="true"}',
      '::intui{kind="scatter" title="Trade-offs" points="1:4|2:6|3:5" labels="A|B|C" x="Mass" y="Strength" sample="true"}',
      '::intui{kind="sparkline" title="Recent trend" values="2|4|3|7" label="Daily count" sample="true"}'
    ]
  },
  {
    match: /\b(?:tables?|metric|metrics|kpi|kpis|status|progress|gauge|specifications|properties|dashboard)\b/i,
    examples: [
      '::intui{kind="metric" title="Status" labels="Tasks|Issues" values="12|3" sample="true"}',
      '::intui{kind="progress" title="Build" label="Complete" value="73" max="100" unit="%" sample="true"}',
      '::intui{kind="gauge" title="Battery" label="Charge" value="77" min="0" max="100" unit="%" sample="true"}',
      '::intui{kind="kv" title="Machine" labels="Memory|Storage" values="16 GB|1 TB" sample="true"}',
      '::intui{kind="table" title="Parts" columns="Part|Cost" rows="Case|200;Cable|15" sample="true"}'
    ]
  },
  {
    match: /\b(?:cards?|steps?|guides?|timeline|schedule|roadmap|diagram|flowchart|flow|accordion|notice|explain|process)\b/i,
    examples: [
      '::intui{kind="cards" title="Alternatives" labels="A|B" values="Light|Strong" details="Easier to lift|Higher load"}',
      '::intui{kind="steps" title="Setup" items="Prepare|Test" details="Check the parts|Run a sample"}',
      '::intui{kind="timeline" title="Launch" dates="Week 1|Week 2" items="Design|Ship" details="Draft|Release" statuses="done|planned" sample="true"}',
      '::intui{kind="diagram" title="Pipeline" nodes="Input|Process|Output" links="0>1|1>2" details="Collect data|Transform it|Review result"}',
      '::intui{kind="accordion" title="Questions" labels="Why|How" contents="The reason|The method"}',
      '::intui{kind="notice" title="Check first" text="Verify measurements before cutting." tags="Preparation|Reminder"}'
    ]
  },
  {
    match: /\b(?:calculat\w*|estimat\w*|compar\w*|matrix|weights?|checklist|tabs?|options?|choices?|select|sliders?)\b/i,
    examples: [
      '::intui{kind="calc" title="Estimate" inputs="units:3:1:30:1" labels="Units" expression="units*125" result="Total" unit="NOK" sample="true"}',
      '::intui{kind="matrix" title="Weighted comparison" options="A|B" criteria="Cost|Quality" scores="8|7;6|9" weights="3|4" sample="true"}',
      '::intui{kind="checklist" title="Build checklist" items="Inspect parts|Assemble|Test"}',
      '::intui{kind="tabs" title="Details" tabs="Summary|Notes" contents="Main finding|Supporting notes"}',
      '::intui{kind="options" title="Choose a plan" choices="A|B" prompt="Explore plan [choice]"}'
    ]
  }
];
var LAYOUT_EXAMPLES = [
  '::intui{kind="layout" title="Interactive quote" sample="true" tree="col[row[slider(name=qty;label=Parts;value=3;min=1;max=30)~segmentedcontrol(name=rate;label=Material;values=12|20;labels=PLA|PETG;value=12)]~derive(name=total;expression=qty*rate)~when(test=qty>=5)[badge(text=Bulk order)]~tabview[tab(label=Quote)[result(label=Total;expression=total;unit=NOK)]~tab(label=Breakdown)[bars(labels=Rate|Total;values==rate|=total)]]]"}',
  '::intui{kind="layout" title="Project form" tree="col[form[textinput(name=project;label=Project;required=true;minlen=3)~datepicker(name=due;label=Deadline;required=true)~textarea(name=notes;label=Notes)~toggle(name=approved;label=Approved;required=true;value=0)~submit(text=Prepare draft;prompt=Plan $project for $due)]]"}'
];
function nativeInstructions(text, selected) {
  const policy = selected === "visual" ? "Mode: Visual. Prefer a working visual or interactive widget whenever it adds value." : "Mode: Auto. Use prose for ordinary questions; use a widget when requested or when it improves the answer.";
  const matched = NATIVE_GROUPS.filter((group) => group.match.test(text));
  const recipe = /\b(?:recip(?:e|ie)s?|cake|baking)\b/i.test(text);
  const layout = /\b(?:forms?|layout|dashboard|shared state|reactive|linked|persist\w*|sav(?:e|ed) (?:form|inputs)|tabview|date (?:field|picker))\b/i.test(text);
  const recipeGuide = "Recipe: use servings and ingredients as decimal quantity|unit|name; separate ingredient rows with ; and steps with |. An empty unit is valid. Include the complete recipe.";
  if (recipe && !matched.length && !layout) {
    return [
      policy,
      "Answer now with one interactive recipe in Hermes native format. Output ONLY one unquoted, unfenced ::intui directive on its own line. No preamble, plans, tool calls, OpenUI Lang, code or HTML.",
      recipeGuide + " Follow this shape and keep the whole directive under 1600 characters. Do not put quotes, newlines or braces inside attribute values.",
      RECIPE_EXAMPLE
    ].join("\n");
  }
  const useLayout = layout || selected === "visual" && !matched.length;
  const examples = matched.length ? matched.flatMap((group) => group.examples) : useLayout ? [] : NATIVE_GROUPS.map((group) => group.examples[0]);
  return [
    policy,
    'Render up to three standalone ::intui directives in this reply, separated by blank lines. Double-quote attributes, with no quotes, newlines or braces inside values. Never wrap directives in code fences. Do not emit OpenUI Lang, HTML or JS. Keep each line under 1600 characters. Use prose if a visual is inappropriate. Do not invent facts; label illustrations sample="true".',
    "Use the following shapes as references, and replace all sample content with the answer:",
    ...examples,
    ...recipe ? [recipeGuide, RECIPE_EXAMPLE] : [],
    ...useLayout ? [
      "Layout grammar: node(key=value;key=value)[child~child]. Containers include col, row, grid, box, card, section, stack, carousel, list, form, tabview, tab and when. Nodes include heading, text, caption, quote, link, badge and the standalone widgets. Encode literal ; ~ ( ) [ ] { } inside a value as %3B %7E %28 %29 %5B %5D %7B %7D. Keep nesting at most 5 levels and total nodes at most 32.",
      'Controls share named state: input/slider, select, toggle, segmented, textinput, textarea, dateinput. Use derive and result for numeric expressions, $name for text or draft insertion, and =name in chart values. Form submit validates required inputs and prepares a draft without sending it. Only when the user asks to save inputs, use persist="true" and a unique id on the outer layout.',
      ...LAYOUT_EXAMPLES
    ] : [],
    "Do not promise a widget or a later action. For an explicit native widget request, show the actual directive."
  ].join("\n");
}

// src/entry.js
var ID = "hermes-intelligent-ui";
var { host: host4, COMPOSER_AREAS, TRANSCRIPT_DIRECTIVE_AREA, atom, useValue } = sdk;
var mode = atom("off");
function renderDirective({ attrs = {}, sessionId }) {
  if (Object.keys(attrs).length > 26) return empty("Invalid Intelligent UI component.");
  const kind = clean(attrs.kind, 20).toLowerCase();
  const Widget = kind === "layout" ? LayoutWidget : getWidget(kind);
  if (!Widget) return empty("Unsupported Intelligent UI component: " + kind);
  return jsx7(Widget, { attrs, sessionId }, kind === "layout" ? hash(attrs.tree || "") : kind === "recipe" ? hash(JSON.stringify(attrs)) : void 0);
}
function Toggle() {
  const selected = useValue(mode);
  const next = { off: "auto", auto: "visual", visual: "off" }[selected] || "off";
  const label = { off: "Intelligent UI \xB7 Off", auto: "Intelligent UI \xB7 Auto", visual: "Intelligent UI \xB7 Visual" }[selected];
  return jsx7("button", {
    type: "button",
    title: `UI mode: ${selected}. Click to switch to ${next}.`,
    "aria-pressed": selected !== "off",
    "aria-label": `Intelligent UI: ${selected}. Switch to ${next}.`,
    style: {
      ...btn,
      gap: 6,
      whiteSpace: "nowrap",
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 11,
      color: selected !== "off" ? ACCENT : MUTED,
      borderColor: selected !== "off" ? ACCENT : BORDER,
      background: selected !== "off" ? `color-mix(in srgb, ${ACCENT} 12%, transparent)` : "transparent"
    },
    onClick: () => {
      mode.set(next);
      pluginContext?.storage?.set("mode", next);
      host4.notify({ kind: "info", message: next === "off" ? "Intelligent UI disabled." : `Intelligent UI: ${next} mode for new requests.` });
    },
    children: jsxs6("span", { style: { display: "inline-flex", alignItems: "center", gap: 5 }, children: [
      jsx7("span", { style: { fontSize: 12 }, children: "\u25C8" }),
      label
    ] })
  });
}
var entry_default = {
  id: ID,
  name: "Hermes Intelligent UI",
  description: "Composer Intelligent UI: inline interactive calculators, diagrams, charts, comparisons and native controls.",
  defaultEnabled: true,
  register(ctx) {
    setPluginContext(ctx);
    const storedMode = ctx.storage.get("mode", null);
    mode.set(["off", "auto", "visual"].includes(storedMode) ? storedMode : ctx.storage.get("enabled", false) === true ? "auto" : "off");
    if (typeof COMPOSER_AREAS?.actions === "string") {
      ctx.register({ id: "composer-mode-button", area: COMPOSER_AREAS.actions, order: 85, render: () => jsx7(Toggle, {}) });
    } else if (typeof COMPOSER_AREAS?.bottom === "string") {
      ctx.register({ id: "composer-mode-button", area: COMPOSER_AREAS.bottom, order: 85, render: () => jsx7(Toggle, {}) });
    }
    if (typeof COMPOSER_AREAS?.middleware === "string") {
      ctx.register({ id: "composer-ui-instructions", area: COMPOSER_AREAS.middleware, data: {
        handler(draft) {
          if (mode.get() === "off" || !draft || typeof draft.text !== "string") return draft;
          if (!draft.text.trim() || /^\s*\//.test(draft.text) || draft.text.includes(NATIVE_MARKER)) return draft;
          return { ...draft, text: draft.text + "\n\n--- Attached Context ---\n\n" + NATIVE_MARKER + "\n" + nativeInstructions(draft.text, mode.get()) };
        }
      } });
    }
    if (typeof TRANSCRIPT_DIRECTIVE_AREA === "string") {
      ctx.register({ id: "inline-ui-renderer", area: TRANSCRIPT_DIRECTIVE_AREA, data: { name: "intui", render: renderDirective } });
    } else {
      host4.notify({ kind: "warning", message: "This Hermes Desktop build lacks inline transcript directives. Update Hermes to use Intelligent UI." });
    }
    ctx.onDispose(() => {
      setPluginContext(null);
      mode.set("off");
    });
  }
};
export {
  entry_default as default
};
