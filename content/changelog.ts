/**
 * The channel's roadmap at /canal/roadmap: what comes next and everything already released (the changelog), on the
 * site, on the live, in the videos and in RLR, each with the credit of whoever suggested it.
 *
 * One entry per feature, with a line of copy and pictures of it working: an improvement goes into its feature's entry,
 * and fixes or tooling don't go in at all (AGENTS.md, "The roadmap and the changelog"). The channel exists only on the
 * Portuguese site, so the copy here is Portuguese only.
 */

export type Tag = "live" | "site" | "videos" | "rlr" | "marca"

export const TAGS: Record<Tag, string> = {
  live: "Na live",
  site: "Site",
  videos: "Vídeos",
  rlr: "RLR",
  marca: "Marca",
}

/** Someone who suggested something. A Twitch login shows their fan from the stream's crowd. */
export interface Person {
  name: string
  where: "twitch" | "youtube"
  /** Their Twitch login, for the fan they built on /perfil (or the one their login gives them). */
  login?: string
  /** Their channel. */
  url: string
  /** A word about who they are, after the name. */
  note?: string
}

export const PEOPLE = {
  woody_fdp: { name: "Woody_fdp", where: "twitch", login: "woody_fdp", url: "https://www.twitch.tv/woody_fdp" },
  victormendes: { name: "victormendes", where: "youtube", url: "https://www.youtube.com/@victormendes9510" },
  lucca_3098: { name: "lucca_3098", where: "twitch", login: "lucca_3098", url: "https://www.twitch.tv/lucca_3098" },
  maxchadoz: { name: "maxchadoz", where: "twitch", login: "maxchadoz", url: "https://www.twitch.tv/maxchadoz" },
  ccamara: { name: "ccamara", where: "twitch", login: "ccamara", url: "https://www.twitch.tv/ccamara" },
  leila_m_30: { name: "leila_m_30", where: "twitch", login: "leila_m_30", url: "https://www.twitch.tv/leila_m_30" },
  erikmd01: { name: "ErikMD01", where: "twitch", login: "erikmd01", url: "https://www.twitch.tv/erikmd01" },
} satisfies Record<string, Person>

export type PersonId = keyof typeof PEOPLE

export interface Credit {
  by: PersonId
  /** "report" when they told about a bug rather than suggesting something: "Avisado por" instead of "Ideia de". */
  as?: "idea" | "report"
  /** What they suggested, for their card on the page when the entry's title doesn't say it: a part of a bigger
   * feature ("Pintura e decalques nos carros" on the camera filters). */
  about?: string
  /** Where the idea was given, when there's a link to it (a YouTube comment, a moment of a live). */
  link?: string
}

/** A picture (or a short muted clip over it) of the thing, in public/canal/roadmap/. */
export interface Media {
  src: string
  alt: string
  /** An mp4 that plays, muted and looping, while the picture is hovered or opened. */
  video?: string
  /** Taller than wide (a short's frame): drawn narrower. */
  portrait?: boolean
}

export interface Shipped {
  /** Unique and kebab-case: the entry's address, /canal/roadmap#<id>. */
  id: string
  /** The day the feature first came out (YYYY-MM-DD); improving it later doesn't move it. */
  date: string
  tag: Tag
  /** The feature's name, in a few words. */
  title: string
  /** One short line: what it is for whoever watches or visits. The pictures show the rest. */
  text: string
  /** Where to see it: a page of the site, or RLR. */
  href?: string
  /** Whoever had the idea, and whoever suggested a part of it later. */
  credits?: Credit[]
  /** A YouTube video or short about it, by id. */
  video?: string
  media?: Media[]
}

export type Status = "agora" | "proximo" | "ideia"

export const STATUSES: Record<Status, { title: string; text: string }> = {
  agora: { title: "Fazendo agora", text: "Já em andamento." },
  proximo: { title: "Em seguida", text: "Decidido, na fila." },
  ideia: { title: "Ideias", text: "Pode mudar, pode sair." },
}

