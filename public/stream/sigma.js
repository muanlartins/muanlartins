// Σ, the channel's points: one total per viewer, earned in the lives and never spent or lost. Each game
// shows it as its own ranks; badges show the rest of what a viewer has done. Shared by the crowd overlay (torcida.html) and the profile page on the site,
// like torcedor.js; the Σ API (infra/site.yml) keeps the totals. Plain script, no build: sets window.Sigma.

;(() => {
  // Rocket League's ranks for a total: the first come quickly, the top takes about a year of lives
  // (~290 hours). Each step is ~28% more than the one before.
  const RL = [
    [0, "bronze-1"], [30, "bronze-2"], [70, "bronze-3"],
    [120, "silver-1"], [180, "silver-2"], [260, "silver-3"],
    [370, "gold-1"], [500, "gold-2"], [670, "gold-3"],
    [900, "platinum-1"], [1180, "platinum-2"], [1550, "platinum-3"],
    [2000, "diamond-1"], [2600, "diamond-2"], [3400, "diamond-3"],
    [4400, "champion-1"], [5650, "champion-2"], [7300, "champion-3"],
    [9400, "grand-champion-1"], [12100, "grand-champion-2"], [15500, "grand-champion-3"],
    [20000, "supersonic-legend"],
  ]
  // Valorant's for the same totals: its 25 steps over the same year, Gold 1 where Rocket League's Gold I is (370 Σ,
  // where free colours unlock), Radiant at the top like Supersonic Legend.
  const VALORANT = [
    [0, "iron-1"], [15, "iron-2"], [35, "iron-3"],
    [60, "bronze-1"], [90, "bronze-2"], [125, "bronze-3"],
    [170, "silver-1"], [225, "silver-2"], [290, "silver-3"],
    [370, "gold-1"], [470, "gold-2"], [600, "gold-3"],
    [760, "platinum-1"], [960, "platinum-2"], [1210, "platinum-3"],
    [1520, "diamond-1"], [1900, "diamond-2"], [2400, "diamond-3"],
    [3000, "ascendant-1"], [3800, "ascendant-2"], [4800, "ascendant-3"],
    [6100, "immortal-1"], [7900, "immortal-2"], [10300, "immortal-3"],
    [20000, "radiant"],
  ]
  const JOGOS = {
    "rocket-league": {
      escada: RL,
      pasta: "/ranks/",
      divisoes: ["I", "II", "III"],
      nomes: {
        pt: { bronze: "Bronze", silver: "Prata", gold: "Ouro", platinum: "Platina", diamond: "Diamante", champion: "Campeão", "grand-champion": "Grande Campeão", "supersonic-legend": "Lenda Supersônica" },
        en: { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum", diamond: "Diamond", champion: "Champion", "grand-champion": "Grand Champion", "supersonic-legend": "Supersonic Legend" },
      },
    },
    valorant: {
      escada: VALORANT,
      pasta: "/ranks/valorant/",
      divisoes: ["1", "2", "3"],
      nomes: {
        pt: { iron: "Ferro", bronze: "Bronze", silver: "Prata", gold: "Ouro", platinum: "Platina", diamond: "Diamante", ascendant: "Ascendente", immortal: "Imortal", radiant: "Radiante", unranked: "Sem rank" },
        en: { iron: "Iron", bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum", diamond: "Diamond", ascendant: "Ascendant", immortal: "Immortal", radiant: "Radiant", unranked: "Unranked" },
      },
    },
  }
  /** A rank's name from its emblem's id: "silver-2" → "Prata II" (Valorant: "Prata 2"). */
  const nome = (id, lingua = "pt", jogo = "rocket-league") => {
    const { nomes, divisoes } = JOGOS[jogo] ?? JOGOS["rocket-league"]
    const [, tier, n] = id.match(/^(.+?)(?:-(\d))?$/)
    return nomes[lingua][tier] + (n ? " " + divisoes[n - 1] : "")
  }

  /**
   * The rank for a total, in a game's ranks (Rocket League's unless `jogo` says "valorant"): its id (the emblem in
   * /ranks/ or /ranks/valorant/), name, where it starts, and the next one, if any.
   */
  function ranque(sigma = 0, lingua = "pt", jogo = "rocket-league") {
    const { escada, pasta } = JOGOS[jogo] ?? JOGOS["rocket-league"]
    let i = 0
    while (i + 1 < escada.length && sigma >= escada[i + 1][0]) i++
    const [desde, id] = escada[i]
    const [ate, proximo] = escada[i + 1] ?? []
    return { id, nome: nome(id, lingua, jogo), emblema: `${pasta}${id}.webp`, desde, ate: ate ?? null, proximo: proximo ? nome(proximo, lingua, jogo) : null }
  }

  // The goal's dedication: more Σ, more chance, flattened by a log so a newcomer still gets theirs
  // (0 Σ weighs 1, 100 Σ weighs 5.6, 20,000 Σ weighs 10.9).
  const peso = (sigma = 0) => 1 + Math.log(1 + sigma)

  // From Ouro I on, a fan may wear any colour, not only the palette.
  const COR_LIVRE = 370

  // Badges: what a viewer has done, each in eight levels, past any rank. Watching (hours, lives), coming back
  // (their longest run of lives in a row, Duolingo-style; the run going now is `sequencia`) and Pix sent
  // (reais, only on their own profile: GET /eu). A level is the highest mark reached; nothing is ever lost.
  const MEDALHAS = [
    { id: "horas", valor: (s) => Math.floor((s.minutos ?? 0) / 60), marcos: [1, 5, 10, 25, 50, 100, 250, 500] },
    { id: "lives", valor: (s) => s.lives ?? 0, marcos: [1, 3, 10, 25, 50, 100, 200, 365] },
    { id: "seguidas", valor: (s) => Math.max(s.recorde ?? 0, s.sequencia ?? 0), marcos: [2, 3, 5, 10, 20, 30, 50, 100] },
    { id: "doado", valor: (s) => Math.floor((s.doado ?? 0) / 100), marcos: [1, 10, 25, 50, 100, 250, 500, 1000] },
  ]
  const MEDALHA_NOMES = {
    pt: { horas: "Horas assistidas", lives: "Lives assistidas", seguidas: "Lives seguidas", doado: "Reais em Pix" },
    en: { horas: "Hours watched", lives: "Lives watched", seguidas: "Lives in a row", doado: "Reais in Pix" },
  }

  /** Each badge for these stats: its level (0 to 8), the mark it reached and the next one, and the way there. */
  function medalhas(stats = {}, lingua = "pt") {
    return MEDALHAS.filter((m) => m.id !== "doado" || stats.doado !== undefined).map((m) => {
      const valor = m.valor(stats)
      const nivel = m.marcos.filter((x) => valor >= x).length
      const marco = m.marcos[nivel - 1] ?? 0
      const proximo = m.marcos[nivel] ?? null
      return { id: m.id, nome: MEDALHA_NOMES[lingua][m.id], valor, nivel, niveis: m.marcos.length, marco, proximo, progresso: proximo === null ? 1 : (valor - marco) / (proximo - marco) }
    })
  }

  window.Sigma = { RL, VALORANT, ranque, peso, COR_LIVRE, MEDALHAS, medalhas }
})()
