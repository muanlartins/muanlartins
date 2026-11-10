// The stream's synthesized sound effects (no samples, so no rights to clear: they may go into the recording and the
// YouTube VOD): the bad play's sting, the crowd's "uuuh", the drum roll and the VAR's whistle. Each recipe plays into any AudioContext,
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

  /** A brass note: detuned saws through a filter that opens on the attack. */
  function brass(ctx, out, t, f, seconds, { peak = 0.22, vibrato = 0 } = {}) {
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.Q.value = 2
    filter.frequency.setValueAtTime(250, t)
    filter.frequency.exponentialRampToValueAtTime(2600, t + 0.06)
    filter.frequency.exponentialRampToValueAtTime(1100, t + 0.3)
    const g = envelope(ctx, t, { attack: 0.025, hold: Math.max(0, seconds - 0.25), release: 0.25, peak })
    filter.connect(g).connect(out)
    for (const [detune, type, octave] of [[-8, "sawtooth", 1], [0, "sawtooth", 1], [7, "sawtooth", 1], [0, "square", 0.5]]) {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = f * octave
      osc.detune.value = detune
      if (vibrato) {
        const lfo = ctx.createOscillator()
        const depth = ctx.createGain()
        lfo.frequency.value = 5.5
        depth.gain.setValueAtTime(0, t)
        depth.gain.linearRampToValueAtTime(vibrato, t + seconds * 0.6)
        lfo.connect(depth).connect(osc.detune)
        lfo.start(t)
        lfo.stop(t + seconds + 0.3)
      }
      osc.connect(filter)
      osc.start(t)
      osc.stop(t + seconds + 0.3)
    }
  }

  const RECIPES = {
    // The bad play: dun, dun, duuun (D, D, B♭, the last one held, over timpani).
    lance: { seconds: 3.2, play(ctx, out) {
      const r = room(ctx, out, { seconds: 2.2, wet: 0.35 })
      const D3 = 146.83
      ;[[0, D3, 0.26], [0.36, D3, 0.26], [0.72, semitone(D3, -4), 1.7]].forEach(([t, f, s], i) => {
        brass(ctx, r, t, f, s, { vibrato: i === 2 ? 18 : 0 })
        brass(ctx, r, t, f * 2, s, { peak: 0.08 })
        drum(ctx, r, t, { from: 110, to: 55, seconds: i === 2 ? 1.2 : 0.4, peak: 0.8, click: 0.15 })
      })
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

    // The referee's whistle for the VAR: two short blasts and a long one. A pea whistle: a high tone the pea
    // trills (wobbling its pitch and level ~30 times a second), with breath under it.
    apito: { seconds: 1.9, play(ctx, out) {
      const r = room(ctx, out, { seconds: 0.9, wet: 0.18, decay: 4 })
      for (const [t, s] of [[0, 0.13], [0.22, 0.13], [0.46, 1.05]]) {
        const g = envelope(ctx, t, { attack: 0.012, hold: s, release: 0.06, peak: 0.5 })
        g.connect(r)
        const trill = ctx.createOscillator()
        trill.frequency.value = 27 + Math.random() * 8
        const pitch = ctx.createGain()
        pitch.gain.value = 110
        const level = ctx.createGain()
        level.gain.value = 0.35
        const am = ctx.createGain()
        am.gain.value = 0.65
        trill.connect(pitch)
        trill.connect(level).connect(am.gain)
        am.connect(g)
        for (const [f, peak] of [[2950, 1], [5900, 0.12]]) {
          const osc = ctx.createOscillator()
          osc.frequency.setValueAtTime(f * 0.97, t)
          osc.frequency.linearRampToValueAtTime(f, t + 0.03)
          pitch.connect(osc.frequency)
          const k = ctx.createGain()
          k.gain.value = peak
          osc.connect(k).connect(am)
          osc.start(t)
          osc.stop(t + s + 0.1)
        }
        trill.start(t)
        trill.stop(t + s + 0.1)
        burst(ctx, g, t, { seconds: s + 0.05, frequency: 3000, q: 1.5, peak: 0.12, attack: 0.01 })
      }
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
