# Celeste demonstrations (TAS)

Each `.tas` plays a technique in the real game with CelesteTAS, and `gravador/` films it: one image and one row of
Madeline's state per game update. First run on 2026-11-22: `coyote-time-0` to `-5` land, `-6` dies.

## Safety

- Never while OBS streams or records (`rodar.ps1` refuses while OBS is open), and tell Luan before the window opens.
- Never in the Steam folder: a separate copy, `C:\Users\muanl\Celeste-TAS`, with only CelesteTAS and MuanlartinsDemo
  in its Mods. Never copy Luan's saves into it.
- `EVEREST_SAVEPATH` points inside the copy, and `steam_appid.txt` (504230, as Valve documents) keeps the game from
  relaunching through Steam, which would lose that variable. Steam has to be open with the licence, and counts the
  minutes as played.
- MuanlartinsDemo turns Steam's achievements and stats off for the whole session and exits if it finds itself
  outside the copy.
- Hash the real `Saves/` and Steam's stats before and after: they must be identical.
- The community's runs (github.com/VampireFlower/CelesteTAS) have no licence: ask before using, and credit.

## The copy

- The installed game without `Saves`, `Mods`, `Backups` and `LogHistory`, plus `steam_appid.txt`.
- CelesteTAS 3.47.1 unzipped in `Mods/CelesteTAS`, and `CelesteStudio/.version` = `3.11.0` so it doesn't download
  Studio.
- In its `Saves`: `settings.celeste` (windowed, `WindowScale` 4, muted), `modsettings-Everest.celeste` (no Discord
  presence, no mod updates, no intro, debug mode) and `modsettings-CelesteTAS.celeste` (`AutoPauseDraft: false`).
- The recorder, built against the copy:

      . ~/.local/share/valorant-extract/env.sh
      dotnet build gravador/MuanlartinsDemo.csproj -c Release -p:CelestePath=<copy> -p:CelesteTasPath=<CelesteTAS bin>

  then its DLL and `everest.yaml` go to `Mods/MuanlartinsDemo`.

## Filming

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File rodar.ps1 -Jogo <copy> -Tas <file.tas> -Saida <folder>

(Windows paths.) It leaves `quadros.rgba` and `fundo.rgba` (the same updates without Madeline), both 320x180 RGBA
at 60 fps from TAS frame 121 on, about 30 MB each a take, plus `quadros.tsv` and `fim.txt` ("end N/N" when every
input ran). `quadros.tsv` has one row per update: what's held (`teclas`, the bits of `lib/celeste-demo.ts`'s
`KEY`), the jump and dash buffers, the camera, and her position, speed, ground, coyote timer, state, hitbox height,
stamina, lift speed, wallboost timer and forced-move timer, each read after the update.

## Making a page's demonstration

`demos.json` says, per demonstration, the crop, the frames, which take is which on the page, the cover and what must
hold in each take (`expect`). Then:

    uv run monta.py <takes folder> <demo>            # checks every take, a dry run
    uv run monta.py <takes folder> <demo> --aplica   # writes public/celeste/tecnicas/<demo>/

It cuts Madeline out of each update by comparing it with the same update drawn without her, and refuses a take that
skipped a frame, didn't run to its end or stopped showing what `expect` says. The page's captions and frames live in
`components/site/celeste/tecnicas/<technique>.tsx`. Archive the raw takes losslessly and compare them byte for
byte (`~/.local/share/muanlartins/celeste-demos/`, the takes of 11-22 in `v3/`), then delete the raw folder with one plain
`rm -r -- <its literal path>`. To rebuild a demo, decode its takes back to `.rgba` first.

A room for a demonstration comes only from a chapter Luan has played (no spoilers), and is checked in the game before
its takes are planned: a map can hide what a tile reader doesn't see (3A's `s3` wall has a roof over the door).

## Pictures for the story pages

`historia/` holds the takes that film one scene each for the chapters' pages (`components/site/celeste/historia/`):
Madeline loaded near the spot (`console load <area> <world x> <world y>`, a few pixels above the floor so she lands on
it), then held still or walked. Each is filmed with `rodar.ps1` like any take; the chosen update goes to
`public/celeste/historia/<chapter>/<name>.webp`, scaled 4× with nearest neighbour (or a 160×90 crop scaled 8× for a
picture shown small), lossless:

    ffmpeg -f rawvideo -pix_fmt rgba -s 320x180 -i quadros.rgba -vf "select=eq(n\,N),scale=1280:720:flags=neighbor" -frames:v 1 -c:v libwebp -lossless 1 out.webp

The copy's language is Brazilian Portuguese, so a scene with text shows the official translation; its save is named
TAS, which is the name the dialog says. Loading into a room can start its cutscene (the Granny's house, Part of Me's
introduction), and the text waits on its first box with no input. A room from the dream half of chapter 2 keeps the
dream's look (the campfire burns green), so its awake rooms need another way in (not found yet).
