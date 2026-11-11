/**
 * The channel's roadmap at /canal/roadmap: what comes next and everything already released (the changelog), on the
 * site, on the live, in the videos and in RLR, each with the credit of whoever suggested it.
 *
 * Every release of something new adds an entry to `SHIPPED` in the same commit (AGENTS.md, "The roadmap and the
 * changelog"); moving an item out of `UPCOMING` when it ships. The channel exists only on the Portuguese site, so
 * the copy here is Portuguese only.
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
  jpmartins_1: { name: "jpmartins_1", where: "twitch", login: "jpmartins_1", url: "https://www.twitch.tv/jpmartins_1" },
  maxchadoz: { name: "maxchadoz", where: "twitch", login: "maxchadoz", url: "https://www.twitch.tv/maxchadoz" },
} satisfies Record<string, Person>

export type PersonId = keyof typeof PEOPLE

export interface Credit {
  by: PersonId
  /** "report" when they told about a bug rather than suggesting something: "Avisado por" instead of "Ideia de". */
  as?: "idea" | "report"
  /** What they said, for their card on the page when the entry's title doesn't say it: a bug's report is what was
   * wrong ("Pix tocando duas vezes"), not the fix's title. */
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
  /** The day it was released (YYYY-MM-DD). */
  date: string
  tag: Tag
  title: string
  /** One or two lines: what it is for whoever watches or visits. */
  text: string
  /** Where to see it: a page of the site, or RLR. */
  href?: string
  credit?: Credit
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
  credit?: Credit
}

/** public/canal/roadmap/<name>.webp, with <name>.mp4 as its clip when there's one. */
const media = (name: string, alt: string, { video = false, portrait = false } = {}): Media => ({
  src: `/canal/roadmap/${name}.webp`,
  alt,
  ...(video ? { video: `/canal/roadmap/${name}.mp4` } : {}),
  ...(portrait ? { portrait } : {}),
})

/**
 * What comes next, in order within each status. Every feature Luan decides on and won't release the same day goes
 * here as soon as he decides it, and moves to SHIPPED when it's released (AGENTS.md, "The roadmap and the changelog").
 */
export const UPCOMING: Upcoming[] = [
  {
    id: "loadout-dos-sonhos",
    status: "agora",
    tag: "site",
    title: "Monte seu loadout dos sonhos no Valorant",
    text: "Escolha a skin de cada arma entre todas do jogo, exporte numa imagem só e, entrando com a Twitch, deixe salvo no seu perfil.",
    credit: { by: "maxchadoz" },
  },
  {
    id: "analise-de-mira",
    status: "proximo",
    tag: "site",
    title: "Ferramenta de análise de mira pro Valorant",
    text: "Pra entender se estou sofrendo de overshooting, undershooting, flick, tremedeira e companhia.",
  },
]

