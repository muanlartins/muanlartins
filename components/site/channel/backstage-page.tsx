import { ArrowUpRight } from "lucide-react"
import { DefList, DocPage, DocSection, docsLinks, Prose } from "@/components/site/docs"
import { Badge, ButtonLink, Card } from "@/components/site/ui"
import { channel } from "@/content/channel"
import { channelPath } from "@/lib/channel"
import { localize } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize(channel)
const B = T.backstage
const REPOSITORY = "https://github.com/muanlartins/muanlartins"
const GUIDE = `${REPOSITORY}/tree/main/brand`

/** The identity's three colours (brand/README.md), drawn from the site's own tokens, each with the ink that reads on it. */
const BRAND = [
  { name: "Klein", hex: "#002FA7", swatch: "bg-klein text-paper", text: B.colors.klein },
  { name: "Branco", hex: "#F4F5F7", swatch: "bg-paper text-klein", text: B.colors.branco },
  { name: "Klein claro", hex: "#85A7FF", swatch: "bg-klein-claro text-klein", text: B.colors.kleinClaro },
]
/** The rest of the site's and the live's colours (brand/interface.md, "Tokens"). */
const MORE = [
  { name: "Navy", hex: "#001447", swatch: "bg-navy", text: B.colors.navy },
  { name: "Fundo", hex: "#D6E2FF", swatch: "bg-ground", text: B.colors.ground },
  { name: "Vitória", hex: "#007645", swatch: "bg-win", text: B.colors.win },
  { name: "Derrota", hex: "#B53031", swatch: "bg-loss", text: B.colors.loss },
  { name: "Ouro", hex: "#FFD166", swatch: "bg-ouro", text: B.colors.ouro },
]
/** The type scale's sizes as classes, so each line is set at the size it names. */
const SIZE: Record<number, string> = {
  48: "text-[36px] sm:text-5xl tracking-[-0.03em] font-medium text-klein",
  24: "text-2xl tracking-[-0.02em] font-medium text-klein",
  20: "text-xl tracking-[-0.02em] font-medium text-ink",
  17: "text-[17px] text-ink",
  15: "text-[15px] text-ink",
  13: "text-[13px] text-muted",
  12: "eyebrow text-muted",
}
const U = 24

