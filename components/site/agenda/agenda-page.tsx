import { AgendaView } from "@/components/site/agenda/agenda-view"
import { PageIntro } from "@/components/site/page-intro"
import { channel } from "@/content/channel"
import { localize } from "@/lib/site"

/**
 * /canal/agenda: the lives day by day. Visitors see the next live and the days week by week as a TV guide (week.tsx,
 * which the lives page shows too); the channel's account plans it right there (agenda-editor.tsx).
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
