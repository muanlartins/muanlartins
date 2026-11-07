// The stream's sound effects, all synthesized here (no samples, so no rights to clear: they may go into the
// recording and the YouTube VOD). Each recipe plays into any AudioContext, live or offline;
// brand/twitch/sons.mjs renders them to WAV files, which OBS plays as media sources with hotkeys (the
// "Efeitos" dock, efeitos.html, restarts them too). Plain script, no build: sets window.Sons.

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

    // Applause: two dozen people clapping, each at their own pace, swelling and fading.
    palmas: { seconds: 3.4, play(ctx, out) {
      const r = room(ctx, out, { seconds: 1.2, wet: 0.3 })
      for (let p = 0; p < 26; p++) {
        const pace = 0.2 + Math.random() * 0.12
        const tone = 900 + Math.random() * 1600
        for (let t = Math.random() * 0.3; t < 2.9; t += pace * (0.9 + Math.random() * 0.2)) {
          const level = Math.min(1, t / 0.4) * Math.min(1, (3 - t) / 1.2)
          burst(ctx, r, t, { seconds: 0.02 + Math.random() * 0.03, frequency: tone, q: 1.2, peak: 0.16 * level })
        }
      }
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

    // A drum roll that builds to a crash.
    tambor: { seconds: 3.2, play(ctx, out) {
      const r = room(ctx, out, { seconds: 1.4, wet: 0.25 })
      for (let t = 0; t < 1.7; t += 0.042) {
        const level = 0.15 + 0.75 * (t / 1.7) ** 1.5
        burst(ctx, r, t, { seconds: 0.07, type: "highpass", frequency: 1800, peak: level * (0.85 + Math.random() * 0.3) })
        drum(ctx, r, t, { from: 220, to: 170, seconds: 0.06, peak: level * 0.3, click: 0 })
      }
      drum(ctx, r, 1.75, { from: 90, to: 45, seconds: 0.9, peak: 1 })
      burst(ctx, r, 1.75, { seconds: 1.4, type: "highpass", frequency: 5000, peak: 0.55 })
      burst(ctx, r, 1.75, { seconds: 0.9, frequency: 3200, q: 3, peak: 0.25 })
    } },

    // The rimshot after a joke: ba-dum-tss.
    badumtss: { seconds: 1.8, play(ctx, out) {
      const r = room(ctx, out, { seconds: 0.9, wet: 0.2 })
      drum(ctx, r, 0.0, { from: 200, to: 140, seconds: 0.25, peak: 0.8 })
      drum(ctx, r, 0.2, { from: 130, to: 85, seconds: 0.3, peak: 0.9 })
      drum(ctx, r, 0.45, { from: 70, to: 40, seconds: 0.3, peak: 0.7, click: 0 })
      burst(ctx, r, 0.45, { seconds: 1.1, type: "highpass", frequency: 6500, peak: 0.5 })
      burst(ctx, r, 0.45, { seconds: 0.5, frequency: 4200, q: 4, peak: 0.25 })
    } },

    // Suspense: a low drone and tremolo strings climbing, ending on a hit.
    suspense: { seconds: 4.6, play(ctx, out) {
      const r = room(ctx, out, { seconds: 2.5, wet: 0.4 })
      const drone = ctx.createBiquadFilter()
      drone.type = "lowpass"
      drone.frequency.value = 400
      const dg = ctx.createGain()
      dg.gain.setValueAtTime(0, 0)
      dg.gain.linearRampToValueAtTime(0.25, 1)
      dg.gain.setValueAtTime(0.25, 3.6)
      dg.gain.linearRampToValueAtTime(0, 3.7)
      drone.connect(dg).connect(r)
      for (const f of [73.42, 77.78, 110]) {
        const osc = ctx.createOscillator()
        osc.type = "sawtooth"
        osc.frequency.value = f
        osc.connect(drone)
        osc.start(0)
        osc.stop(3.8)
      }
      const strings = ctx.createGain()
      strings.gain.setValueAtTime(0, 0)
      strings.gain.linearRampToValueAtTime(0.12, 3.6)
      strings.gain.setValueAtTime(0, 3.62)
      const trem = ctx.createOscillator()
      const tremDepth = ctx.createGain()
      trem.frequency.value = 11
      tremDepth.gain.value = 0.06
      trem.connect(tremDepth).connect(strings.gain)
      trem.start(0)
      trem.stop(3.7)
      const lp = ctx.createBiquadFilter()
      lp.type = "lowpass"
      lp.frequency.value = 3500
      strings.connect(lp).connect(r)
      for (const [f, d] of [[587.33, -6], [587.33, 5], [622.25, 0], [880, 3]]) {
        const osc = ctx.createOscillator()
        osc.type = "sawtooth"
        osc.frequency.setValueAtTime(f, 0)
        osc.frequency.linearRampToValueAtTime(semitone(f, 2), 3.6)
        osc.detune.value = d
        osc.connect(strings)
        osc.start(0)
        osc.stop(3.7)
      }
      drum(ctx, r, 3.62, { from: 80, to: 40, seconds: 1, peak: 1 })
      brass(ctx, r, 3.62, 73.42, 0.6, { peak: 0.3 })
    } },

    // A stadium air horn: short, short, long.
    buzina: { seconds: 2.2, play(ctx, out) {
      const r = room(ctx, out, { seconds: 1.2, wet: 0.2 })
      ;[[0, 0.16], [0.24, 0.16], [0.48, 1.0]].forEach(([t, s]) => {
        const bp = ctx.createBiquadFilter()
        bp.type = "peaking"
        bp.frequency.value = 1400
        bp.gain.value = 10
        const g = envelope(ctx, t, { attack: 0.015, hold: s, release: 0.12, peak: 0.16 })
        bp.connect(g).connect(r)
        for (const [f, d] of [[349.23, -10], [349.23, 9], [440, -4], [440, 6], [523.25, 0]]) {
          const osc = ctx.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.setValueAtTime(f * 0.94, t)
          osc.frequency.exponentialRampToValueAtTime(f, t + 0.05)
          osc.detune.value = d
          osc.connect(bp)
          osc.start(t)
          osc.stop(t + s + 0.15)
        }
      })
    } },

    // A spring: boing.
    boing: { seconds: 1.2, play(ctx, out) {
      const osc = ctx.createOscillator()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(140, 0)
      osc.frequency.exponentialRampToValueAtTime(320, 0.08)
      osc.frequency.exponentialRampToValueAtTime(260, 0.9)
      const lfo = ctx.createOscillator()
      const depth = ctx.createGain()
      lfo.frequency.value = 16
      depth.gain.setValueAtTime(90, 0)
      depth.gain.exponentialRampToValueAtTime(4, 0.9)
      lfo.connect(depth).connect(osc.frequency)
      const g = envelope(ctx, 0, { attack: 0.004, release: 0.95, peak: 0.6 })
      osc.connect(g).connect(out)
      osc.start(0)
      lfo.start(0)
      osc.stop(1.1)
      lfo.stop(1.1)
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
