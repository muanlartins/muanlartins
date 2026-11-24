# The 3D fan: a guide for agents

For an AI agent (Codex CLI, Claude Code, or any agent with a terminal) that builds a fan for the stand from a
description or a reference picture and hands back a **T1 code** to paste in the profile editor. The kit is a format,
a validator and a renderer; what to build is the person asking's call. Everything runs from this checkout:
`scripts/torcedor/torcedor` finds the rest.

## What a fan is

The avatar of someone watching the live, on the stand that shows on screen. A toon 3D figure made entirely by code: a
big round head on a profile-picture bust, outlined in navy (`#001447`). Arms only show in the celebration poses; at
rest it's the bust.

On the live it shows small: **the head is about 63 px (few people on the stand) down to 17 px (a full stand)**. So,
in order of importance:

1. **The silhouette**: what sticks out of the head and the body (hair, hat, ears, horns, wings, what it holds).
2. **Colour in big blocks**: skin, hair, clothes. Contrast between them and against the stand's blue.
3. **The face**: big, clear eyes read; fine detail disappears.
4. Small details (drawings, buttons, freckles) last, knowing that at 17 px they're 1 or 2 pixels.

## The format

A look is a flat JSON object. Every key is optional: what's missing stays at the default.

```json
{ "pele": "#c8843f", "topo": "careca", "orelha": "caida", "olho": "grande", "cor": "#e03131",
  "pecas": [ { "f": "cone", "c": "#5a3825", "x": 0.6, "y": 1.0, "onde": "cabeca" } ],
  "desenhos": [ { "f": "estrela", "em": "rosto", "c": "#ffd23f", "x": 0.6, "y": -0.12, "t": 0.09 } ],
  "mechas": [ { "a": 0.9, "h": 0.9, "l": 1.2, "m": true } ] }
```

Field types:

| type | value | rule |
|---|---|---|
| `op` | string | one of `options[].id` (the **id**, not the label: `"afro"`, not `"Black power"`) |
| `num` | number | kept to `min`..`max`; rounded to 0.001 (or to a whole number when `step` is 1) |
| `cor` | string | `"#rrggbb"`, 6 digits. Any hex works; the palette is only what the editor shows |
| `sim` | boolean | a real `true`/`false` (`1` or `"true"` become the default) |

Free lists:

| list | at most | for |
|---|---|---|
| `pecas` | 12 | 3D shapes fixed to the head, the body or the hand |
| `desenhos` | 16 | shapes painted on the face or the shirt |
| `mechas` | 16 | loose locks of hair, anywhere on the head |

And what the stand does with the fan (`torcida`, not controls on the model): `time` (their team, up to 24
characters), `frase` (what they shout when they arrive, up to 30) and `stickers` (`{ "gol": [...], "contra": [...] }`,
one emoji each, up to 3: thrown on a goal and on a goal against). A club's name alone doesn't dress the shirt: copy
the club's look from `torcedor esquema clubs`.

The **code** is `"T1:" + base64url(UTF-8 of JSON.stringify(enxugar(normalizar(look))))`, with no `=` at the end, up
to **12000 characters**; the profile keeps at most **10240 bytes** of the look's JSON (a look with every field and
list maxed out still fits both, and `validar` would say if one didn't). `normalizar()` cleans any input: an unknown key goes, a wrong type becomes the default, a number out
of range is clamped, a list is cut at its maximum. `enxugar()` keeps only what differs from the default. **Never write
the code by hand**: `torcedor codigo` and `validar` run the real `esquema.js`.

## The schema, and the one source of truth

The fan is `public/stream/torcedor3d/`: `esquema.js` (the schema, `normalizar`, the code, the presets), `boneco.js`
(draws it), `vestir.js` (the clubs, the referee's kit, Santa's hat) and `antigo.js` (the old 2D fan turned 3D). The
same files run in OBS's overlays, on the site, in the profile API and in this kit: `motor.mjs` imports them, and the
render page loads them. There's no copy of the schema anywhere, and no `esquema.json` file to go stale: it's made on
demand.

