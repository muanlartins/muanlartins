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
| pt (default) | muanlartins.com.br | `pnpm dev` → :3000 | `/profissional`, `/conteudo` |
| en | muanlartins.com | `pnpm dev:en` → :3001 (`.next-en`) | `/professional`, `/content` |

`./run.sh` runs both with hot reload. Copy is written as `{ pt, en }` (`L10n`) and picked with `localize`. Content that exists in one language only, like the roadmap, sets `language`, and the other site marks it with a badge and asks YouTube for captions.

Next.js 16, static export (`output: "export"`), Tailwind v4 with the brand tokens in `app/globals.css` (the zinc ramp is redefined as Klein tints, so "gray" is bluish on purpose).

## Layout

- `content/`: everything Luan edits. `personal.ts` and `professional.ts` (Lifeline timelines), `projects.ts` (the content page), `rocket-league.ts` (the roadmap).
- `app/`: routes. `[section]/[project]/` serves a roadmap and its topic pages.
- `components/site/`: the site's own components; `components/site/roadmap/` is the roadmap. `components/ui/` holds vendored registry components (the Aceternity timeline), adapted. `components/lifeline/` is vendored too.
- `lib/`: `site.ts` (locales, sections, UI strings), `roadmap.ts` (roadmap types and ordering), `progress.ts` (saved progress), `air-roll.ts` (car physics).
- `public/models/`, `public/ranks/`: 3D models and rank emblems (credits below).
- `brand/build.py` regenerates logos, site icons and YouTube art.
- `infra/site.yml` and `.github/workflows/deploy.yml`: hosting and release.

## The Rocket League roadmap

A usaco.guide-style path at `/conteudo/rocket-league`. `content/rocket-league.ts` holds ranks → pillars (Mecânica, Estratégia) → concepts → topics. Each topic is tagged with the rank where not knowing it starts costing games, and gets its own page and video (`video`: a YouTube id; without one the topic is drawn as a draft, "Vídeo em breve"). Never rename a topic's `id`: it is its URL and its saved progress.

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

Hosting is Luan's personal AWS account (stack `muanlartins-site` from `infra/site.yml`, which he applies in the console). CI reaches it through GitHub OIDC with the repository variables `AWS_ROLE_ARN`, `SITE_BUCKET`, `DISTRIBUTION_PT` and `DISTRIBUTION_EN`. AWS credentials on a local machine may belong to another account: never use them for this site.

Both distributions also send `/rlr/*` to RLR, the replay player, on GitHub Pages (`muanlartins/rlr`, released by its own pushes); `/rlr` redirects to `/rlr/`.

A release costs well under a cent. Every build changes every page (Next.js embeds a random build id), so syncing only changed files would save little.
