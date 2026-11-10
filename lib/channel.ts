import { sectionPath } from "@/lib/site"

/**
 * The channel, the site's home page (and /canal, the same page): what it is
 * and where to watch it, what happens in the lives, the lives themselves at
 * /canal/lives (each at /canal/lives/<date>) and how it's all made at
 * /canal/backstage, and the roadmap with everything released so far at
 * /canal/roadmap. Game-agnostic: each game's pages stay in the content section.
 */
export const CHANNEL_PAGES = ["lives", "backstage", "roadmap"] as const
export type ChannelPage = (typeof CHANNEL_PAGES)[number]

export function channelPath(page?: ChannelPage) {
  return page ? `${sectionPath("channel")}/${page}` : "/"
}

export function livePath(date: string) {
  return `${channelPath("lives")}/${date}`
}
