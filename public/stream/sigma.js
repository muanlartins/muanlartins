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
  const NOMES = {
    pt: { bronze: "Bronze", silver: "Prata", gold: "Ouro", platinum: "Platina", diamond: "Diamante", champion: "Campeão", "grand-champion": "Grande Campeão", "supersonic-legend": "Lenda Supersônica" },
    en: { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum", diamond: "Diamond", champion: "Champion", "grand-champion": "Grand Champion", "supersonic-legend": "Supersonic Legend" },
  }
  const nome = (id, lingua = "pt") => {
    const [, tier, n] = id.match(/^(.+?)(?:-(\d))?$/)
    return NOMES[lingua][tier] + (n ? " " + ["I", "II", "III"][n - 1] : "")
  }

  /** The rank for a total: its id (the emblem in /ranks/), name, where it starts, and the next one, if any. */
  function ranque(sigma = 0, lingua = "pt") {
    let i = 0
    while (i + 1 < RL.length && sigma >= RL[i + 1][0]) i++
    const [desde, id] = RL[i]
    const [ate, proximo] = RL[i + 1] ?? []
    return { id, nome: nome(id, lingua), emblema: `/ranks/${id}.webp`, desde, ate: ate ?? null, proximo: proximo ? nome(proximo, lingua) : null }
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

  window.Sigma = { RL, ranque, peso, COR_LIVRE, MEDALHAS, medalhas }
})()
