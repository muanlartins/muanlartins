# Style: fcyacr

Copied from fcyacr's (Lavandula) Valorant reels on Instagram, the ones Luan picked as the model for "Highlights da
live", measured on 2026-11-11 with `/steal`'s passes (contact sheets at 2 fps, `scdet` cuts, spectrogram, EBU R128):

- https://www.instagram.com/reel/DY-UP08hHhE/ ("Bro thought she's clove", 53.8 s)
- https://www.instagram.com/reel/Dfh0Sr4od06/ ("Teammates u get on ur rankup games:", 56.7 s)
- https://www.instagram.com/reel/Devm7NRhFtw/ ("Prayer of a lost fool", 42.6 s)

`short-editing`'s engine doesn't draw this layout (it is a talking head under a paper board, and `/clips` says to use
an editor for split screens), so `scripts/clipe.py` applies this style, not the engine. The `estudio` skill,
"Highlights da live", says how.

## What a reel is

- One situation per reel, played almost whole: one round, one bit, one gag with its build-up and its payoff. 42 to
  57 s.
- The premise goes in the post's caption, not on screen ("Teammates u get on ur rankup games:"). The video starts on
  the reaction or on the bit already happening.
- Some reels are a running bit: a recorded setup that comes back between real plays (the "prayer" before each fail
  in Devm7NRhFtw). That one is recorded on purpose, at the live or after it.

## Cuts

- Hard cuts only, no transition, no fade: 3 cuts in 53.8 s, 6 in 56.7 s, 13 in 42.6 s (that one cuts back and forth
  between the prayer and the plays). 3 to 13 s per shot, 13 s in the calmest.
- A cut only drops dead time (a buy phase, a menu, a wait). Never inside a moment, never on a word.

## Framing

- Split screen the whole time: his camera on top, 1080 wide by 776 to 858 tall (the seam at 40 to 45 % of the
  height), the game's middle square below (1080 × 1080 from the 1920 × 1080 game, native pixels, the HUD's top bar
  and bottom bar in it).
- The camera is the stream's camera crop, chat or alerts included when they're there. The face takes 16 to 18 % of
  the frame's height. Full screen camera only for a bit performed to the camera (DY-UP08hHhE's first 6.5 s).
- No zoom, no punch-in, no push. The face size changes only at a cut.

## Captions

- None on the plays: the reactions speak for themselves.
- Only on a line that carries a bit (the prayer): white, a heavy rounded sans in lowercase, a soft dark outline,
  2 lines centred over the seam, about 75 px tall letters, the whole sentence at once.

## Sound

- The stream's own sound: his voice and the game. No music bed, no sound effects, no risers (the spectrograms show
  none).
- -14.2 to -15.1 LUFS, LRA 8.9 to 10.6 LU: dynamic, not squashed.

## Grade

- None: the stream's picture as it was.

## Left out

- Her cosplay and her bits: they're her content, not an edit. What copies over is the edit's restraint.
- Her stream's chat in the camera crop: Luan's camera box has no chat over it.

## How clipe.py applies it to Luan's lives

- His camera on top 1080 × 840. In the game scenes it comes from Câmera.mkv (1280 × 720, sharp), with the filter's
  costume, flash and fire laid over it from the live's camera box where the two differ. In the camera scenes
  (Conversa) it comes from the live, already 1280 × 720.
- His face fills about 27 % of the height, more than hers: the box's rank plate and site bar limit the crop.
- One change Luan asked for (2026-11-11, "ainda não tá com o fator hook"): the short opens on the gag with a hook
  line on the seam ("Bangando de Phoenix IRL"), and the play comes after it. Hers start on the reaction with the
  premise in the post; his get the premise on screen too.
- The game: Jogo.mp4's middle square, 1080 × 1080.
- The sound: Live.mp4's first track (what the VOD plays), -15 LUFS, true peak -2 dBFS.
- Sync: Live.mp4 is the clock. Jogo.mp4 and Câmera.mkv are moved by picture (see `scripts/clipe.py`).
