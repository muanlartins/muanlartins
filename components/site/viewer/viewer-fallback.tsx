"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { GameNotices } from "@/components/site/game-notices"
import { ChannelMenu } from "@/components/site/channel/channel-menu"
import { ViewerPage } from "@/components/site/viewer/viewer-page"
import { hasSection } from "@/lib/site"
import { isLogin, VIEWER_SLUG } from "@/lib/viewer"

/** The login in /torcedor/<login>, or null for any other address. */
function viewerLogin(path: string) {
  const [, first, second, ...rest] = path.replace(/\.html$/, "").replace(/\/$/, "").split("/")
  const candidate = (second ?? "").toLowerCase()
  return hasSection("channel") && first === VIEWER_SLUG && !rest.length && isLogin(candidate) ? candidate : null
}

/**
 * The 404 page, unless the address is a viewer's page the build didn't know yet (/torcedor/<login>: someone who watched
 * for the first time after the last release): then their page, drawn in the browser like every other.
 */
export function ViewerFallback({ children }: { children: ReactNode }) {
  // The address, read in the browser only (null while the page is built and hydrated).
  const path = useSyncExternalStore(
    () => () => {},
    () => location.pathname,
    () => null,
  )
  const login = path === null ? undefined : viewerLogin(path)
  // Nothing until the address is read, so a viewer's page doesn't flash the 404 first.
  if (login === undefined) return null
  if (!login) return children
  return (
    <div className="relative">
      <ChannelMenu />
      <ViewerPage login={login} />
      <GameNotices />
    </div>
  )
}
