import { ArrowUpRight } from "lucide-react"
import { PageIntro } from "@/components/site/page-intro"
import type { Project } from "@/content/projects"
import { UI, localize, type L10n } from "@/lib/site"

export function ProjectList({
  page,
  projects,
}: {
  page: { title: L10n; description: L10n }
  projects: Project[]
}) {
  return (
    <>
      <PageIntro title={localize(page.title)} description={localize(page.description)} />

      {projects.length > 0 && (
        <ul className="mt-16 divide-y divide-line border-y border-line">
          {projects.map((project) => {
            const body = (
              <>
                <div className="space-y-2">
                  <h2 className="text-2xl font-medium text-klein tracking-[-0.02em]">{localize(project.name)}</h2>
                  <p className="max-w-[34rem] text-[15px] leading-[1.6] text-ink">
                    {localize(project.summary)}
                  </p>
                </div>
                {project.href ? (
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-klein" />
                ) : (
                  <span className="shrink-0 rounded-sm border border-klein/30 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-klein">
                    {UI.soon}
                  </span>
                )}
              </>
            )
            const row = "flex items-start justify-between gap-6 py-8"
            return (
              <li key={project.id}>
                {project.href ? (
                  <a href={project.href} className={`${row} group`}>
                    {body}
                  </a>
                ) : (
                  <div className={row}>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
