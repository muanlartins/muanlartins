import { roadmap } from "@/lib/roadmap"

/**
 * Valorant's fundamentals, written the "Como estou aprendendo" way: Luan is a Silver, so each topic is what he
 * learned about one concept, with the best sources he found (`sources`), not a lesson from someone who knows.
 * Only what the game doesn't say anywhere: no settings, no menus.
 * Topics come as Luan names them; each sits under its pillar and concept with the rank where not knowing it starts
 * costing rounds, like Rocket League's (content/rocket-league.ts).
 */
/** Riot's emblems of a rank's three divisions (public/ranks/valorant, from valorant-api.com). */
const divisions = (rank: string) => [1, 2, 3].map((division) => `/ranks/valorant/${rank}-${division}.webp`)

export default roadmap({
  id: "valorant",
  game: "valorant",
  title: { pt: "Como estou aprendendo Valorant", en: "How I'm learning Valorant" },
  description: {
    pt: "Conceito por conceito, com as melhores fontes que encontrei para cada um.",
    en: "Concept by concept, with the best sources I found for each.",
  },
  language: "pt",
  video: "",
  ranks: [
    {
      id: "unranked",
      name: { pt: "Sem rank", en: "Unranked" },
      color: "#5f6675",
      icons: ["/ranks/valorant/unranked.webp"],
    },
    { id: "iron", name: { pt: "Ferro", en: "Iron" }, color: "#5b5f66", icons: divisions("iron") },
    { id: "bronze", name: { pt: "Bronze", en: "Bronze" }, color: "#8c6a3f", icons: divisions("bronze") },
    { id: "silver", name: { pt: "Prata", en: "Silver" }, color: "#5c6d71", icons: divisions("silver") },
    { id: "gold", name: { pt: "Ouro", en: "Gold" }, color: "#b0891c", icons: divisions("gold") },
    { id: "platinum", name: { pt: "Platina", en: "Platinum" }, color: "#2f8796", icons: divisions("platinum") },
    { id: "diamond", name: { pt: "Diamante", en: "Diamond" }, color: "#9a5fc0", icons: divisions("diamond") },
    { id: "ascendant", name: { pt: "Ascendente", en: "Ascendant" }, color: "#1f9a62", icons: divisions("ascendant") },
    { id: "immortal", name: { pt: "Imortal", en: "Immortal" }, color: "#b8304f", icons: divisions("immortal") },
    { id: "radiant", name: { pt: "Radiante", en: "Radiant" }, color: "#c29a12", icons: ["/ranks/valorant/radiant.webp"] },
  ],
  pillars: [
    { id: "mechanics", name: { pt: "Mecânica", en: "Mechanics" }, concepts: [] },
    { id: "strategy", name: { pt: "Estratégia", en: "Strategy" }, concepts: [] },
  ],
})
