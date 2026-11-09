# VAR: Windows handoff

Brainstormed on the Mac on 2026-11-09. The Windows session builds it with Luan; nothing exists yet. **Delete this
file in the commit that ships the VAR.**

AGENTS.md and `handoff/README.md` still apply: Luan writes the copy, `brand/` keeps everything, ask before any push,
and `main` is a release.

## The idea

Luan "calls the VAR" on a play: an instant replay of it, with the stream dressed as a video referee's booth and the
chat voting on the verdict. Use it for a demo in Rocket League, an absurd headshot in Valorant, a goal nobody
understood.

Decisions Luan made:

- **Only by hand, from the Efeitos dock.** Nothing fires it on its own, and it's not for every death. It's the same
  rule as Lance ruim: he uses it with judgment.
- **Rocket League: after the match.** The game is too fast to stop mid-match.
- **Valorant: while dead.** Dying leaves plenty of time, so the VAR plays right away.
- **The VAR look:**
  - The camera frame switches to a VAR mode.
  - The crowd puts on referee kit.
  - A custom transition goes in and out.
- **A chat poll goes with it.** Luan fills in the question and the options in the dock when he calls it.

Still open, so ask Luan:

- Is the chat's vote the verdict, or does he get the last word?
- How is a tie broken?
- Does calling or voting give Σ? (Default: no Σ.)

## How it works

The engine is **OBS's Replay Buffer**. While streaming, OBS keeps the last N seconds in memory, and saving them to a
file is instant. Nothing the viewer sees changes until the VAR scene comes up.

The buffer only holds the last N seconds, so the two games need different flows:

- **Valorant: one step.** Luan dies and presses **VAR** in the dock (with a hotkey). The dock saves the buffer and goes
  straight into VAR mode with that clip.
- **Rocket League: two steps.**
  1. **Mark** (a hotkey, silent): mid-match, Luan marks the play. The dock saves the buffer and keeps the file. The
     stream shows nothing, and it costs him half a second.
  2. **After the match** the dock lists that match's marks. Luan clicks one, and VAR mode starts with that clip.

  Optional: label each mark from the dock's Stats API log. Partidas already hears the events, so a mark can read
  "demolido · 3:12" or "gol sofrido · 1:40" from the last event before it. Partidas and Efeitos are separate docks, so
  this needs them to share it, or the marking should live in Partidas.

### OBS

- **Replay Buffer**, under Settings → Output → Replay Buffer:
  - Turn it on.
  - Set a maximum time. Start with ~20 s and adjust with Luan: long enough for the play, short enough to watch.
  - Set it to start with the stream. `obs.py` can do it, or the dock can call `StartReplayBuffer` when the stream starts.
  - It uses the recording's encoder (NVENC CQP 22), so check its memory limit.
- **Saving:** obs-websocket's `SaveReplayBuffer`, then the `ReplayBufferSaved` event carries the file's path
  (`savedReplayPath`). Keep the clips for the session, and delete them when the live ends unless Luan wants a shot for
  a short.
- **Playing:** a media source "VAR · replay" in the VAR scenes. The dock points it at the clip with `SetInputSettings`
  (`local_file`) and controls it with `TriggerMediaInputAction` (restart, pause, play). Speed is the source's
  `speed_percent`: give the dock slow-motion buttons (100 / 50 / 25%) and "de novo".
  - Prefer this over playing the file in a browser page. The pages come from the site over https and can't read a
    local file without another local server.
- **Copyright:** the clip carries the game audio, so the VAR depends on the streamer-safe music rule in
  `handoff/README.md`. Consider muting the game track on "VAR · replay" and leaving only a "tambor" under it. Luan
  decides.

### The VAR scenes

"VAR · Rocket League" and "VAR · Valorant", following the "Lance ruim" / "Lance ruim · Valorant" pattern. The dock picks
the scene from the game it came from, and leaves back to it, or to the talk scene after a Rocket League match.

Each scene has:

