import type { L10n } from "@/lib/site"

/**
 * The channel's Twitch lives, kept whole as unlisted YouTube videos: one file per
 * live in content/lives/ (<date>.json), and its transcript beside it
 * (<date>.transcript.json, [seconds, text] lines), both read at build
 * time by lib/lives-files.ts. A chapter is a stretch of the video, either
 * named or one of the day's ranked matches (content/matches/), by id.
 */

export interface Chapter {
  /** Where it starts in the video: "27:00", "1:02:22". */
  at: string
  title?: L10n
  match?: string
  /** From here on, another game (its id): a live of more than one. Before the first such chapter, the live's `game`. */
  game?: string
}

export interface Live {
  /** YYYY-MM-DD, in Luan's time; also its URL. */
  date: string
  /** The game played, by its id in content/projects.ts, or in content/diversos.json for any other (lib/diversos.ts). */
  game?: string
  /** The YouTube video. */
  video: string
  /** How long the recording is, "2:41:07" (scripts/live.py): the hours each game was played. */
  length?: string
  summary: L10n
  chapters: Chapter[]
  /** Only for YouTube (scripts/youtube.py, scripts/thumb.py); the site doesn't show it: the video's title when
   * Luan wrote one, the frame and hook picked for its thumbnail, and when it goes public when held back (ISO with
   * offset; the live stays off the site until then: lib/lives-files.ts). */
  youtube?: {
    title?: string
    thumb?: { quadro: string; segundo: number; texto: string; emblema: boolean; fundo?: string }
    publish_at?: string
  }
}

/** A transcript line: seconds into the video, and what was said. */
export type Line = [number, string]

/** "1:02:22" → 3742. */
export function seconds(at: string) {
  return at.split(":").reduce((total, part) => total * 60 + Number(part), 0)
}

/** 3742 → "1:02:22", 125 → "2:05". */
export function clock(total: number) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  const mm = h ? String(m).padStart(2, "0") : String(m)
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`
}

/** Each match that a live has a chapter for → where it starts: the live's date and the second. */
export function matchMoments(all: Live[]) {
  return Object.fromEntries(
    all.flatMap((live) =>
      live.chapters.flatMap((chapter) => (chapter.match ? [[chapter.match, { date: live.date, at: seconds(chapter.at) }]] : [])),
    ),
  ) as Record<string, { date: string; at: number }>
}

/** Each game a live played, in order: its `game`, then the chapters' that switch to another. */
export function gamesOf(live: Live) {
  return [...new Set([live.game, ...live.chapters.map((chapter) => chapter.game)].filter((game): game is string => !!game))]
}

/** A live as stretches of one game each, in seconds of its video (`length`: how long it is). */
export function stretches(live: Live, length: number) {
  const switches = live.chapters.flatMap((chapter) => (chapter.game ? [{ game: chapter.game, at: seconds(chapter.at) }] : []))
  const starts = [...(live.game && switches[0]?.at !== 0 ? [{ game: live.game, at: 0 }] : []), ...switches]
  return starts.map((start, index) => ({ game: start.game, from: start.at, to: Math.max(start.at, starts[index + 1]?.at ?? length) }))
}
