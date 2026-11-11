import type { Category } from "@/lib/valorant-catalog"
import type { InventoryWeapon } from "@/lib/valorant-inventory"

/**
 * A loadout as one picture to share: the weapons in three columns of seven, grouped as the game's collection groups
 * them, each with its skin's render (or its standard skin, faint, while open), on the brand's navy. Drawn on a canvas
 * in the browser; the renders come from valorant-api.com's CDN, which allows it (lib/valorant-catalog.ts).
 */

export type Format = "retrato" | "paisagem"

export const FORMATS: Record<Format, { width: number; height: number }> = {
  retrato: { width: 1080, height: 1350 },
  paisagem: { width: 1920, height: 1080 },
}

/** Seven weapons a column: pistols and the knife; SMGs, shotguns and snipers; rifles and machine guns. */
const COLUMNS: Category[][] = [
  ["sidearms", "melee"],
  ["smgs", "shotguns", "snipers"],
  ["rifles", "heavies"],
]

const NAVY = "#001447"
const CLARO = "#85a7ff"
const PAPER = "#f4f5f7"

export interface ImageText {
  /** Above the name: "Loadout dos sonhos". */
  title: string
  /** Whose: a login, or "Meu loadout" for someone not signed in. */
  who: string
  /** "17 de 21 armas". */
  count: string
  /** For a weapon with no skin picked. */
  open: string
  /** Where to build one: the site's address, without https. */
  link: string
  /** Riot's art credit, small. */
  credit: string
}

function image(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    // Its own request in CORS mode, apart from the copy the page already drew without it.
    img.src = src.startsWith("http") ? `${src}?para=canvas` : src
  })
}

