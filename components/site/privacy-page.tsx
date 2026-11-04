import { Fragment } from "react"
import { PageIntro } from "@/components/site/page-intro"
import { privacy } from "@/content/privacy"
import { localize } from "@/lib/site"

const URL = /(https:\/\/[^\s)]+[^\s).,])/

/** A paragraph with its bare URLs made into links. */
function Linked({ text }: { text: string }) {
  return text.split(URL).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} className="break-words text-klein underline underline-offset-2 hover:no-underline">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

export function PrivacyPage() {
  const page = localize(privacy)
  return (
    <div className="space-y-12">
      <PageIntro title={page.title} description={page.description} />
      {page.sections.map((section) => (
        <section key={section.title} className="max-w-[38rem] space-y-4">
          <h2 className="text-2xl font-medium text-klein tracking-[-0.02em]">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-[16px] leading-[1.65] text-ink">
              <Linked text={paragraph} />
            </p>
          ))}
        </section>
      ))}
      <p className="text-[14px] text-muted">{page.updated}</p>
    </div>
  )
}
