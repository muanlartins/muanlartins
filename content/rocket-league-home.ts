import type { Project } from "@/content/projects"
import rocketLeague from "@/content/rocket-league"
import { rlr } from "@/content/rlr"
import { game } from "@/lib/game"

/** The commented matches (2v2 and 3v3): the YouTube playlist "Rocket League Comentado", not a page here. */
const commented = {
  id: "partidas-comentadas",
  name: { pt: "Partidas comentadas", en: "Commented matches" },
  summary: {
    pt: "Partidas ranqueadas em que eu comento o que estava pensando em cada jogada.",
    en: "Ranked matches where I say what I was thinking on every play.",
  },
  href: "https://www.youtube.com/playlist?list=PLf2PbBfB1o0A",
  language: "pt",
} satisfies Project

/**
 * Rocket League's home at /conteudo/rocket-league, with the roadmap, the
 * ranked record, RLR and the commented series around it. Its lives are the
 * channel's (content/channel.ts).
 * The intro follows the Twitch bio.
 */
export default game({
  id: "rocket-league",
  title: { pt: "Rocket League", en: "Rocket League" },
  short: "RL",
  description: {
    pt: "Evoluir no Rocket League com o método científico.",
    en: "Getting better at Rocket League with the scientific method.",
  },
  intro: {
    pt: "Medindo o que funciona em cada técnica, em vídeos no YouTube e ao vivo na Twitch. Aqui ficam os fundamentos do jogo, organizados por rank, e o registro das minhas ranqueadas.",
    en: "Measuring what works in each technique, in videos on YouTube and live on Twitch. Here are the game's fundamentals, organized by rank, and the record of my ranked games.",
  },
  roadmaps: [rocketLeague],
  ranked: {
    title: { pt: "Ranqueadas", en: "Ranked" },
    description: {
      pt: "Meu ranque, meus pontos e cada partida ranqueada das lives, em 1v1, 2v2 e 3v3.",
      en: "My rank, my points and every ranked match from the streams, in 1v1, 2v2 and 3v3.",
    },
  },
  links: [rlr, commented],
  credits: {
    pt: "Rocket League e os emblemas de rank são da Psyonix/Epic Games; este site não é oficial nem afiliado. Modelos 3D do Octane e da bola por Jako (CC BY 4.0).",
    en: "Rocket League and its rank emblems belong to Psyonix/Epic Games; this site is unofficial and not affiliated. Octane and ball 3D models by Jako (CC BY 4.0).",
  },
})
