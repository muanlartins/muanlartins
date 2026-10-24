// Renders public/stream/transicao.html into public/stream/transicao.webm, the
// OBS stinger: 60 fps, VP9 with transparency, at the OBS canvas size
// (default 2560×1440; the page scales itself to it).
//
//   CHROME=/path/to/chrome node brand/twitch/transicao.mjs [width]
//
// Needs Node, ffmpeg, a Chrome or Chromium binary and playwright-core
// (npm i --no-save playwright-core). Serves public/ itself, since the page
// loads /brand/mark.svg from the site's root.
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { extname, join, normalize } from "node:path"
import { chromium } from "playwright-core"

const SITE = new URL("../..", import.meta.url).pathname
const PUBLIC = join(SITE, "public")
const OUT = join(PUBLIC, "stream", "transicao.webm")
const FPS = 60
const WIDTH = Number(process.argv[2] ?? 2560)
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".ttf": "font/ttf" }

const server = createServer((req, res) => {
  const path = join(PUBLIC, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)))
  try {
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" }).end(readFileSync(path))
  } catch {
    res.writeHead(404).end()
  }
}).listen(0)
const { port } = server.address()

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] })
const page = await browser.newPage({ viewport: { width: WIDTH, height: Math.round((WIDTH * 9) / 16) } })
await page.goto(`http://localhost:${port}/stream/transicao.html?render`)
await page.evaluate(() => Promise.all([window.ready, document.fonts.ready]))
const duration = await page.evaluate(() => window.DURATION)

const frames = mkdtempSync(join(tmpdir(), "transicao-"))
const count = Math.round(duration * FPS) + 1
for (let i = 0; i < count; i++) {
  await page.evaluate((t) => window.render(t), i / FPS)
  writeFileSync(join(frames, `${String(i).padStart(4, "0")}.png`), await page.screenshot({ omitBackground: true }))
}
await browser.close()
server.close()

// yuva420p keeps the alpha channel; OBS reads it from VP9 WebM.
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "%04d.png"),
  "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", "28", "-b:v", "0", "-auto-alt-ref", "0", OUT], { stdio: "inherit" })
rmSync(frames, { recursive: true })
console.log(`${OUT}: ${WIDTH} px, ${count} frames, ${(duration * 1000).toFixed(0)} ms. OBS transition point: 600 ms.`)