- `torcedor esquema`: the summary, one line per field, by tab and group (about 230 lines; it fits in context).
- `torcedor esquema olho chapeu mechas`: those fields in detail (options with labels, the palette). A word that isn't
  a key searches labels and options (`torcedor esquema barba`). `torcida` and `clubs` too.
- `torcedor esquema --json`: the whole schema, machine-readable: `fields` (each with `key`, `label`, `type`, `tab`,
  `group`, `default`, `min`/`max`/`step`, `options`, `palette`, `shownWhen`), `lists` (the fields of a piece, a
  drawing and a lock, with `max`), `torcida`, `coordinates`, `palettes`, `presets` (the 14, with look and code),
  `clubs` and `poses`. The local API serves the same at `GET /esquema.json`.
- `shownWhen` says when a field does anything (`chapC` only with a hat). `validar` warns when you set a field that
  doesn't show.

## Workflow

1. **Read the reference** and write down 3 to 6 traits that define the character: the shape of the hair or hat,
   what sticks out of the head, the colour of skin, hair and clothes, a signature accessory, the expression.
2. **Start from the closest preset** (below), its look out of the schema:

   ```bash
   scripts/torcedor/torcedor esquema --json | jq '.presets[] | select(.name == "Caramelo") | .look' > scripts/torcedor/saida/meu.json
   ```
3. **Use the lists' options first** (`op` fields and colours). They were made to read small and to go together (the
   hat knows the hair, the hood knows the hat, the jacket knows the sleeves).
4. **Pieces, locks and drawings only for what the lists lack**: an object in the hand, ear tufts, a lock falling in
   front, a mark on the face, an emblem.
5. **Validate**: `torcedor validar meu.json`. Clear the warnings or understand each one.
6. **Render**: `torcedor render meu.json --arquibancada --rosto` (`--poses todas` to see the celebrations). Open
   the PNG.
7. **Compare with the reference**: first the silhouette and the colours in the "Na arquibancada" row (17 px), then
   the angles, the face close up last.
8. **Iterate**: 3 to 5 rounds, a few changes per round.
9. **Hand over the final T1 code** on one line, with the final JSON and a sentence on what couldn't be done.

### The presets

- **Organizada**: cap, flag, jacket, number on the shirt.
- **Veterana**: white bun, round glasses, turtleneck.
- **Gamer**: two-colour hair, headset, hoodie, phone.
- **Black power**: afro, striped shirt.
- **Punk**: mohawk, chain, plaid, scar.
- **Tiozão**: receding hairline, moustache, broad body, horn.
- **Rainha**: long wavy hair, crown, eyeliner, little cape.
- **Barbudo**: beanie, long red beard, plaid.
- **Festeira**: pigtails, party hat, freckles, adjustable eye.
- **Robô**: square head, no ears, an antenna made of pieces.
- **De outro planeta**: green skin, slanted almond eyes, antennae made of pieces.
- **Elfa maga**: elf ears, braid, robe, cape, wizard hat, staff.
- **Caramelo**: a dog (muzzle, floppy ears, ball nose, tail).
- **Dragão**: scales, horns, reptile eyes, wings, tail, plates made of pieces.

## Commands

From the repo's root (`scripts/torcedor/torcedor` works from any folder). `ENTRADA` is a `.json` file, a `T1:...`
code, a link with `#t=T1:...`, inline JSON (`'{"topo":"afro"}'`) or `-` (stdin). Keep your files in
`scripts/torcedor/saida/` (ignored by git); touch nothing else in the repo.

