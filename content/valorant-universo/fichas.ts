/**
 * Each agent's facts the game doesn't show (content/valorant-universo/jogo.json has what it does), from the research of
 * 2026-11-23 (~/.local/share/muanlartins/valorant-lore/): number, real name, nickname and origin from the VALORANT
 * Wiki's infobox (`fandom`, which cites the game's own dossiers and emails), the arrival from its patch history, the
 * English voices from the same wiki (and Behind The Voice Actors, which agrees up to Gekko) and the Brazilian ones from
 * the Dublagem Wiki (`dublagem-wiki`). A voice is "confirmed" only when a primary source names it (`fonte`, an id of
 * content/valorant-universo/fontes.ts); the others the page shows as the fan wikis', and an English voice no one has
 * confirmed yet says so (`confirmada: false`). `chegou` is the day an agent came out, or "beta" for the closed beta's
 * (April to June 2020).
 */

export interface Voz {
  nome: string
  /** The source that confirms it; without one, it's the fan wikis'. */
  fonte?: string
  /** False when even the wikis say it isn't confirmed yet. */
  confirmada?: false
}

export interface Ficha {
  id: string
  /** How the site's Portuguese refers to the agent (brand/voz.md: "o Phoenix, a Sage"); Clove, who the game writes
   * with neutral language, goes without one. */
  artigo: "a" | "o" | ""
  nome: string
  numero: number
  nomeReal?: string
  apelido?: string
  origem?: string
  chegou: "beta" | `${number}-${number}-${number}`
  vozes: { en: Voz; pt: Voz }
}

