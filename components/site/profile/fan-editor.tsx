"use client"

import { useState, type ReactNode } from "react"
import { FanView } from "@/components/site/profile/fan-view"
import { FreeSwatch, LockedSwatch, ANY_COLOUR, Swatch } from "@/components/site/profile/swatches"
import { Input, Select } from "@/components/site/ui"
import { profile } from "@/content/profile"
import type { Fan, Sigma, Torcedor } from "@/lib/profile"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const text = localize(profile)
type Option = "cabeca" | "roupa" | "acessorio" | "comemoracao"
const optionName = (key: Option, id: string) => (text.options[key] as Record<string, string | undefined>)[id] ?? id

/** A group of choices: a fieldset, its name as the legend, a hint under it when it needs one. */
function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-[13px] font-medium text-muted">{title}</legend>
      {hint && <p className="-mt-1.5 text-[13px] text-muted">{hint}</p>}
      {children}
    </fieldset>
  )
}

/** A part of the editor ("Visual", "Na live"): a label on a line. */
function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-7">
      <p className="eyebrow flex items-center gap-3 text-klein after:h-px after:flex-1 after:bg-line">{title}</p>
      {children}
    </div>
  )
}

/** An option drawn on the fan itself. */
const tile = (on: boolean) =>
  cn(
    "cut-sm cut-edge relative flex flex-col items-center gap-1.5 border px-1 pb-2 pt-3 text-center text-[13px] leading-tight transition-colors",
    on ? "border-klein bg-paper font-medium text-klein" : "border-line-strong bg-paper/40 text-ink hover:border-klein",
  )

/** Their team: a club from the list dresses the fan in its shirt; any other is just its name. */
function TeamGroup({ T, fan, change }: { T: Torcedor; fan: Fan; change: (patch: Partial<Fan>) => void }) {
  const club = T.TIMES.find((t) => t.nome === fan.time)
  const [typing, setTyping] = useState(Boolean(fan.time && !club))
  const value = club ? club.nome : typing ? "outro" : ""
  return (
    <Group title={text.groups.team} hint={text.groups.teamHint}>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label={text.groups.team}
          boxClassName="w-full max-w-[16rem]"
          value={value}
          onChange={(e) => {
            const pick = e.target.value
            if (pick === "outro") {
              setTyping(true)
              change({ time: "" })
              return
            }
            setTyping(false)
            const team = T.TIMES.find((t) => t.nome === pick)
            change(team ? { time: team.nome, cor: team.cor, detalhe: team.detalhe, terceira: team.terceira ?? team.detalhe, roupa: team.roupa } : { time: "" })
          }}
        >
          <option value="">{text.groups.teamNone}</option>
          {T.TIMES.map((t) => (
            <option key={t.nome} value={t.nome}>
              {t.nome}
            </option>
          ))}
          <option value="outro">{text.groups.teamOther}</option>
        </Select>
        {typing && (
          <Input
            boxClassName="w-full max-w-[14rem]"
            value={fan.time}
            maxLength={T.TIME_MAX}
            placeholder={text.groups.teamName}
            aria-label={text.groups.teamName}
            onChange={(e) => change({ time: e.target.value })}
          />
        )}
      </div>
    </Group>
  )
}

/**
 * The Torcedor tab: how their fan looks (team, colours, head, outfit, accessory) and what it does in the live
 * (celebration, arrival shout, stickers). Each option is drawn on their own fan; the preview beside plays the moves.
 */
