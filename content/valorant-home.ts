import valorant from "@/content/valorant"
import { game } from "@/lib/game"

/**
 * Valorant's home at /conteudo/valorant: the second game, learned from Bronze, live on Monday and Wednesday
 * nights (content/agenda.json). No ranked record yet: the Partidas dock reads Rocket League.
 * The credits are Riot's "Legal Jibber Jabber", which fan sites using its art must show.
 */
export default game({
  id: "valorant",
  title: { pt: "Valorant", en: "Valorant" },
  short: "VAL",
  description: {
    pt: "Como estou aprendendo Valorant, saindo do Bronze.",
    en: "How I'm learning Valorant, starting from Bronze.",
  },
  intro: {
    pt: "Sou Bronze no Valorant. Aqui fica o que estou aprendendo, um conceito de cada vez: as melhores fontes que encontrei para cada um e as dicas que funcionaram para mim. Só o que o jogo não explica em lugar nenhum.",
    en: "I'm a Bronze at Valorant. Here is what I'm learning, one concept at a time: the best sources I found for each and the tips that worked for me. Only what the game doesn't explain anywhere.",
  },
  roadmaps: [valorant],
  rank: "bronze",
  links: [],
  credits: {
    pt: "muanlartins não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games ou de qualquer pessoa oficialmente envolvida na produção ou gestão das propriedades da Riot Games. Riot Games e todas as propriedades associadas são marcas comerciais ou marcas registradas da Riot Games, Inc. Os emblemas de rank são da Riot Games.",
    en: "muanlartins isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. The rank emblems belong to Riot Games.",
  },
})
