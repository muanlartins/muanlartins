# One multi-kill play, intense but not chaotic (addendum to pesquisa-cortes.md)

Researched 2026-11-18 for a vertical short of **one Valorant 4K** from a live: camera 1080×840 on top, the game's centre square 1080×1080 below, then the fixed 4.3 s outro. Read `pesquisa-cortes.md` first. This file only adds to it or corrects it.

**Tags.** The same as `pesquisa-cortes.md` ([DATA], [PLATFORM], [PRO], [VENDOR], [SYNTH]), plus two new ones:

- **[SAMPLE]**: public metadata I pulled on 2026-11-18 (titles, views, durations via `yt-dlp --skip-download`). Small n, titles only, nothing watched. It shows a direction, not proof.
- **[PRESS]**: a journalist's description.

Frame counts are at **60 fps** (what destaque.py renders). The camera itself is 30 fps, with 25–27 new frames a second.

**Where the sources stand.** No editor of a top Valorant clip channel has published a breakdown, and nobody has measured how much effect a gameplay short can carry. What's new here: platform docs (Meta's safe zones, YouTube's music rules, Instagram's Skip Rate, YouTube's related-video link), facts about the game's own audio and HUD, sound-design craft sources, and my metadata sample of Riot's multi-kill Shorts and some pt-BR streamer Shorts. Every "how much effect" number is still [PRO], [VENDOR] or [SYNTH].

---

## 0. Five findings that change the plan

