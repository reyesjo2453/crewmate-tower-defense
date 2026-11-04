'use strict';
/* ============================================================
   Sound: synthesized SFX + an adaptive, original soundtrack.
   No audio files — everything is built live with Web Audio.

   Music moods:  'title' | 'story' | 'battle' | 'boss'
   In battle the music has layers that react to the fight:
     intensity 0 = calm before the wave (pads, ticking clock)
     intensity 1 = foes on the field (pulsing bass, hats)
     intensity 2 = pressure (four-on-the-floor kick, 16th arps)
     intensity 3 = all-out (lead melody, open hats, crashes)
   danger (0..1) adds a heartbeat that speeds up as foes near the reactor.
   ============================================================ */
const Sound = (() => {
  let ctx = null, master, comp, musicBus, sfxBus, verb, verbIn, dly, noiseBuf;
  let sfxOn = true, musicOn = true, timer = 0;
  const S = { mood: 'title', pendingMood: null, bpm: 76, step: 0, next: 0, intensity: 0, wantIntensity: 0, danger: 0, sting: 0 };

  /* ---------- graph ---------- */
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    build(new AC());
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
    return ctx;
  }
  function build(c) {
    ctx = c;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.55 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    // reverb: generated impulse response
    verb = ctx.createConvolver(); const len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir; verbIn = ctx.createGain(); verbIn.gain.value = 0.9; verbIn.connect(verb); verb.connect(musicBus);
    // tempo delay for arps/leads
    dly = ctx.createDelay(1.5); const fb = ctx.createGain(), dlf = ctx.createBiquadFilter(), dOut = ctx.createGain();
    fb.gain.value = 0.32; dlf.type = 'lowpass'; dlf.frequency.value = 2600; dOut.gain.value = 0.5;
    dly.connect(dlf); dlf.connect(fb); fb.connect(dly); dlf.connect(dOut); dOut.connect(musicBus); dOut.connect(verbIn);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t, a, peak, d, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(sus, t + a, d); g.gain.setTargetAtTime(0.0001, end, rel);
  }
  function out(node, dry, wet, delayAmt) {
    if (dry) { const g = ctx.createGain(); g.gain.value = dry; node.connect(g); g.connect(musicBus); }
    if (wet) { const g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(verbIn); }
    if (delayAmt) { const g = ctx.createGain(); g.gain.value = delayAmt; node.connect(g); g.connect(dly); }
  }
  function noise(t, dur) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); return s; }

  /* ---------- instruments ---------- */
  const I = {
    kick(t, v) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      o.connect(g); out(g, 1); o.start(t); o.stop(t + 0.4);
      const c = noise(t, 0.02), cg = ctx.createGain(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
      cg.gain.setValueAtTime(v * 0.25, t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02); c.connect(hp); hp.connect(cg); out(cg, 1);
    },
    snare(t, v) {
      const n = noise(t, 0.25), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); n.connect(bp); bp.connect(g); out(g, 0.8, 0.35);
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      og.gain.setValueAtTime(v * 0.6, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(og); out(og, 1); o.start(t); o.stop(t + 0.12);
    },
    hat(t, v, open) {
      const n = noise(t, open ? 0.3 : 0.06), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 7500;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.28 : 0.045)); n.connect(hp); hp.connect(g); out(g, 0.7, 0.15);
    },
    crash(t, v) {
      const n = noise(t, 2), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 4000;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); n.connect(hp); hp.connect(g); out(g, 0.6, 0.5);
    },
    bass(t, m, dur, v, cut) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 7;
      f.frequency.setValueAtTime(cut * 2.2, t); f.frequency.exponentialRampToValueAtTime(Math.max(80, cut * 0.5), t + dur * 0.9);
      for (const det of [-9, 9]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 0.1); }
      const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = mtof(m - 12); const sg = ctx.createGain(); sg.gain.value = 0.8; sub.connect(sg); sg.connect(g); sub.start(t); sub.stop(t + dur + 0.1);
      env(g, t, 0.005, v, dur * 0.4, v * 0.5, 0.03, t + dur); f.connect(g); out(g, 1);
    },
    pad(t, notes, dur, v, bright) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = bright || 900; f.Q.value = 1;
      for (const m of notes) for (const det of [-12, 0, 12]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det + (Math.random() - 0.5) * 4; o.connect(f); o.start(t); o.stop(t + dur + 1.6); }
      env(g, t, Math.min(1.2, dur * 0.4), v, 0.6, v * 0.8, 0.5, t + dur); f.connect(g); out(g, 0.55, 0.8);
    },
    arp(t, m, dur, v, cut) {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'square'; o.frequency.value = mtof(m);
      f.type = 'lowpass'; f.Q.value = 4; f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(300, t + dur);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(f); f.connect(g); out(g, 0.7, 0.2, 0.35); o.start(t); o.stop(t + dur + 0.05);
    },
    lead(t, m, dur, v) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; f.Q.value = 2;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 0; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(14, t + Math.min(0.4, dur)); lfo.connect(lg);
      for (const [type, det] of [['sawtooth', -6], ['sawtooth', 6], ['square', 0]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(m); o.detune.value = det; lg.connect(o.detune); o.connect(f); o.start(t); o.stop(t + dur + 0.4); }
      lfo.start(t); lfo.stop(t + dur + 0.4);
      env(g, t, 0.03, v, 0.2, v * 0.75, 0.12, t + dur); f.connect(g); out(g, 0.6, 0.5, 0.25);
    },
    bell(t, m, dur, v) {
      for (const [ratio, amp, dec] of [[1, 1, dur], [2.01, 0.4, dur * 0.5], [3.98, 0.18, dur * 0.25]]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = mtof(m) * ratio;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * amp, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        o.connect(g); out(g, 0.5, 0.9, 0.15); o.start(t); o.stop(t + dec + 0.05);
      }
    },
    heart(t, v) {
      for (const [dt, a] of [[0, 1], [0.17, 0.7]]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(70, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.16);
        g.gain.setValueAtTime(v * a, t + dt); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.22); o.connect(g); out(g, 1); o.start(t + dt); o.stop(t + dt + 0.25);
      }
    },
    drone(t, m, dur, v) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      for (const det of [-5, 5]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 1.2); }
      env(g, t, 0.8, v, 1, v, 0.6, t + dur); f.connect(g); out(g, 0.8, 0.4);
    },
    stab(t, notes, v) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.3);
      for (const m of notes) for (const det of [-10, 10]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + 0.4); }
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); f.connect(g); out(g, 0.7, 0.45);
    },
    riser(t, dur, v) {
      const n = noise(t, dur), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur); n.connect(f); f.connect(g); out(g, 0.6, 0.4);
    }
  };

  /* ---------- composition (original, D minor) ---------- */
  const CH = { m: [0, 3, 7], M: [0, 4, 7], d: [0, 3, 6] };
  const chord = (root, q, oct) => CH[q].map(i => root + i + (oct || 0));
  const PROG = {
    title: [[50, 'm'], [46, 'M'], [41, 'M'], [48, 'M'], [50, 'm'], [43, 'm'], [46, 'M'], [45, 'M']],
    story: [[50, 'm'], [46, 'M'], [43, 'm'], [45, 'M']],
    battle: [[50, 'm'], [46, 'M'], [43, 'm'], [45, 'M']],
    boss: [[50, 'm'], [51, 'M'], [50, 'm'], [49, 'd']]
  };
  // [step, midi, lengthInSteps]
  const TITLE_MEL = [
    [[0, 74, 8], [8, 69, 8]], [[0, 77, 6], [6, 76, 2], [8, 74, 8]], [[0, 72, 8], [8, 69, 8]], [[0, 67, 4], [4, 69, 4], [8, 72, 8]],
    [[0, 74, 8], [8, 77, 8]], [[0, 79, 6], [6, 77, 2], [8, 74, 8]], [[0, 77, 8], [8, 74, 4], [12, 70, 4]], [[0, 69, 12], [12, 73, 4]]
  ];
  const BATTLE_MEL = [
    [[0, 69, 3], [3, 74, 3], [6, 77, 2], [8, 76, 2], [10, 74, 2], [12, 69, 4]],
    [[0, 77, 3], [3, 74, 3], [6, 70, 2], [8, 72, 2], [10, 74, 6]],
    [[0, 79, 3], [3, 77, 3], [6, 74, 2], [8, 70, 2], [10, 67, 6]],
    [[0, 69, 2], [2, 73, 2], [4, 76, 2], [6, 79, 2], [8, 77, 2], [10, 76, 2], [12, 73, 4]]
  ];
  const BOSS_MEL = [
    [[0, 62, 4], [4, 63, 4], [8, 62, 2], [10, 65, 2], [12, 63, 4]],
    [[0, 63, 4], [4, 67, 4], [8, 70, 2], [10, 69, 2], [12, 67, 4]],
    [[0, 62, 4], [4, 65, 2], [6, 69, 2], [8, 74, 4], [12, 72, 4]],
    [[0, 73, 4], [4, 70, 4], [8, 67, 4], [12, 64, 4]]
  ];
  const ARP = [0, 7, 12, 15, 12, 7, 3, 7, 0, 7, 12, 19, 15, 12, 7, 3];
  const BPM = { title: 76, story: 68, battle: 116, boss: 128 };

  function scheduleStep(st, t) {
    const i = st % 16, bar = Math.floor(st / 16), sx = 60 / S.bpm / 4, mood = S.mood;
    if (S.sting > t) return; // let a victory/defeat sting ring out
    const prog = PROG[mood], [root, q] = prog[bar % prog.length], tri = chord(root, q);
    if (mood === 'title' || mood === 'story') {
      if (i === 0) { I.pad(t, chord(root, q, 12), sx * 16, mood === 'title' ? 0.1 : 0.085, 900); I.drone(t, root - 12, sx * 16, 0.1); }
      if (mood === 'title') {
        const mel = TITLE_MEL[bar % TITLE_MEL.length]; for (const [s, m, l] of mel) if (s === i) I.bell(t, m, sx * l * 1.6, 0.2);
        if (bar % 16 >= 8 && i % 2 === 0) I.arp(t, tri[0] + 12 + ARP[i], sx * 1.8, 0.04, 1400);
      } else if (i === 8 && bar % 2 === 1) I.bell(t, tri[2] + 24, sx * 12, 0.1);
      return;
    }
    const boss = mood === 'boss', lv = boss ? 3 : S.intensity, dg = S.danger;
    const cut = 260 + lv * 260 + dg * 700 + (boss ? 500 : 0);
    // harmony bed
    if (i === 0) { I.pad(t, chord(root, q, 12), sx * 16, lv >= 2 ? 0.045 : 0.09, 600 + lv * 300); if (lv === 0) I.drone(t, root - 12, sx * 16, 0.11); }
    if (lv >= 3 && i === 0 && bar % 4 === 0) I.crash(t, 0.12);
    // ticking clock before the storm
    if (lv === 0 && i % 4 === 0) I.hat(t, i % 8 === 0 ? 0.12 : 0.07, false);
    // bass pulse
    if (lv >= 1) {
      const sixteenth = lv >= 3 || boss, on = sixteenth ? true : i % 2 === 0;
      if (on) { const oct = (boss && i % 4 === 3) || (!boss && lv >= 3 && i % 8 === 6) ? 12 : 0; I.bass(t, root - 12 + oct, sx * (sixteenth ? 0.9 : 1.8), 0.22, cut); }
    }
    // drums
    if (lv >= 1) I.hat(t, i % 4 === 2 ? 0.09 : 0.045, lv >= 3 && i % 4 === 2);
    if (lv >= 2) {
      if (boss ? [0, 3, 6, 8, 10, 12].includes(i) : i % 4 === 0) I.kick(t, 0.9);
      if (i === 4 || i === 12) I.snare(t, 0.32);
      if (boss && (i === 14 || i === 15)) I.snare(t, 0.14);
    }
    // arpeggio
    if (lv >= 2) I.arp(t, tri[0] + 12 + ARP[i], sx * 0.95, boss ? 0.05 : 0.045, 900 + lv * 500 + dg * 800);
    // lead melody
    if (lv >= 3) {
      const mel = (boss ? BOSS_MEL : BATTLE_MEL)[bar % 4];
      for (const [s, m, l] of mel) if (s === i) I.lead(t, boss ? m : m, sx * l * 0.95, boss ? 0.06 : 0.05);
    }
    if (boss && [0, 3, 6, 10].includes(i)) I.stab(t, chord(root, q, 12), 0.07);
    if (boss && i === 0 && bar % 4 === 3) I.riser(t, sx * 16, 0.1);
    // heartbeat when foes close in on the reactor
    if (dg > 0.35) { const every = dg > 0.75 ? 4 : 8; if (i % every === 0) I.heart(t, 0.25 + dg * 0.3); }
  }

  function tick() {
    if (!ctx) return;
    const ahead = ctx.currentTime + 0.15;
    if (!musicOn || ctx.state !== 'running') { S.next = ctx.currentTime + 0.05; return; }
    if (S.next < ctx.currentTime - 0.2) S.next = ctx.currentTime + 0.05;
    while (S.next < ahead) {
      if (S.step % 16 === 0 && S.pendingMood) { S.mood = S.pendingMood; S.pendingMood = null; S.bpm = BPM[S.mood]; S.step = 0; }
      if (S.step % 4 === 0) S.intensity = S.wantIntensity;
      scheduleStep(S.step, S.next);
      S.next += 60 / S.bpm / 4; S.step++;
    }
  }

  function sting(win) {
    if (!ctx || !musicOn) return;
    const t = ctx.currentTime + 0.05;
    if (win) {
      I.pad(t, [62, 66, 69, 74], 3.2, 0.06, 1800); I.drone(t, 38, 3.2, 0.06); I.crash(t, 0.15); I.kick(t, 0.9);
      [[0, 69], [0.18, 74], [0.36, 78], [0.54, 81], [0.9, 86]].forEach(([d, m]) => I.lead(t + d, m, d === 0.9 ? 1.6 : 0.2, 0.06));
      [0, 0.18, 0.36, 0.54].forEach(d => I.snare(t + d, 0.2));
    } else {
      I.pad(t, [50, 53, 56], 3.4, 0.06, 500); I.drone(t, 26, 3.4, 0.07); I.heart(t, 0.5); I.heart(t + 0.9, 0.35);
      [[0, 69], [0.5, 67], [1.0, 65], [1.5, 61]].forEach(([d, m]) => I.bell(t + d, m, 1.5, 0.08));
    }
    S.sting = t + 3.6; S.pendingMood = 'story';
  }

  /* ---------- sound effects ---------- */
  function tone(freq, dur, type, vol, when, slide) {
    if (!ctx) return; const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  let lastShot = 0;
  const SFX = {
    deploy: () => { tone(330, .12, 'triangle', .2); tone(495, .16, 'triangle', .18, .07); },
    retreat: () => tone(420, .18, 'triangle', .16, 0, 200),
    shoot: () => tone(880, .07, 'square', .05, 0, 420),
    slash: () => tone(220, .09, 'sawtooth', .08, 0, 90),
    zap: () => { tone(160, .2, 'sawtooth', .09, 0, 700); tone(1200, .12, 'square', .05, .02, 300); },
    heal: () => { tone(660, .2, 'sine', .12); tone(880, .24, 'sine', .1, .08); },
    ping: () => tone(1320, .25, 'sine', .08, 0, 900),
    hit: () => tone(140, .06, 'square', .05, 0, 80),
    pop: () => tone(300, .12, 'triangle', .1, 0, 700),
    skill: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, .16, 'triangle', .14, i * .06)); },
    leak: () => { tone(110, .35, 'sawtooth', .18, 0, 55); },
    wave: () => { tone(196, .5, 'sawtooth', .12); tone(294, .5, 'sawtooth', .09, .02); },
    boss: () => { tone(98, .9, 'sawtooth', .18, 0, 70); tone(147, .9, 'square', .08, .05); },
    click: () => tone(600, .06, 'triangle', .1),
    deny: () => tone(150, .15, 'square', .08, 0, 110),
    promote: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, .12, 'triangle', .13, i * .05)); },
    win: () => { if (!musicOn) [523, 659, 784, 1047].forEach((f, i) => tone(f, .24, 'triangle', .17, i * .12)); sting(true); },
    lose: () => { if (!musicOn) [392, 349, 311, 262].forEach((f, i) => tone(f, .4, 'sawtooth', .12, i * .22)); sting(false); },
    type: () => tone(520 + Math.random() * 120, .03, 'square', .025),
    door: () => { tone(90, .22, 'sawtooth', .16, 0, 50); tone(1400, .05, 'square', .05, .16); tone(70, .12, 'square', .12, .18, 40); },
    alarm: () => { [0, .32, .64].forEach(d => { tone(880, .16, 'square', .07, d); tone(660, .16, 'square', .07, d + .16); }); },
    fix: () => tone(740, .07, 'square', .07, 0, 980),
    fixed: () => { [659, 880, 1175].forEach((f, i) => tone(f, .14, 'triangle', .14, i * .07)); },
    build: () => { tone(300, .06, 'square', .07); tone(420, .06, 'square', .07, .09); tone(520, .1, 'triangle', .09, .18); },
    shield: () => { tone(880, .18, 'sine', .08, 0, 1320); tone(1320, .14, 'sine', .05, .06, 1760); },
    bubble: () => tone(1500, .08, 'sine', .09, 0, 500),
    boom: () => { tone(80, .45, 'sawtooth', .2, 0, 30); tone(160, .2, 'square', .1, 0, 50); },
    drill: () => { tone(110, .6, 'sawtooth', .1, 0, 180); tone(55, .6, 'square', .08, .05, 90); },
    medal: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .18, 'triangle', .13, i * .08)); },
    bossIntro: () => { tone(98, 1.1, 'sawtooth', .16, 0, 49); tone(147, 1.1, 'square', .07, .1, 73); tone(1568, .4, 'sine', .05, .5, 784); }
  };
  const THROTTLE = { bubble: 0.08, boom: 0.1, build: 0.2, fix: 0.05, shoot: 0.06, hit: 0.05, slash: 0.07, zap: 0.08, ping: 0.08, heal: 0.1, pop: 0.04 };
  const lastAt = {};

  return {
    ensure,
    /** a short 'talking' blip for story dialogue; pitch per speaker */
    voice(pitch) {
      if (!sfxOn || !ensure()) return; const now = ctx.currentTime; if (now - (lastAt.voice || 0) < 0.055) return; lastAt.voice = now;
      try { tone(pitch * (0.9 + Math.random() * 0.25), .045, 'square', .03); } catch (e) { }
    },
    play(n) {
      if (n === 'win' || n === 'lose') { if (ensure()) SFX[n](); return; }
      if (!sfxOn || !ensure() || !SFX[n]) return;
      const gap = THROTTLE[n]; if (gap) { const now = ctx.currentTime; if (now - (lastAt[n] || 0) < gap) return; lastAt[n] = now; }
      try { SFX[n](); } catch (e) { }
    },
    setSfx(v) { sfxOn = !!v; },
    setMusic(v) { musicOn = !!v; if (musicBus) musicBus.gain.setTargetAtTime(musicOn ? 0.55 : 0, ctx.currentTime, 0.1); },
    /** 'title' | 'story' | 'battle' | 'boss' (numbers kept for older callers: 0 title, 1 battle, 2 battle at full intensity) */
    mood(m) {
      if (m === 0) m = 'title'; else if (m === 1) m = 'battle'; else if (m === 2) { m = 'battle'; S.wantIntensity = 3; }
      if (!BPM[m]) return;
      if (m === 'battle' && S.mood !== 'battle' && S.pendingMood !== 'battle') S.wantIntensity = 0;
      if (S.mood === m) { S.pendingMood = null; return; }
      if (!ctx || ctx.state !== 'running' || S.step === 0) { S.mood = m; S.pendingMood = null; S.bpm = BPM[m]; S.step = 0; S.sting = 0; }
      else { S.pendingMood = m; if (S.sting) S.sting = 0; }
    },
    /** battle layering, 0..3 */
    intensity(n) { S.wantIntensity = Math.max(0, Math.min(3, n | 0)); },
    /** 0..1, how close the nearest foe is to the reactor (adds a heartbeat) */
    danger(x) { S.danger = Math.max(0, Math.min(1, x || 0)); },
    startMusic() { if (!ensure() || timer) return; S.next = ctx.currentTime + 0.1; timer = setInterval(tick, 25); },
    stopMusic() { clearInterval(timer); timer = 0; },
    /** Dev/test helper: render a mood offline to an AudioBuffer (does not touch the live context). */
    preview(mood, intensity, danger, seconds) {
      const saved = { ctx, master, comp, musicBus, sfxBus, verb, verbIn, dly, noiseBuf, S: Object.assign({}, S), musicOn };
      const off = new OfflineAudioContext(2, Math.floor(44100 * seconds), 44100);
      build(off); musicOn = true; musicBus.gain.value = 0.55;
      Object.assign(S, { mood, pendingMood: null, bpm: BPM[mood], step: 0, next: 0.05, intensity, wantIntensity: intensity, danger: danger || 0, sting: 0 });
      while (S.next < seconds - 0.5) { scheduleStep(S.step, S.next); S.next += 60 / S.bpm / 4; S.step++; }
      const restore = () => { ({ ctx, master, comp, musicBus, sfxBus, verb, verbIn, dly, noiseBuf, musicOn } = saved); Object.assign(S, saved.S); };
      return off.startRendering().then(b => { restore(); return b; }, e => { restore(); throw e; });
    },
    state: () => ({ mood: S.mood, pending: S.pendingMood, intensity: S.intensity, danger: S.danger, bpm: S.bpm })
  };
})();