/** Everything released, newest first. */
export const SHIPPED: Shipped[] = [
  {
    id: "filtros-sova-e-carros",
    date: "2026-11-10",
    tag: "live",
    title: "Filtros na câmera: Sova, Octane, Fennec e as habilidades do Phoenix",
    text: "O Phoenix com as quatro habilidades feitas com os efeitos do próprio jogo: Labareda, Bola Curva, Mãos Quentes e a ultimate. O Sova com arco, flecha de reconhecimento que me revela em vermelho, choque, coruja e ultimate. E a minha cabeça virando um Octane ou um Fennec, com os meus olhos no para-brisa e a boca no para-choque, que dá flip e explode numa demolição. Tudo escolhido num painel novo no OBS.",
    media: [
      media("filtros-phoenix-habilidades", "Luan de Phoenix com as quatro habilidades: a Labareda, a Bola Curva na mão, o fogo das Mãos Quentes e a ultimate"),
      media("filtros-sova", "Luan de Sova, revelado em vermelho pela flecha de reconhecimento"),
      media("filtros-octane", "Luan com a cara de Octane: os olhos dele no para-brisa e a boca no para-choque"),
      media("filtros-fennec", "Luan com a cara de Fennec: os olhos dele no para-brisa e a boca no para-choque"),
    ],
  },
  {
    id: "creditos-da-live",
    date: "2026-11-10",
    tag: "live",
    title: "Créditos no fim da live",
    text: "A live termina como filme: os créditos sobem com quem seguiu, se inscreveu, mandou Pix e assistiu, e cada nome que passa faz o seu torcedor comemorar na arquibancada.",
    media: [media("creditos-da-live", "Os créditos subindo ao lado da câmera, com a arquibancada de quem assistiu embaixo", { video: true })],
  },
  {
    id: "mural-do-pix-com-valores",
    date: "2026-11-10",
    tag: "site",
    title: "Mural do Pix: todo Pix com seu valor",
    text: "Cada meta lista todos os Pix, com o nome e a mensagem como aparecem na live. Com a Twitch conectada, seu torcedor vem junto e o Pix ainda dá Σ.",
    href: "/mural",
    media: [media("mural-pix-valores", "A meta atual no mural, com cada Pix, seu valor e sua mensagem")],
  },
  {
    id: "rlr-em-portugues",
    date: "2026-11-10",
    tag: "rlr",
    title: "RLR em português",
    text: "Toda a interface do RLR agora em português: o player, o jogar daqui, a prancheta e o estúdio.",
    href: "/rlr/",
  },
  {
    id: "ranking-do-mural",
    date: "2026-11-10",
    tag: "site",
    title: "Mural: o ranking por Σ",
    text: "A audiência agora é um ranking por Σ, como a arquibancada da live: os três primeiros no pódio e todo mundo logo abaixo, com os Σ, as horas e as lives de cada um.",
    href: "/mural#audiencia",
    media: [media("mural-ranking", "O pódio dos três com mais Σ e o ranking da audiência no mural")],
  },
  {
    id: "politica-de-privacidade",
    date: "2026-11-10",
    tag: "site",
    title: "“Política de privacidade” no rodapé",
    text: "O link do rodapé dizia só “Privacidade” e parecia perfil de outra plataforma. Agora diz o que é.",
    href: "/privacidade",
    credit: { by: "lucca_3098" },
  },
  {
    id: "roadmap",
    date: "2026-11-10",
    tag: "site",
    title: "Roadmap e changelog",
    text: "Esta página: o que vem por aí, tudo o que já entrou no canal e quem deu cada ideia.",
    credit: { by: "lucca_3098" },
  },
  {
    id: "lives-valorant",
    date: "2026-11-10",
    tag: "videos",
    title: "Lives de Valorant no site e no YouTube",
    text: "As lives de Valorant também ficam inteiras no site, com um capítulo por partida (mapa e RR) e o resumo do competitivo, e na playlist “Valorant ao vivo” no YouTube.",
    href: "/canal/lives/2026-11-09",
    media: [media("lives-valorant", "A thumbnail da live de Valorant de 9 de novembro")],
  },
  {
    id: "pix-uma-vez",
    date: "2026-11-10",
    tag: "live",
    title: "Cada Pix toca uma vez só",
    text: "Um Pix com mensagem longa, de mais de 30 segundos, voltava para a fila e tocava duas vezes na live. Agora toca uma vez, por mais longo que seja.",
    credit: { by: "jpmartins_1", as: "report", about: "Pix tocando duas vezes" },
  },
  {
    id: "lives-inteiras",
    date: "2026-11-10",
    tag: "videos",
    title: "Live picotada vira um vídeo só",
    text: "Quando o OBS reinicia no meio da live, os pedaços da gravação viram um vídeo inteiro no YouTube e no site, com os capítulos no lugar certo.",
    href: "/canal/lives",
  },
  {
    id: "alertas-no-fone",
    date: "2026-11-10",
    tag: "live",
    title: "Alertas no meu fone",
    text: "Os alertas de inscrição e de pontos do canal agora tocam no meu fone também, então eu ouço na hora e agradeço ao vivo.",
  },
  {
    id: "filtros-na-camera",
    date: "2026-11-10",
    tag: "live",
    title: "Filtros na câmera: Phoenix e a bola",
    text: "O cabelo e a jaqueta do Phoenix, com fogo entre as mãos e o flash, ou uma bola do Rocket League no lugar da cabeça, trocados por um painel no OBS.",
    credit: { by: "woody_fdp" },
    media: [
      media("filtros-phoenix", "Luan com o cabelo e a jaqueta do Phoenix na câmera da live", { video: true }),
      media("filtros-bola", "Luan com a cabeça de bola na câmera, no gol de 124 km/h"),
    ],
  },
  {
    id: "var",
    date: "2026-11-10",
    tag: "live",
    title: "VAR",
    text: "Num lance polêmico, o replay volta numa cabine de árbitro de vídeo, a arquibancada veste o uniforme de juiz e o chat vota o veredito com !1, !2 ou !3. Quem votou no veredito ganha 3 Σ.",
    media: [
      media("var", "A cabine do VAR: o replay do gol no monitor, a câmera ao vivo e a votação do chat"),
    ],
  },
  {
    id: "inventario-valorant",
    date: "2026-11-09",
    tag: "site",
    title: "Inventário do Valorant",
    text: "A coleção de skins que estou montando, arma por arma, e o que está em cada uma agora, lido do próprio jogo.",
    href: "/conteudo/valorant/inventory",
    media: [
      media("inventario", "O inventário: as skins da coleção e as que faltam"),
    ],
  },
  {
    id: "jogar-o-replay",
    date: "2026-11-08",
    tag: "rlr",
    title: "Jogar o replay",
    text: "Em qualquer momento de um replay, assuma o carro de um dos jogadores e tente de novo. E treine os gols de uma partida: defenda o que tomou, marque de novo o que fez.",
    href: "/rlr/",
    credit: {
      by: "victormendes",
      link: "https://www.youtube.com/watch?v=v4ZrX_l4xD0&lc=Ugwm9jRNHRZMf7VFmQh4AaABAg",
    },
    media: [
      media("jogar-o-replay", "Jogando com o carro do muanlartins a partir de um momento do replay, no RLR"),
    ],
  },
  {
    id: "free-play",
    date: "2026-11-08",
    tag: "rlr",
    title: "Free play no navegador",
    text: "A física do Rocket League (RocketSim) rodando no RLR, com o teclado do jogo e boost infinito.",
    href: "/rlr/",
  },
  {
    id: "mira-valorant",
    date: "2026-11-08",
    tag: "site",
    title: "Mira no Valorant",
    text: "A rotina do Voltaic no Aimlabs todo dia e o benchmark de domingo, com o meu ranque de mira e o que está me segurando.",
    href: "/conteudo/valorant/aim",
    video: "39EpzaB0598",
    media: [
      media("mira", "A página de mira: o ranque do Voltaic, a energia e onde focar"),
    ],
  },
  {
    id: "valorant",
    date: "2026-11-08",
    tag: "live",
    title: "Valorant, o segundo jogo",
    text: "Lives de segunda e quarta à noite, aprendendo do Prata: ranque e RR na tela, a arquibancada torcendo pelos rounds e cada partida registrada no site.",
    href: "/conteudo/valorant",
    media: [
      media("valorant", "A página do Valorant, com o estande de tiro"),
    ],
  },
  {
    id: "canal-na-home",
    date: "2026-11-08",
    tag: "site",
    title: "O canal virou a página inicial",
    text: "muanlartins.com.br abre na próxima live, nos jogos e na arquibancada.",
    href: "/",
  },
  {
    id: "quem-jogou-comigo",
    date: "2026-11-08",
    tag: "site",
    title: "Quem jogou comigo",
    text: "Os viewers que toparam aparecem com o seu torcedor nas ranqueadas, em cada partida que jogaram comigo.",
    href: "/conteudo/rocket-league/ranked",
  },
  {
    id: "pontos-do-canal",
    date: "2026-11-08",
    tag: "live",
    title: "Pontos do canal",
    text: "Os sons da live resgatados com pontos do canal na Twitch: 300 pontos cada.",
  },
  {
    id: "afiliado",
    date: "2026-11-07",
    tag: "marca",
    title: "Afiliado da Twitch: emotes e selos",
    text: "Emotes e selos de inscrito desenhados na identidade do canal.",
    video: "Wq6clV_6UGA",
    media: [
      media("emotes", "Os emotes do canal na Twitch"),
    ],
  },
  {
    id: "efeitos",
    date: "2026-11-07",
    tag: "live",
    title: "Efeitos na live",
    text: "Lance ruim dá zoom na minha cara com speed lines de anime, a Terapia acalma com água e música, e os sons são todos sintetizados aqui.",
    media: [
      media("terapia", "A cena Terapia: água animada nas cores do canal e um círculo para respirar"),
    ],
  },
  {
    id: "audiencia",
    date: "2026-11-07",
    tag: "site",
    title: "Mural: a audiência",
    text: "Todo mundo que já assistiu a uma live, quem mais assiste, os marcos e a arquibancada de quem estava lá na afiliação.",
    href: "/mural#audiencia",
  },
  {
    id: "time-do-coracao",
    date: "2026-11-06",
    tag: "live",
    title: "Time do coração no torcedor",
    text: "A camisa de um clube da Série A, nas cores e no padrão dele, ou qualquer time pelo nome.",
    href: "/perfil",
  },
  {
    id: "legendas",
    date: "2026-11-06",
    tag: "live",
    title: "Legendas ao vivo",
    text: "O que eu falo aparece em cima da arquibancada, transcrito na hora pelo Whisper.",
  },
  {
    id: "shorts",
    date: "2026-11-06",
    tag: "videos",
    title: "Shorts e vídeos comentados",
    text: "Gravados no estúdio do RLR, editados de ponta a ponta, com legenda palavra por palavra.",
    video: "f3GpRWPPr8w",
    media: [
      media("shorts", "O short do melhor gol da carreira", { video: true, portrait: true }),
    ],
  },
  {
    id: "pix",
    date: "2026-11-05",
    tag: "live",
    title: "Pix na live",
    text: "Sua mensagem na tela, escrita ou gravada, na voz que você escolher, sem taxa nenhuma. Com login da Twitch, cada real vira 10 Σ.",
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
    text: "Quem apoiou, meta por meta, com o seu torcedor.",
    href: "/mural",
    media: [
      media("mural", "O mural com quem apoiou com Pix"),
    ],
  },
  {
    id: "badges",
    date: "2026-11-05",
    tag: "site",
    title: "Badges e sequência de lives",
    text: "Horas assistidas, lives, a maior sequência e o Pix viram badges de oito níveis no seu perfil.",
    href: "/perfil",
  },
  {
    id: "agenda",
    date: "2026-11-05",
    tag: "site",
    title: "Agenda das lives",
    text: "Os horários no site, no calendário do seu celular e na própria Twitch.",
    href: "/canal/lives",
  },
  {
    id: "estudio-rlr",
    date: "2026-11-05",
    tag: "rlr",
    title: "Estúdio de análise",
    text: "A gravação da live sincronizada com o replay em 3D, para comentar as partidas por qualquer ângulo.",
    href: "/rlr/",
    video: "v4ZrX_l4xD0",
    media: [
      media("estudio", "O estúdio do RLR: uma jogada desenhada por cima do replay em 3D"),
    ],
  },
  {
    id: "arquibancada",
    date: "2026-11-04",
    tag: "live",
    title: "Arquibancada",
    text: "Quem está no chat vira torcedor na tela: comemora os gols, solta stickers, fala em balões e ganha dedicatória.",
    video: "qbLnRqsucUI",
    media: [
      media("arquibancada", "A arquibancada da live no começo de uma partida", { video: true }),
    ],
  },
  {
    id: "galvao",
    date: "2026-11-04",
    tag: "live",
    title: "Narração dos gols",
    text: "Um narrador de voz conhecida grita os nossos gols com a velocidade do chute, só na live.",
    media: [
      media("galvao", "A arquibancada comemorando um gol de 124 km/h"),
    ],
  },
  {
    id: "perfil",
    date: "2026-11-04",
    tag: "site",
    title: "Perfil e torcedor",
    text: "Entre com a Twitch e monte o seu torcedor: cores, cabeça, roupa, acessório, comemoração e stickers.",
    href: "/perfil",
    media: [
      media("perfil", "O editor de torcedor no perfil", { video: true }),
    ],
  },
  {
    id: "sigma",
    date: "2026-11-04",
    tag: "live",
    title: "Σ, os pontos do canal",
    text: "Cada minuto de live vale Σ, que nunca se gasta nem se perde e vira ranque na arquibancada.",
    href: "/perfil",
  },
  {
    id: "lives",
    date: "2026-11-04",
    tag: "site",
    title: "As lives no site",
    text: "Cada live inteira, com um capítulo por partida e a transcrição pesquisável. Quando estou ao vivo, o site avisa.",
    href: "/canal/lives",
    media: [
      media("lives", "A página de uma live, com o vídeo e os capítulos"),
    ],
  },
  {
    id: "ranqueadas",
    date: "2026-10-28",
    tag: "site",
    title: "Ranqueadas",
    text: "Cada partida registrada sozinha pelo painel da live, com a evolução do ranque e o dia a dia.",
    href: "/conteudo/rocket-league/ranked",
    video: "5GMvMT8wvo4",
    media: [
      media("ranqueadas", "O gráfico de pontos da página de ranqueadas", { video: true }),
    ],
  },
  {
    id: "placar-na-tela",
    date: "2026-10-27",
    tag: "live",
    title: "Ranque e placar na tela",
    text: "O ranque, os pontos e as vitórias do dia lidos pela API do próprio Rocket League, partida a partida.",
  },
  {
    id: "paineis-e-alertas",
    date: "2026-10-27",
    tag: "marca",
    title: "Painéis e alertas da Twitch",
    text: "Os painéis do canal e os alertas da live na identidade.",
    media: [
      media("paineis", "Os painéis do canal na Twitch"),
    ],
  },
  {
    id: "overlays",
    date: "2026-10-24",
    tag: "live",
    title: "Overlays da live",
    text: "A moldura da câmera, o chat e as cenas, todos páginas deste site que o OBS abre.",
    media: [
      media("overlays", "A moldura da câmera e a chamada do Pix na tela da live"),
    ],
  },
  {
    id: "arte-da-twitch",
    date: "2026-10-20",
    tag: "marca",
    title: "Arte do canal na Twitch",
    text: "Banner, foto e tela offline na identidade do canal.",
    media: [
      media("banner", "O banner do canal na Twitch"),
    ],
  },
  {
    id: "rlr",
    date: "2026-10-09",
    tag: "rlr",
    title: "RLR, o player de replays",
    text: "Replays do Rocket League em 3D no navegador, com câmeras, desenho e uma prancheta tática.",
    href: "/rlr/",
  },
  {
    id: "thumbnails",
    date: "2026-10-08",
    tag: "marca",
    title: "Thumbnails",
    text: "Cada vídeo com a sua thumbnail na identidade, com o ranque do tópico.",
    media: [
      media("thumbnail", "A thumbnail de um tópico do Rocket League"),
    ],
  },
  {
    id: "fundamentos-rocket-league",
    date: "2026-10-07",
    tag: "site",
    title: "Fundamentos do Rocket League",
    text: "O caminho rank a rank, com um vídeo por tópico e o seu progresso salvo no navegador.",
    href: "/conteudo/rocket-league/fundamentals",
    media: [
      media("fundamentos", "O roadmap de fundamentos do Rocket League"),
    ],
  },
  {
    id: "site",
    date: "2026-10-06",
    tag: "site",
    title: "O site no ar",
    text: "muanlartins.com.br e muanlartins.com, em português e em inglês, com a marca: “Luan” num traço só que vira um Σ.",
    href: "/canal/backstage",
    media: [
      media("marca", "A marca do canal, as cores e a tipografia"),
    ],
  },
]

/** The day the site went up: the changelog counts days from it. */
export const FIRST_DAY = "2026-10-06"