1. **The game already edits the play.**
   - The kill sound rises with each kill in a round. Edge: "Every skull we pop plays a triumphant chord. With each successive kill, the note gets higher." [PRESS, Edge July 2020, [Magzter excerpt](https://www.magzter.com/stories/Puzzle-Gaming/Edge/VALORANT)] Skins swap in their own rising sounds ([Sportskeeda](https://www.sportskeeda.com/valorant/5-valorant-skins-best-kill-sounds)).
   - The top bar "reflects who is still alive in the round" ([ONE Esports HUD guide](https://www.oneesports.gg/valorant/valorant-beginners-guide-understanding-the-hud/)).
   - So the 4K already builds and counts itself. The edit's job is to keep that audible and visible, and not flatten it with equal hits on every kill. That means **no kill counter, no SFX on each kill, and one designed moment, on kill 4.**
2. **Riot's own 4K Shorts are short.** Seven "4K" Shorts on VALORANT Champions Tour run **11–26 s, median 17 s**. pt-BR pro and streamer 4K/ace Shorts run 12–37 s. [SAMPLE] A 4K stretched to 40 s is padding. Aim for **20–32 s plus the outro**. This is a refinement of S1's "35–45 s", which assumed talk around the play.
3. **The stakes outsell the count.** In the same channel and event, the seven "1vN clutch" titles had a median of **~24 K views**, against **~10 K** for the seven "4K" titles. [SAMPLE, n = 7 + 7] If the round had a situation, lead with it. If not, lead with *how* he got the kills: agent, weapon, ability or angle.
   - tarik's best Shorts aren't raw plays at all. "when your duo is goated" has 640 K views and "s0m is a bad guy" 413 K. [SAMPLE] A plain multi-kill is common. His reaction is what makes it different.
4. **Phones can't play sub-bass.** Phone speakers roll off below roughly 150–200 Hz, so a clean 40–60 Hz boom vanishes. It only adds loudness, which normalisation then takes away. The hit needs a saturated mid layer and a click to be heard at all. ([cursa sound-design course](https://cursa.app/en/page/sound-design-that-reads-on-small-speakers), [Waves](https://www.waves.com/tips-for-great-mixes-on-small-speakers)) [PRO]
5. **The bottom 35 % is covered on Instagram, and the kill banner sits there.**
   - Meta's own spec covers y > 1248 [PLATFORM].
   - The game tile's kill banner sits in the lower middle of the game picture, around y 1600–1750 in our frame. Check this on a real frame.
   - The seam (y ≈ 840) is the right place for text, but the game's top bar (timer, score, alive portraits) sits just below it.

---

## 1. The hook (0–2 s)

**Pattern A, the default: promise plus in medias res.**

- Frame 0 is **1.0–1.5 s before kill 1**, mid-motion, with game sound already playing.
- A 2–4 word text from frame 0 to about 2.5 s **promises the payoff**: the count plus how, or the situation.
- The viewer then counts along, and the rising kill sound and the top bar do the counting.
- One designed hit goes on frame 0, or on kill 1 if it falls within 1.5 s.
- Sources:
  - [VENDOR] DOR: "show the payoff first", with text like "Is a 1-on-4 clutch happening" ([DOR](https://clip.dor.gg/en/blog/gaming-shorts-viral-pattern)).
  - [VENDOR] autoclip: "cut in so the tension is already on screen within the first two seconds" and "sort by tension, not by kill count" ([autoclip](https://autoclip.dev/blog/how-to-clip-valorant-clips)).

**Pattern B: reaction teaser, at most 1 s, then a whip back to the start.**

- Use it only when his reaction after kill 4 (a scream, standing up) is the strongest image in the clip.
- **Never tease the 4th kill itself.** [SYNTH] It shows the payoff twice, and the count restarts at 1 for a viewer who has already seen 4.

**Hook text patterns** (titles double as hook text) [SAMPLE]:

- Riot: "Vanitas with the clean one taps for the 4K", "BerryX with the Neon Ult 4K", "Wens holds in the smoke for the 4K", "Berryx with the insane 1v3 for overtime".
- pt-BR streamers: "Só balinha no 4K!!", "4k SEM MIRA", "ACE QUE ROLOU NA LOBBY DOS PRO".

The formula is **count + one unusual fact**: an odd agent for frags (a healer with 4 kills), the weapon or the economy (a pistol on an eco), or the stakes (match point, 1v4). If it was a clutch, the situation goes first and "4K" is optional. Show the score or the economy only when it changes the meaning.

**After posting**, check Instagram's **Skip Rate** (the share of views that skip in the first 3 s; in Reels Insights since Aug 2025) next to YouTube's viewed-vs-swiped rate. ([Social Media Today](https://www.socialmediatoday.com/news/instagram-adds-retention-insights-reels/758464/)) [PLATFORM via PRESS]

---

## 2. Emphasis per kill: escalate, don't repeat

The vendors agree on "save the biggest moment for last" and on sound effects for "just the 2-3 moments you most want to emphasize" ([Eklipse montage guide](https://blog.eklipse.gg/beginner-guide-2/how-to-make-gaming-montage.html), [DOR workflow](https://clip.dor.gg/en/blog/game-highlight-editing-workflow)). [VENDOR]

**Default ladder** [SYNTH]:

- **Kills 1–3: nothing added.** The rising kill sound, the kill banner, the top bar and his voice carry them.
  - Fallback, only if the raw cut reads flat: a micro-punch on the **game tile only**, 103–105 %, in over 4 frames and out over 10, **with no sound**, identical on all three.
- **Kill 4: the one designed moment.**
  - A game-tile punch to **108–112 %**, anchored at the tile centre (the crosshair, where the enemy is dying): in over 4–6 frames, held 0.3–0.5 s, out over 12–18 frames. An impact on the kill frame (§3). Optional: a white flash on the game tile, 2 frames at ≤ 50 % opacity.
  - Never punch the camera tile at the same time; two tiles moving at once reads as chaos. The camera can get its own punch at the reaction peak (E2 in pesquisa-cortes), at least 1 s later.

**Slow motion: usually no.**

- DOR's advice [VENDOR] ([DOR slow-mo](https://clip.dor.gg/en/blog/add-slowmo-game-video)): slow only "the one to two seconds around the finishing blow"; 0.5× needs a 60 fps source, since 30 fps at 0.5× is about 15 fps, "which looks choppy"; greed "drags and gets boring".
- For us, the camera tile has only 25–27 real frames a second. At 0.5× it falls to about 13, which is exactly the "travado" look he noticed on 11-12. And speech can't be slowed down.
- **So:** slow motion only if his mic is silent through it, at 0.5×, for at most 0.8 s of output. Otherwise none; the punch does the job.

**No added kill counter (1/4, 2/4…).** Tools offer them (Eklipse's templates list "kill counts") [VENDOR], but the game shows the count twice already, and stamps were part of the cut he rejected on 11-11.

**No shake** (nothing physical hits), **no chromatic aberration, RGB split or glitch**, **no freeze**.

---

## 3. Sound design for intensity

- **The game's own sound comes first.** The rising kill sounds and his voice are the effects.
  - [SYNTH] If the game sound is a separate track (Jogo.mp4), **lift it +2 to +4 dB for about 0.3 s around each kill** instead of adding library hits. This follows from finding 1 and from the fcyacr model he picked, which has no SFX.
- **An impact on kill 4 that reads on a phone**, in three layers:
  1. A clean sub, 40–80 Hz, with a short fade-in, its tail ending before the next event.
  2. A copy of the hit **high-passed at 120–200 Hz and saturated**, which carries the hit on phones.
  3. A **1–3 kHz click on the exact frame**.

  Make cues 50–300 ms, with tails under 300–500 ms. ([cursa](https://cursa.app/en/page/sound-design-that-reads-on-small-speakers); [Violet Recording](https://violetrecording.com/sound-design-for-trailers/): "Reserve the deepest sub for your key impacts") [PRO]
- **Quiet before the hit.**
  - [PRO] "Dropping everything out for a beat makes the next impact feel enormous by contrast" ([Violet Recording](https://violetrecording.com/sound-design-for-trailers/)). "Lack of sound can be as gripping as an explosion" ([Krotos](https://krotos.studio/blog/trailer-sound-design-tips-tricks)).
  - [SYNTH] Any music bed **stops dead 0.15–0.3 s before kill 4**. His voice and the game never drop out.
  - A riser, if used, **ends on the kill frame** ("Time your risers so their peak lands exactly on the impact", Violet). Use one only if kills 3 and 4 are at least 1.5 s apart and he isn't talking over the gap.
- **Masking.** Intelligibility lives in **1–4 kHz**. Cutting music "5-10 dB in this frequency range will improve intelligibility" ([DPA Mic University](https://dpamicrophones.com/mic-university/facts-about-speech-intelligibility)). [PRO]
  - [SYNTH] The sub layer barely masks speech, so it can reach about voice level for 100–300 ms.
  - The mid and click layers and risers are broadband: keep them 10+ LU under the voice wherever they overlap speech (as in T5).
- **Loudness.** Since 2023, Meta's Reels and Stories use xHE-AAC with loudness normalisation "to the same target level", and no number is published ([Social Media Today](https://www.socialmediatoday.com/news/meta-updates-audio-encoding-for-reels-and-stories-to-provide-more-volume-co/647414)) [PRESS]. Vendors claim −14 or −16 LUFS for Reels; none of them is official. YouTube's −14 LUFS reference is in pesquisa-cortes.
  - **One master for both: −14 LUFS integrated, −1 dBTP.** Mastering louder buys nothing on either platform. The intensity comes from contrast, so don't over-limit: the kill-4 hit should stand above the clip's average.

---

## 4. Pacing a single round

- **Length.** [SAMPLE] Riot's 4K Shorts run 11–26 s, mwzera's 4K/ace Shorts 12–30 s, Tixinha's 30–37 s, tarik's personality Shorts 23–56 s. **So: 20–32 s of play and reaction, then the 4.3 s outro.**
- **Before kill 1:** 1.0–1.5 s when the hook text carries the context. Up to 3 s when the context is on screen (spike timer, portraits showing 1v4) and the text points at it.
  - DOR: "a viewer should understand the scene within 3 seconds". [VENDOR]
- **Dead time between kills.** A jump cut on a mic pause stays the default (S5).
  - New for FPS footage: a jump cut makes the crosshair teleport. Put it **right after a kill confirm or during a fast flick or turn**, where the motion hides it. ([Vimeo on jump cuts](https://vimeo.com/blog/post/understanding-jump-cuts)) [SYNTH]
  - **At most 2 internal cuts** in a 4K.
  - Speed-ups of 1.5–2× are a montage device: they pitch-shift his voice and the game. Use them only on a span with no speech, and never by default.
  - **Never cut a gap of under 3 s between kills 3 and 4.** The wait is the tension, and it's where a riser can go.
- **End.** Hold until his reaction decays, plus 0.3–0.8 s (I7, L1), then go into the outro. If he names the play ("quatro!"), end after he says it.

---

## 5. Captions, text and safe zones (1080×1920)

**The safe zones.**

- **Instagram (official, from Meta's Reels ads spec):** "leave at least 14% of the top, 35% of the bottom and 6% of each side" free. That's y < 269, y > 1248 and x < 65 or x > 1015. ([Meta Ads Guide](https://www.facebook.com/business/ads-guide/update/video/instagram-reels)) [PLATFORM]
- **YouTube Shorts:** there is no official spec for organic Shorts. Trackers measure the top at 154–288 px, the bottom at 461–672, the right rail at 173–192 and the left at 48–65. ([Socialync](https://www.socialync.io/tools/safe-zones/youtube-shorts), [aiCarousels](https://www.aicarousels.com/free-tools/youtube-safe-zone-checker)) [VENDOR, measured]
- **A box that is safe on both: x 65–888, y 288–1248.** The seam (y ≈ 760–900) is inside it. Centre the text at x ≈ 476, or cap its width at about 750 px, so it never reaches the YouTube rail.

**Where our layout clashes with the game's HUD.**

- **The game's top bar is the native kill counter.** It holds the timer, the score and the alive portraits ([ONE Esports](https://www.oneesports.gg/valorant/valorant-beginners-guide-understanding-the-hud/)). It sits in roughly the tile's first 80 px, y ≈ 840–920; that pixel span is [SYNTH], so check it on a frame.
  - During the kills, keep the hook text and the captions **above it**: baseline at y ≤ 835, on the camera's bottom edge. Don't put them centred on the seam.
- **The kill banner** (lower middle, above health and abilities) lands around y 1600–1750, **under Instagram's caption and handle**.
  - Keep the IG caption to one short line and the Shorts title short.
  - Accept the overlap; don't change the approved layout.
- **No fake kill feed.** The real one is outside the square, and the top bar does its job.

**His speech gets captions** (E4), with two changes for the kills:

- During the kills, show **plain words: no pop, no glow**. Every popped word is one more effect, and four kills plus popping words plus a punch is the chaos he rejected. Keep the pop for the reaction.
- If he's silent through the kills (the ace held up because he was), show no captions there at all.

**The Instagram grid** has shown 3:4 tiles since Jan 2025. Keep the cover's text inside the centre **1080×1440 (y 240–1680)**. ([Hopper](https://www.hopperhq.com/blog/instagram-reel-size/)) [VENDOR consensus]

---

## 6. Ending with the outro

There is no data for or against outros on Shorts and Reels.

- [VENDOR/PRO] The practitioner view: an ending signal (a goodbye, an end card, a fade) tells the viewer it's over, and they swipe ([Subscribr](https://subscribr.ai/youtube-strategy/youtube-shorts-low-watch-time-boost)).
- Nothing new contradicts L2/L3: the outro costs retention and breaks the loop. Luan chose to keep it, so the job is to make it cost less. [SYNTH unless marked]

1. **Go in on the reaction's decay** with the house transition (whip + whoosh), never a fade to black. J-cut the outro's first sound 4–8 frames early.
2. **Close the loop.** Trim any fade or silence at the end of `outro-editado.mp4`, so the replay restarts at once into frame 0's hit; its last sound should not decay into silence. Frame 0 must have sound (H4).
3. **Put the call to action where it costs nothing.** On YouTube, a Short can link a **related video** (shown "below your channel handle"): the match video or the live ([YouTube Help](https://support.google.com/youtube/answer/14075157)) [PLATFORM]. On Instagram, "acessa meu site" can also go in the caption.
4. **Watch the logos in the Instagram version.** Mosseri: "not recommend Reels with logos from other apps, but if it's your own logo, don't worry" ([Social Media Today](https://www.socialmediatoday.com/news/instagram-clarifies-including-your-own-logo-on-a-reel-is-ok/730852)). [PLATFORM via PRESS]
   - If the outro shows a Twitch or YouTube logo, that may count against it on Instagram. Check the outro.
5. **Measure it.** On YouTube, compare the retention graph at the start and end of the outro. Instagram's **Trial Reels** (public accounts with ≥ 1,000 followers) can show the with-outro and without-outro versions to non-followers first ([PetaPixel](https://petapixel.com/2024/12/13/instagram-launches-trial-reels-so-you-can-test-content-with-non-followers)). [PRESS]

---

## 7. Music

- **YouTube.** "The royalty-free music [from the YouTube Audio Library] won't receive a Content ID claim." Shorts over 1 min with an active claim are blocked. ([YouTube Help](https://support.google.com/youtube/answer/13486873?hl=en)) [PLATFORM] Our Short is under 60 s, so a claim only redirects the money.
- **Instagram.** Meta's ads spec recommends "original audio or royalty-free tracks from the Meta Sound Collection" and avoiding licensed music [PLATFORM, ads]. Business accounts reportedly get only the commercial library; creator accounts get the full one [VENDOR consensus]. Licensed audio uploaded as "original audio" may be relabelled to the artist ([Instagram](https://help.instagram.com/1525585517644948)) [PLATFORM].
- **Does music baked into the file hurt Reels reach?** There is no official statement that it does. Mosseri, at second hand, said popular audio carries no penalty ([Kontentino](https://www.kontentino.com/q-and-a/trending-audio-instagram-reach/)) [PRESS]. The "trending audio boosts reach" figures have no traceable method. What is official on Instagram is originality, no other apps' watermarks, and sends.
- **Recommendation: no music by default.** The fcyacr model has none, and his voice plus the game carry the play. If he wants a bed: take it from the YouTube Audio Library and bake it into the file; run it from frame 0 to just before kill 4, ≤ 10 s, 18–24 LU under the voice, cut 5–10 dB at 1–4 kHz; it **stops dead 0.15–0.3 s before kill 4.**

---

## 8. Defaults (to tune against his verdicts)

```yaml
length:  {content_s: [20, 32], outro_s: 4.3, total_max_s: 37}   # 4K Shorts on VCT: 11-26 s
lead_in_before_kill1_s: [1.0, 1.5]          # up to 3.0 if the context is visible and the text points at it
internal_cuts_max: 2                        # after a kill confirm or on a fast flick; never inside a K3-K4 gap < 3 s
tail_after_reaction_s: [0.3, 0.8]
hook:
  pattern: promise_in_medias_res            # alt: reaction_teaser <= 1.0 s; never tease kill 4
  text_words: [2, 4]                        # count + one unusual fact, or the situation first
  text_on_s: [0, 2.5]
  designed_hits: 1                          # frame 0 (or kill 1 if within 1.5 s)
kills_1_to_3: {added_fx: none, optional_micro_punch: {scale: [1.03, 1.05], in_f60: 4, out_f60: 10, sfx: none}}
kill_4:
  game_punch: {scale: [1.08, 1.12], anchor: game_tile_centre, in_f60: [4, 6], hold_s: [0.3, 0.5], out_f60: [12, 18]}
  flash: {optional: true, frames_f60: 2, opacity_max: 0.5, tile: game}
  slow_mo: {default: none, speed: 0.5, max_output_s: 0.8, require_mic_silent: true}
  camera_punch_min_gap_s: 1.0
never: [kill_counter, stamps, freeze, shake_on_kills, chromatic, rgb_split, glitch, fake_killfeed]
sound:
  game_lift_per_kill: {dB: [2, 4], len_s: 0.3}            # only with a separate game track
  impact_k4: {sub_hz: [40, 80], mid_highpass_hz: [120, 200], mid_saturated: true, click_khz: [1, 3], len_s: [0.05, 0.3], tail_max_s: 0.5}
  riser: {len_s: [0.8, 1.5], ends_on: kill_4_frame, only_if: {k3_k4_gap_s_min: 1.5, no_speech: true}}
  bed_dropout_before_k4_s: [0.15, 0.3]
  over_speech_LU_below_voice: 10            # mid/click/riser layers; the sub may reach about voice level for <= 0.3 s
  music: {default: none, source: youtube_audio_library, max_s: 10, LU_under_voice: [18, 24], eq_cut_1_4kHz_dB: [5, 10]}
  master: {integrated_LUFS: -14, true_peak_dBTP: -1.0}
text_safe_box: {x: [65, 888], y: [288, 1248]}             # Meta 14/35/6 % + YouTube's right rail
keep_clear: {game_top_bar_y: [840, 920], kill_banner_y: [1600, 1750]}   # check both on a real frame
captions: {during_kills: plain_no_pop, baseline_max_y: 835, width_max_px: 750, pop_only_on: reaction}
cover_grid_safe: {x: [0, 1080], y: [240, 1680]}
outro: {enter: house_whip_with_whoosh, j_cut_frames_f60: [8, 16], no_fade_to_black: true, trim_tail_silence: true}
designed_events_max: 4                      # frame-0 hit, [teaser whip], kill-4 cluster, outro whip
```

---

## 9. Reference clips worth measuring with `/steal`

None of these has been watched. They were picked by format and checked with yt-dlp metadata.

| Clip | Length / views | Why measure it |
|---|---|---|
| VCT: ["Vanitas with the clean one taps for the 4K"](https://www.youtube.com/shorts/AxUMyw1O-aI) | 11 s / 32 K | The floor: a 4K with nothing extra. Measure the lead-in, any added SFX or text, and the loop |
| VCT: ["Berryx with the insane 1v3 for overtime"](https://www.youtube.com/shorts/44Z0D3BVMsA) | 32 s / 38 K | The best of the sample. How the stakes are shown in the first 2 s, and how the caster audio carries the intensity |
| VCT: ["BerryX with the Neon Ult 4K"](https://www.youtube.com/shorts/oSNYJ3-JNZg) | 17 s / 16 K | The "how" framing (an ability). Count the cuts between kills |
| mwzera: ["Só balinha no 4K!!"](https://www.youtube.com/shorts/WPjPg3439C4) | 20 s / 2 K | A pt-BR pro-streamer 4K from his own stream: layout, text, any SFX |
| Tixinha: ["4k SEM MIRA 🔥🔥"](https://www.youtube.com/shorts/QSenso163LI) | 30 s / 3 K | A pt-BR streamer 4K at about our length. Does the reaction fill the extra time? |

Also worth sampling: [VALORANT Champions Tour Shorts](https://www.youtube.com/@VALORANTEsports/shorts) (the title formula), [tarik/shorts](https://www.youtube.com/@tarik/shorts) (personality beats plays), and mwzera's ["ACE QUE ROLOU NA LOBBY DOS PRO"](https://www.youtube.com/shorts/b77jaygZSSI) (30 s, 12 K).

---

## 10. Do / don't, tied to his verdicts

**Do**

- Play the round whole and in sync, in the one approved layout. At most 2 internal cuts, each right after a kill or on a flick.
- Put the strong effect at the start: one hit on frame 0 plus a 2–4 word promise ("4K…" with the unusual fact). He asked for this ("DEVE!").
- Let kills 1–3 run on the game's own sound, the kill banner, the top bar and his voice. Lift the game sound slightly on each kill.
- Make kill 4 the single designed moment: a 108–112 % punch on the game tile, a three-layer impact that reads on a phone, the bed dropping out just before it.
- Keep the text above the game's top bar and inside x 65–888, y 288–1248. Keep captions plain during the kills and pop them only on the reaction.
- End on his reaction, then go into the outro with the house whip, with no fade or silent tail. Link the match video with YouTube's related-video field.
- Ship it at its natural length (about 25–35 s total). Check Skip Rate and viewed-vs-swiped after posting.

**Don't** (each one echoes the 11-11 rejection, "edição caótica, efeitos visuais cafonas", or a measured problem)

- No kill counters or stamps (1/4, 2/4, "ACE!"), title cards or freezes.
- No SFX on every kill, and no stacked whoosh + hit + riser on one beat.
- No shake, chromatic aberration, RGB split or glitch on gameplay.
- No slow motion over his speech, and none longer than 0.8 s. Our 30 fps camera turns choppy ("travado").
- No speed-ups that pitch his voice, and no velocity/beat-synced montage editing.
- Never tease kill 4 before the play.
- No padding to 40 s, and no music bed by default.
- No pure-sub booms, which are inaudible on phones and only lower the mix after normalisation.
- No other platforms' logos in the Instagram version.
