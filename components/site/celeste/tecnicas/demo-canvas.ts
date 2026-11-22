import type { Demo, DemoTake, Footage } from "@/lib/celeste-demo"

export interface Sheets {
  scene: HTMLImageElement
  /** The rival alone, when there's one to show. */
  ghost?: { id: string; image: HTMLImageElement }
}

let scratch: HTMLCanvasElement | undefined

/**
 * One frame on the canvas, which is the game's own pixels: the picture as filmed, the rival cut out and tinted over
 * it, both trails from the zero on and, asked, the hitboxes.
 */
export function drawFrame(
  context: CanvasRenderingContext2D,
  {
    demo,
    footage,
    take,
    ghost,
    at,
    sheets,
    boxes,
    colour,
  }: { demo: Demo; footage: Footage; take: DemoTake; ghost?: DemoTake; at: number; sheets: Sheets; boxes: boolean; colour: { ok: string; fail: string; box: string } },
) {
  const { width, height, crop, sheet } = footage
  const index = at + demo.zero - footage.from
  const filmed = footage.takes[take.id]
  const [camX, camY] = filmed.cam[index]
  const toX = (x: number) => Math.round(x - camX - crop[0])
  const toY = (y: number) => Math.round(y - camY - crop[1])
  const paint = (each: DemoTake) => (each.ok ? colour.ok : colour.fail)

  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)
  context.drawImage(sheets.scene, (index % sheet.columns) * width, Math.floor(index / sheet.columns) * height, width, height, 0, 0, width, height)

  if (ghost && at >= 0 && sheets.ghost?.id === ghost.id) {
    const other = footage.takes[ghost.id]
    if (other.feet[index]) {
      const size = sheet.cutSize
      scratch ??= document.createElement("canvas")
      scratch.width = scratch.height = size
      const tint = scratch.getContext("2d")!
      tint.drawImage(sheets.ghost.image, (index % sheet.cutColumns) * size, Math.floor(index / sheet.cutColumns) * size, size, size, 0, 0, size, size)
      tint.globalCompositeOperation = "source-atop"
      tint.globalAlpha = 0.6
      tint.fillStyle = paint(ghost)
      tint.fillRect(0, 0, size, size)
      tint.globalAlpha = 1
      tint.globalCompositeOperation = "source-over"
      const [x, y] = other.cut[index]
      context.globalAlpha = 0.75
      // Its cut-out was filmed by its own camera.
      context.drawImage(scratch, x + other.cam[index][0] - camX, y + other.cam[index][1] - camY)
      context.globalAlpha = 1
    }
  }

  for (const each of ghost ? [ghost, take] : [take]) {
    context.fillStyle = paint(each)
    for (let past = 0; past <= at; past += 2) {
      const feet = footage.takes[each.id].feet[past + demo.zero - footage.from]
      if (feet) context.fillRect(toX(feet[0]), toY(feet[1]) - 1, 1, 1)
    }
  }

  if (boxes) {
    context.lineWidth = 1
    context.strokeStyle = colour.box
    for (const [x, y, w, h] of demo.boxes ?? []) context.strokeRect(toX(x) + 0.5, toY(y) + 0.5, w - 1, h - 1)
    const feet = filmed.feet[index]
    if (feet) {
      const [x, y, tall] = feet
      context.strokeStyle = paint(take)
      context.strokeRect(toX(x) - 4 + 0.5, toY(y) - tall + 0.5, 7, tall - 1)
    }
  }
}
