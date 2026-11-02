'use strict';
/* Tiny synthesized sound: blips + a gentle looping space melody. No audio files. */
const Sound = (() => {
  let ctx = null, master = null, musicGain = null, sfxOn = true, musicOn = true, timer = null, step = 0, mood = 0;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.5 : 0; musicGain.connect(master);
    return ctx;
  }
  function tone(freq, dur, type, vol, when, slide, dest) {
    if (!ctx) return; const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
  }
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
    win: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, .24, 'triangle', .17, i * .12)); },
    lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, .4, 'sawtooth', .12, i * .22)); },
    type: () => tone(520 + Math.random() * 120, .03, 'square', .025)
  };
  // Minor-pentatonic ambience; mood 0 calm / 1 battle / 2 finale
  const BASE = [110, 130.8, 146.8, 164.8, 196, 220, 261.6, 293.7, 329.6];
  function tick() {
    if (!ctx || !musicOn) return;
    const bar = Math.floor(step / 8), s = step % 8, root = [0, 0, 3, 2][bar % 4];
    if (s === 0) { tone(BASE[root] / 2 * 2, 2.2, 'sine', .11, 0, null, musicGain); tone(BASE[root + 2] , 2.2, 'triangle', .04, 0, null, musicGain); }
    if (mood && s % 2 === 0) tone(BASE[root] * 2, .1, 'triangle', .05 + mood * .015, 0, null, musicGain);
    const pat = [4, 6, 5, 7, 6, 8, 5, 3];
    if ((s % (mood ? 1 : 2)) === 0 && Math.random() < (mood ? .75 : .5)) tone(BASE[(pat[s] + root) % 9] * 2, .5, 'sine', mood ? .06 : .05, 0, null, musicGain);
    step++;
  }
  return {
    ensure,
    play(n) { if (!sfxOn || !ensure()) return; try { SFX[n] && SFX[n](); } catch (e) { } },
    setSfx(v) { sfxOn = !!v; },
    setMusic(v) { musicOn = !!v; if (musicGain) musicGain.gain.value = musicOn ? 0.5 : 0; },
    mood(m) { mood = m; },
    startMusic() { if (!ensure() || timer) return; timer = setInterval(tick, 330); },
    stopMusic() { clearInterval(timer); timer = null; }
  };
})();