export interface Upcoming {
  id: string
  status: Status
  tag: Tag
  title: string
  text: string
  credits?: Credit[]
}

/** public/canal/roadmap/<name>.webp, with <name>.mp4 as its clip when there's one. */
const media = (name: string, alt: string, { video = false, portrait = false } = {}): Media => ({
  src: `/canal/roadmap/${name}.webp`,
  alt,
  ...(video ? { video: `/canal/roadmap/${name}.mp4` } : {}),
  ...(portrait ? { portrait } : {}),
})

/**
 * What comes next, in order within each status. Every new feature Luan decides on and won't release the same day goes
 * here as soon as he decides it, and moves to SHIPPED when it's released (AGENTS.md, "The roadmap and the changelog").
 */
export const UPCOMING: Upcoming[] = [
  {
    id: "celeste-lore",
    status: "proximo",
    tag: "live",
    title: "A lore de Celeste nas lives",
    text: "A história por trás de cada capítulo e pautas pra conversar, sem spoiler.",
    credits: [{ by: "leila_m_30" }],
  },
  {
    id: "celeste-videos",
    status: "ideia",
    tag: "videos",
    title: "Vídeos da trajetória com Celeste",
    text: "Depois da platina, os vídeos preparados com toda a gameplay das lives.",
  },
]

