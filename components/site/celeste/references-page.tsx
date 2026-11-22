import Link from "next/link"
import { MountainBackdrop } from "@/components/site/celeste/mountain-backdrop"
import { SourceLink } from "@/components/site/celeste/source-link"
import { Fold } from "@/components/site/ui"
import { DocPage, DocSection } from "@/components/site/docs"
import { CREDITS, FUNDAMENTALS } from "@/content/celeste"
import { BUILT, METHOD, SOURCES, STUDY, UNSEEN } from "@/content/celeste-fontes"
import { celestePath } from "@/lib/celeste"
import { checkReferences, studiedWith } from "@/lib/celeste-fontes"

export const REFERENCES_INTRO = {
  title: "Referências",
  description: "De onde saiu o roteiro da minha trajetória com Celeste e por onde eu vou estudar cada técnica.",
}

const T = {
  how: "Como a gente montou",
  built: "O que a gente consultou",
  open: (n: number) => `Mostrar as ${n} fontes (tem spoiler)`,
  read: { full: "Lido inteiro", part: "Lido em parte", index: "Só os capítulos do vídeo" },
  study: "O que separei pra estudar",
  unseen: "O que ficou de fora",
  for: "Pra",
}

/** The bibliography at /conteudo/diversos/celeste/referencias: how the roadmap was put together, and from what. */
export function CelesteReferencesPage() {
  checkReferences()
  const studying = Object.keys(SOURCES).filter((id) => FUNDAMENTALS.some((topic) => STUDY[topic.id].some((ref) => ref.source === id)))
  const toc = [
    { id: "como", title: T.how },
    { id: "montou", title: T.built },
    { id: "estudar", title: T.study },
    { id: "de-fora", title: T.unseen },
  ]

  return (
    <>
      <MountainBackdrop />
      <DocPage
        trail={[{ label: "Celeste", href: celestePath() }]}
        here={REFERENCES_INTRO.title}
        title={REFERENCES_INTRO.title}
        description={REFERENCES_INTRO.description}
        meta={[
          { label: "Fontes", value: Object.keys(SOURCES).length },
          { label: "Técnicas", value: FUNDAMENTALS.length },
        ]}
        toc={toc}
      >
        <DocSection id="como" n={1} title={T.how}>
          <ul className="max-w-[38rem] space-y-3 text-[15px] leading-[1.6] text-ink">
            {METHOD.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </DocSection>

        <DocSection id="montou" n={2} title={T.built}>
          <Fold summary={T.open(BUILT.length)}>
            <ul className="divide-y divide-line border-y border-line">
              {BUILT.map(({ source, use, read }) => (
                <SourceLink key={source} source={SOURCES[source]}>
                  {T.read[read]}. {use}
                </SourceLink>
              ))}
            </ul>
          </Fold>
        </DocSection>

        <DocSection id="estudar" n={3} title={T.study}>
          <ul className="max-w-[38rem] divide-y divide-line border-y border-line">
            {studying.map((id) => (
              <SourceLink key={id} source={SOURCES[id]}>
                <Topics source={id} />
              </SourceLink>
            ))}
          </ul>
        </DocSection>

        <DocSection id="de-fora" n={4} title={T.unseen}>
          <ul className="max-w-[38rem] space-y-3 text-[15px] leading-[1.6] text-ink">
            {UNSEEN.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </DocSection>

        <p className="mt-16 max-w-[38rem] text-[12px] leading-[1.6] text-muted">{CREDITS}</p>
      </DocPage>
    </>
  )
}

/** The fundamentals a source is studied for, each linking to its page. */
function Topics({ source }: { source: string }) {
  const topics = studiedWith(source)
  if (!topics.length) return null
  return (
    <span className="block">
      {T.for}{" "}
      {topics.map((topic, index) => (
        <span key={topic.id}>
          {index > 0 && ", "}
          <Link href={celestePath(topic)} className="text-klein hover:underline">
            {topic.title}
          </Link>
        </span>
      ))}
    </span>
  )
}
