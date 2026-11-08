---
name: agenda
description: Changing when Luan's lives are - the schedule shown on the site's Lives page, the subscribable agenda.ics and Twitch's calendar, all from content/agenda.json. Use when he changes days or times of the lives.
---

# The lives' schedule

One file, `content/agenda.json`, feeds everything:

- **The site:** the Lives page's "Agenda" block (`components/site/lives/agenda.tsx`, `lib/agenda.ts`): the
  week, "Fins de semana a definir" while no weekend slot exists, the next live from the viewer's clock and, for
  viewers elsewhere, the times in their zone. Copy in `content/channel.ts` → `lives.agenda`.
- **`/agenda.ics`:** a weekly calendar viewers subscribe to (`app/agenda.ics/route.ts`, static).
- **Twitch's calendar:** `scripts/twitch_agenda.py`.

Format: `slots` of `{ "days": [1…7], "start": "HH:MM", "end": "HH:MM", "game": "<id>" }` (ISO days, 1 = Monday;
the game by its id in `content/projects.ts`) in `timeZone` (America/Sao_Paulo, UTC−3 all year); `since` is the
first day the schedule holds; `twitch` has each game's segment title and category (Rocket League is `30921`,
Valorant `516575`). The site shows each slot with its game (the agenda's days, the game's home, the content page,
the channel's games) and `/agenda.ics` names each event after it.

## Changing it

1. Edit `content/agenda.json`.
2. `python3 scripts/twitch_agenda.py` shows what changes on Twitch (keeps, creates, removes weekly segments, a
   segment being its day, time, length and game; it leaves one-off segments alone), then `--apply`. Its token (scope `channel:manage:schedule`, the site's Twitch
   app) is in `%USERPROFILE%\.config\muanlartins\twitch-agenda.json`; a public client's refresh token lasts 30
   days, after which it asks Luan to approve a code at twitch.tv/activate again (give him the link; it waits).
3. `pnpm lint`, both builds, look at the Lives page in pt and en and at phone width, delete `out/`.
4. Commit, ask Luan before pushing (a release), then check `https://muanlartins.com.br/agenda.ics`.
