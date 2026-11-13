---
name: filtros
description: Adding a Valorant agent's abilities (or another filter) to the stream's camera filters - extracting the game's effects and sounds, writing its vfx module, wiring it into filtros.html and the Filtros dock, testing headless. Use when Luan asks for a new agent or ability on the camera, or after a Valorant patch breaks one.
---

# A new filter on the camera

The camera filters are `public/stream/filtros.html` (the "Filtros" browser source in OBS) switched from the
"Filtros" dock, `public/stream/filtros-painel.html`. OBS and the dock's side are in the obs skill; this is how a
filter is made. Sage (2026-11-12) is the latest done this way and the simplest to copy: her look from her model (`AGENTS`) and her
abilities, all in one block of filtros.html ("Sage's abilities"), `public/stream/vfx-sage.js` and its cues in `scripts/filtros_sons.py`.

Never while Luan is live (the extraction and the test load the CPU for minutes), and the game's files never leave
`public/stream/privado/` (gitignored, never committed or published): the pages read them from the working copy that
serves localhost:8126, the shared checkout `~/repos/muanlartins`.

## 1. The game's files

The tools live outside the repository, in `~/.local/share/valorant-extract/` (CUE4Parse in a console app; see
`public/stream/privado/valorant/README.txt`). Both refuse while he's live or Valorant is open, and never delete: an
earlier export is refused until it's moved away.

