import { channel } from "@/content/channel"
import { ics } from "@/infra/comum/agenda.mjs"
import { buildAgenda } from "@/lib/agenda-build"
import { channelPath } from "@/lib/channel"
import { localize, ORIGIN } from "@/lib/site"

// A static file in the export: the agenda as it was at the last release, for calendars subscribed here before the
// profile API served it live (GET /agenda.ics, the one the site links now).
export const dynamic = "force-static"

export async function GET() {
  const agenda = (await buildAgenda()) ?? { slots: [], extras: [], off: [], games: {} }
  const body = ics(agenda, { nome: localize(channel.lives.agenda.calendar), url: `${ORIGIN}${channelPath("agenda")}` })
  return new Response(body, { headers: { "content-type": "text/calendar; charset=utf-8" } })
}
