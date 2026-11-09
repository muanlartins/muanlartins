# Valorant inventory: WSL handoff

A one-off for the WSL session on the stream PC. The page was built on the Mac (2026-11-09), branch
`valorant-inventory`. The Mac has no Valorant, so the page has never seen Luan's real inventory: it shows
0 of 13 and the standard skins. **Delete this file in the same commit that brings the first real reading.**

AGENTS.md still rules: Luan writes the copy, ask before any push, and `main` is a release.

## What's on the branch

- `/conteudo/valorant/inventory` (pt only, like the other game pages). It shows the collection Luan is building,
  weapon by weapon: missing skins as pale blueprints and owned ones as dark cards. The "No jogo agora" toggle shows
  what's equipped now. Clicking a card opens the skin with its variants and Riot's showcase video. See AGENTS.md,
  "Valorant's inventory".
- `content/valorant-ideal.json`: the collection (skin by its in-game name + variants, the first preferred).
  Luan edits it.
- `scripts/valorant_inventory.py`: writes `content/valorant-inventory.json` (what the page reads) and the art in
  `public/valorant/skins/`.
  - It reads the game through the same `client()` + `valorant_api()` from `scripts/valorant.py` that the stream
    already uses.
  - The art is already committed for every skin in the ideal list.

## To do

1. `git fetch && git checkout valorant-inventory`.
   - `valorant.py` runs from this working copy at Windows login. The branch is `main` plus one commit, so the
     stream is unaffected.
2. With the Riot Client open and logged in (Valorant itself doesn't need to be in a match), run
   `python3 scripts/valorant_inventory.py`.
   - It prints nothing secret. The tokens stay in memory, as in `valorant.py`.
3. **First real run, so check it.** `read_game()` was written against the documented shape of these endpoints
   but never called for real:
   - `/personalization/v2/players/{puuid}/playerloadout` → `Guns[].{ID, SkinID, ChromaID}`
   - `/store/v1/entitlements/{puuid}/{type}` → `Entitlements[].ItemID`. Types: skin levels
     `e7c63390-eda7-46e0-bb7a-a6abdacd2433`, chromas `3ad1b2b2-acdb-4524-852f-954a76ddae0a`.

   Then confirm:
   - `read` is set.
   - `owned.skins` / `owned.chromas` match what Luan really owns among the 13. Ask him.
   - Each weapon's `skin`/`chroma` matches his loadout.

   If an endpoint answers 4xx (headers, version, shard) or has another shape, fix it in the script.
   Don't hand-edit the JSON.
4. `pnpm dev`, open `http://localhost:3000/conteudo/valorant/inventory` and look at it with Luan:
   - The counter, the dark cards for what he owns, the locked variants.
   - "No jogo agora" showing the real loadout.
   - The Valorant home's card ("N de 13 skins na coleção").
5. If he changes the list: edit `content/valorant-ideal.json`, then run with `--arte`.
   - The script stops with a message if a skin or variant name doesn't match the game.
   - It needs `magick` or an ffmpeg with libwebp for new art.
6. `pnpm lint`. Then commit the JSON, the new art and the deletion of this file
   (`git rm handoff/valorant-inventory.md`), and ask Luan before pushing the branch.

## Open with Luan

- **Copy:** the page's title/description in `content/valorant-home.ts` and the sentences at the top of
  `components/site/inventory/inventory-board.tsx` are Claude's drafts, for him to rewrite.
- **Video:** Elderflame's variants have no video of their own, so the dialog plays the base (orange) one
  even with Blue selected.
- **Shipping:** a PR or a merge to `main` is a release, so only on his go.
- **Later, optional:** rerun the script after buying a skin. It could also run on its own (e.g. after each
  session from `valorant.py`), but that's his call.
