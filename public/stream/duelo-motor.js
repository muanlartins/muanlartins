// The ball duel's engine: two balls fall and bounce in a square box, each with its class's weapon and its class's
// ability, which grows with every hit (more damage, a faster spin, more arrows, a longer reach, a crit's chance,
// poison, speed, a heavier swing, more slices, a longer stun). No DOM: the overlay (duelo.html) draws it, the site
// can replay a fight from its seed, and Node runs thousands of them to tune the numbers (scripts/duelo-balanco.mjs).
// Plain script, no build: sets Duelo on the page (window) or the context it runs in.
//
// The physics is the genre's (earclacks' weapon balls, Luan's reference, 2026-11-16), measured on its videos and
// kept relative to the box: gravity of about 2.1 boxes per second², walls that give back every bit of speed, balls
// about a box per second fast and 7% of it wide, nobody steering: they meet because they bounce. A hit freezes the
// world for a moment and throws the one hit away; weapon on weapon, both spins turn around and the balls part.
//
// Deterministic: a fight is only its seed and the two classes, so the same three things give the same fight
// anywhere. Fixed steps of 1/120 s, randomness only from the seeded generator, and nothing that differs between
// JavaScript engines (Math.sin, cos, atan2, exp, pow are approximated differently by each; + − × ÷ and sqrt
// aren't), so the angles go through seno() below. Power never grows with Σ (Luan, 2026-11-15): everyone's ball is
// the same for its class; Σ only changes looks, which this file knows nothing about. A change to the numbers or the
// rules is a new VERSAO, so a fight recorded before still says which rules it was fought under.

