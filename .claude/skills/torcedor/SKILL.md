---
name: torcedor
description: Making a fan for the stand (the 3D torcedor) from a description or a picture with the kit in scripts/torcedor/ - the closest preset, validar, render on the stand, a few rounds, then the T1 code Luan pastes in the profile editor. Use when he says "faça esse torcedor da arquibancada: [descrição ou imagem]", "monta um torcedor", sends a picture for a fan, or asks for a fan's T1 code or what a code looks like.
---

# A fan from a description or a picture

The guide is `scripts/torcedor/README.md`: read it first (the format, the presets, coordinates, tips by area, common
mistakes). The kit is a format, a validator and a renderer on the fan's own modules (`public/stream/torcedor3d/`), so
what it accepts is what the editor, the stand and the profile do. Codex reads the same guide through AGENTS.md.

## The workflow

1. **The traits.** From the description or the picture, write down 3 to 6 traits that define it: the shape of the
   hair or hat, what sticks out of the head, skin, hair and clothes colours, a signature accessory, the expression.
2. **The closest preset**, as the starting file (the guide lists the 14 and what each has):
   `scripts/torcedor/torcedor esquema --json | jq '.presets[] | select(.name == "Caramelo") | .look' > scripts/torcedor/saida/<nome>.json`.
   Work only in `scripts/torcedor/saida/` (gitignored).
3. **The lists' options first.** Before any free part, look up what exists: `scripts/torcedor/torcedor esquema
   <key or word>` (`esquema chapeu`, `esquema barba`, `esquema clubs`). Options and colours are made to read small and
   to go together.
4. **Free parts last**: pieces (`pecas`), locks (`mechas`) and drawings (`desenhos`) only for what the lists lack (an
   object in the hand, a tuft, a mark on the face, an emblem).
5. **Validate**: `scripts/torcedor/torcedor validar <file>`. Clear every warning, "Sem efeito" and "Escondido" line,
   or know why it stays.
6. **OBS first**: `node scripts/obs.mjs status`. **If it says live or recording, no render**: validate only and hand
   the code over saying it wasn't rendered yet ("Couldn't reach OBS" means it's closed, which is fine). The render
   refuses by itself anyway (exit 3; the API answers 503), since the browser's GPU work costs the stream frames.
7. **Render**: `scripts/torcedor/torcedor render <file> --arquibancada --rosto` (add `--poses todas` once the look
   settles), then Read the PNG it prints and **compare**: the silhouette and colours in "Na arquibancada" (the 17 px
   head) first, then the angles, the face close up last.
8. **3 to 5 rounds**, a few changes each. Many renders in a row: `scripts/torcedor/torcedor servidor --porta <port>`
   keeps the browser open (the guide's "Local API"); stop it by its port's PID when done.
9. **Hand over**: the **T1 code on one line**, the final JSON, the sheet's path, and a sentence on **what couldn't be
   done** (what the schema has no option or piece for).

## Where the code goes

Luan (or whoever the fan is for) signs in with Twitch at `muanlartins.com.br/perfil` and pastes the code in the 3D
fan editor's **“Usar código”** (a link with `#t=` works there too), or opens
`https://muanlartins.com.br/perfil#t=<code>`, which loads it in the editor; **Salvar** keeps it in their profile
(`aparencia.t3`). Claude never saves a fan to anyone's profile: `PUT /eu` is their own Twitch sign-in.

## When the fan changes

A new option, preset or rule in `public/stream/torcedor3d/` reaches the kit by itself (it imports the modules; the
schema is made on demand, never a file). What's written by hand follows in the same commit: the guide's tips and
presets, and `CHAPEUS_COM_CABELO` and the like in `scripts/torcedor/motor.mjs` (read from `boneco.js`).
`node --test scripts/torcedor/torcedor.test.mjs` (in CI) fails when they drift.
