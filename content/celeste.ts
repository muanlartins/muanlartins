/**
 * Celeste's roadmap at /conteudo/diversos/celeste: Luan's trajectory with the game, stage by stage, up to all 202
 * strawberries (Luan, 2026-11-22). Two phases: first the lives, where he learns the game; only once he has all of it,
 * the videos that teach it. So nothing here teaches: a fundamental says what it is in a line, shows the live's cuts of
 * him learning it (content/celeste-recortes.json) and where he studies it (content/celeste-fontes.ts).
 *
 * No step is ticked by hand (what he has learned is, if he wants: components/site/celeste/learning-hand.tsx): every step names a fact of his save by its key, and scripts/celeste.py says which are
 * true (content/celeste-save.json; the keys are in its docstring). The order is the game's own gates: the Epilogue opens
 * chapter 8 and 4 hearts the door inside it, 15 its B-Side and chapter 9's door, 16 the C-Sides and the golden
 * strawberries (each also needs its side completed; the winged one needs neither, only 1A from the start with no dash,
 * deaths allowed), 23 chapter 8's C-Side.
 * The chapters' and the achievements' names are the game's and Steam's Portuguese ones.
 *
 * No spoilers by default (Luan: "a gente não pode dar spoilers"): what's `secret` hides until he has done it, and the
 * page's "Mostrar spoilers" shows it. The chapters' names aren't spoilers: they always show (Luan, 2026-11-22).
 *
 * Portuguese only, as the channel is.
 */

export type Side = "A" | "B" | "C"

/** A chapter by its id in the save. */
export interface Chapter {
  id: number
  name: string
  /** The game's number; none for the Prologue and the Epilogue. */
  number?: number
  /** Its red strawberries. */
  red?: number
}

export const CHAPTERS: Chapter[] = [
  { id: 0, name: "Prólogo" },
  { id: 1, number: 1, name: "Cidade Abandonada", red: 20 },
  { id: 2, number: 2, name: "Terreno Antigo", red: 18 },
  { id: 3, number: 3, name: "Resort Celestial", red: 25 },
  { id: 4, number: 4, name: "Cordilheira Dourada", red: 29 },
  { id: 5, number: 5, name: "Templo do Espelho", red: 31 },
  { id: 6, number: 6, name: "Reflexão" },
  { id: 7, number: 7, name: "O Cume", red: 47 },
  { id: 8, name: "Epílogo" },
  { id: 9, number: 8, name: "Núcleo", red: 5 },
  { id: 10, number: 9, name: "Adeus" },
]

/** The eight with three sides, a heart and a cassette. */
const FULL = [1, 2, 3, 4, 5, 6, 7, 9]

export interface Step {
  /** The save's fact (scripts/celeste.py). */
  key: string
  area: number
  text: string
  /** How the next step names it, when the chip's text leans on its row. */
  next?: string
  /** A side's: its deaths and time show by its chapter. */
  side?: Side
  /** Counts up to this many red strawberries. */
  red?: number
  /** Hidden behind this text until done. */
  secret?: string
}

export type StageIcon = "climb" | "search" | "core" | "cassette" | "heart" | "star" | "clear" | "berry"

export interface Stage {
  id: string
  title: string
  icon: StageIcon
  /** What it is and how it opens, in a line. */
  summary: string
  /** Hearts it needs somewhere in it, counted against his. */
  hearts?: { need: number; what: string }
  /** The platinum's 32 achievements are all done by the end of it. */
  platinum?: boolean
  steps: Step[]
}

const side = (area: number, side: Side): Step => ({ key: `${area}/${side}`, area, side, text: `Lado ${side}` })
const golden = (area: number, side: Side): Step => ({
  key: `${area}/${side}/golden`,
  area,
  side,
  text: `Lado ${side}`,
  next: `Morango dourado do lado ${side}`,
})

function collectibles(area: number): Step[] {
  const red = CHAPTERS.find((chapter) => chapter.id === area)?.red
  return [
    { key: `${area}/heart`, area, text: "Coração" },
    { key: `${area}/cassette`, area, text: "Fita" },
    ...(red ? [{ key: `${area}/berries`, area, red, text: `${red} morangos` }] : []),
  ]
}

