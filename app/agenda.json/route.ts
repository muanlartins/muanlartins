import { games } from "@/content/projects"
import { AGENDA } from "@/lib/agenda"
import { localize } from "@/lib/site"

// A static file in the export: the lives' schedule as data, for the stream's pages (the credits at the end of a live
// show the next one: public/stream/creditos.html). The same agenda as /agenda.ics, with each game's name.
export const dynamic = "force-static"

export function GET() {
  const names = Object.fromEntries(games.map((game) => [game.id, localize(game.title)]))
  const { timeZone, since, slots } = AGENDA
  return Response.json({ timeZone, since, slots: slots.map((slot) => ({ ...slot, name: names[slot.game] ?? slot.game })) })
}
