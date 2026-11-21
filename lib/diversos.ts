import data from "@/content/diversos.json"
import { stretches, type Live } from "@/lib/lives"
import { sectionPath } from "@/lib/site"

/**
 * "Jogos diversos": every game Luan plays besides Rocket League and Valorant (content/projects.ts), at
 * /conteudo/diversos, each with a page of its own at /conteudo/diversos/<id>. The games are content/diversos.json, a
 * JSON so the scripts read the same list (scripts/live.py finds the day's game by the agenda's Twitch category,
 * scripts/youtube.py names it). A live of one of them has its id as `game` in content/lives/<date>.json (or a
 * chapter's `game`, from where it started), and its card counts those lives and hours.
 */

/** One thing to do towards a goal; `live` is the day it was done ("YYYY-MM-DD"), linking that live. */
export interface GoalItem {
  text: string
  done?: boolean
  live?: string
}

/** A goal ("100%") and its checklist, in groups (a game's chapters) or one group without a title. */
export interface Goal {
  title: string
  groups: { title?: string; items: GoalItem[] }[]
}

export interface OtherGame {
  /** Its URL, /conteudo/diversos/<id>, and its id in the lives' `game`. Never change it once a live has it. */
  id: string
  name: string
  /** The Twitch category's name, as the agenda and Twitch have it. */
  category: string
  /** The Twitch category's id: the agenda's lives match it, and the cover comes from Twitch's CDN by it. */
  categoryId?: string
  /** A line about it, in Luan's words; one still starting with "TODO" isn't shown. */
  line?: string
  goal?: Goal
  /** Paragraphs on its page. */
  notes?: string[]
}

export const diversos = data as { page: { title: string; description: string }; games: OtherGame[] }

/** The id of the page in the content section; no game can take it. */
export const DIVERSOS = "diversos"

export const diversosPath = (game?: { id: string }) => `${sectionPath("content")}/${DIVERSOS}${game ? `/${game.id}` : ""}`

export const otherGame = (id: string | undefined) => diversos.games.find((game) => game.id === id)

/** Its line, unless it's still a TODO for Luan. */
export const lineOf = (game: OtherGame) => (game.line && !/^TODO\b/.test(game.line) ? game.line : undefined)

/**
 * Its cover from Twitch's CDN (the agenda's editor shows the same ones), never copied into the repo. The
 * "<id>_IGDB" form answers for old categories and new alike; the name form doesn't for newer ones.
 */
export const coverOf = (game: OtherGame, width = 144, height = 192) =>
  game.categoryId ? `https://static-cdn.jtvnw.net/ttv-boxart/${game.categoryId}_IGDB-${width}x${height}.jpg` : undefined

/** How much of the goal is done. */
export function progressOf(goal: Goal) {
  const items = goal.groups.flatMap((group) => group.items)
  return { done: items.filter((item) => item.done).length, total: items.length }
}

/** A game's lives (newest first, as given) and how long it was played in them: each live's stretches of it. */
export function playedOf(game: { id: string }, lives: Live[], lengthOf: (live: Live) => number) {
  const played = lives.flatMap((live) => {
    const own = stretches(live, lengthOf(live)).filter((stretch) => stretch.game === game.id)
    return own.length ? [{ live, seconds: own.reduce((total, stretch) => total + stretch.to - stretch.from, 0) }] : []
  })
  return { lives: played, seconds: played.reduce((total, entry) => total + entry.seconds, 0) }
}

/** 9000 → "2h30", 2700 → "45 min", 7200 → "2h". */
export function hours(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`
}
