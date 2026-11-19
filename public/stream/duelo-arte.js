// The duel's look, shared by the live's overlay (duelo.html) and the site's minigames page, which draws each class's
// weapon in each material with these very lines: the materials, a ball's weapon and the fan's shirt on a ball.
;(function () {
  const CONTORNO = "#001447"
  const VENENO = "#b77bff"

  // The weapon's material: the viewer's Σ rank, looks only.
  // Bronze, Prata, Ouro: the metal. Platina up: the metal glows. Diamante up: the ball leaves a trail. Campeão up:
  // sparks fly from the weapon. Lenda Supersônica: the colours turn.
  const MATERIAIS = {
    bronze: { cor: "#c98a52", luz: "#f0b27a" },
    silver: { cor: "#c3cad6", luz: "#eef2f8" },
    gold: { cor: "#f2c14e", luz: "#ffe39a" },
    platinum: { cor: "#7fd8d2", luz: "#c8fff9", brilho: true },
    diamond: { cor: "#7aa2ff", luz: "#d6e2ff", brilho: true, rastro: true },
    champion: { cor: "#b48cff", luz: "#e6d8ff", brilho: true, rastro: true, faiscas: true },
    "grand-champion": { cor: "#ff6b6b", luz: "#ffd0d0", brilho: true, rastro: true, faiscas: true },
    "supersonic-legend": { cor: "#ffffff", luz: "#ffffff", brilho: true, rastro: true, faiscas: true, arco: true },
  }

  /** A ball's weapon, drawn round the ball's centre at its angle (`bola` as duelo-motor.js has it); `m` its material,
   * `agora` the clock in ms (the turning colours), `parada` whether the ball is stunned (the weapon goes faint). */
  function arma(ctx, bola, m, agora, parada) {
    const r = bola.r
    const len = bola.comprimento
    ctx.save()
    ctx.translate(bola.x, bola.y)
    // Fast enough, the swing leaves a blur: the Adaga's ring, the Martelo's arc, anyone's at their top speeds.
    const voltas = Math.abs(bola.giro)
    if (!parada && voltas > 1.6 && bola.c.arma) {
      ctx.save()
      ctx.globalAlpha = Math.min(0.32, (voltas - 1.6) * 0.12)
      ctx.beginPath()
      const ate = Math.min(Math.PI * 2, voltas * 0.9)
      const de = bola.angulo - Math.sign(bola.giro) * ate
      ctx.arc(0, 0, r + len * 0.6, Math.min(de, bola.angulo), Math.max(de, bola.angulo))
      ctx.lineWidth = len * 0.8
      ctx.strokeStyle = m.arco ? `hsl(${(agora / 8) % 360} 90% 72%)` : m.cor
      ctx.stroke()
      ctx.restore()
    }
    ctx.rotate(bola.angulo)
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    // Stunned, its weapon goes faint: it doesn't hit or parry until the ball wakes.
    if (parada) ctx.globalAlpha = 0.35
    const metal = m.arco ? `hsl(${(agora / 8) % 360} 90% 72%)` : m.cor
    if (m.brilho) {
      ctx.shadowColor = m.arco ? metal : m.luz
      ctx.shadowBlur = 10
    }
    const traco = (fn, largura, cor) => {
      ctx.beginPath()
      fn()
      ctx.lineWidth = largura + 3
      ctx.strokeStyle = CONTORNO
      ctx.stroke()
      ctx.lineWidth = largura
      ctx.strokeStyle = cor
      ctx.stroke()
    }
    const forma = (fn, cor) => {
      ctx.beginPath()
      fn()
      ctx.closePath()
      ctx.fillStyle = cor
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.lineWidth = 2
      ctx.strokeStyle = CONTORNO
      ctx.stroke()
    }
    const cabo = "#8a6a4a"
    switch (bola.classe) {
      case "espada": {
        // The blade brightens with each hit.
        const k = Math.min(1, (bola.dano - bola.c.arma.dano) / 10)
        forma(() => {
          ctx.moveTo(r - 2, -5)
          ctx.lineTo(r + len - 11, -5)
          ctx.lineTo(r + len + 1, 0)
          ctx.lineTo(r + len - 11, 5)
          ctx.lineTo(r - 2, 5)
        }, metal)
        if (k > 0) {
          ctx.globalAlpha = (parada ? 0.35 : 1) * k * 0.8
          forma(() => {
            ctx.moveTo(r + 2, -1.5)
            ctx.lineTo(r + len - 8, -1.5)
            ctx.lineTo(r + len - 3, 0)
            ctx.lineTo(r + len - 8, 1.5)
            ctx.lineTo(r + 2, 1.5)
          }, "#ffffff")
          ctx.globalAlpha = parada ? 0.35 : 1
        }
        traco(() => {
          ctx.moveTo(r + 2, -10)
          ctx.lineTo(r + 2, 10)
        }, 5, metal)
        break
      }
      case "adaga": {
        forma(() => {
          ctx.moveTo(r - 2, -6)
          ctx.lineTo(r + len - 8, -4.5)
          ctx.lineTo(r + len + 1, 0)
          ctx.lineTo(r + len - 8, 4.5)
          ctx.lineTo(r - 2, 6)
        }, metal)
        break
      }
      case "arco": {
        traco(() => {
          ctx.arc(r - 8, 0, len + 4, -1.05, 1.05)
        }, 7, metal)
        ctx.shadowBlur = 0
        ctx.beginPath()
        const ponta = (s) => [r - 8 + Math.cos(1.05) * (len + 4), s * Math.sin(1.05) * (len + 4)]
        ctx.moveTo(...ponta(-1))
        ctx.lineTo(...ponta(1))
        ctx.lineWidth = 1.5
        ctx.strokeStyle = "rgb(244 245 247 / 0.8)"
        ctx.stroke()
        break
      }
      case "lanca": {
        const p = bola.c.arma.ponta
        traco(() => {
          ctx.moveTo(r - 2, 0)
          ctx.lineTo(r + len - 10, 0)
        }, 6, cabo)
        forma(() => {
          ctx.moveTo(r + len * (1 - p) + 2, -8)
          ctx.lineTo(r + len + 2, 0)
          ctx.lineTo(r + len * (1 - p) + 2, 8)
          ctx.lineTo(r + len * (1 - p) + 8, 0)
        }, metal)
        break
      }
      case "machado": {
        traco(() => {
          ctx.moveTo(r - 2, 0)
          ctx.lineTo(r + len, 0)
        }, 6, cabo)
        // The head glows with the crit's chance.
        if (bola.critico > 0.2) {
          ctx.shadowColor = "#ffd23f"
          ctx.shadowBlur = 6 + bola.critico * 26
        }
        forma(() => {
          ctx.moveTo(r + len - 14, -3)
          ctx.quadraticCurveTo(r + len + 4, -14, r + len + 2, -21)
          ctx.quadraticCurveTo(r + len + 16, 0, r + len + 2, 21)
          ctx.quadraticCurveTo(r + len + 4, 14, r + len - 14, 3)
        }, metal)
        break
      }
      case "foice": {
        traco(() => {
          ctx.moveTo(r - 2, 0)
          ctx.lineTo(r + len, 0)
        }, 5, cabo)
        forma(() => {
          ctx.moveTo(r + len + 2, -4)
          ctx.quadraticCurveTo(r + len + 2, 26, r + len - 34, 26)
          ctx.quadraticCurveTo(r + len - 10, 16, r + len - 6, 4)
        }, metal)
        // A drop of its poison on the blade.
        ctx.fillStyle = VENENO
        ctx.beginPath()
        ctx.arc(r + len - 14, 20, 3, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case "martelo": {
        traco(() => {
          ctx.moveTo(r - 2, 0)
          ctx.lineTo(r + len - 6, 0)
        }, 6, cabo)
        // The head reddens as it picks up speed.
        const k = Math.min(1, voltas / Math.max(1, bola.giroMax))
        if (k > 0.6) {
          ctx.shadowColor = "#ff8a3d"
          ctx.shadowBlur = (k - 0.6) * 40
        }
        forma(() => ctx.rect(r + len - 12, -15, 18, 30), metal)
        ctx.fillStyle = `rgb(255 120 60 / ${Math.max(0, k - 0.5)})`
        ctx.fillRect(r + len - 12, -15, 18, 30)
        break
      }
      case "katana": {
        // A long, thin, slightly curved blade and a round guard.
        forma(() => {
          ctx.moveTo(r + 4, -3)
          ctx.quadraticCurveTo(r + len * 0.6, -6, r + len + 2, -1)
          ctx.lineTo(r + len - 4, 3)
          ctx.quadraticCurveTo(r + len * 0.6, -1, r + 4, 3)
        }, metal)
        traco(() => ctx.moveTo(r - 2, 0) || ctx.lineTo(r + 3, 0), 4, "#2b2b3a")
        ctx.beginPath()
        ctx.ellipse(r + 4, 0, 2.5, 7, 0, 0, Math.PI * 2)
        ctx.fillStyle = "#c9a227"
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = CONTORNO
        ctx.stroke()
        break
      }
      case "punho": {
        // A glove each side, in the material's colour, the cuff toward the ball.
        for (const lado of [1, -1]) {
          ctx.save()
          ctx.scale(lado, 1)
          forma(() => ctx.roundRect(r - 4, -7, 7, 14, 2), "#f4f5f7")
          forma(() => ctx.roundRect(r + 1, -11, len + 5, 22, 10), metal)
          ctx.globalAlpha = parada ? 0.35 : 1
          ctx.beginPath()
          ctx.moveTo(r + len - 2, -6)
          ctx.lineTo(r + len - 2, 6)
          ctx.lineWidth = 1.5
          ctx.strokeStyle = CONTORNO
          ctx.stroke()
          ctx.restore()
        }
        break
      }
      case "clava": {
        // Thick at the end, with studs.
        forma(() => {
          ctx.moveTo(r - 2, -4)
          ctx.lineTo(r + len - 12, -9)
          ctx.quadraticCurveTo(r + len + 4, -10, r + len + 4, 0)
          ctx.quadraticCurveTo(r + len + 4, 10, r + len - 12, 9)
          ctx.lineTo(r - 2, 4)
        }, "#9a6b3f")
        ctx.fillStyle = metal
        for (const [x, y] of [[r + len - 10, -9], [r + len - 2, -6], [r + len - 10, 9], [r + len - 2, 6], [r + len + 4, 0]]) {
          ctx.beginPath()
          ctx.arc(x, y, 2.6, 0, Math.PI * 2)
          ctx.fill()
          ctx.lineWidth = 1
          ctx.strokeStyle = CONTORNO
          ctx.stroke()
        }
        break
      }
    }
    ctx.restore()
  }

  /** The fan's shirt on a ball of radius r centred at 0,0 (call it clipped to the ball): stripes, a sash, halves. */
  function padrao(ctx, r, a) {
    const s = r / 20 // the duel's RAIO
    ctx.fillStyle = a.detalhe
    if (["listras", "tricolor"].includes(a.roupa)) for (let k = -2; k <= 2; k += 2) ctx.fillRect((k * 7 - 3) * s, -r, 6 * s, r * 2)
    else if (["listrado", "faixa-dupla", "listra"].includes(a.roupa)) for (let k = -1; k <= 1; k += 2) ctx.fillRect(-r, (k * 7 - 3) * s, r * 2, 6 * s)
    else if (a.roupa === "faixa") {
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-r, -4 * s, r * 2, 8 * s)
    } else if (a.roupa === "meio") ctx.fillRect(0, -r, r, r * 2)
    else {
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const DueloArte = { CONTORNO, VENENO, MATERIAIS, arma, padrao }
  if (typeof module !== "undefined") module.exports = DueloArte
  else window.DueloArte = DueloArte
})()
