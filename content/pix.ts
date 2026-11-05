/**
 * /pix: a Pix to the live, with a message on screen read by a voice, and the mural of every Pix whose sender
 * agreed. The voices' ids are the narrator's (scripts/narrador.py); their samples are in public/pix/vozes/.
 */
export const pix = {
  title: { pt: "Pix na live", en: "Pix on the live" },
  description: {
    pt: "Mande um Pix e sua mensagem aparece na live, lida pela voz que você escolher. Sem taxa de plataforma: o Pix cai direto na conta do Luan.",
    en: "Send a Pix and your message shows up on the live, read by the voice you pick. No platform fee: the Pix goes straight to Luan's account. Pix works with Brazilian banks only.",
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
  listen: { pt: "Ouvir", en: "Listen" },
  amount: { pt: "Valor", en: "Amount" },
  other: { pt: "Outro", en: "Other" },
  otherPlaceholder: { pt: "R$ 2,50", en: "R$ 2.50" },
  when: { pt: "Quando aparece", en: "When it shows" },
  now: { pt: "Na hora", en: "Right away" },
  between: { pt: "Entre partidas", en: "Between matches" },
  betweenHint: { pt: "Espera a partida acabar, para não atrapalhar o jogo.", en: "Waits for the match to end, so it doesn't get in the way." },
  mural: { pt: "Mostrar no mural do site, com o nome e a mensagem", en: "Show on the site's mural, with the name and message" },
  sigmaSignedIn: { pt: "Entrou como", en: "Signed in as" },
  sigmaGain: { pt: "Este Pix te dá", en: "This Pix gives you" },
  sigmaSignIn: { pt: "Entrar com a Twitch para ganhar Σ", en: "Sign in with Twitch to earn Σ" },
  sigmaNote: { pt: "10 Σ por real, somados aos da live. Sem entrar, o Pix sai do mesmo jeito.", en: "10 Σ per real, on top of the live's. Without signing in, the Pix goes through all the same." },
  signOut: { pt: "Sair", en: "Sign out" },
  generate: { pt: "Gerar Pix", en: "Make the Pix" },
  generating: { pt: "Gerando…", en: "Making it…" },
  error: { pt: "Não deu para gerar o Pix. Tente de novo.", en: "Couldn't make the Pix. Try again." },
  minimum: { pt: "O valor mínimo é R$ 0,01.", en: "The minimum is R$ 0.01." },
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
  muralTitle: { pt: "Mural", en: "Mural" },
  muralEmpty: { pt: "Ainda ninguém. O primeiro nome do mural pode ser o seu.", en: "Nobody yet. The mural's first name could be yours." },
  privacy: {
    pt: "O nome do banco de quem paga nunca aparece: nem na live, nem no mural. Para tirar um Pix seu do mural, fale com o Luan.",
    en: "The payer's name at the bank never shows: not on the live, not on the mural. To take a Pix of yours off the mural, ask Luan.",
  },
} as const

/** The voices on the form. "propria" is only for a recording: it plays as recorded. */
export const VOICES: { id: string; name: string; text: boolean; recording: boolean }[] = [
  { id: "propria", name: "Minha própria voz", text: false, recording: true },
  { id: "antonio", name: "Antônio (voz neutra)", text: true, recording: false },
  { id: "francisca", name: "Francisca (voz neutra)", text: true, recording: false },
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
