import { ArrowLeft, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { channel } from "@/content/channel"
import { channelPath } from "@/lib/channel"
import { localize } from "@/lib/site"

const T = localize(channel)
const B = T.backstage
const REPOSITORY = "https://github.com/muanlartins/muanlartins"

/** The identity's three colours (brand/README.md), each with the ink that reads on it. */
const COLORS = [
  { name: "Klein", hex: "#002FA7", ink: "#F4F5F7", text: B.colors.klein },
  { name: "Branco", hex: "#F4F5F7", ink: "#002FA7", text: B.colors.branco },
  { name: "Klein claro", hex: "#85A7FF", ink: "#002FA7", text: B.colors.kleinClaro },
]

/** How the channel is made: the mark, colours and type, the live from the inside, the pages after it, the site. */
export function BackstagePage() {
  return (
    <>
      <Link
        href={channelPath()}
        className="mb-6 inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-klein"
      >
        <ArrowLeft className="h-4 w-4" />
        {T.title}
      </Link>
      <PageIntro title={B.title} description={B.description} />

      <Part title={B.mark.title}>
        <div className="grid items-center gap-8 sm:grid-cols-[1fr_12rem]">
          <Paragraphs text={B.mark.text} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark-on-klein.svg" alt="" className="mx-auto w-40 rounded-md sm:w-48" />
        </div>
      </Part>

      <Part title={B.colors.title}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {COLORS.map((color) => (
            <li key={color.hex} className="overflow-hidden rounded-md border border-line">
              <div className="flex h-24 items-end px-4 pb-3" style={{ background: color.hex, color: color.ink }}>
                <span className="text-[15px] font-medium">{color.name}</span>
              </div>
              <div className="space-y-1 px-4 py-3">
                <p className="font-mono text-[13px] text-muted">{color.hex}</p>
                <p className="text-[14px] leading-[1.5] text-ink">{color.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Part>

      <Part title={B.type.title}>
        <p className="text-5xl font-medium tracking-[-0.02em] text-klein sm:text-6xl">muanlartins</p>
        <p className="mt-2 text-[15px] tracking-[0.02em] text-muted">Aa Bb Cc 0123456789 · Σ</p>
        <p className="mt-5 max-w-[38rem] text-[16px] leading-[1.7] text-ink">{B.type.text}</p>
      </Part>

      <Part title={B.stream.title}>
        <Paragraphs text={B.stream.text} />
      </Part>

      <Part title={B.after.title}>
        <Paragraphs text={B.after.text} />
      </Part>

      <Part title={B.site.title}>
        <Paragraphs text={B.site.text} />
        <a
          href={REPOSITORY}
          target="_blank"
          rel="noreferrer"
          className="group mt-5 inline-flex items-center gap-2 rounded-md border border-line bg-paper/70 px-4 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-klein hover:text-klein"
        >
          {B.site.code}
          <ArrowUpRight className="h-4 w-4 text-muted transition-colors group-hover:text-klein" />
        </a>
      </Part>
    </>
  )
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-klein">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="max-w-[38rem] space-y-5 text-[16px] leading-[1.7] text-ink">
      {text.split(/\n\s*\n/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  )
}
