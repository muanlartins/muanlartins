import { Play } from "lucide-react"
import qrcode from "qrcode-generator"
import type { ReactNode } from "react"
import { FanStand } from "@/components/site/channel/fan-stand"
import { AgendaDays, Podium } from "@/components/site/channel/home-tiles"
import { NextLive } from "@/components/site/channel/next-live"
import { DiversosCard } from "@/components/site/diversos/entries"
import { GameArtCredits, GameTile } from "@/components/site/game/game-card"
import { GameNextLine } from "@/components/site/game/game-next-line"
import { PageIntro } from "@/components/site/page-intro"
import { Badge, CardLink, Lattice, Section } from "@/components/site/ui"
import { SHIPPED } from "@/content/changelog"
import { channel } from "@/content/channel"
import { games, listedGames } from "@/content/projects"
import { dayMonth } from "@/lib/agenda"
import { channelPath } from "@/lib/channel"
import { commands } from "@/lib/commands"
import { gamePath } from "@/lib/game"
import { topFans } from "@/lib/home-build"
import type { Live } from "@/lib/lives"
import { PIX_API } from "@/lib/pix"
import { localize, MURAL_SLUG, PIX_SLUG, pixUrl, profileSlug } from "@/lib/site"
import { cn } from "@/lib/utils"

const T = localize(channel)

/**
 * The channel's home, which is the site's: little to read, a lot to click. The live on Twitch or the countdown to the
 * next, the games with when each is live, then every page of the channel's menu as a tile with something of its own
 * drawn on it (the stand, the Pix's QR, a duel, the week, the latest live, the podium, the chat, the newest feature,
 * the mark), from what the build already has: the page asks nothing new in the browser.
 */
export async function ChannelHome({ lives }: { /** Newest first. */ lives: Live[] }) {
  const top = await topFans()
  const latest = lives[0]
  const latestGame = latest && games.find((game) => game.id === latest.game)
  const feature = SHIPPED[0]

  return (
    <>
      <PageIntro title={T.title} description={T.description} />

      <NextLive />

      <Section title={T.games.title} className="mt-16">
        <Games />
      </Section>

      <Section title={T.more.title} className="mt-16">
        {/* Three columns (two on phones), the wide tiles placed so every row fills: no tile left alone at the end. */}
        <ul className="grid grid-flow-dense grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile wide href={`/${profileSlug()}`} title={T.profile.title} line={T.more.profile} art={<FanStand />} artClass="bg-klein/[0.06]" />
          {PIX_API && <Tile href={`/${PIX_SLUG}`} title={T.pix.title} line={T.more.pix} art={<PixCode />} artClass="grid place-items-center bg-klein/[0.06]" />}
          <Tile href={channelPath("minijogos")} title={T.minijogos.title} line={T.more.minigames} art={<Duel />} artClass="bg-navy" />
          <Tile wide href={channelPath("agenda")} title={T.agenda.title} line={T.more.agenda} art={<AgendaDays />} />
          {PIX_API && <Tile href={`/${MURAL_SLUG}`} title={T.mural.title} line={T.more.mural} art={<><Lattice /><Podium top={top} /></>} artClass="bg-klein" />}
          <Tile
            href={channelPath("lives")}
            title={T.lives.title}
            line={latest ? T.more.lives.replace("{d}", [dayMonth(latest.date), latestGame && localize(latestGame.title)].filter(Boolean).join(" · ")) : T.more.livesNone}
            art={latest ? <Thumbnail video={latest.video} /> : <Lattice />}
            artClass="bg-klein"
          />
          <Tile href={channelPath("comandos")} title={T.comandos.title} line={T.more.commands} art={<Chat />} artClass="bg-klein/[0.06]" />
          <Tile href={channelPath("sigma")} title={T.sigma.title} line={T.more.sigma} art={<Points />} artClass="bg-klein" />
          <Tile
            href={channelPath("roadmap")}
            title={T.roadmap.title}
            line={feature ? T.more.roadmap.replace("{t}", feature.title) : T.more.roadmapNone}
            art={feature?.media?.[0] ? <Feature src={feature.media[0].src} date={dayMonth(feature.date)} /> : <Lattice />}
            artClass="bg-klein"
          />
          <Tile href={channelPath("backstage")} title={T.backstage.title} line={T.more.backstage} art={<Mark />} artClass="bg-klein" />
        </ul>
      </Section>

      <GameArtCredits className="mt-16" />
    </>
  )
}

/**
 * The games, each as its card from the game kit (components/site/game/game-card.tsx, the content page's art too) with
 * when it's next live: three side by side, one under the other on phones.
 */
