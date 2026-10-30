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
 * ranked record, the lives, RLR and the commented series around it.
 * The intro follows the Twitch bio.
 */
export default game({
  id: "rocket-league",
  title: { pt: "Rocket League", en: "Rocket League" },
  description: {
    pt: "Evoluir no Rocket League com o método científico.",
    en: "Getting better at Rocket League with the scientific method.",
  },
  intro: {
    pt: "Medindo o que funciona em cada técnica, em vídeos no YouTube e ao vivo na Twitch. Aqui ficam os fundamentos do jogo, organizados por rank, e o registro das minhas ranqueadas.",
    en: "Measuring what works in each technique, in videos on YouTube and live on Twitch. Here are the game's fundamentals, organized by rank, and the record of my ranked games.",
  },
  roadmap: rocketLeague,
  ranked: {
    title: { pt: "Ranqueadas", en: "Ranked" },
    description: {
      pt: "Meu ranque, meus pontos e cada partida ranqueada das lives, em 1v1, 2v2 e 3v3.",
      en: "My rank, my points and every ranked match from the streams, in 1v1, 2v2 and 3v3.",
    },
  },
  // TODO(Luan): rewrite in your voice.
  lives: {
    title: { pt: "Lives", en: "Streams" },
    description: {
      pt: "As lives da Twitch na íntegra: ao vivo aqui mesmo quando estou no ar e, depois, cada uma com capítulos, as partidas e a transcrição do que eu falei.",
      en: "The Twitch streams in full: live right here while I'm on air and, afterwards, each one with chapters, the matches and a transcript of what I said.",
    },
  },
  links: [rlr, commented2v2],
})
