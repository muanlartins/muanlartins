/**
 * /pix: a Pix to the live, with a message on screen read by a voice; /mural: every Pix whose sender agreed. The voices' ids are the narrator's (scripts/narrador.py); their samples are in public/pix/vozes/.
 */
export const pix = {
  title: { pt: "Pix na live", en: "Pix on the live" },
  description: {
    pt: "Mande um Pix e sua mensagem aparece na live, lida pela voz que você escolher.",
    en: "Send a Pix and your message shows up on the live, read by the voice you pick. Pix works with Brazilian banks only.",
  },
  soon: {
    pt: "O Pix na live está quase pronto. Volte daqui a pouco.",
    en: "Pix on the live is almost ready. Come back soon.",
  },
  name: { pt: "Seu nome na tela", en: "Your name on screen" },
  namePlaceholder: { pt: "Em branco, aparece como Anônimo", en: "Blank shows as Anonymous" },
  anonymous: { pt: "Anônimo", en: "Anonymous" },
  message: { pt: "Mensagem", en: "Message" },
  write: { pt: "Escrever", en: "Write" },
  record: { pt: "Gravar áudio", en: "Record audio" },
  messagePlaceholder: { pt: "Opcional", en: "Optional" },
  recordStart: { pt: "Gravar", en: "Record" },
  recordStop: { pt: "Parar", en: "Stop" },
  recordAgain: { pt: "Gravar de novo", en: "Record again" },
  recordListen: { pt: "Ouvir", en: "Listen" },
  recordLimit: { pt: "Até 15 segundos. Na live, o texto do que você falou aparece na tela.", en: "Up to 15 seconds. On the live, what you said shows on screen as text." },
  recordDenied: { pt: "O navegador não deixou usar o microfone.", en: "The browser didn't allow the microphone." },
  voice: { pt: "Voz", en: "Voice" },
  voiceHint: { pt: "Toque numa voz para ouvir como ela fala.", en: "Tap a voice to hear how it sounds." },
  voiceRecordingHint: { pt: "Sua gravação sai na voz que você escolher.", en: "Your recording comes out in the voice you pick." },
  amount: { pt: "Valor", en: "Amount" },
  other: { pt: "Outro", en: "Other" },
  otherPlaceholder: { pt: "R$ 2,50", en: "R$ 2.50" },
  when: { pt: "Quando aparece", en: "When it shows" },
  now: { pt: "Na hora", en: "Right away" },
  between: { pt: "Entre partidas", en: "Between matches" },
  betweenHint: { pt: "Espera a partida acabar, para não atrapalhar o jogo.", en: "Waits for the match to end, so it doesn't get in the way." },
  muralTitle: { pt: "Seu Pix no mural", en: "Your Pix on the mural" },
  muralNote: {
    pt: "Seu nome e sua mensagem ficam no mural do canal, junto da meta que você ajudou a bater.",
    en: "Your name and message stay on the channel's mural, next to the goal you helped reach.",
  },
  muralFan: { pt: "Com a Twitch conectada, seu torcedor aparece junto.", en: "With Twitch connected, your fan shows up too." },
  muralSee: { pt: "Ver o mural", en: "See the mural" },
  sigmaSignedIn: { pt: "Entrou como", en: "Signed in as" },
  sigmaGain: { pt: "Este Pix te dá", en: "This Pix gives you" },
  sigmaSignIn: { pt: "Entrar com a Twitch para ganhar Σ", en: "Sign in with Twitch to earn Σ" },
  sigmaNote: { pt: "10 Σ por real, somados aos da live. Sem entrar, o Pix sai do mesmo jeito.", en: "10 Σ per real, on top of the live's. Without signing in, the Pix goes through all the same." },
  signOut: { pt: "Sair", en: "Sign out" },
  generate: { pt: "Gerar Pix", en: "Make the Pix" },
  generating: { pt: "Gerando…", en: "Making it…" },
  error: { pt: "Não deu para gerar o Pix. Tente de novo.", en: "Couldn't make the Pix. Try again." },
  minimum: { pt: "O valor mínimo é R$ 1.", en: "The minimum is R$ 1." },
  payTitle: { pt: "Pague este valor exato", en: "Pay this exact amount" },
  payNote: {
    pt: "Leia o QR no app do seu banco ou copie o código e use Pix copia e cola. O valor já vem preenchido; se tiver centavos, são eles que identificam o seu Pix.",
    en: "Scan the QR in your bank's app, or copy the code and use Pix copia e cola. The amount is filled in; any cents are what identify your Pix.",
  },
  validFor: { pt: "Válido por", en: "Valid for" },
  copy: { pt: "Copiar código Pix", en: "Copy the Pix code" },
  copied: { pt: "Código copiado", en: "Code copied" },
  waiting: { pt: "Esperando o Pix chegar…", en: "Waiting for the Pix…" },
  doneTitle: { pt: "Recebido!", en: "Received!" },
  doneNote: { pt: "Sua mensagem já está na fila da live. Valeu demais!", en: "Your message is in the live's queue. Thanks a lot!" },
  lateTitle: { pt: "O tempo acabou", en: "Time's up" },
  lateNote: {
    pt: "Se você já pagou, espere uns minutos aqui: ele ainda pode chegar. Se não chegar, o Luan vê o Pix e coloca na live, só que talvez sem a mensagem.",
    en: "If you already paid, wait a few minutes here: it may still arrive. If it doesn't, Luan sees the Pix and puts it on the live, maybe without the message.",
  },
  again: { pt: "Mandar outro Pix", en: "Send another Pix" },
  goal: { pt: "Meta", en: "Goal" },
  // The song (from R$ 5): a style and a theme or the lyrics; Google's AI writes and sings it.
  kind: { pt: "O que você quer mandar", en: "What you're sending" },
  kindMessage: { pt: "Mensagem", en: "Message" },
  kindSong: { pt: "Música feita por IA", en: "AI-made song" },
  kindSongPrice: { pt: "a partir de R$ 5", en: "from R$ 5" },
  style: { pt: "Estilo", en: "Style" },
  lyrics: { pt: "A letra", en: "The lyrics" },
  about: { pt: "Dizer sobre o que é", en: "Say what it's about" },
  writeLyrics: { pt: "Escrever a letra", en: "Write the lyrics" },
  aboutPlaceholder: { pt: "Ex.: o Luan perdendo gol feito no Rocket League", en: "E.g. Luan missing an open goal in Rocket League" },
  lyricsPlaceholder: { pt: "[Refrão]\nÔ Luan, chuta essa bola…", en: "[Chorus]\nÔ Luan, chuta essa bola…" },
  songHint: {
    pt: "A IA escreve (ou canta a sua letra) em português. Sem nome de cantor nem letra de música que já existe. Na live, toca até 1 minuto; depois, fica no mural pra você ouvir e baixar.",
    en: "The AI writes it (or sings your lyrics) in Portuguese. No singers' names, no lyrics from existing songs. On the live it plays up to a minute; then it stays on the mural for you to listen to and download.",
  },
  songMinimum: { pt: "A música é a partir de R$ 5.", en: "Songs start at R$ 5." },
  songMaking: { pt: "Fazendo sua música…", en: "Making your song…" },
  songMakingNote: { pt: "Leva uns 30 segundos. Pode esperar aqui.", en: "It takes about 30 seconds. You can wait here." },
  songReady: { pt: "Sua música ficou pronta e entrou na fila da live.", en: "Your song is ready and in the live's queue." },
  songReadyNote: { pt: "Depois que ela tocar na live, fica no mural pra você ouvir e baixar.", en: "Once it plays on the live, it stays on the mural for you to listen to and download." },
  songRefused: { pt: "A música não saiu com esse texto", en: "The song didn't come out with that text" },
  songRetry: { pt: "Tentar de novo", en: "Try again" },
  songRetrying: { pt: "Conferindo…", en: "Checking…" },
  songTries: {
    pt: "Pode mudar até {n}× até as {hora}; depois disso, seu Pix toca na live só com o seu nome.",
    en: "You can change it up to {n}× until {hora}; after that, your Pix plays on the live with just your name.",
  },
  songFailed: {
    pt: "Não deu pra fazer a sua música. Seu Pix toca na live com o seu nome, e o Luan vê no painel o que aconteceu.",
    en: "Your song couldn't be made. Your Pix plays on the live with your name, and Luan sees what happened in his panel.",
  },
} as const

