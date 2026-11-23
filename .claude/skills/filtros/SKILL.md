---
name: filtros
description: Making a camera filter for the stream (a Valorant agent's abilities, another game's, an effect) - its folder under public/stream/filtros/, the game's effects and sounds, the module the engine runs, the dock, the headless test. Use when Luan asks for a new filter, agent or ability on the camera, or after a Valorant patch breaks one.
---

# A new filter on the camera

The procedure is `public/stream/filtros/README.md`: read it first. In short, `public/stream/filtros.html` is the
engine (camera, trackers, particles, sounds, body effects, drawing) and every filter is a folder under
`public/stream/filtros/`: its entry (`filtros`, which the dock and the page read), its module (`criar(motor)`: what
its abilities do, through the engine's pieces), its particle systems (`efeitos.js`, the game's values) and its sound
cues (`sons.json`). `filtros/index.js` lists the folders in the dock's order. Sage (`filtros/sage/`) is the one to
copy.

- **The look comes with the filter** (`filtros/visuais.js`: a model's hair and clothes on him). A Valorant agent's
  is the game's own model, extracted read-only like its abilities; another game's, its official model (Celeste's
  Madeline and Badeline: Celeste 64's public `Content/Models`), placed by numbers (`modo: "fixo"`) and fitted on a
  live's clip with the headless test; Luan fine-tunes any with `filtros.html?modo=<id>&ajuste`. The files stay in
  `public/stream/privado/`. (A fan look on his own stream from the games' official models is fine: Luan,
  2026-11-21.)
- Fit a look with Luan at the camera: `python3 scripts/servidor_filtros.py 8141 --espelho ~/.cache/muanlartins/filtros-espelho`
  and he opens `filtros.html?modo=<id>&ajuste&espelho` there (kept visible: a covered window stops drawing). Read
  `quadro.jpg` and `erros.txt` in that folder; `date +%s%N > …/versao` reloads his page. It's his camera: only while
  he's posing for the fitting. Stop that server as soon as it's over and delete the frames; never sample them to test
  effects (a live's clip does that: `--video=`). Clothes of a chibi model
  don't fit him: Celeste's are painted on his body mask instead. What's painted there uses `uTronco`
  (`public/stream/tronco.js`, `quer`'s `tronco`), never `uMask`: every segmenter takes his black chair for his shoulders.
- Never while Luan is live, and the games' files never leave `public/stream/privado/` (gitignored).
- One gesture at most per filter, for its signature ability; the rest from the dock.
- Each Valorant agent is made by a subagent of its own, one at a time, never in parallel (Luan, 2026-11-21: it
  keeps the main session's context intact). Brief it with the README, Sage's folder as the model, the agent and
  its extraction (abilities and look), and what to report back (the contact sheet, the sounds heard, anything it couldn't place).
- Check with `scripts/filtros_teste.py <id>` (seeded, so before/after runs compare), look at the contact sheet, and
  tell Luan nobody has seen it live until he tries it in OBS.
- A look's eyes in the character's colour are one line in its entry (`olhos`, visuais.js; Badeline's red). A
  Celeste chapter's scenery behind him is `scripts/celeste_arte.py <map>` (read-only from the installed game, into
  `privado/celeste/fases/`) and its entry in `filtros/celeste/cenarios.js` (structures placed where the background
  shows round him); test it with the game's stand-in walking its rooms, on the webcam's whole picture.
- A filter can follow its game when a reader on the PC reports it (README.md, "A game that talks to the filter"):
  Celeste's is the MuanlartinsLink mod (`scripts/celeste-mod/`, 127.0.0.1:8797), tried without the game through its
  stand-in (`filtros_teste.py celeste --jogo=celeste @entra:1 @dash:0.2 …`). The address goes in `?<game>-jogo=`,
  never `?<id>=` (the look's model: the look then never loads). In a test's HUD, "modelo ok" says the look loaded.
- Release: the filter goes into the roadmap's `filtros-na-camera` entry (README.md, "Release"), then a pull in the
  shared checkout, which serves OBS's pages.