```bash
scripts/torcedor/torcedor validar ENTRADA              # warnings + the normalized look (only what changes) + the T1 code
scripts/torcedor/torcedor validar ENTRADA --completo   # the look with every field
scripts/torcedor/torcedor validar ENTRADA --json       # all of it as JSON: look, enxuto, codigo, caracteres, avisos, semEfeito, dicas
scripts/torcedor/torcedor codigo meu.json              # the T1 code alone (warnings go to stderr)
scripts/torcedor/torcedor codigo T1:...                # the JSON alone (what differs from the default); --completo for every field
scripts/torcedor/torcedor render ENTRADA [--angulos frente,tres-quartos,lado,costas|todos|nenhum]
                                         [--poses parado,cima,aceno,palmas,triste,pisca|todas]
                                         [--arquibancada] [--rosto] [--altura 340] [--titulo "Nome"] [--saida folha.png]
scripts/torcedor/torcedor esquema [chave|palavra ...] [--json]
scripts/torcedor/torcedor servidor [--porta 8177]
```

`render` prints the same warnings as `validar`, the PNG's absolute path and the code. Without `--saida` it writes
`scripts/torcedor/saida/<the JSON's name>.png`. The sheet shows: the angles at rest; the poses asked for; the face
close up; and with `--arquibancada`, the fan with a 63 px and a 17 px head on the stand's blue, the 17 px one blown up
4× pixel by pixel, and the 17 px one between two presets.

Poses: `parado`, `cima` (a goal: both arms up), `aceno`, `palmas`, `triste` (a goal against), `pisca`. Angles:
`frente`, `tres-quartos`, `lado`, `costas`.

Exit codes: `0` it worked (even with warnings), `2` unreadable input, `3` render refused because OBS is live or
recording on this PC (try again after the live).

**The render never runs while OBS is live or recording**: it asks `scripts/obs.mjs status` first and exits with 3
(the API answers 503), since the browser's GPU work costs the stream frames. OBS closed, or a machine without it,
is fine. It needs `node`, `python3` and `uv` (which brings Playwright) and Playwright's headless Chromium; three.js
comes from `node_modules` (`pnpm install`), so it renders offline. On WSL it draws on the GPU through Mesa's D3D12.
In a sandbox that can't start a browser, ask to run `render` outside it, or validate only and let Luan render.

## Local API

`scripts/torcedor/torcedor servidor` serves an API at `http://127.0.0.1:8177` (local only). The browser stays open,
so from the second render on it takes under a second.

| route | in | out |
|---|---|---|
| `GET /esquema.json` | | the schema |
| `POST /validar` | a look as JSON, `{"codigo": "T1:..."}` or the bare code | JSON like `validar --json` (400 if unreadable) |
| `POST /render` | a look or a code, options in the query; or `{"look": {...}, ...options}` / `{"codigo": "T1:...", ...options}` | `image/png`, with the headers `X-Torcedor-Codigo` and `X-Torcedor-Avisos` (how many); 503 while OBS is on air |

Render options: `angulos`, `poses` (comma-separated, `todos`/`todas`), `arquibancada`, `rosto`, `altura`, `titulo`.

```bash
curl -s -X POST --data-binary @meu.json http://127.0.0.1:8177/validar
curl -s -o folha.png -X POST --data-binary @meu.json 'http://127.0.0.1:8177/render?arquibancada=1&rosto=1'
curl -s -o folha.png -X POST -H 'Content-Type: application/json' \
  --data-binary '{"codigo": "T1:eyJ0b3BvIjoiYWZybyJ9", "poses": "todas"}' http://127.0.0.1:8177/render
```

## Coordinates

The schema's `coordinates` section has it all. The essentials:

- **Axes**: head units (radius ≈ 1), origin at the head's centre. **x+ = the character's left** (the viewer's
  right), **y+ = up**, **z+ = forward**, towards the viewer.
- **Head**: top at y ≈ 1 (hair adds 0.05 to 0.4), face at z ≈ 1, ears at x ≈ ±1. It turns at the neck (y = -0.95).
- **Bust**: from the top of the shoulder (y ≈ -1.22) to the flat base (y = -2.95). Half-width 1.34 × `corpoL`;
  the chest's front at z ≈ 0.88.
- **Hand at rest**: (1.13 × `corpoL`, -1.85, 0.72), on the character's left.

## Tips by area

