import { PHASE_DEVELOPMENT_SERVER } from "next/constants"
import type { NextConfig } from "next"

export default function config(phase: string): NextConfig {
  return {
    output: "export",
    // Lets both locales run side by side in dev; builds export to out/ either way.
    ...(phase === PHASE_DEVELOPMENT_SERVER &&
      process.env.NEXT_PUBLIC_LOCALE === "en" && { distDir: ".next-en" }),
    images: { unoptimized: true },
  }
}
