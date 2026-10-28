import type { Project } from "@/content/projects"
import rocketLeague from "@/content/rocket-league"
import { rlr } from "@/content/rlr"
import { game } from "@/lib/game"

/** The commented 2v2 ranked series: a YouTube playlist, not a page here. */
const commented2v2 = {
  id: "2v2-comentado",
  name: { pt: "2v2 Comentado", en: "2v2, commented" },
  summary: {
    pt: "Partidas ranqueadas de 2v2, rumo ao Champion, comentando o que eu estou pensando em cada jogada.",
    en: "Ranked 2v2 matches on the way to Champion, saying what I'm thinking on every play.",
  },
  href: "https://www.youtube.com/playlist?list=PLf2PbBfB1o0A",
  language: "pt",
} satisfies Project

/**
 * Rocket League's home at /conteudo/rocket-league, with the roadmap, the
 * ranked record, RLR and the commented series around it.
 * TODO(Luan): the description and intro are placeholders taken from the
 * channel's pitch; rewrite them in your voice.
 */
export default game({
  id: "rocket-league",
  title: { pt: "Rocket League", en: "Rocket League" },
  description: {
    pt: "Evoluir no Rocket League com o método científico.",
    en: "Getting better at Rocket League with the scientific method.",
  },
  intro: {
    pt: `TODO: a ideia do canal, em poucas linhas. Por que Rocket League, e o que é evoluir com o método científico: escolher uma técnica, treinar, medir.

TODO: onde acompanhar. Os vídeos saem no YouTube, em português, e as ranqueadas são ao vivo na Twitch.`,
    en: `TODO: the channel's idea in a few lines. Why Rocket League, and what improving with the scientific method means: pick a technique, drill it, measure it.

TODO: where to follow along. Videos come out on YouTube, in Brazilian Portuguese, and the ranked games are live on Twitch.`,
  },
  roadmap: rocketLeague,
  ranked: {
    title: { pt: "Ranqueadas", en: "Ranked" },
    description: {
      pt: "Meu ranque, meus pontos e cada partida ranqueada das lives, em 1v1, 2v2 e 3v3.",
      en: "My rank, my points and every ranked match from the streams, in 1v1, 2v2 and 3v3.",
    },
  },
  links: [rlr, commented2v2],
})