Read from `boneco.js`, which is what draws.

### Head and shape
- `larg`, `alt`, `tam`, `quadr` (pointed ↔ square), `queixo`, `testa`, `bochecha` change the silhouette more than any
  detail. An animal: `focinho` pushes the front of the face out, and nose and mouth sit on it (`focinhoY` sets the
  height).
- Ears, horns, fur and scales are options: `orelha` (`animal`, `caida`, `urso`, `elfa`...), `chifre`, `pelo`
  (`focinho` paints muzzle and chest, `listras`, `manchas`, `escamas`).

### Eyes, brows, mouth
- **Eyes, brows, mouth, stubble/full beard, moustache, face paint, freckles, nostrils and drawings are painted on a
  2D map** wrapped round the head. Nose, glasses, ears and the rest are 3D.
- `olhoC` is the iris colour. `oval` and `grande` have a white and a navy pupil; in `ponto` and `traco` the whole eye
  is `olhoC` (use a dark colour there). `olho2` paints the character's left eye with `olhoC2`.
- `olho: "livre"` (Ajustável) opens the lids (`olhoCima`, `olhoBaixo`, `olhoCanto`), the iris (`irisT`, `irisDeg`,
  `irisC`), `pupila` (`fenda`, `estrela`, `coracao`) and `brilho`.
- A positive `olhoR` lifts the outer corner. `olhoX`, `olhoY`, `olhoT`, `olhoA` place and stretch.
- **Poses change the expression**: celebrating, most eyes turn into smiling arcs (not `grande`, `estrela`,
  `losango`, `reptil` and the adjustable one, which only moves its lids) and the mouth opens (not `presas` and
  `berro`); in `triste` the eye droops and the mouth turns down. Check with `--poses todas`.
- To read at 17 px: eye `grande` or `oval` with `olhoT` 1.2 to 1.5 and a clear difference between iris and skin.
- `sobrC` doesn't follow the hair by itself: set the colour. `sobr: "nada"` on animals and robots.

### Hair
- Hair is a shell (coverage) plus locks (shape). `topo` (on top), `franja` and `atras` combine; `vol` gives volume,
  `comp` length at the back, `vira` mirrors the fringe, `linha` makes a receding hairline.
- **A hat hides tall hair**: with a hat (except `aureola`, `festa`, `bandana`, `coroa`, `tiara`) or a raised hood,
  `topo` `afro`, `cachos`, `espetado`, `moicano`, `coque`, `coque2`, the fringe `topete` and `fio` don't show (it
  becomes flat hair underneath). `validar` warns.
- **A raised hood** hides the hat (except `aureola`, `festa`, `coroa`), the back hair (except `tranca`) and the locks
  under it.
- `cab2` (two colours): `cabC` above the height `gradP` (head units, -1.2 to 1.2) and `cabC2` below; `gradS` softens
  the change. Coloured tips on long hair: `gradP` near 0 or negative.

### Free locks
- Each lock grows from the hair's surface. `a` = angle round the head (0 = mid forehead, +1.57 = the character's left
  side, ±3.14 = the nape). `h` = angle from the top (0.05 = crown, 1.57 = ear height).
- `d` = where it goes: 0 down, ±3.14 up to the top, ±1.57 sideways. `l` length, `e` thickness, `k` curve.
- A low `s` lies on the hair and, once off it, **hangs with its weight** (a long fringe, a lock in front of the ear).
  `s` ≥ 0.5 stands up and doesn't fall (a tuft, a hair antenna).
- `m: true` mirrors it on the other side. Without `p`, the lock takes the hair's colour, gradient included.

### Body and clothes
- The print (`roupa`) is painted on the bust with `cor`, `detalhe` and `terceira`; `estT` changes the scale. `pele`
  and `barriga` take the shirt off.
- `sobre` (jacket, hoodie, overcoat, vest, little cape), `golaA`, `capuz`, `ombreira`, `cinto` are 3D layers on top.
  The jacket, the hoodie and the overcoat swap the sleeves for their colour.
