# Windows handoff

Everything decided and piloted on the Mac between 2026-10-27 and 2026-10-30, for the Claude session on the
streaming PC (Windows, NVIDIA GPU, OBS) to carry out. Luan was away from home and only brainstormed and tested
on the Mac; **the Windows session executes and owns the files from here on**. VODs, recordings and replays
stay on Windows. Read this whole file before starting, then work through "Order of work" with Luan.

The repo's `AGENTS.md` still rules (copy is Luan's, `brand/` keeps everything, small changes to `main` after
`pnpm lint`, bigger ones through a PR, ask before any push). On top of it:

- This repo is **public**. Never commit the Pix key, tokens, the Twitch Alerts Box URL (it carries a token),
  payers' legal names, other players' names or platform ids, or anyone's replays. Teammates stay nameless.
- Never use AWS credentials found on a machine for the site; Luan's personal account is the only target.
- Community RVC voice models (`.pth`) are untrusted pickles: scan their opcodes first
  (`piloto/unpack_check.py`) and load them only with `weights_only=True` (Applio already does).
- **Current focus (Luan, 10-30): attract strangers.** What someone finds on their own (videos, shorts, the
  site, the lives) comes before features that need an audience to interact.

## Where things stand

| Piece | State |
|---|---|
| Site | Lives in PR #4 (branch `lives`): `/conteudo/rocket-league/lives` and a page per live (video, chapters with the day's matches, searchable transcript), "na live" links on the ranked page, an "Ao vivo" badge in the header and the Twitch player on the lives page while on air. Luan finishes the copy on the branch. |
| YouTube | Full lives go to the main channel **unlisted**, in the unlisted playlist "Rocket League ao vivo". 27/10 = `y9BWL0fzFE8`, 28/10 = `7vcv2ZNd-Z4`. The 27/10 live may be deleted later to keep the pattern (Luan's call). |
| Twitch | Not Affiliate (no channel points, subs, bits, native polls). Alerts, panels, chat rules and StreamElements commands are set up. |
| Pix alerts | Two prototypes: the `pix-live` branch (`live/`, 10-20: TypeScript server, donation page, studio with an unmatched-Pix queue) and the 10-30 Mac pilot in `piloto/` (newer decisions, voices, crowd, narration, captions). Build the real one from both (see "Live Pix"). |
| RLR | `~/repos/rlr`, Luan's own 3D replay player, deployed at `/rlr/`. |

## Order of work

1. **OBS and recording** (blocks everything that follows).
2. **The dock's event log + stream start time** (makes VOD chapters and "na live" automatic).
3. **The after-live routine** (VOD → YouTube → site), done once by hand with Luan, then scripted.
4. **Overlay moments with sound** and the **automatic scene switch**.
5. **Live captions**, the **torcida** and **Galvão** on Windows (ported from the pilot).
6. **Live Pix**, then the Σ economy and fan profiles.
7. Shorts and socials whenever there's material.

## 1. OBS and recording

From the 10-29 handoff, still to execute:

1. Record automatically while streaming. MKV with auto-remux, or Hybrid MP4; NVENC CQP 18, keyframe 2 s, 1080p60.
   The stream itself stays 1080p60 NVENC CBR 6000 (no 2K before Affiliate).
2. Audio tracks: 1 Tudo, 2 Mic, 3 Jogo, 4 Discord. The stream uses track 1 only. Mixer: mic on 1+2, Rocket
   League 1+3, Discord 1+4, browser sources and alerts 1. `obs.py` needs Discord on track 4 (bitmask 8).
3. Webcam to its own file: the Source Record plugin (Exeldro) as a filter on "Câmera", recording with the main
   recording, NVENC, native resolution, with the mic for sync.
4. Find Rocket League's replay folder (`Documents\My Games\Rocket League\TAGame\Demos` or `DemosEpic`) and check
   whether Match History keeps replays on its own; otherwise press "Salvar replay" after each match.
5. Windows clock on NTP (the dock's timestamps and the VOD must agree).
6. Test: record 15 s, `ffprobe` the files, report the tracks to Luan.
7. A chapter-marker hotkey (Hybrid MP4, OBS ≥ 30.2). Optional: the dock's events give automatic highlights anyway.

**Copyright:** both VODs got Content ID claims from Rocket League's own licensed soundtrack ("Life Is A Highway",
"Get Lucky"; the second blocks 27/10 in some countries, left as is on Luan's call). Before every live, turn on
Rocket League's streamer-safe music (Settings → Audio), or set the game's music to 0. Twitch mutes these too.

## 2. The dock

`public/stream/partidas.html` already holds the Stats API (ws 49124) and OBS (ws 4455) and publishes
`content/matches/<session>.json`.

- **Record the stream/recording start** (wall clock, from OBS's `StreamStateChanged`/`RecordStateChanged`) in the
  session JSON. Then VOD time = event time − start, so live chapters and "na live" links need no hand work.
  For 28/10 the offset was found by hand: VOD time = UTC − 17:25:06.
- **Record each match's start** (`MatchInitialized`/`CountdownBegin`), not only its end (`at` today is the end).
  A chapter should start at the match start.
- **Log every event** with wall clock: goals (speed, scorer, assister), shots, saves, demos, crossbar, BallHit
  speeds. This log is the source for narration, captions alignment, highlights and VOD↔replay sync.
- **Automatic scene switch:** `MatchEnded` → the camera + conversa scene; `MatchInitialized`/`CountdownBegin` →
  back to Jogo (OBS `SetCurrentProgramScene`).

Stats API facts (checked 10-29): it has **no car or ball positions**, so no live 3D. Useful events: BallHit (ball
location, speed before/after; uu/s × 0.036 = km/h), GoalScored (impact location, speed, scorer, assister, last
touch), CrossbarHit, StatfeedEvent (saves, demos, shots), CountdownBegin, RoundStarted, ClockUpdatedSeconds,
GoalReplayStart/End, MatchEnded. Commands: LoadReplay, SeekReplay, ChangePOV, SetGameSpeed, SetHUDVisibility,
SetMatchPaused, so a tool can drive the game's own replay viewer while OBS records. BallHit is not
spectator-only: it works while playing.

## 3. After each live

1. Upload the recording to YouTube as **unlisted**, playlist "Rocket League ao vivo", not for kids, no altered
   content, language pt-BR.
2. Title "Rocket League ao vivo (<rank reached, if it climbed>) - DD/MM/YYYY".
3. Thumbnail: add the date to `LIVES` in `brand/build.py` (with the rank and tier reached, or `(None, None)`),
   run `brand/.venv/bin/python brand/build.py`, upload `brand/youtube/thumbnails/live-<date>.png`. "Live" is all
   Branco; tier emblems not yet in `youtube/thumbnails/ranks/` come from manucabral's repo
   (`overlay/ranks/s4-N.png`: trim, 480 px PNG).
4. Description: a short summary; links to the ranked page, Twitch, the Fundamentos playlist and the roadmap;
   chapters (≥ 10 s apart); `#RocketLeague #RocketLeagueAoVivo`. Tags: rocket league, ao vivo, ranqueada, the
   modes, pt-br, brasil, muanlartins.
5. Transcribe locally: `whisper-cli -m ggml-large-v3-turbo-q5_0.bin -l pt -mc 0 -osrt` on 16 kHz mono audio of
   the mic track. **`-mc 0` is required**: without it whisper loops on silence ("Se inscreva no canal…").
   Clean it like the Mac did: drop segments ≥ 25 s, the classic hallucinations and repeats, and replace friends'
   names with "—". Save as `content/lives/<date>.transcript.json` (`[seconds, text]` lines).
6. Write `content/lives/<date>.json`: `video`, `summary` (`{pt, en}`), `chapters` (`at` as "h:mm:ss"; `title`
   or `match`: a match id from that day's session).
7. Commit and ask Luan before pushing.

## 4. Overlay moments with sound

Each moment gets a band in the alert style plus a short sound; the overlay's browser source routes its audio to
the stream (track 1 only, like "Alertas" in `obs.py`). Sounds are our own or CC0.

- **Pancada braba:** BallHit by Luan above a km/h threshold (e.g. 100 km/h), even without a goal; also feeds a
  "chute mais forte do dia".
- **Gol contra:** GoalScored whose last touch is from the team that conceded.
- **Frango:** a conceded goal at low speed, and/or our touch near our goal ~1 s before it. Needs tuning.
- **Na trave!:** CrossbarHit.
- **Demolição, defesaça:** StatfeedEvent.
- **On a goal:** narrate the build-up (last touches, pass, shot at X km/h).

The same detections become tagged highlights for shorts and edits.

## 5. Captions, torcida and Galvão (piloted on the Mac, approved)

The pilot is in `piloto/` (see its section below). Luan: "o teste está sensacional", with lots of animation
and UI polish still to do.

- **Live captions** (`legenda.mjs` + `whisper-server`): ~0.6 s per inference on the Mac, 1–1.6 s from speech to
  screen, very good on talk. On Windows the input is the mic (track 2), whisper runs on CUDA, and the transcript
  doubles as the VOD transcript and an editing log. Silence gate + hallucination regex as in the pilot. The line
  being heard shows in claro, finished in Branco, fading 4 s after speech.
- **Torcida virtual** (`torcida.html`): a stand at the bottom centre (left 596, width 960, height 132) clear of
  the camera frame and the boost meter; fans drawn on the lattice in 3 rows; patrons in front in Branco with
  their rank emblem, ordered by Σ. Reacts to goals (wave, confetti, "GOOOL! xx km/h"), conceded goals, saves,
  arrivals and departures. **Goal dedication:** the roulette (odds by Σ) picks a present patron: "Esse gol é do X!".
  Real presence comes from `presenca.html` (IRC JOIN/PART); events from the dock.
- **Galvão narrating goals:** template lines with the real km/h and the dedication, rendered by `voz.py` (~4 s on
  the Mac). Pre-render the openers so the shout is instant.

## 6. Live Pix (replace LivePix and its fees)

**Decided (10-30):**

- **Trigger:** the phone's Inter notification (title "Pix recebido", text "<FULL NAME> te enviou um Pix de R$
  x,yy creditado na sua conta final …") → MacroDroid (Notification received, Inter → HTTP POST, text/plain
  `[not_title] [notification]`) → the PC. Accept only incoming Pix. Proven end to end with a real Pix on 10-30.
- **Form** (the site's `/pix`): the name to show (≤ 25), a message (≤ 200), a voice with an "Ouvir" preview, the
  amount (presets R$ 1/5/10/20, **minimum R$ 1**), and when to show it (**now, or between matches**: the
  sender's choice).
- **Cents trick:** reserve the **lowest free cents** starting at ,00 for 15 min ("não explorar os viewers"); a
  value frees when its Pix arrives or it expires. The page builds our own static BRCode (EMV, field 54 = amount,
  CRC16) matching the bank's QR byte for byte, so the viewer never types cents. The form polls its reservation
  ("Recebido!" / "O tempo acabou").
- **Backend:** a Lambda function URL + DynamoDB with TTL in Luan's personal AWS account, defined in `infra/`.
  The Pix key never enters the repo (the Lambda returns it, or CI injects it).
- **No moderation queue** for now, but a **word filter**. **Manual fallback in the dock:** "registrar Pix" (value
  and optional name, matching a reservation like a notification would) and "repetir último alerta". The
  `pix-live` studio's unmatched-Pix queue fits here.
- **Mural** of every Pix, forever, opt-in, chosen names only (never the legal name), read from DynamoDB and
  never committed (LGPD removal).
- **Voices:** pt-BR TTS (edge-tts) → RVC (Applio 3.7.1, MIT) with community models, rendered **at reservation** so
  the alert never waits. Works on the Mac (~2.7 s warm); use CUDA on Windows. Models verified (RVC v2, .pth +
  .index): Bob Esponja BR (belllq bobesponja), Silvio Santos (VectorLua), Patrick BR (belllq), Faustão (VectorLua),
  Seu Madruga (belllq seuMadrugaHarv), Chaves (Pedro1230987/Chaves), Pica-Pau (Navarro20/PicaPauPTBR), Goku BR
  (mthxz), Galvão (1899Deposit38-ECV/Galvaobueno), Cid Moreira (gaizerick), Lula Molusco (belllq), Datena
  (PLS442). Avoid SrIncognito69/Bob_Esponja (Spanish), Lojiti/spongebobpt (Portugal), Lukinha012/Silviosantos
  (actually MC Poze). Pitch +6 for Bob and Pica-Pau. Luan's own cloned voice comes later, trained on his clean
  mic track. Tell Luan the personality-rights risk of celebrity voices; it's his call.
- **Audio in the page:** the OS's speech can't be captured by OBS, so the overlay plays WAVs through one
  AudioContext. OBS needs no click; Chrome does (the pilot shows "Som desligado: clique…").
- **Goal bar:** yes. **Each Pix tied to the moment** (dock log) so the mural links to the match and the VOD second.
- **PJ later:** with volume, receive on Luan's company with Inter PJ's official Pix API (webhook, dynamic QR per
  reservation): no cents trick, no notification hack, and the QR shows the company instead of Luan's full name.
  Tax questions go to an accountant.

## 7. Σ, fans and the community (decided, for later)

- **Σ ("sigmas")**: one cumulative points currency; game ranks are only a per-game display of it (thresholds
  per game). **Nobody ever loses or spends Σ, only gains.** Lifetime total plus **seasons**.
- Earned by watch time, presence streak (like Duolingo's), Pix, channel points (once Affiliate), studying the
  roadmap on the site, following and commenting on YouTube.
- **Rank = permission tier:** high ranks are few and sensible and get more freedom (e.g. a soundboard); misuse
  means a talk or a demotion.
- **Viewer profile on the site**, with Twitch login for identity and dedup. It shows what they've done (moments
  they were there, hours watched, Σ, rank, badges and achievements) and is where they customize how they appear
  on stream:
  - **their fan in the torcida** (`torcida.html` draws every fan the same way today, so the look must come from
    the profile);
  - **their Pix/donate banner**, so every alert differs by sender.

  Higher ranks unlock more options, the same rule as the rest of the permission tiers. No shareable card ("brega").
- Names in the credits of the live's "Fim" scene and of videos. End-of-live stats on "Fim" (rankings of the
  live's viewers).
- **Weighted roulette** (odds by Σ) picks the "patrocinador" of a short, match, play or replay; **replay
  patrocinado** via the replay buffer.
- **Q&A between matches.** "**Adivinha a velocidade**" of a shot. A quick poll only as Luan's tool during VOD
  analysis. **Missão aleatória por partida** (backlog).
- On the site later: follow the RLR 3D replay synced with the VOD; "adivinha onde a bola vai" on a shot in a
  replay; **Análise do viewer** (viewers send their replay; a recurring segment once there are viewers).

**Rejected, don't propose again:** predictions or anything bet-like; a catchphrase counter; English captions;
an AI co-host bot; voting on roadmap topics; game challenges paid by Pix. Smart lights reacting to goals: loved,
but Luan has no smart bulb (backlog).

## 8. RLR Estúdio, shorts, socials

- **RLR Estúdio:** a mode of RLR that takes a VOD and/or a .replay, synced; a key swaps VOD and 3D with any
  camera; it records mic, optional webcam and a log (playhead, view switches, camera, strokes, marks). Claude
  renders from the log, 3D re-rendered headless at any size (native 9:16 for shorts). Chrome can't pick an MKV
  audio track, so prepare a game-only playback copy.
- **Shorts:** "Uma jogada de RL em 1 minuto" is the main series, made with RLR: hook first, result, then rewind
  and explain, under 60 s, word-by-word captions from whisper timestamps. Also pro plays from public ballchasing
  replays rendered in RLR (no broadcast footage).
- **The 28/10 live has a ready 2v2 Comentado episode 02:** seven wins in a row, Diamante 2 → 3 (matches from
  33:08 to 77:54 of the VOD). One playlist for all commented RL ("Rocket League Comentado"), global episode
  numbers; generalize `EPISODES` in `build.py` by mode for 3v3.
- **Socials:** set up TikTok, Instagram and YouTube Shorts with the brand (avatar, bio, link to the site);
  publish each short to all three; list shorts on the site; YouTube's "related video" on each short.

## The pilot (`piloto/`)

A throwaway from the Mac, kept as reference for the Windows build. Nothing here is production code.

| File | What |
|---|---|
| `server.mjs` | Node on :8787: notification parser, reservations with the cents trick, BRCode, crowd state, Galvão lines, SSE to the overlays, `/simular` for tests. Reads `pix.json` (`{ "chave", "nome", "cidade" }` as the bank's QR has them) and `token.txt`, both ignored. |
| `form.html` | The viewer's form (`/pix`): name, message, voice + preview, QR and copia e cola, countdown, status. |
| `overlay.html` | The Pix band (from `brand/twitch/alertas/alerta.css`), chime and voice through one AudioContext. |
| `torcida.html`, `controles.html` | The stand with fans, reactions, dedication and captions; phone buttons that fake the Stats API. |
| `voz.py` | Warm voice worker on :8788: edge-tts pt-BR → Applio's `VoiceConverter`. Run with Applio's venv from Applio's folder. On Windows replace the macOS `afconvert` call with ffmpeg. |
| `legenda.mjs` | Live captions: audio → `whisper-server` (:8789) every second → the overlay. On Windows, read the mic instead of a file. |
| `unpack_check.py` | Unzips voice models safely and lists the globals their pickles reference, without running them. |

## Open with Luan

- Delete the 27/10 VOD now or later.
- The copy on the `lives` branch (he is rewriting it).
- Celebrity voices: go or not, given the rights risk.
- Twitch Affiliate: channel points rewards, sub badges, emotes and alert variants are designed but wait for it.
