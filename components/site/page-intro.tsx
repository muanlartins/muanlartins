import type { ReactNode } from "react"

export function PageIntro({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-medium text-klein tracking-[-0.03em] sm:text-5xl">{title}</h1>
      <p className="max-w-[38rem] text-[17px] leading-[1.6] text-ink">{description}</p>
      {children && <div className="pt-4">{children}</div>}
    </section>
  )
}
