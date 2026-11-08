import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { BRAND_ICONS } from "@/components/site/brand-icons"
import { hasSection, LINKS, UI, privacySlug } from "@/lib/site"

// The English site is Luan's life and work: its links leave out the channel's (Twitch, YouTube).
const CHANNEL_ONLY = ["Twitch", "YouTube"]

/**
 * The footer: the name on one side, the profiles as icons on the other, and the privacy policy on a line of its own
 * below, small, where a legal page belongs rather than beside the name.
 */
export function SiteFooter() {
  const links = LINKS.filter((link) => hasSection("channel") || !CHANNEL_ONLY.includes(link.label))
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-3xl space-y-5 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[14px] text-ink">
            © {new Date().getFullYear()} Luan Martins <span className="text-muted">· muanlartins</span>
          </p>
          <ul className="flex flex-wrap gap-2">
            {links.map((link) => {
              const Icon = BRAND_ICONS[link.label as keyof typeof BRAND_ICONS]
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    rel="me"
                    title={link.label}
                    className="inline-flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-[13px] text-ink transition-colors hover:border-klein hover:text-klein"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{link.label}</span>
                    <span className="sr-only sm:hidden">{link.label}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
        <Link
          href={`/${privacySlug()}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-klein"
        >
          <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
          {UI.privacy}
        </Link>
      </div>
    </footer>
  )
}
