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
  muralTitle: { pt: "Apareça no mural", en: "Be on the mural" },
  muralNote: {
    pt: "Seu nome e sua mensagem ficam no mural do canal, junto da meta que você ajudou a bater.",
    en: "Your name and message stay on the channel's mural, next to the goal you helped reach.",
  },
  muralFan: { pt: "Com a Twitch conectada, seu torcedor aparece junto.", en: "With Twitch connected, your fan shows up too." },
  muralOn: { pt: "Vou aparecer no mural", en: "I'll be on the mural" },
  muralOff: { pt: "Quero aparecer no mural", en: "I want to be on the mural" },
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
} as const

/** /mural: the goals, the one on screen and the ones before, with whoever chose to show on each. */
export const mural = {
  title: { pt: "Mural", en: "Mural" },
  description: {
    pt: "Quem mandou Pix na live e quis aparecer aqui, meta por meta. Valeu a cada um!",
    en: "Everyone who sent a Pix on the live and wanted to show up here, goal by goal. Thanks, each of you!",
  },
  soon: { pt: "O mural abre junto com o Pix na live.", en: "The mural opens along with Pix on the live." },
  send: { pt: "Mandar um Pix", en: "Send a Pix" },
  goalNow: { pt: "Meta atual", en: "Current goal" },
  noGoal: { pt: "Nenhuma meta agora.", en: "No goal right now." },
  goalsBefore: { pt: "Metas anteriores", en: "Earlier goals" },
  reached: { pt: "Meta batida", en: "Goal reached" },
  of: { pt: "de", en: "of" },
  supporters: { pt: "Quem ajudou", en: "Who helped" },
  others: { pt: "Pix sem nome no mural", en: "Pix with no name on the mural" },
  noneYet: { pt: "Ninguém no mural ainda. O primeiro pode ser você.", en: "Nobody on the mural yet. The first could be you." },
  outside: { pt: "Fora das metas", en: "Outside the goals" },
  anonymous: { pt: "Anônimo", en: "Anonymous" },
  privacy: {
    pt: "O nome do banco de quem paga nunca aparece: nem na live, nem aqui. Para tirar um Pix seu do mural, fale com o Luan.",
    en: "The payer's name at the bank never shows: not on the live, not here. To take a Pix of yours off the mural, ask Luan.",
  },
} as const

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
