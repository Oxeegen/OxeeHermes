# Oxeegen Style Guide

**Standard for every deliverable an Oxee agent produces for the user or for Oxeegen clients.**
Version 1.0 · 2026-11-10 · Maintainer: Clark · Companion: this skill's `assets/` and `templates/`

> Why: clients regularly tell us our AI output is "better than your AI" when it comes from Claude-generated
> docs. This standard exists so every Oxee agent matches (and beats) that bar. It is mandatory, not aspirational.

---

## 0. The four non-negotiables

1. **Light/dark toggle.** Every HTML deliverable ships a `◐` theme button (localStorage-persisted,
   default = system). When the format can't host it (PDF, slide export), render BOTH variants or use the
   light version on light surfaces only — never ship one fixed dark design.
2. **No green. Ever.** House rule. Positive/success/progress = **Solarize blue** `#268bd2`
   (dark `#5fb4e8`), NOT green. This includes emoji: never ✅ 🟢 🟩 — use 🟦 🔵 or plain text.
   Only exception: semantic UI states where green/amber/red is the industry convention (e.g. a strict
   status column), and even then prefer blue for positive.
3. **Logos from the kit, never screenshots.** Vector mark `assets/oxee-mark.svg` (gradient `#6c2bff→#5e4af5→#4a0bf9`)
   or `oxee-icon-192.png` for the icon; `logo-oxeegen-purple.png` (light surfaces) and
   `logo-oxeegen-light-for-dark.png` (dark surfaces) for the full lockup. Other color variants:
   `logo-oxeegen-blue/orange/pink.png`.
4. **Self-contained.** One file, zero CDN/network deps: inline CSS/JS, logos as data-URI or relative
   `assets/` next to the file. Never link a Google Font, a CDN chart lib, or an external image host.

---

## 1. Palette

