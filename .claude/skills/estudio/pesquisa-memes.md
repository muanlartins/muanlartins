# Memes in the shorts: where to look, what fits each moment, how to make them ours

Researched 2026-11-20/21 for Luan's ask (11-20): "Vamos optar por usar memes atuais. Você consegue achar alguma fonte pra
você se atualizar de memes e imagens atuais que rolam pelos Reels / Tiktok? As figurinhas que são comumente usadas…
parece que existe uma figurinha pra tudo nessa vida." Read SKILL.md's "Destaque da live" first. This file adds the meme
layer on top of it: which meme goes on which beat, built in-house through destaque.py's `figurinhas`, `sons`,
`impactos`, `rotulos` and `extra`.

**Tags.** **[NOW]**: seen in a source dated November 2026 (linked). **[2026]**: documented earlier in 2026 (linked); it
may be fading. **[EVG]**: evergreen, from my memory (before 2026), not re-checked as trending but widely recognised.
**[BR]**: Brazilian.

**What the search could and couldn't show.** Trend roundups are US- and brand-centric SEO pages. No source tracks
Rocket League or Valorant meme trends, and none ranks pt-BR memes; the best live pt-BR signal is Myinstants' "Bombando
em Brasil" list (§1). So **evergreen formats are the base, and a current one is seasoning, checked on the day of the
edit.**

**Five rules.**
1. One meme per beat, and at most about three per short.
2. A meme must be readable in about 0.5 s. One that nobody recognises is a random picture.
3. First use what is already in the footage: the game's own memes (Rocket League quick chats, Valorant's banners), the
   live's own (the Terapia scene, his catchphrases) and **his real cat**.
4. Recreate, never paste: draw it in code, grade his real camera frame, synthesise the sound (§3).
5. **Never bake a song into the master.** If a trending audio *is* the joke, add it inside each app at upload (§3).

---

## 1. Sources to stay current

