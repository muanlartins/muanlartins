import { LINKS } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-[13px] text-muted">
        <p>© {new Date().getFullYear()} Luan Martins · muanlartins</p>
        <ul className="flex gap-5">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} rel="me" className="transition-colors hover:text-klein">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
