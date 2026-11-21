import { ListChecks } from "lucide-react"
import { Fragment } from "react"
import { Callout, DocPage, DocSection, docsLinks } from "@/components/site/docs"
import { privacy } from "@/content/privacy"
import { localize, privacySlug } from "@/lib/site"

const URL = /(https:\/\/[^\s)]+[^\s).,])/

/** A paragraph with its bare URLs made into links. */
function Linked({ text }: { text: string }) {
  return text.split(URL).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} className="break-words text-klein underline decoration-line underline-offset-4 hover:decoration-klein">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

/** The privacy policy (content/privacy.ts) as a documentation page: the summary first, then each section numbered. */
export function PrivacyPage() {
  const page = localize(privacy)
  const [y, m, d] = privacy.updated.split("-")
  return (
    <DocPage
      trail={[]}
      title={page.title}
      description={page.description}
      meta={[
        { label: page.meta.updated, value: `${d}/${m}/${y}` },
        { label: page.meta.covers, value: "muanlartins.com.br · muanlartins.com" },
      ]}
      toc={page.sections.map((section) => ({ id: section.id, title: section.title }))}
      more={docsLinks(`/${privacySlug()}`)}
    >
      <Callout tone="strong" icon={ListChecks} title={page.summary.title}>
        <ul className="mt-1 list-disc space-y-1 pl-5 marker:text-paper/60">
          {page.summary.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </Callout>
      {page.sections.map((section, i) => (
        <DocSection key={section.id} id={section.id} n={i + 1} title={section.title}>
          <div className="max-w-[38rem] space-y-4">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-[15px] leading-[1.7] text-ink">
                <Linked text={paragraph} />
              </p>
            ))}
          </div>
        </DocSection>
      ))}
    </DocPage>
  )
}