function fit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function clip(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(cut + "…").width > width) cut = cut.slice(0, -1)
  return cut.trimEnd() + "…"
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** The picture, as a PNG. `font` is the page's font family, already loaded. */
export async function drawLoadout(board: InventoryWeapon[], text: ImageText, format: Format, font: string): Promise<Blob> {
  const { width, height } = FORMATS[format]
  const wide = format === "paisagem"
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  const type = (weight: number, size: number) => `${weight} ${size}px ${font}`
  await Promise.all([500, 600].map((weight) => document.fonts?.load(type(weight, 24)).catch(() => null)))

  const shown = (weapon: InventoryWeapon) => weapon.ideal?.variants[0] ?? weapon.current.skin.chromas[0]
  const standardOf = (weapon: InventoryWeapon) => (weapon.ideal ? null : weapon.current.skin.standard ? weapon.current.skin : null)
  const [renders, swatches, mark] = await Promise.all([
    Promise.all(board.map((weapon) => image(weapon.ideal ? shown(weapon).image : (standardOf(weapon)?.chromas[0].image ?? weapon.current.skin.chromas[0].image)))),
    // A variant's swatch, only when it isn't the skin itself.
    Promise.all(board.map((weapon) => (weapon.ideal && shown(weapon).swatch && shown(weapon).id !== weapon.ideal.skin.chromas[0].id ? image(shown(weapon).swatch!) : null))),
    image("/brand/mark-on-klein.svg"),
  ])

  // The ground: navy, a Klein (#002fa7) glow from the top right.
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, width, height)
  const glow = ctx.createRadialGradient(width * 0.85, -height * 0.1, 0, width * 0.85, -height * 0.1, Math.max(width, height) * 0.9)
  glow.addColorStop(0, "rgba(0, 47, 167, 0.85)")
  glow.addColorStop(1, "rgba(0, 47, 167, 0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  const margin = wide ? 64 : 56
  const header = wide ? 150 : 176
  const footer = wide ? 92 : 104

  // Whose loadout.
  ctx.textBaseline = "alphabetic"
  ctx.fillStyle = CLARO
  ctx.font = type(600, wide ? 26 : 28)
  ctx.letterSpacing = "4px"
  ctx.fillText(text.title.toUpperCase(), margin, margin + 22)
  ctx.letterSpacing = "0px"
  ctx.fillStyle = PAPER
  ctx.font = type(600, wide ? 64 : 72)
  ctx.fillText(clip(ctx, text.who, width - margin * 2 - 260), margin, margin + (wide ? 92 : 104))
  ctx.textAlign = "right"
  ctx.fillStyle = CLARO
  ctx.font = type(500, wide ? 26 : 28)
  ctx.fillText(text.count, width - margin, margin + (wide ? 92 : 104))
  ctx.textAlign = "left"

  // The weapons.
  const gap = wide ? 16 : 14
  const top = margin + header - 24
  const bottom = height - margin - footer + 12
  const columnWidth = (width - margin * 2 - gap * 2) / 3
  const rowHeight = (bottom - top - gap * 6) / 7
  COLUMNS.forEach((groups, column) => {
    const inColumn = board.filter((weapon) => groups.includes(weapon.category)).sort((a, b) => groups.indexOf(a.category) - groups.indexOf(b.category))
    inColumn.slice(0, 7).forEach((weapon, row) => {
      const index = board.indexOf(weapon)
      const x = margin + column * (columnWidth + gap)
      const y = top + row * (rowHeight + gap)
      const picked = !!weapon.ideal
      roundRect(ctx, x, y, columnWidth, rowHeight, 14)
      if (picked) {
        const fill = ctx.createLinearGradient(x, y, x + columnWidth, y + rowHeight)
        fill.addColorStop(0, "rgba(0, 47, 167, 0.92)")
        fill.addColorStop(1, "rgba(0, 47, 167, 0.55)")
        ctx.fillStyle = fill
        ctx.fill()
        ctx.strokeStyle = "rgba(133, 167, 255, 0.35)"
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
        ctx.stroke()
      } else {
        ctx.strokeStyle = "rgba(133, 167, 255, 0.3)"
        ctx.lineWidth = 1.5
        ctx.setLineDash([8, 7])
        ctx.stroke()
        ctx.setLineDash([])
      }

      const pad = wide ? 18 : 16
      const render = renders[index]
      ctx.save()
      ctx.globalAlpha = picked ? 1 : 0.16
      if (render) {
        if (wide) fit(ctx, render, x + pad, y + pad * 0.7, columnWidth * 0.52 - pad, rowHeight - pad * 1.4)
        else fit(ctx, render, x + pad * 1.5, y + pad * 0.8, columnWidth - pad * 3, rowHeight * 0.6 - pad * 0.8)
      }
      ctx.restore()

      const name = picked ? weapon.ideal!.skin.name : text.open
      const variant = picked && shown(weapon).id !== weapon.ideal!.skin.chromas[0].id ? shown(weapon).name : ""
      const swatch = swatches[index]
      if (wide) {
        const tx = x + columnWidth * 0.52 + 10
        const tw = columnWidth - (tx - x) - pad
        ctx.fillStyle = CLARO
        ctx.font = type(500, 19)
        ctx.fillText(clip(ctx, weapon.name, tw), tx, y + rowHeight / 2 - 16)
        ctx.fillStyle = picked ? PAPER : "rgba(244, 245, 247, 0.55)"
        ctx.font = type(600, 25)
        ctx.fillText(clip(ctx, name, tw), tx, y + rowHeight / 2 + 14)
        if (variant) {
          ctx.fillStyle = "rgba(244, 245, 247, 0.7)"
          ctx.font = type(500, 18)
          const vx = swatch ? tx + 24 : tx
          if (swatch) drawSwatch(ctx, swatch, tx, y + rowHeight / 2 + 26, 18)
          ctx.fillText(clip(ctx, variant, tw - (vx - tx)), vx, y + rowHeight / 2 + 41)
        }
      } else {
        const tw = columnWidth - pad * 2
        const ty = y + rowHeight - pad
        ctx.fillStyle = picked ? PAPER : "rgba(244, 245, 247, 0.55)"
        ctx.font = type(600, 22)
        ctx.fillText(clip(ctx, name, tw - (swatch ? 26 : 0)), x + pad, ty - 24)
        ctx.fillStyle = CLARO
        ctx.font = type(500, 17)
        ctx.fillText(clip(ctx, variant ? `${weapon.name} · ${variant}` : weapon.name, tw), x + pad, ty)
        if (swatch) drawSwatch(ctx, swatch, x + columnWidth - pad - 18, ty - 42, 18)
      }
    })
  })

  // Where it's from.
  const fy = height - margin - (wide ? 44 : 50)
  const size = wide ? 44 : 50
  if (mark) {
    ctx.save()
    roundRect(ctx, margin, fy, size, size, 8)
    ctx.clip()
    ctx.drawImage(mark, margin, fy, size, size)
    ctx.restore()
  }
  ctx.fillStyle = PAPER
  ctx.font = type(600, wide ? 24 : 26)
  ctx.fillText("muanlartins", margin + size + 16, fy + size / 2 - 3)
  ctx.fillStyle = CLARO
  ctx.font = type(500, wide ? 19 : 20)
  ctx.fillText(text.link, margin + size + 16, fy + size / 2 + 22)
  ctx.textAlign = "right"
  ctx.fillStyle = "rgba(244, 245, 247, 0.45)"
  ctx.font = type(500, wide ? 16 : 16)
  ctx.fillText(text.credit, width - margin, fy + size / 2 + 22)
  ctx.textAlign = "left"

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/png"))
}

function drawSwatch(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, x, y, size, size)
  ctx.restore()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.strokeStyle = "rgba(244, 245, 247, 0.35)"
  ctx.lineWidth = 1
  ctx.stroke()
}
