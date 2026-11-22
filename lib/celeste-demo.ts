/**
 * A technique's demonstration (components/site/celeste/tecnicas/demo-player.tsx): what the page says of it (`Demo`,
 * written in content/) and what was filmed (`Footage`, public/celeste/tecnicas/<demo>/dados.json, made by
 * scripts/celeste-tas/monta.py from the TAS captures). Frames in `Demo` count from its `zero`, the moment it is about;
 * the footage's are the TAS's own.
 */

/** A line over the picture from a frame on. `{n}` is how many frames past the zero it is. */
export interface DemoStep {
  from: number
  text: string
  tone?: "window" | "fail"
}

export interface DemoTake {
  id: string
  /** On its button: "5", "Sem soltar". */
  label: string
  /** The button said whole, where the label is only a number. */
  name?: string
  ok: boolean
  /** The frame of the press it's about, ticked on the timeline. */
  press?: number
  /** The take that runs beside it as a ghost. */
  rival?: string
  steps: DemoStep[]
}

export interface Demo {
  id: string
  /** What the picture shows, for who can't see it. */
  alt: string
  /** Over the takes' buttons: "Frame do pulo". */
  choose: string
  zero: number
  /** The take and the frame it waits on before playing. */
  cover: { take: string; at: number }
  /** The stretch "Lenta no momento" slows down. */
  moment: [number, number]
  /** Gold on the timeline. */
  window?: [number, number]
  /** A bar over Madeline of the footage's value: a timer, her stamina. */
  gauge?: { max: number; during?: [number, number] }
  /** Offers her hitbox, with any others in the room's pixels. */
  boxes?: [x: number, y: number, w: number, h: number][]
  takes: DemoTake[]
}

/** What's held, as bits. */
export const KEY = { left: 1, right: 2, up: 4, down: 8, jump: 16, dash: 32, grab: 64 } as const

export interface TakeFootage {
  /** The game's camera. */
  cam: [x: number, y: number][]
  /** Her feet in the room and her hitbox's height; null once she's gone. */
  feet: ([x: number, y: number, height: number] | null)[]
  /** Where her cut-out goes, in the cropped picture. */
  cut: [x: number, y: number][]
  keys: number[]
  gauge?: number[]
}

/** Every list has one entry per frame, from `from` to `to`. */
export interface Footage {
  width: number
  height: number
  /** The crop's corner on the game's 320x180 screen. */
  crop: [x: number, y: number]
  from: number
  to: number
  /** The sheets: a take's pictures (`<take>-cena.webp`) and her alone (`<take>-ela.webp`). */
  sheet: { columns: number; cutColumns: number; cutSize: number }
  takes: Record<string, TakeFootage>
}

export const demoFile = (demo: string, name: string) => `/celeste/tecnicas/${demo}/${name}`