function Games() {
  // The listed games (Rocket League; an archived one, Valorant since 2026-11-24, isn't) and, last, every other game
  // (Jogos diversos, components/site/diversos/entries.tsx).
  return (
    <ul className={cn("grid gap-3", listedGames.length + 1 >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {listedGames.map((game) => (
        <li key={game.id}>
          <GameTile game={game.id} href={gamePath(game)} title={localize(game.title)} line={<GameNextLine game={game.id} />} />
        </li>
      ))}
      <li>
        <DiversosCard />
      </li>
    </ul>
  )
}

/** One of the channel's pages: something of its own drawn on top (decorative: the title and line say it), then its name and a line. */
function Tile({ href, title, line, art, artClass, wide }: { href: string; title: string; line: string; art: ReactNode; artClass?: string; wide?: boolean }) {
  return (
    <li className={cn(wide && "col-span-2")}>
      <CardLink href={href} className="flex h-full flex-col gap-4">
        <div aria-hidden className={cn("cut relative h-28 overflow-hidden sm:h-32", artClass)}>
          {art}
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-medium tracking-[-0.02em] text-klein">{title}</h3>
          <p className="text-[13px] leading-[1.5] text-muted">{line}</p>
        </div>
      </CardLink>
    </li>
  )
}

/** A real QR code to the Pix page, built with the site: on a computer, the phone that pays is one scan away. */
function PixCode() {
  const qr = qrcode(0, "M")
  qr.addData(pixUrl())
  qr.make()
  const n = qr.getModuleCount()
  let d = ""
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" className="h-[88px] w-[88px] sm:h-[100px] sm:w-[100px]">
      <rect x={-2} y={-2} width={n + 4} height={n + 4} className="fill-paper" />
      <path d={d} className="fill-klein" />
    </svg>
  )
}

/**
 * The ball duel, still: two balls in shirts with their weapons crossing in a spark, one leaving a trail, in the live's
 * arena on the night's navy.
 */
function Duel() {
  return (
    <>
      <Lattice />
      <svg viewBox="0 0 200 128" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <path d="M44 6h120v108l-8 8H36V14Z" className="fill-navy/60 stroke-klein-claro/50" strokeWidth="1" />
        {/* The trail the light ball leaves, flying in from the top right. */}
        {[0.1, 0.18, 0.28].map((opacity, i) => (
          <circle key={i} cx={152 - i * 7} cy={24 + i * 5} r="16" className="fill-klein-claro" opacity={opacity} />
        ))}
        <line x1="120" y1="50" x2="99" y2="66" className="stroke-paper" strokeWidth="3.5" />
        <circle cx="130" cy="42" r="16" className="fill-klein-claro stroke-navy" strokeWidth="2" />
        <path d="M119 31l22 22" className="stroke-navy" strokeWidth="6" />
        <line x1="80" y1="84" x2="101" y2="66" className="stroke-klein-claro" strokeWidth="3.5" />
        <circle cx="70" cy="92" r="16" className="fill-paper stroke-navy" strokeWidth="2" />
        <path d="M59 81l22 22" className="stroke-klein" strokeWidth="6" />
        {/* The spark where the weapons meet. */}
        <path d="M100 57v-7M108 66h7M100 75v7M92 66h-7M106 60l5-5M94 72l-5 5" className="stroke-paper" strokeWidth="2" strokeLinecap="square" />
      </svg>
    </>
  )
}

/** The latest live's frame whole, as YouTube serves it (16:9, on the lattice above and below), with a play sign. */
function Thumbnail({ video }: { video: string }) {
  return (
    <>
      <Lattice />
      <span className="absolute inset-x-0 top-1/2 aspect-video -translate-y-1/2">
        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail, already sized */}
        <img src={`https://i.ytimg.com/vi/${video}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="cut-sm absolute right-2 top-2 grid h-7 w-7 place-items-center bg-klein text-paper">
          <Play className="h-3.5 w-3.5 fill-current" />
        </span>
      </span>
    </>
  )
}

/** The chat taking part: a few of its commands as the stand's fans would type them, and the first of them on the stand. */
function Chat() {
  const all = commands().grupos.flatMap((group) => group.comandos.map((command) => command.comando))
  const picked = ["!pula", "!ola", "!sigma"].filter((command) => all.includes(command))
  const who = ["rafa", "bia.lima", "otto"]
  return (
    <>
      <ul className="absolute inset-y-0 left-0 flex flex-col justify-center gap-2 px-4 text-[13px]">
        {picked.map((command, i) => (
          <li key={command} className="flex items-center gap-2">
            <span className="font-medium text-klein">{who[i]}</span>
            <span className="bg-klein px-1.5 py-0.5 font-medium text-paper">{command}</span>
          </li>
        ))}
      </ul>
      <div className="absolute inset-y-0 right-0 hidden w-16 sm:block">
        <FanStand count={1} names={false} />
      </div>
    </>
  )
}

/** The newest feature on the roadmap, its own picture with the day it came out. */
function Feature({ src, date }: { src: string; date: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- the roadmap's picture, already 960×540 */}
      <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <Badge className="absolute bottom-2.5 left-2.5">
        {T.more.latest} · {date}
      </Badge>
    </>
  )
}

/** The mark on its lattice, with the three colours beside it. */
/** Σ, the site's points: the symbol and the ways they come, as chips. */
function Points() {
  return (
    <>
      <Lattice />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[64px] font-medium leading-none text-paper max-sm:left-1/2 max-sm:-translate-x-1/2">Σ</span>
      <ul className="absolute inset-y-0 right-4 flex flex-col items-end justify-center gap-1.5 text-[12px] font-medium max-sm:hidden">
        {["+1 por minuto", "+10 por live", "+3 no VAR"].map((chip) => (
          <li key={chip} className="bg-paper px-1.5 py-0.5 text-klein">
            {chip}
          </li>
        ))}
      </ul>
    </>
  )
}

function Mark() {
  return (
    <>
      <Lattice />
      {/* eslint-disable-next-line @next/next/no-img-element -- the mark itself, a small SVG */}
      <img src="/brand/mark-small-clear.svg" alt="" className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2" />
      <span className="absolute bottom-3 right-3 flex gap-1">
        <i className="h-2.5 w-2.5 bg-paper" />
        <i className="h-2.5 w-2.5 bg-klein-claro" />
        <i className="h-2.5 w-2.5 border border-klein-claro/50 bg-navy" />
      </span>
    </>
  )
}