- `costas` (wings, cape) and `cauda` show from the side and in the silhouette: open wings are great at 17 px.
- `mao` puts a ready-made object in the hand (flag, horn, staff...). `fes` is the goal celebration.

### Pieces (`pecas`)
- `f` is the shape. The base shapes measure 1, so `sx`, `sy`, `sz` are the size in units (0.03 to 1.2). `bola` is a
  sphere (diameter = s); `cubo`; `cone`, `tubo` and `capsula` stand on the y axis (the cone's tip up); `anel` is a
  ring facing the camera; `losango` a diamond; `gota` has its tip up; `chifre` is a curve that rises and turns to +x;
  `placa` is a flat triangle tip up (`sz` = thickness).
- `x`, `y`, `z` = the centre; `rx`, `ry`, `rz` in radians (XYZ order). Turning by `rz` takes the piece's y axis to
  (-sin rz, cos rz): to join two tubes in a line, put the second's centre at `the first's top + (half the second) ×
  (-sin rz, cos rz)`.
- **`m` is `true` by default**: the piece gets a mirrored copy at -x (with `ry` and `rz` inverted). At `x = 0` the
  copy is hidden. For a piece on one side only, set `"m": false`.
- **`onde`** picks the anchor:
  - `auto`: `y > -1` goes on the head, otherwise on the body. Careful when crossing y = -1.
  - `cabeca`: follows the head (`tam`, `incl`, `giro`, poses). Origin at the head's centre.
  - `corpo`: stays on the bust.
  - `mao`: moves with the hand. Use the body's coordinates with the hand at rest at (1.13 × `corpoL`, -1.85, 0.72);
    it rises in the `cima` and `aceno` poses. The mirrored copy goes to the other hand, which only shows in `cima`:
    use `m: false`.
- Every piece gets a navy outline. Pieces thinner than 0.09 become almost only outline: at 17 px a thin rod is a dark
  line.
- A big object: join several pieces (12 at most). The bounds are x -1.6 to 1.6, y -2.8 to 1.9 and z -1.3 to 1.5;
  what goes past is clamped.

### Drawings (`desenhos`)
- `em: "rosto"`: x and y are angles in radians on the face (x+ = the character's left, y+ = up). References: eyes at
  x ±0.38, y 0.02; brows at y 0.29; nose at y -0.16; mouth at y -0.45; cheeks at x ±0.6, y -0.26. From the front you
  see |x| up to ≈ 1.2. Above y ≈ 0.4 the fringe may cover it.
- `em: "camisa"`: x = ±1 covers the whole front; y = 0 is mid chest, -0.95 near the base, 0.3 the top of the chest;
  above 0.5 it's already the shoulder. The light patch of `pelo: "focinho"` on the chest goes from y ≈ -0.43 up.
- `t` = the shape's radius, `a` stretches its width, `r` turns it (clockwise seen from the front), `m` repeats it
  mirrored.
- **A drawing is painted**: it goes over the eyes, the mouth, the print and the number, but **under everything 3D**
  (nose, glasses, jacket, vest, scarf). A plaster on the nose disappears under the nose; an emblem on the shirt
  disappears under the vest.

## Common mistakes

- The label instead of the id (`"Black power"` instead of `"afro"`). `validar` suggests the id.
- A colour that isn't `#rrggbb`: a name (`"red"`), a short hex (`"#f00"`), `rgb()`. It silently becomes the default.
- A boolean as `1` or `"true"`. It becomes `false`.
- Forgetting that pieces mirror by default and getting two.
- Changing the colour of something that's off (`chapC` without `chapeu`, `numero` without `numOn`, a lock's `c`
  without `p`). `validar` lists it under "Sem efeito".
- A hat over spiky hair, an afro or a bun: the hair goes.
- Expecting arms at rest: they only show in `cima`, `aceno` and `palmas`.
- A drawing on the shirt under a jacket or vest, or on the face under the nose or the fringe.
- Too much small detail and too little contrast: at 17 px only the silhouette and colour blocks are left. A dark blue
  or navy outfit disappears into the stand's background and the outline.
