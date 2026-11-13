---
name: agenda
description: The lives' agenda - when the lives are, of which game, with which title - which Luan edits himself at muanlartins.com.br/canal/agenda; the site, the subscribable calendar, Twitch's calendar, the live's Twitch title and category and the Instagram story all follow it. Use when he asks about the schedule, a day off, a one-off live, the agenda page or editor, the opening's title/category or story, or when something there looks wrong.
---

# The lives' agenda

Since 2026-11-13 the agenda is the one source of truth, and **Luan changes it himself**, without Claude: at
`https://muanlartins.com.br/canal/agenda`, signed in with the channel's Twitch ("Editar a agenda (conta do canal)" at the
bottom of the page, or the link on `/perfil`). There he edits:

- **Toda semana:** each slot's days (weekends too), start and end in Brasília time (an end before the start runs past
  midnight), game and the live's title (blank = the game's default).
- **Lives avulsas:** a live on one date.
- **Folgas:** the next three weeks' weekly lives, one click each for "won't happen".
- **Jogos:** each game's Twitch category and default title; "Buscar categoria na Twitch" adds any game.

**Salvar** puts it in the profile API (`PUT /agenda`, the channel only) and then on Twitch's calendar from his browser
(`lib/agenda-twitch.ts`), and shows what changed on Twitch. If the sign-in lacks `channel:manage:schedule`, the editor
offers "Conectar o calendário da Twitch" and saving changes only the site. Twitch's calendar only mirrors the agenda:
changes made on Twitch's dashboard are undone by the next save.

## What follows it

- **The site, without a release:** the lives page and `/canal/agenda` (the next 7 days with dates, "sem live" on an empty
  day, a day off struck through, the next live and the week's titles), the home's next live and each game's weekly
  slots. Pages are built with the API's agenda of that moment and ask again in the browser.
- **Calendar apps:** `GET /agenda.ics` on the profile API, always current (the page's "Google" and "Apple e outros"
  links). The site's own `/agenda.ics` is the agenda as of the last release, for subscriptions from before.
- **Twitch's title and category:** the Anúncios dock (`public/stream/abertura.js`) sets them from 90 minutes before a
  scheduled live, once per live (needs the dock's Twitch sign-in to carry `channel:manage:broadcast`: if the dock says
  "Conecte a Twitch de novo (permissão do título)", he clicks Conectar in "Conexão com a Twitch" once).
- **The Instagram story** at the live's opening, from the same dock (see the `antes-da-live` skill and AGENTS.md).
- **The end credits'** next live (`creditos.html`).

## When Claude is asked

- To read it: `curl -s https://wtpv8afsak.execute-api.us-east-1.amazonaws.com/agenda` (agenda, `em`, and `proximas`, the
  next two weeks' lives with dates).
- To change it for him: tell him where (`/canal/agenda`); it takes a minute and nothing else needs doing. Only if he
  asks Claude to do it: a `PUT /agenda` needs the channel's Twitch token issued to the site's app; the editor is the
  way, since it also syncs Twitch.
- Twitch's limit: it cancels only a recurring segment's **next** occurrence, so a day off more than a week ahead stays
  on Twitch until a later save or "Sincronizar a Twitch de novo" that week (the editor lists them as waiting).
- The rules are in `infra/comum/agenda.mjs` (tested by `node --test infra/comum/agenda.test.mjs`); a change to them
  ships with `pnpm lint`, both builds and a look at `/canal/agenda` in a browser, like any release.
