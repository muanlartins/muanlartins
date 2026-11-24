// The stream's synthesized sound effects (no samples, so no rights to clear: they may go into the recording and the
// YouTube VOD): the bad play's phonk hit, the crowd's "uuuh", the drum roll and the VAR's whistle. Each recipe plays into any AudioContext,
// live or offline; brand/twitch/sons.mjs renders them to WAV files in public/stream/sons/, which tocador.html plays
// (the applause there is a public-domain recording instead: see brand/README.md). Plain script, no build: sets
// window.Sons.

;(() => {
  const semitone = (f, n) => f * 2 ** (n / 12)

  function noise(ctx, seconds) {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  /** A room: a convolver with a decaying noise tail, mixed `wet` into `out`. Returns the input to feed. */
  function room(ctx, out, { seconds = 1.8, wet = 0.25, decay = 3 } = {}) {
    const input = ctx.createGain()
    const dry = ctx.createGain()
    const convolver = ctx.createConvolver()
    const ir = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c)
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** decay
    }
    convolver.buffer = ir
    const send = ctx.createGain()
    send.gain.value = wet
    dry.gain.value = 1 - wet / 2
    input.connect(dry).connect(out)
    input.connect(send).connect(convolver).connect(out)
    return input
  }

  /** A gain with an attack–decay envelope from `t`. */
  function envelope(ctx, t, { attack = 0.005, hold = 0, release = 0.2, peak = 1 }) {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + attack)
    g.gain.setValueAtTime(peak, t + attack + hold)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release)
    return g
  }

  function burst(ctx, out, t, { seconds = 0.2, type = "bandpass", frequency = 1500, q = 1, peak = 1, attack = 0.002 }) {
    const src = ctx.createBufferSource()
    src.buffer = noise(ctx, seconds + 0.05)
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    filter.Q.value = q
    const g = envelope(ctx, t, { attack, release: seconds, peak })
    src.connect(filter).connect(g).connect(out)
    src.start(t)
    src.stop(t + seconds + 0.05)
  }

  /** A drum: a sine falling in pitch, with a click of noise. */
  function drum(ctx, out, t, { from = 160, to = 60, seconds = 0.35, peak = 0.9, click = 0.25 }) {
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(to, t + seconds * 0.8)
    const g = envelope(ctx, t, { attack: 0.002, release: seconds, peak })
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + seconds + 0.05)
    if (click) burst(ctx, out, t, { seconds: 0.03, type: "highpass", frequency: 2500, peak: click })
  }

  /** A struck bell: a few sine partials, the upper ones dying first. */
  function bell(ctx, out, t, f, { seconds = 1.2, peak = 0.3 } = {}) {
    for (const [ratio, gain, length] of [[1, 1, 1], [2, 0.3, 0.6], [3, 0.12, 0.4], [4.2, 0.08, 0.25]]) {
      const osc = ctx.createOscillator()
      osc.frequency.value = f * ratio
      const g = envelope(ctx, t, { attack: 0.003, release: seconds * length, peak: peak * gain })
      osc.connect(g).connect(out)
      osc.start(t)
      osc.stop(t + seconds * length + 0.05)
    }
  }

  /** A whoosh from left to right: noise through a band-pass sweeping up (the alerts' band wiping in). */
  function whoosh(ctx, out, t, { seconds = 0.6, from = 300, to = 3500, peak = 0.35 } = {}) {
    const src = ctx.createBufferSource()
    src.buffer = noise(ctx, seconds + 0.05)
    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.Q.value = 1.2
    bp.frequency.setValueAtTime(from, t)
    bp.frequency.exponentialRampToValueAtTime(to, t + seconds)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + seconds * 0.6)
    g.gain.linearRampToValueAtTime(0, t + seconds)
    const pan = ctx.createStereoPanner()
    pan.pan.setValueAtTime(-0.7, t)
    pan.pan.linearRampToValueAtTime(0.7, t + seconds)
    src.connect(bp).connect(g).connect(pan).connect(out)
    src.start(t)
    src.stop(t + seconds + 0.05)
  }

  /** A water drop: a sine whose pitch leaps up as it dies. */
  function drop(ctx, out, t, f, { peak = 0.5 } = {}) {
    const osc = ctx.createOscillator()
    osc.frequency.setValueAtTime(f, t)
    osc.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.05)
    const g = envelope(ctx, t, { attack: 0.002, release: 0.09, peak })
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + 0.15)
  }

  const RECIPES = {
    // Twitch's alerts (uploaded to its Alerts Box, see brand/README.md): each opens with the band's whoosh and lands
    // as its sheen crosses it. A follow: two bell notes, a fourth up.
    seguidor: { seconds: 2.2, play(ctx, out) {
      const r = room(ctx, out, { seconds: 1.6, wet: 0.3 })
      whoosh(ctx, r, 0, { seconds: 0.55, peak: 0.25 })
      bell(ctx, r, 0.5, 783.99, { seconds: 1.1, peak: 0.32 })
      bell(ctx, r, 0.64, 1046.5, { seconds: 1.5, peak: 0.36 })
    } },

    // A sub (and a gift, bits, a raid): a major arpeggio up to a held chord, on a low hit.
    inscrito: { seconds: 3.2, play(ctx, out) {
      const r = room(ctx, out, { seconds: 2.2, wet: 0.32 })
      whoosh(ctx, r, 0, { seconds: 0.6, peak: 0.3 })
      ;[523.25, 659.25, 783.99].forEach((f, i) => bell(ctx, r, 0.45 + i * 0.09, f, { seconds: 0.8, peak: 0.26 }))
      for (const f of [1046.5, 1318.5, 1567.98]) bell(ctx, r, 0.72, f, { seconds: 2.2, peak: 0.2 })
      drum(ctx, r, 0.72, { from: 120, to: 50, seconds: 0.8, peak: 0.7, click: 0.12 })
      burst(ctx, r, 0.72, { seconds: 1.4, type: "highpass", frequency: 6000, peak: 0.08, attack: 0.05 })
    } },

    // "Bebe água!": three drops and a gulp.
    agua: { seconds: 1.9, play(ctx, out) {
      const r = room(ctx, out, { seconds: 1.2, wet: 0.28 })
      whoosh(ctx, r, 0, { seconds: 0.5, peak: 0.2 })
      ;[[0.45, 820], [0.6, 1120], [0.72, 960]].forEach(([t, f]) => drop(ctx, r, t, f))
      drop(ctx, r, 0.98, 340, { peak: 0.7 })
    } },

    // The bad play, since 2026-11-24 the camera's Sigma moment: a phonk hit. An 808 boom with a clap, a short
    // cowbell figure of our own over it (the 808 drum machine's: two square waves a fifth-ish apart through a
    // band-pass), distorted, then a second boom sliding down that rings out. A short reversed swell leads into it
    // (and lets the master compressor settle: a hit at 0 came out swelling in).
    lance: { seconds: 2.5, play(ctx, out) {
      const r = room(ctx, out, { seconds: 1.5, wet: 0.2, decay: 3.5 })
      // Soft clipping, `k` how hard.
      const drive = (k) => {
        const ws = ctx.createWaveShaper()
        const curve = new Float32Array(2048)
        for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(k * ((i / (curve.length - 1)) * 2 - 1)) / Math.tanh(k)
        ws.curve = curve
        ws.oversample = "4x"
        return ws
      }
      const filter = (type, frequency, q = 0.7) => {
        const f = ctx.createBiquadFilter()
        f.type = type
        f.frequency.value = frequency
        f.Q.value = q
        return f
      }
      // The cowbells, crushed and darkened a little; the 808 through its own drive, mostly dry.
      const bells = ctx.createGain()
      bells.gain.value = 0.55
      bells.connect(drive(6)).connect(filter("highpass", 380)).connect(filter("lowpass", 4200)).connect(r)
      const sub = ctx.createGain()
      sub.gain.value = 0.9
      const subOut = sub.connect(drive(2.4)).connect(filter("lowpass", 1100))
      subOut.connect(out)
      subOut.connect(r)
      const cowbell = (t, f, seconds = 0.16, peak = 0.5) => {
        const bp = filter("bandpass", f * 1.3, 1.3)
        bp.connect(envelope(ctx, t, { attack: 0.001, release: seconds, peak })).connect(bells)
        for (const k of [1, 1.4815]) {
          const osc = ctx.createOscillator()
          osc.type = "square"
          osc.frequency.value = f * k
          osc.connect(bp)
          osc.start(t)
          osc.stop(t + seconds + 0.05)
        }
      }
      // An 808: a sine that kicks down onto its note (or slides down to it from `from`), held and dying away.
      const boom = (t, f, seconds, { from = f * 3, slide = 0.05, peak = 1 } = {}) => {
        const osc = ctx.createOscillator()
        osc.frequency.setValueAtTime(from, t)
        osc.frequency.exponentialRampToValueAtTime(f, t + slide)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(peak, t + 0.004)
        g.gain.setValueAtTime(peak, t + seconds * 0.25)
        g.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
        osc.connect(g).connect(sub)
        osc.start(t)
        osc.stop(t + seconds + 0.05)
        burst(ctx, out, t, { seconds: 0.025, type: "highpass", frequency: 3000, peak: 0.35 })
      }
      const clap = (t) => {
        for (const d of [0, 0.012, 0.024]) burst(ctx, r, t + d, { seconds: d ? 0.03 : 0.16, frequency: 1400, q: 1.2, peak: 0.5 })
      }
      const T = 0.15
      const swell = ctx.createBufferSource()
      swell.buffer = noise(ctx, T)
      const sweep = filter("bandpass", 700, 0.9)
      sweep.frequency.exponentialRampToValueAtTime(5000, T)
      const rise = ctx.createGain()
      rise.gain.setValueAtTime(0.0001, 0)
      rise.gain.exponentialRampToValueAtTime(0.3, T - 0.005)
      rise.gain.linearRampToValueAtTime(0, T)
      swell.connect(sweep).connect(rise).connect(r)
      swell.start(0)
      const BELL = 540
      boom(T, 55, 0.75)
      clap(T)
      ;[[0, 0], [0.15, 0], [0.3, 3], [0.4, 0], [0.55, -2], [0.7, 5, 0.38]].forEach(([t, n, s]) => cowbell(T + t, semitone(BELL, n), s))
      for (let t = 0.05; t < 0.66; t += 0.1) burst(ctx, r, T + t, { seconds: 0.03, type: "highpass", frequency: 8000, peak: 0.1 })
      boom(T + 0.7, 55, 1.6, { from: 98, slide: 0.32, peak: 1.1 })
      clap(T + 0.7)
    } },

    // The crowd's "uuuh": voices on an "u", sliding down together.
    uuuh: { seconds: 2.6, play(ctx, out) {
      const r = room(ctx, out, { seconds: 1.6, wet: 0.35 })
      const vowel = ctx.createGain()
      for (const [f, q, gain] of [[320, 6, 1], [800, 8, 0.45], [2400, 10, 0.08]]) {
        const bp = ctx.createBiquadFilter()
        bp.type = "bandpass"
        bp.frequency.value = f
        bp.Q.value = q
        const g = ctx.createGain()
        g.gain.value = gain
        vowel.connect(bp).connect(g).connect(r)
      }
      const swell = ctx.createGain()
      swell.gain.setValueAtTime(0, 0)
      swell.gain.linearRampToValueAtTime(1.1, 0.35)
      swell.gain.linearRampToValueAtTime(0.8, 1.4)
      swell.gain.linearRampToValueAtTime(0, 2.3)
      swell.connect(vowel)
      for (let v = 0; v < 14; v++) {
        const osc = ctx.createOscillator()
        osc.type = "sawtooth"
        const f = 150 + Math.random() * 170
        osc.frequency.setValueAtTime(f * 1.06, 0)
        osc.frequency.linearRampToValueAtTime(f * 0.78, 2.3)
        const lfo = ctx.createOscillator()
        const depth = ctx.createGain()
        lfo.frequency.value = 4 + Math.random() * 2
        depth.gain.value = 12
        lfo.connect(depth).connect(osc.detune)
        const g = ctx.createGain()
        g.gain.value = 0.05
        osc.connect(g).connect(swell)
        const start = Math.random() * 0.12
        osc.start(start)
        lfo.start(start)
        osc.stop(2.4)
        lfo.stop(2.4)
      }
      burst(ctx, swell, 0, { seconds: 2.3, frequency: 500, q: 0.8, peak: 0.25, attack: 0.3 })
    } },

    // A drum roll that builds to one low hit, with no cymbal after it (Luan's call).
    tambor: { seconds: 2.8, play(ctx, out) {
      const r = room(ctx, out, { seconds: 1.4, wet: 0.25 })
      for (let t = 0; t < 1.7; t += 0.042) {
        const level = 0.15 + 0.75 * (t / 1.7) ** 1.5
        burst(ctx, r, t, { seconds: 0.07, type: "highpass", frequency: 1800, peak: level * (0.85 + Math.random() * 0.3) })
        drum(ctx, r, t, { from: 220, to: 170, seconds: 0.06, peak: level * 0.3, click: 0 })
      }
      drum(ctx, r, 1.75, { from: 90, to: 45, seconds: 0.9, peak: 1 })
    } },
  }

  /** The effect `name` into a fresh offline context, as 16-bit stereo WAV bytes (for sons.mjs). */
  async function wav(name, sampleRate = 48000) {
    const { seconds, play } = RECIPES[name]
    const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate)
    const master = ctx.createDynamicsCompressor()
    master.threshold.value = -10
    master.ratio.value = 4
    master.connect(ctx.destination)
    play(ctx, master)
    const audio = await ctx.startRendering()
    // Normalized to -1 dBFS, so every effect starts at the same level in OBS's mixer.
    const channels = [audio.getChannelData(0), audio.getChannelData(1)]
    const peak = Math.max(...channels.map((c) => c.reduce((m, x) => Math.max(m, Math.abs(x)), 0))) || 1
    const k = 0.89 / peak
    const n = audio.length
    const bytes = new DataView(new ArrayBuffer(44 + n * 4))
    const text = (o, s) => [...s].forEach((ch, i) => bytes.setUint8(o + i, ch.charCodeAt(0)))
    text(0, "RIFF")
    bytes.setUint32(4, 36 + n * 4, true)
    text(8, "WAVEfmt ")
    bytes.setUint32(16, 16, true)
    bytes.setUint16(20, 1, true)
    bytes.setUint16(22, 2, true)
    bytes.setUint32(24, sampleRate, true)
    bytes.setUint32(28, sampleRate * 4, true)
    bytes.setUint16(32, 4, true)
    bytes.setUint16(34, 16, true)
    text(36, "data")
    bytes.setUint32(40, n * 4, true)
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 2; c++) bytes.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, channels[c][i] * k)) * 32767, true)
    }
    return new Uint8Array(bytes.buffer)
  }

  window.Sons = { RECIPES, wav, room, envelope, noise }
})()