export const STAGES: Stage[] = [
  {
    id: "escalada",
    title: "A escalada",
    icon: "climb",
    summary: "Primeiro, eu vivo a história: do Prólogo ao Epílogo.",
    steps: [
      { key: "0/A", area: 0, side: "A", text: "Terminar" },
      ...[1, 2, 3, 4, 5, 6, 7].map((area) => side(area, "A")),
      { key: "8/A", area: 8, side: "A", text: "Terminar" },
    ],
  },
  {
    id: "segredos",
    title: "Os segredos",
    icon: "search",
    summary: "Depois eu volto em cada capítulo atrás de corações, fitas e morangos.",
    steps: [
      ...collectibles(1),
      { key: "steam/ONEUP", area: 1, text: "1UP!", next: "1UP!" },
      ...collectibles(2),
      ...collectibles(3),
      { key: "steam/PICO8", area: 3, text: "Celeste Classic", secret: "Segredo" },
      ...[4, 5, 6, 7].flatMap(collectibles),
    ],
  },
  {
    id: "nucleo",
    title: "O Núcleo",
    icon: "core",
    summary: "Abre depois do Epílogo, e os corações me levam adiante.",
    hearts: { need: 4, what: "pra porta lá dentro" },
    steps: [side(9, "A"), ...collectibles(9).filter((step) => step.key !== "9/heart")],
  },
  {
    id: "lados-b",
    title: "Lados B",
    icon: "cassette",
    summary: "Cada fita que eu acho me abre um lado B.",
    hearts: { need: 15, what: "pro do capítulo 8" },
    steps: FULL.map((area) => side(area, "B")),
  },
  {
    id: "lados-c",
    title: "Lados C",
    icon: "heart",
    summary: "Com 16 corações, eu chego nos lados C: curtos, e mais difíceis que os B.",
    hearts: { need: 23, what: "pro do capítulo 8" },
    steps: FULL.map((area) => side(area, "C")),
  },
  {
    id: "adeus",
    title: "Adeus",
    icon: "star",
    summary: "O último capítulo, que abre depois do 8. É onde eu quero fechar a platina.",
    hearts: { need: 15, what: "pra segunda metade" },
    platinum: true,
    steps: [
      { key: "10/door", area: 10, text: "Passar da porta" },
      { key: "10/A", area: 10, side: "A", text: "Terminar" },
      { key: "10/moon", area: 10, text: "Morango da lua", secret: "Segredo" },
    ],
  },
  {
    id: "full-clears",
    title: "Full Clears",
    icon: "clear",
    summary: "Platinado, eu volto pra pegar tudo de cada capítulo numa visita só.",
    steps: FULL.map((area) => ({ key: `${area}/fullclear`, area, text: "Full Clear" })),
  },
  {
    id: "dourados",
    title: "Morangos dourados",
    icon: "berry",
    summary: "25 sem morrer e um com regra própria. Com os 26, eu fecho os 202 morangos.",
    steps: [
      { key: "1/winged", area: 1, text: "Dourado alado", secret: "Segredo" },
      ...FULL.flatMap((area) => [golden(area, "A"), golden(area, "B"), golden(area, "C")]),
      golden(10, "A"),
    ],
  },
]

/** Steam's 32, with its Portuguese names (two have none; "Ressurreições" is spelled as in the game, Steam drops an r), in the order the roadmap gets to them. */
export const ACHIEVEMENTS: { id: string; name: string; secret?: boolean }[] = [
  { id: "CH1", name: "Abandonada" },
  { id: "CH2", name: "Arqueologia" },
  { id: "CH3", name: "Conferindo" },
  { id: "CH4", name: "Respire" },
  { id: "CH5", name: "No espelho" },
  { id: "CH6", name: "Reflexo" },
  { id: "CH7", name: "Celeste" },
  { id: "HEART1", name: "Máquinas sem sentido" },
  { id: "CASS", name: "Portal" },
  { id: "ONEUP", name: "1UP!" },
  { id: "HEART2", name: "Ressurreições" },
  { id: "STRB1", name: "Distintivo de morango" },
  { id: "HEART3", name: "Espalhado e perdido" },
  { id: "PICO8", name: "Gamer de verdade", secret: true },
  { id: "HEART4", name: "Olho da tempestade" },
  { id: "STRB2", name: "Medalha de morango" },
  { id: "HEART5", name: "Quietude e queda" },
  { id: "HEART6", name: "Pesada e frágil" },
  { id: "HEART7", name: "Começar a escalar" },
  { id: "HEART8", name: "O Coração da Montanha", secret: true },
  { id: "STRB3", name: "Impressione seus amigos" },
  { id: "BSIDE1", name: "Rasgam o céu" },
  { id: "BSIDE2", name: "Lua negra" },
  { id: "BSIDE3", name: "Carma bom" },
  { id: "BSIDE4", name: "Pena dourada" },
  { id: "BSIDE5", name: "Magia do espelho" },
  { id: "BSIDE6", name: "Centro da terra" },
  { id: "BSIDE7", name: "Chega de fugir" },
  { id: "BSIDE8", name: "Diga adeus", secret: true },
  { id: "CSIDES", name: "Agradecemos por jogar" },
  { id: "FAREWELL", name: "Farewell", secret: true },
  { id: "WOW", name: "Wow", secret: true },
]

