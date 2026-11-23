/**
 * Universo Valorant's bibliography (/conteudo/valorant/universo/referencias): every source the pages lean on, each
 * opened (or, for a video, its captions or metadata read) and found to say what the page says, with how far it was
 * read (`lido`). The research behind it is in ~/.local/share/muanlartins/valorant-lore/ (one dossier per topic).
 * A page names its sources by id; the build refuses an id that isn't here.
 */

export type TipoFonte =
  "jogo" | "riot" | "wiki" | "academico" | "imprensa" | "video" | "dados"

export interface Fonte {
  id: string
  titulo: string
  autor: string
  url?: string
  /** When it was published, YYYY-MM-DD, when it says. */
  data?: string
  tipo: TipoFonte
  lingua: "pt" | "en" | "ja"
  /** How far it was read: "inteiro", a part, or only a video's metadata. */
  lido: string
}

export const FONTES: Fonte[] = [
  {
    id: "jogo",
    titulo:
      "Os arquivos do próprio jogo, versão 13.10: as falas em português e em inglês, os eventos que tocam cada uma e os nomes internos",
    autor: "Riot Games",
    tipo: "jogo",
    lingua: "pt",
    lido: "As falas de cada agente com página, todas",
  },
  {
    id: "valorant-api",
    titulo:
      "valorant-api.com: os textos do jogo (apresentação dos agentes, habilidades, codinomes, coordenadas dos mapas) em português e inglês",
    autor: "valorant-api.com (espelho dos arquivos do jogo, feito por fãs)",
    url: "https://valorant-api.com/v1/agents?language=pt-BR",
    tipo: "dados",
    lingua: "pt",
    lido: "Todos os agentes e mapas, 23/11/2026",
  },
  {
    id: "fandom-wiki",
    titulo:
      "VALORANT Wiki: as fichas dos agentes (nome real, origem, número, voz em inglês) e as páginas de falas",
    autor: "Comunidade da VALORANT Wiki (Fandom)",
    url: "https://valorant.fandom.com/wiki/Agents",
    tipo: "wiki",
    lingua: "en",
    lido: "A ficha de cada agente e as falas de cada agente com página",
  },
  {
    id: "lore-wiki",
    titulo: "VALORANT Lore Wiki",
    autor: "Comunidade da VALORANT Lore Wiki (Fandom)",
    url: "https://valorant-lore.fandom.com/",
    tipo: "wiki",
    lingua: "en",
    lido: "As páginas de cada agente com página e das cinemáticas citadas",
  },
  {
    id: "dublagem-wiki",
    titulo:
      "Dublagem Wiki: Valorant (elenco da dublagem brasileira, estúdio e direção)",
    autor: "Comunidade da Dublagem Wiki (Fandom)",
    url: "https://dublagem.fandom.com/wiki/Valorant",
    tipo: "wiki",
    lingua: "pt",
    lido: "Inteiro, na revisão de 09/11/2026",
  },
  {
    id: "dublacon-2022",
    titulo: "O painel da Riot Games na Dublacon 2022",
    autor: "Legião dos Heróis",
    url: "https://www.legiaodosherois.com.br/2022/riot-games-league-of-legends-painel-dublacon-2022.html",
    data: "2022",
    tipo: "imprensa",
    lingua: "pt",
    lido: "Inteiro",
  },
  {
    id: "iso-2023",
    titulo: "Entrevista com Yuri Chesman, a voz do Iso no Valorant",
    autor: "Leo Gravena, Legião dos Heróis",
    url: "https://www.legiaodosherois.com.br/2023/entrevista-yuri-chesman-voz-iso-valorant.html",
    data: "2023-11-01",
    tipo: "imprensa",
    lingua: "pt",
    lido: "Inteiro",
  },
  {
    id: "historia-ate-agora",
    titulo: "A história do VALORANT até agora",
    autor: "David Nottingham (diretor criativo), Riot Games",
    url: "https://playvalorant.com/en-us/news/dev/the-story-of-valorant-so-far/",
    data: "2021-06-01",
    tipo: "riot",
    lingua: "en",
    lido: "Inteiro",
  },
  {
    id: "legal-jibber-jabber",
    titulo: "Legal Jibber Jabber: a política da Riot pra conteúdo de fãs",
    autor: "Riot Games",
    url: "https://www.riotgames.com/en/legal",
    tipo: "riot",
    lingua: "en",
    lido: "Inteiro",
  },
  // Raze's page (the research of 2026-11-23, ~/.local/share/muanlartins/valorant-lore/raze/).
  {
    id: "riot-artigo-raze-ptbr",
    titulo:
      "Como os Rioters brasileiros ajudaram a criar Raze, a duelista dançarina soteropolitana",
    autor: "Riot Games",
    url: "https://www.riotgames.com/pt-br/not%C3%ADcias/como-os-rioters-brasileiros-ajudaram-a-criar-raze-a-duelista-dancarina-soteropolitana",
    data: "2022-04-07",
    tipo: "riot",
    lingua: "pt",
    lido: "Inteiro",
  },
  {
    id: "riot-artigo-raze-en",
    titulo:
      "How Rioters in Brazil Helped Create Raze, the Dancing Salvadorian Duelist",
    autor: "Riot Games",
    url: "https://www.riotgames.com/en/news/how-rioters-in-brazil-helped-create-raze-the-dancing-salvadorian-duelist",
    data: "2022-04-07",
    tipo: "riot",
    lingua: "en",
    lido: "Inteiro",
  },
  {
    id: "opovo-nottingham",
    titulo:
      "EXCLUSIVO: diretor de Valorant revela bastidores de criação de agentes",
    autor: "Wanderson Trindade (entrevista com David Nottingham)",
    url: "https://mais.opovo.com.br/colunistas/wanderson-trindade/2025/06/11/exclusivo-diretor-de-valorant-revela-bastidores-de-criacao-de-agentes-valorant.html",
    data: "2025-06-11",
    tipo: "imprensa",
    lingua: "pt",
    lido: "Inteiro",
  },
  {
    id: "tcc-ufrj-mello-2023",
    titulo:
      "Chegou o reggae: a localização da personagem Raze no jogo Valorant",
    autor:
      "Luis Gustavo Gonçalves de Mello (orientadora: Profa. Dra. Janine Pimentel), Faculdade de Letras, UFRJ",
    url: "https://pantheon.ufrj.br/bitstream/11422/22178/3/LGGMello.pdf",
    data: "2023",
    tipo: "academico",
    lingua: "pt",
    lido: "Inteiro (29 páginas)",
  },
  {
    id: "ovicast-marina-santana",
    titulo: "Dubladora da RAZE - MARINA SANTANA (OVICAST OFICIAL)",
    autor: "Catarine Struck (canal @ovicaat; programa OVICAST)",
    url: "https://www.youtube.com/watch?v=HLonllOVIR0",
    data: "2022-06-05",
    tipo: "video",
    lingua: "pt",
    lido: "As legendas automáticas, inteiras (19:54)",
  },
  {
    id: "marina-santana-canal-youtube",
    titulo: "Canal da Marina Santana no YouTube: “Sou a voz da Raze”",
    autor: "Marina Santana",
    url: "https://www.youtube.com/@MarinaSantana",
    tipo: "video",
    lingua: "pt",
    lido: "Descrição do canal e lista dos 11 vídeos (só títulos)",
  },
  {
    id: "yt-bastidores",
    titulo: "VALORANT | Bastidores - Raze: A Cor da Cidade (live)",
    autor: "VALORANT // Brasil (Riot Brasil + Lightfarm)",
    url: "https://www.youtube.com/watch?v=mD70_hA03CM",
    data: "2021-06-16",
    tipo: "video",
    lingua: "pt",
    lido: "As legendas automáticas, nos trechos 43:38–53:20, 60:07–67:27 e 69:52–75:56",
  },
  {
    id: "ravassa-betka-highlights",
    titulo: "Valorant Writer and Raze Voice Actor Hang Out!",
    autor: "Ravassa (Carolina Ravassa); compilação de Danielle Brito",
    url: "https://www.youtube.com/watch?v=Iqp3pHw_grE",
    data: "2020-09-16",
    tipo: "video",
    lingua: "en",
    lido: "As legendas automáticas, inteiras (16:44)",
  },
  {
    id: "ravassa-lyerly-highlights",
    titulo:
      "Raze and Voice Director of Valorant, David Lyerly, Hang on Twitch!",
    autor: "Ravassa (Carolina Ravassa); compilação de Danielle Brito",
    url: "https://www.youtube.com/watch?v=P0FdmKPk19Y",
    data: "2021-01-03",
    tipo: "video",
    lingua: "en",
    lido: "As legendas automáticas, inteiras (16:19)",
  },
  {
    id: "sportskeeda-ravassa",
    titulo:
      "“I loved Valorant’s Raze as a character, so I knew I’d have fun recording her”: Carolina Ravassa",
    autor: "Pratiti Dhang",
    url: "https://www.sportskeeda.com/valorant/news-i-loved-valorant-s-raze-character-i-knew-i-d-fun-recording-her-carolina-ravassa",
    data: "2021-08-05",
    tipo: "imprensa",
    lingua: "en",
    lido: "Inteiro",
  },
  {
    id: "fandom-valorant-protocol",
    titulo: "VALORANT Protocol (VALORANT Wiki, Fandom)",
    autor: "Comunidade da VALORANT Wiki (Fandom)",
    url: "https://valorant.fandom.com/wiki/VALORANT_Protocol",
    tipo: "wiki",
    lingua: "en",
    lido: "Seção dos dossiês da chantagista (Raze e Breach) e a tabela de agentes",
  },
  {
    id: "fandom-range-lore",
    titulo: "Range/Lore EP4–EP9, V25 e Template:Latest Range Lore (V26)",
    autor: "Comunidade da VALORANT Wiki (Fandom)",
    url: "https://valorant.fandom.com/wiki/Range/Lore",
    tipo: "wiki",
    lingua: "en",
    lido: "As 9 páginas, em todos os trechos que citam a Raze",
  },
  {
    id: "lore-wiki-raze",
    titulo: "Raze (VALORANT Lore Wiki)",
    autor: "Comunidade da VALORANT Lore Wiki (Fandom)",
    url: "https://valorant-lore.fandom.com/wiki/Raze",
    tipo: "wiki",
    lingua: "en",
    lido: "Inteiro",
  },
  {
    id: "lore-wiki-nanobomb",
    titulo: "Nanobomb (VALORANT Lore Wiki)",
    autor: "Comunidade da VALORANT Lore Wiki (Fandom)",
    url: "https://valorant-lore.fandom.com/wiki/Nanobomb",
    tipo: "wiki",
    lingua: "en",
    lido: "Inteiro",
  },
  {
    id: "tw-512-post5",
    titulo: "@PlayVALORANT, takeover 5.12, post 5 (o beijo)",
    autor: "VALORANT",
    url: "https://twitter.com/PlayVALORANT/status/1601970067356491776",
    data: "2022-12-11",
    tipo: "riot",
    lingua: "en",
    lido: "A imagem",
  },
  {
    id: "tw-davidnotty-canonical",
    titulo: "@davidnotty: 'Canonical'",
    autor: "David Nottingham",
    url: "https://twitter.com/davidnotty/status/1601974103497482240",
    data: "2022-12-11",
    tipo: "riot",
    lingua: "en",
    lido: "O texto",
  },
  {
    id: "tw-kingkut-breakdance",
    titulo:
      "Resposta de Riot KingKut no Discord de lore (print postado por @cynprel)",
    autor: "David Nottingham (Riot KingKut)",
    url: "https://twitter.com/cynprel/status/1421320726557073410",
    data: "2021-07-31",
    tipo: "riot",
    lingua: "en",
    lido: "A imagem do print",
  },
  {
    id: "tw-kingkut-breach-arms",
    titulo:
      "Resposta de Riot KingKut no Discord de lore (print postado por @NotToDisturb)",
    autor: "David Nottingham (Riot KingKut)",
    url: "https://twitter.com/NotToDisturb/status/1421271550054080518",
    data: "2021-07-31",
    tipo: "riot",
    lingua: "en",
    lido: "A imagem do print",
  },
  {
    id: "yt-a-cor-da-cidade",
    titulo: "VALORANT | Raze: A Cor da Cidade",
    autor: "VALORANT // Brasil",
    url: "https://www.youtube.com/watch?v=Pka9k_elCkA",
    data: "2021-06-10",
    tipo: "video",
    lingua: "pt",
    lido: "Os créditos e as legendas em português e em inglês, inteiras",
  },
  {
    id: "yt-o-que-for-bom",
    titulo: "VALORANT | Raze - O que for bom!",
    autor: "VALORANT // Brasil",
    url: "https://www.youtube.com/watch?v=L36C5IoA0KA",
    data: "2022-02-21",
    tipo: "video",
    lingua: "pt",
    lido: "Os créditos e a legenda em português, inteira",
  },
  {
    id: "yt-mixtape-live-raze",
    titulo: "VALORANT | BaianaSystem – MIXTAPE LIVE RAZE",
    autor: "VALORANT // Brasil",
    url: "https://www.youtube.com/watch?v=Yj9A6SXNwZ4",
    data: "2021-06-19",
    tipo: "video",
    lingua: "pt",
    lido: "Só os dados do vídeo",
  },
  {
    id: "api-contracts",
    titulo: "valorant-api: contratos (Raze Gear / Equipamentos da Raze)",
    autor: "valorant-api.com (espelho dos arquivos do jogo, feito por fãs)",
    url: "https://valorant-api.com/v1/contracts?language=pt-BR",
    tipo: "dados",
    lingua: "pt",
    lido: "O contrato da Raze inteiro, em inglês e em português",
  },
  {
    id: "api-cosmeticos",
    titulo: "valorant-api: cards, sprays, chaveiros e títulos (en-US e pt-BR)",
    autor: "valorant-api.com (espelho dos arquivos do jogo, feito por fãs)",
    url: "https://valorant-api.com/v1/playercards?language=pt-BR",
    tipo: "dados",
    lingua: "pt",
    lido: "Os cards, sprays, chaveiros e títulos com o nome dela, nos dois idiomas",
  },
  {
    id: "tw-valorantbrasil-girias",
    titulo: "@VALORANTBrasil: 'Bora tocá um rebu!'",
    autor: "VALORANT Brasil",
    url: "https://twitter.com/VALORANTBrasil/status/1265349835441537030",
    data: "2020-05-26",
    tipo: "riot",
    lingua: "pt",
    lido: "Só o texto do post",
  },
  {
    id: "yt-revelation",
    titulo: "REVELATION // Episode 6 Cinematic - VALORANT",
    autor: "VALORANT",
    url: "https://www.youtube.com/watch?v=XfuMEmcz3k0",
    data: "2023-01-05",
    tipo: "video",
    lingua: "en",
    lido: "Só os dados do vídeo",
  },
  {
    id: "yt-warm-up",
    titulo: "WARM UP // Episode 4 Cinematic - VALORANT",
    autor: "VALORANT",
    url: "https://www.youtube.com/watch?v=OyLHi34Qzv4",
    data: "2022-01-10",
    tipo: "video",
    lingua: "en",
    lido: "Só os dados do vídeo",
  },
  {
    id: "yt-why-we-fight-back",
    titulo:
      "WHY WE FIGHT BACK // Season 2026 Cinematic Kickoff Trailer - VALORANT",
    autor: "VALORANT",
    url: "https://www.youtube.com/watch?v=AnGdzz-XWcE",
    data: "2026-01-05",
    tipo: "video",
    lingua: "en",
    lido: "Só os dados do vídeo",
  },
  {
    id: "kokido-post-x",
    titulo:
      "Post no X de 古城門志帆 (@kokidokiko, a própria atriz) anunciando o papel de Raze",
    autor: "古城門志帆 (Kokido Shiho)",
    url: "https://x.com/kokidokiko/status/1442438411202097160",
    data: "2021-09-27",
    tipo: "imprensa",
    lingua: "ja",
    lido: "Inteiro",
  },
  {
    id: "tw-agents-of-romance",
    titulo: "@PlayVALORANT: VALORANT: Agents of Romance (1º de abril)",
    autor: "VALORANT",
    url: "https://twitter.com/PlayVALORANT/status/1377636892041166851",
    data: "2021-04-01",
    tipo: "riot",
    lingua: "en",
    lido: "O texto e as 4 imagens",
  },
  {
    id: "olhar-digital-baianasystem",
    titulo:
      "BaianaSystem faz show exclusivo dentro de 'Valorant' no primeiro aniversário do jogo",
    autor: "Olhar Digital",
    url: "https://olhardigital.com.br/2021/06/09/games-e-consoles/baianasystem-show-exclusivo-live-valorant/",
    data: "2021-06-09",
    tipo: "imprensa",
    lingua: "pt",
    lido: "Inteiro",
  },
  {
    id: "ravassa-nottingham-highlights",
    titulo:
      "Raze and David Nottingham, Creative Director on Valorant Hang Out!",
    autor: "Ravassa (Carolina Ravassa); compilação de Danielle Brito",
    url: "https://www.youtube.com/watch?v=Mg80gQAJowA",
    data: "2021-06-17",
    tipo: "video",
    lingua: "en",
    lido: "As legendas automáticas, inteiras (15:41)",
  },
]

export function fonte(id: string): Fonte {
  const found = FONTES.find((each) => each.id === id)
  if (!found)
    throw new Error(`content/valorant-universo/fontes.ts: no source "${id}".`)
  return found
}
