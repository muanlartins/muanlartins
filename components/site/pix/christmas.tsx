"use client"

import { Gift } from "lucide-react"
import { mural as muralCopy, pix, PRESENT_NAMES } from "@/content/pix"
import { reais, SUB, type Goal, type MuralPix, type Present, type PresentKit } from "@/lib/pix"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"
import { ViewerName } from "@/components/site/viewer/viewer-name"

const text = localize(pix)
const M = localize(muralCopy)
const NAMES = localize(PRESENT_NAMES)

/** One present, drawn by presente.js, filling its box. */
export function PresentView({ kit, present, className }: { kit: PresentKit; present?: Partial<Present>; className?: string }) {
  return <span aria-hidden className={cn("block [&_svg]:h-full [&_svg]:w-full", className)} dangerouslySetInnerHTML={{ __html: kit.figura(present ?? {}) }} />
}

/** A Christmas goal's tree at night: a present from each Pix (oldest first), its lights as far as the goal has come. */
export function TreeView({ kit, goal, className }: { kit: PresentKit; goal: Pick<Goal, "alvo" | "arrecadado" | "apoiadores">; className?: string }) {
  const list = [...goal.apoiadores]
    .sort((a, b) => (a.em < b.em ? -1 : 1))
    .map((p: MuralPix) => ({ id: p.em, presente: p.presente, centavos: p.centavos, nome: p.nome ? `${p.nome} · R$ ${reais(p.centavos)}` : undefined }))
  return (
    <div className={cn("rounded-md bg-[#001447] px-4 pt-6 pb-3", className)}>
      <div
        role="img"
        aria-label={M.tree}
        className="mx-auto max-w-[19rem] [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: kit.arvore(list, { progresso: goal.alvo ? goal.arrecadado / goal.alvo : 0 }) }}
      />
    </div>
  )
}

/** A Christmas goal's gift subs: who won, and how far the next is. */
export function GiftSubs({ goal }: { goal: Pick<Goal, "arrecadado" | "sorteios"> }) {
  const drawn = goal.sorteios ?? []
  const earned = Math.floor(goal.arrecadado / SUB)
  const waiting = earned - drawn.length
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-[0.12em] text-klein">
        <Gift aria-hidden className="h-4 w-4" />
        {M.subs} <span className="text-muted normal-case tracking-normal tabular-nums">· {drawn.length}/{earned}</span>
      </p>
      {drawn.length ? (
        <ul className="flex flex-wrap gap-2">
          {drawn.map((s) => (
            <li key={s.em} className="rounded-full bg-klein px-3 py-1 text-[14px] font-medium text-paper">
              <ViewerName login={s.login} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-muted">{M.subsNone}</p>
      )}
      <p className="text-[14px] text-muted tabular-nums">
        {waiting > 0 && `${M.subsWaiting.replace("{n}", String(waiting))} `}
        {M.subsNext.replace("{x}", reais(SUB * (earned + 1) - goal.arrecadado))}
      </p>
      <p className="max-w-[38rem] text-[13px] text-muted">{M.subsNote}</p>
    </div>
  )
}

const swatch = (on: boolean) => cn("h-8 w-8 rounded-full border-2 transition-transform", on ? "scale-110 border-klein ring-2 ring-klein/30" : "border-line hover:scale-105")
const chip = (on: boolean) =>
  cn("flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-[14px] transition-colors", on ? "border-klein bg-klein text-paper" : "border-line text-ink hover:border-klein/60")
const label = "text-[12px] font-medium uppercase tracking-[0.1em] text-muted"

/** The present a Pix of the Christmas goal hangs on the tree: its shape, two colours and pattern, with a preview. */
export function PresentPicker({ kit, value, onChange }: { kit: PresentKit; value: Present; onChange: (p: Present) => void }) {
  const set = (patch: Partial<Present>) => onChange({ ...value, ...patch })
  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="grid h-32 w-32 shrink-0 place-items-center self-center rounded-md bg-[#001447] p-3 sm:self-start">
        <PresentView kit={kit} present={value} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-2">
          <p className={label}>{text.presentShape}</p>
          <div className="flex flex-wrap gap-2">
            {kit.FORMATOS.map((formato) => (
              <button key={formato} type="button" aria-pressed={value.formato === formato} onClick={() => set({ formato })} className={chip(value.formato === formato)}>
                <PresentView kit={kit} present={{ ...value, formato }} className="h-5 w-5" />
                {NAMES[formato] ?? formato}
              </button>
            ))}
          </div>
          {value.formato === "caixa" && <p className="text-[13px] text-muted">{text.presentBox}</p>}
        </div>
        {(["cor", "detalhe"] as const).map((key) => (
          <div key={key} className="space-y-2">
            <p className={label}>{key === "cor" ? text.presentColor : text.presentDetail}</p>
            <div className="flex flex-wrap gap-2">
              {kit.CORES.map((c) => (
                <button key={c} type="button" aria-label={c} aria-pressed={value[key] === c} onClick={() => set({ [key]: c })} className={swatch(value[key] === c)} style={{ background: c }} />
              ))}
            </div>
          </div>
        ))}
        {!kit.SEM_PADRAO.includes(value.formato) && (
          <div className="space-y-2">
            <p className={label}>{text.presentPattern}</p>
            <div className="flex flex-wrap gap-2">
              {kit.PADROES.map((padrao) => (
                <button key={padrao} type="button" aria-pressed={value.padrao === padrao} onClick={() => set({ padrao })} className={chip(value.padrao === padrao)}>
                  {NAMES[padrao] ?? padrao}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
