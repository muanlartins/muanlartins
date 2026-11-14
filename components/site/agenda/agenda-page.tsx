import { AgendaView } from "@/components/site/agenda/agenda-view"
import { PageIntro } from "@/components/site/page-intro"
import { channel } from "@/content/channel"
import { localize } from "@/lib/site"

/**
 * /canal/agenda: the lives day by day. Visitors see the next live, the month as a calendar, each day's lives with
 * their run of the show, and the usual week; the channel's account plans it right there (agenda-editor.tsx).
 */
export function AgendaPage() {
  return (
    <>
      <PageIntro title={localize(channel.agenda.title)} description={localize(channel.agenda.description)} />
      <div className="mt-12">
        <AgendaView />
      </div>
    </>
  )
}