| Source | Where | What to look at (≤1 min) | Caveat |
|---|---|---|---|
| Know Your Meme | [newsfeed/trending](https://knowyourmeme.com/newsfeed/trending), [meme-review](https://knowyourmeme.com/editorials/meme-review) (the Weekly Meme Roundup, every Friday: 11-06, 11-13 and 11-20 read), `/memes/new`, `/photos/templates` | This week's roundup. On any candidate, check the entry's dates and its "Spread" | US-centric, with a lot of politics and celebrity news |
| meme.com | e.g. [i-got-so-mad](https://meme.com/memes/i-got-so-mad-trend-meme) | Short explainers that give the first post's date | An aggregator: confirm on KYM |
| Myinstants BR | [myinstants.com/pt/index/br/](https://www.myinstants.com/pt/index/br/) ("Bombando em Brasil"), `/pt/recent/` | **The meme sounds Brazilians push this week**. The 11-20 top: FAAAH, Jogo do botão, "AIIII estourado", POU estourado, Arrogante Neymar, AI CHAVES estourado, O Mente Lisa, "você não tem aura", "E o pix? Nada ainda?", ILARI ILARIÊ troll, Mentalista, Maldito Traidor, Pegue o gato, Dexter meme | Every file is ripped. **Look, never download** |
| TikTok Creative Center (now headed "TikTok One"; needs a login) | [hashtags](https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en), `…/popular/music/pc/en` | Hashtags over 7 days. "See Analytics" shows the trendline and regional popularity ([help](https://ads.tiktok.com/help/article/how-to-use-trends)). Region Brazil (from memory) | The song list has "only professionally generated sounds", so meme sounds aren't there |
| The TikTok and Instagram apps | Search the situation in pt-BR ("quando o time te carrega", "caí de elo", "gato meme"), filter to this week, open the sound's page ("N vídeos") | The format as people use it today | Instagram's Professional dashboard has "Trending audio" ([Buffer](https://buffer.com/resources/trending-audio-instagram/)), maybe US-only. An up-arrow marks trending audio in the Reels picker (from memory) |
| Monthly roundups | [SocialPilot](https://www.socialpilot.co/blog/tiktok-trends), [Epidemic Sound](https://www.epidemicsound.com/blog/latest-tiktok-trends/), [NapoleonCat](https://napoleoncat.com/blog/trending-memes/), [Virlo](https://virlo.ai/trends/2026-11) (a ~26k-video scan, each trend staged rising/peaking/fading) | One skim a week | Brand and lifestyle trends: few fit gameplay |
| YouTube | The Shorts feed's Trends page (reported in search results, not seen on [the updates page](https://support.google.com/youtube/answer/9072033)). Studio → Analytics → Trends ([help](https://support.google.com/youtube/answer/11962757)). The Inspiration tab is being deprecated from August 2026 ([help](https://support.google.com/youtube/answer/15575509?hl=en)) | Trending Shorts audio, gaps in his niche | Interest is relative, not volume |
| CapCut | [capcut.com/explore/2026trend](https://www.capcut.com/explore/2026trend), the app's Templates → trending (they follow TikTok's For You, per [CapCut](https://www.capcut.com/help/templates-for-tiktok)) | The **edit grammar** in fashion: zooms, freezes, beat cuts | Never the template's song or footage |
| Brazilian archive | [Museu de Memes](https://museudememes.com.br/acervo) (UFF): an article per meme | A BR meme's origin and meaning before using it | Not a trend feed: the newest tiles are 2024-25 uploads |
| Stickers | Sticker.ly (the usual BR WhatsApp sticker app), GIPHY and Tenor "trending", WhatsApp's sticker search | **Which faces and poses** are going around | Look only: other people's pictures |

**The 5-minute routine, before each short's meme pass:**
1. **KYM.** Read this week's roundup and the trending feed. Note one or two formats that could sit on a gameplay beat.
2. **Myinstants BR.** A sound in the top 15 is one his audience knows today.
3. **TikTok/Reels.** Search the short's situation in pt-BR, filtered to this week: does the format exist, how is it timed?
4. **Vet each candidate.** Find its date on KYM, meme.com or Museu de Memes. Older than about two months and not on this
   file's evergreen list: drop it. Check who owns its sound and picture (§3).
5. **Choose.** One meme per beat, noted in the roteiro as "meme: name (source, date checked)". If the format is new to
   Luan, send him a still before building.

---

## 2. Catalogue by situation

**Default timing.** The meme lands **on the frame of the action** (the goal, the rank screen, his face reacting), with
its sound on the same frame, 12-18 dB under his voice. A sticker pops in over 2-3 frames with a little overshoot, holds
1-2 s and leaves over 4-6 frames. Text is at most 4 words. "In-house" means built by us (§3).

**A. Promotion / win**
- **Deal-with-it glasses** [EVG], the shorthand for smug victory since 2010. 8-bit black glasses, drawn in code, slide
  down onto his eyes over ~0.6 s, stop on the beat (rank screen or goal) and hold 1.5 s. Sound: a riser, one frame of
  silence, a hit and the `buzina`. **Not the "Turn Down for What" drop.** 2016/MLG nostalgia was a BR trend early in
  2026 ([Diário de Goiás](https://diariodegoias.com.br/2026-e-o-novo-2016-nostalgia-viralizou/518747/)), so the
  visuals still read.
- **MISSION PASSED / respect +** [EVG, timely: GTA VI's date was 11-19, and SocialPilot calls it this week's moment; I
  couldn't confirm it shipped]. 0.5× slow motion on the rank-up screen, a warm grade, gold "MISSION PASSED" with a small
  "respect +", ~2 s. Sound: our own 3-note brass-like sting, never Rockstar's.
- **Gigachad, "average X enjoyer"** [EVG 2021-], calm superiority. His own frame in black and white, crushed blacks, a
  hard side vignette, a slow push 1.0→1.06; caption "Champion enjoyer". Sound: a low pad and one boom with a mid layer.
  Not "Can You Feel My Heart", the song of these edits ([KYM](https://knowyourmeme.com/memes/gigachad)).
- **Rojão + buzina** [BR EVG]: stadium fireworks and an air horn on the goal, which Brazilians hear as "golaço".
  Synthesised: a crackle, a whistle rising, a bang.
- **"Pai tá on" / "Brabo"** [BR EVG]: text only, on his own celebration.

**B. Demotion / loss**
- **"Dun dun dun dun"** [EVG]: Chopin's funeral march (public domain), our own rendition, on the demotion screen as the
  picture fades to grey over 1 s. Everyone hears "acabou".
- **Sad trombone (wah-wah-waaah)** [EVG]: synthesised, under the falling emblem. It overlaps the existing `apito` (11-20's
  "a gente caiu"), so use one.
- **Crying cat thumbs up** [EVG] ("tá tudo bem"): beside his face as the rank drops, ~1.5 s. Build it from **a photo of
  his own cat**, with tears and a thumb drawn on. The famous photo is someone else's.
- **"Aceita que dói menos" / "Que fase"** [BR EVG]: text on his reaction.
- **Champion shattering into Diamond** (Luan's idea, 11-20): an effect that tells the moment, from the game's own
  emblem. It beats any sticker here.

**C. Fail / own goal**
- **WASTED** [EVG, timely with GTA VI]. Slow motion into a freeze on the miss, a grey-red tint, a big red serif "WASTED"
  fading in over 0.4 s, held 1.5 s. Sound: a low thud and a reverse swell, ours.
- **"Fahh!"** [2025; the #1 on Myinstants BR on 11-20]. The streamer Taileons' yell, viral August-September 2025 over
  Tekken and football fails ([KYM](https://knowyourmeme.com/memes/fahh)). If **Luan yells something like it** in the
  live, punch in on that. Never paste Taileons'.
- **Vine-boom punch-in** [EVG]: a one-frame `soco` to ~1.3 on his face as he realises, with our `boom`/`impact-boom`.
  The original sound's owner is unclear.
- **Circus / "palhaçada"** [EVG]: "Entrance of the Gladiators" (Fučík, 1897, public domain) in our own rendition, 2-3 s
  under the replay of a silly play, plus a clown honk. "Palhaçadas" is Luan's own word for his highlights.
- **"ERROU!"** [BR EVG] (Faustão): a game-show red bar and our wrong-answer buzzer (two square-wave tones). The original
  audio is Globo's.
- **"-1000 aura"** [2026]: a counter ticking down beside him. Aura is alive in BR: "você não tem aura" is on Myinstants'
  top list, and "pure aura" edits are 2026 ([KYM](https://knowyourmeme.com/memes/pure-aura-girl)).

**D. Clutch / lucky goal**
- **"Calculated."** [EVG, Rocket League]: the game's own quick chat, drawn as a chat chip (no logo) after a lucky
  bounce, with our `ding`. Every RL player reads the irony.
- **Freeze, rewind, 0.5×** [EVG]: freeze 0.3 s on the bounce, then `rebobinar`, the replay at 0.5×, and back to real
  speed for the goal. Once per short.
- **"Não consigo provar, mas…"** [2025, still on Myinstants BR as "Dexter meme"]: Doakes's suspicious stare
  ([NapoleonCat](https://napoleoncat.com/blog/trending-memes/)). A slow push on **his** face looking sideways, with the
  text and our own eerie piano note, never the Dexter theme.
- **Drooling cat** [2026]: slack-jawed awe, February to June 2026
  ([KYM](https://knowyourmeme.com/memes/drooling-cat-crowd-of-drooling-cats)). For a teammate's absurd play: his cat
  staring, with drool drawn on.

**E. Rage**
- **"$#@%!"** [EVG, Rocket League]: the game's censored quick chat as a chip over his outburst. An optional 1 kHz bleep,
  as the joke, never to clean him up.
- **"Fiquei tão bravo que…"** [NOW]: the "I got so mad I…" format began 10-31, with a compilation at ~989k likes by
  11-08 ([meme.com](https://meme.com/memes/i-got-so-mad-trend-meme), [SocialPilot](https://www.socialpilot.co/blog/tiktok-trends)).
  One original line is "I got so mad I paused an online game". As a text card after his rage, e.g. "fiquei tão bravo
  que dei alt+tab".
- **Terapia** (his own scene): the house meme for rage. Cut to it, or copy its breathing circle.
- **"Calma, calabreso"** [BR 2023-24]: Toninho Tornado's line, made famous by BBB 24
  ([KYM](https://knowyourmeme.com/memes/calabreso-calma-calabreso)). Text with a short `freio`.
- **"Cadeirada"** [BR 2024, [Museu](https://museudememes.com.br/collection/cadeiradadodatena)]: a drawn chair swinging
  in, with `whoosh` + `bonk`. It comes from a political debate, so **ask Luan first**.

**F. Teammate carrying (JK, Edu, Exponja…)**
- **"Average fan vs average enjoyer"** [EVG 2021]: a split, Luan greyed and sad against the teammate's play in the chad
  grade, captioned "eu" and "o JK".
- **"Ride of the Valkyries"** [EVG]: Wagner (public domain), our own rendition, 2-3 s under the teammate's run.
- **"O pai" / "Ele é diferenciado" / "W JK"** [BR EVG]: one text chip, the teammate's name big.
- **Bicep heart** [NOW, KYM 11-06/11-13]: a gesture *he* would make on camera for a teammate. It can't be added in post,
  so offer it to Luan as a live bit.

**G. His cat appears**
- **His real cat, untouched, is the meme.** No stock cat beats "Não, filha, agora não": the gata short's cuts were
  "excelentes".
- **Camera-shy / tsundere pet** [NOW]: shy or grumpy, then giving in; "Rising" for November 17-25
  ([SocialPilot](https://www.socialpilot.co/blog/tiktok-trends)). It fits when she refuses the camera, then takes the
  desk.
- **Cat eating then looking up** [EVG 2023] (caught in the act, [meme.com](https://meme.com/memes/cat-eating-then-looking-up)):
  she stares into the lens → a punch-in to 1.3 on her face, hold, `boom`.
- **Wizard cat at the computer** [2026]: October 2026 on Virlo, now archived. She's on the keyboard → a wizard hat drawn
  on her and "a gata assumiu", ~2 s.
- **Sounds:** her own meow from his mic first, then a CC0 meow. `coro` exists for her held up like a trophy.
- An eye-rolling cat was reported viral on 11-19 (Heraldo de México); I couldn't open the article. **Avoid "Pegue o
  gato"**, though it's on Myinstants' list: it is tied to an animal-cruelty report in Bahia.

**H. Smug / "acordei diferente"**
- **Laser eyes** [EVG]: built (`laser`, the hat-trick short, "tá bem boa").
- **"+1000 aura" / a crown** [2026]: a counter ticking up or a drawn crown, with a shimmer + `coro`.
- **Deal-with-it or Gigachad** (A): one per short.
- **"Arrogante" / "Tô diferenciado"** [BR]: "Arrogante Neymar" is on Myinstants BR. The clip is Neymar's; the text is
  ours.

**I. Shock / "choque de realidade"**
- **Electrocution** (11-20, "excelente"): `choque` flicker + `zap` + `tremor` on **his real frame**. An X-ray skeleton,
  if any, drawn generic in code.
- **Nazaré confusa** [BR EVG] (the "math lady"): floating white equations drawn over *his* puzzled face for 2 s. The
  equations are the meme; Globo's frame isn't needed.
- **Saxophone gets louder** [2026, May] ([NapoleonCat](https://napoleoncat.com/blog/trending-memes/)): the realisation,
  then a zoom or freeze while our own sax-like blare climbs (not the original riff).
- **"Rapaz…" / "Mano do céu"** [BR EVG]: text on a 1-frame freeze.

**J. Irony: "alegria de pobre dura pouco"**
- **Ba-dum-tss** [EVG]: `badumtss.wav` is ours (`brand/twitch/sons/`). Luan dropped it from the stream's buttons, so
  wait for his verdict on the 11-20 rollercoaster.
- **"Dirigido por Luan Martins"** [EVG] (the Curb ending): freeze, a little desaturation, white credits, our own jaunty
  pizzicato/tuba tune. **Not "Frolic"**, nor its melody.
- **"Continua…" arrow** [EVG] (JoJo): freeze, sepia, a drawn arrow, our own bass riff. Never "Roundabout".
- **"Why would I deceive you?"** [NOW] ([Epidemic Sound](https://www.epidemicsound.com/blog/latest-tiktok-trends/), 11-13),
  an ironic "too good to be true". English and US-centric, so low priority, and only as pt-BR text ("por que eu
  mentiria pra vocês?") on the promotion just before the fall.
- **Skip "Remember November 2026"** [NOW] (the polar bear): dated, dead on 12-01.

---

## 3. Copyright, and making each meme ours

**Platform facts (checked):**
- **Shorts over a minute:** "Shorts longer than one minute that have an active Content ID claim, regardless of the
  policy, will be blocked on YouTube" ([help](https://support.google.com/youtube/answer/15424877?hl=en)). Up to a
  minute, a claim still sends the money to the owner, or mutes or blocks the Short. A claim isn't a strike.
- **The Shorts tools' library:** most songs for up to 90 s, with a special claim the creator can't see or dispute
  ([help](https://support.google.com/youtube/answer/13053317)). **The YouTube Audio Library** "won't receive a Content
  ID claim"; use outside YouTube isn't confirmed, so read each item's licence.
- **TikTok** business accounts get only the Commercial Music Library ([TikTok](https://ads.tiktok.com/help/article?aid=10005905)).
  **Instagram**'s music is for personal, non-commercial use, and some business accounts lose it
  ([help](https://help.instagram.com/ipad-app/402084904469945)).
- So: **keep personal or creator accounts**, and if a trending sound is the joke, add it in each app over a master with
  no song.

**Content ID traps (never in the master).** "[memory]" marks what I didn't re-check.
- "Turn Down for What" (DJ Snake & Lil Jon) [memory]. The sigma/phonk edits ("Metamorphosis" by INTERWORLD, "Murder In
  My Mind" by Kordhell, the BR "montagem" funk-phonk): label-distributed and registered [memory].
- Gigachad's "Can You Feel My Heart" (Bring Me The Horizon). "Oh No": The Shangri-Las' 1964 sample, via Capone and
  Kreepa ([Snopes](https://www.snopes.com/fact-check/tiktok-oh-no-song/)).
- Thug Life's "The Next Episode", Curb's "Frolic", "To Be Continued"'s "Roundabout", the coffin dance's "Astronomia"
  [memory].
- [NOW] songs: "All I Want for Christmas Is You" (the "It's TIME!" trend; a trap for December's Natal goal) and
  FINNEAS's "My Moon My Man".
- **BR TV audio:** Globo (Tema da Vitória, Plantão, Galvão, Faustão), SBT (Silvio Santos, Ratinho), Chaves. Assume the
  broadcaster's match.
- **Meme buttons** (vine boom, bruh, "emotional damage", metal pipe, the Windows error, Fahh): whoever uploads them to
  Myinstants, Pixabay or Freesound rarely owns them. Pixabay: "It is your responsibility to check whether you require
  the consent of a third party" ([licence](https://pixabay.com/service/license-summary/)).

**Pictures are someone's work too.** Gigachad is Krista Sudmalis's photo series (KYM). Ryder Ripps sold the
deal-with-it GIF's "full rights to this image and meme and the Photoshop template"
([Daily Dot](https://dailydot.com/meme-history-deal-with-it)). Chill guy's artist asserts copyright (NapoleonCat). Cat
photos belong to their owners. A KYM screenshot is not a licence.

**Building it in-house:**
- **Drawn in code** (the short's own `scripts/efeitos/<short>.py` via `"extra"`, or an alpha PNG for `figurinhas`):
  glasses, a crown, a wizard hat, drool, tears, beams, equations, a chair, a generic skeleton, chat chips
  ("Calculated.", "$#@%!"), the WASTED and MISSION PASSED cards, the aura counter, the credit, the sepia arrow.
- **His own frame** (Câmera.mkv; he allowed his image): grades, freezes, `soco` punch-ins, `choque`. The image model
  (`gemini-3.1-flash-image`) only with **his frame as the input, photoreal, same face**, for what code can't do, and a
  still to Luan first.
- **His cat:** ask Luan for stills or clips of her (staring, on the keyboard, held up). Make every cat sticker from them.
- **Synthesised sounds.** Have: `destaque.py`'s bloop, zap, apito, bonk, coro, laser; `edicao.sfx`'s whoosh, boom, hit,
  pop, click, ding, riser, rebobinar, freio; `brand/twitch/sons/`'s badumtss, boing, buzina, suspense, tambor. To add:
  sad trombone, wrong-answer buzzer, bleep, rojão, metal clang, record scratch, sax blare.
- **Public-domain melodies played by us** (we own that recording; never download one): Chopin, Fučík, Wagner, Grieg's
  Mountain King. A false claim on one can be disputed.
- **A phonk or funk feel:** an original cowbell line over an 808 or a tamborzão rhythm, with no copied melody and no
  vocal sample.

**Safe libraries (licences checked 11-20):**
- **CC0** ([deed](https://creativecommons.org/publicdomain/zero/1.0/)): copy, modify and use commercially "all without
  asking permission". Other people's publicity rights still apply.
- **Freesound** ([FAQ](https://freesound.org/help/faq/)): **CC0 only**. CC BY needs a credit. CC BY-NC is out: "you can't
  earn any money".
- **Kenney** ([support](https://kenney.nl/support)): CC0, "even in commercial projects", no attribution.
- **Sonniss GDC bundles** ([licence](https://sonniss.com/gdc-bundle-license/)): commercial, no attribution. Never
  redistribute the raw files, and no AI training (the version for downloads from 2026-08-27).
- **Pixabay** ([licence](https://pixabay.com/service/license-summary/), [FAQ](https://pixabay.com/service/faq/)): free, no
  attribution, sound effects included. **Music marked with a shield icon is registered with Content ID** and gets
  claimed anyway, and re-uploaded meme sounds there aren't cleared.
- **Wikimedia Commons CC0:** the precedent is the stream's `palmas.wav` (`brand/README.md`).

---

## 4. Don't (from what failed here)

- **No cartoon caricatures of Luan from an image model.** 11-20: "esses diagramas meus cabeludos… ficou horrível",
  "odiei o meu desenho". The 11-19 fish was liked once, but the style series wasn't. Use his real frame, or the meme's
  object drawn *on* him (glasses, equations, a crown).
- **No effect on every beat.** 11-11, `cortes.py`: "cortes desconexos… edição caótica, efeitos visuais cafonas". One
  emphasis per beat and about three memes per short at most. Never two memes on one beat (a sticker, a text and a sound
  from different memes), and nothing on screen for more than ~2 s.
- **No invented memes.** A made-up picture with a sound nobody knows didn't land. Every meme needs a KYM, meme.com or
  Museu de Memes entry, a place on this file's evergreen list, or to be Luan's own (his lines, his scenes, his cat).
- **No song, ripped button or TV clip in the master** (§3). Myinstants' "estourado" (distorted) versions are trending
  in BR, but on a phone speaker they're chaos: once, as a punchline, at most.
- **No politics or tragedy:** the October 2026 election memes, the Anakin "Gen Z rage" format (mostly right-leaning, per
  KYM), the RS floods' Cavalo Caramelo, "Pegue o gato".
- **No expiring or English-only memes** where a BR one exists ("Remember November 2026"; "Why would I deceive you?" as
  audio).
