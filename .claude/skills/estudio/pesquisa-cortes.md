# Cutting Twitch moments into ~40 s vertical shorts: a practical guide

Researched 2026-11-12 for camera-over-game shorts (1080×1920) cut from Valorant and Rocket League lives with Portuguese speech.

**How to read the tags.** Every rule names its evidence:

- **[DATA]**: measured on real videos (a study, platform analytics, or a creator's own numbers with the method stated).
- **[PLATFORM]**: an official statement from YouTube, TikTok or Meta.
- **[PRO]**: a working editor or creator describing their practice. This is opinion, but it comes from experience.
- **[VENDOR]**: the blog of a clipping or editing tool. These are often reasonable rules of thumb, but nothing was measured and the tool has something to sell.
- **[SYNTH]**: my conclusion from the sources above it, written as a number a script can check.

Frame counts assume **30 fps**. Double them for 60 fps.

**Where the sources stand.** There is very little real data. The best numbers come from:

- Paddy Galloway's study of 5,400 Shorts.
- Jenny Hoyos's and Colin & Samir's analytics from their own channels.
- YouTube's own definitions of its metrics.
- Two ASR papers on timestamp accuracy.

Almost every "first 3 seconds" statistic you will see online is either about ads (Meta/Nielsen, TikTok ads) or has no traceable source. The rules on transitions and effects are craft opinion everywhere. No source gives frame counts or dB levels from controlled tests.

---

## 0. Your three failures, mapped to rules

| Failure | Root cause | Rules that fix it |
|---|---|---|
| Sentences chopped at stretch edges | In/out points were taken from Whisper word times. Whisper has no real word timing, and alignment gets worse under game noise. | §2: I2, I3, I4, I5, and the hard gate in §9 |
| 8 moments in 70–80 s reads as confusing | Too many setups for the viewer to absorb. Each moment needs its own context. | §3: S1, S2, S3 |
| Effects on every beat feel tacky | No contrast. Effects were placed on a timer instead of on events. | §4: T1. §5: E1, E7 |

---

## 1. Hook: the first 1–3 seconds

**What the data says**

- **[DATA]** Galloway and Gileta studied 5,400 Shorts from 33 channels (3.3 B views). Shorts below **60 % "viewed vs. swiped away"** rarely performed. The best performers sat at **70–90 %**. Galloway's only hook advice is to make the first second "really punchy" and to treat the intro "like a thumbnail". ([thread](https://threadreaderapp.com/thread/1646898356419981315.html))
- **[PLATFORM]** "Viewed (vs. swiped away)" is YouTube's own Reach-tab metric for Shorts: the share of times viewers chose to watch instead of swiping. ([YouTube Help](https://support.google.com/youtube/answer/9314355)) YouTube's Shorts product lead, Todd Sherman, described the process: each Short goes to a small seed audience, and its reach widens or narrows depending on whether those viewers watch or swipe. ([TechCrunch on Creator Insider](https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/))
- **[DATA]** Jenny Hoyos reports her own numbers:
  - Her viewed rate averages about **85 %**, against a platform average she puts at about 70 %.
  - Trimming **one second** off a Short raised its retention from **83 % to 88 %**.
  - She says losing 1 s of a 32 s Short costs about 3 % of the video.

  ([Creator Science interview](https://creatorscience.com/podcast/jenny-hoyos/))
- **[PLATFORM]** TikTok's ads guidance says to put the hook within the **first 6 s** and the key message within 3 s. TikTok's figure that "63 % of the highest-CTR ads show the key message in 3 s" has no published method. ([TikTok creative best practices](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)) These are ads, not organic clips.
- **[DATA, ads]** Facebook and Nielsen found brand lift from video views shorter than 1–3 s, which supports the idea that the first second carries real weight. ([Marketing Dive](https://marketingdive.com/news/brand-lift-happens-in-less-than-1-second-of-video-study-finds/377333))
- **[PLATFORM survey]** In Kantar's survey for TikTok, 88 % of users said sound is essential to TikTok. ([TikTok/Kantar](https://ads.tiktok.com/business/en-US/blog/kantar-report-how-brands-are-making-noise-and-driving-impact-with-sound-on-tiktok)) Against that, a 2019 Verizon Media and Publicis study found 69 % of people watch with sound off **in public**, but only 25 % in private. ([3Play summary](https://www.3playmedia.com/blog/verizon-media-and-publicis-media-find-viewers-want-captions/)) So design for sound-on, and make sure the hook still reads on mute.

**Rules**

- **H1. Frame 0 is the most striking image in the short.** That means the payoff or the reaction peak, never setup, a menu, walking, or a logo.
  - **[PRO/VENDOR]** "A clip that opens with 8 seconds of setup dies… open on the reaction or the kill and let context follow." ([streamer.guide](https://streamer.guide/guides/how-to-make-and-edit-twitch-clips))
  - **[VENDOR]** Eklipse gives the openings it expects: crosshair and enemy visible at 0–1 s, or the face mid-reaction at 0–1 s, then a cut to the cause at 1–2 s. If nothing is audible in the first 2 s, start later. ([Eklipse](https://blog.eklipse.gg/beginner-guide-2/stream-hook-strategy-first-two-seconds.html))
  - **[VENDOR]** Title cards, logos and slow zooms into someone about to speak are named as failing openers. ([autoclip](https://autoclip.dev/blog/viral-clip-anatomy-3-second-hook-data))

- **H2. Pick one of two hook patterns.**
  - **(a) Flash-forward teaser.** Show **0.5–1.0 s** of the payoff, then transition back to the start of the moment. The payoff then plays again, whole, at its real place. **[VENDOR]** DOR calls this "reverse-order editing… the most impactful result cut up front for 0.5–1 seconds." ([DOR](https://clip.dor.gg/en/blog/game-shorts-tiktok-tips))
    - **[SYNTH]** For stream clips, tease the *reaction* (face + scream), not the kill itself. The reaction raises a question that the play answers.
    - **[SYNTH]** Cut the teaser on a word boundary like any other stretch. Keep it ≤ 1.5 s, or it becomes a second moment.
  - **(b) In medias res.** Start **1–2 s before the decisive action**, with motion and sound in frame 0. **[VENDOR]** Find the peak, move back 2–3 s, and trim the usual 3–5 s buffer down to 1–2 s. ([Eklipse](https://blog.eklipse.gg/beginner-guide-2/stream-hook-strategy-first-two-seconds.html))
  - **[VENDOR]** Eklipse's four openings for gameplay clips ([Eklipse](https://blog.eklipse.gg/beginner-guide-2/viral-gaming-clips.html)):
    - stakes-first, starting where the situation turns hard;
    - mid-motion, so frame 0 doesn't read as a still;
    - reaction-first;
    - chat-first.

    It says to choose per clip rather than reuse one opening everywhere.

- **H3. Text hook: 3–5 words, on screen from frame 0 to about 2.5–3.5 s.**
  - The text states the situation or the stakes, not a label: "1v3 com 12 de vida", not "CLUTCH".
  - **[VENDOR]** 3–5 words; longer text means the clip needs more context. ([Eklipse](https://blog.eklipse.gg/beginner-guide-2/stream-hook-strategy-first-two-seconds.html)) The claude-shorts skill shows its hook overlay for the first 3.5 s. ([claude-shorts](https://github.com/AgriciDaniel/claude-shorts))
  - **[PRO]** Hoyos makes the hook visual and simple enough to "explain to a 5-year-old". Her test is whether it could work as a long-form title and thumbnail. ([Creator Science](https://creatorscience.com/podcast/jenny-hoyos/))

- **H4. Sound in frame 0, with no silent lead-in.**
  - Allow at most **one** designed hit in the hook: an impact or bass drop on frame 0, or on the teaser-to-start cut.
  - **[SYNTH]** This follows from H1 plus the TikTok/Kantar finding on sound. One hit reads as intentional; three in 3 s read as a meme template.

- **H5. Foreshadow the payoff within the first 3 s if the moment needs setup.**
  - **[PRO]** Hoyos's structure is hook, then a foreshadow of about two lines (usually under 3 s), then the body, then the payoff. ([Creator Science](https://creatorscience.com/podcast/jenny-hoyos/))
  - For a stream clip, the streamer's own line can do this ("quer que eu faça a bang?"). Otherwise use the text hook.

- **H6. Check after publishing.**
  - **[DATA-derived]** Aim for viewed rate ≥ 70 %. Below 60 %, the hook is the problem. ([Galloway](https://threadreaderapp.com/thread/1646898356419981315.html))
  - Compare against your own Shorts of similar length, not against a universal number.

---

## 2. Choosing in/out points

### 2a. Why transcripts give bad edges

- **[DATA]** Whisper has no native word-level timestamps. The WhisperX paper says Whisper's own timestamps are too unreliable to depend on. WhisperX adds VAD pre-segmentation and forced phoneme alignment instead. ([WhisperX, Interspeech 2023](https://arxiv.org/abs/2303.00747))
- **[DATA]** The CrisperWhisper paper adds three findings ([arXiv 2408.16589](https://arxiv.org/html/2408.16589v1)):
  - Whisper's tokenizer attaches spaces to the start of tokens, so **pauses get folded into word timings**.
  - The wav2vec2 aligner used by WhisperX is **less robust to noise** than Whisper itself.
  - Word-timing F1 at a 200 ms tolerance is only **68 % for Whisper and 59 % for WhisperX on noisy audio**, against 80 % for CrisperWhisper.

  Game audio under the mic counts as "noisy". Even the best model misses one word edge in five by more than 200 ms.
- **[DATA, your own measurement]** On the Diamante 3 cut, 17 of 20 stretch edges landed while the mic was at speech level. On the Sova cut it was 11 of 20.

### 2b. Rules

- **I1. Shape each moment as setup → payoff → reaction, standing alone.**
  - **[PRO]** Roger Nygard, editor of *Veep* and *Curb Your Enthusiasm* ([CineMontage](https://cinemontage.org/?p=58217)):
    - Setups must be "clear and concise so the audience knows the situation before the joke lands". Schaffer's team spent more time fixing setups than punchlines.
    - Put the biggest laugh at the **end** of a line or scene.
    - Remove anything between setup and punchline that distracts.
    - "The enemy of comedy is the unnecessary pause… The only reason to pause is when the joke demands the pause."
    - "Two frames can make the difference between funny and not funny."
  - **[VENDOR]** If a new viewer can't tell why the reaction matters, add setup. Reaction clips that include their setup tend to do better than reaction-only clips. ([streamer.guide](https://streamer.guide/guides/how-to-make-and-edit-twitch-clips))

- **I2. Use transcripts to find moments, never to place edges.**
  - **[SYNTH]** from §2a: every in/out point gets snapped to a silence measured on the **mic-only track**. Do not measure on the mixed track, where game audio hides the gaps.

- **I3. The snapping procedure.**
  - **[SYNTH]** Built from the tool defaults below:
    1. Run a VAD on the mic track. Silero VAD's defaults are threshold 0.5, `min_silence_duration_ms` 100 and `speech_pad_ms` 30 ([Silero source](https://raw.githubusercontent.com/snakers4/silero-vad/master/src/silero_vad/utils_vad.py)). Those are tuned for ASR chunking; for editing, set `min_silence_duration_ms` to **250** and `speech_pad_ms` to **150–200**.
    2. **In point**: speech onset minus **150–250 ms**. auto-editor's default `--margin` is **0.2 s**, so quiet audio within 0.2 s of speech stays in and "cuts don't clip the edges of speech" ([auto-editor options](https://auto-editor.com/ref/options)).
    3. **Out point**: speech offset plus **250–400 ms**, or the middle of the following gap if it is shorter than that.
    4. An edge is valid only if the mic stays non-speech for ≥ **100 ms on both sides** of the cut frame.
    5. If no valid gap exists within ±1.5 s of the wanted edge, **move the edge to the previous or next phrase end** rather than cutting inside speech.
  - **[PRO]** Melvynx's short-editing skill removes pauses over 0.3 s in its tightest cut. That is the upper bound on dead air between kept phrases. ([video-agent-skills](https://github.com/Melvynx/video-agent-skills))

- **I4. Cut where the voice falls, and never on an "upcut".**
  - **[PRO]** KPFA's public-radio editing guidance ([KPFA](https://kpfa.org/?p=339139)):
    - Make edits "at the end of a phrase or sentence, when the speaker's tone is likely to be going down."
    - Cut after a breath or after transition words ("but", "and", "so"; in Portuguese "mas", "e", "aí", "então").
    - Clipped final consonants (the "k" in "back", the "s" in "edits") create upcuts.
  - Portuguese has many word-final /s/ sounds and nasal vowels that trail off, so extend the out point rather than trimming it.

- **I5. Keep the breath before a phrase. Never cut half a breath, and never stack two breaths.**
  - **[PRO]** "Don't cut off people's breaths, because people breathe!" and "avoid two breaths in a row" ([KPFA](https://kpfa.org/?p=339139)).
  - **[PRO]** Breaths that come before a phrase are usually left in, because listeners expect them ([voice-over editing guide](https://www.suchavoice.com/?p=16018)).
  - **[VENDOR]** "Either include the whole breath in the cut or leave it in — half a breath sounds wrong in a way a full one never does." A cut-off breath means "the breath began earlier than you thought" ([Cast docs](https://mubert.com/tools/cast/docs/click-where-i-cut)). That is exactly the Whisper failure mode: the in point lands after the inhale has started.

- **I6. Put a micro-fade on every audio edge.**
  - **[PRO/VENDOR]** Descript applies automatic microfades of about 5 samples at every edit so cuts don't pop ([Descript](https://help.descript.com/timeline/automatic-microfades.md)). Cast fades "a few milliseconds at every boundary". If a click survives, the cut landed mid-waveform: move it into the silence between words rather than lengthening the fade ([Cast](https://mubert.com/tools/cast/docs/click-where-i-cut)).
  - **[PRO]** Premiere editors routinely apply a **2-frame** default audio crossfade to every dialogue cut ([Adobe forum](https://community.adobe.com/t5/premiere-pro-discussions/why-is-the-minimum-audio-transition-duration-2-frames/m-p/12864872)).
  - **[PRO]** Use the shortest fade that removes the click; long crossfades on every cut cause dips and blur dialogue ([DaVinci Resolve Club](https://davinciresolveclub.com/fix-audio-clicks-pops-davinci-resolve/)).
  - **[SYNTH]** **10–20 ms** on mic and game audio at hard cuts; 2 frames (66 ms) where two different stretches meet.

- **I7. Lead-in before the action: 1–2 s. Tail after the reaction: let it decay.**
  - Lead-in: **[VENDOR]** trim the 3–5 s buffer to 1–2 s before the peak ([Eklipse](https://blog.eklipse.gg/beginner-guide-2/stream-hook-strategy-first-two-seconds.html)).
  - Tail: **[PRO]** comedy editors "hold for the laugh" on the reaction, then stop. Cut to the reaction promptly and hold it only while it lands ([Nygard](https://cinemontage.org/?p=58217); [Descript comedy editing](https://descript.com/blog/article/learn-how-to-edit-a-comedy-clip-and-make-your-jokes-land)).
  - **[SYNTH]** End **0.3–0.8 s** after the reaction's last word or laugh decays below the speech threshold. Never cut while he is still laughing or talking.

- **I8. Use J-cuts and L-cuts only across non-speech audio.**
  - **[PRO]** A J-cut starts the incoming audio before its picture; an L-cut carries the outgoing audio past the cut. Together they mean "picture and sound rarely change at the same moment" ([Epidemic Sound](https://www.epidemicsound.com/blog/j-cuts-and-l-cuts/); [Adobe](https://www.adobe.com/creativecloud/video/discover/j-cut-and-l-cut)). No source gives a frame count.
  - **[SYNTH]** For this format:
    - **L-cut** the outgoing laugh or game sound **4–8 frames** under the transition.
    - **J-cut** the incoming game sound (shot, explosion, crowd) **4–8 frames** before its picture.
    - Never overlap speech from one stretch with speech from another.

- **I9. Check edges by listening, or by measuring if you can't listen.**
  - **[PRO]** Do two listening passes: one for content, one for technical problems only. Log timecodes and fix them ([KPFA](https://kpfa.org/?p=339139)).
  - **[SYNTH]** Since you can't hear the render, make the measurement a hard gate (see §9). Separately, ask the streamer for timestamps of any edge that sounds wrong.

---

## 3. Structure of a ~40 s gaming clip

**What the data says about length**

- **[DATA]** Galloway's sample (2023):
  - Most Shorts were 20–40 s, but **longer Shorts averaged more views**. Other forces are probably at play, and there were outliers at every length.
  - **Average view duration > 50 s** went with 4.1 M average views. Holding people is what matters, not length itself.

  ([thread](https://threadreaderapp.com/thread/1646898356419981315.html))
- **[DATA]** On Colin & Samir's channel, **6 of the top 8 Shorts in one quarter were 34–43 s**, up from 23–30 s the quarter before. They credit better hooks and loops, not the algorithm. ([Publish Press](https://news.thepublishpress.com/p/shorts-powered))
- **[PRO]** Hoyos's most popular YouTube Shorts average about **34 s**. She says YouTube tolerates "slower pace, more story" than TikTok, where 10–20 s works best for her. ([Creator Science](https://creatorscience.com/podcast/jenny-hoyos/))
- **[VENDOR]** Clip-tool blogs suggest 15–35 s ([streamer.guide](https://streamer.guide/guides/how-to-make-and-edit-twitch-clips)) or 15–30 s, saying "over 45 s the completion rate drops", plus "one peak moment per clip" ([DOR](https://clip.dor.gg/en/blog/game-shorts-tiktok-tips)). Neither shows data.
- **[VENDOR]** A single gameplay moment usually needs 8–20 s to "establish stakes and deliver the play". Eklipse warns against padding toward a length target, because completion matters more than duration ([Eklipse](https://blog.eklipse.gg/beginner-guide-2/viral-gaming-clips.html)).

**Rules**

- **S1. Length is 35–45 s, hard cap 59 s, and it is set by the moment.**
  - **[SYNTH]** If the moment is whole at 28 s, ship 28 s. Every padded second costs about 3 % retention (Hoyos's arithmetic).
  - A pure gameplay play rarely fills 40 s on its own. Stream clips get there because the *talk* around the play (his setup line, the reaction, the bit afterwards) is part of the moment.
  - When one moment is only 15–20 s, the 40 s target means two moments with one premise (S2), not padding.

- **S2. One moment, or two that share one premise. That means 2–4 stretches in total.**
  - **[VENDOR]** "One peak moment per clip" ([DOR](https://clip.dor.gg/en/blog/game-shorts-tiktok-tips)).
  - **[PRO]** Nygard's rule of three is the ceiling for montage beats ([CineMontage](https://cinemontage.org/?p=58217)).
  - **[DATA, your own measurement]** The fcyacr Valorant reels you measured have one situation per reel, run 42–57 s, have 3–13 cuts, and use no SFX or music. The streamer called them the model.
  - **[SYNTH]**
    - Each stretch except the teaser is **≥ 6 s**.
    - A second moment is allowed only if it shares the first one's premise (the same gag, the same running joke) and the viewer needs **no new setup** for it.
    - Two moments → about 15–18 s each. One moment → 30–40 s.

- **S3. Templates.** **[SYNTH]**, assembled from H1–H5 and S1–S2.

  ```
  ONE MOMENT (~40 s)
  0.0–0.8   teaser: the reaction peak (face) + 3–5 word hook text, 1 impact SFX
  0.8–1.1   transition (zoom punch or whip, 8–10 frames) + whoosh peaking on the cut
  1.1–~8    setup: the streamer's own line or a 2–3 s situation text; game HUD visible
  ~8–33     the moment, whole; internal jump cuts only over dead air > 2 s
  33–40     reaction + resolution; cut 0.3–0.8 s after the last laugh/word; no outro

  TWO MOMENTS, ONE PREMISE (~40 s)
  0.0–0.8   teaser (from moment B, the bigger one)
  0.8–1.1   transition
  1.1–18    moment A (setup → payoff → reaction)
  18–18.3   transition (the same style as the first)
  18.3–40   moment B (payoff → reaction); end
  ```

- **S4. Give context in under 3 s, preferably from his own voice.**
  - **[PRO]** Hoyos foreshadows in about two lines, under 3 s ([Creator Science](https://creatorscience.com/podcast/jenny-hoyos/)).
  - **[VENDOR]** Use one line of on-screen text in the first 2 s that states the constraint in plain words. "1v4 retake" is jargon; "Everyone else is dead. He has 14 HP." is not ([Eklipse](https://blog.eklipse.gg/beginner-guide-2/viral-gaming-clips.html)). In pt-BR: "Todo mundo morreu. Ele tem 14 de vida."
  - **[SYNTH]**
    - If his speech states the situation, use it and skip the text.
    - Otherwise show one line of situation text for ≤ 3 s: round score, HP, "1v3", or the RL score and time left.
    - Crop the game area so the HUD elements that carry context (kill feed, round score, RL scoreboard) stay in frame.

- **S5. Inside a moment, use plain cuts or none.**
  - **[VENDOR/PRO]** "Most cuts should be silent handoffs." ([Sonilo](https://sonilo.com/blog/guides/transition-effect-sound-video-edits))
  - **[SYNTH]** Remove only spans where **both** mic and game are dull for > 2 s (walking, buy phase, kickoff countdown). Cut on a mic silence (I3) with no designed transition. Never split one moment into pieces with transitions; that is what made the 11-09 reel read as "cortes desconexos".

---

## 4. Transitions between stretches

**Rules**

- **T1. Use a designed transition only where time or place jumps, at most 1–3 per short.**
  - That means teaser → start, and moment A → moment B. Everything else is a hard cut.
  - **[PRO]** "The more unique it is, the more grating it becomes when you repeat it." New editors overuse library transitions and SFX ([vidIQ](https://rosetta.to/u/vidiq/editing-mistakes-youtubers-make-that-viewers-hate)).
  - **[VENDOR]** "The edits that feel most polished usually use fewer transition sounds, not more" ([Sonilo](https://sonilo.com/blog/guides/transition-effect-sound-video-edits)).
  - **[VENDOR]** Too many fancy transitions "make your content seem fake" ([Vidpros](https://vidpros.com/best-transitions-for-short-form-videos/)).

- **T2. Which transitions, and how long.** Totals are at 30 fps, with the cut at the midpoint.

  | Transition | Frames @30 | Seconds | Reads as | Sources and notes |
  |---|---|---|---|---|
  | Hard cut | 0 | 0 | Clean (the default) | — |
  | **Zoom punch / zoom-through** (scale up into the cut, the next stretch settles from about 110 % to 100 %) | **6–10** | 0.2–0.33 | Energetic, not cheap; suits the camera-over-game stack | **[VENDOR]** Impact zoom 100→115–120 % over 6–10 frames, synced to a bass hit, and "used consistently on every cut, neither effect retains its power" ([Captions](https://feat-cms-client-provider-for.captions-site.pages.dev/styles/impact)) |
  | **Whip pan** (directional motion blur, vertical or horizontal slide) | **7–10** | 0.23–0.33 | Energetic | **[PRO]** 7 frames looked right in a Shotcut tutorial ([forum](https://forum.shotcut.org/t/motion-blur-pan-transition-whip-pan-tutorial-part-one-now-completed/20760/6)); 8 frames at 24 fps, which is 0.33 s ([FlexClip](https://www.flexclip.com/learn/whip-pan-transition.html)). Keep the direction and speed the same on both sides ([Vidpros](https://vidpros.com/best-transitions-for-short-form-videos/)) |
  | Swipe / slide | 4–12 | 0.13–0.4 | Neutral | **[VENDOR]** Cuts and swipes at 0.2–0.5 s ([Vidpros](https://vidpros.com/best-transitions-for-short-form-videos/)). A slide transition "adjusted to be four frames long" ([Noble Desktop](https://www.nobledesktop.com/learn/premiere-pro/using-effects-as-transitions-in-premiere-pro)) |
  | White flash | **2–4** peak + 4–6 fade | 0.07–0.33 | Punchy once, tacky when repeated | **[PRO, animation]** A clash flash lasts 1–2 frames ([Animation Energy](https://energy-edits.pages.dev/lessons/intermediate/energy-effects)). Keep flashes as short as possible ([FlexClip](https://www.flexclip.com/learn/flash-transition.html)). **[SYNTH]** 60–80 % opacity, at most once per short, on the payoff rather than as a stretch joiner |
  | Glitch / RGB split / "VHS rewind" | 4–8 | 0.13–0.27 | Cheap unless it is motivated | **[SYNTH]** Only for the teaser → "rewind" back to the start, and never as the house transition |
  | Spin, 3D cube, page curl, star wipe | — | — | Cheap or dizzying | **[VENDOR]** Spins can leave viewers "dizzy or overwhelmed"; keep zoom and 3D effects subtle ([Vidpros](https://vidpros.com/best-transitions-for-short-form-videos/)) |

- **T3. One transition style per short, always in the same direction.**
  - **[VENDOR]** Adjacent zooms at the same speed and direction cut together more smoothly ([AIR](https://air.io/en/youtube-hacks/advanced-retention-editing-cutting-patterns-that-keep-viewers-past-minute-8)).
  - **[PRO]** Keep a house style with fixed fonts and elements ([vidIQ](https://rosetta.to/u/vidiq/editing-mistakes-youtubers-make-that-viewers-hate)).
  - **[SYNTH]** The zoom punch is the house transition. Use the whip only if the two stretches differ in place, such as Valorant to IRL camera.

- **T4. Sound design for a transition.**
  - **Whoosh.** **[VENDOR]** Its loudest point lands on the edit point: "start it before the edit and let its peak fall on the first frame of the new shot." A sound that starts only after the cut feels late. A whoosh that outlasts its transition is "the most common reason one feels wrong." Nudge it one frame at a time. ([Sonilo whoosh guide](https://sonilo.com/ai-music/whoosh-sound-effect-guide); [Sonilo transitions](https://sonilo.com/blog/guides/transition-effect-sound-video-edits))
    - **[SYNTH]** Onset 4–10 frames before the cut, peak on the cut frame, tail trimmed and faded by 6–10 frames after the cut. The total stays ≤ about 0.5 s for a 6–10 frame transition.
  - **Impact.** **[VENDOR]** Use one "only when the object visibly stops, attaches, or appears." Leave a few frames of silence for the landing ([Sonilo](https://sonilo.com/ai-music/whoosh-sound-effect-guide)).
    - **[SYNTH]** On the first frame of the payoff or of the new stretch, never under a spoken word.
  - **Riser.** **[VENDOR]** A rise that "stops dead at the peak, so the edit lands in the silence immediately after… hits considerably harder" ([Sonilo](https://sonilo.com/ai-music/whoosh-sound-effect-guide)).
    - **[SYNTH]** 0.5–1.5 s, ending exactly on the cut into the payoff, used **once** per short at most.

- **T5. Levels: voice first, then SFX, then music.**
  - **[PRO]** "Voice should be loudest, sound effects a little louder than music but quieter than the voice." ([vidIQ](https://rosetta.to/u/vidiq/editing-mistakes-youtubers-make-that-viewers-hate))
  - **[VENDOR]** Typical ranges (absolute levels, not voice-relative):
    - SFX −12 to −18 dB with dialogue at −6 to −12 dB, so effects sit about 6 dB under the voice ([Pixflow](https://pixflow.net/blog/audio-mixing-premiere-pro/)).
    - A music bed starts **18–24 dB under the voice**. Short SFX "can temporarily sit much closer to the voice" ([OverseerOS](https://www.overseeros.com/blog/background-music-volume-under-voiceover)).
    - Duck the bed **3–6 dB** under a transition sound, with a fast recovery ([Sonilo](https://sonilo.com/blog/guides/transition-effect-sound-video-edits)).
  - **[PRO]** YouTube plays back against a **−14 LUFS** reference and turns louder audio down ([Production Advice, Ian Shepherd](https://productionadvice.co.uk/youtube-loudness/)).
  - **[SYNTH]** Script numbers:
    - Mix to −14 LUFS integrated.
    - A transition SFX sitting in a speech gap has momentary loudness **3–6 LU below the voice's typical momentary loudness**.
    - If it must overlap speech, keep it 10–12 LU below. Better: don't overlap.
    - Game audio ducks 3–6 dB for the duration of the SFX.
    - Music, if any, sits 18–24 LU under the voice.

---

## 5. Effects: how often is too often

- **E1. Effect budget for a 40 s short.** **[SYNTH]**
  - The hook cluster (teaser + text + 1 impact).
  - **1–3 transitions** (T1).
  - **2–4 emphasis effects** (zoom punch, shake, meme SFX), each on a real event.
  - That works out to about **one effect per 8–10 s** outside the hook, and **never two effects within 1 s** of each other. Effects never sit on top of a spoken punchline.

  The evidence behind the budget:
  - **[VENDOR]** Effects "used consistently on every cut" lose their power ([Captions](https://feat-cms-client-provider-for.captions-site.pages.dev/styles/impact)).
  - **[PRO]** Melvynx's engine puts thuds and pops "only on payoffs", with no whooshes ([video-agent-skills](https://github.com/Melvynx/video-agent-skills)).
  - **[PRO]** A creator who aimed for a visual change every 4–7 s found the style unsustainable and drew more critical comments: "viewers want remarkable not repeatable editing" ([vidIQ, "Retention editing is dead"](https://rosetta.to/u/vidiq/retention-editing-is-dead)).
  - **[VENDOR]** "More editing doesn't equal better retention… endless zooms, whooshes, stacked jump cuts tire viewers faster" ([AIR](https://air.io/en/youtube-hacks/advanced-retention-editing-cutting-patterns-that-keep-viewers-past-minute-8)).
  - **[DATA, your own measurement]** Your 11-09 reel had 14 stretches in 34 s and an SFX on nearly every beat. The verdict was "edição caótica, efeitos visuais cafonas."

- **E2. Zoom punch on the camera: 100 → 110–115 %.**
  - Shape: ease out over 4–6 frames, hold, then cut or return over 8–12 frames.
  - Trigger: the reaction peak only (scream, laugh, face).
  - **[VENDOR]** 115–120 % over 6–10 frames ([Captions](https://feat-cms-client-provider-for.captions-site.pages.dev/styles/impact)). A fast punch-in is "a quick 8–15 % scale jump" ([Pippit/CapCut](https://www.pippit.ai/blog/capcut-alternative/capcut-zoom-in-effect)).
  - **[SYNTH]** The camera tile is already upscaled from a 1080p webcam crop, so go no higher than 115 % or it softens visibly.

- **E3. Shake: 2–3 frames light, 6–8 frames heavy, decaying.**
  - Envelope: 2 frames strong, 3 medium, 2 slight, then settle. Use it on physical hits only: a demo in RL, a flash or explosion, a desk slam.
  - **[PRO, animation]** Don't shake every action or emotional moments; shaking too long makes viewers dizzy ([Animation Energy lesson](https://energy-edits.pages.dev/lessons/intermediate/dynamic-camera)). This source is about animation, but the timing carries over to video.

- **E4. Captions: caption the speech that carries the joke, not the gameplay.**
  - **[DATA, ads]** Captions raised view time by about 12 % in Facebook's internal test ([3Play summary](https://www.3playmedia.com/blog/captions-increase-viewership-for-facebook-video-ads/)). A large share of people watch muted in public (§1).
  - **[VENDOR]** Highlights "param de funcionar quando todas as palavras estão gritando". Use **one highlight per block**, on the word that changes the meaning. Keep captions to one or two lines, one idea per block, away from the lower-right and lower-center UI ([NemoVideo pt-BR](https://www.nemovideo.com/pt-BR/blog/ai-video-editing/ai-text-captions-capcut)).
  - **[PRO]** Melvynx uses 1–3 words per caption, with the spoken word highlighted ([video-agent-skills](https://github.com/Melvynx/video-agent-skills)).
  - **[DATA, your measurement]** The fcyacr reference has no captions on plays.
  - **Safe zones:**
    - **[VENDOR]** Keep text out of the top ~12 % and bottom ~25 % of the frame ([streamer.guide](https://streamer.guide/guides/how-to-make-and-edit-twitch-clips)).
    - **[VENDOR]** A centered 900×1400 box is safe on all three apps ([Reap](https://reap.video/blog/short-form-video-safe-zones)).
    - **[SYNTH]** In camera-over-game, put captions on the seam between the two tiles.

- **E5. Meme SFX or emoji: at most 1 per short, and only where his own reaction already makes the joke.**
  - **[VENDOR]** "A 'boom' for a headshot or a meme sound for a fail" can make a clip more engaging ([Eklipse](https://blog.eklipse.gg/beginner-guide-2/how-to-make-esports-clips-stand-out.html)). Critics call stacked meme effects overdone and unoriginal ([vidIQ](https://rosetta.to/u/vidiq/retention-editing-is-dead)).
  - **[SYNTH]** Never put it under his line: it steps on the laugh (Nygard's "unnecessary pause" problem in reverse).

- **E6. Slow motion: only on the payoff's final shot, ≤ 1.5 s at about 50 %, and only when the mechanic is the point** (an RL flip reset or aerial, a one-tap).
  - **[VENDOR]** Eklipse suggests "slow-motion on the final shot" to build excitement ([Eklipse](https://blog.eklipse.gg/beginner-guide-2/how-to-make-esports-clips-stand-out.html)).
  - **[SYNTH]** Slow motion repeats time, so it counts against the effect budget. Never slow down over speech, because his voice can't be slowed with it.

- **E7. What separates high-retention editing from tacky editing.** **[SYNTH]** from all of the above.

  | High-retention | Tacky |
  |---|---|
  | Every effect is triggered by something on screen or in his voice | Effects on a timer or on every cut |
  | One house transition and one caption style | A sampler of library presets |
  | Effects land in gaps, and speech is never covered | Whooshes over words; meme SFX on the punchline |
  | Contrast: 5–10 s clean, then one hit | Constant stimulation, so nothing stands out |
  | The moment plays whole; cuts follow the story | One moment chopped into pieces with transitions |
  | Ends on the payoff | Outro, end card, fade to black |

---

## 6. Loops and endings

- **L1. End on the payoff or reaction, 0.3–0.8 s after the last word or laugh decays.**
  - **[PRO/DATA]** "Whatever you say you're gonna do, you end it right after you do it." Trimming the final second took one Short from 83 % to 88 % retention ([Hoyos](https://creatorscience.com/podcast/jenny-hoyos/)).

- **L2. No end card and no outro.**
  - **[PRO]** CTAs "tend to usually drop" average view duration. If you must ask, do it over payoff footage ([Shorts newsletter](https://shorts-faceless.beehiiv.com/p/getting-viral-shorts-isnt-fcking-hard)).
  - **[DATA]** On Colin & Samir's channel, a subscribe CTA woven into the story raised subscriber conversion without hurting virality. It was part of the narrative, not a card ([Publish Press](https://news.thepublishpress.com/p/shorts-powered)).
  - **[DATA, your own]** The streamer's verdict on the no-outro take: "o sem outro ficou EXCELENTE."
  - **[SYNTH]** End card length: **0 s**. A spoken or captioned CTA, if any, runs **≤ 2 s over payoff footage**, never over a black or branded frame.

- **L3. Design the loop.** The last frame should flow into frame 0: the same framing, a line that sets up the teaser, or a sound that continues into it. No fade to black.
  - **[DATA, one channel]** Colin & Samir's Shorts that ended in loops averaged **143 % more views** than non-looped ones. On one 26 s looped Short, **68 %** of viewers watched again ([Publish Press](https://news.thepublishpress.com/p/shorts-powered)).
  - **[PRO]** Hoyos's average retention (~95 %) is higher than her viewed rate because of rewatches ([Creator Science](https://creatorscience.com/podcast/jenny-hoyos/)).
  - **[PLATFORM]** Since 31 March 2025, YouTube counts a Shorts view at every start **or replay**. The older count lives on as "engaged views", which revenue still uses ([TechCrunch](https://techcrunch.com/2025/03/26/youtube-is-changing-how-youtube-shorts-views-are-counted)).

- **L4. The last 0.5 s has no silence and no long fade.**
  - **[SYNTH]** An audio fade-out of more than 6–10 frames signals "the end" and invites the swipe before the loop. Hoyos favours abrupt endings that cut on a reaction.

- **L5. On Instagram, optimise for sends.**
  - **[PLATFORM]** Adam Mosseri says sends per reach is the strongest signal for reach to non-followers, ahead of watch time and likes ([Lindsey Gamble](https://www.lindseygamble.com/blog/instagram-head-says-send-rate-is-more-important-than-watch-time-likes-and-comments-for-reach)).
  - **[SYNTH]** A clean, whole, funny moment that someone would send to a friend beats a dense montage.

---

## 7. Tools, open-source projects and skills worth learning from

| Project | What to take from it | Notes |
|---|---|---|
| [auto-editor](https://github.com/WyattBlue/auto-editor) ([options](https://auto-editor.com/ref/options)) | Silence-based cutting with `--margin 0.2s` (keeps 0.2 s around speech) and `--smooth 0.2s,0.1s` | Good reference values for I3 |
| [Silero VAD](https://github.com/snakers4/silero-vad) | Robust speech/non-speech on the mic track | Defaults (pad 30 ms, min silence 100 ms) are for ASR; raise them for editing (I3) |
| [WhisperX](https://github.com/m-bain/whisperX) / [CrisperWhisper](https://github.com/nyrahealth/CrisperWhisper) | Better word times than plain Whisper. CrisperWhisper models pauses explicitly and handles noise better | Still verify every edge with the VAD; even the best is about 80 % F1 at 200 ms in noise |
| [claude-shorts](https://github.com/AgriciDaniel/claude-shorts) (Claude Code skill) | Scores candidates on hook 0.30, coherence 0.25, emotion 0.20, value 0.15, payoff 0.10, and shows hook text for 3.5 s. [`snap_boundaries.py`](https://raw.githubusercontent.com/AgriciDaniel/claude-shorts/main/scripts/snap_boundaries.py) works like this: (1) start = the nearest sentence-initial word within 1.5 s; (2) end = the sentence-ending word within +3.0 s, plus 0.3 s; (3) refine both to the **midpoint of an ffmpeg `silencedetect=noise=-35dB:d=0.3` silence** (start within 1.5 s, end within 2.0 s); (4) clamp to 5–60 s | A good template, but it runs silencedetect on the *mixed* track and trusts Whisper word ends first. For stream clips, run it on the mic track and drop the Whisper step |
| [Melvynx/video-agent-skills](https://github.com/Melvynx/video-agent-skills) (already installed) | `/steal` measures a reference's cut rate, SFX and music level. Short-editing defaults: pauses > 0.3 s removed, −14 LUFS, 1–3 word captions, thuds and pops only on payoffs | Its engine can't do camera-over-game, which is why `clipe.py` exists |
| [FunClip](https://github.com/modelscope/FunClip) | LLM picks segments from a Paraformer transcript with integrated timestamps; start/end offset flags | Built for Mandarin and English speech; silence removal is still on its to-do list |
| [ClipsAI](https://github.com/ClipsAI/clipsai) | WhisperX transcription + pyannote speaker-tracking reframe | Built for podcasts and interviews, not gaming |
| [stream-clipper](https://github.com/nirvagold/stream-clipper) | Finds highlights from **chat activity + audio** of a stream | A useful idea for ranking candidate moments (chat spikes); build-from-source only |
| [AI-Youtube-Shorts-Generator](https://github.com/SamurAIGPT/AI-Youtube-Shorts-Generator), [SupoClip](https://github.com/FujiwaraChoki/supoclip) | LLM highlight selection + Whisper + face-crop pipelines | Typical open-source OpusClip clones; nothing special about edges |
| NeverSight `video-edit` skill ([index](https://openskillindex.com/skills/neversight-learn-skills-dev-video-edit)) | Silence removal with Silero VAD + faster-whisper captions | Confirms the VAD-first approach |

**Commercial tools** (OpusClip, Eklipse, StreamLadder, Submagic) publish the [VENDOR] rules cited above. OpusClip's gameplay template puts the speaker in the top ~30 % and gameplay in the bottom ~70 % ([OpusClip](https://www.opus.pro/tools/gaming-video-editor)), close to your layout.

---

## 8. Reference creators and shorts

**Caveats.**

- I could not watch any of these videos, and **no source praises the editing of any one of them**.
- The editing notes below are my reading of titles, descriptions and third-party write-ups, labelled [ASSESS]. Measure the real style with `/steal` before copying anything.
- Every channel URL loaded (fake handles return 404). The listed shorts were checked with YouTube oEmbed to confirm who uploaded them.
- Subscriber counts are approximate, as of Nov 2026.
- Many shorts under famous names are fan re-uploads. Take references only from a creator's own channel.

| # | Creator / short | Why it's a reference |
|---|---|---|
| 0 | **fcyacr** (Instagram Valorant reels). Your current model; I couldn't find it on the web, so the handle comes from your own notes | [DATA, your measurement] One situation per reel, 42–57 s, camera on top and a square game tile below, 3–13 cuts, no captions on plays, no SFX or music, −14 to −15 LUFS. The streamer already picked it as the model |
| 1 | **Tixinha**: [youtube.com/@Tixinhadois/shorts](https://www.youtube.com/@Tixinhadois/shorts) (about 440 K) | The closest match to your format: a pt-BR Valorant streamer cutting his own lives into shorts (#valorantclips). [ASSESS] Use it for pt-BR hook and title wording and topic choice. Note that `@Tixinha` is someone else |
| 2 | **Cortes do Gaules [OFICIAL]**: [youtube.com/@CortesdoGaulesOFICIAL](https://www.youtube.com/@CortesdoGaulesOFICIAL) (about 112 K). Example: [short 0AziYhBh2h4](https://www.youtube.com/watch?v=0AziYhBh2h4) | The official clips channel of Brazil's biggest streamer (mostly CS). [ASSESS] Use it for the pt-BR "cortes" grammar: a single bit per short and an all-caps situation title. It is not proof of editing craft |
| 3 | **mwzera**: [youtube.com/@mwzera](https://www.youtube.com/@mwzera) (about 67 K) | A pt-BR Valorant pro and streamer posting highlights. [ASSESS] A smaller channel with the same niche and language. Editing not verified |
| 4 | **tarik**: [youtube.com/@tarik/shorts](https://www.youtube.com/@tarik/shorts) (about 1 M). Example: ["when your duo is goated"](https://www.youtube.com/shorts/QGYK-4dW4sA) | [ASSESS] A steady stream of cuts from his own Valorant stream with facecam, short lowercase titles, and the bit played as it happened. Close to camera-over-game |
| 5 | **Lethamyr**: [youtube.com/@Lethamyr/shorts](https://www.youtube.com/@Lethamyr/shorts) (about 1.5 M). Example: ["Best Bot vs Every Rank!"](https://www.youtube.com/shorts/kLbSqFuL0n8) | Rocket League. [ASSESS] The premise fits in the title, so the clip can play out whole without explaining itself (rule S4) |
| 6 | **ckeyz**: [youtube.com/@ckeyzRL](https://www.youtube.com/@ckeyzRL) (about 63 K) | Rocket League. [VENDOR] trophi.ai says his breakout hits are "all in this vertical format, including livestreams"; only 11 of 900+ videos are landscape. The best example of a small creator growing on vertical RL stream clips ([trophi.ai](https://www.trophi.ai/post/5-rocket-league-content-creators-you-should-be-watching)) |
| 7 | **SpookyLuke**: [youtube.com/@SpookLuke](https://www.youtube.com/@SpookLuke) (about 550 K). Example: ["Catch the Ball and Shoot Fast"](https://www.youtube.com/shorts/PvIhBYzXXhw) | Rocket League. [ASSESS] One idea per short, with an imperative title as the hook |
| 8 | **Thanovic**: [youtube.com/@Thanovic/shorts](https://www.youtube.com/@Thanovic/shorts) (about 450 K). Example: ["The BEST Wizard Flick in Rocket League!"](https://www.youtube.com/shorts/h9QFZPy-50s) | Rocket League. [ASSESS] Mechanic-as-payoff shorts; a model for when slow motion on the final touch is justified (E6) |
| 9 | **Musty (amustycow)**: [youtube.com/@amustycow](https://www.youtube.com/@amustycow) (about 3.6 M) | Rocket League. [VENDOR] His 30 s "Musty Flick" short has nearly 6 M views; one mechanic, played whole ([trophi.ai](https://www.trophi.ai/post/5-rocket-league-content-creators-you-should-be-watching)) |
| 10 | **Império Valorant**: [youtube.com/@ImperioValorant](https://www.youtube.com/@ImperioValorant) | A Brazilian multi-streamer Valorant clips channel (it carries Sacy clips, among others). [ASSESS] Useful for seeing how pt-BR clippers caption Valorant situations. Subscriber count not found |

**Craft sources from creators**

These are the closest things I found to "how I cut shorts" from people who do it. No gaming streamer or their editor has published one that I could find.

- **Jenny Hoyos** (about 12 M subs) on Creator Science ([page](https://creatorscience.com/podcast/jenny-hoyos/), [video](https://www.youtube.com/watch?v=As7abwNhG7Y)) and on the YouTube Blog ([Jan 2025](https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/)). Her points:
  - "You have one second to hook someone."
  - Hook formula: shock → intrigue → satisfy.
  - About 34 s works best.
  - Cut the tail; trimming 1 s took a Short from 83 % to 88 % retention.
  - End right after the payoff.
  - Foreshadow in ≤ 3 s.
- **Paddy Galloway**'s Shorts study ([thread](https://threadreaderapp.com/thread/1646898356419981315.html)): see §1 and §3.
- **Roger Nygard** on comedy timing ([CineMontage](https://cinemontage.org/?p=58217)). He isn't a shorts editor, but most stream clips are comedy, and his rules on setups, pauses and frames apply directly.

---

## 9. Rules for the script (machine-checkable)

All values are **[SYNTH]** from §1–§6. Treat them as defaults to tune against the streamer's verdicts.

```yaml
length:      {target_s: [35, 45], max_s: 59}
moments:     {max: 2, second_requires_same_premise: true}
stretches:   {max: 4, min_len_s: 6.0, teaser_len_s: [0.5, 1.5]}
edges:                       # measured on the MIC-ONLY track, never from ASR times
  vad: silero
  vad_threshold: 0.5
  min_silence_ms: 250
  in_pad_ms: [150, 250]      # before speech onset
  out_pad_ms: [250, 400]     # after speech offset (Portuguese final -s, nasal vowels)
  require_nonspeech_ms_each_side: 100
  search_window_s: 1.5       # if no valid gap, move to the previous/next phrase end
  refuse_render_if_any_edge_in_speech: true
  audio_fade_ms: {hard_cut: [10, 20], stretch_join: 66}
lead_in_before_action_s: [1.0, 2.0]
tail_after_last_word_or_laugh_s: [0.3, 0.8]
hook:
  frame0: [reaction_peak, payoff]      # never setup, menu, logo
  text_words: [3, 5]
  text_on_s: [0, 3.5]
  designed_hits_max: 1
  audio_at_frame0: required
transitions:
  max_designed: 3
  only_at: [teaser_to_start, moment_to_moment]
  house: zoom_punch
  frames_30fps: {zoom_punch: [6, 10], whip: [7, 10], swipe: [6, 12], flash_peak: [2, 4], glitch: [4, 8]}
  same_style_and_direction: true
  never_over_speech: true
sfx:
  whoosh: {onset_before_cut_frames: [4, 10], peak_on_cut: true, max_len_s: 0.5}
  impact: {on: first_frame_of_landing, never_under_word: true}
  riser:  {len_s: [0.5, 1.5], ends_on_cut: true, max_per_short: 1}
  level_vs_voice_LU: {in_gap: [-6, -3], over_speech: [-12, -10]}
  duck_game_dB: [3, 6]
mix: {integrated_LUFS: -14, true_peak_dBTP: -1.0, music_under_voice_LU: [18, 24]}
effects:
  emphasis_max: 4              # zoom punch / shake / meme SFX, each on a real event
  min_gap_between_effects_s: 1.0
  zoom_punch_scale: [1.10, 1.15]
  zoom_in_frames: [4, 6]
  shake_frames: {light: [2, 3], heavy: [6, 8]}
  meme_sfx_max: 1
captions: {words_per_card: [1, 3], highlight: keywords_only, safe_box: [900, 1400], avoid_top_pct: 12, avoid_bottom_pct: 25}
ending: {end_card_s: 0, outro: false, cta_max_s: 2, fade_out_max_frames: 10, loop_to_frame0: preferred}
```

**Hard gates before showing anything.** These are cheap and measurable:

1. Every stretch edge sits in a mic non-speech gap: VAD probability < 0.35 and RMS below the speech floor for ≥ 100 ms on each side. If any edge fails, don't render.
2. No designed SFX overlaps a VAD speech segment by more than 2 frames.
3. Count designed transitions (≤ 3) and emphasis effects (≤ 4), and enforce ≥ 1 s between any two effects.
4. Duration is ≤ 59 s and the stretch count is ≤ 4.
5. Integrated loudness is −14 ± 1 LUFS.
6. Send a raw cut (edges + structure, no polish) for the streamer's review before adding effects.
