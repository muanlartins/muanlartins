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
      /** A day with no live. */
      none: { pt: "sem live", en: "no stream" },
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
    previous: { pt: "Mês anterior", en: "Previous month" },
    next: { pt: "Próximo mês", en: "Next month" },
    noLive: { pt: "Sem live neste dia.", en: "No stream this day." },
    upNext: { pt: "Próxima live", en: "Next stream" },
    seeDay: { pt: "Ver o dia no calendário", en: "See the day on the calendar" },
    goals: { pt: "Meta do Pix", en: "Pix goal" },
    seeMural: { pt: "Ver no mural", en: "See it on the mural" },
    after: { pt: "Depois", en: "Then" },
    /** On the calendar: a goal's first and last day. */
    goalStarts: { pt: "nova meta", en: "new goal" },
    goalEnds: { pt: "fim da meta", en: "goal ends" },
    /** The day picked: "Começa a meta Natal". */
    goalStartsDay: { pt: "Começa a meta", en: "The goal starts:" },
    goalEndsDay: { pt: "Último dia da meta", en: "Last day of the goal" },
  },

  /** /canal/comandos: every way to take part in the live from the chat. The commands themselves, with what each does,
   * are public/stream/comandos.json (also the chat bot's answers and the Twitch panel). */
  comandos: {
    title: { pt: "Comandos", en: "Commands" },
    description: {
      pt: "Tudo o que dá pra fazer na live pelo chat: mexer o seu torcedor, votar no VAR, perguntar pro bot e trocar os pontos do canal.",
      en: "Everything you can do on the stream from the chat: move your fan, vote on the VAR, ask the bot and spend channel points.",
    },
    /** Before a command's other spellings: "também !dança". */
    also: { pt: "também", en: "also" },
    /** Under the stand's commands: try them on the sample fans. */
    tryIt: { pt: "Toque num comando pra ver.", en: "Tap a command to see it." },
    /** The sample fan in the middle, who does what's tapped. */
    you: { pt: "você", en: "you" },
    /** The sample fan's shout for !grito. */
    shout: { pt: "bora Luan!", en: "let's go!" },
    points: { pt: "pontos", en: "points" },
    profile: {
      text: { pt: "O seu torcedor é do jeito que você montar.", en: "Your fan looks the way you build it." },
      cta: { pt: "Monte o seu torcedor", en: "Build your fan" },
    },
  },

  /** /canal/minijogos: the games in the corner of the live, played by whoever is in the chat. For now the ball duel
   * (lib/duelo.ts): your ball, the ranking and the latest fights, each with its replay. Copy is a draft for Luan. */
  minijogos: {
    title: { pt: "Minijogos", en: "Minigames" },
    description: {
      pt: "Os jogos que rolam no canto da live com quem está no chat. Escolha como você joga, veja quem está ganhando e assista de novo a qualquer luta.",
      en: "The games running in the corner of the stream with whoever is in the chat. Pick how you play, see who's winning and watch any fight again.",
    },
    /** The marble race (lib/corrida.ts). */
    race: {
      title: { pt: "Corrida de bolinhas", en: "Marble race" },
      short: { pt: "Todo mundo do chat numa pista 3D cheia de obstáculos, na conversa entre partidas.", en: "Everyone in the chat on a 3D track full of obstacles, in the talk between matches." },
      /** The rules as chips under the title. */
      rules: {
        everyone: { pt: "Todo mundo do chat corre", en: "Everyone in the chat races" },
        track: { pt: "Pista nova a cada corrida", en: "A new track every race" },
        falls: { pt: "Caiu, volta um pedaço", en: "Fall off, go back a bit" },
        record: { pt: "Só vale o registro", en: "Only the record counts" },
      },
      player: {
        /** "Replay: the latest race, 12 on the track, 17/11". */
        replay: { pt: "Replay: {n} na pista · {d}", en: "Replay: {n} on the track · {d}" },
        demo: { pt: "Uma corrida de exemplo, até sair a primeira na live", en: "A sample race, until the first one on the live" },
        back: { pt: "Voltar pra última", en: "Back to the latest" },
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
        title: { pt: "Acabamento pelo ranque", en: "Finish by rank" },
        plain: { pt: "vidro", en: "glass" },
        glow: { pt: "brilha", en: "glows" },
        trail: { pt: "deixa rastro", en: "leaves a trail" },
        sparks: { pt: "faísca", en: "sparkles" },
        colours: { pt: "muda de cor", en: "changes colour" },
      },
      ranking: { pt: "Ranking da corrida", en: "Race ranking" },
      total: { pt: "{n} corridas registradas", en: "{n} races recorded" },
      wins: { pt: "vitórias", en: "wins" },
      podiums: { pt: "pódios", en: "podiums" },
      races: { pt: "corridas", en: "races" },
      latest: { pt: "Últimas corridas", en: "Latest races" },
      of: { pt: "{n} na pista", en: "{n} on the track" },
      watch: { pt: "Assistir", en: "Watch" },
      old: { pt: "pista antiga, em 2D", en: "old 2D track" },
      none: { pt: "Ainda não teve corrida. A primeira sai na próxima conversa da live.", en: "No race yet. The first one comes at the stream's next talk." },
    },
    duel: {
      title: { pt: "Duelo de bolinhas", en: "Ball duel" },
      lead: {
        pt: "Durante a live, dois do chat são sorteados e se enfrentam no canto da tela, um duelo atrás do outro. Cada um é uma bolinha com as cores do seu torcedor e uma arma que cresce a cada acerto.",
        en: "During the stream, two people from the chat are drawn and fight in the corner of the screen, one duel after another. Each is a ball in their fan's colours with a weapon that grows with every hit.",
      },
      fair: {
        pt: "Todo mundo tem a mesma força: seus Σ só deixam a arma mais bonita. Quem tem mais Σ tem um pouco mais de chance de ser sorteado, como na dedicatória do gol.",
        en: "Everyone is equally strong: your Σ only make your weapon look better. More Σ gives a little more chance of being drawn, like the goal's dedication.",
      },
      idea: { pt: "Ideia de", en: "Idea by" },
      command: { pt: "No chat, !duelo mostra as suas vitórias.", en: "In the chat, !duelo shows your wins." },
      /** The rules as chips under the title, a few words each. */
      rules: {
        drawn: { pt: "2 do chat, sorteados", en: "2 from the chat, drawn" },
        loop: { pt: "Um duelo atrás do outro", en: "One duel after another" },
        fair: { pt: "Mesma força pra todos", en: "Everyone equally strong" },
        looks: { pt: "Σ só deixa a arma mais bonita", en: "Σ only make it prettier" },
        command: { pt: "!duelo no chat", en: "!duelo in the chat" },
      },
      short: { pt: "Bolinhas com armas que crescem a cada acerto, no canto da live.", en: "Balls with weapons that grow with every hit, in the stream's corner." },
    },
    yours: {
      title: { pt: "Sua bolinha", en: "Your ball" },
      signIn: { pt: "Entrar com a Twitch", en: "Sign in with Twitch" },
      signInNote: {
        pt: "Pra escolher a classe e o visual da sua bolinha. Sem entrar, ela luta com uma classe sorteada a cada duelo.",
        en: "To pick your ball's class and look. Without signing in, it fights with a class drawn each duel.",
      },
      signedInAs: { pt: "Entrou como", en: "Signed in as" },
      signOut: { pt: "Sair", en: "Sign out" },
      classTitle: { pt: "Classe", en: "Class" },
      classHint: {
        pt: "Cada classe vence perto de metade das lutas: escolha a que você mais curte ver. Sem escolha, uma é sorteada a cada duelo.",
        en: "Every class wins about half its fights: pick the one you most like to watch. With none, one is drawn each duel.",
      },
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
      materialHint: {
        pt: "Seus Σ liberam um visual por ranque, do Bronze à Lenda Supersônica. Sem escolha, a arma usa o do seu ranque.",
        en: "Your Σ unlock one look per rank, from Bronze to Supersonic Legend. With none, the weapon wears your rank's.",
      },
      auto: { pt: "O do meu ranque", en: "My rank's" },
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
      error: { pt: "Não deu pra salvar. Tente de novo.", en: "It couldn't be saved. Try again." },
      expired: { pt: "Sua entrada com a Twitch expirou. Entre de novo.", en: "Your Twitch sign-in expired. Sign in again." },
    },
    player: {
      preview: { pt: "Prévia: sua bolinha contra a do canal", en: "Preview: your ball against the channel's" },
      replay: { pt: "Replay: {a} contra {b}", en: "Replay: {a} against {b}" },
      back: { pt: "Voltar pra prévia", en: "Back to the preview" },
    },
    record: {
      title: { pt: "Seu histórico", en: "Your record" },
      wins: { pt: "vitórias", en: "wins" },
      fights: { pt: "duelos", en: "duels" },
      rate: { pt: "de aproveitamento", en: "win rate" },
      place: { pt: "no ranking", en: "in the ranking" },
      none: {
        pt: "Você ainda não lutou. Fique no chat com a live no ar: o sorteio pode chamar você a qualquer hora.",
        en: "You haven't fought yet. Stay in the chat while the stream is on: the draw may call you any time.",
      },
      byClass: { pt: "Por classe", en: "By class" },
    },
    ranking: {
      title: { pt: "Ranking", en: "Ranking" },
      note: { pt: "Mais vitórias primeiro; no empate, o melhor aproveitamento.", en: "Most wins first; on a tie, the best win rate." },
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
      wins: { pt: "V", en: "W" },
      fights: { pt: "D", en: "D" },
      you: { pt: "você", en: "you" },
    },
    latest: {
      title: { pt: "Últimas lutas", en: "Latest fights" },
      won: { pt: "venceu", en: "beat" },
      knockout: { pt: "nocaute em {s} s", en: "knockout in {s} s" },
      time: { pt: "no tempo", en: "on time" },
      draw: { pt: "no sorteio", en: "by lot" },
      drawn: { pt: "sorteada", en: "drawn" },
      watch: { pt: "Assistir", en: "Watch" },
      old: { pt: "regras antigas", en: "old rules" },
    },
  },

  /** /torcedor/<login>: a viewer's page and card (lib/viewer.ts), everything of theirs in one place. Copy is a draft for Luan. */
  viewer: {
    title: { pt: "Torcedor", en: "Fan" },
    /** "{login}" is theirs. */
    description: {
      pt: "{login} na torcida do muanlartins: o torcedor, os Σ, as medalhas, os duelos, os Pix e as partidas com o canal.",
      en: "{login} in muanlartins' crowd: their fan, Σ, badges, duels, Pix and matches with the channel.",
    },
    since: { pt: "Na torcida desde {date}", en: "In the crowd since {date}" },
    sinceStart: { pt: "Na torcida desde o começo", en: "In the crowd from the start" },
    never: { pt: "Ainda sem Σ", en: "No Σ yet" },
    open: { pt: "Ver perfil", en: "See profile" },
    mine: { pt: "Esta é a sua página.", en: "This is your page." },
    edit: { pt: "Editar perfil", en: "Edit profile" },
    about: { pt: "Sobre mim", en: "About me" },
    next: { pt: "Próximo:", en: "Next:" },
    /** "{n}" lives in a row now. */
    streakChip: { pt: "{n} lives seguidas", en: "{n} lives in a row" },
    takeDown: { pt: "Tirar {what}", en: "Take down {what}" },
    banner: { pt: "banner", en: "banner" },
    photo: { pt: "foto", en: "photo" },
    twitch: { pt: "Na Twitch", en: "On Twitch" },
    loading: { pt: "Carregando…", en: "Loading…" },
    stats: {
      title: { pt: "Σ e medalhas", en: "Σ and badges" },
      sigma: { pt: "Σ", en: "Σ" },
      hours: { pt: "horas assistidas", en: "hours watched" },
      lives: { pt: "lives", en: "lives" },
      streak: { pt: "seguidas agora", en: "in a row now" },
      record: { pt: "recorde {n}", en: "best {n}" },
      none: { pt: "Os Σ vêm assistindo às lives: 1 por minuto, e mais por live e por sequência.", en: "Σ come from watching the lives: 1 a minute, and more per live and per run." },
    },
    loadout: {
      title: { pt: "Loadout dos sonhos", en: "Dream loadout" },
      count: { pt: "{n} de {t} armas", en: "{n} of {t} weapons" },
      none: { pt: "Escolha a skin de cada arma entre todas do Valorant, e o seu loadout aparece aqui.", en: "Pick a skin for each weapon from all of Valorant's, and your loadout shows here." },
      build: { pt: "Montar o meu", en: "Build mine" },
      edit: { pt: "Editar o meu", en: "Edit mine" },
      see: { pt: "Ver no inventário", en: "See it in the inventory" },
    },
    dedications: {
      title: { pt: "Gols dedicados", en: "Goals dedicated" },
      goal: { pt: "Gol", en: "Goal" },
      win: { pt: "Vitória", en: "Win" },
      none: {
        pt: "A cada gol (no Valorant, a cada vitória), a arquibancada sorteia alguém pra dedicar. Os dedicados aparecem aqui.",
        en: "Each goal (in Valorant, each win) the stand draws someone to dedicate it to. Those show here.",
      },
    },
    duel: {
      title: { pt: "Duelo de bolinhas", en: "Ball duel" },
      record: { pt: "{w} vitórias em {n} duelos", en: "{w} wins in {n} duels" },
      position: { pt: "{p}º no ranking", en: "#{p} in the ranking" },
      won: { pt: "Venceu", en: "Won" },
      lost: { pt: "Perdeu", en: "Lost" },
      against: { pt: "contra", en: "against" },
      replay: { pt: "Replay", en: "Replay" },
      close: { pt: "Fechar o replay", en: "Close the replay" },
      none: { pt: "Ainda não foi sorteado pra um duelo.", en: "Not drawn for a duel yet." },
      pick: { pt: "Escolher a minha bolinha", en: "Pick my ball" },
      ball: { pt: "Bolinha no duelo", en: "Ball in the duel" },
    },
    race: {
      title: { pt: "Corrida de bolinhas", en: "Marble race" },
      record: { pt: "{w} vitórias · {p} pódios em {n} corridas", en: "{w} wins · {p} podiums in {n} races" },
      best: { pt: "melhor: {b}º", en: "best: #{b}" },
      place: { pt: "{l}º de {n}", en: "#{l} of {n}" },
    },
    pix: {
      title: { pt: "Pix no mural", en: "Pix on the mural" },
      sub: { pt: "Ganhou um sub de presente na meta {goal}", en: "Won a gift sub in the goal {goal}" },
      outside: { pt: "Fora de meta", en: "Outside any goal" },
    },
    ideas: {
      title: { pt: "Ideias no roadmap", en: "Ideas on the roadmap" },
      idea: { pt: "Ideia", en: "Idea" },
      report: { pt: "Avisou", en: "Reported" },
      soon: { pt: "Vem aí", en: "Coming" },
    },
    matches: {
      title: { pt: "Partidas comigo", en: "Matches with me" },
      summary: { pt: "{n} partidas · {w} vitórias", en: "{n} matches · {w} wins" },
      win: { pt: "Vitória", en: "Win" },
      loss: { pt: "Derrota", en: "Loss" },
      draw: { pt: "Empate", en: "Draw" },
      watch: { pt: "na live", en: "in the live" },
    },
    notFound: { pt: "Esse nome não parece um login da Twitch.", en: "That doesn't look like a Twitch login." },
  },

  /** /canal/roadmap: what comes next and everything released, with credits. Its entries are in content/changelog.ts. */
  roadmap: {
    title: { pt: "Roadmap", en: "Roadmap" },
    description: {
      pt: "O que vem por aí e tudo o que já entrou no canal, no site, na live e nos vídeos, com o crédito de quem deu cada ideia.",
      en: "What comes next and everything already in the channel, on the site, the stream and the videos, credited to whoever had each idea.",
    },
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
