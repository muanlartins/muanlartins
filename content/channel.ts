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
  /** Under the live's block: the other places, none of them live. */
  where: {
    youtube: { pt: "Vídeos", en: "Videos" },
    discord: { pt: "Pra conversar", en: "To talk" },
    agenda: { pt: "Calendário", en: "Calendar" },
  },
  /** The home's first block: the live on Twitch now, or a countdown to the next. */
  next: {
    title: { pt: "Próxima live", en: "Next stream" },
    onAir: { pt: "Ao vivo agora", en: "Live now" },
    watch: { pt: "Assistir aqui", en: "Watch here" },
    open: { pt: "Abrir na Twitch", en: "Open on Twitch" },
    follow: { pt: "Seguir na Twitch", en: "Follow on Twitch" },
    /** For screen readers, before the time left: "Próxima live em 2 dias e 3 horas". */
    countdown: { pt: "Próxima live em", en: "Next stream in" },
    /** The agenda's time has come but Twitch isn't live yet. */
    soon: { pt: "A qualquer momento", en: "Any moment now" },
    none: { pt: "Nenhuma live marcada nos próximos dias.", en: "No stream scheduled in the coming days." },
    error: { pt: "Não deu pra carregar a agenda agora.", en: "The schedule couldn't be loaded right now." },
    retry: { pt: "Tentar de novo", en: "Try again" },
  },

  /** The tiles of the channel's other pages, each with a line under its picture. */
  more: {
    title: { pt: "Mais do canal", en: "More of the channel" },
    profile: { pt: "Monta o seu torcedor pra arquibancada.", en: "Build your fan for the stand." },
    pix: { pt: "Sua mensagem na tela, na voz que você escolher.", en: "Your message on screen, in the voice you pick." },
    minigames: { pt: "Duelo e corrida de bolinhas com o chat.", en: "Ball duels and races with the chat." },
    agenda: { pt: "Quando é cada live, dia a dia.", en: "When each stream is, day by day." },
    /** "Última: 17/11 · Rocket League". */
    lives: { pt: "Última: {d}", en: "Latest: {d}" },
    livesNone: { pt: "As lives inteiras, com capítulos.", en: "Every stream in full, with chapters." },
    mural: { pt: "Quem manda Pix e quem mais assiste.", en: "Who sends a Pix and who watches the most." },
    commands: { pt: "O que dá pra fazer pelo chat.", en: "What you can do from the chat." },
    sigma: { pt: "Os pontos de quem assiste: como ganhar e pra que servem.", en: "The points of whoever watches: how to earn them and what they're for." },
    backstage: { pt: "Como a marca, a live e o site são feitos.", en: "How the brand, the stream and the site are made." },
    /** "Novo: Estatísticas da partida na tela". */
    roadmap: { pt: "Novo: {t}", en: "New: {t}" },
    roadmapNone: { pt: "O que vem por aí e o que já saiu.", en: "What's coming and what's out." },
    /** Over the latest feature's picture. */
    latest: { pt: "Novo", en: "New" },
  },

  lives: {
    title: { pt: "Lives", en: "Streams" },
    description: {
      pt: "A de agora, as próximas e as anteriores inteiras, com capítulos, partidas e transcrição.",
      en: "The one on now, the next ones and every past stream in full, with chapters, matches and a transcript.",
    },
    past: { pt: "Lives anteriores", en: "Past streams" },
    /** The past lives' list when it has none yet. */
    noPast: {
      pt: "Nenhuma live por aqui ainda. Cada uma aparece quando sai inteira no YouTube.",
      en: "No streams here yet. Each one shows up once it's out in full on YouTube.",
    },
    /** When the lives are; the times themselves are the agenda Luan edits at /canal/agenda (lib/agenda.ts). */
    agenda: {
      title: { pt: "Agenda", en: "Schedule" },
      zone: { pt: "Horário de Brasília", en: "Brasília time" },
      next: { pt: "Próxima live", en: "Next stream" },
      /** After the zone, when the viewer's clock differs: "em Lisboa, 3h a mais". */
      ahead: { pt: "em {city}, {n} a mais", en: "{n} ahead in {city}" },
      behind: { pt: "em {city}, {n} a menos", en: "{n} behind in {city}" },
      /** The live on air, by the agenda's clock. */
      now: { pt: "agora", en: "now" },
      onAir: { pt: "Ao vivo agora", en: "Live now" },
      /** Under the next live's day and time: "Até 16h30 · Rocket League". */
      until: { pt: "Até {end}", en: "Until {end}" },
      /** Badges beside a live in the week: the next one, the one on air. */
      nextBadge: { pt: "Próxima", en: "Next" },
      onAirBadge: { pt: "Ao vivo", en: "Live" },
      today: { pt: "hoje", en: "today" },
      tomorrow: { pt: "amanhã", en: "tomorrow" },
      /** A day with no live. */
      none: { pt: "Sem live", en: "No stream" },
      /** The lives page's line while the channel is offline: "A próxima é segunda-feira, 21h, de Valorant." */
      offline: { pt: "Não estou ao vivo agora.", en: "I'm not live right now." },
      nextIs: { pt: "A próxima é {when}, de {game}.", en: "The next one is {when}, {game}." },
      /** The live's time came and the stream isn't up yet. */
      startingNow: { pt: "A live de {game} já vai começar.", en: "The {game} stream is about to start." },
      empty: {
        pt: "Nenhuma live marcada nesses dias. Quando eu marcar, ela aparece aqui.",
        en: "No stream scheduled for these days. When I plan one, it shows up here.",
      },
      unavailable: { pt: "Não deu pra carregar a agenda agora.", en: "The schedule couldn't be loaded right now." },
      /** The browser couldn't ask for the agenda, so the one shown is the site's last release's. */
      stale: {
        pt: "Não deu pra buscar a agenda de agora: essa pode estar desatualizada.",
        en: "Couldn't fetch the current schedule: this one may be out of date.",
      },
      full: { pt: "Ver a agenda", en: "See the schedule" },
      subscribe: { pt: "Adicionar à sua agenda", en: "Add to your calendar" },
      subscribeHint: {
        pt: "Cada live entra no seu calendário e muda sozinha quando eu mudo aqui.",
        en: "Each stream goes into your calendar and changes by itself when I change it here.",
      },
      google: { pt: "Google Agenda", en: "Google Calendar" },
      otherApps: { pt: "Apple e outros", en: "Apple and others" },
      /** The calendar's name, and each event's with its game after a colon. */
      calendar: { pt: "Live do muanlartins", en: "muanlartins live" },
    },
  },
  games: {
    title: { pt: "Jogos", en: "Games" },
    /** Before each game's next live in the agenda. */
    next: { pt: "Próxima live", en: "Next stream" },
  },

  pix: {
    title: { pt: "Pix na live", en: "Pix on the live" },
  },

  mural: {
    title: { pt: "Mural", en: "Mural" },
  },

  profile: {
    title: { pt: "Perfil", en: "Profile" },
  },

  /** /canal/agenda: the lives' calendar, which the channel's account plans right there. */
  agenda: {
    title: { pt: "Agenda", en: "Schedule" },
    description: {
      pt: "Quando é cada live, de qual jogo e o que vai rolar, dia a dia.",
      en: "When each stream is, of which game and what's on, day by day.",
    },
    /** The week shown: the first one, then its dates ("28/11 a 04/12"). */
    week: { pt: "Próximos 7 dias", en: "Next 7 days" },
    weekRange: { pt: "{from} a {to}", en: "{from} to {to}" },
    previous: { pt: "Dias anteriores", en: "Earlier days" },
    next: { pt: "Próximos dias", en: "Later days" },
    upNext: { pt: "Próxima live", en: "Next stream" },
    goals: { pt: "Meta do Pix", en: "Pix goal" },
    seeMural: { pt: "Ver o mural", en: "See the mural" },
    after: { pt: "Depois", en: "Then" },
    /** A goal's first and last day, on the day it happens: "Começa a meta Natal". */
    goalStartsDay: { pt: "Começa a meta", en: "The goal starts:" },
    goalEndsDay: { pt: "Último dia da meta", en: "Last day of the goal" },
  },

  /** /canal/comandos: every way to take part in the live from the chat. The commands themselves, with what each does,
   * are public/stream/comandos.json (also the chat bot's answers and the Twitch panel). A documentation page. */
  comandos: {
    title: { pt: "Comandos", en: "Commands" },
    description: {
      pt: "Tudo o que dá pra fazer na live pelo chat: mexer o seu torcedor, votar no VAR, perguntar pro bot e trocar os pontos do canal da Twitch.",
      en: "Everything you can do on the stream from the chat: move your fan, vote on the VAR, ask the bot and spend Twitch's channel points.",
    },
    /** The facts under the title. */
    meta: {
      commands: { pt: "Comandos", en: "Commands" },
      rewards: { pt: "Recompensas", en: "Rewards" },
    },
    /** The lists' column heads. */
    head: {
      command: { pt: "Comando", en: "Command" },
      does: { pt: "O que faz", en: "What it does" },
      reward: { pt: "Recompensa", en: "Reward" },
      cost: { pt: "Custo", en: "Cost" },
    },
    /** Before a command's other spellings: "também !dança". */
    also: { pt: "também", en: "also" },
    /** Under the stand's commands: try them on the sample fans. */
    tryIt: { pt: "Escolhe um comando pra ver.", en: "Pick a command to see it." },
    /** The sample fan in the middle, who does what's picked. */
    you: { pt: "você", en: "you" },
    /** The sample fan's shout for !grito. */
    shout: { pt: "bora Luan!", en: "let's go!" },
    points: { pt: "pontos", en: "points" },
    /** Under the rewards: they're Twitch's points, not Σ. */
    notSigma: {
      pt: "São os pontos da Twitch, não os Σ: trocar uma recompensa não gasta nem dá Σ.",
      en: "These are Twitch's points, not Σ: a reward neither spends nor earns Σ.",
    },
    profile: {
      text: { pt: "O seu torcedor é do jeito que você montar.", en: "Your fan looks the way you build it." },
      cta: { pt: "Montar o meu", en: "Build mine" },
    },
    /** The way to Σ's own page, at the end. */
    sigma: {
      title: { pt: "Σ, os pontos do site", en: "Σ, the site's points" },
      text: {
        pt: "Você ganha assistindo, acertando o VAR e mandando Pix. Como ganhar, os ranks e pra que servem estão na página deles.",
        en: "You earn them by watching, getting the VAR right and sending Pix. How to earn them, the ranks and what they're for are on their page.",
      },
      cta: { pt: "Ver os Σ", en: "See Σ" },
    },
  },

  /** /canal/sigma: Σ, the site's points (public/stream/sigma.js): how they come, the ranks they make, what they're for and
   * where to see them. A documentation page, linked from the commands and the profile. Copy is a draft for Luan. Σ lock
   * nothing (Luan, 2026-11-23): never "o que eles liberam"; exclusive items may come later, named only once they exist. */
  sigma: {
    title: { pt: "Σ, os pontos do site", en: "Σ, the site's points" },
    description: {
      pt: "Você ganha assistindo às lives. Eles nunca se gastam nem se perdem e viram o seu rank no canal.",
      en: "You earn them watching the streams. They're never spent or lost, and they become your rank on the channel.",
    },
    meta: {
      ways: { pt: "Jeitos de ganhar", en: "Ways to earn" },
      ranks: { pt: "Ranks", en: "Ranks" },
    },
    earn: {
      title: { pt: "Como ganhar", en: "How to earn them" },
      head: { amount: { pt: "Quanto", en: "How many" }, how: { pt: "Como", en: "How" } },
      twitch: {
        pt: "Os pontos do canal da Twitch são outra coisa: viram sons e efeitos na live e não dão Σ.",
        en: "Twitch's channel points are something else: they become sounds and effects on the stream and give no Σ.",
      },
      rewards: { pt: "Ver as recompensas", en: "See the rewards" },
    },
    ranks: {
      title: { pt: "Os ranks", en: "The ranks" },
      text: {
        pt: "Os Σ viram os ranks do Rocket League. Cada um tem três divisões até o próximo, e o topo leva cerca de um ano de lives.",
        en: "Σ become Rocket League's ranks. Each has three divisions before the next, and the top takes about a year of streams.",
      },
      /** On each rank: "a partir de 370 Σ". */
      from: { pt: "a partir de", en: "from" },
      /** "{n}": where Valorant's Gold 1 starts. */
      valorant: {
        pt: "Na cena do Valorant, os mesmos Σ aparecem nos ranks do Valorant: o Ouro 1 também começa em {n} Σ.",
        en: "In Valorant's scene, the same Σ show as Valorant's ranks: Gold 1 also starts at {n} Σ.",
      },
    },
    uses: {
      title: { pt: "Pra que servem", en: "What they're for" },
      rank: {
        term: { pt: "Rank e emblema", en: "Rank and emblem" },
        text: {
          pt: "O emblema do seu rank aparece do lado do seu nome, na arquibancada e no seu cartão.",
          en: "Your rank's emblem shows by your name, in the stand and on your card.",
        },
      },
      /** The stand's 20 places: the most Σ in front and, with more in the chat, seated first (Luan, 2026-11-24). */
      stand: {
        term: { pt: "Lugar na arquibancada", en: "A place in the stand" },
        text: {
          pt: "Quem tem mais Σ fica mais na frente. São 20 lugares: com mais gente no chat, eles ficam com quem tem mais Σ.",
          en: "Whoever has more Σ stands further in front. There are 20 places: with more people in the chat, they go to whoever has the most Σ.",
        },
      },
      ranking: {
        term: { pt: "Ranking da torcida", en: "The crowd's ranking" },
        text: {
          pt: "No mural, a torcida em ordem de Σ, com pódio pros três primeiros.",
          en: "On the mural, the crowd in order of Σ, with a podium for the top three.",
        },
      },
      games: {
        term: { pt: "Minijogos", en: "Minigames" },
        text: {
          pt: "O acabamento da sua bolinha na corrida segue o seu rank, e no duelo de bolinhas, se você não escolher o visual da arma, ele também segue. Só muda a aparência.",
          en: "Your weapon's look in the ball duel and your marble's finish in the race follow your rank. Only the looks change.",
        },
      },
      dedication: {
        term: { pt: "Gol dedicado", en: "Dedicated goals" },
        text: {
          pt: "Quanto mais Σ, mais chance de um gol ser dedicado a você. Quem chegou agora também tem a sua.",
          en: "The more Σ, the better your chance of a goal dedicated to you. Newcomers get theirs too.",
        },
      },
      discord: {
        term: { pt: "Cargo no Discord", en: "A role on Discord" },
        text: {
          pt: "Conectando o Discord no seu perfil, o seu rank vira cargo no servidor.",
          en: "Connect Discord on your profile and your rank becomes a role on the server.",
        },
      },
      /** Under the list: nothing waits for Σ. */
      free: {
        pt: "Montar o torcedor e o cartão, com qualquer cor, é pra todo mundo, sem precisar de Σ. Mais pra frente, os Σ podem liberar umas coisas exclusivas.",
        en: "Building your fan and card, in any colour, is for everyone, no Σ needed. Later on, Σ may unlock a few exclusive things.",
      },
    },
    where: {
      title: { pt: "Onde ver os seus", en: "Where to see yours" },
      chat: {
        pt: "No chat: os seus Σ, o rank e quanto falta pro próximo. Com @alguém, os de outra pessoa.",
        en: "In the chat: your Σ, your rank and how far the next one is. With @someone, theirs.",
      },
      profile: {
        term: { pt: "Perfil", en: "Profile" },
        text: { pt: "Os seus Σ, o caminho até o próximo rank e as suas medalhas.", en: "Your Σ, the way to the next rank and your badges." },
      },
      page: {
        term: { pt: "A sua página", en: "Your page" },
        text: { pt: "Tudo seu no site, pra qualquer um ver, em /torcedor/seu-login.", en: "Everything of yours on the site, for anyone to see, at /torcedor/your-login." },
      },
      mural: {
        term: { pt: "Mural", en: "Mural" },
        text: { pt: "O ranking de quem mais assiste, na aba Torcida.", en: "The ranking of who watches most, in the Torcida tab." },
      },
      medals: {
        pt: "As medalhas contam outra coisa: horas e lives assistidas, lives seguidas e reais em Pix, em oito níveis cada.",
        en: "Badges count something else: hours and streams watched, streams in a row and reais sent by Pix, eight levels each.",
      },
    },
  },

  /** /canal/minijogos: the games between the matches, played by whoever is in the chat: the ball duel (lib/duelo.ts)
   * and the marble race (lib/corrida.ts); your ball, the rankings, the fights with their replays and the numbers by
   * class. Copy is a draft for Luan. */
  minijogos: {
    title: { pt: "Minijogos", en: "Minigames" },
    description: {
      pt: "Os jogos da live entre as partidas, com quem está no chat.",
      en: "The stream's games between matches, with whoever is in the chat.",
    },
    /** The page's own index, under its intro. */
    index: {
      label: { pt: "Nesta página", en: "On this page" },
      duel: { pt: "Duelo", en: "Duel" },
      race: { pt: "Corrida", en: "Race" },
      ranking: { pt: "Ranking", en: "Ranking" },
      fights: { pt: "Lutas", en: "Fights" },
      stats: { pt: "Estatísticas", en: "Stats" },
    },
    how: { pt: "Como funciona", en: "How it works" },
    idea: { pt: "Ideia de", en: "Idea by" },
    /** The marble race (lib/corrida.ts). */
    race: {
      title: { pt: "Corrida de bolinhas", en: "Marble race" },
      short: { pt: "Todo mundo do chat numa pista 3D cheia de obstáculos.", en: "Everyone in the chat on a 3D track full of obstacles." },
      /** Under "Como funciona", a line each. */
      how: [
        { pt: "Entre as partidas, todo mundo do chat corre, até 40 por corrida. O duelo e a corrida revezam.", en: "Between matches, everyone in the chat races, up to 40 a race. The duel and the race take turns." },
        { pt: "A pista é nova a cada corrida. Caiu, volta pro começo do trecho de onde caiu.", en: "The track is new every race. Fall off, and you go back to the start of that stretch." },
        { pt: "Vale só pelo registro: a corrida não dá Σ.", en: "It's only for the record: the race gives no Σ." },
      ],
      player: {
        /** "Replay: 12 on the track · 17/11". */
        replay: { pt: "Replay: {n} na pista · {d}", en: "Replay: {n} on the track · {d}" },
        demo: { pt: "Uma corrida de exemplo, até sair a primeira na live", en: "A sample race, until the first one on the stream" },
      },
      yours: {
        title: { pt: "Sua bolinha", en: "Your marble" },
        text: {
          pt: "Feita do seu torcedor: as cores e a estampa da camisa. Seus Σ só deixam ela mais bonita.",
          en: "Made from your fan: the shirt's colours and pattern. Your Σ only make it prettier.",
        },
        edit: { pt: "Mudar o torcedor", en: "Change my fan" },
      },
      finish: {
        title: { pt: "Acabamento pelo rank", en: "Finish by rank" },
        plain: { pt: "vidro", en: "glass" },
        glow: { pt: "brilha", en: "glows" },
        trail: { pt: "deixa rastro", en: "leaves a trail" },
        sparks: { pt: "faísca", en: "sparkles" },
        colours: { pt: "muda de cor", en: "changes colour" },
      },
      total: { pt: "{n} corridas registradas", en: "{n} races recorded" },
      wins: { pt: "vitórias", en: "wins" },
      podiums: { pt: "pódios", en: "podiums" },
      races: { pt: "corridas", en: "races" },
      latest: { pt: "Últimas corridas", en: "Latest races" },
      of: { pt: "{n} na pista", en: "{n} on the track" },
      old: { pt: "pista antiga, em 2D", en: "old 2D track" },
      none: { pt: "Nenhuma corrida registrada ainda. A primeira sai na próxima conversa da live.", en: "No race recorded yet. The first one comes in the stream's next talk." },
      unavailable: { pt: "Não deu pra carregar as corridas agora.", en: "The races couldn't be loaded right now." },
      replayTitle: { pt: "Corrida de {d}", en: "Race of {d}" },
    },
    duel: {
      title: { pt: "Duelo de bolinhas", en: "Ball duel" },
      short: { pt: "Bolinhas com armas que crescem a cada acerto. Escolhe a sua classe.", en: "Balls with weapons that grow with every hit. Pick your class." },
      /** Under "Como funciona", a line each. */
      how: [
        { pt: "Entre as partidas, dois do chat são sorteados e se enfrentam, um duelo por vez. Sozinho no chat, você enfrenta a bolinha do canal.", en: "Between matches, two from the chat are drawn and fight, one duel at a time. Alone in the chat, you face the channel's ball." },
        { pt: "Todo mundo tem a mesma força: seus Σ só deixam a arma mais bonita. Quem tem mais Σ tem um pouco mais de chance de ser sorteado.", en: "Everyone is equally strong: your Σ only make the weapon prettier. More Σ is a little more chance of being drawn." },
        { pt: "No chat, !duelo mostra as suas vitórias.", en: "In the chat, !duelo shows your wins." },
      ],
    },
    yours: {
      signInNote: {
        pt: "Pra escolher a classe e o visual da sua bolinha. Sem entrar, ela luta com uma classe sorteada a cada duelo.",
        en: "To pick your ball's class and look. Without signing in, it fights with a class drawn each duel.",
      },
      signedInAs: { pt: "Entrou como", en: "Signed in as" },
      signOut: { pt: "Sair", en: "Sign out" },
      classTitle: { pt: "Classe", en: "Class" },
      random: { pt: "Aleatória", en: "Random" },
      randomText: { pt: "Uma diferente a cada duelo.", en: "A different one each duel." },
      stats: {
        dano: { pt: "Dano", en: "Damage" },
        alcance: { pt: "Alcance", en: "Reach" },
        velocidade: { pt: "Velocidade", en: "Speed" },
        cresce: { pt: "Crescimento", en: "Growth" },
      },
      /** The class's ability in a word, on its sheet. */
      tags: {
        espada: { pt: "Dano crescente", en: "Growing damage" },
        adaga: { pt: "Giro", en: "Spin" },
        arco: { pt: "Flechas", en: "Arrows" },
        lanca: { pt: "Alcance", en: "Reach" },
        machado: { pt: "Crítico", en: "Critical" },
        foice: { pt: "Veneno", en: "Poison" },
        punho: { pt: "Velocidade", en: "Speed" },
        martelo: { pt: "Embalo", en: "Momentum" },
        katana: { pt: "Cortes", en: "Slices" },
        clava: { pt: "Atordoar", en: "Stun" },
      },
      classes: {
        espada: { name: { pt: "Espada", en: "Sword" }, text: { pt: "Cada acerto, +1 de dano.", en: "Every hit, +1 damage." } },
        adaga: {
          name: { pt: "Adaga", en: "Dagger" },
          text: { pt: "Gira mais rápido a cada acerto, e quanto mais gira, mais corta.", en: "Spins faster with every hit, and the faster it spins, the harder it cuts." },
        },
        arco: { name: { pt: "Arco", en: "Bow" }, text: { pt: "Atira de longe; cada flecha que acerta, uma a mais.", en: "Shoots from afar; every arrow that lands, one more." } },
        lanca: { name: { pt: "Lança", en: "Spear" }, text: { pt: "A mais longa; cada acerto, mais longa e mais forte.", en: "The longest; every hit, longer and stronger." } },
        machado: { name: { pt: "Machado", en: "Axe" }, text: { pt: "Cada acerto, mais chance de um crítico de 4×.", en: "Every hit, more chance of a 4× critical." } },
        foice: { name: { pt: "Foice", en: "Scythe" }, text: { pt: "Envenena: cada acerto, +1 de veneno (até 5).", en: "Poisons: every hit, +1 poison (up to 5)." } },
        punho: {
          name: { pt: "Punho", en: "Fists" },
          text: { pt: "Acelera sem parar: quanto mais rápido, mais forte o soco.", en: "Never stops speeding up: the faster, the harder the punch." },
        },
        martelo: {
          name: { pt: "Martelo", en: "Hammer" },
          text: { pt: "Pega embalo: quanto mais gira, mais dói. Nada inverte o seu giro.", en: "Builds momentum: the faster it spins, the more it hurts. Nothing turns its swing around." },
        },
        katana: {
          name: { pt: "Katana", en: "Katana" },
          text: { pt: "Cada acerto corta várias vezes; +1 corte por acerto ou defesa.", en: "Every hit slices several times; +1 slice per hit or parry." },
        },
        clava: { name: { pt: "Clava", en: "Club" }, text: { pt: "Atordoa: quem apanha fica parado, sem arma.", en: "Stuns: whoever gets hit stands still, weaponless." } },
      },
      materialTitle: { pt: "Visual da arma", en: "Weapon look" },
      auto: { pt: "O do meu rank", en: "My rank's" },
      metal: { pt: "só o metal", en: "just the metal" },
      /** "Próximo visual: Diamante, com 2.000 Σ (você tem 1.000)." */
      next: { pt: "Próximo visual: {nome}, com {n} Σ (você tem {s}).", en: "Next look: {nome}, at {n} Σ (you have {s})." },
      /** "Libera com 900 Σ". */
      locked: { pt: "Libera com {n} Σ", en: "Unlocks at {n} Σ" },
      effects: {
        brilho: { pt: "brilha", en: "glows" },
        rastro: { pt: "deixa rastro", en: "leaves a trail" },
        faiscas: { pt: "solta faíscas", en: "throws sparks" },
        arco: { pt: "muda de cor", en: "changes colour" },
      },
      save: { pt: "Salvar", en: "Save" },
      signInToSave: { pt: "Entrar com a Twitch pra salvar", en: "Sign in with Twitch to save" },
      saving: { pt: "Salvando…", en: "Saving…" },
      saved: { pt: "Salvo. Vale a partir do próximo duelo.", en: "Saved. It counts from the next duel." },
      reset: { pt: "Voltar ao padrão", en: "Back to default" },
      error: { pt: "Não deu pra salvar. Tenta de novo.", en: "It couldn't be saved. Try again." },
      expired: { pt: "A Twitch pediu pra você entrar de novo.", en: "Twitch asked you to sign in again." },
    },
    player: {
      preview: { pt: "Prévia: sua bolinha contra a do canal", en: "Preview: your ball against the channel's" },
      /** Signed in as the channel itself. */
      previewChannel: { pt: "Prévia: a bolinha do canal contra a de um torcedor", en: "Preview: the channel's ball against a fan's" },
      /** The other side's name in the channel's preview. */
      fan: { pt: "torcedor", en: "fan" },
      you: { pt: "você", en: "you" },
    },
    record: {
      title: { pt: "Seu histórico", en: "Your record" },
      wins: { pt: "vitórias", en: "wins" },
      fights: { pt: "duelos", en: "duels" },
      rate: { pt: "de aproveitamento", en: "win rate" },
      place: { pt: "no ranking", en: "in the ranking" },
      /** The channel's ball stays out of the ranking. */
      outside: { pt: "fora do ranking", en: "out of the ranking" },
      latest: { pt: "Suas últimas lutas", en: "Your latest fights" },
      won: { pt: "Vitória", en: "Win" },
      lost: { pt: "Derrota", en: "Loss" },
      none: {
        pt: "Você ainda não lutou. Fica no chat com a live no ar: o sorteio pode chamar você a qualquer hora.",
        en: "You haven't fought yet. Stay in the chat while the stream is on: the draw may call you any time.",
      },
      unavailable: { pt: "Não deu pra carregar o seu histórico agora.", en: "Your record couldn't be loaded right now." },
    },
    ranking: {
      title: { pt: "Ranking", en: "Ranking" },
      duel: { pt: "Duelo", en: "Duel" },
      race: { pt: "Corrida", en: "Race" },
      duelNote: { pt: "Mais vitórias primeiro; no empate, o melhor aproveitamento.", en: "Most wins first; on a tie, the best win rate." },
      raceNote: { pt: "Mais vitórias primeiro; no empate, mais pódios.", en: "Most wins first; on a tie, more podiums." },
      /** "{n} duelos registrados". */
      total: { pt: "{n} duelos registrados", en: "{n} duels recorded" },
      empty: {
        pt: "Nenhum duelo registrado ainda. Os primeiros saem na próxima live.",
        en: "No duel recorded yet. The first ones come in the next stream.",
      },
      channel: {
        pt: "A bolinha do canal, que enfrenta quem está sozinho no chat: {v} em {p}.",
        en: "The channel's ball, which fights whoever is alone in the chat: {v} of {p}.",
      },
      unavailable: { pt: "Não deu pra carregar os duelos agora.", en: "The duels couldn't be loaded right now." },
      showAll: { pt: "Ver todos", en: "Show everyone" },
      showLess: { pt: "Ver menos", en: "Show fewer" },
      you: { pt: "você", en: "you" },
    },
    fights: {
      title: { pt: "Lutas", en: "Fights" },
      description: { pt: "As melhores e as mais recentes, cada uma com o replay.", en: "The best and the latest, each with its replay." },
      best: { pt: "Melhores lutas", en: "Best fights" },
      /** "Entre as últimas 100 lutas". */
      among: { pt: "Entre as últimas {n} lutas", en: "Among the latest {n} fights" },
      latest: { pt: "Últimas lutas", en: "Latest fights" },
      /** Why a fight is among the best: its title and a line with its number. */
      why: {
        virada: { title: { pt: "A maior virada", en: "The biggest comeback" }, line: { pt: "Venceu depois de estar {p}% de vida atrás", en: "Won after being {p}% of life behind" } },
        detalhe: { title: { pt: "No detalhe", en: "Down to the wire" }, line: { pt: "Venceu com {p}% de vida", en: "Won with {p}% of life left" } },
        disputada: { title: { pt: "A mais disputada", en: "The closest fought" }, line: { pt: "A liderança trocou de lado {n} vezes", en: "The lead changed sides {n} times" } },
        longa: { title: { pt: "A mais longa", en: "The longest" }, line: { pt: "{s} s de luta", en: "{s} s of fighting" } },
      },
      knockout: { pt: "nocaute em {s} s", en: "knockout in {s} s" },
      time: { pt: "no tempo", en: "on time" },
      draw: { pt: "no sorteio", en: "by lot" },
      /** Beside a class its viewer picked (the rest were drawn). */
      picked: { pt: "escolhida", en: "picked" },
      /** The crown by the winner's name, for screen readers. */
      won: { pt: "venceu", en: "won" },
      watch: { pt: "Assistir", en: "Watch" },
      old: { pt: "regras antigas", en: "old rules" },
      /** The replay's dialog: "comehomens contra neilahm". */
      replayTitle: { pt: "{a} contra {b}", en: "{a} against {b}" },
      close: { pt: "Fechar", en: "Close" },
      empty: { pt: "Nenhuma luta registrada ainda. As primeiras saem na próxima live.", en: "No fight recorded yet. The first ones come in the next stream." },
    },
    stats: {
      title: { pt: "Estatísticas", en: "Stats" },
      /** "As classes nas últimas 100 lutas, e quem mais luta." */
      description: { pt: "As classes nas últimas {n} lutas, e quem mais luta.", en: "The classes in the latest {n} fights, and who fights the most." },
      classes: { pt: "As classes", en: "The classes" },
      used: { pt: "Mais usadas", en: "Most used" },
      wins: { pt: "Vitórias", en: "Wins" },
      length: { pt: "Duração", en: "Length" },
      /** "Em 60 lutas · 100% sorteadas". */
      usedNote: { pt: "Quantas vezes cada uma lutou. {p}% foram sorteadas, sem escolha.", en: "How many times each fought. {p}% were drawn, not picked." },
      winsNote: { pt: "A linha é 50%. Mais claras: menos de 5 lutas, pouco pra dizer.", en: "The line is 50%. Paler: fewer than 5 fights, too few to tell." },
      lengthNote: { pt: "Quanto dura, em média, uma luta com cada uma.", en: "How long a fight with each lasts, on average." },
      /** "3 de 5" beside a share. */
      of: { pt: "{v} de {p}", en: "{v} of {p}" },
      fighters: { pt: "Quem mais lutou", en: "Who fought the most" },
      rate: { pt: "Melhor aproveitamento", en: "Best win rate" },
      rateNote: { pt: "Com {n} duelos ou mais.", en: "With {n} duels or more." },
    },
  },

  /**
   * /torcedor/<login>: a viewer's page and card (lib/viewer.ts), everything of theirs in one place, as showcases. Copy is
   * a draft for Luan.
   */
  viewer: {
    title: { pt: "Torcedor", en: "Fan" },
    /** "{login}" is theirs. */
    description: {
      pt: "{login} na torcida do muanlartins: o torcedor, os Σ, as medalhas, os duelos, os Pix e as partidas comigo.",
      en: "{login} in muanlartins' crowd: their fan, Σ, medals, duels, Pix and matches with me.",
    },
    since: { pt: "Na torcida desde {date}", en: "In the crowd since {date}" },
    sinceStart: { pt: "Na torcida desde o começo", en: "In the crowd from the start" },
    never: { pt: "Ainda sem Σ", en: "No Σ yet" },
    open: { pt: "Ver página", en: "See page" },
    mine: { pt: "Sua página. As vitrines vazias só aparecem pra você, com o jeito de encher.", en: "Your page. Empty showcases show only to you, with how to fill them." },
    edit: { pt: "Editar perfil", en: "Edit profile" },
    about: { pt: "Sobre mim", en: "About me" },
    next: { pt: "Próximo:", en: "Next:" },
    /** "{n}" lives in a row now. */
    streakChip: { pt: "{n} lives seguidas", en: "{n} lives in a row" },
    takeDown: { pt: "Tirar {what}", en: "Take down {what}" },
    takeDownConfirm: { pt: "Tirar mesmo? Clica de novo", en: "Take it down? Click again" },
    banner: { pt: "banner", en: "banner" },
    photo: { pt: "foto", en: "photo" },
    twitch: { pt: "Na Twitch", en: "On Twitch" },
    /** Someone else's page with nothing in any showcase. */
    empty: { pt: "Nada nas vitrines ainda. Elas enchem com as lives, os duelos e os Pix.", en: "Nothing in the showcases yet. They fill with the lives, the duels and the Pix." },
    loadError: { pt: "Não deu pra carregar.", en: "Couldn't load." },
    more: { pt: "Ver todos ({n})", en: "See all ({n})" },
    less: { pt: "Ver menos", en: "See less" },
    stats: {
      title: { pt: "Σ e medalhas", en: "Σ and medals" },
      /** "{n}" Σ to "{rank}". */
      toNext: { pt: "{n} Σ pro {rank}", en: "{n} Σ to {rank}" },
      top: { pt: "Rank mais alto", en: "Top rank" },
      none: { pt: "Os seus Σ, os pontos do site, começam na próxima live em que você estiver no chat.", en: "Your Σ, the site's points, start in the next live you're in the chat for." },
    },
    lives: {
      title: { pt: "Nas lives", en: "In the lives" },
      /** "{n}" goals dedicated. */
      goals: { pt: "{n} gols dedicados", en: "{n} goals dedicated" },
      goal: { pt: "Gol dedicado", en: "Goal dedicated" },
      win: { pt: "Vitória dedicada", en: "Win dedicated" },
      sub: { pt: "Ganhou um sub de presente", en: "Won a gift sub" },
      subGoal: { pt: "na meta {goal}", en: "in the goal {goal}" },
      none: {
        pt: "A cada gol (no Valorant, a cada vitória), a arquibancada sorteia alguém do chat pra dedicar. Os seus aparecem aqui, com os subs de presente que você ganhar.",
        en: "Each goal (in Valorant, each win) the stand draws someone from the chat to dedicate it to. Yours show here, with the gift subs you win.",
      },
    },
    loadout: {
      title: { pt: "Loadout dos sonhos", en: "Dream loadout" },
      count: { pt: "{n} de {t} armas", en: "{n} of {t} weapons" },
      none: { pt: "Escolhe a skin de cada arma entre todas do Valorant e o seu loadout aparece aqui.", en: "Pick a skin for each weapon from all of Valorant's, and your loadout shows here." },
      build: { pt: "Montar o meu", en: "Build mine" },
      edit: { pt: "Editar o meu", en: "Edit mine" },
      see: { pt: "Ver no inventário", en: "See it in the inventory" },
    },
    duel: {
      title: { pt: "Duelos", en: "Duels" },
      record: { pt: "{w} vitórias em {n} duelos", en: "{w} wins in {n} duels" },
      position: { pt: "{p}º no ranking", en: "#{p} in the ranking" },
      won: { pt: "Venceu", en: "Won" },
      lost: { pt: "Perdeu", en: "Lost" },
      against: { pt: "contra", en: "against" },
      replay: { pt: "Assistir", en: "Watch" },
      replayOf: { pt: "Duelo contra {name}", en: "Duel against {name}" },
      close: { pt: "Fechar", en: "Close" },
      none: { pt: "Os duelos sorteiam 2 do chat da live. Os seus aparecem aqui, com o replay de cada um.", en: "The duels draw 2 from the live's chat. Yours show here, each with its replay." },
      pick: { pt: "Escolher a minha bolinha", en: "Pick my ball" },
      ball: { pt: "Bolinha", en: "Ball" },
      random: { pt: "Sorteada", en: "Drawn" },
    },
    race: {
      title: { pt: "Corridas", en: "Races" },
      record: { pt: "{w} vitórias · {p} pódios em {n} corridas", en: "{w} wins · {p} podiums in {n} races" },
      best: { pt: "melhor: {b}º", en: "best: #{b}" },
      place: { pt: "{l}º de {n}", en: "#{l} of {n}" },
      replayOf: { pt: "Corrida de {date}", en: "Race of {date}" },
      none: { pt: "Todo mundo do chat corre na corrida de bolinhas. As suas aparecem aqui, com o replay.", en: "Everyone in the chat runs the marble race. Yours show here, with the replay." },
    },
    pix: {
      title: { pt: "Pix", en: "Pix" },
      outside: { pt: "Fora de meta", en: "Outside any goal" },
      none: { pt: "Manda um Pix na live e a sua mensagem fica aqui.", en: "Send a Pix on the live and your message stays here." },
      send: { pt: "Mandar um Pix", en: "Send a Pix" },
    },
    ideas: {
      title: { pt: "Ideias", en: "Ideas" },
      idea: { pt: "Ideia", en: "Idea" },
      report: { pt: "Avisou", en: "Reported" },
      soon: { pt: "Vem aí", en: "Coming" },
      none: { pt: "Uma ideia sua que vira coisa no canal aparece aqui, com o seu nome. Manda no chat ou no Discord.", en: "An idea of yours that becomes part of the channel shows here, with your name. Send it in the chat or on Discord." },
    },
    matches: {
      title: { pt: "Partidas comigo", en: "Matches with me" },
      summary: { pt: "{n} partidas · {w} vitórias", en: "{n} matches · {w} wins" },
      win: { pt: "Vitória", en: "Win" },
      loss: { pt: "Derrota", en: "Loss" },
      draw: { pt: "Empate", en: "Draw" },
      watch: { pt: "Assistir", en: "Watch" },
      none: { pt: "Joga comigo nas ranqueadas e a partida aparece aqui.", en: "Play ranked with me and the match shows here." },
    },
    notFound: { pt: "Esse nome não parece um login da Twitch.", en: "That doesn't look like a Twitch login." },
  },

  /** /canal/roadmap: what comes next and everything released, with credits. Its entries are in content/changelog.ts. */
  roadmap: {
    title: { pt: "Roadmap", en: "Roadmap" },
    description: {
      pt: "O que vem por aí e tudo o que já saiu no canal, no site, na live e nos vídeos, com o crédito de quem deu cada ideia.",
      en: "What comes next and everything already out on the channel, the site, the stream and the videos, credited to whoever had each idea.",
    },
    /** The facts under the title. */
    meta: {
      shipped: { pt: "Já saiu", en: "Out" },
      /** "{n} novidades". */
      count: { pt: "{n} novidades", en: "{n} releases" },
      latest: { pt: "Última", en: "Latest" },
      ideas: { pt: "Ideias da torcida", en: "Ideas from the crowd" },
    },
    community: {
      title: { pt: "Ideias da torcida", en: "Ideas from the crowd" },
      text: {
        pt: "Manda a sua ideia no chat da live ou comenta num vídeo: se ela entrar, o seu nome fica aqui.",
        en: "Say your idea in the stream's chat or comment on a video: if it makes it in, your name stays here.",
      },
      suggested: { pt: "Sugeriu", en: "Suggested" },
      reported: { pt: "Avisou", en: "Reported" },
      comment: { pt: "o comentário", en: "the comment" },
    },
    next: {
      title: { pt: "Próximos passos", en: "Next steps" },
      empty: {
        pt: "Nada na fila agora. A próxima novidade que eu decidir aparece aqui, e pode ser uma ideia sua.",
        en: "Nothing queued right now. The next thing I decide on shows here, and it can be your idea.",
      },
    },
    shipped: {
      title: { pt: "Já saiu", en: "Out" },
      /** "{n} novidades em {d} dias". */
      summary: { pt: "{n} novidades em {d} dias.", en: "{n} releases in {d} days." },
      /** The filters' label. */
      filter: { pt: "Categoria", en: "Category" },
      all: { pt: "Tudo", en: "All" },
      /** The filter for what the crowd suggested or told about. */
      community: { pt: "Da torcida", en: "From the crowd" },
      day: { pt: "Dia", en: "Day" },
      date: { pt: "Data", en: "Date" },
      idea: { pt: "Ideia de", en: "Idea by" },
      reported: { pt: "Avisou", en: "Reported by" },
      see: { pt: "Ver", en: "See" },
      watch: { pt: "Assistir", en: "Watch" },
      none: { pt: "Nada nessa categoria ainda.", en: "Nothing in this category yet." },
    },
  },

  /** /canal/backstage: how the brand, the live and the site are made (brand/), as a documentation page. Copy is a draft
   * for Luan. */
  backstage: {
    title: { pt: "Bastidores", en: "Behind the scenes" },
    description: {
      pt: "Como a marca, a live e o site são feitos.",
      en: "How the brand, the stream and the site are made.",
    },
    /** The day this page last changed: update it with the page. */
    updated: "2026-11-21",
    meta: {
      updated: { pt: "Atualizado em", en: "Updated" },
      code: { pt: "Código", en: "Code" },
    },
    mark: {
      title: { pt: "A marca", en: "The mark" },
      text: {
        pt: "A marca é a minha assinatura: “Luan” num traço só, L, U, A, N, redesenhado numa grade de 45°, em que todo segmento é diagonal ou vertical. Girado 90°, o traço vira um Σ, a soma, o primeiro símbolo que a gente encontra na estatística: é disso que o canal trata, medir como a gente melhora.\n\nDuas cópias, uma girada 180°, se cruzam por cima e por baixo nos quatro cruzamentos. O resultado é um S simétrico que, por baixo, ainda é só “Luan” duas vezes.",
        en: "The mark is my signature: “Luan” in one stroke, L, U, A, N, redrawn on a 45° lattice where every segment is diagonal or vertical. Turned 90°, the stroke reads as a Σ, the sum, the first symbol you meet in statistics: that's what the channel is about, measuring how you get better.\n\nTwo copies, one turned 180°, weave over and under each other at their four crossings. The result is a symmetric S that, underneath, is still just “Luan” twice.",
      },
      alt: { pt: "A marca em branco e Klein claro sobre o Klein", en: "The mark in white and light Klein on Klein" },
    },
    colors: {
      title: { pt: "Cores", en: "Colours" },
      text: {
        pt: "Três cores fazem a marca. O site e a live usam mais algumas, sempre as mesmas.",
        en: "Three colours make the brand. The site and the stream add a few more, always the same.",
      },
      klein: { pt: "O fundo de tudo: o Azul Klein Internacional.", en: "The ground of everything: International Klein Blue." },
      branco: { pt: "A tinta principal, a cópia de cima.", en: "The main ink, the copy on top." },
      kleinClaro: {
        pt: "O destaque, a cópia de baixo: o mesmo azul, mais claro. Só sobre o Klein ou o navy.",
        en: "The accent, the copy underneath: the same blue, lighter. Only on Klein or navy.",
      },
      navy: { pt: "A tinta do site e os painéis escuros.", en: "The site's ink and its dark panels." },
      ground: { pt: "O fundo claro do site.", en: "The site's light ground." },
      win: { pt: "Vitórias.", en: "Wins." },
      loss: { pt: "Derrotas e erros.", en: "Losses and errors." },
      ouro: { pt: "Primeiro lugar, pódios e prêmios, sobre fundo escuro.", en: "First place, podiums and prizes, on dark grounds." },
      head: { name: { pt: "Cor", en: "Colour" }, use: { pt: "Uso", en: "Use" } },
    },
    type: {
      title: { pt: "Tipografia", en: "Type" },
      text: {
        pt: "Space Grotesk, em tudo: no site, nos overlays e nas thumbnails. O nome vai sempre em minúsculas.",
        en: "Space Grotesk, everywhere: the site, the overlays and the thumbnails. The name is always lowercase.",
      },
      /** The site's scale, each size with what it's for. */
      scale: [
        { size: 48, use: { pt: "Título da página", en: "Page title" } },
        { size: 24, use: { pt: "Título de seção", en: "Section title" } },
        { size: 20, use: { pt: "Destaque de um card", en: "A card's lead" } },
        { size: 17, use: { pt: "A linha de abertura", en: "The opening line" } },
        { size: 15, use: { pt: "O texto", en: "The text" } },
        { size: 13, use: { pt: "Dicas e legendas", en: "Hints and captions" } },
        { size: 12, use: { pt: "Rótulos", en: "Labels" }, upper: true },
      ],
    },
    shape: {
      title: { pt: "Forma", en: "Shape" },
      text: {
        pt: "Linhas retas e cortes de 45° em dois cantos opostos, como a simetria de 180° da marca. Nada arredondado: redondo, só o que é redondo.",
        en: "Straight lines and 45° cuts on two opposite corners, like the mark's 180° symmetry. Nothing rounded: only what is round is round.",
      },
      card: { pt: "Card", en: "Card" },
      cardNote: { pt: "corte de 12 px", en: "12 px cut" },
      button: { pt: "Botão", en: "Button" },
      buttonNote: { pt: "corte de 6 px", en: "6 px cut" },
      badge: { pt: "Selo", en: "Badge" },
      badgeNote: { pt: "quadrado", en: "square" },
      round: { pt: "fotos, pontos, a bola", en: "photos, dots, the ball" },
    },
    motifs: {
      title: { pt: "Padrões", en: "Motifs" },
      lattice: {
        term: { pt: "A grade", en: "The lattice" },
        text: {
          pt: "Linhas a ±45°, a cada 24 px: o fundo de tudo o que é Klein, na live e no site. Nunca atrás de texto no fundo claro.",
          en: "Lines at ±45°, 24 px apart: the ground of everything Klein, on the stream and the site. Never behind text on the light ground.",
        },
      },
      streaks: {
        term: { pt: "Os rastros", en: "The streaks" },
        text: {
          pt: "Um traço branco e um Klein claro, meia volta um do outro: movimento, na moldura da câmera e nas transições.",
          en: "A white and a light Klein streak, half a lap apart: movement, on the camera frame and the transitions.",
        },
      },
      plate: {
        term: { pt: "A placa", en: "The plate" },
        text: {
          pt: "Uma aba Klein com um lado cortado, que entra pela diagonal: os rótulos da live, como o nome na câmera e o rank.",
          en: "A Klein tab with one side cut, wiping in along the diagonal: the stream's labels, like the name on the camera and the rank.",
        },
      },
    },
    voice: {
      title: { pt: "A voz", en: "The voice" },
      text: {
        pt: "O canal escreve como eu falo: curto, informal, com “você” e “pra”. Quem fala no site, nos overlays e no bot sou eu. Uma palavra pra cada coisa:",
        en: "The channel writes the way I talk: short, informal, in the first person. One word for each thing:",
      },
      head: { say: { pt: "Diga", en: "Say" }, not: { pt: "Em vez de", en: "Instead of" } },
      words: [
        { say: { pt: "torcedor", en: "torcedor (a fan)" }, not: { pt: "viewer, espectador", en: "viewer" } },
        { say: { pt: "a torcida", en: "a torcida (everyone)" }, not: { pt: "a comunidade, a audiência", en: "the community" } },
        { say: { pt: "partida", en: "partida (a match)" }, not: { pt: "jogo, match", en: "jogo, match" } },
        { say: { pt: "a live", en: "a live (the stream)" }, not: { pt: "transmissão, stream", en: "transmissão" } },
        { say: { pt: "Σ, os pontos do site", en: "Σ, the site's points" }, not: { pt: "pontos do canal (esses são da Twitch)", en: "channel points (Twitch's)" } },
      ],
    },
    stream: {
      title: { pt: "A live por dentro", en: "The live from the inside" },
      text: {
        pt: "Os overlays são páginas deste site, que o OBS abre como fontes de navegador: a moldura da câmera, o chat, a arquibancada, os minijogos.\n\nNo Rocket League, um painel lê as estatísticas pela API do próprio jogo, conta vitórias e derrotas, avisa a arquibancada dos gols e das defesas e corta pra conversa quando a partida acaba. No Valorant, um script lê o cliente da Riot e avisa a arquibancada de cada rodada.",
        en: "The overlays are pages of this site that OBS opens as browser sources: the camera frame, the chat, the stand, the minigames.\n\nIn Rocket League, a panel reads the stats from the game's own API, counts wins and losses, tells the stand about goals and saves and cuts to the talk when the match ends. In Valorant, a script reads Riot's client and tells the stand about every round.",
      },
    },
    after: {
      title: { pt: "Depois da live", en: "After the live" },
      text: {
        pt: "A live inteira vai pro YouTube e ganha uma página aqui, com um capítulo por partida, um resumo e a transcrição do que eu falei, feita pelo Whisper. E partidas da live viram vídeos próprios no YouTube.",
        en: "The whole live goes to YouTube and gets a page here, with a chapter per match, a summary and a transcript of what I said, made by Whisper. And matches from the live become videos of their own on YouTube.",
      },
    },
    site: {
      title: { pt: "O site", en: "The site" },
      text: {
        pt: "Feito em Next.js, estático, em dois idiomas: muanlartins.com.br em português e muanlartins.com em inglês. O código é aberto, e as regras da marca estão nele.",
        en: "Built with Next.js, static, in two languages: muanlartins.com.br in Portuguese and muanlartins.com in English. The code is open, and the brand's rules are in it.",
      },
      code: { pt: "Código no GitHub", en: "Code on GitHub" },
      guide: { pt: "Guia da marca", en: "Brand guide" },
    },
  },
}
