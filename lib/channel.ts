import { sectionPath } from "@/lib/site"

/**
 * The channel, at /canal: what it is and where to watch it, what happens in
 * the lives, the lives themselves at /lives (each at /lives/<date>) and how
 * it's all made at /backstage. Game-agnostic: each game's pages stay in the
 * content section.
 */
export const CHANNEL_PAGES = ["lives", "backstage"] as const
export type ChannelPage = (typeof CHANNEL_PAGES)[number]

export function channelPath(page?: ChannelPage) {
  return `${sectionPath("channel")}${page ? `/${page}` : ""}`
}

export function livePath(date: string) {
  return `${channelPath("lives")}/${date}`
}