/**
 * What else Celeste has, beyond what his save can tell: he ticks these by hand (learning-hand.tsx HandMark), and they
 * never count in the steps or the platinum. The other official releases are last.
 */
export const EXTRAS: { id: string; text: string; secret?: boolean; other?: boolean }[] = [
  { id: "extra-epilogo", text: "Rever o Epílogo com 150 morangos ou mais", secret: true },
  { id: "extra-classic", text: "Os 18 morangos do minijogo Celeste Classic", secret: true },
  { id: "extra-diario", text: "O diário inteiro com tempo e menos mortes" },
  { id: "extra-kevin", text: "A sala do Kevin, no capítulo 9", secret: true },
  { id: "extra-demo", text: "A sala escondida de demodash, no capítulo 9", secret: true },
  { id: "extra-criadores", text: "A sala secreta dos jogos dos criadores, no 6A", secret: true },
  { id: "extra-escondidas", text: "As salas escondidas do Prólogo e do Epílogo", secret: true },
  { id: "extra-jogo-classic", text: "Celeste Classic, o original", other: true },
  { id: "extra-jogo-classic-2", text: "Celeste Classic 2: Lani's Trek", other: true },
  { id: "extra-jogo-64", text: "Celeste 64: Fragments of the Mountain", other: true },
]

export type Need = "needed" | "useful" | "optional"

export interface Fundamental {
  /** Its URL, /conteudo/diversos/celeste/<id>, and the cuts' `topic`. Never rename it. */
  id: string
  stage: string
  title: string
  /** What it is, in a line: never how to do it (that's the second phase's). */
  what: string
  /** Whether finishing all of it takes it, by the wiki and the guides (no room was tested). */
  need: Need
  /** Where the game teaches or first demands it: playing that side is learning it, and only a cut or his own hand says learned (2B can be finished with no dream jump). */
  taught?: { area: number; side: Side }
}

