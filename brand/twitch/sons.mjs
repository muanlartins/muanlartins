// Renders the stream's sound effects (public/stream/sons.js) to WAV files in brand/twitch/sons/, which OBS plays
// as media sources (brand/twitch/obs.py; copy them to Documents\muanlartins-obs\sons on the stream PC).
//
//   CHROME=/path/to/chrome node brand/twitch/sons.mjs [name…]
//
// Needs ffmpeg, a Chrome or Chromium binary and playwright-core, like transicao.mjs. Each comes out at -16 LUFS,
// so they sit at the same level under the voice (OBS's mixer sets the rest). The noise in the recipes is random,
// so each render differs a little; render again only the ones to change.
import { execFileSync, spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright-core"

const SITE = new URL("../..", import.meta.url).pathname
const OUT = join(SITE, "brand", "twitch", "sons")
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] })
const page = await browser.newPage()
await page.setContent("<!doctype html><title>sons</title>")
await page.addScriptTag({ content: readFileSync(join(SITE, "public", "stream", "sons.js"), "utf8") })
const names = process.argv.slice(2).length ? process.argv.slice(2) : await page.evaluate(() => Object.keys(window.Sons.RECIPES))
for (const name of names) {
  const bytes = await page.evaluate(async (n) => Array.from(await window.Sons.wav(n)), name)
  const file = join(OUT, `${name}.wav`)
  writeFileSync(file, Buffer.from(bytes))
  const before = loudness(file)
  const tmp = file.replace(/\.wav$/, ".tmp.wav")
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-af", `volume=${(-16 - before).toFixed(2)}dB,alimiter=limit=0.84:level=false`, "-c:a", "pcm_s16le", tmp])
  renameSync(tmp, file)
  console.log(`${name}.wav  ${before.toFixed(1)} → ${loudness(file).toFixed(1)} LUFS`)
}
await browser.close()

/** A file's integrated loudness, from ffmpeg's EBU R128 summary (which it writes to stderr). */
function loudness(file) {
  const { stderr } = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" })
  return Number(/Summary:[\s\S]*?I:\s+(-?[\d.]+) LUFS/.exec(stderr)?.[1])
}
