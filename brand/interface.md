# muanlartins — interface

How screens are built on the site and on the live: tokens, type, layout, components, motion and states. Read it
before building or changing any screen. The identity itself (mark, colours, font) is [README.md](README.md); the
words on screen are [voz.md](voz.md).

This was written from what exists (a survey of the 109 site files and the overlays' ~5,200 lines of CSS, 2026-11-21),
choosing the pattern most of the code already follows as the rule. Where the code drifts from it, the code is what
changes. Decisions Luan made are dated.

## Two surfaces, one brand

| | The site | The live (overlays, docks) |
|---|---|---|
| Ground | light: a pale Klein tint (`--ground #d6e2ff`) | Klein (`#002fa7`), panes of navy over the game |
| Ink | navy (`#001447`), muted navy for secondary | Branco (`#f4f5f7`), Klein claro for accents |
| Read from | a phone or a desk, close | a stream on any screen, far, often small |
| So | calm, readable, the brand in its details | big, bold, the brand everywhere |

Both keep the identity's geometry: straight lines, 45° cuts, the lattice, the two streaks. The site reads
lighter because it's read longer; it isn't a different brand.

## Tokens

**One set of values, named once per surface.** The site's live in `app/globals.css` (`@theme`), the overlays' in
`public/stream/stream.css` (`:root`). The same name means the same value in both. Components use tokens, never a hex,
`white` or Tailwind's own palette.

| Token | Value | Role |
|---|---|---|
| `klein` | `#002fa7` | the brand; links, primary buttons, headings on the site; the ground on the live |
| `klein-claro` | `#85a7ff` | accent on Klein or navy only (fails on the light ground: 1.8:1) |
| `paper` (Branco) | `#f4f5f7` | ink on dark; cards' fill on the site. Never `white` |
| `navy` | `#001447` | ink on the site; dark panes and dark islands |
| `ground` | `#d6e2ff` | the site's page |
| `muted` | navy 72% into ground | secondary text |
| `line` | Klein 22% into ground | dividers, card edges. Inputs and anything that must be seen as a control use `line-strong` (Klein mixed in until it reaches 3:1 against the ground) |
| `win` / `loss` | `#007645` / `#b53031` | results; `loss` is also **the** error colour. Small text in `win` on the ground is 4.4:1: use it at 14 px medium or larger |
| `ouro` | `#ffd166` | first place, crowns, podiums, rewards, on dark grounds only (today typed by hand in the minigames: make it a token) |
| `amarelo` | `#ffd23f` | the referee (VAR) and warnings on the live; one yellow, not three |

Everything else on the overlays (the navy pane's alpha, the lattice) is a variable in `stream.css`, not retyped: the
pane is `--pane` (navy .62, over the game) or `--pane-solid` (navy .92); the lattice is `--unit` 24 px and
`--lattice-line`.

## Type

Space Grotesk, everywhere (the site through `next/font`, the overlays from `space-grotesk.ttf`).

**The site's scale.** Seven sizes; a size outside it needs a reason:

| Size | Use |
|---|---|
| 48 / 36 (phones) | h1, the page's title (`PageIntro`): weight 500, tracking −0.03em, Klein |
| 24 | h2, a section's title (`Section`): 500, −0.02em, Klein |
| 20 | h3 that leads a card or a day; big numbers in stats |
| 17 | the page's intro line and long reading (1.6) |
| 15 | body in cards and lists (1.6) |
| 13 | hints, meta, captions, muted |
| 12 | eyebrows (uppercase, 500, tracking 0.12em) and badges; nothing smaller on the site except 11 px uppercase badges |

Weights: 400 for text, 500 for headings, labels and emphasis, 600 for figures that must pop. Tracking: −0.03em (h1),
−0.02em (h2, h3), 0.12em (uppercase), nothing else. Write sizes as Tailwind's scale where it has them (`text-xl`, not
`text-[20px]`); define the rest once (`text-body`, `text-hint`…) instead of `text-[15px]` in every file.

**The eyebrow is a label, not a heading.** It names a group inside a card or above a list (`Próxima live`, `Meta
atual`). A section's title is an h2.

**The live's scale.** It's read off a stream, maybe on a phone at 720p, so nothing a viewer should read is under
**18 px** at 1080p, labels under **14 px**:

| Size | Use |
|---|---|
| 96–190 | display: Começando, Já volto, the VAR's word |
| 48–64 | titles of a scene or a card (Vitória 3–1) |
| 32 | big numbers, names in a banner |
| 22–24 | chat, plates, eyebrows (`.eyebrow`: 22 px, 0.14em, Klein claro) |
| 18 | names over fans, secondary lines |
| 14 | small labels only (units, tiles' captions) |

Banner words (GOOOL!, VAR, FIM DE JOGO) are uppercase and heavy (700); everything else 500–600.

## Layout

**The site.**
- One reading column, 768 px (`max-w-3xl`), with a 24 px gutter. Wide things break out of it on purpose (timelines,
  3D, tables, the range): `-mx-6` or full bleed, never a second column width.
- Breakpoints: 640 px (`sm`, the one that matters) and 1280 px (`xl`, where the side menu moves to the margin).
- Every page: the header, `PageIntro` (an h1 and one line; viewer pages too), the first block **48 px** below it,
  sections **64 px** apart (`mt-16` / `space-y-16`), the footer. Inside a card, 20 px of padding (`p-5`), rows
  `px-4 py-3`, gaps of 8, 12 or 16 px.
- Paragraphs at most 38 rem wide.
- Grids fill their rows: no orphan tile (seven tiles go 4+3 or into two columns, not 3+3+1).
- **The channel's and games' menu.** From 1280 px, in the left margin as today. Below it, one line that scrolls
  sideways with the current page in view, not ten chips wrapping over four rows before the title.

**The live.** A 1920×1080 stage laid out in pixels (`brand/README.md`, "Stream"): margins of 44 or 64 px, things
aligned to the lattice's 24 px. The camera frame is `frame()` in `stream.js`; nothing redraws it.

## Shape

The identity is straight lines and 45° cuts ("sharp miter corners and straight cuts… no rounding", for the mark).

**The live:** every panel, plate and card is cut at 45° on two opposite corners (top-left and bottom-right, the
mark's 180° symmetry), from one utility (`--cut` + `.cortado` in `stream.css`) in three sizes: **12** (tiles, chips),
**24** (boxes, panels, the minigames), **52** (plates, big tabs). The camera frame's cut follows its band. Today the
same polygon is typed by hand ~19 times in nine sizes: that's what goes.

**The site, too** (Luan's call, 2026-11-21: the site carries the identity in its own shapes, as the live does). No
rounded corners. Cards, buttons, fields, dialogs and panels are cut at 45° on two opposite corners, top-left and
bottom-right: **12 px** for cards, panels and dialogs, **6 px** for buttons, fields and tabs; badges and chips are
square. Circles only for what is round: photos, dots, the ball, the Σ emblem. One utility does it (a `cut` class with
a size, `clip-path` on a polygon), never a polygon typed in a component. A cut element's border is drawn so the
diagonal has its edge too (an inner 1 px inset of the same shape, or an SVG frame), not lost to the clip. The stand
strip under the fans ends in a true 45° (its height equals its cut). The mark itself is never rounded (the header's
`rounded-[7px]` on it goes).

## The motifs

- **The lattice** (two sets of lines at ±45°, 24 px apart, Klein claro at 0.22): the ground of every Klein surface:
  the live's screens, the site's Klein blocks (the 404, "Em breve", the video frame, a hero). Never behind text on the
  light ground. One definition per surface (`.ground` on the live; a `Lattice` component on the site); the camera
  frame's own pattern follows the same unit.
- **The streaks** (a Branco and a Klein claro, half a lap apart): movement. The camera frame, the transitions, the
  404's digits. Something big arriving may use them; they're not decoration for static things.
- **The plate** (a Klein tab, one side cut, wiping in along the diagonal): labels on the live (the camera's name
  plate, the rank).
- **The glint** (a light sweeping across at 45°): once every few seconds on the live's frame and plates, to catch the
  eye. Not on the site.

## Components

One of each, shared, in `components/site/ui/` (exported by its `index.ts`; on the live, one class in `stream.css`):
`Button`/`ButtonLink`/`buttonClass`, `Card`/`CardLink`, `Section`, `Field`/`Input`/`Textarea`/`Select`, `Choice`/`Choices`
(a choice among options), `Badge`, `Skeleton`/`EmptyState`/`ErrorLine`, `Tabs`/`TabPanel`, `Dialog`, `Fold` ("Como
funciona"), `Ranking` (podium, top 10, see all), `BarList`, `Countdown`, `Lattice`, `StandStrip` (the fans' ground, a true
45°), `SignInButton`; documentation pages use `components/site/docs/`. A page never rebuilds one of these by hand; a new
shared piece goes there, generic. A showcase's h2 (it heads a card) is 20 px.

- **Button.** Primary: Klein fill, Branco text. Secondary: `line-strong` border, ink text, Klein border and text on
  hover. Quiet: a text link. Two sizes: default (15 px, `px-4 py-2`) and small (14 px, `px-3 py-1.5`); full width only
  for a form's main action on phones. Disabled at 40%. With an icon: 16 px, before the label.
- **Sign in with Twitch / Discord.** One component each: the primary button (Klein) with the platform's glyph, not the
  platform's colour (Twitch purple is used today in places). Same size everywhere.
- **Card.** `line` edge, `paper` at 70%, one shape (above), 20 px padding. A card that links: Klein edge on hover,
  the whole card clickable. A **showcase** (a card with a title bar) is the viewer page's; elsewhere a section is an
  h2 and its content.
- **Section.** An h2 (24 px, Klein, optional 20 px icon) and an optional one-line description, then the content.
  One component (today `Section` is written three times and `Heading` twice).
- **Tabs and filters.** Two patterns, one look each. *Tabs* switch between views of one page (the mural's Pix and
  Audiência, ranked's modes): an underlined tablist with arrow keys (the mural's is the model). *Filters* narrow a
  list (the roadmap's categories): chips with `aria-pressed`, filled Klein when on.
- **Badges.** Square (or cut), 11–12 px uppercase, 0.08em: Klein fill for the live pill and the language; `klein/10`
  for counts; `win`/`loss` tints for streaks.
- **Fields.** One field: `line-strong` edge, 16 px text on phones (no zoom on focus), `px-3 py-2`, Klein ring on focus;
  its label above in 13 px muted; its error below in `loss`. Selects and colour pickers share it.
- **Dialog.** The native `<dialog>` with `showModal` (Escape and focus come free), 16 px gutter on phones, the
  `inventory-dialog` entrance. No `div` dialogs, no `confirm()`.
- **Popover** (a viewer's card over their name): opens on hover after 350 ms or on focus, closes on Escape, reachable
  by keyboard.
- **Tooltip.** Charts share one tooltip; the floating shadow is one token (`0 8px 24px rgb(0 20 71 / .16)`).
  Elsewhere `title=` is fine for icon buttons.
- **Stand strip.** The fans stand on one component, cut at a true 45°.
- **On the live:** the frame (`frame()`), the plate (`.plate`), the eyebrow (`.eyebrow`), the pane, the stand, the
  tiles: shared from `stream.css`/`stream.js`, never copied into a page. The docks (Luan's) share one button and one
  field.

## Icons and images

- **lucide** at its default stroke: 14 px beside 12–13 px text, 16 px beside 14–15 px, 20 px on tiles and section
  titles. Decorative icons are `aria-hidden`. Brands (Twitch, YouTube, Discord…) from `brand-icons.tsx`.
- **Rank emblems** at 20, 28, 56 or 96 px.
- **Backdrops** (a Valorant agent, Rocket League's ball, the Octane) sit behind the page at low opacity, never behind
  text that must be read at full contrast.
- **Pictures that mean something have alt text**; those beside their own caption have `alt=""`.

## Motion

- **One curve:** `cubic-bezier(.65,0,.35,1)` (`--ease`) for anything that moves from one place to another, on both
  surfaces. Springs only where something follows a pointer or scroll (the menu's marker, the ball).
- **Durations:** feedback (hover, press) 150 ms; things appearing 300–600 ms; on the live, banners and plates 600–900
  ms; ambient loops slow (the lattice's drift 12 s, the streaks' lap 9 s).
- **The site stays still at rest.** Nothing loops but what's live (the Ao vivo pulse, a payment being waited for).
- **Reduced motion:** one global rule on the site turns off animation and smooth scrolling under
  `prefers-reduced-motion`; motion's `MotionConfig reducedMotion="user"` wraps the app. OBS never asks for it, so the
  live animates freely.

## States

Every piece of data the browser fetches has all four states designed:

- **Loading:** a skeleton the shape and size of what's coming, in a Klein tint (`zinc-200`, never Tailwind's grey),
  pulsing only under `motion-safe`. Never `return null` and pop in later.
- **Empty:** a dashed `line` box with the line from `voz.md` ("Nenhum Pix nesta meta ainda…"). Never a heading over
  nothing.
- **Error:** in `loss`, what failed and a way to retry. Never swallowed into a blank panel.
- **Done:** the content.

## Accessibility

- **Focus:** one global `:focus-visible` ring (2 px Klein, 2 px offset; Branco on dark islands). No `outline-none`
  without a replacement.
- **Where you are:** `aria-current="page"` in every menu (the header has it; the side menu doesn't yet).
- **Headings:** one h1 per page, then h2, h3 in order; the size follows the level.
- **Contrast:** text 4.5:1 (Klein claro never as text or lines on the light ground), controls and their edges 3:1.
- **Touch:** targets at least 24 px, 40 px for the main actions.
- **Text:** nothing under 12 px on the site (11 px uppercase badges excepted), under 18 px on the live for what
  viewers should read.

## Before shipping a screen

1. Tokens only? No hex, `white` or grey in the diff.
2. Sizes from the scale, spacing from the rhythm, the shared component where one exists?
3. All four states, keyboard focus, `aria-current`, headings in order?
4. Looked at at 400 px and at 1440 px (and the live at 1920×1080, its text legible at half size)?
5. Words checked against `voz.md`?
