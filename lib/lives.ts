import type { L10n } from "@/lib/site"

/**
 * The Twitch lives, kept whole as unlisted YouTube videos: one file per
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
}

export interface Live {
  /** YYYY-MM-DD, in Luan's time; also its URL. */
  date: string
  /** The YouTube video. */
  video: string
  summary: L10n
  chapters: Chapter[]
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
