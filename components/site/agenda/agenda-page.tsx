import { AgendaEditor } from "@/components/site/agenda/agenda-editor"
import { Weekly } from "@/components/site/agenda/weekly"
import { Agenda } from "@/components/site/lives/agenda"
import { PageIntro } from "@/components/site/page-intro"
import { channel } from "@/content/channel"
import { localize } from "@/lib/site"

/**
 * /canal/agenda: the next seven days with their dates, the weekly lives, the calendar to subscribe to, and, for the
 * channel's account, the editor that changes all of it (the site at once, Twitch's calendar with it).
 */
export function AgendaPage() {
  return (
    <>
      <PageIntro title={localize(channel.agenda.title)} description={localize(channel.agenda.description)} />
      <div className="mt-12">
        <Agenda page />
      </div>
      <Weekly />
      <AgendaEditor />
    </>
  )
}
