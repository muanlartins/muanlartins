# Camera filters: how one is made

The camera filters are `public/stream/filtros.html` (the "Filtros" browser source in OBS), switched from the
"Filtros" dock (`filtros-painel.html`). The page is the **engine**: the camera, MediaPipe's trackers (face, hands,
shoulders, body mask, in workers), carrying what sits on him between their answers, the particles (`vfx.js`), the
sounds (`sfx.js`), the effects on his body, the Santa hat and the drawing. Every filter is a **folder here**, and the
same steps make every one, whatever the game.

- `index.js` lists the folders in the dock's order (`MODULOS`). A new filter is a folder and a line there.
- `<folder>/index.js` is the filter: `filtros` (its entry, read by the dock and the page) and, when it does
  something of its own, `criar(motor)`.
- `<folder>/efeitos.js` holds its particle systems (the game's values), `<folder>/sons.json` its sound cues.
- `visuais.js` is the looks on his head and shoulders (a model's hair and clothes, his face and hands drawn back
  over them, his own hair around them painted over with the background). Two kinds: a Valorant model, whose pieces
  the page finds by its skeleton's bones (`buildAgent`), or any model placed by numbers (`modo: "fixo"`: the parts
  it names as a piece on his head and one on his shoulders, each with its size, place and turn), which Luan fits on
  himself with `filtros.html?modo=<id>&ajuste` (`ajuste.js`: a panel with each piece's numbers, live, and "Copiar"
  for the finished entry; loaded only with `?ajuste`). Both get the same lighting, fade, erasing, face and hands
  over them and Santa hat. A look is part of making a filter (a Valorant agent's from the game's own model, another
  game's from its official one), fitted on a live's clip with the headless test; Luan fine-tunes any with `?ajuste`.

Never while Luan is live (extracting and testing load the CPU for minutes; the scripts refuse). The games' files
never leave `public/stream/privado/` (gitignored: never committed or published); the pages read them from the
shared checkout that serves localhost:8126 (`scripts/servidor_filtros.py`).

## The entry (`filtros`)

An array, since one folder can hold more than one filter (the cars: Octane and Fennec):

| field | what |
|---|---|
| `id` | the page's mode (`?modo=<id>`, the dock's `{ filtro: "<id>" }`) |
| `nome`, `jogo` | the dock's name and the group it's listed under |
| `rosto` or `desenho` | the dock's picture: an image path from `public/stream/` (an agent's face, `../valorant/agentes/<id>.webp`) or a drawing in the dock's `DESENHOS` |
| `acoes` | its one-offs, `[id, key, name]`: the key the game uses (C, Q, E, X, also the page's keys in a browser) or `""`, the name as the game says it in Portuguese |
| `teclas` | browser keys for one-offs without a game key (`{ d: "demo" }`) |
| `opcoes` | the dock's switches, `[id, name]`, sent to every module as `opcoes`; off until Luan turns one on, or `[id, name, true]` for one on until he turns it off (Celeste's hair) |
| `gestos` | the dock's notes, `[ability, how]` |
| `sons` | its cues' prefix (`"sage-"`): decoded when it comes on, kept from being cut |
| `tint` | its particles' grade in `vfx.js`'s `TINTS` (when plain ACES shifts its colours) |
| `atalho` | a browser key that turns it on and off |
| `fora` | kept off the dock |

## The module (`criar`)

`export async function criar(motor)` runs once when the page loads (load meshes there; textures wait for `ligar`)
and returns an object; every part is optional, and the engine calls each only while the filter is the one on (but
`opcoes`, which every module gets):

