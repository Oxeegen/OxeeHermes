// Copies the Oxeegen icon set over the upstream files the desktop reads by
// fixed path, and renders the platform-specific variants (MSIX tiles, macOS 26
// Icon Composer layers). Re-run after every upstream merge.
//
//   node oxeegen/scripts/apply-desktop-assets.cjs
//
// Prerequisite: oxeegen/assets/generated is up to date (see oxeegen/assets/README.md).
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'oxeegen/assets')
const GEN = path.join(SRC, 'generated')
const DESKTOP = path.join(ROOT, 'apps/desktop')

const COPIES = [
  ['icon.png', 'assets/icon.png'],
  ['icon.ico', 'assets/icon.ico'],
  ['icon.icns', 'assets/icon.icns'],
  ['icon-dark.png', 'assets/icon-dark.png'],
  ['icon-dark.ico', 'assets/icon-dark.ico'],
  ['icon-dark.icns', 'assets/icon-dark.icns'],
  ['icon-mac.png', 'assets/icon-mac.png'],
  ['icon.icns', 'packaging/dmg-volume.icns'],
  ['apple-touch-icon.png', 'public/apple-touch-icon.png']
]

// In-app brand badge (BrandMark) and anything else the renderer shows.
const SVG_COPIES = [
  ['icon.svg', 'public/oxeegen-icon.svg'],
  ['icon-dark.svg', 'public/oxeegen-icon-dark.svg'],
  // Titlebar and empty-chat wordmark (src/oxeegen/brand.tsx)
  ['wordmark/oxee-hermes-wordmark-light.svg', 'public/oxee-hermes-wordmark.svg'],
  ['wordmark/oxee-hermes-wordmark-dark.svg', 'public/oxee-hermes-wordmark-dark.svg']
]

const svg = name => fs.readFileSync(path.join(SRC, name), 'utf8')

// White glyph on a transparent 1024 canvas, at its in-tile position: the Icon
// Composer art layer sits over the package's own fill.
const glyphArt = svg('icon-mono.svg').replace(/viewBox="[^"]*"/, 'viewBox="0 0 1024 1024"')

async function render(page, markup, file, width, height, inset = Math.min(width, height)) {
  await page.setViewportSize({ width, height })
  await page.setContent(
    '<html><body style="margin:0;background:transparent">' +
      `<div style="position:absolute;left:${(width - inset) / 2}px;top:${(height - inset) / 2}px;` +
      `width:${inset}px;height:${inset}px">` +
      markup.replace('<svg ', `<svg width="${inset}" height="${inset}" `) +
      '</div></body></html>'
  )
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width, height } })
}

function pngSize(file) {
  const b = fs.readFileSync(file)

  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

;(async () => {
  for (const [from, to] of [...COPIES, ...SVG_COPIES]) {
    fs.copyFileSync(path.join(from.endsWith('.svg') ? SRC : GEN, from), path.join(DESKTOP, to))
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  // MSIX tiles: keep every upstream file name and pixel size.
  const appx = path.join(DESKTOP, 'assets/appx')
  const tile = svg('icon.svg')

  for (const name of fs.readdirSync(appx).filter(n => n.endsWith('.png'))) {
    const file = path.join(appx, name)
    const [w, h] = pngSize(file)
    // Wide tiles show the square icon centred; square ones fill edge to edge.
    await render(page, tile, file, w, h, w === h ? w : Math.round(h * 0.7))
  }

  // macOS 26 Icon Composer package: white glyph layers over the brand fill.
  const icon = path.join(DESKTOP, 'assets/icon.icon')

  for (const name of ['art-light.png', 'art-dark.png', 'mono.png']) {
    await render(page, glyphArt, path.join(icon, 'Assets', name), 1024, 1024)
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(icon, 'icon.json'), 'utf8'))
  // #5E4AF5 (light) and the dark-tile ink #18181B, as Icon Composer sRGB floats.
  manifest['fill-specializations'] = [
    { value: { solid: 'srgb:0.36863,0.29020,0.96078,1.00000' } },
    { appearance: 'dark', value: { solid: 'srgb:0.09412,0.09412,0.10588,1.00000' } }
  ]
  fs.writeFileSync(path.join(icon, 'icon.json'), JSON.stringify(manifest, null, 2) + '\n')

  await browser.close()
  console.log('desktop assets applied')
})()
