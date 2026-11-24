# muanlartins — voice and copy

How the channel writes, everywhere it writes: the site, the live's screens, the chat bot, Twitch, YouTube, Discord,
the roadmap. Read it before writing or changing any text a viewer will read. The visual identity is
[README.md](README.md); how screens are built is [interface.md](interface.md).

Everything public is in Brazilian Portuguese (the English site, muanlartins.com, follows the same rules in English).
Examples are given as they should appear.

Where this came from: Luan's feedback on what I drafted, the titles and hooks he picked, and how he talks on stream
(about 22 hours of the lives' transcripts, 10-28 to 11-20). Almost all copy on the site so far is a draft he approved
in bulk; this guide is what the next pass of every page is measured against. Lines marked **(a decidir)** wait for
his call. Decisions he made are dated.

## The voice in one paragraph

The channel is Luan talking: informal, spoken Rio Portuguese, short sentences, warm and a bit self-deprecating. He
takes improving at games seriously and still messes around ("dá pra jogar o jogo sério e ainda curtir"), talks about
the games like football (gol, defesa, golaço, arquibancada, torcida), thanks people a lot ("valeu"), owns his mistakes
("errei e errei feio") and never makes fun of anyone else. The site says little and shows a lot.

## Who speaks

- **"Eu" is Luan, always.** The site, the overlays and the bot speak as him: "Não estou ao vivo agora", "Meu rank",
  "Partidas comigo". Not "o Luan" in help or instructions ("fale com o Luan" → "fala comigo no chat").
- **"A gente"** for him with the viewers (and for what he's building with them), never "nós": "o que a gente faz
  aqui".
- **The system never says "eu".** When the site talks about itself, it talks about the thing: "Fica salvo neste
  navegador e vai pro seu perfil na próxima mudança", not "eu tento de novo".
- **Characters may speak in the third person** because they're characters: the stand's narrator ("É gol do Luan!"),
  the credits ("Luan Martins, como ele mesmo").
- **The reader is "você"**, a group of readers "vocês". "Galera" fits where he'd say it out loud: the live's screens,
  Discord, the credits, a thank-you ("Valeu, galera!"). Not in instructions or errors.
- **A viewer's own words on their page** keep the platform's convention ("Sobre mim" is their text).

## Tone

- **Short.** A line where a line will do; two at most on a card. Pictures, numbers and demos over paragraphs ("copy
  mínima, o foco na feature, com preferência pras demonstrações visuais"). If a page needs an explanation, put it
  behind a "Como funciona" the reader opens.
- **Plain over clever, his over ours.** Say what it is and what it does for the viewer. When a hook or title needs a
  punch, use his own line from the live ("VÃO HUMILHAR A GENTE", "Deu certo, deu certo!") rather than inventing one;
  his edits go for the joke that's true ("4K sem risadinha 😐" over "4K de Sage no pós-plant 💚").
- **Humour about himself, never at others.** Self-irony is fine anywhere playful (titles, the live's screens, empty
  states with nothing at stake). Errors, instructions, money and anything about a viewer stay straight.
- **Football register for the games and the crowd.** GOOOL!, DEFESAÇA!, golaço, a arquibancada, a torcida, a virada.
- **Honest about what isn't done.** "Primeira versão" is fine. Never promise a date he didn't give.
- **No decoration in words.** No "incrível", "épico", "experiência", "jornada", "conteúdo exclusivo"; no "Bem-vindo
  ao…" openings; no em-dash asides, no "não é X, é Y", no rhetorical questions as headings.
- **True today.** Copy that describes how something works goes stale when it changes (the minigames moved to the
  Conversa scene on 11-20 and three pages still said "no canto da tela"). When a feature changes, grep its copy.

## Grammar and register

- **"pra", not "para"** (his writing, and already the majority of the warmest lines). "Para" only in legal text
  (`content/privacy.ts`).
- **The colloquial imperative** Brazilians use with "você", as he talks (Luan's call, 2026-11-21): "Manda no chat",
  "Tenta de novo", "Escolhe a sua classe", "Monta o seu torcedor", "Bebe água!", "Respira.". Not the standard
  "Mande", "Tente", "Escolha", which most of the site still uses and the review changes.
- **Buttons are infinitives**: "Salvar", "Entrar com a Twitch", "Ver o mural", "Montar o meu". (Infinitives read the
  same in either register.)
- **Gender: don't assume.** Templates that name a viewer avoid masculine defaults: "Gol dedicado a {nome}!", "Sub de
  presente: {nome}!", "Chegou um seguidor novo" rather than "Esse gol é do {nome}!", "Novo seguidor". When the
  viewer set pronouns on `/perfil`, the article can follow them.
- **Agents and characters get their own gender**: o Phoenix, o Sova, a Sage, a Jett.
- **Device-neutral verbs.** "Escolhe um comando pra ver", not "Toque" or "Clique" (unless it's only one of them, like
  "Passe o mouse" on a desktop-only hover, said with its touch alternative).

## Words

One name per thing. When a word here differs from what a page says, the page is wrong.

| Thing | Say | Don't say |
|---|---|---|
| A person who watches | **torcedor** (Luan's call, 2026-11-21: it goes with the stand and `/torcedor`) | viewer, espectador, telespectador, usuário |
| Everyone who watches | **a torcida** | a comunidade, a audiência (the mural's tab can keep "Audiência" only if renamed with it, a decidir) |
| The stand overlay | **a arquibancada** | a torcida (that's the people) |
| A viewer's drawing on the stand | **o torcedor** ("o seu torcedor") | avatar, boneco |
| The chat | **o chat** (a place: "no chat") | as a vocative |
| The stream | **a live**, **as lives**; "ao vivo" only as a state (the Ao vivo pill, "Rocket League ao vivo" in titles) | transmissão, stream |
| What happens between matches | **entre as partidas**, **a conversa** in lowercase if needed | "a Conversa" (OBS's scene name) |
| A match | **partida** (titles too: "10 vitórias em 14 partidas") | jogo, match (jogo is the game) |
| A Valorant round | **rodada** | round |
| The ranked mode, its page | **ranqueadas** ("as ranqueadas", "Ranqueadas" as a title) | ranked, competitiva |
| Someone's place in it | **rank** (a decidir: "elo", the word he says most, 37 to 12) | ranque, elo, classificação |
| No rank yet | **Sem rank** | Unranked, Sem classificação |
| Rocket League's tiers | **the game's Portuguese names**, everywhere, titles too (Luan's call, 2026-11-21): Bronze, Prata, Ouro, Platina, Diamante, Campeão, Grande Campeão, Lenda Supersônica | Champion, Grand Champion, SSL |
| A rank with its division | "Diamante 3, divisão 2"; compact "Diamante 3 · div. 2" | "Diamante 3 II" |
| Rank points | **pontos** ("1.076 pontos"; "pts" only where space is tight) | MMR |
| The channel's points | **Σ**, read "sigmas"; first mention on a page "Σ, os pontos do site"; plural: "seus Σ", "100 Σ"; what they do is **pra que servem** (rank, emblem, place in the stand and a seat in it when it's full, the crowd's ranking): they lock nothing (Luan, 2026-11-23), and what may come later stays unnamed ("umas coisas exclusivas") | pontos do canal (that's Twitch's), sigma points; "o que eles liberam", "libera no Ouro" |
| Twitch's points | **os pontos do canal da Twitch** | pontos do canal alone |
| Levels on the profile | **medalhas** | badges, conquistas |
| The ideas page | **Roadmap**, with "Próximos passos" and "Já saiu" | Changelog |
| A roadmap category | **categoria** ("Nada nessa categoria ainda") | marca (Marca is one of the categories) |
| The fundamentals | **Fundamentos**, the path **o roteiro de fundamentos**, each item **um tópico** | roadmap of fundamentals |
| A live's plan in the agenda | **o plano da live**, its items **passos** | roteiro, tópico (they're the fundamentals') |
| The Pix feature | **Pix na live** (the page, the menu); a single one **um Pix** | Live Pix, Pix com voz, Pix ao vivo |
| The stats on screen | **números** ("Nesta partida", "Os números de hoje"), names in Portuguese: Gols, Assistências, Defesas, Chutes, Toques, Aéreos, Demolições, **Pontuação** | Score, Demos (Score/MVP/ACS only with a gloss: "ACS (pontuação de combate)") |
| Subscribers | **inscritos**, a gift sub **sub de presente** | assinantes |
| Signing in | **entrar com a Twitch**; signed in "Entrou como {nome}"; out "Sair" | login, logar, conectar (except Discord: "Conectar o Discord") |
| The Discord | **o Discord**, **o servidor** only for it | comunidade; "servidor" for the site's API |
| Games | **Rocket League**, **Valorant** in full | RL, Valo (RL only in OBS names and docks) |
| The brand | **muanlartins**, always lowercase; Luan's name **Luan** (full **Luan Martins** in credits) | Muanlartins, MuanLartins |

English stays where it's the word Brazilian players use and there's no clear Portuguese one: live, Pix, replay, skin,
loadout, flick, benchmark, boost, kickoff, GG, sub, raid, bits, Hype Train, MVP. Gloss a term the first time a page
uses it when a newcomer might not know it ("flick (o movimento rápido até o alvo)"). Rocket League's topic names keep
the community's English where that's what everyone says (Half flip, Flip cancel), with the Portuguese beside it.

## Formats

- **Capitals:** sentence case for every title, tab, menu item and button ("Próxima live", "Monte o seu torcedor").
  ALL CAPS only on the live's banner words (GOOOL!, VAR, FIM DE JOGO) and the thumbnails' plates (AO VIVO · 21/11).
- **Dates:** "21/11" (always two digits: "01/12"); with the weekday "sáb., 21/11"; in a sentence "21 de novembro";
  the long form "sábado, 21 de novembro". The year only where a list spans years or in legal text. Relative words
  when they're true at reading time (hoje, amanhã), never in static text built days earlier.
- **Times:** "21h", "21h30", ranges "21h–23h". Not "21:30" in copy.
- **Money:** "R$ 5" for whole values, "R$ 2,50" otherwise, computed amounts included ("R$ 5,00" → "R$ 5"). Spoken
  lines (the voices) spell it out: "5 reais e 50 centavos".
- **Numbers:** a dot from four digits ("1.076 pontos", "2.000 Σ"), not in years or IDs; decimal comma ("1,25");
  a real minus sign for losses ("−24 RR") and "+9" for gains; "×" for times ("4×").
- **Scores:** "5–4" (en dash) on screens; "5 a 4" in a sentence.
- **Empty value:** "–" (en dash), everywhere.
- **Separators:** "·" between pieces of meta ("Fim de partida · Ranqueada 3v3 · Haven"); "|" only in YouTube titles;
  a colon for "label: detail"; no semicolons in copy.
- **Punctuation:** curly quotes “ ”; the ellipsis character "…"; exclamation marks only for celebrations and thanks
  ("Valeu demais!", "GOOOL!"), never in instructions or errors.
- **Emoji:** none on the site or the live's screens. One at most in a video title. Discord uses them as channel
  prefixes and bullets.

## Patterns

**Buttons and links.** Infinitive + what it acts on. One verb per action:

| Action | Verb |
|---|---|
| Open something to look at | Ver ("Ver o mural", "Ver todos") |
| Play a video or replay | Assistir |
| Destroy for good | Apagar |
| Take something off a list or off the screen (it still exists) | Tirar ("Tirar do mural") |
| Reset a form or a set | Limpar |
| Go back to the default | Voltar ao padrão |
| Retry | Tentar de novo |
| Send a Pix | Mandar ("Mandar um Pix"; the button that shows the QR: "Pagar com Pix") |
| Make your own thing | Montar ("Montar o meu") |
| Change it later | Editar ("Editar o meu") |

**Empty states.** What's missing, then what will fill it: "Nenhum Pix nesta meta ainda. O primeiro pode ser você."
"Nenhum duelo ainda: os primeiros saem na próxima live."

**Loading.** "Carregando…", or what's happening when it's specific; when it takes more than a few seconds, say how
long: "Fazendo sua música… Leva uns 30 segundos."

**Errors.** What failed, in plain words, then what to do. Name the third party when it's theirs: "Não deu pra salvar.
Tenta de novo." "A Twitch pediu pra você entrar de novo." "O navegador não deixou usar o microfone." No codes, no
"Ops", no apologies.

**Confirmations.** "Salvo." plus what happens next: "Salvo. Na próxima live você aparece assim na arquibancada."

**Destructive actions.** One pattern: "Apagar mesmo? Clica de novo", then "Apagado."

**Sign-in prompts.** What signing in gives, then what happens without it: "Pra escolher a classe da sua bolinha. Sem
entrar, ela luta com uma classe sorteada."

**Credits.** "Ideia de {nome}" for a suggestion; "Avisou {nome}" for a problem someone reported.

## By surface

- **Site.** Page title + one line. Sections say what the reader gets, not how it's built. Explanations of method
  (how the aim is measured, how Σ add up) fold under "Como funciona".
- **The live's screens.** Few words, big. Banner words in caps, the narrator in his football voice. What viewers
  can do is said as a call: "!pula", "Manda um Pix".
- **The chat bot.** One line, the answer first: "Fulano tem 1.240 Σ (Ouro 2): faltam 60 pro Ouro 3."
- **Twitch.** Panels and rewards are short labels and one line; rewards say what happens on screen.
- **YouTube.** Titles: what happened first, then the game, under 70 characters, no date; his line when the day had
  no climb (the `depois-da-live` skill has the formula). Descriptions: his summary first, then the links.
- **Discord.** The warmest surface: "galera", emoji as markers, the rules in plain words.
- **The roadmap.** A title that names the feature, one line of about 20 words about what it is for whoever watches,
  in his terms (AGENTS.md, "The roadmap and the changelog").
- **The English site.** Same rules in English: first person, short, plain; no channel vocabulary (it has none of the
  channel).

## Before shipping copy

1. Is it as short as it can be? Would a picture or a number say it?
2. Is every term the one in "Words"?
3. Does it speak as Luan ("eu"), to "você", in the colloquial imperative, with "pra"?
4. Is it still true about how the thing works today?
5. Is it a draft of his voice? Tell him it's a draft; he has the last word on copy.
