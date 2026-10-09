import type { Project } from "@/content/projects"

/** RLR, the replay player and tactics board: its own app (github.com/muanlartins/rlr), served at /rlr/ on both sites. */
export const rlr = {
  id: "rlr",
  name: { pt: "RLR", en: "RLR" },
  summary: {
    pt: "Ferramenta para visualização de replays e aprendizado de Rocket League.",
    en: "A tool for viewing replays and learning Rocket League.",
  },
  href: "/rlr/",
} satisfies Project
