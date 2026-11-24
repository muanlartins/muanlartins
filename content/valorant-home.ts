import { RIOT_NOTICE } from "@/content/notices"
import valorant from "@/content/valorant"
import { game } from "@/lib/game"

/**
 * Valorant's home at /conteudo/valorant: the second game, learned from Silver, live on Monday and Wednesday
 * nights (content/agenda.json). Its ranked record is content/valorant/, from the Partidas dock's Valorant tab;
 * `rank` is Luan's rank by hand until the first match there tells it. `aim` is the Voltaic page (content/voltaic/,
 * from scripts/voltaic.py). `inventory` is the weapon skins page: the channel's collection and game reading, and anyone's
 * dream loadout (lib/valorant-inventory.ts). `universo` is Universo Valorant (lib/valorant-universo.ts).
 * The credits are Riot's "Legal Jibber Jabber", which fan sites using its art must show. Archived since 2026-11-24
 * (ARCHIVED_GAMES in lib/game.ts): its pages stay at their addresses, listed nowhere, with `archivedNote` over them.
 */
export default game({
  id: "valorant",
  title: { pt: "Valorant", en: "Valorant" },
  short: "VAL",
  description: {
    pt: "Como estou aprendendo Valorant, saindo do Prata.",
    en: "How I'm learning Valorant, starting from Silver.",
  },
  intro: {
    pt: "Sou Prata no Valorant. Aqui fica o que estou aprendendo, um conceito de cada vez: as melhores fontes que encontrei pra cada um e as dicas que funcionaram pra mim. Só o que o jogo não explica em lugar nenhum.",
    en: "I'm Silver at Valorant. Here is what I'm learning, one concept at a time: the best sources I found for each and the tips that worked for me. Only what the game doesn't explain anywhere.",
  },
  roadmaps: [valorant],
  rank: "silver",
  ranked: {
    title: { pt: "Ranqueadas", en: "Ranked" },
    description: {
      pt: "Meu rank, meu RR e cada partida ranqueada, nas lives e fora delas.",
      en: "My rank, my RR and every ranked match, on stream and off it.",
    },
  },
  aim: {
    title: { pt: "Mira", en: "Aim" },
    description: {
      pt: "Meu treino de mira no Aimlabs e a minha mira nas partidas, medidos do mesmo jeito: o treino está chegando no jogo?",
      en: "My aim training in Aimlabs and my aim in matches, measured the same way: is the training reaching the game?",
    },
  },
  inventory: {
    title: { pt: "Inventário", en: "Inventory" },
    description: {
      pt: "A coleção que estou montando, a skin que uso em cada arma e o seu loadout dos sonhos: monta com qualquer skin do jogo e exporta numa imagem.",
      en: "The collection I'm building, the skin I use on each weapon, and your dream loadout: build it from any skin in the game and export it as one image.",
    },
  },
  universo: {
    title: { pt: "Universo", en: "Universe" },
    description: {
      pt: "Os agentes, as vozes, as falas e as curiosidades do mundo de Valorant, tudo com fonte.",
      en: "The agents, their voices, their lines and the curiosities of Valorant's world, all sourced.",
    },
  },
  links: [],
  // TODO(Luan): rascunho, a frase é sua.
  archivedNote: {
    pt: "Arquivado: o canal está focado em Rocket League. Tudo do Valorant continua aqui.",
    en: "Archived: the channel is focused on Rocket League. Everything of Valorant's is still here.",
  },
  credits: {
    pt: `muanlartins não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games ou de qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games. Riot Games e todas as propriedades associadas são marcas comerciais ou marcas registradas da Riot Games, Inc. Os emblemas de rank são da Riot Games. ${RIOT_NOTICE.pt}`,
    en: `muanlartins isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. The rank emblems belong to Riot Games. ${RIOT_NOTICE.en}`,
  },
})