/** How the channel is made: the mark, its colours, type, shape, motifs and voice; the live from the inside; the site. */
export function BackstagePage() {
  const sections = [
    { id: "marca", title: B.mark.title },
    { id: "cores", title: B.colors.title },
    { id: "tipografia", title: B.type.title },
    { id: "forma", title: B.shape.title },
    { id: "padroes", title: B.motifs.title },
    { id: "voz", title: B.voice.title },
    { id: "live", title: B.stream.title },
    { id: "depois", title: B.after.title },
    { id: "site", title: B.site.title },
  ]
  const n = (id: string) => sections.findIndex((s) => s.id === id) + 1
  const [, m, d] = B.updated.split("-")

  return (
    <DocPage
      trail={[{ label: T.title, href: channelPath() }]}
      title={B.title}
      description={B.description}
      meta={[
        { label: B.meta.updated, value: `${d}/${m}` },
        {
          label: B.meta.code,
          value: (
            <a href={REPOSITORY} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-klein underline decoration-line underline-offset-4 hover:decoration-klein">
              GitHub
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </a>
          ),
        },
      ]}
      toc={sections}
      more={docsLinks(channelPath("backstage"))}
    >
      <DocSection id="marca" n={n("marca")} title={B.mark.title}>
        <div className="grid items-start gap-8 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Prose text={B.mark.text} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark-on-klein.svg" alt={B.mark.alt} className="cut mx-auto w-40 sm:w-44" />
        </div>
      </DocSection>

      <DocSection id="cores" n={n("cores")} title={B.colors.title} description={B.colors.text}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {BRAND.map((color) => (
            <li key={color.name} className="cut cut-edge relative flex flex-col overflow-hidden border border-line">
              <div className={cn("flex h-20 items-end px-4 pb-3", color.swatch)}>
                <span className="text-[15px] font-medium">{color.name}</span>
              </div>
              <div className="flex-1 space-y-1 bg-paper/70 px-4 py-3">
                <p className="text-[13px] tabular-nums text-muted">{color.hex}</p>
                <p className="text-[13px] leading-[1.5] text-ink">{color.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <DefList
          className="mt-6"
          termWidth="11rem"
          head={[B.colors.head.name, B.colors.head.use, "Hex"]}
          items={MORE.map((color) => ({
            key: color.name,
            term: (
              <span className="text-[15px] font-medium text-ink">
                <span aria-hidden className={cn("mr-3 inline-block h-4 w-4 border border-line align-[-2px]", color.swatch)} />
                {color.name}
              </span>
            ),
            detail: color.text,
            aside: color.hex,
          }))}
        />
      </DocSection>

      <DocSection id="tipografia" n={n("tipografia")} title={B.type.title} description={B.type.text}>
        <p className="text-5xl font-medium tracking-[-0.02em] text-klein sm:text-6xl">muanlartins</p>
        <p className="mt-2 text-[15px] tracking-[0.02em] text-muted">Aa Bb Cc 0123456789 · Σ</p>
        <ol className="mt-8 divide-y divide-line border-y border-line">
          {B.type.scale.map((step) => (
            <li key={step.size} className="grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-4 py-3">
              <span className="text-[13px] tabular-nums text-muted">{step.size}</span>
              <span className={cn("truncate leading-tight", SIZE[step.size])}>{step.use}</span>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection id="forma" n={n("forma")} title={B.shape.title} description={B.shape.text}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="col-span-2 flex h-28 flex-col justify-between p-4 sm:col-span-1">
            <span className="text-[15px] font-medium text-ink">{B.shape.card}</span>
            <span className="text-[13px] text-muted">{B.shape.cardNote}</span>
          </Card>
          <Specimen note={B.shape.buttonNote}>
            <span className="cut-sm inline-flex bg-klein px-4 py-2 text-[15px] font-medium text-paper">{B.shape.button}</span>
          </Specimen>
          <Specimen note={B.shape.badgeNote}>
            <Badge>{B.shape.badge}</Badge>
          </Specimen>
          <Specimen note={B.shape.round} className="col-span-2 sm:col-span-1">
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-8 w-8 rounded-full bg-klein" />
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-klein" />
            </span>
          </Specimen>
        </div>
      </DocSection>

      <DocSection id="padroes" n={n("padroes")} title={B.motifs.title}>
        <Motifs />
        <DefList
          className="mt-6"
          termWidth="9rem"
          items={[B.motifs.lattice, B.motifs.streaks, B.motifs.plate].map((motif) => ({
            key: motif.term,
            term: <span className="text-[15px] font-medium text-ink">{motif.term}</span>,
            detail: motif.text,
          }))}
        />
      </DocSection>

      <DocSection id="voz" n={n("voz")} title={B.voice.title} description={B.voice.text}>
        <DefList
          termWidth="13rem"
          head={[B.voice.head.say, B.voice.head.not]}
          items={B.voice.words.map((word) => ({
            key: word.say,
            term: <span className="text-[15px] font-medium text-klein">{word.say}</span>,
            detail: <span className="text-muted">{word.not}</span>,
          }))}
        />
      </DocSection>

      <DocSection id="live" n={n("live")} title={B.stream.title}>
        <Prose text={B.stream.text} />
      </DocSection>

      <DocSection id="depois" n={n("depois")} title={B.after.title}>
        <Prose text={B.after.text} />
      </DocSection>

      <DocSection id="site" n={n("site")} title={B.site.title}>
        <Prose text={B.site.text} />
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={REPOSITORY} variant="secondary">
            {B.site.code}
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink href={GUIDE} variant="secondary">
            {B.site.guide}
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
        </div>
      </DocSection>
    </DocPage>
  )
}

/** A shape on a quiet tile, with what it is under it. */
function Specimen({ note, className, children }: { note: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex h-28 flex-col justify-between border border-dashed border-line-strong p-4", className)}>
      <div>{children}</div>
      <span className="text-[13px] text-muted">{note}</span>
    </div>
  )
}

/**
 * The motifs on a Klein panel: the lattice (±45°, a 24 px unit, Klein claro at 0.22), the two streaks (Branco and
 * Klein claro, half a lap apart) and the plate (a Klein tab with one side cut).
 */
function Motifs() {
  return (
    <div className="cut relative h-40 overflow-hidden bg-klein">
      <svg aria-hidden className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="bastidores-grade" width={U} height={U} patternUnits="userSpaceOnUse">
            <path d={`M0 0L${U} ${U}M0 ${U}L${U} 0`} stroke="var(--color-klein-claro)" strokeOpacity={0.22} strokeWidth={1} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bastidores-grade)" />
        {/* The streaks: along the lattice's diagonal, the light one half a step behind. */}
        <path d={`M${U * 3} ${U * 7}L${U * 9} ${U}`} stroke="var(--color-klein-claro)" strokeWidth={4} strokeLinecap="square" />
        <path d={`M${U * 2} ${U * 7}L${U * 8} ${U}`} stroke="var(--color-paper)" strokeWidth={4} strokeLinecap="square" />
      </svg>
      {/* The game, on the right, and the plate over it, as on the live. */}
      <div aria-hidden className="absolute inset-y-0 right-0 w-[42%] bg-navy" style={{ clipPath: "polygon(160px 0, 100% 0, 100% 100%, 0 100%)" }} />
      <span
        aria-hidden
        className="absolute bottom-6 right-0 bg-klein py-2 pl-8 pr-6 text-[15px] font-medium text-paper"
        style={{ clipPath: "polygon(36px 0, 100% 0, 100% 100%, 0 100%)" }}
      >
        muanlartins
      </span>
    </div>
  )
}
