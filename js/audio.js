'use strict';
/* ============================================================
   Sound: synthesized SFX + an adaptive, original soundtrack.
   No audio files — everything is built live with Web Audio.

   Music moods:  'title' | 'story' | 'battle' | 'boss'
   In battle the music has layers that react to the fight:
     intensity 0 = calm before the wave (pads, ticking clock)
     intensity 1 = foes on the field (pulsing bass, hats)
     intensity 2 = pressure (kick that makes the pads 'breathe', 16th arps, tom fills)
     intensity 3 = all-out (lead melody, claps, open hats, crashes)
   danger (0..1) adds a heartbeat that speeds up as foes near the reactor.

   Mix:  music ─┐
         sfx ───┼─ glue compressor → rumble cut → de-harsh shelf → limiter → soft clip → out
         voice ─┘   (voices get their own warm filter; radio chatter a 'walkie-talkie' band)
   Reverbs are generated, stereo and damped (the tail darkens like a real room).

   Self-healing: the engine wakes itself on any tap/key after the phone suspends or
   interrupts audio, and a watchdog rebuilds the whole graph if the clock stalls or
   bad samples ever reach the output — so sound can't 'die' for the rest of a session.
   ============================================================ */
const Sound = (() => {
  let ctx = null, N = null;
  let sfxOn = true, musicOn = true, timer = 0, hooked = false, previewing = false;
  let lastCT = -1, stalls = 0, heals = 0, lastHeal = '', quietFor = 0, heard = false, silentHeals = [], bank = null, unlocked = false;
  const MUSIC_LV = 0.4;
  const S = { mood: 'title', pendingMood: null, bpm: 76, step: 0, next: 0, intensity: 0, wantIntensity: 0, danger: 0, sting: 0 };
  const quiet = p => { if (p && p.catch) p.catch(() => { }); };
  const Ctor = () => window.AudioContext || window.webkitAudioContext;

  /* ---------- lifecycle ---------- */
  function fresh() {
    const A = Ctor(); if (!A) return null;
    try { return new A({ latencyHint: 'interactive' }); } catch (e) { try { return new A(); } catch (e2) { return null; } }
  }
  function ensure() {
    if (previewing) return ctx;
    if (ctx && ctx.state === 'closed') { ctx = null; N = null; }
    if (!ctx) { const c = fresh(); if (!c) return null; build(c); S.next = ctx.currentTime + 0.1; hook(); }
    wake(); unlock(); return ctx;
  }
  /** resume from 'suspended' (autoplay rules, our own pause) or iOS's 'interrupted' (calls, Siri, lock screen) */
  function wake() {
    if (!ctx || previewing || document.hidden) return;
    if (ctx.state !== 'running' && ctx.state !== 'closed') { try { quiet(ctx.resume()); } catch (e) { } }
  }
  function hook() {
    if (hooked) return; hooked = true;
    document.addEventListener('visibilitychange', () => {
      if (!ctx || previewing) return;
      if (document.hidden) { try { if (ctx.state === 'running') quiet(ctx.suspend()); } catch (e) { } }
      else wake();
    });
    // browsers only let audio start inside a gesture: every tap/key is a chance to wake it
    const nudge = () => { if (!ctx || previewing) return; if (ctx.state === 'closed') ensure(); else { wake(); unlock(); } };
    for (const ev of ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'keydown']) window.addEventListener(ev, nudge, { capture: true, passive: true });
    window.addEventListener('pageshow', nudge); window.addEventListener('focus', nudge);
    setInterval(watchdog, 1000);
  }
  /** iPhone/iPad: playing a tiny silent buffer inside a tap 'unlocks' a context; 'playback' makes it a
      media session, so it isn't cut by the ring/silent switch or dropped as easily by the system */
  function unlock() {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { }
    if (unlocked || !ctx || ctx.state !== 'running') return;
    try { const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); b.connect(ctx.destination); b.start(0); unlocked = true; } catch (e) { }
  }
  const probeBuf = new Float32Array(2048);
  function watchdog() {
    if (!ctx || !N || previewing) return;
    if (document.hidden || ctx.state !== 'running') { stalls = 0; lastCT = -1; wake(); return; }
    const ct = ctx.currentTime;
    if (ct === lastCT) { if (++stalls >= 3) { heal('the audio clock stopped'); return; } } else stalls = 0;
    lastCT = ct;
    try {
      N.probe.getFloatTimeDomainData(probeBuf); let mx = 0, mn = 0;
      for (let i = 0; i < probeBuf.length; i += 2) { const v = probeBuf[i]; if (v !== v || v > 4 || v < -4) { heal('bad samples'); return; } if (v > mx) mx = v; if (v < mn) mn = v; }
      // a dead graph (a filter that blew up somewhere upstream, a stuck output) goes flat. The music always
      // has something sounding, so seconds of flat output while it plays means the sound has died: rebuild.
      const flat = mx - mn < 1e-6;
      if (!flat) { heard = true; quietFor = 0; }
      else if (heard && musicOn && timer && ++quietFor >= 3) {
        const now = Date.now(); silentHeals = silentHeals.filter(x => now - x < 60000);
        if (silentHeals.length < 3) { silentHeals.push(now); heal('the sound went silent'); }
        quietFor = 0;
      }
    } catch (e) { }
  }
  /** throw the whole graph away and start clean; the music picks up where it was */
  function heal(why) {
    heals++; lastHeal = why; const old = ctx; ctx = null; N = null; stalls = 0; lastCT = -1; quietFor = 0; heard = false; unlocked = false; bank = null;
    try { quiet(old.close()); } catch (e) { }
    const c = fresh(); if (!c) return; build(c); S.next = ctx.currentTime + 0.1; S.sting = 0; wake(); unlock();
  }

  /* ---------- graph ---------- */
  function biq(type, f, q, gain) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (gain != null) b.gain.value = gain; return b; }
  function gainNode(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function comp(th, knee, ratio, att, rel) { const c = ctx.createDynamicsCompressor(); c.threshold.value = th; c.knee.value = knee; c.ratio.value = ratio; c.attack.value = att; c.release.value = rel; return c; }
  /** unity up to 0.7, then a smooth shoulder that never passes 1 — no harsh digital clipping */
  function softCurve() {
    const n = 4096, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1, a = Math.abs(x); c[i] = Math.sign(x) * (a < 0.7 ? a : 0.7 + 0.3 * Math.tanh((a - 0.7) / 0.3)); }
    return c;
  }
  /** stereo impulse response: a few early reflections, then a tail that gets darker as it fades */
  function makeIR(sec, pre, bright) {
    const sr = ctx.sampleRate, p0 = Math.floor(sr * pre), len = p0 + Math.floor(sr * sec), b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let k = 0; k < 7; k++) { const at = p0 + Math.floor(sr * (0.003 + Math.random() * 0.05)); if (at < len) d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.5 - k * 0.05); }
      for (let i = p0; i < len; i++) {
        const x = (i - p0) / sr, a = bright * Math.exp(-x * 3 / sec) + 0.04;
        lp += a * ((Math.random() * 2 - 1) - lp);
        d[i] += lp * Math.exp(-6.9 * x / sec);
      }
    }
    return b;
  }
  function build(c) {
    ctx = c; const n = N = {}, sr = ctx.sampleRate;
    // master chain
    n.master = gainNode(0.6);
    const glue = comp(-20, 10, 2.5, 0.012, 0.25), rumble = biq('highpass', 28, 0.7), shelf = biq('highshelf', 8500, 0.7, -3.5);
    const lim = comp(-3, 0, 20, 0.001, 0.09), clip = ctx.createWaveShaper(); clip.curve = softCurve(); clip.oversample = '4x';
    n.probe = ctx.createAnalyser(); n.probe.fftSize = 2048;
    n.master.connect(glue); glue.connect(rumble); rumble.connect(shelf); shelf.connect(lim); lim.connect(clip); clip.connect(n.probe); n.probe.connect(ctx.destination);
    // music → duck (dips under big hits) → muffle (low-pass while paused) → master
    n.duckG = gainNode(1); n.mfilt = biq('lowpass', Math.min(20000, sr * 0.45), 0.5);
    n.duckG.connect(n.mfilt); n.mfilt.connect(n.master);
    n.musicBus = gainNode(musicOn ? MUSIC_LV : 0); n.musicBus.connect(n.duckG);
    n.pump = gainNode(1); n.pump.connect(n.musicBus); // pads/arps 'breathe' with the kick
    // hall reverb for music (low end kept out so it stays clear)
    n.verbIn = gainNode(0.8); const vhp = biq('highpass', 220, 0.7), verb = ctx.createConvolver(); verb.buffer = makeIR(2.4, 0.025, 0.45);
    n.verbIn.connect(vhp); vhp.connect(verb); verb.connect(n.musicBus);
    // stereo ping-pong delay, timed to the beat
    n.dlyIn = gainNode(1); n.dl = ctx.createDelay(2); n.dr = ctx.createDelay(2);
    const fl = gainNode(0.34), fr = gainNode(0.34), ll = biq('lowpass', 2800, 0.6), lr = biq('lowpass', 2400, 0.6), mrg = ctx.createChannelMerger(2), dOut = gainNode(0.45);
    n.dlyIn.connect(n.dl); n.dl.connect(ll); ll.connect(fl); fl.connect(n.dr); n.dr.connect(lr); lr.connect(fr); fr.connect(n.dl);
    ll.connect(mrg, 0, 0); lr.connect(mrg, 0, 1); mrg.connect(dOut); dOut.connect(n.musicBus); dOut.connect(n.verbIn);
    setTempo(true);
    // sound effects + a short, bright room
    n.sfxBus = gainNode(1.05); n.sfxBus.connect(n.master);
    n.sfxVerb = ctx.createConvolver(); n.sfxVerb.buffer = makeIR(0.7, 0.006, 0.6); const sv = gainNode(0.5); n.sfxVerb.connect(sv); sv.connect(n.sfxBus);
    // voices: warm, rounded top end so no speaker is ever shrill
    n.voiceBus = gainNode(1); const vlp = biq('lowpass', 3400, 0.5), vpk = biq('peaking', 1800, 0.9, -2.5);
    n.voiceBus.connect(vpk); vpk.connect(vlp); vlp.connect(n.sfxBus);
    // radio chatter: a walkie-talkie band with a little grit
    n.radioBus = gainNode(1); const rhp = biq('highpass', 380, 0.7), rlp = biq('lowpass', 3000, 0.7), rpk = biq('peaking', 1400, 1, 4), grit = ctx.createWaveShaper();
    { const k = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 1023 * 2 - 1; k[i] = Math.tanh(x * 1.8) / Math.tanh(1.8); } grit.curve = k; }
    n.radioBus.connect(rhp); rhp.connect(rpk); rpk.connect(grit); grit.connect(rlp); rlp.connect(n.sfxBus);
    // noise sources
    n.noise = ctx.createBuffer(1, sr * 2, sr); { const d = n.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    n.pink = ctx.createBuffer(1, sr * 2, sr);
    { const d = n.pink.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; } }
    if (!(c instanceof (window.OfflineAudioContext || window.webkitOfflineAudioContext || Object))) makeBank(c);
  }
  function setTempo(now) {
    if (!N) return; const d = 60 / S.bpm * 0.75, t = ctx.currentTime;
    for (const x of [N.dl, N.dr]) { if (now) x.delayTime.value = d; else x.delayTime.setTargetAtTime(d, t, 0.05); }
  }

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t, a, peak, d, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(sus, t + a, d); g.gain.setTargetAtTime(0.0001, end, rel);
  }
  /** route a music voice: dry level, reverb send, delay send, stereo position, through the kick 'pump' */
  function out(node, dry, wet, dl, pan, pump) {
    let src = node;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); src = p; }
    if (dry) { const g = gainNode(dry); src.connect(g); g.connect(pump ? N.pump : N.musicBus); }
    if (wet) { const g = gainNode(wet); src.connect(g); g.connect(N.verbIn); }
    if (dl) { const g = gainNode(dl); src.connect(g); g.connect(N.dlyIn); }
  }
  function noise(t, dur, pink) { const s = ctx.createBufferSource(); s.buffer = pink ? N.pink : N.noise; s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05); return s; }
  function oscAt(type, f, t, end, det) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.start(t); o.stop(end); return o; }

  /* ---------- instruments ---------- */
  const I = {
    kick(t, v) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.07); o.frequency.exponentialRampToValueAtTime(41, t + 0.3);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      o.connect(g); out(g, 1); o.start(t); o.stop(t + 0.6);
      const c = noise(t, 0.02), cg = ctx.createGain(), bp = biq('bandpass', 3400, 0.8);
      cg.gain.setValueAtTime(v * 0.22, t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.018); c.connect(bp); bp.connect(cg); out(cg, 1);
      const pg = N.pump.gain; pg.setTargetAtTime(0.42, t, 0.004); pg.setTargetAtTime(1, t + 0.035, 0.075);
    },
    snare(t, v) {
      const n = noise(t, 0.3), hp = biq('highpass', 1100, 0.7), pk = biq('peaking', 5200, 1, 4), g = ctx.createGain();
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.21); n.connect(hp); hp.connect(pk); pk.connect(g); out(g, 0.7, 0.4);
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(215, t); o.frequency.exponentialRampToValueAtTime(155, t + 0.06);
      og.gain.setValueAtTime(v * 0.7, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.11); o.connect(og); out(og, 1, 0.15); o.start(t); o.stop(t + 0.14);
    },
    clap(t, v) {
      const g = ctx.createGain(), bp = biq('bandpass', 1500, 1.1), n = noise(t, 0.3);
      g.gain.setValueAtTime(0.0001, t);
      for (const d of [0, 0.011, 0.023]) { g.gain.setValueAtTime(v, t + d); g.gain.exponentialRampToValueAtTime(v * 0.15, t + d + 0.009); }
      g.gain.setValueAtTime(v * 0.7, t + 0.034); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      n.connect(bp); bp.connect(g); out(g, 0.6, 0.6, 0, 0.1);
    },
    hat(t, v, open, pan) {
      const n = noise(t, open ? 0.32 : 0.06), hp = biq('highpass', 7200, 0.7), pk = biq('peaking', 10500, 1.2, 5), g = ctx.createGain();
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.3 : 0.04)); n.connect(hp); hp.connect(pk); pk.connect(g); out(g, 0.65, 0.12, 0, pan);
    },
    crash(t, v) {
      for (const pan of [-0.4, 0.4]) {
        const n = noise(t, 2.2), hp = biq('highpass', 3800, 0.6), g = ctx.createGain();
        g.gain.setValueAtTime(v * 0.75, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2); n.connect(hp); hp.connect(g); out(g, 0.55, 0.5, 0, pan);
      }
    },
    tom(t, m, v, pan) {
      const f = mtof(m), o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.7, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(g); out(g, 1, 0.3, 0, pan); o.start(t); o.stop(t + 0.35);
      const n = noise(t, 0.04), lp = biq('lowpass', 2500, 0.7), ng = ctx.createGain(); ng.gain.setValueAtTime(v * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); n.connect(lp); lp.connect(ng); out(ng, 1, 0, 0, pan);
    },
    bass(t, m, dur, v, cut) {
      const g = ctx.createGain(), f = biq('lowpass', cut * 2.2, 6);
      f.frequency.setValueAtTime(cut * 2.2, t); f.frequency.exponentialRampToValueAtTime(Math.max(80, cut * 0.5), t + dur * 0.9);
      for (const det of [-9, 9]) oscAt('sawtooth', mtof(m), t, t + dur + 0.1, det).connect(f);
      const sg = gainNode(0.85); oscAt('sine', mtof(m - 12), t, t + dur + 0.1).connect(sg); sg.connect(g);
      env(g, t, 0.005, v, dur * 0.4, v * 0.5, 0.03, t + dur); f.connect(g); out(g, 1);
    },
    /** wide supersaw pad: two detuned halves, one per side, each with a slowly drifting filter */
    pad(t, notes, dur, v, bright, att) {
      bright = bright || 900;
      for (const side of [-0.55, 0.55]) {
        const g = ctx.createGain(), f = biq('lowpass', bright, 0.9), end = t + dur + 1.8;
        const lfo = oscAt('sine', 0.12 + Math.random() * 0.12, t, end), lg = gainNode(bright * 0.22); lfo.connect(lg); lg.connect(f.frequency);
        for (const m of notes) oscAt('sawtooth', mtof(m), t, end, side * 18 + (Math.random() - 0.5) * 6).connect(f);
        env(g, t, att || Math.min(1.2, dur * 0.4), v * 0.85, 0.6, v * 0.7, 0.5, t + dur); f.connect(g); out(g, 0.55, 0.75, 0, side, true);
      }
    },
    arp(t, m, dur, v, cut, pan) {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = biq('lowpass', cut, 4); o.type = 'square'; o.frequency.value = mtof(m);
      f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(300, t + dur);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(f); f.connect(g); out(g, 0.65, 0.2, 0.35, pan, true); o.start(t); o.stop(t + dur + 0.05);
    },
    lead(t, m, dur, v) {
      const g = ctx.createGain(), f = biq('lowpass', 2300, 1.5);
      const lfo = oscAt('sine', 5.3, t, t + dur + 0.4), lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(13, t + Math.min(0.4, dur)); lfo.connect(lg);
      for (const [type, det] of [['sawtooth', -7], ['sawtooth', 7], ['square', 0]]) { const o = oscAt(type, mtof(m), t, t + dur + 0.4, det); lg.connect(o.detune); o.connect(f); }
      env(g, t, 0.03, v, 0.2, v * 0.75, 0.12, t + dur); f.connect(g); out(g, 0.6, 0.45, 0.3);
    },
    bell(t, m, dur, v, pan) {
      for (const [ratio, amp, dec] of [[1, 1, dur], [2.01, 0.38, dur * 0.5], [3.98, 0.14, dur * 0.25], [5.43, 0.05, dur * 0.12]]) {
        const o = oscAt('sine', mtof(m) * ratio, t, t + dec + 0.05), g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * amp, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        o.connect(g); out(g, 0.5, 0.85, 0.15, pan);
      }
    },
    /** FM electric piano: soft, round, a little 'tine' on the attack */
    keys(t, m, dur, v, pan) {
      dur = Math.max(0.5, dur); const f = mtof(m), end = t + dur + 1.4;
      const car = oscAt('sine', f, t, end), mod = oscAt('sine', f, t, end), mg = ctx.createGain(), g = ctx.createGain();
      mg.gain.setValueAtTime(f * 1.9, t); mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 1); mod.connect(mg); mg.connect(car.frequency);
      const tine = oscAt('sine', f * 7.02, t, t + 0.12), tg = ctx.createGain(); tg.gain.setValueAtTime(v * 0.1, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); tine.connect(tg);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.45); g.gain.setTargetAtTime(0.0001, t + dur, 0.3);
      const lp = biq('lowpass', 3600, 0.5); car.connect(g); tg.connect(g); g.connect(lp); out(lp, 0.6, 0.55, 0.12, pan);
    },
    heart(t, v) {
      for (const [dt, a] of [[0, 1], [0.17, 0.7]]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(70, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.16);
        g.gain.setValueAtTime(v * a, t + dt); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.22); o.connect(g); out(g, 1); o.start(t + dt); o.stop(t + dt + 0.25);
      }
    },
    drone(t, m, dur, v) {
      const g = ctx.createGain(), f = biq('lowpass', 220);
      for (const det of [-5, 5]) oscAt('sawtooth', mtof(m), t, t + dur + 1.2, det).connect(f);
      env(g, t, 0.8, v, 1, v, 0.6, t + dur); f.connect(g); out(g, 0.8, 0.4);
    },
    /** soft wind of 'space air' under the story */
    air(t, dur, v) {
      const n = noise(t, dur + 1, true), bp = biq('bandpass', 700, 0.6), g = ctx.createGain();
      bp.frequency.setValueAtTime(500, t); bp.frequency.linearRampToValueAtTime(1100, t + dur * 0.5); bp.frequency.linearRampToValueAtTime(500, t + dur);
      env(g, t, dur * 0.4, v, 1, v, 0.5, t + dur); n.connect(bp); bp.connect(g); out(g, 0.5, 0.6, 0, Math.random() - 0.5);
    },
    stab(t, notes, v) {
      const g = ctx.createGain(), f = biq('lowpass', 3200, 3);
      f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.3);
      for (const m of notes) for (const det of [-10, 10]) oscAt('sawtooth', mtof(m), t, t + 0.4, det).connect(f);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); f.connect(g); out(g, 0.7, 0.45, 0.1);
    },
    riser(t, dur, v) {
      const n = noise(t, dur), f = biq('bandpass', 300, 3), g = ctx.createGain();
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
  const STORY_MEL = [
    [[0, 74, 6], [6, 72, 2], [8, 69, 8]], [[0, 70, 6], [6, 72, 2], [8, 74, 8]],
    [[0, 67, 4], [4, 70, 4], [8, 74, 6], [14, 72, 2]], [[0, 73, 8], [8, 76, 4], [12, 69, 4]]
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
  // story: a gentle broken chord on the keys (step → [chord tone, octave])
  const STORY_KEYS = { 0: [0, 12], 4: [2, 12], 8: [1, 24], 12: [2, 12] };

  function scheduleStep(st, t) {
    const i = st % 16, bar = Math.floor(st / 16), sx = 60 / S.bpm / 4, mood = S.mood;
    if (S.sting > t) return; // let a victory/defeat sting ring out
    const prog = PROG[mood], [root, q] = prog[bar % prog.length], tri = chord(root, q);
    if (mood === 'title') {
      if (i === 0) { I.pad(t, chord(root, q, 12), sx * 16, 0.1, 950); I.drone(t, root - 12, sx * 16, 0.1); }
      const mel = TITLE_MEL[bar % TITLE_MEL.length]; for (const [s, m, l] of mel) if (s === i) I.bell(t, m, sx * l * 1.6, 0.19, 0.15);
      if (bar % 16 >= 8 && i % 2 === 0) I.arp(t, tri[0] + 12 + ARP[i], sx * 1.8, 0.035, 1400, i % 4 ? 0.35 : -0.35);
      if (bar % 16 >= 4 && (i === 6 || i === 14)) I.keys(t, tri[i === 6 ? 1 : 2] + 12, sx * 6, 0.035, -0.25);
      return;
    }
    if (mood === 'story') {
      if (i === 0) { I.pad(t, chord(root, q, 12), sx * 16, 0.075, 800, 1.6); I.drone(t, root - 12, sx * 16, 0.085); if (bar % 2 === 0) I.air(t, sx * 32, 0.035); }
      const k = STORY_KEYS[i]; if (k) I.keys(t, tri[k[0]] + k[1], sx * 5, 0.045, i % 8 ? 0.3 : -0.3);
      if (Math.floor(bar / 4) % 2 === 1) { const mel = STORY_MEL[bar % 4]; for (const [s, m, l] of mel) if (s === i) I.bell(t, m, sx * l * 1.4, 0.07, -0.1); }
      return;
    }
    const boss = mood === 'boss', lv = boss ? 3 : S.intensity, dg = S.danger;
    const cut = 260 + lv * 260 + dg * 700 + (boss ? 500 : 0);
    const fill = lv >= 2 && bar % 4 === 3 && i >= 12;
    // harmony bed
    if (i === 0) { I.pad(t, chord(root, q, 12), sx * 16, lv >= 2 ? 0.05 : 0.09, 600 + lv * 300); if (lv === 0) I.drone(t, root - 12, sx * 16, 0.11); }
    if (lv >= 3 && i === 0 && bar % 4 === 0) I.crash(t, 0.12);
    // ticking clock before the storm
    if (lv === 0 && i % 4 === 0) I.hat(t, i % 8 === 0 ? 0.11 : 0.065, false, i % 8 ? 0.2 : -0.2);
    // bass pulse
    if (lv >= 1) {
      const sixteenth = lv >= 3 || boss, on = sixteenth ? true : i % 2 === 0;
      if (on) { const oct = (boss && i % 4 === 3) || (!boss && lv >= 3 && i % 8 === 6) ? 12 : 0; I.bass(t, root - 12 + oct, sx * (sixteenth ? 0.9 : 1.8), 0.22, cut); }
    }
    // drums
    if (lv >= 1 && !fill) I.hat(t, i % 4 === 2 ? 0.085 : 0.04, lv >= 3 && i % 4 === 2, i % 2 ? 0.25 : -0.25);
    if (lv >= 2) {
      if (boss ? [0, 3, 6, 8, 10, 12].includes(i) : i % 4 === 0) I.kick(t, 0.9);
      if (!fill && (i === 4 || i === 12)) { I.snare(t, 0.3); if (lv >= 3) I.clap(t, 0.12); }
      if (boss && !fill && (i === 14 || i === 15)) I.snare(t, 0.13);
      if (fill) I.tom(t, [50, 47, 45, 41][i - 12] + (boss ? 1 : 0), 0.32, [0.4, 0.15, -0.15, -0.4][i - 12]);
    }
    // arpeggio
    if (lv >= 2) I.arp(t, tri[0] + 12 + ARP[i], sx * 0.95, boss ? 0.05 : 0.045, 900 + lv * 500 + dg * 800, i % 2 ? 0.3 : -0.3);
    // lead melody
    if (lv >= 3) {
      const mel = (boss ? BOSS_MEL : BATTLE_MEL)[bar % 4];
      for (const [s, m, l] of mel) if (s === i) I.lead(t, m, sx * l * 0.95, boss ? 0.06 : 0.05);
    }
    if (boss && [0, 3, 6, 10].includes(i)) I.stab(t, chord(root, q, 12), 0.07);
    if (boss && i === 0 && bar % 4 === 3) I.riser(t, sx * 16, 0.1);
    // heartbeat when foes close in on the reactor
    if (dg > 0.35) { const every = dg > 0.75 ? 4 : 8; if (i % every === 0) I.heart(t, 0.25 + dg * 0.3); }
  }

  function tick() {
    if (!ctx || previewing) return;
    const ahead = ctx.currentTime + 0.15;
    if (!musicOn || ctx.state !== 'running') { S.next = ctx.currentTime + 0.05; return; }
    if (S.next < ctx.currentTime - 0.2) S.next = ctx.currentTime + 0.05;
    try {
      while (S.next < ahead) {
        if (S.step % 16 === 0 && S.pendingMood) { S.mood = S.pendingMood; S.pendingMood = null; S.bpm = BPM[S.mood]; S.step = 0; setTempo(); }
        if (S.step % 4 === 0) S.intensity = S.wantIntensity;
        scheduleStep(S.step, S.next);
        S.next += 60 / S.bpm / 4; S.step++;
      }
    } catch (e) { S.next = ctx.currentTime + 0.2; }
  }

  function sting(win) {
    if (!ctx || !musicOn) return;
    const t = ctx.currentTime + 0.05;
    if (win) {
      I.pad(t, [62, 66, 69, 74], 3.2, 0.06, 1800); I.drone(t, 38, 3.2, 0.06); I.crash(t, 0.15); I.kick(t, 0.9);
      [[0, 69], [0.18, 74], [0.36, 78], [0.54, 81], [0.9, 86]].forEach(([d, m]) => I.lead(t + d, m, d === 0.9 ? 1.6 : 0.2, 0.06));
      [0, 0.18, 0.36, 0.54].forEach(d => I.snare(t + d, 0.2));
      I.keys(t + 0.9, 62, 2, 0.05, -0.3); I.keys(t + 0.9, 69, 2, 0.04, 0.3);
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
  let V = 1, PAN = 0, live = 0;
  function dest(wet, bus) {
    const head = ctx.createGain(); let o = head;
    if (PAN && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, PAN)); head.connect(p); o = p; }
    o.connect(bus || N.sfxBus);
    if (wet) { const g = gainNode(wet); o.connect(g); g.connect(N.sfxVerb); }
    return head;
  }
  /** pitched layer: f → f2 over dur (or P.slide seconds) */
  function osc(when, f, f2, dur, type, vol, P) {
    P = P || {}; const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f * V, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * V), t + (P.slide || dur));
    if (P.det) o.detune.value = P.det;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + (P.a || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o; if (P.lp) { const fl = biq('lowpass', P.lp, P.q || 0.8); o.connect(fl); n = fl; }
    n.connect(g); g.connect(dest(P.wet, P.bus)); o.start(t); o.stop(t + dur + 0.05);
  }
  /** noise layer through a sweeping filter */
  function nz(when, dur, vol, ftype, f, f2, q, wet, bus) {
    const t = ctx.currentTime + (when || 0), n = noise(t, dur), fl = biq(ftype, f, q || 0.8), g = ctx.createGain();
    if (f2) { fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(f2, t + dur); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(fl); fl.connect(g); g.connect(dest(wet, bus));
  }
  /** music dips out of the way of a big moment, then swells back */
  function duck(depth, hold) {
    if (!N) return; const t = ctx.currentTime, gn = N.duckG.gain;
    gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t); gn.setTargetAtTime(1 - depth, t, 0.02); gn.setTargetAtTime(1, t + hold, 0.3);
  }
  const arp = (notes, gap, type, vol, len, wet, when) => notes.forEach((f, i) => osc((when || 0) + i * gap, f, 0, len, type, vol, { wet }));
  // kept for the alarm, which wants a plain beep
  function tone(freq, dur, type, vol, when, slide) { osc(when, freq, slide, dur, type, vol || 0.15, { a: 0.012, lp: 3500 }); }

  const SFX = {
    deploy: () => { nz(0, .12, .2, 'lowpass', 900, 150); osc(0, 150, 55, .16, 'sine', .3); osc(.05, 520, 0, .1, 'triangle', .1, { wet: .2 }); osc(.11, 780, 0, .14, 'triangle', .09, { wet: .3 }); },
    retreat: () => { nz(0, .28, .12, 'bandpass', 2400, 400, 1.2); osc(0, 520, 240, .22, 'triangle', .1); },
    shoot: () => { nz(0, .03, .07, 'highpass', 3500); osc(0, 1500, 320, .07, 'square', .04, { lp: 3600 }); osc(0, 190, 80, .05, 'sine', .12); },
    cannon: () => { nz(0, .28, .26, 'lowpass', 1600, 180, 1, .25); osc(0, 130, 38, .26, 'sine', .34); osc(0, 640, 110, .09, 'square', .05, { lp: 2500 }); duck(.18, .1); },
    hit: () => { nz(0, .04, .13, 'bandpass', 2600, 1200, 1.4); osc(0, 320, 120, .05, 'sine', .1); },
    hitBig: () => { nz(0, .12, .18, 'bandpass', 1400, 400, 1); osc(0, 170, 48, .15, 'sine', .22); },
    slash: () => { nz(0, .1, .2, 'bandpass', 4200, 1100, 1.6); osc(0, 260, 110, .07, 'triangle', .07); },
    thump: () => { osc(0, 115, 42, .16, 'sine', .28); nz(0, .07, .14, 'lowpass', 700, 200); },
    zap: () => { osc(0, 170, 950, .14, 'sawtooth', .07, { lp: 3000 }); nz(0, .14, .07, 'highpass', 4500, 0, 0.8, .2); osc(.02, 1700, 380, .1, 'square', .03, { lp: 4000 }); },
    ping: () => { osc(0, 1320, 1150, .38, 'sine', .09, { wet: .55 }); osc(0, 1980, 0, .18, 'sine', .018, { wet: .4 }); },
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
    click: () => { osc(0, 880, 660, .045, 'triangle', .12); nz(0, .012, .04, 'bandpass', 4500, 0, 1); },
    deny: () => { osc(0, 230, 0, .07, 'square', .06, { lp: 1600 }); osc(.09, 175, 0, .1, 'square', .06, { lp: 1600 }); },
    promote: () => { arp([523, 659, 784, 1047, 1319], .05, 'triangle', .1, .2, .4); nz(.05, .4, .02, 'highpass', 8000, 0, 0.7, .6); osc(0, 110, 55, .15, 'sine', .15); },
    win: () => { if (!musicOn) [523, 659, 784, 1047].forEach((f, i) => tone(f, .24, 'triangle', .17, i * .12)); sting(true); },
    lose: () => { if (!musicOn) [392, 349, 311, 262].forEach((f, i) => tone(f, .4, 'sawtooth', .12, i * .22)); sting(false); },
    type: () => { osc(0, 420 + Math.random() * 80, 0, .03, 'triangle', .03); nz(0, .01, .02, 'bandpass', 3000, 0, 1); },
    door: () => { nz(0, .22, .26, 'lowpass', 3200, 260); osc(0, 92, 44, .26, 'sine', .32); osc(.17, 1400, 0, .035, 'square', .035, { lp: 3500 }); nz(.02, .1, .05, 'bandpass', 5200, 0, 2, .3); duck(.2, .15); },
    alarm: () => { [0, .32, .64].forEach(d => { tone(880, .16, 'square', .06, d); tone(660, .16, 'square', .06, d + .16); }); },
    fix: () => { osc(0, 740, 980, .07, 'square', .07, { lp: 3000 }); nz(0, .02, .04, 'highpass', 5000); },
    fixed: () => { arp([659, 880, 1175], .07, 'triangle', .12, .16, .4); },
    build: () => { [0, .1, .2].forEach((d, i) => { nz(d, .035, .1, 'bandpass', 2600 + i * 300, 0, 2); osc(d, 820 + i * 120, 0, .04, 'square', .03, { lp: 3500 }); osc(d, 160, 70, .06, 'sine', .08); }); },
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
  const THROTTLE = { bubble: 0.08, boom: 0.1, build: 0.2, fix: 0.05, shoot: 0.06, hit: 0.045, hitBig: 0.06, slash: 0.07, thump: 0.08, zap: 0.08, ping: 0.08, heal: 0.1, pop: 0.04, popBig: 0.06, cannon: 0.08, combo: 0.15, click: 0.03 };
  // busy moments: the small, frequent sounds drop out first so the big ones stay clear
  const CHEAP = new Set(['shoot', 'hit', 'slash', 'thump', 'ping', 'pop', 'heal', 'zap', 'type']);
  const lastAt = {};
  const busy = ms => { live++; setTimeout(() => { live--; }, ms || 350); };

  /* ---------- voices ----------
     Each crewmate 'talks' in soft little syllables: a rounded triangle body plus a
     sawtooth shaped by two vowel formants (picked from the letters being typed),
     with a tiny breathy consonant. High voices are pulled into a sweet range so
     nobody is shrill, and everything runs through the warm voice filter. */
  const VOW = { a: [780, 1200], e: [480, 1850], i: [330, 2200], o: [520, 880], u: [360, 820], y: [340, 2000] };
  const VOWL = Object.keys(VOW).map(k => VOW[k]);
  const voicePitch = p => p <= 260 ? p : 260 + (p - 260) * 0.42; // 660 → 428 Hz, 330 → 289 Hz
  function syllable(when, pitch, len, vol, ch, radio) {
    const p = voicePitch(pitch);
    if (bank && !previewing) return sayClip(when, p, vol, ch, radio);
    const lc = (ch || '').toLowerCase(), fm = VOW[lc] || VOWL[(Math.random() * VOWL.length) | 0];
    syllableRaw(ctx.currentTime + when, p, len, vol, fm, Math.random() < 0.55, null, radio);
  }
  function syllableRaw(t, p, len, vol, fm, cons, to, radio) {
    const [f1, f2] = fm, end = t + len + 0.25, bus = radio ? N.radioBus : N.voiceBus;
    const out = () => to || dest(radio ? 0 : 0.08, bus);
    const body = oscAt('triangle', p, t, end), buzz = oscAt('sawtooth', p, t, end, 5);
    for (const o of [body, buzz]) { o.frequency.setValueAtTime(p * 1.05, t); o.frequency.exponentialRampToValueAtTime(p * 0.95, t + len); }
    const mix = ctx.createGain(), bg = gainNode(0.7); body.connect(bg); bg.connect(mix);
    for (const [f, q, a] of [[f1, 3, 0.55], [f2, 4, 0.22]]) { const b = biq('bandpass', f, q), fg = gainNode(a); buzz.connect(b); b.connect(fg); fg.connect(mix); }
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.016); g.gain.setTargetAtTime(0.0001, t + len * 0.65, len * 0.22);
    mix.connect(g); g.connect(out());
    if (cons) { // a soft consonant 't/k/s' at the front of the syllable
      const n = noise(t, 0.03, true), nb = biq('bandpass', 2600 + Math.random() * 1800, 1.2), ng = ctx.createGain();
      ng.gain.setValueAtTime(vol * 0.35, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.025); n.connect(nb); nb.connect(ng); ng.connect(to || dest(0, bus));
    }
  }
  /* Talking is the busiest sound in the game (a syllable every ~70 ms), so the syllables are
     baked once into little sound clips when the engine starts, then just played back at the
     speaker's pitch. Live synthesis stays as the fallback until the clips are ready. */
  const BANK_P = [130, 210, 330], BANK_LEN = 0.075, SLOT = 0.4, VKEYS = Object.keys(VOW);
  function makeBank(live) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return;
    const sr = live.sampleRate, n = VKEYS.length * BANK_P.length * 2, saved = { ctx, N };
    let off; try { off = new OAC(1, Math.ceil(sr * SLOT * n), sr); } catch (e) { return; }
    try {
      ctx = off; N = { pink: saved.N.pink, noise: saved.N.noise, voiceBus: off.destination, radioBus: off.destination, sfxVerb: null };
      let k = 0; for (const v of VKEYS) for (const p of BANK_P) for (const cons of [0, 1]) { syllableRaw(k * SLOT + 0.002, p, BANK_LEN, 0.5, VOW[v], cons, off.destination); k++; }
    } catch (e) { ctx = saved.ctx; N = saved.N; return; }
    ctx = saved.ctx; N = saved.N;
    const done = buf => {
      if (ctx !== live || !N) return; const src = buf.getChannelData(0), len = Math.floor(sr * SLOT), out = {};
      let k = 0; for (const v of VKEYS) { out[v] = []; for (const p of BANK_P) for (const cons of [0, 1]) { const b = live.createBuffer(1, len, sr); b.getChannelData(0).set(src.subarray(k * len, k * len + len)); out[v].push({ p, cons, b }); k++; } }
      bank = out;
    };
    try { const r = off.startRendering(); if (r && r.then) r.then(done, () => { }); else off.oncomplete = e => done(e.renderedBuffer); } catch (e) { }
  }
  /** one syllable from the clips: nearest baked pitch, nudged to the exact one (stays within a few semitones) */
  function sayClip(when, p, vol, ch, radio) {
    const lc = (ch || '').toLowerCase(), set = bank[VOW[lc] ? lc : VKEYS[(Math.random() * VKEYS.length) | 0]], cons = Math.random() < 0.55 ? 1 : 0;
    let best = null; for (const e of set) if (e.cons === cons && (!best || Math.abs(Math.log(e.p / p)) < Math.abs(Math.log(best.p / p)))) best = e;
    const t = ctx.currentTime + when, s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = best.b; s.playbackRate.value = p / best.p;
    g.gain.value = vol * 2; s.connect(g); g.connect(dest(radio ? 0 : 0.08, radio ? N.radioBus : N.voiceBus)); s.start(t); s.stop(t + SLOT);
  }
  /** radio squelch: the 'kssht' a walkie-talkie makes when it opens or closes */
  function squelch(when, v) {
    const t = ctx.currentTime + when, n = noise(t, 0.07), hp = biq('bandpass', 2200, 0.8), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(hp); hp.connect(g); g.connect(dest(0, N.radioBus));
  }
  const ready = () => sfxOn && !!ensure() && !!N && ctx.state !== 'closed';
  function snapshot() { return { ctx, N, S: Object.assign({}, S), musicOn, V, PAN }; }
  function restore(s) { ctx = s.ctx; N = s.N; musicOn = s.musicOn; V = s.V; PAN = s.PAN; Object.assign(S, s.S); previewing = false; }
  /** render something into an offline context and give back the buffer (live graph untouched) */
  function renderOffline(seconds, fn) {
    const saved = snapshot(); previewing = true;
    const off = new OfflineAudioContext(2, Math.floor(44100 * seconds), 44100);
    try { build(off); fn(); } catch (e) { restore(saved); return Promise.reject(e); }
    return off.startRendering().then(b => { restore(saved); return b; }, e => { restore(saved); throw e; });
  }
  const peakOf = b => { let pk = 0; for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk || a !== a) pk = a !== a ? NaN : a; } } return pk; };

  return {
    ensure,
    /** a short 'talking' blip for story dialogue; pitch per speaker, vowel from the text */
    voice(pitch, ch) {
      if (!ready()) return; const now = ctx.currentTime; if (now - (lastAt.voice || 0) < 0.07) return; lastAt.voice = now;
      if (live > 24) return; busy(300);
      try { V = 1; PAN = 0; syllable(0, pitch * (0.95 + Math.random() * 0.1), 0.075, 0.024, ch); duck(0.12, 0.15); } catch (e) { }
    },
    /** a short burst of radio chatter: n syllables with a natural rise and fall */
    chatter(pitch, n) {
      if (!ready()) return; V = 1; PAN = 0; busy(900);
      try {
        squelch(0, 0.02); let t = 0.06;
        for (let i = 0; i < n; i++) { const len = 0.06 + Math.random() * 0.05, contour = 1 + 0.12 * Math.sin(i / Math.max(1, n - 1) * Math.PI) - (i === n - 1 ? 0.1 : 0); syllable(t, pitch * contour * (0.96 + Math.random() * 0.08), len, 0.035, null, true); t += len + 0.025 + (Math.random() < 0.2 ? 0.06 : 0); }
        squelch(t + 0.05, 0.015);
      } catch (e) { }
    },
    /** a crewmate's battle cry when their skill fires ("hup-HA!") */
    bark(pitch, deep) {
      if (!ready()) return; V = 1; PAN = 0; busy();
      try { const p = pitch * (deep ? 0.85 : 1); syllable(0.02, p * 0.95, 0.07, 0.04, 'u'); syllable(0.12, p * 1.25, 0.16, 0.05, 'a'); } catch (e) { }
    },
    /** pan: -1 (left) .. 1 (right) */
    play(n, pan) {
      if (n === 'win' || n === 'lose') { if (ensure() && N) { V = 1; PAN = 0; try { SFX[n](); } catch (e) { } } return; }
      if (!SFX[n] || !ready()) return;
      const now = ctx.currentTime, gap = THROTTLE[n]; if (gap) { if (now - (lastAt[n] || 0) < gap) return; lastAt[n] = now; }
      if (CHEAP.has(n) && live > 14) return;
      if (live > 40) return; busy();
      V = n === 'click' || n === 'type' ? 1 : 1 + (Math.random() - 0.5) * 0.1; PAN = isFinite(pan) ? pan : 0;
      try { SFX[n](); } catch (e) { }
    },
    /** low-pass the music (pause menu) */
    muffle(on) {
      on = !!on; if (!ctx || !N || on === N.muffled) return; N.muffled = on;
      N.mfilt.frequency.setTargetAtTime(on ? 650 : Math.min(20000, ctx.sampleRate * 0.45), ctx.currentTime, on ? 0.08 : 0.2);
    },
    setSfx(v) { sfxOn = !!v; },
    setMusic(v) { musicOn = !!v; if (N) N.musicBus.gain.setTargetAtTime(musicOn ? MUSIC_LV : 0, ctx.currentTime, 0.1); },
    /** 'title' | 'story' | 'battle' | 'boss' (numbers kept for older callers: 0 title, 1 battle, 2 battle at full intensity) */
    mood(m) {
      if (m === 0) m = 'title'; else if (m === 1) m = 'battle'; else if (m === 2) { m = 'battle'; S.wantIntensity = 3; }
      if (!BPM[m]) return;
      if (m === 'battle' && S.mood !== 'battle' && S.pendingMood !== 'battle') S.wantIntensity = 0;
      if (S.mood === m) { S.pendingMood = null; return; }
      if (!ctx || ctx.state !== 'running' || S.step === 0) { S.mood = m; S.pendingMood = null; S.bpm = BPM[m]; S.step = 0; S.sting = 0; setTempo(); }
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
      return renderOffline(seconds, () => {
        musicOn = true; N.musicBus.gain.value = MUSIC_LV;
        Object.assign(S, { mood, pendingMood: null, bpm: BPM[mood], step: 0, next: 0.05, intensity, wantIntensity: intensity, danger: danger || 0, sting: 0 }); setTempo(true);
        while (S.next < seconds - 0.5) { scheduleStep(S.step, S.next); S.next += 60 / S.bpm / 4; S.step++; }
      });
    },
    /** Dev/test helper: render one sound effect offline ('chatter' and 'voice' included); resolves to its peak level (0 = silent). */
    previewSfx(n, pan) { return this.previewBuffer(n, 2, pan).then(peakOf); },
    previewBuffer(n, seconds, pan) {
      return renderOffline(seconds || 2, () => {
        musicOn = false; V = 1; PAN = pan || 0;
        if (n === 'chatter') { for (let i = 0; i < 4; i++) syllable(0.06 + i * 0.09, 300, 0.07, 0.035, null, true); squelch(0, 0.02); }
        else if (/^voice/.test(n)) { const p = +n.split(':')[1] || 300, txt = 'Hello crew, the signal is coming from the reactor!'; for (let i = 0, t = 0; i < txt.length && t < (seconds || 2) - 0.3; i += 4, t += 0.088) syllable(t, p, 0.075, 0.024, (txt.slice(i, i + 4).match(/[aeiouy]/i) || [])[0]); }
        else SFX[n]();
      });
    },
    sfxNames: () => Object.keys(SFX),
    state: () => ({ mood: S.mood, pending: S.pendingMood, intensity: S.intensity, danger: S.danger, bpm: S.bpm }),
    /** Dev helper: is the engine alive? */
    health: () => ({ state: ctx ? ctx.state : 'none', heals, lastHeal, live, rate: ctx ? ctx.sampleRate : 0, clips: !!bank, heard }),
    /** Settings 'Fix sound' button: rebuild everything from inside the tap, then play a chime */
    repair() { if (!ctx) { ensure(); } else heal('fixed from settings'); wake(); unlock(); setTimeout(() => this.play('fixed'), 120); },
    /** Dev/test helper: pretend the graph broke, to check it heals */
    _breakForTest(kind) { if (!ctx) return; if (kind === 'suspend') quiet(ctx.suspend()); else if (kind === 'silence') N.master.disconnect(); else heal('test'); }
  };
})();