/** The song's styles on the form; the musical direction behind each is ESTILOS in infra/pix/musica.mjs. */
export const STYLES: { id: string; name: string }[] = [
  { id: "funk", name: "Funk" },
  { id: "sertanejo", name: "Sertanejo" },
  { id: "pagode", name: "Pagode" },
  { id: "forro", name: "Forró" },
  { id: "rock", name: "Rock" },
  { id: "rap", name: "Rap" },
  { id: "eletronica", name: "Eletrônica" },
  { id: "pop", name: "Pop" },
]

/** /mural: two tabs, the Pix (goal by goal, every Pix with its value, by the name and message its sender wrote) and the audience (the ranking by Σ, the milestones). */
export const mural = {
  title: { pt: "Mural", en: "Mural" },
  description: {
    pt: "Quem faz o canal acontecer: quem manda Pix na live e quem aparece para assistir. Valeu a cada um!",
    en: "The people who make the channel happen: the ones who send a Pix on the live and the ones who show up to watch. Thanks, each of you!",
  },
  soon: { pt: "O mural abre junto com o Pix na live.", en: "The mural opens along with Pix on the live." },
  send: { pt: "Mandar um Pix", en: "Send a Pix" },
  tabPix: { pt: "Pix", en: "Pix" },
  tabAudience: { pt: "Audiência", en: "Audience" },
  /** The audience tab's address: /mural#audiencia. */
  audienceHash: { pt: "audiencia", en: "audience" },
  goalNow: { pt: "Meta atual", en: "Current goal" },
  noGoal: { pt: "Nenhuma meta agora.", en: "No goal right now." },
  goalsBefore: { pt: "Metas anteriores", en: "Earlier goals" },
  reached: { pt: "Meta batida", en: "Goal reached" },
  of: { pt: "de", en: "of" },
  toGo: { pt: "faltam", en: "to go:" },
  supporters: { pt: "Quem ajudou", en: "Who helped" },
  noneYet: { pt: "Nenhum Pix nesta meta ainda. O primeiro pode ser você.", en: "No Pix for this goal yet. The first could be you." },
  outside: { pt: "Fora das metas", en: "Outside the goals" },
  anonymous: { pt: "Anônimo", en: "Anonymous" },
  songDownload: { pt: "Baixar a música", en: "Download the song" },
  songLyrics: { pt: "Ver a letra", en: "Show the lyrics" },
  privacy: {
    pt: "O nome do banco de quem paga nunca aparece, nem na live nem aqui: só o nome que a pessoa escreveu no site. Para tirar um Pix seu do mural, fale com o Luan; o valor continua, como anônimo.",
    en: "The payer's name at the bank never shows, not on the live and not here: only the name its sender wrote on the site. To take a Pix of yours off the mural, ask Luan; the amount stays, as anonymous.",
  },
  // The audience tab.
  audienceLead: {
    pt: "Até hoje, {pessoas} assistiram às lives, somando {horas} na arquibancada.",
    en: "So far, {pessoas} have watched the lives, {horas} in the stand altogether.",
  },
  // Singular|plural.
  people: { pt: "pessoa|pessoas", en: "person|people" },
  hours: { pt: "hora|horas", en: "hour|hours" },
  nextMilestone: { pt: "Próximo marco", en: "Next milestone" },
  countPeople: { pt: "{n} pessoas assistindo", en: "{n} people watching" },
  countHours: { pt: "{n} horas assistidas", en: "{n} hours watched" },
  milestones: { pt: "Marcos", en: "Milestones" },
  reachedCounts: { pt: "Já batidos", en: "Already reached" },
  ranking: { pt: "Ranking", en: "Ranking" },
  rankingNote: {
    pt: "Σ são os pontos do canal: 1 por minuto de live, mais um bônus a cada live e a cada live seguida.",
    en: "Σ are the channel's points: 1 per minute of a live, plus a bonus for each live and each live in a row.",
  },
  showAll: { pt: "Ver todos", en: "Show everyone" },
  showLess: { pt: "Ver menos", en: "Show fewer" },
  livesUnit: { pt: "live|lives", en: "live|lives" },
  dedicationTitle: { pt: "Afiliado à Twitch", en: "Twitch affiliate" },
  dedication: {
    pt: "No dia 7 de novembro de 2026, o canal virou afiliado da Twitch. Isso só acontece quando gente de verdade aparece nas lives, e cada uma destas pessoas apareceu. Esta conquista é de vocês.",
    en: "On November 7, 2026, the channel became a Twitch affiliate. That only happens when real people show up to the lives, and each of these people did. This one is yours.",
  },
  dedicationSince: {
    pt: "Conta quem esteve no chat desde 5 de novembro, quando o canal começou a registrar quem assiste.",
    en: "It counts everyone in the chat since November 5, when the channel started keeping track of who watches.",
  },
  seeStand: { pt: "Ver a arquibancada", en: "See the stand" },
  audienceSoon: { pt: "A audiência aparece aqui em breve.", en: "The audience shows up here soon." },
  audiencePrivacy: {
    pt: "Aparece aqui quem estava logado no chat da Twitch durante uma live. Para sair da lista, fale com o Luan.",
    en: "Everyone logged in to the Twitch chat during a live shows up here. To be left out, ask Luan.",
  },
} as const

