// A viewer's ball in the minigames. Since 2026-11-26 it's their fan's head made round (fas3d.js's bola bakes its map;
// disco below draws it flat for the duel); until it's baked, and on pages without the 3D fan, the shirt below.
// Until then the marble was made from their fan (Luan, 2026-11-17: "a bolinha deve ser personalizável, talvez
// automaticamente personalizada baseada em como a pessoa personaliza o avatar"): the shirt's colours and pattern
// wrapped round a sphere, the number on it when the shirt has one, and the finish their Σ rank unlocks, like the
// duel's weapons (looks only). Shared by the race's overlay (corrida.html) and the site's minigames page, which draw
// the same texture on a three.js sphere. Plain script: sets Bolinha on the page.

;(function () {
  // The finishes by Σ rank tier: Platina up glows, Diamante up leaves a trail, Campeão up sparkles, the top turns colours.
  const ACABAMENTOS = {
    bronze: {},
    silver: {},
    gold: {},
    platinum: { brilho: true },
    diamond: { brilho: true, rastro: true },
    champion: { brilho: true, rastro: true, faiscas: true },
    "grand-champion": { brilho: true, rastro: true, faiscas: true },
    "supersonic-legend": { brilho: true, rastro: true, faiscas: true, arco: true },
  }
  const tier = (id) => String(id).replace(/-\d$/, "")
  /** The finish for a Σ rank's id (Sigma.ranque(...).id). */
  const acabamento = (rankId) => ACABAMENTOS[tier(rankId)] ?? {}

  /**
   * The marble's skin as an equirectangular picture (longitude across, latitude down) on `canvas` (2:1): the fan's
   * main colour, its shirt's pattern in its detail (and third) colour, a glassy swirl on the plain ones.
   */
  function textura(canvas, a) {
    const W = canvas.width
    const H = canvas.height
    const ctx = canvas.getContext("2d")
    const cor = a.cor || "#85a7ff"
    const detalhe = a.detalhe || "#002fa7"
    const terceira = a.terceira || "#f4f5f7"
    ctx.fillStyle = cor
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = detalhe
    const faixaH = (v0, v1, c = detalhe) => {
      ctx.fillStyle = c
      ctx.fillRect(0, v0 * H, W, (v1 - v0) * H)
    }
    // A band round the marble tilted like a great circle (v = 0.5 + amp·sin), `largura` thick.
    const onda = (amp, largura, c = detalhe, fase = 0) => {
      ctx.beginPath()
      for (let x = 0; x <= W; x += 4) ctx.lineTo(x, (0.5 + amp * Math.sin((x / W) * Math.PI * 2 + fase)) * H - (largura * H) / 2)
      for (let x = W; x >= 0; x -= 4) ctx.lineTo(x, (0.5 + amp * Math.sin((x / W) * Math.PI * 2 + fase)) * H + (largura * H) / 2)
      ctx.closePath()
      ctx.fillStyle = c
      ctx.fill()
    }
    switch (a.roupa) {
      case "listra":
        faixaH(0.42, 0.58)
        break
      case "faixa":
        onda(0.32, 0.16)
        break
      case "meio":
        ctx.fillRect(0, 0, W / 2, H)
        break
      case "gola":
        faixaH(0, 0.14)
        faixaH(0.86, 1)
        break
      case "listras":
        for (let k = 0; k < 8; k += 2) ctx.fillRect((k * W) / 8, 0, W / 8, H)
        break
      case "listrado":
        for (let k = 1; k < 8; k += 2) faixaH(k / 8, (k + 1) / 8)
        break
      case "tricolor":
        for (let k = 0; k < 9; k++) {
          ctx.fillStyle = [cor, detalhe, terceira][k % 3]
          ctx.fillRect((k * W) / 9, 0, W / 9 + 1, H)
        }
        break
      case "faixa-dupla":
        faixaH(0.4, 0.5)
        faixaH(0.5, 0.6, terceira)
        break
      case "numero":
        break
      default:
        // Plain: a glass marble's swirl, two thin ribbons.
        onda(0.22, 0.07, detalhe, 0.6)
        onda(0.18, 0.05, detalhe, 3.4)
    }
    if (a.roupa === "numero" && Number.isInteger(a.numero)) {
      ctx.fillStyle = detalhe
      ctx.font = `700 ${Math.round(H * 0.42)}px "Space Grotesk", sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      for (const u of [0.25, 0.75]) ctx.fillText(String(a.numero), u * W, H * 0.52)
    }
    // A soft sheen across the top, so even a plain one reads as glass.
    const brilho = ctx.createLinearGradient(0, 0, 0, H)
    brilho.addColorStop(0, "rgba(255,255,255,0.18)")
    brilho.addColorStop(0.35, "rgba(255,255,255,0)")
    ctx.fillStyle = brilho
    ctx.fillRect(0, 0, W, H)
    return canvas
  }

  /**
   * The marble seen from the front, `px` across, from its map (a canvas 2h × h, fas3d.js's bola: three's sphere
   * mapping, the face at a quarter of the way across): the half facing you, lit from the top left in the fan's two
   * toon steps, with a glint. For what draws the ball flat: the duel, the race's lists, the site's small ones.
   */
  function disco(mapa, px = 96) {
    const W = mapa.width
    const H = mapa.height
    const fonte = mapa.getContext("2d").getImageData(0, 0, W, H).data
    const c = document.createElement("canvas")
    c.width = c.height = px
    const ctx = c.getContext("2d")
    const img = ctx.createImageData(px, px)
    const d = img.data
    // The light: up and to the left, towards you.
    const lx = -0.45
    const ly = -0.6
    const lz = 0.66
    for (let j = 0; j < px; j++) {
      for (let i = 0; i < px; i++) {
        const nx = ((i + 0.5) / px) * 2 - 1
        const ny = ((j + 0.5) / px) * 2 - 1
        const r2 = nx * nx + ny * ny
        if (r2 > 1) continue
        const nz = Math.sqrt(1 - r2)
        // Screen y is down; the sphere's y is up. SphereGeometry: x = −cos φ sin θ, y = cos θ, z = sin φ sin θ.
        const y = -ny
        const theta = Math.acos(Math.max(-1, Math.min(1, y)))
        let u = Math.atan2(nz, -nx) / (Math.PI * 2)
        if (u < 0) u += 1
        const sx = Math.min(W - 1, Math.floor(u * W))
        const sy = Math.min(H - 1, Math.floor((theta / Math.PI) * H))
        const k = (sy * W + sx) * 4
        const luz = nx * lx + ny * ly + nz * lz
        // Two steps as the fan's toon (DEGRAUS), softened at the edge between them, and the rim a touch darker.
        const passo = luz > 0.12 ? 1 : luz > 0.02 ? 0.86 + (luz - 0.02) * 1.4 : 0.86
        const borda = 1 - Math.max(0, r2 - 0.82) * 0.6
        const brilho = luz > 0.93 ? (luz - 0.93) * 4 : 0
        const o = (j * px + i) * 4
        for (let q = 0; q < 3; q++) d[o + q] = Math.min(255, fonte[k + q] * passo * borda + 255 * brilho)
        // The edge's pixel half covered, so the circle doesn't stair.
        const fora = Math.sqrt(r2) * px * 0.5 - (px * 0.5 - 1)
        d[o + 3] = fora > 0 ? Math.round(255 * (1 - fora)) : 255
      }
    }
    ctx.putImageData(img, 0, 0)
    return c
  }

  const Bolinha = { ACABAMENTOS, acabamento, textura, disco }
  if (typeof module !== "undefined") module.exports = Bolinha
  else window.Bolinha = Bolinha
})()