1. The agent's internal folder: `. ~/.local/share/valorant-extract/env.sh; dotnet
   ~/.local/share/valorant-extract/vex/bin/vex.dll list "^ShooterGame/Content/Characters/"`. Phoenix is Phoenix,
   Sova is Hunter, Sage is Thorne (others: the community's agent lists name them).
2. Which internal ability folder is which key: list `Characters/<Folder>/S0/` and read the names in each
   `Ability_*` (1P animations, `VFX/Ability_*` systems). They don't follow the keys: Sage's Ability_E is her wall (C),
   Ability_4 the slow orb (Q), Ability_Q the heal (E).
3. Add a line to the `case` in `run.sh` (folder and the key map, `Internal=Key:Name,…`) and in `sons.sh` (folder),
   then run `~/.local/share/valorant-extract/run.sh <agent>` (`--keys` first after a patch) and `sons.sh <agent>`.
   About 5 minutes for run.sh, 2 for sons.sh.
4. Read what came out: `summary/fxc.txt` (what each ability spawns, where, which sound event), `summary/<key>/*.json`
   (each particle system compacted), `summary/sheets/<key>.png` (its textures). For a quick table of a system's
   emitters (texture, blend, lifetime, size, HDR colour, rate, burst, velocity):
   `python3 -I ~/.local/share/valorant-extract/scripts/digest.py summary/<key>/<system>.json`. Meshes the effects use
   are under `files/…/VFX/Meshes/` and `files/…/Ability_*/` as GLB (an ability's own mesh may come without its
   textures inside: they're the PNGs beside it).

## 2. The effects: `public/stream/vfx-<agent>.js`

One module per agent for `vfx.js`, copying `vfx-sage.js`: `addTextures` for the textures (path under
`privado/valorant/`, the channel holding its mask, the flipbook's columns and rows, whether its colours shade it, and
whether it needs its edge faded), then per key an object of named systems, each a list of emitters with the game's
values in its centimetres (z up there is y here). The page scales a system as it spawns it. What an emitter takes
(`tex`, `add`, `burst`, `rate`, `life`, `size`, `sizeLife`, `color`, `color2`, `colorLife`, `alpha`, `alphaLife`,
`frames`, `fps`, `rot`, `spin`, `vel`, `accel`, `drag`, `box`, `sphere`, `radial`, `offset`, `local`, `align`, `beam`,
`interp`, `delay`, `dur`) is read in `vfx.js`'s `emit` and `update`. Colours are the game's colour times its colour
scale, unclamped: tone mapping turns them white-hot in the middle. Give the agent a grade in `TINTS` (`vfx.js`) if
plain ACES shifts its colours (Phoenix's fire needed a warm one).

## 3. The page: `public/stream/filtros.html`

All in one block after the other agents' (search "Sage's abilities"), with these joints elsewhere in the file:

- `import * as <AGENT> from "./vfx-<agent>.js"` with the others, and `vfx.preload(<AGENT>)` in `setMode`.
- Its id in `MODES`, its cue prefix in `SONS`, its reset in `setMode` (when another filter comes on), its one-offs
  in `acao`, its keys (C, Q, E, X) in the keydown handler, its update in the main loop, its tint where
  `vfx.tint` is set, a line in the `?debug` HUD and its state in `window.filtros`.
- Trackers: hands (`runGestures`, for its gesture and for casting from a hand: `handAt(side)`), face (`runFace`:
  `at3(u, v, dz)` puts things at his face's depth), shoulders (`runPose`: `pose.left`, `pose.right`), body mask
  (`runBody`, only while an effect on his body needs it: `sage.maskUntil`). Each runs only for the filters that use
  it: add the mode to their conditions in the main loop.
- Each ability: a `start…(now)` that refuses while it's already on, and an `update…(now)` driven by the clock
  (stages by elapsed seconds, so a slow frame can't skip a sound), spawning systems with
  `vfx.spawn(defs, anchor, { scale, dur, segment })` (`segment` spreads it along a line: a wall, a patch) and sounds
  with `sfx.play(cue, { pan, loop, gain })` (`panAt(u)` from where it is in the box).
- The game's meshes: loaded with GLTFLoader from `privado/valorant/<agent>/files/…`, lit in a scene of their own,
  drawn with `headCam` (centimetres) after `renderer.clearDepth()`; things on his body (a tint, a glow, frost) go in
  the overlay shader `sovaMat` with uniforms of their own and the body mask (`maskAt`).
- One gesture at most, for its signature ability (Luan, 2026-11-11: Phoenix's flash, Sova's drone, Sage's heal),
  and easy to do rather than like the ability: a test on `handShape(...)` of both hands, held a moment, locked
  until the hands part. Everything else is from the dock.
- The look: an entry in `AGENTS` with the agent's model in `privado/<agent>.glb` (compressed with
  `npx -y @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --palette false`):
  its hair on his head, its clothes on his shoulders, his face and hands drawn back over them. Options there: `body`
  (the body's material, when it isn't named Body), `extra` (more pieces on the torso), `behind` (locks beside the
  face), `forehead`, `trim`. Bone names may come numbered by an export (Neck_12) and a finer face rig has
  L_Brow_Mid_01 in place of L_Brows: `buildAgent` reads both. Check it on his face with `--video=` (step 6).

## 4. Its sounds

Cues in `scripts/filtros_sons.py`'s `CUES` named `<agent>-<ability>-<moment>`: `V(agent, event)` renders the game's
event from `sons/wwiser/txtp/` (`{FP}` for the caster's version when it has one), `W(agent, path)` takes a looped
sound as it is (`sons/wav/`). Event names: `ls privado/valorant/<agent>/sons/wwiser/txtp/`, and `summary/fxc.txt`
says which event each moment plays. Then `python3 scripts/filtros_sons.py <agent>-` writes them to `privado/sons/`.

## 5. The dock

An entry in `FILTROS` in `filtros-painel.html`: `id` (the page's mode), `nome`, `jogo` (it groups the dropdown),
`acoes` (`[id, key, Portuguese name as in the game]`), `opcoes` (switches) and `gestos` (`[ability, how]`). The
dropdown shows the agent's face from the site's own `public/valorant/agentes/<id>.webp`.

## 6. Check it

`uv run -q --with playwright --with pillow python scripts/filtros_teste.py <agent>` runs every one-off from the dock
in a headless browser on a virtual clock and saves screenshots at chosen seconds (`barreira:0.5,1,2`), with the
sounds it played and any errors; `--video=<clip>.y4m` uses a few seconds of a live's `Câmera.mkv` as the camera,
for the gesture and the body mask. Look at the contact sheet: placement and size on a 16:9 box, his face kept clear.
Nobody has heard or seen it live until Luan tries it in OBS: say so.

## 7. Release

The roadmap entry (`content/changelog.ts`, in the same commit, with a clip if there's a picture to show; credit only
if a viewer suggested it), the dock's list in the obs skill, and AGENTS.md's credits line (the game's files used).
OBS reads the pages from the shared checkout: after the release they reach it with a pull there (other sessions keep
uncommitted work in it, so look before touching it).