export const FUNDAMENTALS: Fundamental[] = [
  { id: "coyote-time", stage: "escalada", title: "Coyote time", need: "useful", what: "Os 5 frames em que ainda dá pra pular depois de sair da beirada." },
  { id: "buffer", stage: "escalada", title: "Buffer de comandos", need: "useful", what: "O jogo guarda por 4 frames o pulo ou o dash apertado antes da hora, enquanto o botão continua apertado." },
  { id: "correcao-de-quina", stage: "escalada", title: "Correção de quina", need: "useful", what: "O empurrãozinho de até 4 pixels que tira a Madeline de uma quina quando ela bate subindo ou no meio do dash." },
  { id: "liftboost", stage: "escalada", title: "Liftboost", need: "needed", what: "A velocidade do bloco em movimento, que o pulo herda até 10 frames depois de ele parar." },
  { id: "espinhos-direcionais", stage: "escalada", title: "Espinhos direcionais", need: "useful", what: "O espinho só mata quem vai contra a ponta dele ou está parado nesse eixo." },
  { id: "pulo-neutro", stage: "escalada", title: "Pulo neutro", need: "useful", what: "O pulo de parede sem direção, que deixa voltar pra mesma parede e subir por ela sem gastar stamina." },
  { id: "wallboost", stage: "escalada", title: "Wallboost", need: "optional", what: "O pulo de escalada sem direção que vira pulo de parede e devolve a stamina, se você apertar pra fora em até 11 frames." },
  { id: "transicao-de-tela", stage: "segredos", title: "Dash na troca de tela", need: "needed", what: "Trocar de tela devolve o dash e a stamina." },
  { id: "superdash", stage: "segredos", title: "Superdash", need: "optional", what: "O pulo no meio de um dash horizontal no chão, que sai mais rápido e mais longe." },
  { id: "recarga-do-capitulo-8", stage: "nucleo", title: "Recarga do capítulo 8", need: "needed", what: "O capítulo 8 muda a regra de como o dash volta.", taught: { area: 9, side: "A" } },
  { id: "dash-attack", stage: "lados-b", title: "Dash attack", need: "useful", what: "Os frames depois do dash que o jogo ainda conta como dash." },
  { id: "dream-jump", stage: "lados-b", title: "Dream jump", need: "needed", what: "O pulo na saída de um bloco de sonho, se o dash não foi reto pra cima ou pra baixo.", taught: { area: 2, side: "B" } },
  { id: "wallbounce", stage: "lados-b", title: "Wallbounce", need: "needed", what: "O quique na parede a partir de um dash reto pra cima.", taught: { area: 7, side: "B" } },
  { id: "dream-grab", stage: "lados-c", title: "Dream grab", need: "needed", what: "Sair do bloco de sonho já agarrado na lateral por onde eu saí.", taught: { area: 2, side: "C" } },
  { id: "wallbounce-de-bolha", stage: "lados-c", title: "Wallbounce de bolha", need: "needed", what: "O wallbounce que sai de uma bolha, sem gastar o dash.", taught: { area: 4, side: "C" } },
  { id: "hyperdash", stage: "lados-c", title: "Hyperdash", need: "needed", what: "O pulo baixo e muito rápido que sai de um dash diagonal pra baixo, no chão.", taught: { area: 9, side: "C" } },
  { id: "wavedash", stage: "adeus", title: "Wavedash", need: "useful", what: "O hyper que começa no ar e sai do chão já com o dash de volta.", taught: { area: 10, side: "A" } },
  { id: "dash-estendido", stage: "adeus", title: "Dash estendido", need: "useful", what: "O super ou hyper atrasado pra depois de o chão devolver o dash." },
  { id: "regrab", stage: "adeus", title: "Regrab", need: "useful", what: "Agarrar no meio do dash algo que dá pra carregar, mantendo o embalo pra frente e pra cima." },
  { id: "jellyvator", stage: "adeus", title: "Jellyvator", need: "needed", what: "Soltar no lugar o que eu carrego e agarrar de novo num dash pra cima." },
  { id: "fish-super", stage: "adeus", title: "Fish super", need: "useful", what: "O superdash apoiado em algo que flutua, sem chão." },
  { id: "queda-rapida", stage: "adeus", title: "Queda rápida", need: "useful", what: "Segurar pra baixo no ar pra cair mais rápido que o normal." },
  { id: "demodash", stage: "adeus", title: "Demodash", need: "optional", what: "O dash agachado, que cabe em vãos menores." },
  { id: "cornerjump", stage: "dourados", title: "Cornerjump", need: "needed", what: "O pulo de parede dado do ponto mais alto da quina." },
  { id: "5jump", stage: "dourados", title: "5jump", need: "needed", what: "O cornerjump que atravessa cinco blocos de espinhos." },
  { id: "cornerjump-com-espinhos", stage: "dourados", title: "Cornerjump com espinhos", need: "needed", what: "O cornerjump do topo de uma parede com espinhos em cima." },
  { id: "6jump", stage: "dourados", title: "6jump", need: "needed", what: "O cornerboost sem dash que atravessa seis blocos." },
  { id: "cornerkick", stage: "dourados", title: "Cornerkick", need: "needed", what: "O pulo de parede numa quina, passando por baixo dela." },
  { id: "overhang", stage: "dourados", title: "Overhang de 4 blocos", need: "needed", what: "Sair da parede e dar a volta num teto de quatro blocos." },
  { id: "cornerboost", stage: "dourados", title: "Cornerboost", need: "useful", what: "O pulo de escalada no topo da quina que devolve a velocidade de antes da batida." },
  { id: "dash-reverso", stage: "dourados", title: "Dash reverso", need: "useful", what: "O super ou hyper que sai pro lado contrário do dash." },
  { id: "agachar-no-vento", stage: "dourados", title: "Agachar no vento", need: "useful", what: "Agachado no chão, o vento não me empurra." },
  { id: "spikejump", stage: "dourados", title: "Spikejump", need: "optional", what: "O pulo numa superfície com espinhos, possível com vento ou bloco em movimento." },
  { id: "dream-hyper", stage: "dourados", title: "Dream hyper", need: "optional", what: "O hyper logo na saída de um bloco de sonho." },
  { id: "ultradash", stage: "dourados", title: "Ultradash", need: "optional", what: "A velocidade horizontal vezes 1,2 ao tocar no chão depois de um dash diagonal pra baixo." },
  { id: "bunnyhop", stage: "dourados", title: "Bunnyhop", need: "optional", what: "O pulo no instante em que eu toco no chão, pra perder o mínimo de velocidade." },
]

/** Maddy Makes Games and Extremely OK Games publish no notice for fan sites: whose it is, plainly. */
export const CREDITS =
  "Celeste, seus nomes e suas conquistas são da Maddy Makes Games e da Extremely OK Games. O site não é oficial. As definições dos fundamentos seguem a Celeste Wiki (celeste.ink) e o código do jogo, e cada fonte tem crédito nas referências."
