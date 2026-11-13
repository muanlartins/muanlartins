// The Instagram story the Anúncios dock posts when a live opens (abertura.js): 1080×1920, drawn on a canvas from two
// OBS screenshots, Luan's camera as it comes from the camera (NVIDIA Broadcast's Klein background, before the filters)
// and the game, blurred past reading anything (other players' names, the chat), as the live thumbnails do. On top:
// AO VIVO AGORA, the game, the live's title from the agenda and twitch.tv/muanlartins (Instagram's API takes no link
// sticker, so the address is written out). Instagram covers about the top 250 px and the bottom 250 px with its own
// controls: everything that matters sits between them. story.html draws it with sample pictures, to look at it.

;(function () {
  const W = 1080
  const H = 1920
  const KLEIN = "#002fa7"
  const KLEIN_CLARO = "#85a7ff"
  const BRANCO = "#f4f5f7"
  const NAVY = "#001447"
  const VERMELHO = "#ff3b3b"
  const FONTE = "'Space Grotesk', sans-serif"

  let fonte
  function carregarFonte(base) {
    fonte ??= (async () => {
      if (![...document.fonts].some((f) => f.family.replace(/"/g, "") === "Space Grotesk")) {
        const face = new FontFace("Space Grotesk", `url(${new URL("space-grotesk.ttf", base)})`, { weight: "300 700" })
        document.fonts.add(await face.load())
      }
      await Promise.all([document.fonts.load(`700 80px ${FONTE}`), document.fonts.load(`500 40px ${FONTE}`)])
    })()
    return fonte
  }

  /** A polygon with its top-left and bottom-right corners cut at 45°, like the camera frame and the mark. */
  function cortado(ctx, x, y, w, h, c) {
    ctx.beginPath()
    ctx.moveTo(x + c, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + h - c)
    ctx.lineTo(x + w - c, y + h)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x, y + c)
    ctx.closePath()
  }

  /** Draws `img` to cover the box, centred (or at `foco`, 0…1 across each axis), `zoom` times closer. */
  function cobrir(ctx, img, x, y, w, h, foco = [0.5, 0.5], zoom = 1) {
    const iw = img.width || img.videoWidth
    const ih = img.height || img.videoHeight
    const s = Math.max(w / iw, h / ih) * zoom
    const sw = w / s
    const sh = h / s
    ctx.drawImage(img, (iw - sw) * foco[0], (ih - sh) * foco[1], sw, sh, x, y, w, h)
  }

  /** The lattice: hairlines at ±45°. */
  function trama(ctx, passo, cor) {
    ctx.save()
    ctx.strokeStyle = cor
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let d = -H; d < W + H; d += passo) {
      ctx.moveTo(d, 0)
      ctx.lineTo(d + H, H)
      ctx.moveTo(d, H)
      ctx.lineTo(d + H, 0)
    }
    ctx.stroke()
    ctx.restore()
  }

  /** Lines of `texto` that fit `largura` at the current font, at most `max` (the last one cut with an ellipsis). */
  function quebrar(ctx, texto, largura, max) {
    const palavras = texto.split(/\s+/).filter(Boolean)
    const linhas = []
    let atual = ""
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p
      if (ctx.measureText(teste).width <= largura || !atual) atual = teste
      else {
        linhas.push(atual)
        atual = p
      }
    }
    if (atual) linhas.push(atual)
    if (linhas.length > max) {
      linhas.length = max
      while (ctx.measureText(`${linhas[max - 1]}…`).width > largura) linhas[max - 1] = linhas[max - 1].replace(/\s*\S+$/, "")
      linhas[max - 1] += "…"
    }
    return linhas
  }

  /**
   * The story, on a new canvas: { camera, jogo } are images (or null: the other fills in), titulo the live's title,
   * nomeJogo its game's name, base the URL the font is next to.
   */
  async function desenhar({ camera, jogo, titulo, nomeJogo, base = document.baseURI }) {
    await carregarFonte(base)
    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d")

    // The ground: the game, blurred and dyed Klein, darker at the bottom where the words are.
    ctx.fillStyle = KLEIN
    ctx.fillRect(0, 0, W, H)
    const fundo = jogo || camera
    if (fundo) {
      ctx.save()
      ctx.filter = "blur(40px) saturate(1.3)"
      cobrir(ctx, fundo, -80, -80, W + 160, H + 160)
      ctx.restore()
    }
    const tinta = ctx.createLinearGradient(0, 0, 0, H)
    tinta.addColorStop(0, "rgb(0 47 167 / 0.5)")
    tinta.addColorStop(0.45, "rgb(0 47 167 / 0.7)")
    tinta.addColorStop(0.75, "rgb(0 30 110 / 0.9)")
    tinta.addColorStop(1, "rgb(0 20 71 / 0.97)")
    ctx.fillStyle = tinta
    ctx.fillRect(0, 0, W, H)
    trama(ctx, 40, "rgb(133 167 255 / 0.13)")

    // Luan: the camera in its frame, square, his face the hero.
    const cx = 100
    const cy = 400
    const cl = 880
    const corte = 88
    ctx.save()
    ctx.shadowColor = "rgb(0 10 40 / 0.55)"
    ctx.shadowBlur = 60
    ctx.shadowOffsetY = 24
    cortado(ctx, cx - 14, cy - 14, cl + 28, cl + 28, corte + 6)
    ctx.fillStyle = KLEIN
    ctx.fill()
    ctx.restore()
    ctx.save()
    cortado(ctx, cx, cy, cl, cl, corte)
    ctx.clip()
    // The camera is 16:9 with him in the middle and the background's logo above: closer, on his face.
    if (camera) cobrir(ctx, camera, cx, cy, cl, cl, [0.52, 0.85], 1.3)
    else if (jogo) cobrir(ctx, jogo, cx, cy, cl, cl)
    ctx.restore()
    // The frame's two streaks, Branco and Klein claro, half a lap apart.
    ctx.save()
    ctx.lineWidth = 8
    ctx.lineCap = "square"
    ctx.strokeStyle = BRANCO
    ctx.beginPath()
    ctx.moveTo(cx - 14 + corte + 6, cy - 14)
    ctx.lineTo(cx + cl * 0.62, cy - 14)
    ctx.stroke()
    ctx.strokeStyle = KLEIN_CLARO
    ctx.beginPath()
    ctx.moveTo(cx + cl + 14 - corte - 6, cy + cl + 14)
    ctx.lineTo(cx + cl * 0.38, cy + cl + 14)
    ctx.stroke()
    ctx.restore()

    // AO VIVO AGORA, on a Branco plate over the frame's top edge.
    ctx.font = `700 42px ${FONTE}`
    ctx.letterSpacing = "4px"
    const rotulo = "AO VIVO AGORA"
    const rl = ctx.measureText(rotulo).width
    const px = cx + 40
    const py = cy - 56
    const pw = rl + 120
    const ph = 84
    cortado(ctx, px, py, pw, ph, 22)
    ctx.fillStyle = BRANCO
    ctx.fill()
    ctx.fillStyle = VERMELHO
    ctx.beginPath()
    ctx.arc(px + 46, py + ph / 2, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgb(255 59 59 / 0.35)"
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(px + 46, py + ph / 2, 22, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = KLEIN
    ctx.textBaseline = "middle"
    ctx.fillText(rotulo, px + 80, py + ph / 2 + 2)

    // The game and the live's title.
    let y = cy + cl + 92
    ctx.textBaseline = "alphabetic"
    if (nomeJogo) {
      ctx.font = `500 34px ${FONTE}`
      ctx.letterSpacing = "6px"
      ctx.fillStyle = KLEIN_CLARO
      ctx.fillText(nomeJogo.toUpperCase(), cx, y)
      y += 26
    }
    ctx.letterSpacing = "-1px"
    let tamanho = 86
    let linhas
    do {
      ctx.font = `700 ${tamanho}px ${FONTE}`
      linhas = quebrar(ctx, titulo || "Live na Twitch", cl, tamanho > 72 ? 2 : 3)
      tamanho -= 4
    } while (linhas.some((l) => l.endsWith("…")) && tamanho > 60)
    tamanho += 4
    ctx.fillStyle = BRANCO
    for (const linha of linhas) {
      y += tamanho + 6
      ctx.fillText(linha, cx, y)
    }

    // Where: twitch.tv/muanlartins on a Branco plate, the address in Klein.
    const ay = Math.max(y + 56, 1500)
    const aw = cl
    const ah = 136
    cortado(ctx, cx, ay, aw, ah, 30)
    ctx.fillStyle = BRANCO
    ctx.fill()
    ctx.letterSpacing = "0px"
    ctx.fillStyle = KLEIN
    ctx.font = `500 30px ${FONTE}`
    ctx.fillText("Assista agora em", cx + 44, ay + 50)
    ctx.font = `700 58px ${FONTE}`
    ctx.letterSpacing = "-1px"
    ctx.fillText("twitch.tv/", cx + 44, ay + 108)
    const tw = ctx.measureText("twitch.tv/").width
    ctx.fillStyle = NAVY
    ctx.fillText("muanlartins", cx + 44 + tw, ay + 108)
    // An arrow at the plate's end.
    ctx.strokeStyle = KLEIN
    ctx.lineWidth = 9
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    const ax = cx + aw - 70
    const am = ay + ah / 2
    ctx.beginPath()
    ctx.moveTo(ax - 34, am)
    ctx.lineTo(ax + 6, am)
    ctx.moveTo(ax - 14, am - 22)
    ctx.lineTo(ax + 8, am)
    ctx.lineTo(ax - 14, am + 22)
    ctx.stroke()

    return canvas
  }

  /** The canvas as a JPEG under `max` bytes (the profile API keeps up to 350 KB), lowering the quality as needed. */
  async function jpeg(canvas, max = 340_000) {
    for (let q = 0.92; q >= 0.5; q -= 0.06) {
      const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", q))
      if (blob && blob.size <= max) return blob
    }
    throw new Error("story grande demais")
  }

  window.Story = { desenhar, jpeg, W, H }
})()