/** Every feature released, newest first. */
export const SHIPPED: Shipped[] = [
  {
    id: "celeste-roteiro",
    date: "2026-11-22",
    tag: "site",
    title: "Minha trajetória com Celeste",
    text: "O meu caminho até a platina e os 202 morangos, marcado pelo save, com as técnicas filmadas no jogo e a história de cada capítulo.",
    href: "/conteudo/diversos/celeste",
    media: [
      media("celeste-historia", "A página do Prólogo: as falas da Vovó em português e inglês, e a casa dela filmada no jogo com a caixa de diálogo"),
      media("celeste-roteiro", "O roteiro do Celeste: o próximo passo, a montanha com as oito etapas e os meus números lidos do save"),
      media("celeste-tecnica", "A página do coyote time: a Madeline pula 5 frames depois de sair da beirada, no jogo, e chega no pilar", { video: true }),
    ],
  },
  {
    id: "jogos-diversos",
    date: "2026-11-21",
    tag: "site",
    title: "Jogos diversos",
    text: "Tudo que eu jogo além de Rocket League e Valorant, com as lives, as horas e a meta de cada jogo.",
    href: "/conteudo/diversos",
    media: [media("jogos-diversos", "A lista dos jogos diversos: o card do Celeste, com a capa e a platina em 6 de 32 conquistas")],
  },
  {
    id: "estatisticas-da-partida",
    date: "2026-11-21",
    tag: "live",
    title: "Estatísticas da partida na tela",
    text: "Meus números da partida ao lado da câmera, o resumo quando ela acaba e os da live inteira nos créditos.",
    media: [
      media("estatisticas-da-partida", "Ao lado da câmera, Nesta partida: score 443, 3 gols, 5 chutes, 28 toques e 3 aéreos numa partida de Rocket League"),
      media("estatisticas-da-partida-fim", "Na Conversa, o fim de partida: vitória por 7 a 2 e os meus números em quadros, de score a demolições"),
      media("estatisticas-da-partida-creditos", "Nos créditos do fim, os números de hoje: 16 gols, 11 defesas, 541 toques, 61 aéreos e o gol mais forte a 118 km/h"),
    ],
  },
  {
    id: "teclado-e-mouse",
    date: "2026-11-20",
    tag: "live",
    title: "Teclado e mouse na tela",
    text: "As teclas e os cliques que eu aperto aparecem do lado da câmera, no Valorant, no Rocket League e nos outros jogos.",
    credits: [{ by: "erikmd01" }],
    media: [media("teclado-e-mouse", "O teclado e o mouse acima da câmera: W e A acesos e o clique esquerdo do mouse apertado", { video: true })],
  },
  {
    id: "servidor-do-discord",
    date: "2026-11-19",
    tag: "live",
    title: "Servidor do Discord",
    text: "O aviso de quando a live abre, as próximas lives como eventos, papo e canais de voz. Conectando o Discord no perfil, o seu rank Σ vira cargo lá.",
    href: "/perfil",
    media: [media("servidor-do-discord", "O servidor no Discord: os canais da comunidade e a mensagem de boas-vindas")],
  },
  {
    id: "video-de-boas-vindas",
    date: "2026-11-19",
    tag: "marca",
    title: "Trailer na Twitch",
    text: "Quem chega no canal fora da live vê quem eu sou e o que a gente faz aqui.",
    media: [media("video-de-boas-vindas", "A intro tocando como trailer do canal: eu na câmera, sobre o fundo azul do canal, dando boas-vindas", { video: true })],
  },
  {
    id: "analise-de-mira",
    date: "2026-11-18",
    tag: "site",
    title: "Análise de mira",
    text: "Flick por flick, dos replays do Aimlabs e das minhas partidas de Valorant: onde a mira para, quanto passa do alvo, e se o treino chega no jogo.",
    href: "/conteudo/valorant/aim",
    media: [
      media("analise-de-mira-partidas", "No treino e nas partidas: cada medida em duas colunas, Aimlabs e Valorant, e o flick típico de cada um no mesmo gráfico"),
      media("analise-de-mira", "A seção nova: o primeiro movimento leva a mira a 88% do caminho, paro antes do alvo em 62% dos flicks e passo em 32%, e acerto 46% clicando em movimento contra 62% parado"),
      media("analise-de-mira-primeiro", "Onde o primeiro movimento termina: colunas por faixa do caminho até o alvo, a maioria um pouco antes da linha do alvo"),
    ],
  },
  {
    id: "corrida-de-bolinhas",
    date: "2026-11-18",
    tag: "live",
    title: "Corrida de bolinhas",
    text: "Entre as partidas, todo mundo do chat corre numa pista 3D nova a cada corrida, com a bolinha do seu torcedor.",
    href: "/canal/minijogos",
    credits: [{ by: "lucca_3098" }],
    media: [
      media("corrida-de-bolinhas", "A corrida 3D embaixo da câmera: a largada no portão, os moinhos, a ponte sem grade, o campo de pinos, a chegada e o pódio", { video: true }),
    ],
  },
  {
    id: "casa-da-comunidade",
    date: "2026-11-18",
    tag: "site",
    title: "Uma página pra cada viewer",
    text: "O seu torcedor, os Σ, as medalhas, os duelos, os Pix e as partidas comigo, com um cartão que você monta no perfil.",
    href: "/torcedor/jpmartins_1",
    media: [
      media("casa-da-comunidade", "A página do jpmartins_1: o cartão com o torcedor de camisa do Fluminense, 721 Σ em Ouro III, as horas, as lives, a sequência e as medalhas"),
      media("casa-da-comunidade-cartao", "No mural, o mouse no nome do tiago_dantty abre o cartão dele: o torcedor, 444 Σ, Ouro I, 6 horas e 5 lives, e o link pra página"),
    ],
  },
  {
    id: "duelo-de-bolinhas",
    date: "2026-11-15",
    tag: "live",
    title: "Duelo de bolinhas",
    text: "Entre as partidas, dois do chat se enfrentam, revezando com a corrida. A classe da sua bolinha você escolhe no site, onde ficam o ranking e o replay de cada luta.",
    href: "/canal/minijogos",
    credits: [{ by: "lucca_3098" }],
    media: [
      media("duelo-na-conversa", "O duelo embaixo da câmera, na cena de conversa: Katana contra Machado, cada um com o seu torcedor, a vida e o que a classe faz ao lado da arena"),
      media("duelo-com-fisica", "A bolinha de Punho, atordoada pela Clava, fica parada com estrelas na cabeça e as luvas apagadas", { video: true }),
      media("minijogos-com-cara-de-jogo", "A tela de seleção no site: a arena, a ficha da Adaga com as barras e os visuais da arma, e as classes embaixo"),
    ],
  },
  {
    id: "natal-na-live",
    date: "2026-11-15",
    tag: "live",
    title: "Natal na live",
    text: "Em dezembro, cada Pix pendura um presente na árvore da meta, e a cada R$ 10 sai um sub de presente. Com gorro na câmera.",
    href: "/mural",
    credits: [{ by: "leila_m_30" }],
    media: [
      media("natal-na-live", "A live com a árvore de Natal no canto, acesa até a metade, e o Pix da Ana chegando com o presente dela, um sino vermelho listrado de amarelo"),
      media("gorro-de-natal", "Um gorro de Papai Noel cai na minha cabeça na câmera; com o filtro do Octane ele vai pro teto do carro, e numa Demolição voa e volta", { video: true }),
      media("natal-na-live-presente", "O /pix na meta de Natal: o presente sendo montado, com o formato, a cor, o detalhe e a estampa, e a prévia ao lado"),
    ],
  },
  {
    id: "comandos-da-live",
    date: "2026-11-15",
    tag: "site",
    title: "Comandos da live",
    text: "Todo jeito de participar pelo chat numa página só, com a arquibancada pra testar.",
    href: "/canal/comandos",
    media: [media("comandos-da-live", "A página de comandos: a arquibancada de exemplo, com o torcedor do meio soltando o grito, em cima da lista de comandos")],
  },
  {
    id: "anuncio-no-intervalo",
    date: "2026-11-11",
    tag: "live",
    title: "Anúncio só no intervalo",
    text: "Quem chega na live não vê anúncio: o intervalo é de 3 min por hora, entre uma partida e outra.",
    media: [media("anuncio-no-intervalo", "A tela de Começando contando 3:10 até o fim do anúncio de abertura, quando a live começa")],
  },
  {
    id: "musica-no-pix",
    date: "2026-11-10",
    tag: "live",
    title: "Música no Pix",
    text: "A partir de R$ 5, a IA faz uma música no estilo e no tema que você escolher, e ela toca na live com a letra.",
    href: "/pix",
    media: [
      media("musica-no-pix", "O Pix com a opção de música: os estilos, de funk a pop, e o campo pra dizer sobre o que é a música"),
      media("letra-da-musica", "Uma música do Pix tocando na live: embaixo do nome de quem mandou, a linha que está sendo cantada e a próxima"),
    ],
  },
  {
    id: "loadout-dos-sonhos",
    date: "2026-11-10",
    tag: "site",
    title: "Loadout dos sonhos no Valorant",
    text: "Escolha a skin de cada arma entre todas do jogo e exporte numa imagem.",
    href: "/conteudo/valorant/inventory#montar",
    credits: [{ by: "maxchadoz" }],
    media: [media("loadout-dos-sonhos", "A minha coleção dos sonhos exportada como imagem: as 21 armas, 13 com skin escolhida")],
  },
  {
    id: "creditos-da-live",
    date: "2026-11-10",
    tag: "live",
    title: "Créditos no fim da live",
    text: "Quem seguiu, se inscreveu, mandou Pix e assistiu sobe nos créditos, e o seu torcedor comemora.",
    media: [media("creditos-da-live", "Os créditos subindo ao lado da câmera, com a arquibancada de quem assistiu embaixo", { video: true })],
  },
  {
    id: "roadmap",
    date: "2026-11-10",
    tag: "site",
    title: "Roadmap",
    text: "Esta página: o que vem por aí, o que já saiu e quem deu cada ideia.",
    credits: [{ by: "lucca_3098" }],
    media: [media("roadmap", "As ideias da comunidade no roadmap: o torcedor de cada um que deu uma ideia, na arquibancada")],
  },
  {
    id: "filtros-na-camera",
    date: "2026-11-10",
    tag: "live",
    title: "Filtros na câmera",
    text: "Phoenix, Sova e Sage com as habilidades, Madeline e Badeline reagindo ao meu Celeste, ou a bola e os carros.",
    credits: [{ by: "woody_fdp" }, { by: "ccamara", about: "Pintura e decalques nos carros" }],
    media: [
      media("filtros-celeste", "Luan de Madeline na câmera, com o cabelo azul e o rastro vermelho do dash do Celeste"),
      media("filtros-celeste-cidade", "Luan de Badeline com os olhos vermelhos, na frente da Cidade Abandonada do Celeste nevando"),
      media("filtros-phoenix", "Luan com o cabelo e a jaqueta do Phoenix na câmera da live", { video: true }),
      media("filtros-sova-habilidades", "Luan de Sova com as habilidades do jogo: o arco puxado com a flecha de reconhecimento, a flecha de choque, o drone coruja e a Fúria do Caçador"),
      media("filtros-60fps", "Luan acenando com a cara de Octane na câmera", { video: true }),
      media("carros-decalques", "O Octane na cabeça do Luan com decalques animados: chamas, neon, arco-íris e listras"),
    ],
  },
  {
    id: "var",
    date: "2026-11-10",
    tag: "live",
    title: "VAR",
    text: "Num lance polêmico, o replay passa na tela e o chat vota o veredito. Quem acerta ganha 3 Σ.",
    media: [
      media("var-com-replay", "O VAR no canto da live: o replay do lance em câmera lenta a 50% e, embaixo, a votação do chat com !1 ou !2"),
      media("var", "A cabine do VAR: o replay do gol no monitor, a câmera ao vivo e a votação do chat"),
    ],
  },
  {
    id: "inventario-valorant",
    date: "2026-11-09",
    tag: "site",
    title: "Inventário do Valorant",
    text: "A coleção de skins que estou montando, arma por arma, lida do próprio jogo.",
    href: "/conteudo/valorant/inventory",
    media: [
      media("inventario", "O inventário: as skins da coleção e as que faltam"),
      media("loadout-no-perfil", "O loadout dos sonhos na página de cada um: o do canal, 14 das 21 armas com skin"),
    ],
  },
  {
    id: "jogar-o-replay",
    date: "2026-11-08",
    tag: "rlr",
    title: "Jogar o replay",
    text: "Em qualquer momento de um replay, assuma o carro de um jogador e tente de novo, com a física do Rocket League no navegador.",
    href: "/rlr/",
    credits: [{ by: "victormendes", link: "https://www.youtube.com/watch?v=v4ZrX_l4xD0&lc=Ugwm9jRNHRZMf7VFmQh4AaABAg" }],
    media: [media("jogar-o-replay", "Jogando com o carro do muanlartins a partir de um momento do replay, no RLR")],
  },
  {
    id: "mira-valorant",
    date: "2026-11-08",
    tag: "site",
    title: "Mira no Valorant",
    text: "O treino do Voltaic no Aimlabs todo dia e o benchmark de domingo, com o meu ranque de mira.",
    href: "/conteudo/valorant/aim",
    video: "39EpzaB0598",
    media: [media("mira", "A página de mira: o ranque do Voltaic, a energia e onde focar")],
  },
  {
    id: "valorant",
    date: "2026-11-08",
    tag: "live",
    title: "Valorant, o segundo jogo",
    text: "Aprendendo do Prata, com o ranque na tela, a arquibancada torcendo pelos rounds e cada partida no site.",
    href: "/conteudo/valorant",
    media: [media("valorant", "A página do Valorant, com o estande de tiro")],
  },
  {
    id: "afiliado",
    date: "2026-11-07",
    tag: "marca",
    title: "Emotes e selos",
    text: "Afiliado da Twitch, com emotes e selos de inscrito na identidade do canal.",
    video: "Wq6clV_6UGA",
    media: [media("emotes", "Os emotes do canal na Twitch")],
  },
  {
    id: "efeitos",
    date: "2026-11-07",
    tag: "live",
    title: "Efeitos na live",
    text: "Lance ruim dá zoom na minha cara, a Terapia acalma com respiração guiada, e os sons saem com os pontos do canal.",
    media: [media("terapia-repaginada", "A cena da Terapia: Luan no meio do círculo de respiração, com os passos de um lado e o chat do outro", { video: true })],
  },
  {
    id: "audiencia",
    date: "2026-11-07",
    tag: "site",
    title: "A torcida no mural",
    text: "Todo mundo que já assistiu, num ranking por Σ com pódio.",
    href: "/mural#torcida",
    media: [media("mural-ranking", "O pódio dos três com mais Σ e o ranking da torcida no mural")],
  },
  {
    id: "legendas",
    date: "2026-11-06",
    tag: "live",
    title: "Legendas ao vivo",
    text: "O que eu falo aparece na tela na hora, e pode sair traduzido.",
    media: [media("legendas-traduzidas", "A legenda da live em inglês, \"Whoa! What is that?\", enquanto eu falava em português no menu do Rocket League")],
  },
  {
    id: "shorts",
    date: "2026-11-06",
    tag: "videos",
    title: "Shorts e vídeos comentados",
    text: "Gravados no estúdio do RLR, com legenda palavra por palavra.",
    video: "f3GpRWPPr8w",
    media: [media("shorts", "O short do melhor gol da carreira", { video: true, portrait: true })],
  },
  {
    id: "pix",
    date: "2026-11-05",
    tag: "live",
    title: "Pix na live",
    text: "Sua mensagem na tela, escrita ou gravada, na voz que você escolher, sem taxa.",
    href: "/pix",
    video: "PuE0yF9oIEc",
    media: [
      media("pix", "Um Pix com voz na tela, durante uma partida", { video: true }),
      media("pix-pagina", "A página do Pix, com as vozes para escolher"),
    ],
  },
  {
    id: "mural",
    date: "2026-11-05",
    tag: "site",
    title: "Mural do Pix",
    text: "Cada meta com todo Pix que chegou, com o nome, a mensagem e o seu torcedor.",
    href: "/mural",
    media: [media("mural-pix-valores", "A meta atual no mural, com cada Pix, seu valor e sua mensagem")],
  },
  {
    id: "agenda",
    date: "2026-11-05",
    tag: "site",
    title: "Agenda das lives",
    text: "Cada live com horário, jogo e roteiro, no site, no calendário do celular e na Twitch.",
    href: "/canal/agenda",
    media: [
      media("agenda-editavel", "A agenda no site: o calendário com as lives de cada dia e o dia escolhido com a live dele"),
      media("agenda-editavel-editor", "Planejando um dia na agenda: o horário, o jogo, o título e o roteiro de cada live"),
    ],
  },
  {
    id: "estudio-rlr",
    date: "2026-11-05",
    tag: "rlr",
    title: "Estúdio de análise",
    text: "A gravação da live sincronizada com o replay em 3D, pra comentar as partidas de qualquer ângulo.",
    href: "/rlr/",
    video: "v4ZrX_l4xD0",
    media: [media("estudio", "O estúdio do RLR: uma jogada desenhada por cima do replay em 3D")],
  },
  {
    id: "arquibancada",
    date: "2026-11-04",
    tag: "live",
    title: "Arquibancada",
    text: "Quem está no chat vira torcedor na tela e comemora os gols.",
    video: "qbLnRqsucUI",
    media: [media("arquibancada", "A arquibancada da live no começo de uma partida", { video: true })],
  },
  {
    id: "galvao",
    date: "2026-11-04",
    tag: "live",
    title: "Narração dos gols",
    text: "Um narrador de voz conhecida grita os nossos gols, com a velocidade do chute.",
    media: [media("galvao", "A arquibancada comemorando um gol de 124 km/h")],
  },
  {
    id: "perfil",
    date: "2026-11-04",
    tag: "site",
    title: "Perfil e torcedor",
    text: "Entre com a Twitch e monte o seu torcedor, até com a camisa do seu time.",
    href: "/perfil",
    media: [media("perfil", "O editor de torcedor no perfil", { video: true })],
  },
  {
    id: "sigma",
    date: "2026-11-04",
    tag: "live",
    title: "Σ, os pontos do canal",
    text: "Cada minuto de live vale Σ, que nunca se gasta e vira ranque na arquibancada e medalhas no perfil.",
    href: "/perfil",
    media: [media("sigma", "Os Σ e as medalhas na página da leila_m_30: 598 Σ, 6 horas, 6 lives, 5 seguidas e as medalhas com o próximo nível")],
  },
  {
    id: "lives",
    date: "2026-11-04",
    tag: "site",
    title: "As lives no site",
    text: "Cada live inteira, com um capítulo por partida e a transcrição pesquisável.",
    href: "/canal/lives",
    media: [media("lives", "A página de uma live, com o vídeo e os capítulos")],
  },
  {
    id: "ranqueadas",
    date: "2026-10-28",
    tag: "site",
    title: "Ranqueadas",
    text: "Cada partida registrada sozinha, com a evolução do rank e o replay pra ver no RLR.",
    href: "/conteudo/rocket-league/ranked",
    video: "5GMvMT8wvo4",
    media: [
      media("ranqueadas-replays", "As partidas de 20/11 no 3v3, cada uma com o placar, os pontos e “Assistir no RLR” pra abrir o replay"),
      media("ranqueadas", "O gráfico de pontos da página de ranqueadas", { video: true }),
    ],
  },
  {
    id: "paineis-e-alertas",
    date: "2026-10-27",
    tag: "marca",
    title: "Painéis e alertas da Twitch",
    text: "Os painéis do canal e os alertas da live na identidade.",
    media: [media("paineis", "Os painéis do canal na Twitch")],
  },
  {
    id: "overlays",
    date: "2026-10-24",
    tag: "live",
    title: "Overlays da live",
    text: "A moldura da câmera com o ranque e o placar do dia, o chat e as cenas.",
    media: [media("overlays", "A moldura da câmera e a chamada do Pix na tela da live")],
  },
  {
    id: "arte-da-twitch",
    date: "2026-10-20",
    tag: "marca",
    title: "Arte do canal na Twitch",
    text: "Banner, foto e tela offline na identidade.",
    media: [media("banner", "O banner do canal na Twitch")],
  },
  {
    id: "rlr",
    date: "2026-10-09",
    tag: "rlr",
    title: "RLR, o player de replays",
    text: "Replays do Rocket League em 3D no navegador, com prancheta tática.",
    href: "/rlr/",
  },
  {
    id: "thumbnails",
    date: "2026-10-08",
    tag: "marca",
    title: "Thumbnails",
    text: "Cada vídeo com a sua thumbnail na identidade.",
    media: [media("thumbnail", "A thumbnail de um tópico do Rocket League")],
  },
  {
    id: "fundamentos-rocket-league",
    date: "2026-10-07",
    tag: "site",
    title: "Fundamentos do Rocket League",
    text: "O caminho rank a rank, com um vídeo por tópico.",
    href: "/conteudo/rocket-league/fundamentals",
    media: [media("fundamentos", "O roadmap de fundamentos do Rocket League")],
  },
  {
    id: "site",
    date: "2026-10-06",
    tag: "site",
    title: "O site no ar",
    text: "muanlartins.com.br, com a marca: “Luan” num traço só que vira um Σ.",
    href: "/canal/backstage",
    media: [media("marca", "A marca do canal, as cores e a tipografia")],
  },
]

/** The day the site went up: the changelog counts days from it. */
export const FIRST_DAY = "2026-10-06"
