// The ball duel's engine: two balls bounce in a box, each with its class's weapon, and every hit makes that weapon
// grow (more damage, faster spin, more arrows, longer reach, a crit's chance, more bleed). No DOM: the overlay
// (duelo.html) draws it, the site can replay a fight from its seed, and Node runs thousands of them to tune the
// numbers (scripts/duelo-balanco.mjs). Plain script, no build: sets Duelo on the page (window) or the context it
// runs in.
//
// Deterministic: a fight is only its seed and the two classes, so the same three things give the same fight
// anywhere. Fixed steps of 1/120 s, randomness only from the seeded generator, and nothing that differs between
// JavaScript engines (Math.sin, cos, atan2, exp, pow are approximated differently by each; + − × ÷ and sqrt
// aren't), so the angles go through seno() below. Power never grows with Σ (Luan, 2026-11-15): everyone's ball is
// the same for its class; Σ only changes looks, which this file knows nothing about. A change to the numbers or the
// rules is a new VERSAO, so a fight recorded before still says which rules it was fought under.

;(() => {
  const VERSAO = 1
  const HZ = 120
  const DT = 1 / HZ
  const TAU = 6.283185307179586

  // The arena, in units that are the overlay's pixels at 1080p.
  const LARGURA = 624
  const ALTURA = 288
  const RAIO = 22
  const HP = 100
  // Sudden death: at 50 s the walls close in (to 60% by 65 s) and damage goes ×1.5, ×2 from 60 s. At 75 s the
  // fight stops and the most HP wins, then who dealt more, then the seed.
  const MORTE_SUBITA = 50
  const FECHA_ATE = 65
  const FIM = 75
  const FECHADA = 0.6
  // How hard each ball turns toward the other, in radians per second: they want the fight, so they meet often,
  // without homing in so hard that it's a straight line.
  const MIRA = 1.2
  // The bow looses its volley when it points at the other ball, within this much (cos 15°).
  const PONTARIA = 0.9659

  // Each class: its weapon (length beyond the body and thickness, in units; spin in turns per second; damage), how
  // it grows per hit landed and up to where. `forca` multiplies all the damage it deals: the knob the balance
  // script (scripts/duelo-balanco.mjs) turns until every class wins about half its fights.
  const CLASSES = {
    espada: { nome: "Espada", arma: { comprimento: 39, espessura: 6, giro: 1, dano: 2 }, cresce: 1, teto: 20, velocidade: 228, forca: 2.73 },
    adaga: { nome: "Adaga", arma: { comprimento: 23, espessura: 6, giro: 1.6, dano: 1.5 }, cresce: 0.32, teto: 4.6, velocidade: 240, recarga: 0.12, forca: 5.15 },
    arco: { nome: "Arco", arma: { comprimento: 18, espessura: 6, giro: 0.7, dano: 0 }, cresce: 1, teto: 8, velocidade: 216, flecha: { dano: 2, intervalo: 1.4, velocidade: 340, abertura: 0.5, inicio: 2 }, forca: 1.6 },
    lanca: { nome: "Lança", arma: { comprimento: 52, espessura: 5, giro: 0.7, dano: 3, ponta: 0.5 }, cresce: 0.4, alcance: 1.8, tetoAlcance: 76, velocidade: 216, forca: 2.84 },
    machado: { nome: "Machado", arma: { comprimento: 34, espessura: 8, giro: 0.85, dano: 3 }, cresce: 0.08, critico: { inicio: 0.1, vezes: 3 }, velocidade: 216, forca: 3.11 },
    foice: { nome: "Foice", arma: { comprimento: 42, espessura: 6, giro: 0.9, dano: 1 }, cresce: 1, teto: 10, velocidade: 222, sangria: { intervalo: 2 }, forca: 1.18 },
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

  /**
   * A new fight between class `a` (left) and class `b` (right), from `semente`. `ajustes` overrides any class's
   * numbers (the balance script's knobs: { espada: { forca: 2.6 } }) and, in `mundo`, the steering and HP.
   */
  function criar(semente, a, b, ajustes = {}) {
    const sorte = gerador(semente)
    const mundo = { mira: MIRA, hp: HP, ...ajustes.mundo }
    const classe = (id) => {
      const base = CLASSES[id]
      if (!base) throw new Error(`classe desconhecida: ${id}`)
      const extra = ajustes[id] ?? {}
      return { ...base, ...extra, arma: { ...base.arma, ...extra.arma } }
    }
    const bola = (id, lado) => {
      const c = classe(id)
      const angulo = sorte() * TAU
      const direcao = sorte() * TAU
      return {
        lado,
        classe: id,
        c,
        x: lado === 0 ? LARGURA * (0.2 + sorte() * 0.12) : LARGURA * (0.68 + sorte() * 0.12),
        y: ALTURA * (0.25 + sorte() * 0.5),
        vx: cosseno(direcao) * c.velocidade,
        vy: seno(direcao) * c.velocidade,
        r: RAIO,
        hp: mundo.hp,
        hpMax: mundo.hp,
        angulo,
        giro: c.arma.giro * (sorte() < 0.5 ? -1 : 1),
        comprimento: c.arma.comprimento,
        dano: c.arma.dano,
        // The weapon as a segment, from arma(): the part that hurts (x0 → x1) and the part that parries (px0 → x1).
        w: { x0: 0, y0: 0, x1: 0, y1: 0, px0: 0, py0: 0, cx: 1, sy: 0 },
        // What grows: the hits it landed, and its class's own counter.
        acertos: 0,
        decai: 1, // the Adaga's growth, smaller with each hit
        critico: c.critico?.inicio ?? 0,
        flechas: c.flecha?.inicio ?? 0,
        proximaFlecha: c.flecha ? c.flecha.intervalo * (0.4 + sorte() * 0.4) : 0,
        sangria: 0, // stacks this Foice has put on the other
        sangrando: 0, // stacks on this ball, from the other's Foice
        proximaSangria: 0,
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

  /** The weapon's segment now, into bola.w. The Lança's whole shaft parries; only its point hurts. */
  function arma(bola) {
    const w = bola.w
    const cx = cosseno(bola.angulo), sy = seno(bola.angulo)
    const base = bola.classe === "lanca" ? bola.r + bola.comprimento * (1 - bola.c.arma.ponta) : bola.r - 2
    const ponta = bola.r + bola.comprimento
    w.cx = cx; w.sy = sy
    w.x0 = bola.x + cx * base; w.y0 = bola.y + sy * base
    w.x1 = bola.x + cx * ponta; w.y1 = bola.y + sy * ponta
    w.px0 = bola.x + cx * (bola.r - 2); w.py0 = bola.y + sy * (bola.r - 2)
    return w
  }

  const multiplicador = (luta) => (luta.t >= 60 ? 2 : luta.t >= MORTE_SUBITA ? 1.5 : 1)

  // Hits vary by ±15% (seeded): with only seven or eight hits to kill, exact numbers would make a class's chances
  // jump with the smallest change, all or nothing at the hit that kills. The bleed doesn't vary.
  function ferir(luta, alvo, quanto, tipo, de) {
    const variacao = tipo === "sangria" ? 1 : 0.85 + luta.sorte() * 0.3
    const dano = quanto * variacao * (de ? de.c.forca : 1) * multiplicador(luta)
    alvo.hp = Math.max(0, alvo.hp - dano)
    alvo.flash = 0.12
    if (de) {
      de.causado += dano
      luta.metricas.acertos[de.lado]++
      if (luta.metricas.primeiro === null) luta.metricas.primeiro = de.lado
    }
    evento(luta, { tipo, alvo: alvo.lado, dano, x: alvo.x, y: alvo.y - alvo.r })
    return dano
  }

  // A weapon hit the other's body: damage, growth, a shove and a moment's stop.
  function golpe(luta, atacante, alvo, px, py) {
    const c = atacante.c
    let dano = atacante.dano
    let tipo = "golpe"
    let empurrao = 140
    if (atacante.classe === "machado") {
      if (luta.sorte() < atacante.critico) {
        dano *= c.critico.vezes
        tipo = "critico"
        empurrao = 320
        atacante.critico = c.critico.inicio
        atacante.dano += 1
      } else atacante.critico = Math.min(0.9, atacante.critico + c.cresce)
    }
    const causado = ferir(luta, alvo, dano, tipo, atacante)
    atacante.acertos++
    if (atacante.classe === "espada") atacante.dano = Math.min(c.teto, atacante.dano + c.cresce)
    if (atacante.classe === "adaga") {
      atacante.giro = Math.sign(atacante.giro) * Math.min(c.teto, Math.abs(atacante.giro) + c.cresce * atacante.decai)
      atacante.decai *= 0.97
    }
    if (atacante.classe === "lanca") {
      atacante.dano += c.cresce
      atacante.comprimento = Math.min(c.tetoAlcance, atacante.comprimento + c.alcance)
    }
    if (atacante.classe === "foice") {
      atacante.sangria = Math.min(c.teto, atacante.sangria + c.cresce)
      alvo.sangrando = atacante.sangria
      if (!alvo.proximaSangria) alvo.proximaSangria = luta.t + c.sangria.intervalo
    }
    atacante.recarga = c.recarga ?? 0.25
    // Shoved away from where it was hit.
    let nx = alvo.x - px, ny = alvo.y - py
    const n = Math.sqrt(nx * nx + ny * ny) || 1
    nx /= n; ny /= n
    alvo.vx += nx * empurrao
    alvo.vy += ny * empurrao
    luta.pausa = Math.max(luta.pausa, Math.round(Math.min(16, 4 + causado * 0.3)))
  }

  // Weapon on weapon: both bounce apart, both spins turn around, and a spark.
  function aparar(luta, x, y) {
    const [a, b] = luta.bolas
    a.giro = -a.giro
    b.giro = -b.giro
    let nx = b.x - a.x, ny = b.y - a.y
    const n = Math.sqrt(nx * nx + ny * ny) || 1
    nx /= n; ny /= n
    a.vx -= nx * 120; a.vy -= ny * 120
    b.vx += nx * 120; b.vy += ny * 120
    luta.pausa = Math.max(luta.pausa, 6)
    luta.recargaAparada = 0.18
    luta.metricas.aparadas++
    evento(luta, { tipo: "aparada", x, y })
  }

  // The bow's volley: its arrows in a fan along where the bow points.
  function atirar(luta, bola) {
    const c = bola.c.flecha
    const n = Math.floor(bola.flechas)
    for (let i = 0; i < n; i++) {
      const desvio = n === 1 ? 0 : (i / (n - 1) - 0.5) * c.abertura
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

  // Each wall bounce turns the ball a little (±4°, seeded), so two balls never lock into paths that don't meet.
  function quicar(luta, bola) {
    const p = luta.paredes
    let bateu = false
    if (bola.x - bola.r < p.x0) { bola.x = p.x0 + bola.r; bola.vx = Math.abs(bola.vx); bateu = true }
    if (bola.x + bola.r > p.x1) { bola.x = p.x1 - bola.r; bola.vx = -Math.abs(bola.vx); bateu = true }
    if (bola.y - bola.r < p.y0) { bola.y = p.y0 + bola.r; bola.vy = Math.abs(bola.vy); bateu = true }
    if (bola.y + bola.r > p.y1) { bola.y = p.y1 - bola.r; bola.vy = -Math.abs(bola.vy); bateu = true }
    if (bateu) {
      const giro = (luta.sorte() - 0.5) * 0.14
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

    const curva = luta.mundo.mira * DT
    const cosCurva = cosseno(curva), senCurva = seno(curva)
    for (const bola of luta.bolas) {
      // A little toward the other.
      const outra = luta.bolas[1 - bola.lado]
      const lado = bola.vx * (outra.y - bola.y) - bola.vy * (outra.x - bola.x) >= 0 ? 1 : -1
      const vx = bola.vx * cosCurva - bola.vy * senCurva * lado
      bola.vy = bola.vx * senCurva * lado + bola.vy * cosCurva
      bola.vx = vx
      // Back toward its class's speed after a shove (about 1.5 s).
      const v = Math.sqrt(bola.vx * bola.vx + bola.vy * bola.vy) || 1
      const alvo = v + (bola.c.velocidade - v) * (DT / 1.5)
      bola.vx *= alvo / v
      bola.vy *= alvo / v
      bola.x += bola.vx * DT
      bola.y += bola.vy * DT
      quicar(luta, bola)
      bola.recarga = Math.max(0, bola.recarga - DT)
    }
    luta.recargaAparada = Math.max(0, luta.recargaAparada - DT)

    // Bodies bump, no damage.
    {
      let dx = b.x - a.x, dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < a.r + b.r && d > 0) {
        dx /= d; dy /= d
        const va = a.vx * dx + a.vy * dy, vb = b.vx * dx + b.vy * dy
        if (va - vb > 0) {
          a.vx += (vb - va) * dx; a.vy += (vb - va) * dy
          b.vx += (va - vb) * dx; b.vy += (va - vb) * dy
        }
        const sobra = (a.r + b.r - d) / 2
        a.x -= dx * sobra; a.y -= dy * sobra
        b.x += dx * sobra; b.y += dy * sobra
      }
    }

    // Weapons turn in substeps short enough that a tip never jumps past a body (under 5 units each).
    const pontaA = Math.abs(a.giro) * TAU * (a.r + a.comprimento) * DT
    const pontaB = Math.abs(b.giro) * TAU * (b.r + b.comprimento) * DT
    const subpassos = Math.max(1, Math.ceil(Math.max(pontaA, pontaB) / 5))
    for (let s = 0; s < subpassos && !luta.pausa; s++) {
      a.angulo += a.giro * TAU * DT / subpassos
      b.angulo += b.giro * TAU * DT / subpassos
      const wa = arma(a), wb = arma(b)
      // A parry first: a weapon caught by the other weapon doesn't reach the body.
      const entre = entreSegmentos(wa.px0, wa.py0, wa.x1, wa.y1, wb.px0, wb.py0, wb.x1, wb.y1)
      if (entre.distancia < (a.c.arma.espessura + b.c.arma.espessura) / 2) {
        if (!luta.recargaAparada) aparar(luta, (entre.ax + entre.bx) / 2, (entre.ay + entre.by) / 2)
        continue
      }
      if (a.dano && !a.recarga) {
        const toque = noSegmento(wa.x0, wa.y0, wa.x1, wa.y1, b.x, b.y)
        if (toque.distancia < b.r + a.c.arma.espessura / 2) golpe(luta, a, b, toque.ax, toque.ay)
      }
      if (b.dano && !b.recarga && !luta.pausa) {
        const toque = noSegmento(wb.x0, wb.y0, wb.x1, wb.y1, a.x, a.y)
        if (toque.distancia < a.r + b.c.arma.espessura / 2) golpe(luta, b, a, toque.ax, toque.ay)
      }
    }

    // The bow looses its volley when it points at the other ball and has reloaded.
    for (const bola of luta.bolas) {
      if (!bola.c.flecha || luta.t < bola.proximaFlecha) continue
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
      arma(a)
      arma(b)
      for (const f of luta.flechas) {
        f.x += f.vx * DT
        f.y += f.vy * DT
        if (f.x < p.x0 || f.x > p.x1 || f.y < p.y0 || f.y > p.y1) continue
        const alvo = luta.bolas[1 - f.dono]
        const w = alvo.w
        if (noSegmento(w.px0, w.py0, w.x1, w.y1, f.x, f.y).distancia < alvo.c.arma.espessura / 2 + 3) {
          evento(luta, { tipo: "bloqueio", x: f.x, y: f.y })
          continue
        }
        const dx = f.x - alvo.x, dy = f.y - alvo.y
        if (dx * dx + dy * dy < (alvo.r + 2) * (alvo.r + 2)) {
          const dono = luta.bolas[f.dono]
          ferir(luta, alvo, f.dano, "flecha", dono)
          dono.acertos++
          // A whole volley landing is one more arrow in the next.
          dono.flechas = Math.min(dono.c.teto, dono.flechas + dono.c.cresce / Math.floor(dono.flechas))
          luta.pausa = Math.max(luta.pausa, 3)
          continue
        }
        vivas.push(f)
      }
      luta.flechas = vivas
    }

    // The Foice's bleed: 1 per stack every 2 s, until its owner falls.
    for (const bola of luta.bolas) {
      const foice = luta.bolas[1 - bola.lado]
      if (!bola.sangrando || foice.hp <= 0 || luta.t < bola.proximaSangria) continue
      ferir(luta, bola, bola.sangrando, "sangria", foice)
      luta.metricas.acertos[foice.lado]--
      bola.proximaSangria = luta.t + foice.c.sangria.intervalo
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

  /** The number under each ball's bar: what its weapon has grown to. */
  function contador(bola) {
    const n = (x, casas = 0) => x.toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas })
    switch (bola.classe) {
      case "espada": return `Dano ${n(bola.dano * bola.c.forca)}`
      case "adaga": return `Giro ${n(Math.abs(bola.giro) / bola.c.arma.giro, 1)}×`
      case "arco": return `Flechas ${Math.floor(bola.flechas)}`
      case "lanca": return `Alcance +${n((bola.comprimento / bola.c.arma.comprimento - 1) * 100)}%`
      case "machado": return `Crítico ${n(bola.critico * 100)}%`
      case "foice": return `Sangria ×${bola.sangria}`
    }
    return ""
  }

  const Duelo = { VERSAO, HZ, DT, LARGURA, ALTURA, RAIO, HP, MORTE_SUBITA, FIM, CLASSES, IDS, gerador, seno, cosseno, criar, passo, simular, arma, contador }
  ;(typeof window !== "undefined" ? window : globalThis).Duelo = Duelo
})()