/** The channel's dated milestones, oldest first; `dedication` draws the stand of everyone who had watched by that day. */
export const MILESTONES: { date: string; title: { pt: string; en: string }; dedication?: boolean }[] = [
  { date: "2026-10-28", title: { pt: "Primeira live", en: "First live" } },
  { date: "2026-11-05", title: { pt: "A torcida ganha nomes e Σ", en: "The stand gets names and Σ" } },
  { date: "2026-11-06", title: { pt: "Primeiro Pix na live", en: "First Pix on the live" } },
  { date: "2026-11-07", title: { pt: "Afiliado à Twitch", en: "Twitch affiliate" }, dedication: true },
]

/** The audience's milestones by count: the next one shows as a bar, the ones reached as a list. */
export const COUNTS = {
  pessoas: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  horas: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
}

/**
 * The voices on the form. "propria" is only for a recording: it plays as recorded. Each card shows an icon
 * (components/site/pix/voice-picker.tsx); `image` swaps it for public/pix/vozes/<id>.webp, for art Luan has the rights to.
 */
export const VOICES: { id: string; name: string; note?: { pt: string; en: string }; text: boolean; recording: boolean; image?: boolean }[] = [
  { id: "propria", name: "Minha voz", note: { pt: "como você gravou", en: "as you recorded it" }, text: false, recording: true },
  { id: "antonio", name: "Antônio", note: { pt: "voz neutra", en: "plain voice" }, text: true, recording: false },
  { id: "francisca", name: "Francisca", note: { pt: "voz neutra", en: "plain voice" }, text: true, recording: false },
  { id: "galvao", name: "Galvão Bueno", text: true, recording: true },
  { id: "bob", name: "Bob Esponja", text: true, recording: true },
  { id: "patrick", name: "Patrick", text: true, recording: true },
  { id: "lula", name: "Lula Molusco", text: true, recording: true },
  { id: "madruga", name: "Seu Madruga", text: true, recording: true },
  { id: "chaves", name: "Chaves", text: true, recording: true },
  { id: "silvio", name: "Silvio Santos", text: true, recording: true },
  { id: "faustao", name: "Faustão", text: true, recording: true },
  { id: "picapau", name: "Pica-Pau", text: true, recording: true },
  { id: "goku", name: "Goku", text: true, recording: true },
  { id: "cid", name: "Cid Moreira", text: true, recording: true },
  { id: "datena", name: "Datena", text: true, recording: true },
]

/** The line each voice's sample says. */
export const SAMPLE = "Fulano mandou cinco reais. Que jogada, Luan! Manda mais uma dessas."
