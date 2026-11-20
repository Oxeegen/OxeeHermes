---
name: oxeegen-style-kit
description: "Oxeegen standard for all deliverables: toggle, no green."
version: 1.0.0
author: Oxeegen (Clark)
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [oxeegen, style, design, brand, theme, html]
    related_skills: [popular-web-designs, architecture-diagram]
---

# Oxeegen Style Kit Skill

The Oxeegen house look and quality bar for every HTML page, document, deck, dashboard, chart, HTML
email or widget made for the user or an Oxeegen client. It ships the written standard, a starter
template with the palette, theme toggle and tooltips already wired, and the official logos. It does
not cover the Oxeegen website itself.

## When to Use

- Before producing ANY visual deliverable: HTML page, report, dashboard, deck, chart, widget, HTML email.
- When the user asks for something "Oxeegen-style", branded, or for a client.
- When reviewing a deliverable against the standard.

## Prerequisites

None: no network, no install. Everything is in this skill's folder:

| Path (relative to this skill) | What |
|---|---|
| `references/oxeegen-style-guide.md` | The full written standard (it wins when in doubt) |
| `templates/oxeegen-starter.html` | Reference implementation to copy from (uses `../assets/`) |
| `assets/oxee-mark.svg` | Vector mark, brand gradient (any size) |
| `assets/oxee-icon-192.png` | Raster mark, fallback / favicon |
| `assets/logo-oxeegen-purple.png` | Full lockup for light surfaces (5.2:1) |
| `assets/logo-oxeegen-light-for-dark.png` | Full lockup for dark surfaces |
| `assets/logo-oxeegen-blue.png`, `-orange.png`, `-pink.png` | Accent-matched lockup variants |

## How to Run

1. `read_file` `references/oxeegen-style-guide.md` the first time in a session.
2. `read_file` `templates/oxeegen-starter.html` and build the deliverable from it with `write_file`
   and `patch`: never write the theme, palette or tooltip code from scratch.
3. Deliver a single self-contained file: inline the logos as data-URIs, or copy the `assets/` files
   next to the deliverable so the relative paths resolve.

## Quick Reference

**Non-negotiables**

1. **Light/dark toggle**: a `◐` button, localStorage (`ox:theme`) with the system theme as default;
   both themes checked before delivery.
2. **No green**: positive / success / progress is Solarize blue `#268bd2` (dark `#5fb4e8`); never
   ✅ 🟢 🟩. Semantic ok/warn/err states are the only exception, and blue is still preferred.
3. **Logos from the kit**: never a screenshot, never stretched (lockup 5.2:1), never recolored by CSS.
4. **Self-contained**: inline CSS/JS, data-URI or relative `assets/`, zero CDN or network dependency.

**Tokens**

- Light: page `#f9f9f7`, surface `#fcfcfb`, ink `#0b0b0b`, grid `#e1e0d9`.
- Dark: page `#0d0d0d` (neutral gray, never navy), surface `#1a1a19`, ink `#f0efec`, grid `#2c2c2a`.
- Accents: blurple `#5e4af5` (dark `#8a7cf7`) · Solarize blue `#268bd2` (dark `#5fb4e8`) · fuchsia
  `#ef2076` (dark `#f561a4`) · orange `#ed5818` (dark `#ff8a52`) · cyan `#00cfff` · amber
  `#b45309` / `#fbbf24` · red `#c0392b` / `#f87171`.
- Ratio: 70% neutrals, 20% blurple, 10% other accents. One hero accent per page.

**Patterns**

- Info dots: `ⓘ` with a `data-info` attribute and the template's fixed tooltip; never `title` for content.
- Graphics in inline SVG + CSS (animated schema flows, conic-gradient gauges, gradient bars,
  `color-mix` heat tables, count-up on scroll); honour `prefers-reduced-motion`; motion 150–300 ms.
- Lightness: generous whitespace, 12–16 px radius, hairline borders, surface-on-page cards, tabular
  numerals; no purple gradients, no generic AI styling.

## Procedure

1. Copy the starter template; remove its demo sections but keep the theme block, the tooltip
   handler, the palette variables and the logo markup.
2. Add the content and data; put detail behind info dots; draw graphics in SVG/CSS, not screenshots.
3. Brand it: icon or lockup in the header, version and date in the footer.
4. Run the checks in **Verification**, then deliver.

## Pitfalls

- Do not take colors from the live Oxeegen website: its WordPress theme ships stale values
  (`#6442ff`, `#4232ff`). The tokens above are canonical.
- A dark theme in navy or blue-black is wrong: dark is a neutral gray.
- Logo files are lowercase (`logo-oxeegen-purple.png`): a different case breaks on macOS and Linux.
- Opening the template straight from disk can block `../assets/` in some browsers: serve the folder
  or inline the logos.

## Verification

- Both themes render correctly, and the toggle persists across a reload (localStorage `ox:theme`).
- Mobile at 400 px wide and print preview both hold.
- `search_files` for `green|✅|🟢|🟩` in the deliverable returns nothing.
- No external URL is loaded (fonts, scripts, images).
- The icon or lockup and a version/date footer are present.
