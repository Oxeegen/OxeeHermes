// Rasterizes brand SVGs to PNGs with a transparent background.
// usage: node raster.cjs <assetsDir> <outDir>
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const [src, out] = process.argv.slice(2)

// [svg, outName, size, inset]  inset = tile size inside the canvas (macOS grid: 824 of 1024)
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
const jobs = []
for (const s of SIZES) {
  jobs.push(['icon.svg', `icon-${s}.png`, s, s])
  jobs.push(['icon-dark.svg', `icon-dark-${s}.png`, s, s])
}
jobs.push(['icon.svg', 'icon.png', 1024, 1024])
jobs.push(['icon-dark.svg', 'icon-dark.png', 1024, 1024])
jobs.push(['icon-dev.svg', 'icon-dev.png', 1024, 1024])
jobs.push(['icon.svg', 'icon-mac.png', 1024, 824])
jobs.push(['icon-dark.svg', 'icon-dark-mac.png', 1024, 824])
jobs.push(['icon.svg', 'apple-touch-icon.png', 180, 180])
for (const s of [16, 32, 64]) {
  jobs.push(['icon-mono.svg', `tray-${s}.png`, s, s])
  jobs.push(['icon-mono-black.svg', `trayTemplate-${s}.png`, s, s])
}

;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const [svg, name, size, inset] of jobs) {
    const data = fs.readFileSync(path.join(src, svg), 'utf8')
    const off = (size - inset) / 2
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(
      `<html><body style="margin:0;background:transparent">` +
        `<div style="position:absolute;left:${off}px;top:${off}px;width:${inset}px;height:${inset}px">` +
        data.replace('<svg ', `<svg width="${inset}" height="${inset}" `) +
        `</div></body></html>`
    )
    await page.screenshot({ path: path.join(out, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  }
  await browser.close()
  console.log(`${jobs.length} PNG`)
})()
