<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# muanlartins

Luan Martins' personal site and the home of the muanlartins channel: improving at games with the scientific method, one technique per video, in Brazilian Portuguese. Rocket League first.

## Ground rules

- `README.md` is Luan's GitHub profile README, not documentation for this repo. Don't edit it.
- Luan writes the copy: timeline entries, rank summaries. Scaffold structure and leave `TODO` text for him rather than writing his voice.
  Topic texts are the exception: each is a written summary of the topic's video, drafted from its transcript (YouTube's automatic captions, readable in his browser even for drafts) in his terms, not new material.
- `brand/` is the source of truth for the identity (see `brand/README.md`). Don't delete anything in it, explorations included.
- Small changes go straight to `main`; bigger features go through a branch and PR. A push to `main` is a release (below), so run `pnpm lint` first.
- Commit messages are imperative and short, with no names.

## One codebase, two sites

Each build bakes in one locale (`NEXT_PUBLIC_LOCALE`, see `lib/site.ts`):

| Locale | Domain | Dev | Section slugs |
|---|---|---|---|
| pt (default) | muanlartins.com.br | `pnpm dev` → :3000 | `/profissional`, `/conteudo`, `/canal` |
| en | muanlartins.com | `pnpm dev:en` → :3001 (`.next-en`) | `/professional`, `/content`, `/channel` |

`./run.sh` runs both with hot reload. Copy is written as `{ pt, en }` (`L10n`) and picked with `localize`. Content that exists in one language only, like the roadmap, sets `language`, and the other site marks it with a badge and asks YouTube for captions.

Next.js 16, static export (`output: "export"`), Tailwind v4 with the brand tokens in `app/globals.css` (the zinc ramp is redefined as Klein tints, so "gray" is bluish on purpose).

## Layout