export function FanEditor({
  T,
  S,
  fan,
  login,
  sigma,
  change,
  play,
}: {
  T: Torcedor
  S: Sigma | null
  fan: Fan
  login: string
  sigma: number
  change: (patch: Partial<Fan>) => void
  play: (kind: "goal" | "against" | "arrive", celebration?: string) => void
}) {
  const [other, setOther] = useState({ gol: "", contra: "" })
  const free = S ? sigma >= S.COR_LIVRE : false

  function toggleSticker(when: "gol" | "contra", emoji: string) {
    const list = fan.stickers[when]
    const next = list.includes(emoji) ? list.filter((e) => e !== emoji) : [...list, emoji].slice(-T.STICKERS_MAX)
    change({ stickers: { ...fan.stickers, [when]: next } })
  }

  const options: { key: Exclude<Option, "comemoracao">; title: string; list: string[] }[] = [
    { key: "cabeca", title: text.groups.head, list: T.CABECAS },
    { key: "roupa", title: text.groups.outfit, list: T.ROUPAS },
    { key: "acessorio", title: text.groups.accessory, list: T.ACESSORIOS },
  ]
  const colours = T.TRES_CORES.includes(fan.roupa) ? (["cor", "detalhe", "terceira"] as const) : (["cor", "detalhe"] as const)

  return (
    <div className="space-y-12">
      <Part title={text.groups.look}>
        <TeamGroup T={T} fan={fan} change={change} />

        <Group title={text.groups.colors}>
          <div className="space-y-4">
            {colours.map((key) => (
              <div key={key} className="space-y-2">
                <p className="text-[13px] text-ink">{key === "cor" ? text.groups.color : key === "detalhe" ? text.groups.detail : text.groups.third}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {T.CORES.map((color) => (
                    <Swatch key={color} background={color} label={color} on={fan[key] === color} onClick={() => change({ [key]: color })} />
                  ))}
                  {S &&
                    (free ? (
                      <FreeSwatch value={fan[key]} on={!T.CORES.includes(fan[key])} label={text.freeColor} onChange={(color) => change({ [key]: color })} />
                    ) : (
                      <LockedSwatch S={S} at={S.COR_LIVRE} background={ANY_COLOUR} label={text.freeColor} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Group>

        {options.map(({ key, title, list }) => (
          <Group key={key} title={title}>
            {/* Rows that fill: five or ten in fives, eight in fours. */}
            <div className={cn("grid gap-2", list.length % 5 === 0 ? "grid-cols-5" : list.length % 4 === 0 ? "grid-cols-4" : "grid-cols-3")}>
              {list.map((id) => (
                <button key={id} type="button" aria-pressed={fan[key] === id} onClick={() => change({ [key]: id })} className={tile(fan[key] === id)}>
                  <FanView T={T} fan={T.normalizar({ ...fan, [key]: id }, login)} className="h-[54px] w-9" />
                  {optionName(key, id)}
                </button>
              ))}
            </div>
            {key === "roupa" && fan.roupa === "numero" && (
              <label className="flex items-center gap-3 text-[13px] text-muted">
                {text.groups.number}
                <Input
                  type="number"
                  min={0}
                  max={99}
                  boxClassName="w-24"
                  value={fan.numero}
                  onChange={(e) => change({ numero: Math.max(0, Math.min(99, Math.trunc(Number(e.target.value) || 0))) })}
                />
              </label>
            )}
          </Group>
        ))}
      </Part>

      <Part title={text.groups.live}>
        <Group title={text.groups.celebration} hint={text.groups.celebrationHint}>
          <div className="flex flex-wrap gap-2">
            {T.COMEMORACOES.map((id) => (
              <button key={id} type="button" aria-pressed={fan.comemoracao === id} onClick={() => play("goal", id)} className={cn(tile(fan.comemoracao === id), "px-4 py-2")}>
                {optionName("comemoracao", id)}
              </button>
            ))}
          </div>
        </Group>

        <Group title={text.groups.phrase} hint={text.groups.phraseHint}>
          <div className="flex items-center gap-3">
            <Input
              aria-label={text.groups.phrase}
              boxClassName="w-full max-w-sm"
              value={fan.frase}
              maxLength={T.FRASE_MAX}
              onChange={(e) => change({ frase: e.target.value })}
              onBlur={() => fan.frase && play("arrive")}
            />
            <span className="text-[13px] tabular-nums text-muted">
              {Array.from(fan.frase).length}/{T.FRASE_MAX}
            </span>
          </div>
        </Group>

        <Group title={text.groups.stickers} hint={text.groups.stickersHint}>
          {(["gol", "contra"] as const).map((when) => (
            <div key={when} className="space-y-2">
              <p className="flex items-center gap-2 text-[13px] text-ink">
                {when === "gol" ? text.groups.onGoal : text.groups.onAgainst}
                <span className="text-[20px] leading-none">{fan.stickers[when].join(" ")}</span>
              </p>
              <div className="flex flex-wrap items-center gap-1">
                {T.STICKERS.map((emoji) => {
                  const on = fan.stickers[when].includes(emoji)
                  return (
                    <button
                      key={emoji}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleSticker(when, emoji)}
                      className={cn("h-10 w-10 text-[22px] transition-colors", on ? "bg-klein/15 ring-2 ring-klein ring-inset" : "hover:bg-paper")}
                    >
                      {emoji}
                    </button>
                  )
                })}
                <Input
                  aria-label={text.groups.otherEmoji}
                  placeholder={text.groups.otherEmoji}
                  boxClassName="w-36"
                  value={other[when]}
                  onChange={(e) => {
                    const value = e.target.value.trim()
                    if (T.umEmoji(value)) {
                      toggleSticker(when, value)
                      setOther({ ...other, [when]: "" })
                    } else setOther({ ...other, [when]: value })
                  }}
                />
              </div>
            </div>
          ))}
        </Group>
      </Part>
    </div>
  )
}
