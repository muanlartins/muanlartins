"use client"

import { useEffect, useState } from "react"
import { Cabeca, Foto, Vazio } from "@/components/site/profile/fan-editor-controls"
import { editor } from "@/components/site/profile/fan-editor-text"
import { ViewerName } from "@/components/site/viewer/viewer-name"
import { Badge, Button, ErrorLine, Skeleton } from "@/components/site/ui"
import { loadAudience, loadFans } from "@/lib/profile"
import { codigo, torcedorDe, type Torcedor3D } from "@/lib/torcedor3d"

const text = editor.galeria
const PAGINA = 24

interface Entrada {
  login: string
  look: Torcedor3D
  /** The share code: the picture's key. */
  codigo: string
}

// Everyone who has watched (the Σ API's audience, most minutes first), then the fans saved under their logins (the
// profile API's public /torcedores): no list of its own, so nothing is written. Read once per visit to the page.
let lendo: Promise<Entrada[]> | null = null
function ler(): Promise<Entrada[]> {
  lendo ??= (async () => {
    const pessoas = await loadAudience()
    const logins = pessoas.map((p) => p.login)
    const salvos = await loadFans(logins)
    const entradas = logins
      .filter((login) => salvos[login])
      .map((login) => {
        const look = torcedorDe(salvos[login], login)
        return { login, look, codigo: codigo(look), tem3D: Boolean(salvos[login].t3) }
      })
    // Those who made theirs in 3D first, each part in the audience's order.
    return [...entradas.filter((e) => e.tem3D), ...entradas.filter((e) => !e.tem3D)].map(({ login, look, codigo }) => ({ login, look, codigo }))
  })().catch((e) => {
    lendo = null
    throw e
  })
  return lendo
}

/**
 * The gallery tab: every viewer's saved fan (a 2D one shown as it turns 3D), theirs first when they have one, and
 * "Usar este" puts a look on the editor. "Mais copiados" needs a count the site can't write yet, so it isn't here.
 */
export function Galeria({ eu, usar }: { eu: string; usar: (look: Torcedor3D, login: string) => void }) {
  const [estado, setEstado] = useState<"carregando" | "erro" | "pronta">("carregando")
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [mostrar, setMostrar] = useState(PAGINA)
  const [status, setStatus] = useState("")
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let vivo = true
    ler().then(
      (e) => {
        if (!vivo) return
        setEntradas(e)
        setEstado("pronta")
      },
      () => vivo && setEstado("erro"),
    )
    return () => {
      vivo = false
    }
  }, [tentativa])

  const ordem = [...entradas.filter((e) => e.login === eu), ...entradas.filter((e) => e.login !== eu)]

  return (
    <div className="grid gap-7">
      <p className="max-w-[38rem] text-[13px] text-muted">{text.dica}</p>
      <p role="status" className="text-[13px] text-ink empty:hidden">
        {status}
      </p>
      {estado === "carregando" ? (
        <section aria-busy className="grid gap-3">
          <p className="text-[13px] text-muted">{text.carregando}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="cut-sm aspect-[132/210]" />
            ))}
          </div>
        </section>
      ) : estado === "erro" ? (
        <ErrorLine
          onRetry={() => {
            setEstado("carregando")
            setTentativa((n) => n + 1)
          }}
        >
          {text.erro}
        </ErrorLine>
      ) : !ordem.length ? (
        <Vazio>{text.vazio}</Vazio>
      ) : (
        <section aria-labelledby="galeria-todos" className="grid gap-3">
          <Cabeca id="galeria-todos">
            {text.titulo}
            <span className="bg-klein/10 px-1.5 py-px text-[12px] font-medium tabular-nums tracking-[0.04em] text-klein">{ordem.length}</span>
          </Cabeca>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2">
            {ordem.slice(0, mostrar).map((e) => (
              <article key={e.login} aria-label={e.login} className="cut-sm cut-edge relative flex min-w-0 flex-col gap-1.5 border border-line bg-ground/45 p-2 pb-2.5">
                <Foto
                  largura={104}
                  altura={122}
                  chave={e.codigo}
                  desenhar={(kit, t) => kit.fotos.pedir(t, e.look, { guardar: `galeria:${e.codigo}` })}
                  className="aspect-[104/122] w-full"
                />
                <ViewerName login={e.login} className="text-[14px] font-medium leading-tight [overflow-wrap:anywhere]" />
                <div className="mt-auto pt-1">
                  {e.login === eu ? (
                    <Badge>{text.seu}</Badge>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={text.usarDe(e.login)}
                      onClick={() => {
                        usar(e.look, e.login)
                        setStatus(text.usado(e.login))
                      }}
                    >
                      {text.usar}
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {ordem.length > mostrar && (
            <div>
              <Button variant="secondary" size="sm" onClick={() => setMostrar((n) => n + PAGINA)}>
                {text.verMais}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
