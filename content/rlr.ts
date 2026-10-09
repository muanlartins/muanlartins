import type { Project } from "@/content/projects"

/** RLR, the replay player and tactics board: its own app (github.com/muanlartins/rlr), served at /rlr/ on both sites. */
export const rlr = {
  id: "rlr",
  name: { pt: "RLR", en: "RLR" },
  summary: {
    pt: "TODO: what RLR is, in a sentence.",
    en: "TODO: what RLR is, in a sentence.",
  },
  href: "/rlr/",
} satisfies Project
