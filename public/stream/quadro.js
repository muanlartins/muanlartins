// What to believe of the trackers' answers, frame by frame, for every filter: a single failed answer doesn't take
// what's on him away, and the background behind him is learnt only where he surely isn't.
// On 2026-11-22's live his own hair had been learnt as background and painted over his hair: one mask that missed
// him was enough, and it stayed until the page reloaded. No three.js here: plain numbers, times in ms, points in the
// video's own 0..1, y down.

// How long the last good answer stands in for one that's missing.
export const SEGURA = { rosto: 250, ombros: 400, maos: 120, mascara: 300 }
// Masks in a row that must all say he isn't there before a pixel counts as background.
const SEGUIDAS = 3
// A face's detection this near a mask's frame (ms) counts as that frame's.
const PERTO = 200
// Without a face for this long, and this share of his usual area or less: he left, and what's seen is background.
const SAIU = [1000, 0.6]
// A mask that lost this much of the last one's area at once failed (only from this share of the frame up).
const SUMIU = [0.5, 0.05]
// The head and hair never learnt while his face is there, in the face's half width and height.
const CABECA = [1.45, 1.65, 0.25]

const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

export function criarQuadro() {
  let rostos = []
  let boas = []
  let area = 0 // the last mask's taken
  let areaDele = 0 // his usual one, with his face there
  let boaEm = -Infinity
  let rostoEm = -Infinity
  let visto = false

  function maisPerto(t) {
    let best = null
    for (const r of rostos) if (Math.abs(r.t - t) <= PERTO && (!best || Math.abs(r.t - t) < Math.abs(best.t - t))) best = r
    return best
  }

  /** A face's detection: its landmarks and its frame's time. */
  function rosto(lm, t) {
    if (!lm) return
    const p = (i) => [lm[i].x, lm[i].y]
    rostos.push({ t, topo: p(10), queixo: p(152), nariz: p(1), e: p(234), d: p(454) })
    if (rostos.length > 60) rostos.shift()
    rostoEm = t
  }

  /** The face's centre when that frame was taken, or null. */
  function centroEm(t) {
    let a = null, b = null
    for (const r of rostos) {
      if (r.t <= t) a = r
      else {
        b = r
        break
      }
    }
    if (a && t - a.t > PERTO) a = null
    if (b && b.t - t > PERTO) b = null
    if (!a || !b) return a || b ? meio((a || b).topo, (a || b).queixo) : null
    const k = (t - a.t) / (b.t - a.t)
    const p = meio(a.topo, a.queixo), q = meio(b.topo, b.queixo)
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]
  }

  /**
   * The body mask's answer for the frame taken at `t`.
   * @returns usar: false to keep the last one on screen; fora: where he may be, over the last masks and his head
   *          (what it leaves out can be learnt as background from that same frame), or null to learn nothing.
   */
  function mascara(mask, w, h, t) {
    let n = 0
    for (let i = 0; i < mask.length; i++) if (mask[i] > 127) n++
    const r = maisPerto(t)
    let falhou = area > SUMIU[1] * mask.length && n < SUMIU[0] * area
    if (r) {
      // His face is seen there: a mask that doesn't have it failed.
      const c = meio(r.topo, r.queixo)
      const dentro = [c, r.nariz, meio(c, r.queixo)].filter(([x, y]) => {
        if (x < 0 || x >= 1 || y < 0 || y >= 1) return true
        return mask[Math.floor(y * h) * w + Math.floor(x * w)] > 127
      }).length
      if (dentro < 2) falhou = true
    }
    if (falhou && t - boaEm < SEGURA.mascara) return { usar: false, fora: null }
    area = n
    if (falhou) {
      // It's been failing for a while: shown as it comes, and nothing's learnt from it.
      boas = []
      return { usar: true, fora: null }
    }
    boaEm = t
    boas.push(mask.slice())
    if (boas.length > SEGUIDAS) boas.shift()
    if (r) {
      visto = true
      areaDele = areaDele ? areaDele + (n - areaDele) * 0.05 : n
    }
    if (!visto || boas.length < SEGUIDAS) return { usar: true, fora: null }
    if (!r && (t - rostoEm < SAIU[0] || n > SAIU[1] * areaDele)) return { usar: true, fora: null }

    const fora = boas[0].slice()
    for (const m of boas.slice(1)) for (let i = 0; i < fora.length; i++) if (m[i] > fora[i]) fora[i] = m[i]
    if (r) {
      const px = ([x, y]) => [x * w, y * h]
      const T = px(r.topo), Q = px(r.queixo), E = px(r.e), D = px(r.d)
      const alt = Math.hypot(T[0] - Q[0], T[1] - Q[1]) / 2
      if (alt > 0) {
        const ux = (T[0] - Q[0]) / (2 * alt), uy = (T[1] - Q[1]) / (2 * alt)
        const ry = alt * CABECA[1]
        const rx = Math.max(Math.hypot(E[0] - D[0], E[1] - D[1]) / 2, alt * 0.9) * CABECA[0]
        const cx = (T[0] + Q[0]) / 2 + ux * alt * CABECA[2], cy = (T[1] + Q[1]) / 2 + uy * alt * CABECA[2]
        const R = Math.max(rx, ry)
        for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(h, cy + R); y++)
          for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(w, cx + R); x++) {
            const dx = x + 0.5 - cx, dy = y + 0.5 - cy
            const a = (dx * uy - dy * ux) / rx, b = (dx * ux + dy * uy) / ry
            if (a * a + b * b < 1) fora[y * w + x] = 255
          }
      }
    }
    return { usar: true, fora }
  }

  /** Another camera, or the filter on from none: nothing known of him or of what's behind him. */
  function limpa() {
    rostos = []
    boas = []
    area = areaDele = 0
    boaEm = rostoEm = -Infinity
    visto = false
  }

  return { rosto, centroEm, mascara, limpa }
}