- The `auto` anchor switching from head to body when a piece crosses y = -1.
- Writing the code by hand or editing the base64: always make it with `torcedor codigo` or `validar`.

## Examples

Original looks built with the CLI alone, in `scripts/torcedor/exemplos/`:

- `pescadora.json`: an older lady with a grey bun, round glasses, a yellow vest and a fishing rod with a fish, all of
  pieces in the hand.
- `corujinha.json`: an owl mascot, with tufts of pieces, a triangle-nose beak, feather wings, a scarf and feather
  marks drawn on the chest.
- `skatista.json`: a black bob with cyan tips, a backwards cap, headphones, a pink hoodie, a star sticker on the cheek
  and a skateboard of pieces in the hand.
- `raposa.json`: a fox from the lists alone (muzzle, animal ears in a darker colour, white muzzle and chest fur, a
  bushy tail, a neckerchief): no free parts needed.
- `pirata.json`: a bandana, an eye patch and its strap drawn on the face, a goatee, hoop earrings, a striped shirt
  with a sash, and a parrot of five pieces on the shoulder (`onde: "corpo"`).
- `cozinheiro.json`: a chef's hat of two pieces on the head (`onde: "cabeca"`, `m: false`), a moustache, a
  double-breasted jacket of drawn buttons, and a wooden spoon of two pieces in the hand.

```bash
scripts/torcedor/torcedor render scripts/torcedor/exemplos/corujinha.json --arquibancada --rosto
```

## Where the code goes

The person signs in with Twitch at **muanlartins.com.br/perfil** and pastes the code in the 3D fan editor's **“Usar
código”** (it takes a link with `#t=` too), or opens **`https://muanlartins.com.br/perfil#t=T1:...`**, which loads
it in the editor. Either way it's only saved when they press Salvar. The kit never saves anything to a profile.

## For Luan: the prompt

Open the agent at the repo's root (Codex CLI: `codex`, attaching the picture if there is one) and send:

> Leia o scripts/torcedor/README.md. Monte o torcedor descrito abaixo (ou o da imagem anexada): [DESCRIÇÃO]. Comece do
> modelo mais parecido e use as opções das listas antes de peças, mechas e desenhos. Grave o look num JSON em
> scripts/torcedor/saida/, valide com `scripts/torcedor/torcedor validar` e confira com
> `scripts/torcedor/torcedor render <arquivo> --arquibancada --rosto`, abrindo o PNG e comparando com a referência.
> Faça de 3 a 5 rodadas. Ele precisa ler bem pequeno na arquibancada (cabeça de 17 px): silhueta e cores primeiro.
> Não mexa em nenhum arquivo do projeto, só nos seus em scripts/torcedor/saida/. No fim, me devolva o código T1 numa
> linha só, o JSON final e o que não deu pra fazer.

In Claude Code the `torcedor` skill (`.claude/skills/torcedor/SKILL.md`) does the same from "faça esse torcedor da
arquibancada: …".

## How the kit is built

- `motor.mjs` imports `public/stream/torcedor3d/esquema.js` and `vestir.js` (and the profile's `T3_MAX` from
  `infra/perfil/rotas.mjs`) and answers `esquema` and `validar`; the Python scripts (`validar.py`, `codigo.py`,
  `esquema.py`) ask it through `motor.py`, which also asks OBS.
- `render.py` opens Playwright's headless Chromium on a page made on the fly: the fan's modules from
  `public/stream/torcedor3d/` (as OBS loads them), `folha.js` (the sheet) and three.js from `node_modules`, served from
  the checkout by Playwright's routing (no server). `servidor.py` keeps one such page open.
- `node --test scripts/torcedor/torcedor.test.mjs` (in CI) checks the schema against the modules, the rules the kit
  reads from `boneco.js`, the warnings, the examples and this guide's presets and poses. A change to the fan's
  modules that the kit doesn't follow fails it.