| hook | when |
|---|---|
| `ligar(id)` | it comes on: `vfx.preload(EFEITOS)` |
| `desligar()` | another comes on: stop everything (clear its particles, stop its loops, hide its meshes) |
| `acao(id, now)` | a one-off from the dock, a key or a viewer's channel points (`visita`) |
| `opcoes(o)` | the dock's switches, every few seconds, whether it's on or not (so they're there when it comes on) |
| `tecla(k)` | a key the entry doesn't map |
| `quer(now)` | what it needs tracked this frame: `{ maos, rosto, ombros, corpo, tronco }` (`ombros: "sempre"` every frame, else ~15/s; `corpo` the body mask, only while an effect on his body needs it; a look on him has his face, hands and shoulders tracked anyway; `tronco` with `corpo`: also the mask without the chair behind him, in `uniforms.uTronco`, for what's painted on his clothes) |
| `maos(r, now)` | the hand tracker's answer (its gesture); a string it returns goes on `?debug`'s hands line |
| `pose(lm, now)` | the body tracker's landmarks (a gesture made with the arms) |
| `seguir(dt)` | every frame after the engine carries the trackers' answers (something held in moving hands: Sova's bow drawn by hand) |
| `mover(now, dt)` | every frame, just before every filter's particles move: what its particles follow (an orb in flight, a fireball in a hand), so they don't trail it by a frame (Phoenix's abilities) |
| `atualizar(now, dt)` | every frame, after the particles have moved |
| `desenhar(fase, r)` | its own drawing at its moment (below) |
| `ocupado()` | an ability is still playing (a visit waits for it before leaving) |
| `pronto()` | it can take an ability (its meshes loaded) |
| `hud()` | its line in `?debug`'s panel |
| `estado` | what `?debug` puts in `window.filtros` for tests |

Each ability is a `start…(now)` that refuses while it's already on and an `update…(now)` driven by the clock (stages
by elapsed seconds, so a slow frame can't skip a stage or a sound).

### What the engine hands it (`motor`)

- **three.js**: `THREE`, `GLTFLoader` (with `MeshoptDecoder` for compressed models), `roomEnv()` (an environment
  map for lit meshes).
- **Where he is**: `faceLm` (the face's 478 points, carried to this frame; `FACE_OVAL` their outline's, in order), `lastHands` (each hand's 21 points),
  `handAt(side)` (the hand furthest to that side on the box, 1 right, -1 left, or a spot low on that side),
  `handShape(h, gesture, aspect)` (a hand's shape: its size, its knuckles' middle, fist or open; `gesture` the
  recognizer's call, `aspect` the video's), `pose` (`left`, `right` shoulders and `elbows` on the box, `seen`, `dz`),
  `faceBox()` (the face's centre, width, top and height on the box), `headSeen`, `headPos`, `headAt()` (his head in
  the 3D camera, or a spot in the middle while it isn't seen).
- **The box and the 3D camera** (MediaPipe's, in centimetres): `at3(u, v, dz)` is the point at box `u, v` (0..1, y
  up) at his face's depth, `dz` cm nearer; `onRay`, `onBox(p)` back to the box; `toScreen(x, y)` from the camera's
  image; `headCam`; `W`, `H`, `cover`, `video`.
- **Particles**: `vfx.spawn(defs, anchor, { scale, dur, segment })` (a system from `efeitos.js` at an anchor
  function, `segment` spreading it along a line: a wall, a patch), `vfx.clear()`, `vfx.ok` (the textures loaded).
- **Sounds**: `sfx.play(cue, { pan, loop, gain, delay, offset })` returns a handle (`stop(fade)`, `set({ gain,
  pan })`); `panAt(u)`, `pan3(p)` for where it happens on the box.
- **On his body** (`corpo`, one shader over the body mask; the values stay until changed and a new filter clears
  them): `brilho(i, [r, g, b], amount, [over, halo, rim])` two glows (Valorant's red reveal `[1, 0.27, 0.33]` with
  `[0.2, 0.9, 0.8]`; Sage's jade heal with `[0.16, 0.7, 0.6]`), `gelo` frost creeping up him (0..1), `escuro` the
  camera darkening round him (0..1), `marca(x, y, amount)` the marker over his head.
- **The picture**: `sacudir(ms, px, now)` shakes the box (the engine's, `px` pixels dying away over `ms`; a new
  filter stops it); `deslocar(dx, dy)` moves the box's whole picture `dx`, `dy` pixels of a 1280-wide box (right, up)
  for this frame only, zoomed in just enough that no edge shows (asked every frame it lasts, from `atualizar`; several
  add up: Celeste's dash whips it, its feather floats it); for a 2D layer of its own, `quad(material)`, `ortho`,
  `renderer` (its own render targets too: Celeste keeps his cutout from the last frames), `uniforms` (`uCam`, `uMask`,
  `uTime`, `uFace` and `uFaceUp` the face's oval…), `GLSL_COMMON` and `VERT`.
- **The body mask**: `uniforms.uMask`, tracked only while a module's `quer` asks for `corpo`; `mascaraEm` is when the
  newest came in (`performance.now()`), so an effect asked for at a moment can wait for a mask made after it
  (Celeste's afterimages and frozen silhouette).
- **Helpers**: `toEdge(p, dir, inset)` (where a ray from a point on the box leaves it, a little inside),
  `clamp01(v, lo, hi)` (0.05 to 0.95 by default: kept inside the box), `ease(t)` (a smooth step), `bez(a, c, b, k)`
  and `bezDir` (a quadratic curve's point and direction), `easeOutBack`.
- `q` (the page's URL parameters), `fail(where, error)` (the `?debug` panel's errors).

### Drawing (`desenhar(fase, r)`)

The frame is drawn in a fixed order; a module draws its own things at its phase, usually its own `THREE.Scene` with
`r.renderer.clearDepth()` then `r.renderer.render(scene, r.headCam)`:

1. the camera (and his hair erased round a look)
2. `"atras"`: behind him (Sova's drone passing behind, hidden by his body)
3. a look's clothes, then his face and hands back over them; the look's hair, the ball or the car on his head (and
   his face or hands back over a look's hair when it asks: `behind`, `rostoPorCima`/`maosPorCima: "tudo"`)
4. `"segurado"`: in his hands, over the look (Sova's bow; `r.maosPorCima()` draws his hands back over it)
5. the Santa hat
6. the effects on his body (`corpo`)
7. `"frente"`: in front of him (Sage's orb and wall, arrows, a drone)
8. `"antesFx"` (Phoenix's fire between his palms), the particles (tone mapped, bloom), `"depoisFx"` (a glare over
   everything: Phoenix's flash)

## A Valorant agent

1. **The game's files.** The tools live outside the repository, in `~/.local/share/valorant-extract/` (CUE4Parse in a
   console app; `public/stream/privado/valorant/README.txt`). They refuse while he's live or Valorant is open, and
   never delete. Find the agent's internal folder (`. ~/.local/share/valorant-extract/env.sh; dotnet
   ~/.local/share/valorant-extract/vex/bin/vex.dll list "^ShooterGame/Content/Characters/"`: Phoenix is Phoenix, Sova
   Hunter, Sage Thorne) and which internal ability folder is which key (`Characters/<Folder>/S0/Ability_*`: they
   don't follow the keys), add both to `run.sh`'s and `sons.sh`'s `case`, then run `run.sh <agent>` (`--keys` first
   after a patch, ~5 min) and `sons.sh <agent>` (~2 min). Read `summary/fxc.txt` (what each ability spawns, where,
   which sound event), `summary/<key>/*.json` (each particle system; `python3 -I
   ~/.local/share/valorant-extract/scripts/digest.py <file>` tables its emitters) and `summary/sheets/<key>.png`.
2. **`efeitos.js`**: copy Sage's. `addTextures` for the textures (path under `privado/valorant/`, the channel with
   its mask, the flipbook's columns and rows, whether its colours shade it, whether it needs its edge faded), then
   per key an object of named systems, each a list of emitters with the game's values in its centimetres (z up there
   is y here). What an emitter takes is read in `vfx.js`'s `emit` and `update`. Colours are the game's colour times
   its colour scale, unclamped.
3. **`index.js`**: copy Sage's. Its entry, and `criar`: one `start…`/`update…` pair per key, each placing the game's
   systems on him through the engine (from a hand, at his chest, across the bottom of the box, flying to the edge),
   the game's meshes for what the ability throws or builds (`files/…/Ability_*/` and `VFX/Meshes/` as GLB; an
   ability's mesh may come without its textures inside: they're the PNGs beside it), the effects on his body
   (`corpo`) and the sounds at each stage.
4. **One gesture at most**, for its signature ability (Luan, 2026-11-11: Phoenix's flash, Sova's drone, Sage's
   barrier), easy to do rather than like the ability: a test on `handShape` of both hands (or the arms, `pose`),
   held a moment, locked until the hands part. Everything else is from the dock.
5. **`sons.json`**: one cue a line, named `<agent>-<ability>-<moment>`: `{ "evento": "<event name>", "agente": "<agent>" }`
   renders the game's event (`{FP}` for the caster's version when it has one; names in
   `privado/valorant/<agent>/sons/wwiser/txtp/`, and `summary/fxc.txt` says which event each moment plays),
   `{ "wav": "<event>/<file>", "agente": … }` a looped sound as it is; `gain`, `delay`, `cut`, `fade`, `loop`. Then
   `python3 scripts/filtros_sons.py <agent>-` writes them to `privado/sons/`.
6. **The line** in `index.js`'s `MODULOS`; the dock shows it with its face (run `scripts/valorant_assets.py` first if
   the site lacks it).

## Another game

The same folder. What changes is where the effects and sounds come from: the game's own files when they can be read
(Rocket League's sounds came from its Wwise banks, `~/.local/share/rl-extract/`; a game made with FMOD keeps its
sounds in `.bank` files, which vgmstream reads as they're installed: `{ "fmod": "<stream name>", "banco": "sfx" }` in
`sons.json`, a `*` in the name for one file per stream it matches, as Celeste's) or drawn in a shader of the module's
own when the game's are sprites that don't carry to a camera (Celeste's are: its moves are drawn on his own picture,
with plain shapes, and its strawberry is Celeste 64's model). A game's effects drawn as particles still go through `vfx.js` with textures added by
`addTextures` (any path under `privado/`).

## A game that talks to the filter

A filter can follow the game itself when the game can tell it what happens, as Celeste does (Luan, 2026-11-21): a
small reader on the stream PC serves **server-sent events on its own loopback port** (Celeste's is an Everest mod in
the game, `scripts/celeste-mod/`, on 127.0.0.1:8797; Valorant's and Rocket League's readers are `scripts/valorant.py`
and the Partidas dock), one JSON per message with its `tipo`: an `estado` with where the player is and the counts (sent
on connecting and when it changes), and the moments as they happen. The module:

- opens an `EventSource` in `ligar()` and closes it in `desligar()` (only while the filter is on; `ligar` comes again
  with every dock message, so opening twice must do nothing), reopening one that gave up (`readyState` 2) every few
  seconds; `?<game>-jogo=<url>` points it elsewhere for tests (never `?<id>=`: that is the look's model, and one there
  silently takes the look off);
- queues what arrives and plays it from `atualizar(now)`, so each moment starts on the frame's clock;
- sets off its own one-offs from the game's moments, with options that say they came from the game: silent (the
  game's own sound is already on the stream), lighter when the game repeats them often, and timed by the game (Celeste's
  black holds until the respawn; its feather lasts as long as the game's);
- lets the dock turn the following off (an `opcoes` switch on by default, Celeste's "Seguir o jogo") and keeps the
  one-offs on the dock;
- asks the trackers for what the game's state needs only while it needs it (`quer`: Celeste's hair keeps the body mask
  on while he's in a level; the hands' gesture is off while the game drives the dash);
- can draw an ambient of its own in phase `"atras"` from the state (Celeste's per chapter): one quad over the box that
  takes `uCam` towards its colours and lays its own particles, the far ones kept off his body with `uMask` while it's
  fresh (`mascaraEm`), all kept off his face with `uFace`/`uFaceUp`, crossfading on a change and fading out when the
  game goes.

To test without the game, the reader gets a stand-in that plays a scripted sequence the same way
(`scripts/celeste-mod/simular.py`), and `filtros_teste.py <id> --jogo=<game> @<step>:<times>…` sends its steps on the
virtual clock (below).

## Check it

`uv run -q --with playwright --with pillow python scripts/filtros_teste.py <id>` runs every one-off in a headless
browser on a virtual clock and saves screenshots at chosen seconds (`barreira:0.5,1,2`), with the sounds it played
and any errors, into `~/.cache/muanlartins/filtros-teste/`. `Math.random` comes from a seed (`--semente=N`, 1), so
a change that shouldn't change the picture can be checked against a run from before it. `--video=<clip>.y4m` uses a
few seconds of a live's `Câmera.mkv` as the camera (with `--params=zoom=1`), for gestures and the body mask. On the
CPU the trackers' first answers come late (the body mask's first, ~30 s): put a long one-off first in the list, or
the first one that needs the mask or the face runs without them. Gestures can be tried with made-up hands:
`?debug`'s `window.__hands(now)` returns `{ landmarks: [hand] }` in the hand tracker's place. A filter that follows a game takes
`--jogo=<game>` (`JOGOS` in the script: Celeste's stand-in), and then `@<step>:<times>` arguments are the stand-in's
steps (Celeste's: `@entra:1 @dash:0.12,0.35 @morte:0.35,1.4 @renasceu:0.4 @cap-5:2`, names in
`public/stream/celeste-sequencia.json`). Look at
the contact sheet: placement and size on a 16:9 box, his face kept clear. Nobody has seen or heard it live until Luan
tries it in OBS: say so.

A look (`visuais.js`) has no one-offs: give a made-up one with its times for the screenshots, on a live's clip, since
the fake camera has no face to put it on (`filtros_teste.py <id> nada:5,10,20,30 --video=<clip>.y4m
--params=zoom=1`); `--params='zoom=1&ajuste'` shows the fitting panel too. On the sheet: the head piece follows his
head and keeps clear of his face, his hair round it is painted over (once the body mask comes in), the shoulders'
piece sits on his shoulders with his hands over it, nothing leaves the box. Fit it from the sheet (`ajuste`'s panel shows
the parts' names), then Luan fine-tunes it in his browser: `filtros.html?modo=<id>&ajuste` on localhost:8126.

## Release

The roadmap: a new filter isn't an entry of its own; it goes into the camera filters' entry (`filtros-na-camera` in
`content/changelog.ts`, same commit), its name in the line if it fits, a picture or clip of it, and the viewer who
suggested it in `credits` with `about`, if one did. Then AGENTS.md's credits line when it uses a game's files. OBS
reads the pages from the shared checkout: after the release they reach it with a pull there (other sessions keep
uncommitted work in it, so look before touching it).
