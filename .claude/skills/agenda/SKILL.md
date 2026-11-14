---
name: agenda
description: The lives' agenda - when the lives are, of which game, with which title and run of the show - which Luan plans himself day by day at muanlartins.com.br/canal/agenda; the site, the subscribable calendar, Twitch's calendar, the live's Twitch title and category and the Instagram story all follow it. Use when he asks about the schedule, a day's plan, a day off, the agenda page or editor, the opening's title/category or story, or when something there looks wrong.
---

# The lives' agenda

Since 2026-11-13 the agenda is the one source of truth, and **Luan plans it himself**, day by day, without Claude: at
`https://muanlartins.com.br/canal/agenda`, signed in with the channel's Twitch ("Planejar a agenda (conta do canal)" at
the bottom of the page, or the link on `/perfil`). The page becomes the editor:

- **The calendar:** a month, the usual week's lives dashed, planned days dotted. Clicking a day opens it below.
- **The day:** a note for the day, its lives (time, game, title; blank = the game's default) and each one's **roteiro**
  (steps at a time or not: "15h · inhouse com os viewers"). "Sem live neste dia" leaves it with none (a day off: the
  note says why), "Repetir em <next week>" copies it to the same weekday next week, "Voltar à semana padrão" undoes the
  plan. Any change to a day that follows the usual week plans it.
- **Semana padrão** (folded): the usual week, which fills every day not planned yet, weekends too.
- **Jogos** (folded): each game's Twitch category and default title; "Buscar categoria na Twitch" adds any game.
- **Ver como visitante** shows the page as viewers see it.

**Salvar** puts it in the profile API (`PUT /agenda`, the channel only) and then on Twitch's calendar from his browser
(`lib/agenda-twitch.ts`): each live of the next eight weeks as its own segment, so any day can differ from the usual
week. Opening the editor moves Twitch's eight weeks on by itself. If the sign-in lacks `channel:manage:schedule`, the
editor offers "Conectar o calendário da Twitch" and saving changes only the site. Twitch's calendar only mirrors the
agenda: changes made on Twitch's dashboard are undone by the next sync. With `NEXT_PUBLIC_PROFILE_API` on localhost
(a local stand-in) the editor never touches Twitch.

## What follows it

- **The site, without a release:** `/canal/agenda` (the next live with its roteiro, the month, the day picked in full),
  the lives page (the next 7 days with dates, a day's note or "sem live", the week's titles), the home's next live and
  each game's usual slots. Pages are built with the API's agenda of that moment and ask again in the browser.
- **Calendar apps:** `GET /agenda.ics` on the profile API, always current (the page's "Google" and "Apple e outros"
  links). The site's own `/agenda.ics` is the agenda as of the last release, for subscriptions from before.
- **Twitch's title and category:** the Anúncios dock (`public/stream/abertura.js`) sets them from 90 minutes before a
  scheduled live, once per live (needs the dock's Twitch sign-in to carry `channel:manage:broadcast`: if the dock says
  "Conecte a Twitch de novo (permissão do título)", he clicks Conectar in "Conexão com a Twitch" once).
- **The Instagram story** at the live's opening, from the same dock (see the `antes-da-live` skill and AGENTS.md).
- **The end credits'** next live (`creditos.html`).

## When Claude is asked

- To read it: `curl -s https://wtpv8afsak.execute-api.us-east-1.amazonaws.com/agenda` (agenda, `em`, and `proximas`, the
  next two weeks' lives with dates, titles and roteiros).
- To change it for him: tell him where (`/canal/agenda`); it takes a minute and nothing else needs doing. Only if he
  asks Claude to do it: a `PUT /agenda` needs the channel's Twitch token issued to the site's app; the editor is the
  way, since it also syncs Twitch.
- Twitch shows eight weeks: if Luan neither saves nor opens the editor for that long, its calendar runs out (the
  site's doesn't). "Sincronizar a Twitch" in the editor brings it up to date.
- The rules are in `infra/comum/agenda.mjs` (tested by `node --test infra/comum/agenda.test.mjs`); a change to them
  ships with `pnpm lint`, both builds and a look at `/canal/agenda` in a browser, like any release.