;(() => {
  const VERSAO = 2
  const HZ = 120
  const DT = 1 / HZ
  const TAU = 6.283185307179586

  // The arena, a square, in units that are the overlay's pixels at 1080p.
  const LADO = 300
  const LARGURA = LADO
  const ALTURA = LADO
  const RAIO = 20
  const HP = 100
  const GRAVIDADE = 630
  // The floor throws a ball back up at least this fast (about a third of the box high): nobody rolls along it.
  const QUIQUE = 330
  const VELOCIDADE_MAX = 640
  // A hit sends the one hit away at least this fast; a parry, both balls apart at least this fast each.
  const EMPURRAO = 280
  const SEPARA = 170
  // Sudden death: at 50 s the walls close in (to 60% by 65 s) and damage goes ×1.5, ×2 from 60 s. At 75 s the
  // fight stops and the most HP wins, then who dealt more, then the seed.
  const MORTE_SUBITA = 50
  const FECHA_ATE = 65
  const FIM = 75
  const FECHADA = 0.6
  // The bow looses its volley when it points at the other ball, within this much (cos 15°).
  const PONTARIA = 0.9659

  // Each class: its weapon (length beyond the body and thickness, in units; spin in turns per second; damage; none
  // for the Punho, whose body is the weapon), its ability and how it grows per hit landed, `resumo` (the line the
  // overlay shows under it), and `forca`, which multiplies all the damage it deals: the knob the balance script
  // (scripts/duelo-balanco.mjs) turns until every class wins about half its fights.
  const CLASSES = {
    espada: {
      nome: "Espada",
      resumo: "+1 de dano a cada acerto",
      arma: { comprimento: 50, espessura: 7, giro: 1, dano: 1 },
      cresce: 1,
      forca: 1.58,
    },
    adaga: {
      nome: "Adaga",
      resumo: "gira mais rápido a cada acerto; quanto mais gira, mais corta",
      arma: { comprimento: 28, espessura: 6, giro: 2.4, dano: 1 },
      // Light: it barely shoves, so spinning fast it cuts several times as it passes.
      cresce: 0.3,
      teto: 8,
      recarga: 0.06,
      empurrao: 0.35,
      forca: 1.48,
    },
    arco: {
      nome: "Arco",
      resumo: "+1 flecha a cada acerto",
      arma: { comprimento: 22, espessura: 6, giro: 0.8, dano: 0 },
      flecha: { dano: 1, intervalo: 1.5, velocidade: 460, abertura: 0.5, inicio: 2, teto: 8 },
      forca: 2.3,
    },
    lanca: {
      nome: "Lança",
      resumo: "mais longa e mais forte a cada acerto",
      arma: { comprimento: 60, espessura: 5, giro: 0.8, dano: 1, ponta: 0.5 },
      cresce: 0.5,
      alcance: 4,
      tetoAlcance: 120,
      forca: 2.19,
    },
    machado: {
      nome: "Machado",
      resumo: "mais chance de crítico a cada acerto",
      arma: { comprimento: 46, espessura: 8, giro: 0.9, dano: 2 },
      critico: { inicio: 0.05, cresce: 0.07, vezes: 4 },
      forca: 3.44,
    },
    foice: {
      nome: "Foice",
      resumo: "envenena: +1 de veneno a cada acerto, até 5",
      arma: { comprimento: 52, espessura: 6, giro: 0.95, dano: 2 },
      veneno: { intervalo: 2.5, dano: 1, teto: 5 },
      forca: 1.2,
    },
    punho: {
      nome: "Punho",
      resumo: "acelera sem parar; quanto mais rápido, mais forte o soco",
      // Two gloves, one each side (`dupla`), turning slowly; each punch is as strong as the ball is fast.
      arma: { comprimento: 13, espessura: 11, giro: 0.45, dano: 1, dupla: true },
      corpo: { velocidade: 300, aceleracao: 300, cresce: 35, teto: 900 },
      recarga: 0.35,
      forca: 1.21,
    },
    martelo: {
      nome: "Martelo",
      resumo: "pega embalo; quanto mais gira, mais dói",
      arma: { comprimento: 54, espessura: 9, giro: 0.3, dano: 0 },
      embalo: { maximo: 1.1, acelera: 0.7, cresce: 0.2, teto: 3, danoPorGiro: 3 },
      forca: 1.14,
    },
    katana: {
      nome: "Katana",
      resumo: "cada acerto corta várias vezes: +1 corte por acerto ou defesa",
      arma: { comprimento: 56, espessura: 5, giro: 1.1, dano: 1 },
      cortes: { inicio: 1, cresce: 1, teto: 15, intervalo: 0.2 },
      forca: 1.01,
    },
    clava: {
      nome: "Clava",
      resumo: "atordoa: quem apanha fica parado",
      arma: { comprimento: 42, espessura: 10, giro: 0.85, dano: 1.5 },
      cresce: 0.5,
      atordoa: { inicio: 0.4, cresce: 0.1, teto: 0.9, imune: 1.5 },
      forca: 2.32,
    },
  }
  const IDS = Object.keys(CLASSES)

  // --- Numbers that are the same everywhere ----------------------------------------------------------------------

  /** A seeded generator (sfc32): numbers in [0, 1), the same sequence for the same seed in any engine. */
  function gerador(semente) {
    let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = semente >>> 0
    const proximo = () => {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0
      const t = (a + b | 0) + d | 0
      d = d + 1 | 0
      a = b ^ b >>> 9
      b = c + (c << 3) | 0
      c = c << 21 | c >>> 11
      c = c + t | 0
      return (t >>> 0) / 4294967296
    }
    for (let i = 0; i < 12; i++) proximo()
    return proximo
  }

  /** sin(x) from + − × ÷ alone (Taylor to x¹⁵ on [−π/2, π/2]; error under 1e-12). */
  function seno(x) {
    x -= TAU * Math.round(x / TAU)
    if (x > TAU / 4) x = TAU / 2 - x
    else if (x < -TAU / 4) x = -TAU / 2 - x
    const x2 = x * x
    return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 * (1 / 362880 + x2 * (-1 / 39916800 + x2 * (1 / 6227020800 + x2 * (-1 / 1307674368000))))))))
  }
  const cosseno = (x) => seno(x + TAU / 4)

  // The collision helpers write their answer here instead of making an object per call: a fight asks thousands.
  const perto = { ax: 0, ay: 0, bx: 0, by: 0, distancia: 0 }

  /** The closest points between segments p1–q1 and p2–q2 (Ericson's), into `perto`. */
  function entreSegmentos(p1x, p1y, q1x, q1y, p2x, p2y, q2x, q2y) {
    const d1x = q1x - p1x, d1y = q1y - p1y, d2x = q2x - p2x, d2y = q2y - p2y
    const rx = p1x - p2x, ry = p1y - p2y
    const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y, f = d2x * rx + d2y * ry
    const c = d1x * rx + d1y * ry
    const b = d1x * d2x + d1y * d2y
    const den = a * e - b * b
    let s = den > 1e-9 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0
    let t = (b * s + f) / e
    if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)) }
    else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)) }
    perto.ax = p1x + d1x * s; perto.ay = p1y + d1y * s
    perto.bx = p2x + d2x * t; perto.by = p2y + d2y * t
    const dx = perto.bx - perto.ax, dy = perto.by - perto.ay
    perto.distancia = Math.sqrt(dx * dx + dy * dy)
    return perto
  }

  /** The closest point on segment p–q to (x, y), into `perto` (ax, ay), and the distance to it. */
  function noSegmento(px, py, qx, qy, x, y) {
    const dx = qx - px, dy = qy - py
    const t = Math.min(1, Math.max(0, ((x - px) * dx + (y - py) * dy) / (dx * dx + dy * dy)))
    perto.ax = px + dx * t; perto.ay = py + dy * t
    perto.distancia = Math.sqrt((x - perto.ax) * (x - perto.ax) + (y - perto.ay) * (y - perto.ay))
    return perto
  }

  // --- A fight -------------------------------------------------------------------------------------------------------

  const NADA = Object.freeze([])
  function evento(luta, e) {
    if (luta.eventos === NADA) luta.eventos = []
    luta.eventos.push(e)
  }

  const objeto = (x) => x !== null && typeof x === "object" && !Array.isArray(x)

  /**
   * A new fight between class `a` (left) and class `b` (right), from `semente`. `ajustes` overrides any class's
   * numbers (the balance script's knobs: { espada: { forca: 2.6 } }, or { lanca: { arma: { giro: 1 } } }) and, in
   * `mundo`, the HP.
   */
  function criar(semente, a, b, ajustes = {}) {
    const sorte = gerador(semente)
    const mundo = { hp: HP, ...ajustes.mundo }
    const classe = (id) => {
      const base = CLASSES[id]
      if (!base) throw new Error(`classe desconhecida: ${id}`)
      const c = { ...base }
      for (const [k, v] of Object.entries(ajustes[id] ?? {})) c[k] = objeto(v) && objeto(base[k]) ? { ...base[k], ...v } : v
      return c
    }
    const bola = (id, lado) => {
      const c = classe(id)
      const angulo = sorte() * TAU
      const direcao = sorte() * TAU
      const rapidez = 220 + sorte() * 100
      return {
        lado,
        classe: id,
        c,
        x: lado === 0 ? LADO * (0.15 + sorte() * 0.15) : LADO * (0.7 + sorte() * 0.15),
        y: LADO * (0.2 + sorte() * 0.4),
        vx: cosseno(direcao) * rapidez,
        vy: seno(direcao) * rapidez,
        r: RAIO,
        hp: mundo.hp,
        hpMax: mundo.hp,
        angulo,
        giro: (c.arma?.giro ?? 0) * (sorte() < 0.5 ? -1 : 1),
        comprimento: c.arma?.comprimento ?? 0,
        dano: c.arma?.dano ?? 0,
        // The weapon as a segment, from arma(): the part that hurts (x0 → x1) and the part that parries (px0 → x1).
        w: { x0: 0, y0: 0, x1: 0, y1: 0, px0: 0, py0: 0, cx: 1, sy: 0 },
        // What grows: the hits it landed, and its class's own counters.
        acertos: 0,
        critico: c.critico?.inicio ?? 0,
        flechas: c.flecha?.inicio ?? 0,
        proximaFlecha: c.flecha ? c.flecha.intervalo * (0.4 + sorte() * 0.4) : 0,
        vmax: c.corpo?.velocidade ?? 0, // the Punho's top speed
        giroMax: c.embalo?.maximo ?? 0, // the Martelo's
        cortes: c.cortes?.inicio ?? 0, // the Katana's
        atordoa: c.atordoa?.inicio ?? 0, // the Clava's
        // What the other's ability left on this ball.
        envenenado: 0, // poison stacks, from a Foice
        proximoVeneno: 0,
        cortando: 0, // slices still to come, from a Katana
        proximoCorte: 0,
        atordoadoAte: 0, // standing still until then, from a Clava
        imuneAte: 0,
        recarga: 0, // until this weapon can hit the other's body again
        causado: 0,
        flash: 0,
      }
    }
    const bolas = [bola(a, 0), bola(b, 1)]
    return {
      versao: VERSAO,
      semente,
      t: 0,
      tique: 0,
      pausa: 0, // hitstop, in steps: everything stops for a moment on a hit
      bolas,
      flechas: [],
      paredes: { x0: 0, y0: 0, x1: LARGURA, y1: ALTURA },
      sorte,
      mundo,
      eventos: NADA,
      fim: null, // { vencedor: 0 | 1, motivo: "nocaute" | "tempo" | "sorteio", t }
      // Counts for the balance script.
      metricas: { aparadas: 0, acertos: [0, 0], primeiro: null, viradas: 0, lider: null, meio: null },
      recargaAparada: 0,
    }
  }

  /** Whether `bola` stands stunned (a Clava's hit): it doesn't move, its weapon doesn't turn, hit or parry. */
  const parada = (luta, bola) => luta.t < bola.atordoadoAte

  /** The weapon's segment now, into bola.w. The Lança's whole shaft parries; only its point hurts. The Punho's
   * gloves are both ends of one segment through the ball. */
  function arma(bola) {
    const w = bola.w
    const cx = cosseno(bola.angulo), sy = seno(bola.angulo)
    const base = bola.classe === "lanca" ? bola.r + bola.comprimento * (1 - bola.c.arma.ponta) : bola.r - 2
    const ponta = bola.r + bola.comprimento
    w.cx = cx; w.sy = sy
    if (bola.c.arma.dupla) {
      w.x0 = w.px0 = bola.x - cx * ponta; w.y0 = w.py0 = bola.y - sy * ponta
      w.x1 = bola.x + cx * ponta; w.y1 = bola.y + sy * ponta
      return w
    }
    w.x0 = bola.x + cx * base; w.y0 = bola.y + sy * base
    w.x1 = bola.x + cx * ponta; w.y1 = bola.y + sy * ponta
    w.px0 = bola.x + cx * (bola.r - 2); w.py0 = bola.y + sy * (bola.r - 2)
    return w
  }

  /** Whether `bola`'s weapon is there to hit, parry and block: it has one and isn't stunned. */
  const armada = (luta, bola) => !!bola.c.arma && !parada(luta, bola)

  const multiplicador = (luta) => (luta.t >= 60 ? 2 : luta.t >= MORTE_SUBITA ? 1.5 : 1)

  // Damage, exactly as the class's numbers say (no luck in it: the bounces are luck enough), times the class's
  // forca and sudden death's multiplier.
  function ferir(luta, alvo, quanto, tipo, de) {
    const dano = quanto * (de ? de.c.forca : 1) * multiplicador(luta)
    alvo.hp = Math.max(0, alvo.hp - dano)
    alvo.flash = tipo === "veneno" || tipo === "corte" ? 0.06 : 0.12
    if (de) {
      de.causado += dano
      if (tipo !== "veneno" && tipo !== "corte") luta.metricas.acertos[de.lado]++
      if (luta.metricas.primeiro === null) luta.metricas.primeiro = de.lado
    }
    evento(luta, { tipo, alvo: alvo.lado, de: de?.lado, dano, x: alvo.x, y: alvo.y - alvo.r })
    return dano
  }

  // A hit on the other's body (by the weapon, or the Punho's body): damage, the class's growth, a shove and a
  // moment's stop.
  function golpe(luta, atacante, alvo, px, py, base = atacante.dano) {
    const c = atacante.c
    let dano = base
    let tipo = "golpe"
    let empurrao = EMPURRAO
    if (atacante.classe === "machado") {
      if (luta.sorte() < atacante.critico) {
        dano *= c.critico.vezes
        tipo = "critico"
        empurrao = EMPURRAO * 1.6
        atacante.critico = c.critico.inicio
      } else atacante.critico = Math.min(0.9, atacante.critico + c.critico.cresce)
    }
    if (atacante.classe === "martelo") {
      dano = c.embalo.danoPorGiro * Math.abs(atacante.giro)
      empurrao = EMPURRAO * (0.8 + Math.abs(atacante.giro) * 0.4)
    }
    // The Adaga cuts as hard as it spins, against its first spin.
    if (atacante.classe === "adaga") dano = c.arma.dano * (Math.abs(atacante.giro) / c.arma.giro)
    if (atacante.classe === "punho") dano = (Math.sqrt(atacante.vx * atacante.vx + atacante.vy * atacante.vy) / 100) * c.arma.dano
    if (c.empurrao) empurrao *= c.empurrao
    const causado = ferir(luta, alvo, dano, tipo, atacante)
    atacante.acertos++
    switch (atacante.classe) {
      case "espada":
        atacante.dano += c.cresce
        break
      case "adaga":
        atacante.giro = Math.sign(atacante.giro) * Math.min(c.teto, Math.abs(atacante.giro) + c.cresce)
        break
      case "lanca":
        atacante.dano += c.cresce
        atacante.comprimento = Math.min(c.tetoAlcance, atacante.comprimento + c.alcance)
        break
      case "foice":
        alvo.envenenado = Math.min(c.veneno.teto, alvo.envenenado + 1)
        if (!alvo.proximoVeneno) alvo.proximoVeneno = luta.t + c.veneno.intervalo
        break
      case "punho": {
        // Back to its starting speed, and a higher top.
        const v = Math.sqrt(atacante.vx * atacante.vx + atacante.vy * atacante.vy) || 1
        atacante.vx *= c.corpo.velocidade / v
        atacante.vy *= c.corpo.velocidade / v
        atacante.vmax = Math.min(c.corpo.teto, atacante.vmax + c.corpo.cresce)
        break
      }
      case "martelo":
        // Half the swing spent, and a higher top to spin back up to.
        atacante.giro = Math.sign(atacante.giro) * Math.max(c.arma.giro, Math.abs(atacante.giro) / 2)
        atacante.giroMax = Math.min(c.embalo.teto, atacante.giroMax + c.embalo.cresce)
        break
      case "katana":
        // The hit was the first slice; the rest follow it, one every 0.2 s. A new hit doesn't add to slices still to
        // come, it starts them over if it has more.
        alvo.cortando = Math.max(alvo.cortando, atacante.cortes - 1)
        alvo.proximoCorte = luta.t + c.cortes.intervalo
        atacante.cortes = Math.min(c.cortes.teto, atacante.cortes + c.cortes.cresce)
        break
      case "clava":
        atacante.dano += c.cresce
        if (luta.t >= alvo.imuneAte) {
          alvo.atordoadoAte = luta.t + atacante.atordoa
          alvo.imuneAte = alvo.atordoadoAte + c.atordoa.imune
          evento(luta, { tipo: "atordoa", alvo: alvo.lado, ate: alvo.atordoadoAte })
          atacante.atordoa = Math.min(c.atordoa.teto, atacante.atordoa + c.atordoa.cresce)
        }
        break
    }
    atacante.recarga = c.recarga ?? 0.25
    // Thrown away from where it was hit (a stunned ball flies off when it wakes), and the hitter a little back.
    let nx = alvo.x - px, ny = alvo.y - py
    const n = Math.sqrt(nx * nx + ny * ny) || 1
    nx /= n; ny /= n
    const va = alvo.vx * nx + alvo.vy * ny
    if (va < empurrao) {
      alvo.vx += (empurrao - va) * nx
      alvo.vy += (empurrao - va) * ny
    }
    if (atacante.classe !== "punho") {
      atacante.vx -= nx * 60
      atacante.vy -= ny * 60
    }
    luta.pausa = Math.max(luta.pausa, atacante.classe === "adaga" ? 4 : Math.round(Math.min(22, 9 + causado * 0.6)))
  }

  // Weapon on weapon: both spins turn around (not the Martelo's, which keeps its way but loses a third of its swing),
  // the balls part, a spark; a Katana gets one slice more.
  function aparar(luta, x, y) {
    const [a, b] = luta.bolas
    for (const bola of luta.bolas) {
      if (bola.classe === "martelo") bola.giro = Math.sign(bola.giro) * Math.max(bola.c.arma.giro, Math.abs(bola.giro) * 0.65)
      else bola.giro = -bola.giro
      if (bola.classe === "katana") bola.cortes = Math.min(bola.c.cortes.teto, bola.cortes + bola.c.cortes.cresce)
    }
    let nx = b.x - a.x, ny = b.y - a.y
    const n = Math.sqrt(nx * nx + ny * ny) || 1
    nx /= n; ny /= n
    const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny
    if (va > -SEPARA) { a.vx -= (va + SEPARA) * nx; a.vy -= (va + SEPARA) * ny }
    if (vb < SEPARA) { b.vx += (SEPARA - vb) * nx; b.vy += (SEPARA - vb) * ny }
    luta.pausa = Math.max(luta.pausa, 7)
    luta.recargaAparada = 0.18
    luta.metricas.aparadas++
    evento(luta, { tipo: "aparada", x, y })
  }

  // The bow's volley: its arrows in a fan along where the bow points.
  function atirar(luta, bola) {
    const c = bola.c.flecha
    const n = Math.floor(bola.flechas)
    for (let i = 0; i < n; i++) {
      const desvio = n === 1 ? 0 : (i / (n - 1) - 0.5) * c.abertura * Math.min(1, n / 4)
      const ang = bola.angulo + desvio
      const cx = cosseno(ang), sy = seno(ang)
      luta.flechas.push({
        dono: bola.lado,
        x: bola.x + cx * (bola.r + bola.comprimento),
        y: bola.y + sy * (bola.r + bola.comprimento),
        vx: cx * c.velocidade,
        vy: sy * c.velocidade,
        dano: c.dano,
      })
    }
    evento(luta, { tipo: "flechas", lado: bola.lado, n })
  }

  // Walls give back all the speed; the floor at least QUIQUE upward. Each bounce turns the ball a hair (±2°, seeded)
  // so it never settles into a path that repeats.
  function quicar(luta, bola) {
    const p = luta.paredes
    let bateu = false
    if (bola.x - bola.r < p.x0) { bola.x = p.x0 + bola.r; bola.vx = Math.abs(bola.vx); bateu = true }
    if (bola.x + bola.r > p.x1) { bola.x = p.x1 - bola.r; bola.vx = -Math.abs(bola.vx); bateu = true }
    if (bola.y - bola.r < p.y0) { bola.y = p.y0 + bola.r; bola.vy = Math.abs(bola.vy); bateu = true }
    if (bola.y + bola.r > p.y1) { bola.y = p.y1 - bola.r; bola.vy = -Math.max(Math.abs(bola.vy), QUIQUE); bateu = true }
    if (bateu) {
      const giro = (luta.sorte() - 0.5) * 0.07
      const c = cosseno(giro), s = seno(giro)
      const vx = bola.vx * c - bola.vy * s
      bola.vy = bola.vx * s + bola.vy * c
      bola.vx = vx
    }
  }

  /** One step of 1/120 s. Returns the fight; `luta.eventos` has what happened in it (the overlay draws them). */
  function passo(luta) {
    luta.eventos = NADA
    if (luta.fim) return luta
    const [a, b] = luta.bolas
    a.flash = Math.max(0, a.flash - DT)
    b.flash = Math.max(0, b.flash - DT)
    // The hitstop: the world stands still, the clock too.
    if (luta.pausa > 0) {
      luta.pausa--
      return luta
    }
    luta.tique++
    luta.t = luta.tique * DT

    // Sudden death: the walls close in.
    if (luta.t >= MORTE_SUBITA) {
      if (luta.t - DT < MORTE_SUBITA) evento(luta, { tipo: "morte-subita" })
      const k = Math.min(1, (luta.t - MORTE_SUBITA) / (FECHA_ATE - MORTE_SUBITA)) * (1 - FECHADA) / 2
      luta.paredes = { x0: LARGURA * k, y0: ALTURA * k, x1: LARGURA * (1 - k), y1: ALTURA * (1 - k) }
    }

    for (const bola of luta.bolas) {
      bola.recarga = Math.max(0, bola.recarga - DT)
      if (parada(luta, bola)) continue
      // The Punho speeds up along its way, to its top speed; the Martelo's swing picks up, to its top spin.
      if (bola.classe === "punho") {
        const v = Math.sqrt(bola.vx * bola.vx + bola.vy * bola.vy) || 1
        if (v < bola.vmax) {
          const nova = Math.min(bola.vmax, v + bola.c.corpo.aceleracao * DT)
          bola.vx *= nova / v
          bola.vy *= nova / v
        }
      } else if (bola.classe === "martelo") {
        const g = Math.min(bola.giroMax, Math.abs(bola.giro) + bola.c.embalo.acelera * DT)
        bola.giro = (bola.giro < 0 ? -1 : 1) * g
      }
      bola.vy += GRAVIDADE * DT
      const limite = bola.classe === "punho" ? Math.max(VELOCIDADE_MAX, bola.vmax) : VELOCIDADE_MAX
      const v = Math.sqrt(bola.vx * bola.vx + bola.vy * bola.vy)
      if (v > limite) {
        bola.vx *= limite / v
        bola.vy *= limite / v
      }
      bola.x += bola.vx * DT
      bola.y += bola.vy * DT
      quicar(luta, bola)
    }
    luta.recargaAparada = Math.max(0, luta.recargaAparada - DT)

    // Bodies bump (a stunned one stands like a wall).
    {
      let dx = b.x - a.x, dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < a.r + b.r && d > 0) {
        dx /= d; dy /= d
        const va = a.vx * dx + a.vy * dy, vb = b.vx * dx + b.vy * dy
        const pa = parada(luta, a), pb = parada(luta, b)
        if (va - vb > 0) {
          if (pa && !pb) { b.vx += 2 * (va - vb) * dx; b.vy += 2 * (va - vb) * dy }
          else if (pb && !pa) { a.vx -= 2 * (va - vb) * dx; a.vy -= 2 * (va - vb) * dy }
          else if (!pa && !pb) {
            a.vx += (vb - va) * dx; a.vy += (vb - va) * dy
            b.vx += (va - vb) * dx; b.vy += (va - vb) * dy
          }
        }
        const sobra = a.r + b.r - d
        const ka = pa ? 0 : pb ? 1 : 0.5
        a.x -= dx * sobra * ka; a.y -= dy * sobra * ka
        b.x += dx * sobra * (1 - ka); b.y += dy * sobra * (1 - ka)
      }
    }

    // Weapons turn in substeps short enough that a tip never jumps past a body (under 5 units each).
    const giraA = armada(luta, a), giraB = armada(luta, b)
    const pontaA = giraA ? Math.abs(a.giro) * TAU * (a.r + a.comprimento) * DT : 0
    const pontaB = giraB ? Math.abs(b.giro) * TAU * (b.r + b.comprimento) * DT : 0
    const subpassos = Math.max(1, Math.ceil(Math.max(pontaA, pontaB) / 5))
    for (let s = 0; s < subpassos && !luta.pausa; s++) {
      if (giraA) a.angulo += a.giro * TAU * DT / subpassos
      if (giraB) b.angulo += b.giro * TAU * DT / subpassos
      if (!giraA && !giraB) break
      const wa = giraA ? arma(a) : null, wb = giraB ? arma(b) : null
      // A parry first: a weapon caught by the other weapon doesn't reach the body.
      if (wa && wb) {
        const entre = entreSegmentos(wa.px0, wa.py0, wa.x1, wa.y1, wb.px0, wb.py0, wb.x1, wb.y1)
        if (entre.distancia < (a.c.arma.espessura + b.c.arma.espessura) / 2) {
          if (!luta.recargaAparada) aparar(luta, (entre.ax + entre.bx) / 2, (entre.ay + entre.by) / 2)
          continue
        }
      }
      if (wa && !a.recarga && (a.dano || a.classe === "martelo")) {
        const toque = noSegmento(wa.x0, wa.y0, wa.x1, wa.y1, b.x, b.y)
        if (toque.distancia < b.r + a.c.arma.espessura / 2) golpe(luta, a, b, toque.ax, toque.ay)
      }
      if (wb && !b.recarga && (b.dano || b.classe === "martelo") && !luta.pausa) {
        const toque = noSegmento(wb.x0, wb.y0, wb.x1, wb.y1, a.x, a.y)
        if (toque.distancia < a.r + b.c.arma.espessura / 2) golpe(luta, b, a, toque.ax, toque.ay)
      }
    }

    // The bow looses its volley when it points at the other ball and has reloaded.
    for (const bola of luta.bolas) {
      if (!bola.c.flecha || luta.t < bola.proximaFlecha || parada(luta, bola)) continue
      const outra = luta.bolas[1 - bola.lado]
      const dx = outra.x - bola.x, dy = outra.y - bola.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const w = arma(bola)
      if ((w.cx * dx + w.sy * dy) / d < PONTARIA) continue
      atirar(luta, bola)
      bola.proximaFlecha = luta.t + bola.c.flecha.intervalo
    }
    // Arrows fly straight, die at the walls, are stopped by any weapon and hurt the other's body.
    if (luta.flechas.length) {
      const vivas = []
      const p = luta.paredes
      for (const bola of luta.bolas) if (bola.c.arma) arma(bola)
      for (const f of luta.flechas) {
        f.x += f.vx * DT
        f.y += f.vy * DT
        if (f.x < p.x0 || f.x > p.x1 || f.y < p.y0 || f.y > p.y1) continue
        const alvo = luta.bolas[1 - f.dono]
        if (armada(luta, alvo)) {
          const w = alvo.w
          if (noSegmento(w.px0, w.py0, w.x1, w.y1, f.x, f.y).distancia < alvo.c.arma.espessura / 2 + 3) {
            evento(luta, { tipo: "bloqueio", x: f.x, y: f.y })
            continue
          }
        }
        const dx = f.x - alvo.x, dy = f.y - alvo.y
        if (dx * dx + dy * dy < (alvo.r + 2) * (alvo.r + 2)) {
          const dono = luta.bolas[f.dono]
          ferir(luta, alvo, f.dano, "flecha", dono)
          dono.acertos++
          dono.flechas = Math.min(dono.c.flecha.teto, dono.flechas + 1)
          // A little shove along the arrow's way.
          alvo.vx += f.vx * 0.25
          alvo.vy += f.vy * 0.25
          luta.pausa = Math.max(luta.pausa, 3)
          continue
        }
        vivas.push(f)
      }
      luta.flechas = vivas
    }

    // What the other's ability left: the Foice's poison (each stack, 1 every 2.5 s, until the Foice falls) and the
    // Katana's slices still to come.
    for (const bola of luta.bolas) {
      const outra = luta.bolas[1 - bola.lado]
      if (outra.hp <= 0) continue
      if (bola.envenenado && luta.t >= bola.proximoVeneno) {
        ferir(luta, bola, bola.envenenado * outra.c.veneno.dano, "veneno", outra)
        bola.proximoVeneno = luta.t + outra.c.veneno.intervalo
      }
      if (bola.cortando && luta.t >= bola.proximoCorte) {
        ferir(luta, bola, outra.c.arma.dano, "corte", outra)
        bola.cortando--
        bola.proximoCorte = luta.t + outra.c.cortes.intervalo
      }
    }

    // Who's ahead (for the balance script's lead changes) and at 20 s.
    const lider = a.hp === b.hp ? luta.metricas.lider : a.hp > b.hp ? 0 : 1
    if (lider !== luta.metricas.lider && luta.metricas.lider !== null) luta.metricas.viradas++
    luta.metricas.lider = lider
    if (luta.metricas.meio === null && luta.t >= 20) luta.metricas.meio = a.hp - b.hp

    // The end.
    if (a.hp <= 0 || b.hp <= 0) {
      const vencedor = a.hp <= 0 && b.hp <= 0 ? (a.causado === b.causado ? (luta.sorte() < 0.5 ? 0 : 1) : a.causado > b.causado ? 0 : 1) : a.hp <= 0 ? 1 : 0
      luta.fim = { vencedor, motivo: "nocaute", t: luta.t }
    } else if (luta.t >= FIM) {
      const vencedor = a.hp !== b.hp ? (a.hp > b.hp ? 0 : 1) : a.causado !== b.causado ? (a.causado > b.causado ? 0 : 1) : luta.sorte() < 0.5 ? 0 : 1
      luta.fim = { vencedor, motivo: a.hp !== b.hp || a.causado !== b.causado ? "tempo" : "sorteio", t: luta.t }
    }
    if (luta.fim) evento(luta, { tipo: "fim", ...luta.fim })
    return luta
  }

  /** A whole fight at once (the balance script, a check of a result): the fight at its end. */
  function simular(semente, a, b, ajustes) {
    const luta = criar(semente, a, b, ajustes)
    while (!luta.fim) passo(luta)
    return luta
  }

  /** The number by each ball's name: what its ability has grown to, as its class counts it (`luta` for the Foice,
   * whose number is the poison on the other). */
  function contador(bola, luta) {
    const n = (x, casas = 0) => x.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas })
    const f = bola.c.forca
    switch (bola.classe) {
      case "espada": return `Dano ${n(bola.dano * f, 1)}`
      case "adaga": return `Giro ${n(Math.abs(bola.giro), 1)} · Dano ${n(bola.c.arma.dano * (Math.abs(bola.giro) / bola.c.arma.giro) * f, 1)}`
      case "arco": return `Flechas ${Math.floor(bola.flechas)}`
      case "lanca": return `Dano ${n(bola.dano * f, 1)} · Alc. ${n(bola.comprimento)}`
      case "machado": return `Crítico ${n(bola.critico * 100)}% · ×${bola.c.critico.vezes}`
      case "foice": return `Veneno ${luta ? luta.bolas[1 - bola.lado].envenenado : 0}`
      case "punho": return `Soco ${n((Math.sqrt(bola.vx * bola.vx + bola.vy * bola.vy) / 100) * bola.c.arma.dano * f, 1)}`
      case "martelo": return `Embalo ${n(Math.abs(bola.giro), 1)} de ${n(bola.giroMax, 1)}`
      case "katana": return `Cortes ${bola.cortes}`
      case "clava": return `Atordoa ${n(bola.atordoa, 1)} s`
    }
    return ""
  }

  const Duelo = { VERSAO, HZ, DT, LADO, LARGURA, ALTURA, RAIO, HP, GRAVIDADE, MORTE_SUBITA, FIM, CLASSES, IDS, gerador, seno, cosseno, criar, passo, simular, arma, armada, parada, contador }
  ;(typeof window !== "undefined" ? window : globalThis).Duelo = Duelo
})()