export const FICHAS: Ficha[] = [
  {
    id: "brimstone",
    artigo: "o",
    nome: "Brimstone",
    numero: 1,
    nomeReal: "Liam Byrne",
    apelido: "Brim",
    origem: "Baltimore, EUA",
    chegou: "beta",
    vozes: { en: { nome: "Steve Blum" }, pt: { nome: "Wellington Lima" } },
  },
  {
    id: "viper",
    artigo: "a",
    nome: "Viper",
    numero: 2,
    nomeReal: "Sabine Callas",
    origem: "EUA",
    chegou: "beta",
    vozes: { en: { nome: "Ashly Burch" }, pt: { nome: "Samira Fernandes" } },
  },
  {
    id: "omen",
    artigo: "o",
    nome: "Omen",
    numero: 3,
    chegou: "beta",
    vozes: { en: { nome: "Jason Marnocha" }, pt: { nome: "Charles Dalla" } },
  },
  {
    id: "killjoy",
    artigo: "a",
    nome: "Killjoy",
    numero: 4,
    nomeReal: "Klara Böhringer",
    apelido: "KJ",
    origem: "Alemanha",
    chegou: "2020-08-04",
    vozes: { en: { nome: "Eva Feiler" }, pt: { nome: "Michelle Zampieri" } },
  },
  {
    id: "cypher",
    artigo: "o",
    nome: "Cypher",
    numero: 5,
    nomeReal: "Amir El Amari",
    origem: "Rabat, Marrocos",
    chegou: "beta",
    vozes: {
      en: { nome: "Nabil Elouahabi" },
      pt: { nome: "Thiago Zambrano", fonte: "dublacon-2022" },
    },
  },
  {
    id: "sova",
    artigo: "o",
    nome: "Sova",
    numero: 6,
    nomeReal: "Alexander (Sasha) Novikov",
    origem: "Severomorsk, Rússia",
    chegou: "beta",
    vozes: { en: { nome: "Aaron Vodovoz" }, pt: { nome: "Heitor Assali" } },
  },
  {
    id: "sage",
    artigo: "a",
    nome: "Sage",
    numero: 7,
    nomeReal: "Wei Ling Ying",
    origem: "China",
    chegou: "beta",
    vozes: {
      en: { nome: "Naomi Yang" },
      pt: { nome: "Thaís Durães", fonte: "dublacon-2022" },
    },
  },
  {
    id: "phoenix",
    artigo: "o",
    nome: "Phoenix",
    numero: 9,
    nomeReal: "Jamie Adeyemi",
    origem: "Londres, Inglaterra, Reino Unido",
    chegou: "beta",
    vozes: { en: { nome: "Afolabi Alli" }, pt: { nome: "Renan Freitas" } },
  },
  {
    id: "jett",
    artigo: "a",
    nome: "Jett",
    numero: 10,
    nomeReal: "Han Sunwoo (Sunwoo Han)",
    origem: "Seul, Coreia do Sul",
    chegou: "beta",
    vozes: {
      en: { nome: "Shannon Williams" },
      pt: { nome: "Jussara Marques" },
    },
  },
  {
    id: "reyna",
    artigo: "a",
    nome: "Reyna",
    numero: 11,
    nomeReal: "Zyanya Mondragón",
    origem: "México",
    chegou: "2020-06-02",
    vozes: { en: { nome: "Karina Altamirano" }, pt: { nome: "Patt Souza" } },
  },
  {
    id: "raze",
    artigo: "a",
    nome: "Raze",
    numero: 12,
    nomeReal: "Tayane Alves",
    apelido: "Tatá",
    origem: "Salvador, Bahia, Brasil",
    chegou: "beta",
    vozes: { en: { nome: "Carolina Ravassa" }, pt: { nome: "Marina Santana", fonte: "marina-santana-canal-youtube" } },
  },
  {
    id: "breach",
    artigo: "o",
    nome: "Breach",
    numero: 13,
    nomeReal: "Erik Torsten",
    origem: "Suécia",
    chegou: "beta",
    vozes: { en: { nome: "David Menkin" }, pt: { nome: "Nestor Chiesse" } },
  },
  {
    id: "skye",
    artigo: "a",
    nome: "Skye",
    numero: 14,
    nomeReal: "Kirra Foster",
    origem: "Nimbin, Austrália",
    chegou: "2020-10-27",
    vozes: { en: { nome: "Miranda O'Hare" }, pt: { nome: "Luísa Horta" } },
  },
  {
    id: "yoru",
    artigo: "o",
    nome: "Yoru",
    numero: 15,
    nomeReal: "Kiritani Ryo",
    origem: "Japão",
    chegou: "2021-01-12",
    vozes: { en: { nome: "Daisuke Takahashi" }, pt: { nome: "Renan Alonso" } },
  },
  {
    id: "astra",
    artigo: "a",
    nome: "Astra",
    numero: 16,
    nomeReal: "Efia Danso",
    origem: "Acra, Gana",
    chegou: "2021-03-02",
    vozes: { en: { nome: "Effie Nkrumah" }, pt: { nome: "Pamella Rodrigues" } },
  },
  {
    id: "kayo",
    artigo: "o",
    nome: "KAY/O",
    numero: 17,
    origem: "Uma Terra de outra linha do tempo",
    chegou: "2021-06-22",
    vozes: { en: { nome: "Gabe Kunda" }, pt: { nome: "Raul Rosa" } },
  },
  {
    id: "chamber",
    artigo: "o",
    nome: "Chamber",
    numero: 18,
    nomeReal: "Vincent Fabron",
    origem: "França",
    chegou: "2021-11-16",
    vozes: {
      en: { nome: "Hugo Pierre Martin" },
      pt: { nome: "Sérgio Moreno" },
    },
  },
  {
    id: "neon",
    artigo: "a",
    nome: "Neon",
    numero: 19,
    nomeReal: "Tala Nicole Dimaapi Valdez",
    origem: "Manila, Filipinas",
    chegou: "2022-01-11",
    vozes: {
      en: { nome: "Vanille Velasquez" },
      pt: { nome: "Giovanna Calegaretti", fonte: "dublacon-2022" },
    },
  },
  {
    id: "fade",
    artigo: "a",
    nome: "Fade",
    numero: 20,
    nomeReal: "Hazal Eyletmez",
    origem: "Istambul, Turquia",
    chegou: "2022-04-27",
    vozes: { en: { nome: "Selin Çuhadaroğlu" }, pt: { nome: "Júlia Ribas" } },
  },
  {
    id: "harbor",
    artigo: "o",
    nome: "Harbor",
    numero: 21,
    nomeReal: "Varun Batra",
    origem: "Índia",
    chegou: "2022-10-18",
    vozes: {
      en: { nome: "Sunil Malhotra" },
      pt: { nome: "Fabrício Vila Verde" },
    },
  },
  {
    id: "gekko",
    artigo: "o",
    nome: "Gekko",
    numero: 22,
    nomeReal: "Mateo Armendáriz De la Fuente",
    origem: "Los Angeles, EUA",
    chegou: "2023-03-07",
    vozes: {
      en: { nome: "Alejandro Antonio Ruiz" },
      pt: { nome: "Cadu Paschoal" },
    },
  },
  {
    id: "deadlock",
    artigo: "a",
    nome: "Deadlock",
    numero: 23,
    nomeReal: "Iselin Solem",
    origem: "Noruega",
    chegou: "2023-06-27",
    vozes: { en: { nome: "Nora Gjestvang" }, pt: { nome: "Carina Eiras" } },
  },
  {
    id: "iso",
    artigo: "o",
    nome: "Iso",
    numero: 24,
    nomeReal: "Li Zhao Yu",
    origem: "Chongqing, China",
    chegou: "2023-10-31",
    vozes: {
      en: { nome: "Ye Zichun" },
      pt: { nome: "Yuri Chesman", fonte: "iso-2023" },
    },
  },
  {
    id: "clove",
    artigo: "",
    nome: "Clove",
    numero: 25,
    nomeReal: "Ollie Baird",
    origem: "Edimburgo, Escócia",
    chegou: "2024-03-26",
    vozes: { en: { nome: "Isla Campbell" }, pt: { nome: "Luke Back" } },
  },
  {
    id: "vyse",
    artigo: "a",
    nome: "Vyse",
    numero: 26,
    chegou: "2024-08-28",
    vozes: { en: { nome: "Marta Svetek" }, pt: { nome: "Luciana Baroli" } },
  },
  {
    id: "tejo",
    artigo: "o",
    nome: "Tejo",
    numero: 27,
    origem: "Colômbia",
    chegou: "2025-01-08",
    vozes: { en: { nome: "Victor Turpin" }, pt: { nome: "Cassius Romero" } },
  },
  {
    id: "waylay",
    artigo: "a",
    nome: "Waylay",
    numero: 28,
    nomeReal: "Ariya Saengkaew",
    origem: "Tailândia",
    chegou: "2025-03-05",
    vozes: {
      en: { nome: "Mo Rodvanich" },
      pt: { nome: "Priscilla Concepcion" },
    },
  },
  {
    id: "veto",
    artigo: "o",
    nome: "Veto",
    numero: 29,
    origem: "Senegal",
    chegou: "2025-10-07",
    vozes: { en: { nome: "Bamar Kane" }, pt: { nome: "Nill Marcondes" } },
  },
  {
    id: "miks",
    artigo: "o",
    nome: "Miks",
    numero: 30,
    nomeReal: "Adrijan Vidović",
    origem: "Croácia",
    chegou: "2026-03-18",
    vozes: {
      en: { nome: "Jan Kovačić", confirmada: false },
      pt: { nome: "Gabriel Lodi" },
    },
  },
  {
    id: "hush",
    artigo: "a",
    nome: "Hush",
    numero: 31,
    origem: "Guangdong, China",
    chegou: "2026-10-27",
    vozes: {
      en: { nome: "Sanly Linlin", confirmada: false },
      pt: { nome: "Carol Sodré" },
    },
  },
]
