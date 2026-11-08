import { channel } from "@/content/channel"
import { games } from "@/content/projects"
import { ics } from "@/lib/agenda"
import { channelPath } from "@/lib/channel"
import { localize, ORIGIN } from "@/lib/site"

// A static file in the export: the lives' schedule for calendar apps.
export const dynamic = "force-static"

export function GET() {
  const body = ics({
    summary: localize(channel.lives.agenda.calendar),
    title: (id) => {
      const game = games.find((game) => game.id === id)
      return game ? `${localize(channel.lives.agenda.calendar)}: ${localize(game.title)}` : localize(channel.lives.agenda.calendar)
    },
    description: localize(channel.lives.description),
    url: `${ORIGIN}${channelPath("lives")}`,
  })
  return new Response(body, { headers: { "content-type": "text/calendar; charset=utf-8" } })
}