- The replay, large.
- The camera with its frame in **VAR mode**.
- The crowd in **referee kit**.
- A new browser source, `public/stream/var.html` (1920×1080), for the graphics:
  - the "VAR · REVISÃO" band;
  - the question and options with live bars as votes come in;
  - at the end, the verdict stamped on screen.

  It can also draw on the replay, like the offside line on the Rocket League pitch. That's the obligatory gag: one
  drag in the dock, and the page draws it.

**Telling the pages what's happening:** the same way Efeitos tells `tocador.html` to play a sound. That's
obs-browser's `emit_event` through `CallVendorRequest` (see `efeitos.html`, "muanlartins-som"), which reaches every
browser source.

- Suggested events: one `muanlartins-var` event, with `{ fase: "abre" | "votacao" | "veredito" | "fecha", pergunta,
  opcoes, votos, vencedora }`.
- `var.html`, `torcida.html` and the camera frame each listen for it.

### The camera frame in VAR mode

`frame()` in `stream.js` draws the camera band. Add a VAR variant. The look needs Luan's approval; stay on the brand
(Klein, Branco, Klein claro, Space Grotesk, 45° cuts). Some directions:

- a referee-monitor look;
- black and white bands;
- a "REVISÃO" tab on a cut;
- the camera slightly desaturated.

It switches on with `fase: "abre"` and off with `"fecha"`.

### The crowd in referee kit

In `torcida.html` and `torcedor.js`, while the VAR is open every fan wears referee kit over their own choice. The
override is temporary and is never saved to their profile:

- a referee shirt (a new `roupa`, or a fixed colour pair over an existing one);
- a whistle (a new `acessorio`, "apito").

Fans keep their head and name. The kit comes off with `"fecha"`.

The vote can drive the crowd. On the verdict, fans who voted for the winning option celebrate, and the others hold up
a red card or slump. That needs the vote per login, which is one reason for the chat poll below.

### The transition

A VAR stinger, in and out, made like `transicao.html` → `transicao.webm` (`brand/twitch/transicao.mjs` renders it
frame by frame):

- Klein panels along the 45° lattice close on a "VAR" mark or a screen-shaped frame.
- A whistle goes into `sons/` (`brand/twitch/sons.mjs`) to play with it.
- Set it as the VAR scenes' transition override when the dock connects, as Efeitos does for Lance ruim.

Show Luan a render before wiring it.

### The poll

- **In the dock:**
  - When Luan calls the VAR, the dock shows a question and 2–3 option fields with presets he can edit:
    - "Lance limpo / Roubado"
    - "Skill / Sorte / Hack 👀"
    - "Culpa minha / Do parceiro / Indefensável"
  - Then the buttons: start the vote, close it and show the verdict, cancel.
  - Remember the last ones he used.
- **In the chat:** viewers vote `!1`, `!2`, `!3`.
  - One vote per login; the last one counts.
  - The torcida page already reads the chat and handles `!` commands (`comando()` in `torcida.html`).
  - Count the votes in one place and send the tally out in the `muanlartins-var` event.
- **Timing:**
  - Default 30 s in Rocket League, 20 s in Valorant.
  - Luan can close it early. In Valorant the next round won't wait.
  - "Voltar ao jogo" (F4) closes the VAR at any moment, poll included, as it does for Terapia.
- **Native Twitch polls** need Affiliate and a new scope (`channel:manage:polls`). EventSub only gives totals, not who
  voted what, so the crowd can't react per fan. Use the chat; if the channel is Affiliate by then, mention it to Luan
  as an option.

## Order of work

1. Turn on the Replay Buffer. Wire save → `ReplayBufferSaved` → "VAR · replay" in Efeitos, with play, slow motion and
   "de novo". Try it in a Valorant custom game.
2. The Rocket League marks and the after-match list.
3. Create `var.html` and the `muanlartins-var` events; build the poll with the chat count.
4. The camera frame's VAR mode and the crowd's referee kit.
5. The transition and the whistle.
6. A full test with Luan in each game. Then update the dock's own comment in `efeitos.html` (hotkeys, what each button
   does), add the VAR to `content/channel.ts` "Na live" (copy is Luan's), and delete this file.
