import { viewerData } from "@/lib/viewer-data"
import { hasSection } from "@/lib/site"

// A static file in the export: what the site knew about each viewer when it was built (their ideas on the roadmap, the
// matches they played with Luan), read by their page in the browser.
export const dynamic = "force-static"

export function GET() {
  return Response.json(hasSection("channel") ? viewerData() : { ideias: {}, partidas: {} })
}
