import { Dialogue } from "@/components/site/lore"
import { FalaBotoes, SequenciaBotao } from "@/components/site/valorant/universo/fala-player"
import { falaSrc, type Fala } from "@/lib/valorant-falas"
import { nomeDe } from "@/lib/valorant-universo"

/**
 * An agent page's voice lines in prose: lines picked by their ids (`Linhas`), and the conversations two agents have
 * when a match starts together (`Conversas`), found in the agent's lines by the game's own key ("[ClayBreach]": who
 * opens, then who answers). Each line plays in the dub and in the original.
 */

const botoes = (agent: string, fala: Fala) => <FalaBotoes pt={falaSrc(agent, fala.id, "pt")} en={falaSrc(agent, fala.id, "en")} label={`a fala de ${nomeDe(fala.quem)}`} />

/** Some of the agent's lines, by id, as a dialogue: who says it, the dub, the original, and the two buttons. */
export function Linhas({ agent, falas, ids, className }: { agent: string; falas: Fala[]; ids: string[]; className?: string }) {
  const picked = ids.map((id) => {
    const fala = falas.find((each) => each.id === id)
    if (!fala) throw new Error(`Universo Valorant: ${agent} has no line "${id}" (content/valorant-universo/falas/${agent}.json).`)
    return fala
  })
  return <Dialogue className={className} lines={picked.map((fala) => ({ who: nomeDe(fala.quem), pt: fala.pt, en: fala.en, n: fala.jogo, aside: botoes(agent, fala) }))} />
}

export interface Conversa {
  chave: string
  /** Who opens and who answers, by id. */
  quem: string[]
  falas: Fala[]
}

/** The agent's match-start conversations, in the game's order: whoever the key names first opens. */
export function conversasDe(falas: Fala[]): Conversa[] {
  const groups = new Map<string, Fala[]>()
  for (const fala of falas) {
    const key = fala.jogo.match(/StartConversation\[([A-Za-z]+)\]/)?.[1]
    if (fala.quando !== "conversa" || !key) continue
    groups.set(key, [...(groups.get(key) ?? []), fala])
  }
  return [...groups].map(([chave, lines]) => {
    const order = (fala: Fala) => {
      const n = Number(fala.jogo.match(/\](\d+)$/)?.[1] ?? 1)
      const opens = chave.toLowerCase().startsWith(fala.jogo.split(".")[0].toLowerCase())
      return n * 2 + (opens ? 0 : 1)
    }
    const sorted = [...lines].sort((a, b) => order(a) - order(b))
    return { chave, quem: [...new Set(sorted.map((fala) => fala.quem))], falas: sorted }
  })
}

/** Every conversation, each with a button to hear it whole in either language. */
export function Conversas({ agent, falas }: { agent: string; falas: Fala[] }) {
  return (
    <div className="space-y-10">
      {conversasDe(falas).map((conversa) => {
        const title = conversa.quem.map(nomeDe).join(" e ")
        return (
          <div key={conversa.chave} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[15px] font-medium text-ink">{title}</h3>
              <span className="inline-flex gap-2">
                <SequenciaBotao lang="pt" label="Ouvir dublada" srcs={conversa.falas.map((fala) => falaSrc(agent, fala.id, "pt"))} />
                <SequenciaBotao lang="en" label="Ouvir original" srcs={conversa.falas.map((fala) => falaSrc(agent, fala.id, "en"))} />
              </span>
            </div>
            <Dialogue lines={conversa.falas.map((fala) => ({ who: nomeDe(fala.quem), pt: fala.pt, en: fala.en, n: fala.jogo, aside: botoes(agent, fala) }))} />
          </div>
        )
      })}
    </div>
  )
}
