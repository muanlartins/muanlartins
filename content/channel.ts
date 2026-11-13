/**
 * The channel at /canal (/channel): what it is, where to watch, what happens
 * in the lives, the lives themselves, and how it's all made. Whatever the
 * game: each game's own pages are in the content section.
 */
export const channel = {
  title: { pt: "Canal", en: "Channel" },
  description: {
    pt: "Aprendendo jogos com o método científico, ao vivo na Twitch e em vídeo no YouTube.",
    en: "Learning games with the scientific method, live on Twitch and on video on YouTube.",
  },
  where: {
    twitch: { pt: "Ao vivo", en: "Live" },
    youtube: { pt: "Vídeos e lives", en: "Videos and streams" },
  },
  /** The home's first block: the live on air, or the next one. */
  next: {
    title: { pt: "Próxima live", en: "Next stream" },
    onAir: { pt: "Ao vivo agora", en: "Live now" },
    watch: { pt: "Assistir aqui", en: "Watch here" },
    schedule: { pt: "Agenda", en: "Schedule" },
  },

  /** What happens in a live, and the viewer's part in it: one line each. */
  inside: {
    title: { pt: "Na live", en: "In the live" },
    crowd: {
      text: { pt: "Quem está no chat vira torcedor na arquibancada.", en: "Everyone in the chat becomes a fan in the stand." },
      cta: { pt: "Monte o seu torcedor", en: "Build your fan" },
    },
    moments: [
      {
        icon: "party",
        title: { pt: "Gol ou round nosso", en: "Our goal or round" },
        text: { pt: "Festa, stickers e uma dedicatória sorteada.", en: "A party, stickers and a dedication drawn by lot." },
      },
      {
        icon: "chat",
        title: { pt: "Comandos", en: "Commands" },
        text: { pt: "!pula, !danca e !ola mexem a arquibancada.", en: "!pula, !danca and !ola move the stand." },
      },
      {
        icon: "ranked",
        title: { pt: "Ranqueadas", en: "Ranked" },
        text: { pt: "Ranque e placar na tela; cada partida no site.", en: "Rank and score on screen; every match on the site." },
      },
    ],
  },

  more: { pt: "Mais do canal", en: "More of the channel" },

  lives: {
    title: { pt: "Lives", en: "Streams" },
    description: {
      pt: "As lives inteiras, com capítulos, partidas e transcrição.",
      en: "Every stream in full, with chapters, matches and a transcript.",
    },
    /** When the lives are; the times themselves are the agenda Luan edits at /canal/agenda (lib/agenda.ts). */
    agenda: {
      title: { pt: "Agenda", en: "Schedule" },
      zone: { pt: "Horário de Brasília", en: "Brasília time" },
      yours: { pt: "No seu horário", en: "In your time" },
      next: { pt: "Próxima live", en: "Next stream" },
      now: { pt: "Agora, no horário da live", en: "Now, in stream hours" },
      today: { pt: "hoje", en: "today" },
      tomorrow: { pt: "amanhã", en: "tomorrow" },
      /** A day with no live, and a weekly live that won't happen that day. */
      none: { pt: "sem live", en: "no stream" },
      off: { pt: "folga", en: "day off" },
      empty: { pt: "Nenhuma live marcada nos próximos dias.", en: "No stream scheduled in the coming days." },
      unavailable: { pt: "Não deu para carregar a agenda agora.", en: "The schedule couldn't be loaded right now." },
      full: { pt: "Agenda completa", en: "Full schedule" },
      subscribe: { pt: "Adicionar à sua agenda", en: "Add to your calendar" },
      otherApps: { pt: "Apple e outros", en: "Apple and others" },
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
      pt: "Sua mensagem na tela, na voz que você escolher.",
      en: "Your message on screen, in the voice you pick.",
    },
  },

  mural: {
    title: { pt: "Mural", en: "Mural" },
    description: {
      pt: "Quem apoiou com Pix, meta por meta.",
      en: "Who supported with Pix, goal by goal.",
    },
  },

  profile: {
    title: { pt: "Perfil", en: "Profile" },
    description: {
      pt: "Seu torcedor, seu Σ e seus badges.",
      en: "Your fan, your Σ and your badges.",
    },
  },

  /** /canal/roadmap: what comes next and everything released, with credits. Its entries are in content/changelog.ts. */
  /** /canal/agenda: the lives' calendar, which the channel's account edits right there. */
  agenda: {
    title: { pt: "Agenda", en: "Schedule" },
    description: {
      pt: "Quando são as lives e de qual jogo, nos próximos dias e toda semana.",
      en: "When the streams are and of which game, in the coming days and every week.",
    },
    weekly: { pt: "Toda semana", en: "Every week" },
  },

  roadmap: {
    title: { pt: "Roadmap", en: "Roadmap" },
    description: {
      pt: "O que vem por aí e tudo o que já entrou no canal, no site, na live e nos vídeos, com o crédito de quem deu cada ideia.",
      en: "What comes next and everything already in the channel, on the site, the stream and the videos, credited to whoever had each idea.",
    },
    /** The line under its tile on the channel's home. */
    tile: { pt: "O que vem por aí e tudo o que já entrou.", en: "What comes next and everything already in." },
    community: {
      title: { pt: "Ideias da comunidade", en: "Ideas from the community" },
      text: {
        pt: "Tem uma ideia? Manda no chat da live ou comenta num vídeo. Se ela entrar, seu nome fica aqui.",
        en: "Got an idea? Say it in the stream's chat or comment on a video. If it makes it in, your name stays here.",
      },
      suggested: { pt: "Sugeriu", en: "Suggested" },
      reported: { pt: "Avisou", en: "Reported" },
      comment: { pt: "o comentário", en: "the comment" },
    },
    next: {
      title: { pt: "Próximos passos", en: "Next steps" },
    },
    shipped: {
      title: { pt: "Changelog", en: "Changelog" },
      /** "{n} novidades em {d} dias". */
      summary: { pt: "{n} novidades em {d} dias", en: "{n} releases in {d} days" },
      all: { pt: "Tudo", en: "All" },
      /** The filter for what the community suggested or told about. */
      community: { pt: "Comunidade", en: "Community" },
      day: { pt: "Dia", en: "Day" },
      date: { pt: "Data", en: "Date" },
      idea: { pt: "Ideia de", en: "Idea by" },
      reported: { pt: "Avisado por", en: "Reported by" },
      see: { pt: "Ver", en: "See" },
      watch: { pt: "Assistir", en: "Watch" },
      none: { pt: "Nada com essa marca ainda.", en: "Nothing with this tag yet." },
    },
  },

  backstage: {
    title: { pt: "Bastidores", en: "Behind the scenes" },
    description: {
      pt: "Como a marca, a live e o site são feitos.",
      en: "How the brand, the stream and the site are made.",
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
