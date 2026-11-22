"use client"

import { Circle, CircleCheck } from "lucide-react"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { LearningBadge, learningLabel } from "@/components/site/celeste/learning"
import { Choice, ErrorLine, Select } from "@/components/site/ui"
import type { Learning } from "@/lib/celeste"
import { keptToken, PROFILE_API, signIn } from "@/lib/profile"
import { CHANNEL } from "@/lib/twitch"
import { cn } from "@/lib/utils"

const T = {
  mark: "Marcar o aprendizado (conta do canal)",
  notChannel: "Só a conta do canal marca o aprendizado.",
  editing: "Conta do canal: cada fundamento tem a sua caixa, e os extras são botões. O que mudar salva na hora.",
  choose: (title: string) => `Aprendizado de ${title}`,
  auto: (label: string) => `Auto: ${label}`,
  failed: "Não deu pra salvar. Tenta de novo.",
  expired: "A entrada com a Twitch venceu. Entra de novo pra marcar.",
  unread: "Não deu pra ler o que foi marcado na mão. Aparece o automático.",
}

/** The API's words for the page's three. */
const FROM = { vou: "ahead", aprendendo: "learning", aprendi: "learned" } as const
type Set = keyof typeof FROM | "feito"
const SETS = Object.keys(FROM) as (keyof typeof FROM)[]

interface Hand {
  set: Record<string, Set | undefined>
  /** The channel's account is signed in and the API's marks are read: the only time a box shows. */
  editable: boolean
  account?: "none" | "other" | "channel"
  saving: string | null
  error: string | null
  save: (id: string, estado: Set | null) => void
}

const Context = createContext<Hand>({ set: {}, editable: false, saving: null, error: null, save: () => {} })

/**
 * Where he is with each fundamental, set by hand by the channel's account (the profile API's /celeste) over what the
 * cuts and the save say (lib/celeste.ts learningOf). A choice shows for everyone with no release; "Automático" hands
 * it back to them.
 */
export function LearningByHand({ children }: { children: ReactNode }) {
  const [token] = useState(keptToken)
  const [set, setSet] = useState<Record<string, Set | undefined>>({})
  const [read, setRead] = useState(false)
  const [account, setAccount] = useState<Hand["account"]>()
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetch(`${PROFILE_API}/celeste`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => {
        if (!live) return
        setSet(body.aprendizado ?? {})
        setRead(true)
      })
      .catch(() => live && setError(T.unread))
    // Who's signed in is the API's to say, as it's the API that takes the save (and its local stand-in can say it too).
    const who = token
      ? fetch(`${PROFILE_API}/eu`, { headers: { authorization: `Bearer ${token}` } })
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null)
      : Promise.resolve(null)
    who.then((me) => live && setAccount(!me ? "none" : me.login === CHANNEL ? "channel" : "other"))
    return () => {
      live = false
    }
  }, [token])

  async function save(id: string, estado: Set | null) {
    setSaving(id)
    setError(null)
    try {
      const response = await fetch(`${PROFILE_API}/celeste`, {
        method: "PUT",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ id, estado }),
      })
      if (response.status === 401 || response.status === 403) {
        setAccount("none")
        setError(T.expired)
      } else if (!response.ok) setError(T.failed)
      else setSet((await response.json()).aprendizado ?? {})
    } catch {
      setError(T.failed)
    } finally {
      setSaving(null)
    }
  }

  return <Context.Provider value={{ set, editable: read && account === "channel", account, saving, error, save }}>{children}</Context.Provider>
}

/** A fundamental's state: the badge for everyone, the box for the channel's account. `auto` is what the cuts and the save say. */
export function LearningState({ id, title, auto, className }: { id: string; title: string; auto: Learning; className?: string }) {
  const { set, editable, saving, save } = useContext(Context)
  const own = set[id]
  if (!editable) {
    return (
      <span className={cn("shrink-0", className)}>
        <LearningBadge state={own && own !== "feito" ? FROM[own] : auto} />
      </span>
    )
  }
  return (
    <Select
      aria-label={T.choose(title)}
      value={own ?? ""}
      disabled={saving !== null}
      onChange={(event) => save(id, (event.target.value || null) as Set | null)}
      boxClassName={cn("min-w-0 max-w-full", className)}
      className="w-full min-w-0 text-[14px]"
    >
      <option value="">{T.auto(learningLabel(auto))}</option>
      {SETS.map((each) => (
        <option key={each} value={each}>
          {learningLabel(FROM[each])}
        </option>
      ))}
    </Select>
  )
}

/** One of the extras, which no save says: done or not, his to switch. */
export function HandMark({ id, children }: { id: string; children: ReactNode }) {
  const { set, editable, saving, save } = useContext(Context)
  const done = set[id] === "feito"
  const icon = done ? <CircleCheck aria-hidden className="h-4 w-4 shrink-0" /> : <Circle aria-hidden className="h-4 w-4 shrink-0" />
  if (editable) {
    return (
      <Choice size="sm" on={done} icon={icon} disabled={saving !== null} onClick={() => save(id, done ? null : "feito")} className="w-full justify-start text-left">
        {children}
      </Choice>
    )
  }
  return (
    <span className={cn("flex items-center gap-2 px-2.5 py-2 text-[13px] leading-snug", done ? "bg-klein text-paper" : "bg-klein/[0.06] text-ink")}>
      {icon}
      <span className="sr-only">{done ? "Feito: " : "Falta: "}</span>
      {children}
    </span>
  )
}

/** Under what it marks: the failure, what the channel's account can do, or its way in (back to `path`). */
export function LearningAccount({ path, className }: { path: string; className?: string }) {
  const { account, editable, error } = useContext(Context)
  return (
    <div className={cn("space-y-2 text-[13px] text-muted", className)}>
      {error && <ErrorLine>{error}</ErrorLine>}
      {editable && <p>{T.editing}</p>}
      {account === "other" && <p>{T.notChannel}</p>}
      {account === "none" && (
        <button type="button" onClick={() => signIn(null, path)} className="underline underline-offset-4 hover:text-klein">
          {T.mark}
        </button>
      )}
    </div>
  )
}
