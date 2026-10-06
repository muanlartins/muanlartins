import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { HTML_LANG, LINKS, LOCALE, ORIGIN } from "@/lib/site"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: { default: "Luan Martins · muanlartins", template: "%s · muanlartins" },
  openGraph: { siteName: "muanlartins", locale: HTML_LANG[LOCALE].replace("-", "_") },
}

const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Luan Martins",
  alternateName: "muanlartins",
  url: ORIGIN,
  sameAs: LINKS.map((link) => link.href),
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={HTML_LANG[LOCALE]} className={spaceGrotesk.variable}>
      <body className="flex min-h-dvh flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }}
        />
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-32">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