- `content/`: everything Luan edits. `personal.ts` and `professional.ts` (Lifeline timelines), `projects.ts` (the content page: one entry per game), `rocket-league-home.ts` (Rocket League's home: intro, ranked and lives copy, links), `rocket-league.ts` (the roadmap), `channel.ts` (the channel's pages), `privacy.ts` (the privacy policy at `/privacidade` · `/privacy`, which the channel's Google OAuth consent screen links to), `profile.ts` (the profile page's copy), `pix.ts` (the Pix page's copy and voices).
- `content/matches/`: ranked sessions, one JSON file each, published by the stream's "Partidas" dock (`public/stream/partidas.html`) with Luan's GitHub token. Each publish is a push to `main`, so a release. A session also records when OBS's stream and recording started and stopped (`outputs`; a VOD second is wall clock minus the recording's start) and each match's `start`; `<id>.events.json` beside it is each match's event log (touches with km/h, goals, shots, saves, demos), players as roles (`me`, `mate1`, `opp2`), for editing the lives. The site skips it. `/conteudo/rocket-league/ranked` (`components/site/ranked/`, `lib/ranked.ts`) reads them at build time, one tab per mode.
- **The channel** at `/canal` · `/channel` (`components/site/channel/`, `lib/channel.ts`, copy in `content/channel.ts`): Luan as a content creator, whatever the game. Its home says what the channel is, where to watch, what a viewer finds in a live (the crowd, with a few sample fans and the way to `/perfil`) and leads to the lives, the backstage (`/canal/backstage`: the identity, the live from the inside, the site) and the games, Rocket League first. A game's own pages stay in the content section; what's about the channel doesn't repeat there.
- `content/lives/`: the Twitch lives, each kept whole as an unlisted YouTube video: `<date>.json` (video id, the game played by its id, summary, chapters; a chapter can be one of the day's matches, by id) and `<date>.transcript.json` (`[seconds, text]` lines from whisper, with friends' names taken out). `/canal/lives` (`components/site/lives/`, `lib/lives.ts`, read by `lib/lives-files.ts`) lists them, each at `/canal/lives/<date>` with its video, chapters and a searchable transcript; `#t=<seconds>` opens the video there, which is how the ranked page's "na live" links work. While the channel is live (`lib/twitch.ts`, through DecAPI: the site has no backend for Twitch's API), the header shows an "Ao vivo" pill and the lives page plays the stream.
- `app/`: routes. `[section]/[project]/` serves a game (`lib/game.ts`): its home, `/fundamentals` (the roadmap), `/ranked`, and each topic at `/<topic>`, with the game's side menu from its `layout.tsx`; and the channel's `/lives`, each live at `/lives/<date>`, and `/backstage`. The content section stays game-agnostic; a game's pages live under it.
- `components/site/`: the site's own components; `components/site/game/` is a game's home and menu (the Octane on a turntable, the ball bouncing), `components/site/roadmap/` the roadmap, `components/site/ranked/` the ranked record, `components/site/lives/` the lives, `components/site/channel/` the channel's home and backstage. `components/ui/` holds vendored registry components (the Aceternity timeline), adapted. `components/lifeline/` is vendored too.
- `lib/`: `site.ts` (locales, sections, UI strings), `roadmap.ts` (roadmap types and ordering), `progress.ts` (saved progress), `air-roll.ts` (car physics).
- `public/models/`, `public/ranks/`: 3D models and rank emblems (credits below).
- `public/stream/`: the Twitch overlays, plain HTML pages that OBS loads by URL (see "Stream" in `brand/README.md`).
- **The viewer's profile** at `/perfil` · `/profile` (`components/site/profile/`, `lib/profile.ts`): viewers sign in with Twitch (implicit flow: the token stays in their browser) and build their fan for the stream's crowd. The fan's options, defaults and drawing are `public/stream/torcedor.js` and `torcedor.css`, shared with `torcida.html` (the page loads them from `/stream/`). Saving goes through the profile API in `infra/site.yml` (a Lambda behind an HTTP API, a DynamoDB table keyed by login); `TWITCH_CLIENT_ID` and `PROFILE_API` in `lib/profile.ts` point at the Twitch app and the stack's `PerfilApiUrl`, and `NEXT_PUBLIC_TWITCH_CLIENT_ID` / `NEXT_PUBLIC_PROFILE_API` override them to try the page against a local stand-in.
- **Σ ("sigmas")**, the channel's points: one total per viewer, earned in the lives and never spent or lost. `public/stream/sigma.js` (shared like `torcedor.js`) turns a total into Rocket League ranks (the top takes about a year of lives), weighs the goal's dedication (a log, so newcomers still get theirs) and sets where free colours unlock. The Σ API in `infra/site.yml` (its own Lambda, table and HTTP API, output `SigmaApiUrl`) answers `GET /sigmas?logins=` publicly and takes `POST /presenca` from `torcida.html` once a minute while the stream is on, with the key from the stack parameter `SigmaChave`, which only OBS's source URL holds (`#chave=`, never in the repository): 1 Σ a minute, 10 for each live and 5 for each live in a row, up to 50. The stand orders fans by Σ with their emblem by the name; the profile shows each viewer theirs (`SIGMA_API` in `lib/profile.ts`, `NEXT_PUBLIC_SIGMA_API` to override).
- **Live Pix** at `/pix` (`components/site/pix/`, `lib/pix.ts`, copy and voices in `content/pix.ts`): a viewer writes or records a message, picks a voice, and pays a Pix straight to Luan's account; the alert plays on stream. The value identifies the Pix: each reservation holds the lowest free cents of its amount for 15 minutes (R$ 5,00, then 5,01…), and the page builds the bank's own static QR with that amount. The phone (MacroDroid) forwards the bank's "Pix recebido" notification to the Pix API, which pays the reservation holding that value; a Pix nobody reserved waits in the dock. Signed in with Twitch, a Pix gives 10 Σ per real (and adds to `doado` in the Σ table). The API is `infra/pix/index.mjs` (its header has the whole story; `filtro.mjs` is the word filter), a Lambda that CI deploys on each push once the repository variable `PIX_FUNCTION` names it; `infra/site.yml` holds its table, HTTP API (output `PixApiUrl`) and parameters: `PixChave`, `PixNome`, `PixCidade` (as the bank's QR has them) and `PixToken` (the phone's), never in the repository. On stream: `public/stream/pix.html` (the band, the goal bar, the voices from `narrador.py`, each reservation rendered while the viewer pays) and the dock `pix-painel.html` (place a Pix without a form, register one by hand, repeat an alert, take one off the mural, set the goal), both with `?api=` and the Σ key (`#chave=`). The payer's legal name is never stored, only their first name for three days while a Pix waits in the dock; the mural shows only who opted in, by the name they chose. `NEXT_PUBLIC_PIX_API` points the page at a local stand-in; without an API, `/pix` says it's coming and the channel doesn't link it.
- `brand/build.py` regenerates logos, site icons and YouTube art.
- `scripts/`: after a live, `live.py` writes its page (`content/lives/`: whisper transcript, chapters from the dock's times, a draft summary) and thumbnail, and `youtube.py` sets its video through the Data API (title, description with chapters, thumbnail, playlist, captions) once it's uploaded in Studio. The OAuth client, token and the friends' names kept out of transcripts live outside the repo, in `%USERPROFILE%\.config\muanlartins`. `narrador.py` is the stream's voices (edge-tts → Applio's RVC on the GPU, in WSL, started at Windows login): the goal narrator for the crowd overlay and the Pix voices, including a viewer's recording (whisper, then RVC). It runs from this working copy, so the checked-out branch is what runs after a restart. Applio and the voice models (community RVC models, checked with `handoff/piloto/unpack_check.py`) live outside the repo, in `~/.local/share`; `public/pix/vozes/` holds each voice's sample for the form.
- `infra/site.yml` and `.github/workflows/deploy.yml`: hosting and release.
- `handoff/`: the plan and the Mac pilot (Pix alerts, voices, crowd, captions) handed to the Windows session that runs the stream. Start there.

## The Rocket League roadmap

A usaco.guide-style path at `/conteudo/rocket-league/fundamentals`, inside Rocket League's home. `content/rocket-league.ts` holds ranks → pillars (Mecânica, Estratégia) → concepts → topics. Each topic is tagged with the rank where not knowing it starts costing games, and gets its own page and video (`video`: a YouTube id; without one the topic is drawn as a draft, "Vídeo em breve"). Never rename a topic's `id`: it is its URL and its saved progress. `fundamentals` and `ranked` are taken by the game's pages; the build refuses a topic with either.

Luan plans topics and tracks recording in an Obsidian note outside the repo (`- [ ] Rank · Topic`; `#gravando` = recorded, editing; `[x]` = published). The note is the source of truth for what exists; this file follows it.

How the page works:

- **Progress** lives in the visitor's browser (`localStorage` key `progress:<roadmap>`, statuses `practicing` / `done`), read with `useProgress`. Every change fires the `roadmap-progress` event with the progress before and after it, which is what celebrations listen to, so loading a page never triggers one.
- **Ranks progress independently** (`rankFills`), and nothing is locked. The visitor's rank is the lowest unfinished one (`currentRank`). Each rank's in-game emblem climbs its divisions I → III as its topics are done (`divisionOf`). Moving up a rank or a division shows a banner and confetti.
- **The rail** (`components/ui/timeline.tsx`) fills each rank's stretch with its own progress; the 3D ball (`rolling-ball.tsx`) rolls to the tip.
- **The scene follows scrolling, not progress.** The page glows in the colour of the rank being read, and the Octane behind it (`garage.tsx`, 20% opacity) air rolls as the page scrolls, both ways, and takes that rank's paint (`paint` on a rank overrides its colour: silver's legible text colour is too dark for chrome; unranked is matte primer). Topic pages have the ball large in the bottom-left corner (`ball-backdrop.tsx`), rolling with scroll.
- **Air roll physics** (`lib/air-roll.ts`) is RocketSim's spin model at 120 ticks/s, ported from Luan's Losfeld visualizer: air roll left with the stick turning clockwise. A replay records each tick so scrolling can scrub it either way.

### 3D and assets

- three.js through React Three Fiber and drei. `three` is pinned to `^0.182`: 0.183+ deprecates `THREE.Clock`, which r3f 9 still uses, and logs a warning on every page.
- Canvases use `frameloop="demand"` and call `invalidate()` while something moves. They load with `next/dynamic(..., { ssr: false })`, which must be called from a client component.
- Size models with drei's `<Resize>`, not by measuring a bounding box: re-measuring an already scaled scene compounds the scale on remount.
- GLTFLoader rewrites node names, so find parts by material name: the Octane's paint is the material `Octane_Body`.
- Models are compressed with `npx @gltf-transform/cli@4 optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size <px> --palette false`. Keep `--palette false`, or the body paint is merged into a shared palette material and can't be recoloured.
- Rank emblems come from `github.com/manucabral/rocket-league-rank-viewer` (`overlay/ranks/`), trimmed and converted to 192 px WebP. The Rocket League wiki's CDN refuses scripted downloads.
- Credits, shown on the page: Rocket League and the rank emblems are Psyonix/Epic Games'; the site is unofficial. The Octane and ball models are by Jako (CC BY 4.0).

## Checking changes

- `pnpm lint`, then both builds: `pnpm build` and `pnpm build:en`. Delete `out/` afterwards.
- Look at visual changes in both locales and at phone width. Headless Chrome needs `--use-angle=swiftshader --enable-unsafe-swiftshader` to render WebGL.

## Release

A push to `main` releases both sites: CI lints, builds both locales and syncs them to S3 behind two CloudFront distributions, then clears their caches. A failing lint or build stops the release. Pull requests run the same build without publishing.

Hosting is Luan's personal AWS account (stack `muanlartins-site` from `infra/site.yml`, which he applies in the console). CI reaches it through GitHub OIDC with the repository variables `AWS_ROLE_ARN`, `SITE_BUCKET`, `DISTRIBUTION_PT` and `DISTRIBUTION_EN`, and `PIX_FUNCTION` (the stack's output `PixFunction`) to deploy the Pix API's code. AWS credentials on a local machine may belong to another account: never use them for this site.

Both distributions also send `/rlr/*` to RLR, the replay player, on GitHub Pages (`muanlartins/rlr`, released by its own pushes); `/rlr` redirects to `/rlr/`.

A release costs well under a cent. Every build changes every page (Next.js embeds a random build id), so syncing only changed files would save little.
