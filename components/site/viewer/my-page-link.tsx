"use client"

import { UserRound } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { keptMe, keptMeRaw, onMeChange, rememberMe } from "@/lib/profile"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { imageUrl, loadTwitchAvatar, viewerPath } from "@/lib/viewer"

const LABEL = localize({ pt: "Minha página", en: "My page" })

/**
 * The signed-in viewer's photo in the header, leading to their page (/torcedor/<login>). It reads who's signed in from
 * this browser (lib/profile.ts keeps it whenever the profile API answers), so it costs no request; their Twitch photo
 * is looked up once and kept with it. Nothing shows signed out.
 */
export function MyPageLink() {
  const raw = useSyncExternalStore(onMeChange, keptMeRaw, () => null)
  const me = useMemo(() => keptMe(raw), [raw])
  const path = usePathname().replace(/\/$/, "")
  const [failed, setFailed] = useState(false)

  // Their Twitch photo, once: kept, so the next pages don't ask DecAPI again.
  useEffect(() => {
    if (!me || me.foto || me.avatar !== undefined) return
    loadTwitchAvatar(me.login).then((avatar) => rememberMe({ login: me.login, avatar }))
  }, [me])

  if (!me) return null
  const href = viewerPath(me.login)
  const src = me.foto ? imageUrl(me.login, "foto", me.foto) : me.avatar
  return (
    <Link
      href={href}
      aria-label={`${LABEL} (${me.login})`}
      title={`${LABEL} (${me.login})`}
      aria-current={path === href ? "page" : undefined}
      className={cn(
        "relative grid h-8 w-8 max-md:h-6 max-md:w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-navy text-paper ring-2 ring-offset-2 ring-offset-ground transition-shadow",
        path === href ? "ring-klein" : "ring-transparent hover:ring-line-strong",
      )}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <UserRound aria-hidden className="h-4 w-4" />
      )}
    </Link>
  )
}
