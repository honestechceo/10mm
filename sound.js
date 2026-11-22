// Sound upgrade: richer synthesized SFX (no audio files), extra soundtrack songs, and volume settings.
// Loaded after game.js; replaces the global sfx() and wraps startMusic().
(function () {
  "use strict";
  let bus = null, nbuf = null;
  const vol = (k, d) => { const v = settings[k]; return typeof v === "number" ? v : d; };
  function ctx() {
    if (!audioCtx || audioCtx.state !== "running") return null;
    if (!bus) { bus = audioCtx.createGain(); const lim = audioCtx.createDynamicsCompressor(); lim.threshold.value = -10; lim.ratio.value = 8; lim.attack.value = 0.002; lim.release.value = 0.15; bus.connect(lim).connect(audioCtx.destination); }
    bus.gain.value = 1.1 * vol("sfxVol", 1);
    if (!nbuf) {
      nbuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.2, audioCtx.sampleRate);
      const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return audioCtx;
  }
  // tone: pitch sweep with a fast attack and exponential decay
  function tone(f0, f1, dur, wave, v, at, dt) {
    const c = audioCtx, t = c.currentTime + (dt || 0), o = c.createOscillator(), g = c.createGain();
    o.type = wave || "sine"; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (at || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.03);
  }
  // nz: filtered noise burst (type: lowpass/highpass/bandpass), optional filter sweep
  function nz(dur, v, type, f, q, dt, f2) {
    const c = audioCtx, t = c.currentTime + (dt || 0), s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = nbuf; fl.type = type || "lowpass"; fl.frequency.setValueAtTime(f || 1000, t); fl.Q.value = q || 1;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  }
  // metallic ring: a few inharmonic partials, the sound of steel tools
  function ring(base, dur, v, dt) { for (const [m, a] of [[1, 1], [2.76, 0.5], [5.4, 0.28], [8.9, 0.14]]) tone(base * m, base * m * 0.995, dur / (1 + m * 0.25), "sine", v * a, 0.002, dt); }
  const R = {
    jump: () => { tone(330, 720, 0.13, "square", 0.05); nz(0.1, 0.03, "bandpass", 1800, 1.2, 0, 4200); },
    flap: () => { tone(560, 900, 0.07, "triangle", 0.07); tone(720, 1150, 0.07, "triangle", 0.05, 0.004, 0.05); },
    land: () => { tone(140, 60, 0.12, "sine", 0.16); nz(0.06, 0.06, "lowpass", 900); ring(1250, 0.12, 0.025); },
    coin: () => { tone(988, 988, 0.07, "square", 0.04); tone(1319, 1319, 0.28, "square", 0.045, 0.004, 0.07); tone(2637, 2637, 0.2, "sine", 0.02, 0.004, 0.07); },
    grab: () => R.coin(),
    miss: () => { tone(330, 200, 0.16, "square", 0.05); tone(250, 150, 0.2, "triangle", 0.06, 0.006, 0.08); },
    hit: () => { nz(0.09, 0.22, "bandpass", 2600, 3); ring(420, 0.45, 0.07); tone(120, 50, 0.22, "sine", 0.22); },
    hurt: () => { nz(0.08, 0.2, "bandpass", 1800, 2); tone(420, 110, 0.3, "sawtooth", 0.07); tone(160, 55, 0.25, "sine", 0.2); },
    crash: () => R.hit(),
    stomp: () => { tone(240, 80, 0.12, "square", 0.08); nz(0.07, 0.1, "lowpass", 1400); tone(500, 900, 0.09, "triangle", 0.05, 0.004, 0.06); },
    bosshit: () => { tone(180, 45, 0.35, "sine", 0.3); nz(0.12, 0.25, "bandpass", 1500, 2); ring(300, 0.6, 0.06); tone(700, 1100, 0.12, "square", 0.04, 0.004, 0.1); },
    crate: () => { nz(0.16, 0.2, "bandpass", 700, 1.5); nz(0.08, 0.12, "highpass", 3000, 1, 0.04); tone(160, 90, 0.1, "triangle", 0.1); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => { tone(f, f, 0.18, "square", 0.04, 0.005, i * 0.09); tone(f * 2, f * 2, 0.22, "sine", 0.02, 0.005, i * 0.09); }); tone(1047, 1047, 0.5, "triangle", 0.06, 0.01, 0.36); },
    power: () => { tone(400, 1200, 0.22, "square", 0.04); [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, f, 0.12, "sine", 0.035, 0.004, 0.12 + i * 0.05)); },
    ok: () => { tone(1568, 1568, 0.1, "sine", 0.05); tone(2093, 2093, 0.16, "sine", 0.04, 0.004, 0.06); },
    star: () => { [1568, 1976, 2349, 3136].forEach((f, i) => tone(f, f, 0.25, "sine", 0.04, 0.004, i * 0.06)); nz(0.4, 0.02, "highpass", 6000); },
    warp: () => { tone(1200, 120, 0.55, "sine", 0.08); tone(1800, 180, 0.55, "triangle", 0.03); nz(0.5, 0.05, "bandpass", 3000, 2, 0, 300); },
    roar: () => { const c = audioCtx, t = c.currentTime, o = c.createOscillator(), l = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.9); l.frequency.value = 22; lg.gain.value = 18; l.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
      o.connect(g).connect(bus); o.start(t); l.start(t); o.stop(t + 1); l.stop(t + 1); nz(0.9, 0.08, "lowpass", 700, 1, 0, 200); },
    slam: () => { tone(110, 38, 0.45, "sine", 0.35); nz(0.3, 0.25, "lowpass", 600, 1, 0, 120); ring(230, 0.5, 0.05, 0.01); },
    shot: () => { nz(0.06, 0.25, "bandpass", 2200, 1.5); tone(900, 180, 0.12, "square", 0.05); ring(1400, 0.2, 0.03, 0.03); },
    whoosh: () => nz(0.25, 0.1, "bandpass", 600, 1.5, 0, 3500),
    punch: () => { nz(0.12, 0.12, "bandpass", 500, 1, 0, 2500); tone(200, 70, 0.16, "sine", 0.25, 0.004, 0.08); nz(0.06, 0.15, "lowpass", 2000, 1, 0.08); },
    bump: () => { tone(260, 520, 0.08, "square", 0.05); tone(180, 120, 0.08, "sine", 0.12); },
    boing: () => tone(180, 900, 0.3, "triangle", 0.09),
    // ---- shop and service bay tools ----
    ratchet: () => { for (let i = 0; i < 6; i++) nz(0.018, 0.16, "bandpass", 3200, 6, i * 0.055); ring(2600, 0.08, 0.02, 0.3); },
    impact: () => { for (let i = 0; i < 12; i++) { nz(0.03, 0.18, "bandpass", 900, 2, i * 0.045); tone(75, 60, 0.035, "square", 0.05, 0.003, i * 0.045); } nz(0.5, 0.04, "highpass", 4000); },
    click: () => { for (let i = 0; i < 3; i++) { nz(0.02, 0.22, "bandpass", 4200, 8, i * 0.22); ring(3100, 0.06, 0.03, i * 0.22); } },
    thud: () => { tone(95, 50, 0.2, "sine", 0.32); nz(0.08, 0.12, "lowpass", 500); },
    clank: () => { nz(0.05, 0.15, "bandpass", 3000, 3); ring(520, 0.5, 0.07); },
    hiss: () => nz(0.7, 0.09, "highpass", 3500, 0.7, 0, 6000),
    spray: () => { nz(0.6, 0.1, "bandpass", 5500, 1.2); nz(0.05, 0.06, "highpass", 2000); },
    scrub: () => { for (let i = 0; i < 6; i++) nz(0.08, 0.08, "bandpass", 2400 + (i % 2) * 900, 2, i * 0.09); },
    pop: () => { tone(900, 140, 0.08, "square", 0.08); nz(0.05, 0.2, "bandpass", 1200, 2); },
    jack: () => { for (let i = 0; i < 3; i++) { tone(160, 120, 0.08, "square", 0.05, 0.004, i * 0.16); nz(0.04, 0.08, "bandpass", 2200, 4, i * 0.16 + 0.05); } },
    glug: () => { for (let i = 0; i < 4; i++) tone(170 + i * 30, 90, 0.12, "sine", 0.12, 0.01, i * 0.12); },
    pedal: () => { tone(140, 90, 0.12, "triangle", 0.12); nz(0.08, 0.05, "lowpass", 800); },
    tick: () => nz(0.02, 0.1, "bandpass", 3800, 6),
  };
  window.sfx = function (type) {
    if (!soundOn) return;
    try { audioReady(); if (!ctx()) return; (R[type] || R.ok)(); } catch (e) {}
  };
  // tool -> sound, used by the Service Bay when a step is done
  window.TOOL_SFX = { impact: "impact", ratchet: "ratchet", wrenches: "ratchet", torque: "click", mallet: "thud", cleaner: "spray", airhose: "hiss", valvetool: "hiss", prybar: "clank", tirebar: "clank", beadbreaker: "pop", wirebrush: "scrub", jack: "jack", chock: "thud", weighthammer: "clank", oil: "glug", compressor: "ratchet", lube: "glug", grease: "glug", padlube: "glug", rotor: "clank", pads: "clank", clips: "tick", filter: "ratchet" };

  // ---- more soundtrack: Lost Toolbox, boss fights, Service Bay ----
  const add = {
    lostbox: { bpm: 140, chords: "C G Am F C G F G", drums: "beat", arp: true,
      lead: ["E5 _ G5 _ C6 . . _ B5 _ G5 _ E5 . . _", "D5 _ G5 _ B5 . . _ A5 _ G5 _ D5 . . _", "C5 _ E5 _ A5 . . _ G5 _ E5 _ C5 _ E5 _", "F5 _ A5 _ C6 . . . A5 . . . F5 . . .",
        "E5 _ G5 _ C6 _ E6 _ D6 _ C6 _ B5 _ G5 _", "D5 _ G5 _ B5 _ D6 _ C6 _ B5 _ A5 _ G5 _", "A5 _ C6 _ F6 . . _ E6 _ C6 _ A5 _ F5 _", "G5 . . . B5 . . . D6 . . . G6 . . ."],
      bass: [0, null, 0, 7, 12, null, 7, null, 0, null, 0, 7, 12, 7, 5, 7] },
    boss: { bpm: 166, chords: "Am Am F E Am Am Dm E", drums: "tense", arp: true,
      lead: ["A5 _ A5 _ C6 _ A5 _ E6 _ D6 _ C6 _ B5 _", "A5 _ A5 _ C6 _ E6 _ A6 . . . G#6 . . .", "F5 _ A5 _ C6 _ F6 _ E6 _ C6 _ A5 _ F5 _", "E5 _ G#5 _ B5 _ E6 _ D6 _ B5 _ G#5 _ E5 _",
        "A5 _ E6 _ A5 _ E6 _ C6 _ E6 _ B5 _ E6 _", "A5 _ E6 _ A5 _ E6 _ D6 _ C6 _ B5 _ A5 _", "D6 _ F6 _ A6 _ F6 _ D6 _ C6 _ A5 _ F5 _", "E6 . . . D6 . . . B5 . . . G#5 . . ."],
      bass: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 10, 7] },
    service: { bpm: 116, chords: "F F Bb C F F Bb C", drums: "soft", arp: false,
      lead: ["A5 _ _ C6 _ A5 _ F5 _ _ G5 _ A5 _ _ _", "_ _ C6 _ D6 _ C6 _ A5 _ G5 _ F5 _ _ _", "D6 _ _ C6 _ Bb5 _ A5 _ _ G5 _ F5 _ _ _", "G5 _ A5 _ Bb5 _ C6 _ E6 . . . C6 _ _ _",
        "F6 _ _ E6 _ C6 _ A5 _ _ C6 _ A5 _ _ _", "_ _ G5 _ A5 _ C6 _ D6 _ C6 _ A5 _ _ _", "D6 _ F6 _ D6 _ Bb5 _ A5 _ G5 _ F5 _ _ _", "E5 _ G5 _ C6 _ E6 _ F6 . . . . . . ."],
      bass: [0, null, null, 0, null, 12, 0, null, 0, null, null, 7, null, 10, 12, null] },
  };
  add.bossfast = Object.assign({}, add.boss, { bpm: 186 });
  for (const k in add) { const s = add[k]; s.bars = s.lead.map(bar); s.ch = s.chords.split(" "); SONGS[k] = s; }

  const baseStart = window.startMusic;
  window.startMusic = function (which) {
    baseStart(which);
    try { if (musicGain && audioCtx) { musicGain.gain.cancelScheduledValues(audioCtx.currentTime); musicGain.gain.setValueAtTime(Math.max(0.0001, 0.6 * vol("musicVol", 0.8) / 0.8), audioCtx.currentTime); } } catch (e) {}
  };
  window.applyVolumes = function () {
    try { if (bus) bus.gain.value = 1.1 * vol("sfxVol", 1); if (musicGain && audioCtx && musicTimer) musicGain.gain.setValueAtTime(Math.max(0.0001, 0.6 * vol("musicVol", 0.8) / 0.8), audioCtx.currentTime); } catch (e) {}
  };
})();
