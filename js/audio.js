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
  let ctx = null, master, comp, musicBus, sfxBus, verb, verbIn, dly, noiseBuf, duckG, mfilt, sfxVerb;
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
    // music → duck (dips under big hits) → muffle (low-pass while paused) → master
    duckG = ctx.createGain(); mfilt = ctx.createBiquadFilter(); mfilt.type = 'lowpass'; mfilt.frequency.value = 20000; mfilt.Q.value = 0.5;
    duckG.connect(mfilt); mfilt.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.55 : 0; musicBus.connect(duckG);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1.1; sfxBus.connect(master);
    // a short, bright room for sound effects (separate from the music's long hall)
    sfxVerb = ctx.createConvolver(); { const n = Math.floor(ctx.sampleRate * 0.9), b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4); } sfxVerb.buffer = b; }
    const sv = ctx.createGain(); sv.gain.value = 0.55; sfxVerb.connect(sv); sv.connect(sfxBus);
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

  /* ---------- sound effects ----------
     Every effect is a few layers — a noise transient for the 'hit', a pitched body,
     sometimes a low thump — panned to where it happened, with a touch of room.
     Each play is nudged a little in pitch so rapid repeats don't sound robotic. */
  let V = 1, PAN = 0, live = 0, muffled = false;
  function dest(wet) {
    let out = sfxBus;
    const head = ctx.createGain();
    if (PAN && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = PAN; head.connect(p); p.connect(sfxBus); out = p; }
    else head.connect(sfxBus);
    if (wet) { const g = ctx.createGain(); g.gain.value = wet; out.connect(g); g.connect(sfxVerb); }
    return head;
  }
  /** pitched layer: f → f2 over dur (or P.slide seconds) */
  function osc(when, f, f2, dur, type, vol, P) {
    P = P || {}; const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f * V, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * V), t + (P.slide || dur));
    if (P.det) o.detune.value = P.det;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (P.a || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o; if (P.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = P.lp; fl.Q.value = P.q || 0.8; o.connect(fl); n = fl; }
    n.connect(g); g.connect(dest(P.wet)); o.start(t); o.stop(t + dur + 0.05);
  }
  /** noise layer through a sweeping filter */
  function nz(when, dur, vol, ftype, f, f2, q, wet) {
    const t = ctx.currentTime + (when || 0), n = noise(t, dur), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    fl.type = ftype; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q || 0.8;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(fl); fl.connect(g); g.connect(dest(wet));
  }
  /** music dips out of the way of a big moment, then swells back */
  function duck(depth, hold) {
    if (!duckG) return; const t = ctx.currentTime, gn = duckG.gain;
    gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t); gn.setTargetAtTime(1 - depth, t, 0.02); gn.setTargetAtTime(1, t + hold, 0.3);
  }
  const arp = (notes, gap, type, vol, len, wet, when) => notes.forEach((f, i) => osc((when || 0) + i * gap, f, 0, len, type, vol, { wet }));
  // kept for the alarm, which wants a plain beep
  function tone(freq, dur, type, vol, when, slide) { osc(when, freq, slide, dur, type, vol || 0.15, { a: 0.012 }); }

  const SFX = {
    deploy: () => { nz(0, .12, .2, 'lowpass', 900, 150); osc(0, 150, 55, .16, 'sine', .3); osc(.05, 520, 0, .1, 'triangle', .1, { wet: .2 }); osc(.11, 780, 0, .14, 'triangle', .09, { wet: .3 }); },
    retreat: () => { nz(0, .28, .12, 'bandpass', 2400, 400, 1.2); osc(0, 520, 240, .22, 'triangle', .1); },
    shoot: () => { nz(0, .03, .07, 'highpass', 3500); osc(0, 1500, 320, .07, 'square', .04, { lp: 4000 }); osc(0, 190, 80, .05, 'sine', .12); },
    cannon: () => { nz(0, .28, .26, 'lowpass', 1600, 180, 1, .25); osc(0, 130, 38, .26, 'sine', .34); osc(0, 640, 110, .09, 'square', .05, { lp: 2500 }); duck(.18, .1); },
    hit: () => { nz(0, .04, .13, 'bandpass', 2600, 1200, 1.4); osc(0, 320, 120, .05, 'sine', .1); },
    hitBig: () => { nz(0, .12, .18, 'bandpass', 1400, 400, 1); osc(0, 170, 48, .15, 'sine', .22); },
    slash: () => { nz(0, .1, .2, 'bandpass', 4200, 1100, 1.6); osc(0, 260, 110, .07, 'triangle', .07); },
    thump: () => { osc(0, 115, 42, .16, 'sine', .28); nz(0, .07, .14, 'lowpass', 700, 200); },
    zap: () => { osc(0, 170, 950, .14, 'sawtooth', .07, { lp: 3200 }); nz(0, .14, .08, 'highpass', 4500, 0, 0.8, .2); osc(.02, 1700, 380, .1, 'square', .035); },
    ping: () => { osc(0, 1320, 1150, .38, 'sine', .1, { wet: .55 }); osc(0, 1980, 0, .18, 'sine', .022, { wet: .4 }); },
    heal: () => { osc(0, 660, 0, .24, 'sine', .08, { a: .02, wet: .45 }); osc(.07, 990, 0, .26, 'sine', .06, { a: .02, wet: .55 }); nz(0, .25, .015, 'highpass', 7000, 0, 0.7, .5); },
    pop: () => { osc(0, 420, 1250, .08, 'sine', .14); nz(0, .05, .06, 'bandpass', 1900, 0, 1.4); osc(.05, 900, 0, .05, 'triangle', .035); },
    popBig: () => { osc(0, 240, 720, .14, 'sine', .16); nz(0, .22, .2, 'lowpass', 1200, 160); osc(0, 95, 38, .22, 'sine', .3); duck(.15, .1); },
    bossDown: () => { nz(0, 1.3, .36, 'lowpass', 2600, 90, 1, .5); osc(0, 85, 28, 1, 'sine', .45); osc(.02, 170, 40, .5, 'sawtooth', .07, { lp: 900 }); arp([523, 659, 784, 1047], .09, 'triangle', .1, .5, .5, .2); duck(.75, .9); },
    skill: () => { nz(0, .32, .06, 'bandpass', 500, 4500, 2); osc(0, 90, 45, .2, 'sine', .22); arp([523, 659, 784, 1047], .055, 'triangle', .09, .2, .4, .05); duck(.3, .3); },
    leak: () => { osc(0, 230, 105, .42, 'sawtooth', .13, { lp: 1100 }); osc(0, 72, 36, .4, 'sine', .32); nz(0, .3, .1, 'lowpass', 500, 120); duck(.45, .35); },
    // horn + a snare roll that builds into the wave
    wave: () => { osc(0, 196, 0, .6, 'sawtooth', .09, { lp: 1500, a: .04 }); osc(.01, 294, 0, .6, 'sawtooth', .07, { lp: 1500, a: .04 });
      [0, .08, .15, .21, .26, .3, .34].forEach((d, i) => { nz(d, .07, .05 + i * .018, 'bandpass', 1900, 0, .8); osc(d, 210 - i * 10, 120, .06, 'triangle', .04 + i * .01); }); },
    boss: () => { osc(0, 73, 0, 1.1, 'sawtooth', .14, { lp: 600, a: .08 }); osc(.05, 110, 0, 1, 'sawtooth', .09, { lp: 700, a: .08 }); nz(0, 1.1, .18, 'lowpass', 260, 60); duck(.5, .8); },
    click: () => { osc(0, 920, 700, .045, 'triangle', .13); nz(0, .012, .05, 'highpass', 6000); },
    deny: () => { osc(0, 230, 0, .07, 'square', .06, { lp: 1600 }); osc(.09, 175, 0, .1, 'square', .06, { lp: 1600 }); },
    promote: () => { arp([523, 659, 784, 1047, 1319], .05, 'triangle', .1, .2, .4); nz(.05, .4, .02, 'highpass', 8000, 0, 0.7, .6); osc(0, 110, 55, .15, 'sine', .15); },
    win: () => { if (!musicOn) [523, 659, 784, 1047].forEach((f, i) => tone(f, .24, 'triangle', .17, i * .12)); sting(true); },
    lose: () => { if (!musicOn) [392, 349, 311, 262].forEach((f, i) => tone(f, .4, 'sawtooth', .12, i * .22)); sting(false); },
    type: () => osc(0, 520 + Math.random() * 120, 0, .03, 'square', .02),
    door: () => { nz(0, .22, .26, 'lowpass', 3200, 260); osc(0, 92, 44, .26, 'sine', .32); osc(.17, 1400, 0, .035, 'square', .04); nz(.02, .1, .05, 'bandpass', 5200, 0, 2, .3); duck(.2, .15); },
    alarm: () => { [0, .32, .64].forEach(d => { tone(880, .16, 'square', .07, d); tone(660, .16, 'square', .07, d + .16); }); },
    fix: () => { osc(0, 740, 980, .07, 'square', .08, { lp: 3000 }); nz(0, .02, .04, 'highpass', 5000); },
    fixed: () => { arp([659, 880, 1175], .07, 'triangle', .12, .16, .4); },
    build: () => { [0, .1, .2].forEach((d, i) => { nz(d, .035, .1, 'bandpass', 2600 + i * 300, 0, 2); osc(d, 820 + i * 120, 0, .04, 'square', .03); osc(d, 160, 70, .06, 'sine', .08); }); },
    shield: () => { osc(0, 600, 1250, .26, 'sine', .07, { wet: .5 }); osc(.05, 900, 1800, .2, 'sine', .04, { wet: .5 }); },
    bubble: () => { osc(0, 420, 1700, .07, 'sine', .11); nz(0, .03, .05, 'highpass', 4000); },
    boom: () => { nz(0, .75, .36, 'lowpass', 3200, 140, 1, .3); osc(0, 105, 34, .6, 'sine', .38); duck(.45, .4); },
    down: () => { osc(0, 420, 150, .38, 'triangle', .1); osc(.02, 210, 75, .38, 'triangle', .07); nz(0, .22, .1, 'lowpass', 800, 150); duck(.3, .4); },
    drill: () => { osc(0, 110, 180, .6, 'sawtooth', .09, { lp: 900 }); osc(.05, 55, 90, .6, 'square', .06, { lp: 500 }); nz(0, .6, .1, 'bandpass', 900, 300, 2); },
    medal: () => { arp([784, 988, 1175, 1568], .08, 'triangle', .12, .2, .45); nz(.1, .5, .02, 'highpass', 8000, 0, 0.7, .6); },
    combo: () => { arp([784, 1175], .06, 'triangle', .12, .14, .45); osc(.08, 1568, 1760, .12, 'sine', .05, { wet: .6 }); nz(.06, .3, .02, 'highpass', 7000, 0, 0.7, .6); },
    song: () => { arp([392, 494, 587, 784], .07, 'sine', .1, .3, .6); osc(0, 196, 0, .5, 'triangle', .07, { wet: .4, a: .04 }); duck(.25, .4); },
    bossIntro: () => { osc(0, 98, 49, 1.1, 'sawtooth', .14, { lp: 700 }); osc(.1, 147, 73, 1.1, 'square', .06, { lp: 700 }); osc(.5, 1568, 784, .4, 'sine', .05, { wet: .6 }); nz(0, 1.2, .16, 'lowpass', 220, 60); duck(.5, 1); }
  };
  const THROTTLE = { bubble: 0.08, boom: 0.1, build: 0.2, fix: 0.05, shoot: 0.06, hit: 0.045, hitBig: 0.06, slash: 0.07, thump: 0.08, zap: 0.08, ping: 0.08, heal: 0.1, pop: 0.04, popBig: 0.06, cannon: 0.08, combo: 0.15 };
  // busy moments: the small, frequent sounds drop out first so the big ones stay clear
  const CHEAP = new Set(['shoot', 'hit', 'slash', 'thump', 'ping', 'pop', 'heal', 'zap', 'type']);
  const lastAt = {};

  /* ---------- voices: little formant 'babble' so each crewmate sounds like someone ---------- */
  const VOWELS = [[730, 1090], [270, 2290], [530, 1840], [570, 840], [300, 870], [660, 1720]];
  function syllable(when, pitch, len, vol) {
    const t = ctx.currentTime + when, [f1, f2] = VOWELS[(Math.random() * VOWELS.length) | 0];
    const o = ctx.createOscillator(), g = ctx.createGain(), mix = ctx.createGain(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(pitch * 1.08, t); o.frequency.exponentialRampToValueAtTime(pitch * 0.94, t + len);
    for (const [f, q, a] of [[f1, 6, 1], [f2, 9, 0.6]]) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = ctx.createGain(); bg.gain.value = a; o.connect(b); b.connect(bg); bg.connect(mix); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.setTargetAtTime(0.0001, t + len * 0.7, len * 0.25);
    mix.connect(g); g.connect(dest(0.12)); o.start(t); o.stop(t + len + 0.1);
  }
  return {
    ensure,
    /** a short 'talking' blip for story dialogue; pitch per speaker */
    voice(pitch) {
      if (!sfxOn || !ensure()) return; const now = ctx.currentTime; if (now - (lastAt.voice || 0) < 0.055) return; lastAt.voice = now;
      try { V = 1; PAN = 0; syllable(0, pitch * (0.92 + Math.random() * 0.2), 0.07, 0.11); } catch (e) { }
    },
    /** a short burst of radio chatter: n syllables with a natural rise and fall */
    chatter(pitch, n) {
      if (!sfxOn || !ensure()) return; V = 1; PAN = 0;
      try { let t = 0.05; for (let i = 0; i < n; i++) { const len = 0.055 + Math.random() * 0.05, contour = 1 + 0.12 * Math.sin(i / Math.max(1, n - 1) * Math.PI) - (i === n - 1 ? 0.1 : 0); syllable(t, pitch * contour * (0.95 + Math.random() * 0.1), len, 0.09); t += len + 0.02 + (Math.random() < 0.2 ? 0.06 : 0); } } catch (e) { }
    },
    /** a crewmate's battle cry when their skill fires ("hup-HA!") */
    bark(pitch, deep) {
      if (!sfxOn || !ensure()) return; V = 1; PAN = 0;
      try { const p = pitch * (deep ? 0.85 : 1); syllable(0.02, p * 0.95, 0.07, 0.13); syllable(0.12, p * 1.3, 0.16, 0.16); } catch (e) { }
    },
    /** pan: -1 (left) .. 1 (right) */
    play(n, pan) {
      if (n === 'win' || n === 'lose') { if (ensure()) { V = 1; PAN = 0; SFX[n](); } return; }
      if (!sfxOn || !ensure() || !SFX[n]) return;
      const now = ctx.currentTime, gap = THROTTLE[n]; if (gap) { if (now - (lastAt[n] || 0) < gap) return; lastAt[n] = now; }
      if (CHEAP.has(n) && live > 14) return;
      live++; setTimeout(() => { live--; }, 350);
      V = n === 'click' || n === 'type' ? 1 : 1 + (Math.random() - 0.5) * 0.1; PAN = pan || 0;
      try { SFX[n](); } catch (e) { }
    },
    /** low-pass the music (pause menu) */
    muffle(on) {
      on = !!on; if (on === muffled || !ctx || !mfilt) return; muffled = on;
      mfilt.frequency.setTargetAtTime(on ? 650 : 20000, ctx.currentTime, on ? 0.08 : 0.2);
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
      const saved = { ctx, master, comp, musicBus, sfxBus, verb, verbIn, dly, noiseBuf, duckG, mfilt, sfxVerb, S: Object.assign({}, S), musicOn };
      const off = new OfflineAudioContext(2, Math.floor(44100 * seconds), 44100);
      build(off); musicOn = true; musicBus.gain.value = 0.55;
      Object.assign(S, { mood, pendingMood: null, bpm: BPM[mood], step: 0, next: 0.05, intensity, wantIntensity: intensity, danger: danger || 0, sting: 0 });
      while (S.next < seconds - 0.5) { scheduleStep(S.step, S.next); S.next += 60 / S.bpm / 4; S.step++; }
      const restore = () => { ({ ctx, master, comp, musicBus, sfxBus, verb, verbIn, dly, noiseBuf, duckG, mfilt, sfxVerb, musicOn } = saved); Object.assign(S, saved.S); };
      return off.startRendering().then(b => { restore(); return b; }, e => { restore(); throw e; });
    },
    /** Dev/test helper: render one sound effect offline; resolves to its peak level (0 = silent). */
    previewSfx(n, pan) {
      const saved = { ctx, master, comp, musicBus, sfxBus, verb, verbIn, dly, noiseBuf, duckG, mfilt, sfxVerb, musicOn };
      const off = new OfflineAudioContext(2, 44100 * 2, 44100); build(off); musicOn = false; V = 1; PAN = pan || 0;
      const restore = () => { ({ ctx, master, comp, musicBus, sfxBus, verb, verbIn, dly, noiseBuf, duckG, mfilt, sfxVerb, musicOn } = saved); };
      try { if (n === 'chatter') { for (let i = 0; i < 4; i++) syllable(i * 0.09, 300, 0.07, 0.1); } else SFX[n](); } catch (e) { restore(); return Promise.reject(e); }
      return off.startRendering().then(b => { restore(); let pk = 0; for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); } return pk; }, e => { restore(); throw e; });
    },
    sfxNames: () => Object.keys(SFX),
    state: () => ({ mood: S.mood, pending: S.pendingMood, intensity: S.intensity, danger: S.danger, bpm: S.bpm })
  };
})();