The values below are canonical (they come from the Oxeegen website's own stylesheet).
Do **not** scrape goxeegen.com for values (WordPress ships stale `#6442ff`/`#4232ff`).

### Bases (light / dark)

| Token | Light | Dark |
|---|---|---|
| page | `#f9f9f7` | `#0d0d0d` (deep NEUTRAL gray — never navy/blue) |
| surface | `#fcfcfb` | `#1a1a19` |
| surface-2 | `#f3f2ee` | `#232321` |
| ink | `#0b0b0b` | `#f0efec` |
| ink-2 / muted | `#52514e` / `#7a7873` | `#c3c2b7` / `#9a988f` |
| grid / axis | `#e1e0d9` / `#c3c2b7` | `#2c2c2a` / `#383835` |

### Accents (Oxeegen brand)

| Name | Light | Dark | Role |
|---|---|---|---|
| Blurple (main) | `#5e4af5` | `#8a7cf7` (AA-safe) | links, primary buttons, active states |
| Solarize blue | `#268bd2` | `#5fb4e8` | **positive, success, progress, data/heat, charts** |
| Fuchsia | `#ef2076` | `#f561a4` | secondary accent, proprietary/closed tags |
| Orange | `#ed5818` | `#ff8a52` | tertiary accent, warm highlights |
| Cyan | `#00cfff` | `#00cfff` | electric: gradients, streaks, glow — sparingly |
| Amber | `#b45309` | `#fbbf24` | best-in-row, caution/highlights |
| Red | `#c0392b` | `#f87171` | negative only |

Usage ratio: 70% neutrals, 20% blurple, 10% other accents. One hero accent per page.

---

## 2. Logos

| File | What | Use |
|---|---|---|
| `assets/oxee-mark.svg` | Vector mark (official favicon geometry: circle, two slits, center bar; brand gradient) | headers, favicons, print, anywhere crispness matters — `currentColor` variant possible |
| `assets/oxee-icon-192.png` | Raster mark, 192×192 | fallback / favicon (larger: use the SVG) |
| `assets/logo-oxeegen-purple.png` | Full lockup (icon + wordmark), 1200×231 | light surfaces |
| `assets/logo-oxeegen-light-for-dark.png` | Full lockup recolored for dark | dark surfaces |
| `assets/logo-oxeegen-blue/orange/pink.png` | Lockup variants | when accent-matched |

Rules: keep aspect (5.2:1), height ≥ 26px in UI, ≥ 120px as a document header. Never stretch,
never recolor the wordmark by CSS hacks (use the right variant), clearspace ≈ height of the icon on
all sides.

---

## 3. The light/dark toggle (paste-ready)

```css
:root{ color-scheme:light; /* light tokens */ }
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){ color-scheme:dark; /* dark tokens */ }
}
:root[data-theme="dark"]{ color-scheme:dark; /* dark tokens (duplicate block) */ }
```

```js
const store={get(k,d){try{const v=localStorage.getItem("ox:"+k);return v===null?d:JSON.parse(v)}catch(e){return d}},
             set(k,v){try{localStorage.setItem("ox:"+k,JSON.stringify(v))}catch(e){}}};
document.documentElement.dataset.theme=store.get("theme",null)||"";
const btn=document.querySelector("#themeBtn");
btn?.addEventListener("click",()=>{const c=document.documentElement.dataset.theme||
  (matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
  document.documentElement.dataset.theme=c==="dark"?"light":"dark";
  store.set("theme",document.documentElement.dataset.theme);});
```

Button markup: `<button class="btn iconbtn" id="themeBtn" title="Toggle light / dark">◐</button>`.
Verify both themes in a real browser before delivering. Always test with light + dark + print.

---

## 4. The info-dot pattern (clutter control)

Long explanations, caveats, sources, settings → behind a `ⓘ` dot, never in the main text:

```html
<span class="info" data-info="Full explanation lives here">i</span>
```

```css
.info{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;
  border:1px solid var(--axis);color:var(--muted);font-size:10.5px;cursor:help}
```

```js
const tip=document.querySelector("#tip");
document.querySelectorAll(".info").forEach(el=>{
  el.addEventListener("mouseenter",ev=>{tip.innerHTML=el.dataset.info;tip.classList.add("on");moveTip(ev)});
  el.addEventListener("mouseleave",()=>tip.classList.remove("on"));
});
```

Rule of thumb: one dot per row/card max; if a paragraph needs sentence three, it's dot material.

---

## 5. Graphics & animation (the "stunning" bar)

Prefer **inline SVG + CSS rendering** over images: crisp at any zoom, themable via CSS vars, animatable,
diffable, zero deps. Recipes (all in `templates/oxeegen-starter.html`, copy from there):

- **Architecture schemas** — `rect`/`circle`/`line` nodes + `stroke-dasharray` animated flow lines
  (`@keyframes flow{to{stroke-dashoffset:-26}}`); use `var(--blue)`/`var(--brand)` for flows, never green.
- **Metrics** — `conic-gradient` gauges, flex/grid bar charts with gradient fills, heat-marked tables
  (`color-mix(in oklab,var(--seq) N%,var(--surface))`).
- **Motion** — count-up numbers (IntersectionObserver + `setInterval`), fade-up hero reveals, glow
  radial-gradients, `prefers-reduced-motion` respected. Motion must be subtle: 150–300ms, ease-out.
- **Layout lightness (Anthropic/Claude grade)** — generous white space, 12–16px radius, hairline
  `1px` borders, surface-on-page card hierarchy, max-width reading column (~960–1180px), tabular
  numerals for data, no purple gradients, no shadcn-gray look-alike defaults.
- **Charts:** always label axes/units; sort data; highlight the winner with amber ★ or accent, not green.

## 6. Deliverable checklist (run before sending)

- [ ] `◐` toggle present, works, persists, defaults to system
- [ ] **0 green** (hex, emoji, rgba, screenshot) — positive is blue
- [ ] Logos from kit, correct variant per theme, not stretched
- [ ] Info dots carry the detail; main text scannable
- [ ] Self-contained single file (no CDN); images = data-URI or local `assets/`
- [ ] SVG/CSS graphics, not screenshots; both themes render correctly
- [ ] Typography: max 2 families (system stack fine), ≤ 3 sizes per section, `::selection` styled
- [ ] Header/footer with brand, version date, and "Oxeegen" lockup
- [ ] Open in browser: verify light, dark, mobile width (~400px), print (if doc)

## 7. Folder map

```
oxeegen-style-kit/
├── SKILL.md
├── references/oxeegen-style-guide.md   ← this file
├── templates/oxeegen-starter.html      ← the reference implementation (uses ../assets/)
└── assets/    (oxee-mark.svg, logos, icon PNG)
```
