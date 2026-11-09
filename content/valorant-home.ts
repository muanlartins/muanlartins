import valorant from "@/content/valorant"
import { game } from "@/lib/game"

/**
 * Valorant's home at /conteudo/valorant: the second game, learned from Silver, live on Monday and Wednesday
 * nights (content/agenda.json). Its ranked record is content/valorant/, from the Partidas dock's Valorant tab;
 * `rank` is Luan's rank by hand until the first match there tells it. `aim` is the Voltaic page (content/voltaic/,
 * from scripts/voltaic.py). `inventory` is the weapon skins page (content/valorant-ideal.json is the collection Luan is
 * building; scripts/valorant_inventory.py reads the game and fetches the art into content/valorant-inventory.json).
 * The credits are Riot's "Legal Jibber Jabber", which fan sites using its art must show.
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
    pt: "Sou Prata no Valorant. Aqui fica o que estou aprendendo, um conceito de cada vez: as melhores fontes que encontrei para cada um e as dicas que funcionaram para mim. Só o que o jogo não explica em lugar nenhum.",
    en: "I'm Silver at Valorant. Here is what I'm learning, one concept at a time: the best sources I found for each and the tips that worked for me. Only what the game doesn't explain anywhere.",
  },
  roadmaps: [valorant],
  rank: "silver",
  ranked: {
    title: { pt: "Ranqueadas", en: "Ranked" },
    description: {
      pt: "Meu elo, meu RR e cada partida competitiva das lives.",
      en: "My rank, my RR and every competitive match from the streams.",
    },
  },
  aim: {
    title: { pt: "Mira", en: "Aim" },
    description: {
      pt: "Meu treino de mira com a Voltaic: a rotina no Aimlabs todo dia e o benchmark todo domingo, para ver a mira subir semana a semana.",
      en: "My aim training with Voltaic: their Aimlabs routine every day and their benchmark every Sunday, to watch my aim climb week by week.",
    },
  },
  inventory: {
    title: { pt: "Inventário", en: "Inventory" },
    description: {
      pt: "A skin que uso em cada arma e a coleção que estou montando, arma por arma.",
      en: "The skin I use on each weapon and the collection I'm building, weapon by weapon.",
    },
  },
  links: [],
  credits: {
    pt: "muanlartins não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games ou de qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games. Riot Games e todas as propriedades associadas são marcas comerciais ou marcas registradas da Riot Games, Inc. Os emblemas de rank são da Riot Games.",
    en: "muanlartins isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. The rank emblems belong to Riot Games.",
  },
})
