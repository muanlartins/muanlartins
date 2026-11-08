/**
 * The channel at /canal (/channel): what it is, where to watch, what happens
 * in the lives, the lives themselves, and how it's all made. Whatever the
 * game: each game's own pages are in the content section.
 */
export const channel = {
  title: { pt: "Canal", en: "Channel" },
  description: {
    pt: "Evoluir nos jogos com o método científico, uma técnica por vídeo. Ao vivo na Twitch e em vídeo no YouTube, em português.",
    en: "Getting better at games with the scientific method, one technique per video. Live on Twitch and in videos on YouTube, in Brazilian Portuguese.",
  },
  /** A blank line starts a new paragraph. */
  intro: {
    pt: "Cada vídeo pega uma técnica, mede o que funciona e mostra como treinar. Nas lives eu jogo ranqueadas, testo o que estou treinando e converso com quem está no chat.\n\nHoje são dois jogos: Rocket League, nas tardes, e Valorant, que estou aprendendo, nas noites de segunda e quarta.",
    en: "Each video takes one technique, measures what works and shows how to practice it. In the lives I play ranked, try what I'm practicing and talk with whoever is in the chat.\n\nThere are two games now: Rocket League in the afternoons, and Valorant, which I'm learning, on Monday and Wednesday nights.",
  },
  watch: { pt: "Onde assistir", en: "Where to watch" },
  where: {
    twitch: { pt: "As lives, ao vivo", en: "The lives, live" },
    youtube: { pt: "Os vídeos e as lives inteiras", en: "The videos and the lives in full" },
  },

  /** What happens in a live, and the viewer's part in it. */
  inside: {
    title: { pt: "Na live", en: "In the live" },
    crowd: {
      title: { pt: "A arquibancada", en: "The stand" },
      text: {
        pt: "Quem está logado no chat vira um torcedor na arquibancada, embaixo do jogo, com o seu nome em cima. Quem chega primeiro fica na frente.",
        en: "Everyone logged in to the chat becomes a fan in the stand under the game, with their name above them. Whoever got there first stands in front.",
      },
      cta: { pt: "Monte o seu torcedor", en: "Build your fan" },
      ctaHint: {
        pt: "Cores, cabeça, roupa, acessório, comemoração, um grito de chegada e stickers. Você entra com a Twitch e ele já aparece assim na live.",
        en: "Colors, head, outfit, accessory, celebration, an arrival shout and stickers. Sign in with Twitch and they show up like that in the live.",
      },
    },
    moments: [
      {
        title: { pt: "Gol nosso", en: "Our goal" },
        text: {
          pt: "A arquibancada comemora, cada um do seu jeito e com os seus stickers, e o gol é dedicado a alguém sorteado entre quem está lá. Às vezes tem narrador.",
          en: "The stand celebrates, each fan their own way and with their own stickers, and the goal is dedicated to someone drawn from the stand. Sometimes there's a commentator.",
        },
      },
      {
        title: { pt: "No chat", en: "In the chat" },
        text: {
          pt: "!pula e !danca mexem o seu torcedor; !ola passa uma ola pela arquibancada inteira. O que você escreve aparece num balão em cima dele.",
          en: "!pula (jump) and !danca (dance) move your fan; !ola sends a wave through the whole stand. What you write shows in a balloon over them.",
        },
      },
      {
        title: { pt: "Ranqueadas", en: "Ranked" },
        text: {
          pt: "O ranque e o placar do dia ficam em cima da câmera, e cada partida ranqueada vai para a página do jogo.",
          en: "The rank and the day's record sit above the camera, and each ranked match goes to the game's page.",
        },
      },
    ],
  },

  lives: {
    title: { pt: "Lives", en: "Streams" },
    description: {
      pt: "As lives da Twitch, inteiras. Quando estou no ar, dá para assistir aqui mesmo; depois, cada live fica com capítulos, as partidas e a transcrição do que eu falei.",
      en: "The Twitch streams, in full. While I'm on air you can watch right here; afterwards, each stream keeps its chapters, the matches and a transcript of what I said.",
    },
    /** When the lives are; the times themselves are in content/agenda.json. */
    agenda: {
      title: { pt: "Agenda", en: "Schedule" },
      zone: { pt: "Horário de Brasília", en: "Brasília time" },
      yours: { pt: "No seu horário", en: "In your time" },
      weekend: { pt: "Fins de semana a definir.", en: "Weekends to be decided." },
      next: { pt: "Próxima live", en: "Next stream" },
      now: { pt: "Agora, no horário da live", en: "Now, in stream hours" },
      today: { pt: "hoje", en: "today" },
      tomorrow: { pt: "amanhã", en: "tomorrow" },
      subscribe: { pt: "Adicionar à sua agenda", en: "Add to your calendar" },
      /** The calendar's name, and each event's with its game after a colon. */
      calendar: { pt: "Live do muanlartins", en: "muanlartins live" },
    },
  },
  games: {
    title: { pt: "Jogos", en: "Games" },
    /** Before each game's slots in the agenda. */
    live: { pt: "Ao vivo", en: "Live" },
  },

  pix: {
    title: { pt: "Pix na live", en: "Pix on the live" },
    description: {
      pt: "Sua mensagem na tela, lida pela voz que você escolher, com o Pix direto para o Luan.",
      en: "Your message on screen, read by the voice you pick, with the Pix straight to Luan.",
    },
  },

  mural: {
    title: { pt: "Mural", en: "Mural" },
    description: {
      pt: "Quem mandou Pix na live e quis aparecer, meta por meta, com o torcedor e os badges de cada um.",
      en: "Everyone who sent a Pix on the live and wanted to show, goal by goal, with each one's fan and badges.",
    },
  },

  profile: {
    title: { pt: "Perfil", en: "Profile" },
    description: {
      pt: "Monte o seu torcedor da arquibancada e veja o seu Σ, a sua sequência de lives e os seus badges.",
      en: "Build your fan for the stand and see your Σ, your run of lives and your badges.",
    },
  },

  backstage: {
    title: { pt: "Bastidores", en: "Behind the scenes" },
    description: {
      pt: "Como o canal é feito: a identidade visual, a live por dentro e o que acontece depois de cada live.",
      en: "How the channel is made: the visual identity, the live from the inside and what happens after each one.",
    },
    mark: {
      title: { pt: "A marca", en: "The mark" },
      text: {
        pt: "A marca é a minha assinatura: “Luan” num traço só, L, U, A, N, redesenhado numa grade de 45°, em que todo segmento é diagonal ou vertical. Girado 90°, o traço vira um Σ, a soma, o primeiro símbolo que a gente encontra na estatística: é disso que o canal trata, medir como a gente melhora.\n\nDuas cópias, uma girada 180°, se cruzam por cima e por baixo nos quatro cruzamentos. O resultado é um S simétrico que, por baixo, ainda é só “Luan” duas vezes.",
        en: "The mark is my signature: “Luan” in one stroke, L, U, A, N, redrawn on a 45° lattice where every segment is diagonal or vertical. Turned 90°, the stroke reads as a Σ, the sum, the first symbol you meet in statistics: that's what the channel is about, measuring how you get better.\n\nTwo copies, one turned 180°, weave over and under each other at their four crossings. The result is a symmetric S that, underneath, is still just “Luan” twice.",
      },
    },
    colors: {
      title: { pt: "Cores", en: "Colors" },
      klein: { pt: "O fundo de tudo: o Azul Klein Internacional.", en: "The ground of everything: International Klein Blue." },
      branco: { pt: "A tinta principal, a cópia de cima.", en: "The main ink, the copy on top." },
      kleinClaro: {
        pt: "O destaque, a cópia de baixo: o mesmo azul, mais claro.",
        en: "The accent, the copy underneath: the same blue, lighter.",
      },
    },
    type: {
      title: { pt: "Tipografia", en: "Typography" },
      text: {
        pt: "Space Grotesk, em tudo: no site, nos overlays e nas thumbnails. O nome vai sempre em minúsculas.",
        en: "Space Grotesk, everywhere: the site, the overlays and the thumbnails. The name is always lowercase.",
      },
    },
    stream: {
      title: { pt: "A live por dentro", en: "The live from the inside" },
      text: {
        pt: "Os overlays são páginas deste site, que o OBS abre como fontes de navegador: a moldura da câmera, o chat, a arquibancada. Um painel ao lado lê as estatísticas pela API do próprio Rocket League, conta vitórias e derrotas, avisa a arquibancada dos gols e das defesas e corta para a conversa quando a partida acaba.",
        en: "The overlays are pages of this site that OBS opens as browser sources: the camera frame, the chat, the stand. A panel beside them reads the stats from Rocket League's own API, counts wins and losses, tells the stand about goals and saves and cuts to the talk when the match ends.",
      },
    },
    after: {
      title: { pt: "Depois da live", en: "After the live" },
      text: {
        pt: "A live inteira vai para o YouTube e ganha uma página aqui, com um capítulo por partida, um resumo e a transcrição do que eu falei, feita pelo Whisper, sem os nomes dos amigos.",
        en: "The whole live goes to YouTube and gets a page here, with a chapter per match, a summary and a transcript of what I said, made by Whisper, without my friends' names.",
      },
    },
    site: {
      title: { pt: "O site", en: "The site" },
      text: {
        pt: "Feito em Next.js, estático, em dois idiomas: muanlartins.com.br em português e muanlartins.com em inglês. O código é aberto.",
        en: "Built with Next.js, static, in two languages: muanlartins.com.br in Portuguese and muanlartins.com in English. The code is open.",
      },
      code: { pt: "Código no GitHub", en: "Code on GitHub" },
    },
  },
}
