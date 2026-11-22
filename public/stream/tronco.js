// His torso in the body's mask without the chair behind him, for what's painted on his clothes (Celeste's jacket).
// MediaPipe's segmenters all take the chair's back for him, the lighter and the heavier ones alike (tried on frames of
// three lives, 2026-11-22). What tells them apart in the picture: the chair is near black (2–14% luminance), his
// shoulders are skin or cloth at 25–75%. So in each column, from inside him upwards, the torso ends at the first dark
// run, and the mask above it is dropped up to where something as light as him starts again (a raised arm, a hand, his
// face). Only beside his neck: the collar stands on its own there. In dark clothes
// there's no such edge, so the top is then a shoulders' curve (`curva`, measured on those lives).
// Runs in rastreio.js on the body mask's small frame (256 wide), under a millisecond.

// In half shoulder widths, from the middle between the shoulders' joints.
const LARGO = 2.2 // how far to the sides it looks
const ALTO = 1.4 // how far above the joints' line
const MEIO = 0.4 // the middle left as it is: his neck and the collar
const FORA = 1.05 // past it his arms: looked from the bottom of the frame up, not from the joints' line
// Luminance, 0 to 1: the share of his own that still counts as him, its bounds, and the darkest clothes it can read.
const PARTE = 0.45
const LIMIAR = [0.1, 0.32]
const CLARO = 0.22
// Over the chair, as light as him again: this share of his own, over this many half shoulder widths.
const DE_NOVO = [0.6, 0.12]

// His shoulders' top over the joints' line, at `a` from the middle.
const curva = (a) => 0.52 - 0.3 * (a - 0.44) - 0.9 * Math.max(0, a - 1) ** 2

function emOrdem(v, n) {
  for (let i = 1; i < n; i++)
    for (let j = i; j > 0 && v[j - 1] > v[j]; j--) {
      const p = v[j]
      v[j] = v[j - 1]
      v[j - 1] = p
    }
}

/**
 * @param mask the body mask, 0..255, w × h from the top
 * @param rgba the same frame's pixels
 * @param E, D his shoulders' joints [x, y] in that frame's pixels, in either order
 * @returns the mask without the chair, or null when the joints can't be used
 */
export function semCadeira(mask, rgba, w, h, E, D) {
  const [A, B] = E[0] < D[0] ? [E, D] : [D, E]
  const sw = (B[0] - A[0]) / 2
  if (!(sw >= 8)) return null
  const mid = (A[0] + B[0]) / 2
  const incl = Math.max(-0.5, Math.min(0.5, (B[1] - A[1]) / (B[0] - A[0])))
  const linha = (x) => (A[1] + B[1]) / 2 + incl * Math.max(-sw, Math.min(sw, x - mid))
  const luz = (i) => (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255

  // His own luminance: the median round and under the joints' line.
  const amostra = []
  for (let x = Math.max(0, Math.ceil(mid - sw)); x < Math.min(w, mid + sw); x += 2) {
    const l = linha(x)
    for (let y = Math.max(0, Math.round(l - 0.1 * sw)); y < Math.min(h, l + 0.5 * sw); y += 2) {
      const i = y * w + x
      if (mask[i] > 160) amostra.push(luz(i))
    }
  }
  amostra.sort((p, q) => p - q)
  const dele = amostra.length >= 12 ? amostra[amostra.length >> 1] : 0
  const limiar = Math.max(LIMIAR[0], Math.min(LIMIAR[1], dele * PARTE))

  const x0 = Math.max(0, Math.floor(mid - LARGO * sw))
  const x1 = Math.min(w - 1, Math.ceil(mid + LARGO * sw))
  // Per column, the row the mask is dropped above (0: nothing dropped).
  const corte = new Float32Array(w)
  // And the row it's dropped down from.
  const desde = new Float32Array(w)
  const claro = Math.max(limiar, dele * DE_NOVO[0])
  const seguidos = Math.max(4, Math.round(DE_NOVO[1] * sw))
  for (let x = x0; x <= x1; x++) {
    const a = Math.abs(x - mid) / sw
    if (a < MEIO) continue
    const l = linha(x)
    const palpite = a < 1.6 ? l - curva(a) * sw : 0
    if (dele < CLARO) {
      desde[x] = Math.max(0, Math.round(l - ALTO * sw))
      corte[x] = palpite
      continue
    }
    const teto = Math.max(0, Math.round(l - ALTO * sw))
    desde[x] = teto
    let y = Math.round(Math.min(h - 2, a < FORA ? l + 0.1 * sw : l + 0.9 * sw))
    while (y > teto && mask[y * w + x] <= 127) y--
    let escuros = 0
    for (; y > teto; y--) {
      const i = y * w + x
      if (mask[i] <= 127) break
      if (luz(i) >= limiar) escuros = 0
      else if (++escuros === 2) {
        corte[x] = y + 2
        break
      }
    }
    // Dark at his very shoulder (a print, his hand's shadow, the mic): not the chair's edge.
    if (a < FORA && corte[x] > l - 0.04 * sw) corte[x] = palpite
    if (!corte[x]) continue
    for (let yc = Math.floor(corte[x]) - 3, n = 0; yc > teto; yc--) {
      const i = yc * w + x
      n = mask[i] > 127 && luz(i) >= claro ? n + 1 : 0
      if (n === seguidos) {
        desde[x] = yc + n
        break
      }
    }
  }

  const out = new Uint8Array(mask)
  const janela = [0, 0, 0, 0, 0]
  const tetos = [0, 0, 0, 0, 0]
  for (let x = x0; x <= x1; x++) {
    const a = Math.abs(x - mid) / sw
    if (a < MEIO) continue
    // The median of five columns on its own side: no spikes.
    let n = 0
    for (let k = x - 2; k <= x + 2; k++) {
      if (k < x0 || k > x1) continue
      const ak = Math.abs(k - mid) / sw
      if (ak < MEIO || k < mid !== x < mid) continue
      janela[n] = corte[k]
      tetos[n++] = desde[k]
    }
    emOrdem(janela, n)
    emOrdem(tetos, n)
    const c = janela[n >> 1]
    if (c <= 0) continue
    const topo = Math.round(tetos[n >> 1])
    const ate = Math.min(h, Math.floor(c))
    for (let y = topo; y < ate; y++) out[y * w + x] = 0
    if (ate >= topo && ate < h) out[ate * w + x] *= 1 - (c - ate)
  }
  return out
}
