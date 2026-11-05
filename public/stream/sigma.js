// Σ, the channel's points: one total per viewer, earned in the lives and never spent or lost. Each game
// shows it as its own ranks. Shared by the crowd overlay (torcida.html) and the profile page on the site,
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

  window.Sigma = { RL, ranque, peso, COR_LIVRE }
})()
