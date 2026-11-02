'use strict';
/* ============================================================
   UI: screens, story dialogue, mission map, HUD, tutorial, saves.
   ============================================================ */
(() => {
  const $ = id => document.getElementById(id);
  const TEST = /[?&]test/.test(location.search);

  /* ---------- Save ---------- */
  const SAVE_KEY = 'crewmate-command-v1';
  const defaults = () => ({ stars: {}, diff: 'captain', music: true, sfx: true, intro: false, tutDone: false, seen: {}, losses: {}, ended: false });
  let mem = null;
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === 'object') return Object.assign(defaults(), s); } catch (e) { }
    return mem || defaults();
  }
  let save = loadSave();
  function persist() { mem = save; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }
  const unlocked = id => id === 1 || (save.stars[id - 1] || 0) > 0;
  const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);

  /* ---------- Screens ---------- */
  let current = 'title';
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('hidden', s.id !== 's-' + id));
    current = id; if (id !== 'game' && G) { G.stop(); }
    if (id === 'title') Sound.mood(0);
  }

  /* ---------- Animated starfield backdrops ---------- */
  const Backdrop = (() => {
    let raf = 0, cv = null, stars = [], crew = [], t0 = 0;
    function init(canvas, withCrew) {
      cv = canvas; const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = w * dpr; cv.height = h * dpr; cv._w = w; cv._h = h; cv._dpr = dpr;
      const rnd = mulberry32(5);
      stars = Array.from({ length: 110 }, () => ({ x: rnd() * w, y: rnd() * h, r: rnd() * 1.6 + 0.3, s: rnd() * 18 + 4, tw: rnd() * 6 }));
      const cols = [CREW.brick.color, CREW.rook.color, CREW.lumi.color, CREW.sparky.color, CREW.echo.color, CREW.tank.color, '#ff8a2a', '#ff7ac8'];
      crew = withCrew ? Array.from({ length: Math.min(9, Math.max(5, Math.floor(w / 140))) }, (_, i) => ({ x: rnd() * w, y: rnd() * h, v: 6 + rnd() * 10, a: rnd() * 6, ra: (rnd() - 0.5) * 0.5, s: 36 + rnd() * 40, c: cols[i % cols.length], ghost: i === 3 })) : [];
    }
    function frame(now) {
      raf = requestAnimationFrame(frame); const ctx = cv.getContext('2d'), t = (now - t0) / 1000, w = cv._w, h = cv._h;
      ctx.setTransform(cv._dpr, 0, 0, cv._dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      for (const s of stars) { const x = (s.x - t * s.s * 0.5 + w * 5) % w; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + s.tw); ctx.fillStyle = '#cfe0ff'; ctx.fillRect(x, s.y, s.r, s.r); }
      ctx.globalAlpha = 1;
      for (const c of crew) {
        const x = (c.x + t * c.v) % (w + 160) - 80, y = c.y + Math.sin(t * 0.7 + c.a) * 18;
        ctx.save(); ctx.translate(x, y); ctx.rotate(c.a + t * c.ra); ctx.globalAlpha = c.ghost ? 0.4 : 0.9;
        drawCrewmate(ctx, 0, c.s * 0.4, c.s, { color: c.c, facing: 1, t: 0, idle: false, noShadow: true, hat: c.ghost ? null : undefined });
        ctx.restore();
      }
    }
    return {
      start(canvas, withCrew) { this.stop(); init(canvas, withCrew); t0 = performance.now(); raf = requestAnimationFrame(frame); },
      stop() { cancelAnimationFrame(raf); raf = 0; }
    };
  })();

  /* ---------- Story dialogue ---------- */
  let dlg = null;
  function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
  function dialog(lines, level, done) {
    if (!lines || !lines.length) { done && done(); return; }
    const prev = current;
    show('dialog'); Backdrop.stop();
    const bg = $('dlgBg'), dpr = Math.min(devicePixelRatio || 1, 2); bg.width = innerWidth * dpr; bg.height = innerHeight * dpr;
    const bctx = bg.getContext('2d');
    if (level) { const b = renderBoard(level, 40); const sc = Math.max(bg.width / b.width, bg.height / b.height); bctx.drawImage(b, (bg.width - b.width * sc) / 2, (bg.height - b.height * sc) / 2, b.width * sc, b.height * sc); }
    else { bctx.fillStyle = '#0a0f26'; bctx.fillRect(0, 0, bg.width, bg.height); }
    dlg = { lines, i: -1, done, typing: false, timer: 0, full: '', level, prev };
    nextLine();
  }
  function nextLine() {
    const d = dlg; if (!d) return;
    clearInterval(d.timer); d.i++;
    if (d.i >= d.lines.length) { const cb = d.done; dlg = null; cb && cb(); return; }
    const [who, text] = d.lines[d.i], c = CAST[who] || CAST.juno;
    const nm = $('dlgName'); nm.textContent = c.name; nm.style.background = c.color; nm.style.color = lum(c.color) > 0.6 ? '#10131c' : '#fff';
    const pic = $('dlgPic'); pic.style.width = pic.style.height = ''; paintPortrait(pic, c, true);
    d.full = text; d.typing = true; const tx = $('dlgText'); tx.textContent = ''; let n = 0;
    d.timer = setInterval(() => { n += 2; tx.textContent = text.slice(0, n); if (n % 6 === 0) Sound.play('type'); if (n >= text.length) { clearInterval(d.timer); d.typing = false; tx.textContent = text; } }, 22);
  }
  $('s-dialog').addEventListener('click', e => {
    if (e.target.id === 'dlgSkip') return; const d = dlg; if (!d) return; Sound.ensure();
    if (d.typing) { clearInterval(d.timer); d.typing = false; $('dlgText').textContent = d.full; } else nextLine();
  });
  $('dlgSkip').addEventListener('click', e => { e.stopPropagation(); if (!dlg) return; clearInterval(dlg.timer); const cb = dlg.done; dlg = null; cb && cb(); });

  /* ---------- Prologue / epilogue ---------- */
  function cinematic(slides, done) {
    show('intro'); Backdrop.start($('introBg'), true);
    let i = -1; const el = $('introText');
    const next = () => {
      i++; if (i >= slides.length) { end(); return; }
      el.style.opacity = 0; setTimeout(() => { el.textContent = slides[i]; el.style.opacity = 1; }, 350);
    };
    const end = () => { $('s-intro').onclick = null; $('introSkip').onclick = null; Backdrop.stop(); done && done(); };
    $('s-intro').onclick = e => { if (e.target.id === 'introSkip') return; Sound.ensure(); next(); };
    $('introSkip').onclick = e => { e.stopPropagation(); end(); };
    next();
  }

  /* ---------- Mission map ---------- */
  function toHub() {
    show('hub'); Backdrop.stop(); const list = $('hubList'); list.innerHTML = '';
    $('hubStars').textContent = '★ ' + totalStars() + ' / ' + LEVELS.length * 3;
    let nextMarked = false; const paints = [];
    CHAPTERS.forEach(ch => {
      const sec = document.createElement('div'); sec.className = 'chapter';
      sec.innerHTML = `<h3 style="color:${ch.color}">Chapter ${ch.id}: ${ch.name}</h3><p>${ch.sub}</p>`;
      const grid = document.createElement('div'); grid.className = 'cards';
      LEVELS.filter(l => l.chapter === ch.id).forEach(l => {
        const ok = unlocked(l.id), st = save.stars[l.id] || 0, b = document.createElement('button');
        b.className = 'lvl' + (ok ? '' : ' locked'); b.disabled = !ok; b.setAttribute('aria-label', `Mission ${l.id}: ${l.name}${ok ? '' : ' (locked)'}`);
        if (ok && !st && !nextMarked) { b.classList.add('next'); nextMarked = true; }
        const thumb = renderBoard(l, 22); thumb.style.width = '100%'; thumb.style.height = '118px';
        b.appendChild(thumb);
        const foes = [...new Set(l.waves.flatMap(w => w.spawns.map(s => s.type)))];
        b.insertAdjacentHTML('beforeend', `<div class="stars">${[1, 2, 3].map(n => n <= st ? '★' : '<i>★</i>').join('')}</div>
          <div class="meta"><div class="num">MISSION ${String(l.id).padStart(2, '0')}</div><div class="nm">${l.name}</div><div class="pl">${l.place}</div>
          <div class="foes"></div>${l.newCrew ? `<span class="badge">NEW CREW: ${CREW[l.newCrew].name}</span>` : ''}</div>`);
        const fe = b.querySelector('.foes');
        foes.forEach(f => { const c = document.createElement('canvas'); c.title = FOES[f].name; fe.appendChild(c); paints.push([c, f]); });
        if (ok) b.onclick = () => { Sound.ensure(); Sound.play('click'); playLevel(l.id); };
        grid.appendChild(b);
      });
      sec.appendChild(grid); list.appendChild(sec);
    });
    requestAnimationFrame(() => paints.forEach(([c, f]) => paintPortrait(c, f)));
    if (save.ended && !save.endedShown) { save.endedShown = true; persist(); }
  }

  /* ---------- Logbook ---------- */
  let logTab = 'crew';
  function toLog(from) {
    show('log'); Backdrop.stop(); toLog.from = from || 'title'; renderLog();
  }
  function renderLog() {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === logTab));
    const list = $('logList'); list.innerHTML = ''; const paints = [];
    const reach = Math.max(1, ...LEVELS.filter(l => unlocked(l.id)).map(l => l.id));
    if (logTab === 'crew') {
      CREW_ORDER.forEach(k => {
        const b = CREW[k], open = LEVELS.some(l => l.id <= reach && l.crew.includes(k));
        const e = document.createElement('div'); e.className = 'entry' + (open ? '' : ' lock');
        const c = document.createElement('canvas'); e.appendChild(c); paints.push([c, k]);
        e.insertAdjacentHTML('beforeend', open ? `<div><h4>${b.name}</h4><div class="role">${b.role}</div><p>${b.blurb}</p>
          <div class="stats"><span>HP ${b.hp}</span><span>${b.heal ? 'HEAL ' + b.heal : 'ATK ' + b.atk}</span><span>${b.block ? 'BLOCKS ' + b.block : 'RANGE ' + b.range}</span><span>DEF ${b.def}</span><span>COST ${b.cost}</span></div>
          <p><b>Skill — ${b.skill.name}:</b> ${b.skill.desc}</p></div>` : `<div><h4>???</h4><p>Reach a later mission to wake this crewmate.</p></div>`);
        list.appendChild(e);
      });
    } else {
      Object.keys(FOES).forEach(k => {
        const f = FOES[k], open = save.seen[k];
        const e = document.createElement('div'); e.className = 'entry' + (open ? '' : ' lock');
        const c = document.createElement('canvas'); e.appendChild(c); paints.push([c, k]);
        const tags = [f.flying && 'FLIES', f.stealth && 'SNEAKY', f.ranged && 'SHOOTS', f.boss && 'BOSS', f.def >= 40 && 'ARMORED', f.splits && 'SPLITS'].filter(Boolean);
        e.insertAdjacentHTML('beforeend', open ? `<div><h4>${f.name}</h4><div class="role">${f.boss ? 'Boss' : 'Foe'}</div><p>${f.lore}</p>
          <div class="stats"><span>HP ${f.hp}</span><span>SPD ${f.spd}</span><span>DEF ${f.def}</span>${tags.map(t => `<span>${t}</span>`).join('')}</div><p><b>Tip:</b> ${f.tip}</p></div>` : `<div><h4>???</h4><p>You haven’t met this one yet.</p></div>`);
        list.appendChild(e);
      });
    }
    requestAnimationFrame(() => paints.forEach(([c, k]) => paintPortrait(c, k, true)));
  }
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => { logTab = t.dataset.tab; Sound.play('click'); renderLog(); });
  $('logBack').onclick = () => { Sound.play('click'); toLog.from === 'hub' ? toHub() : toTitle(); };

  /* ---------- Settings ---------- */
  function toSettings() {
    show('set'); Backdrop.stop(); renderSettings();
  }
  function renderSettings() {
    const seg = $('segDiff'); seg.innerHTML = '';
    Object.keys(DIFFICULTY).forEach(k => {
      const b = document.createElement('button'); b.className = 'btn' + (save.diff === k ? ' on' : ''); b.textContent = DIFFICULTY[k].name;
      b.onclick = () => { save.diff = k; persist(); Sound.play('click'); renderSettings(); }; seg.appendChild(b);
    });
    $('diffDesc').textContent = DIFFICULTY[save.diff].desc;
    $('optMusic').checked = save.music; $('optSfx').checked = save.sfx;
  }
  $('optMusic').onchange = e => { save.music = e.target.checked; Sound.setMusic(save.music); persist(); };
  $('optSfx').onchange = e => { save.sfx = e.target.checked; Sound.setSfx(save.sfx); persist(); Sound.play('click'); };
  $('btnTutAgain').onclick = () => { save.tutDone = false; persist(); $('btnTutAgain').textContent = 'Tutorial will play in Mission 1 ✓'; };
  $('btnReset').onclick = () => confirmBox('Reset everything?', 'This erases your stars, unlocks and logbook.', 'Reset', () => { save = defaults(); persist(); Sound.setMusic(save.music); Sound.setSfx(save.sfx); renderSettings(); });
  $('setBack').onclick = () => { Sound.play('click'); toTitle(); };

  /* ---------- Modals ---------- */
  function modal(html) { $('modalCard').innerHTML = html; $('modal').classList.remove('hidden'); }
  function closeModal() { $('modal').classList.add('hidden'); }
  function confirmBox(title, text, yes, fn) {
    modal(`<h2>${title}</h2><p>${text}</p><div class="row"><button class="btn danger" id="mYes">${yes}</button><button class="btn" id="mNo">Cancel</button></div>`);
    $('mYes').onclick = () => { closeModal(); fn(); }; $('mNo').onclick = closeModal;
  }

  /* ---------- Title ---------- */
  function toTitle() {
    show('title'); Backdrop.start($('titleBg'), true);
    $('btnPlay').textContent = totalStars() || save.intro ? 'CONTINUE' : 'PLAY';
  }
  $('btnPlay').onclick = () => {
    Sound.ensure(); if (save.music) Sound.startMusic(); Sound.play('click');
    if (!save.intro) cinematic(PROLOGUE, () => { save.intro = true; persist(); playLevel(1); });
    else toHub();
  };
  $('btnLog').onclick = () => { Sound.ensure(); Sound.play('click'); toLog('title'); };
  $('btnSet').onclick = () => { Sound.ensure(); Sound.play('click'); toSettings(); };
  $('hubBack').onclick = () => { Sound.play('click'); toTitle(); };
  $('hubLog').onclick = () => { Sound.play('click'); toLog('hub'); };

  /* ============================================================
     GAME CONTROLLER
     ============================================================ */
  const cv = $('cv'), stage = $('stage');
  let G = null, lvl = null, tut = null, tipTimer = 0, lastHud = {}, wasCleared = false, forceTut = false;

  function playLevel(id) {
    lvl = LEVELS.find(l => l.id === id); wasCleared = (save.stars[id] || 0) > 0;
    const go = () => beginGame();
    if (!wasCleared && lvl.pre) dialog(lvl.pre, lvl, go); else go();
  }

  function beginGame() {
    closeModal(); show('game'); Backdrop.stop();
    const runTut = !!lvl.tutorial && (!save.tutDone || forceTut); forceTut = false;
    lvl.waves.forEach(w => w.spawns.forEach(s => { save.seen[s.type] = true; })); persist();
    G.start(lvl, save.diff, { autoWaves: !runTut });
    buildCards(); lastHud = {}; fit(); G.run(); hud(true);
    Sound.mood(1); if (save.music) Sound.startMusic();
    $('tut').classList.add('hidden'); $('unitPanel').classList.add('hidden'); $('radio').classList.add('hidden'); clearTimeout(radioPend); clearTimeout(radioT);
    tut = null; G.frozen = false;
    if (runTut) tut = new Tutorial(); else showBanner('Deploy your crew', 'then press START', false);
    if (innerHeight > innerWidth * 1.1) { const r = $('rotate'); r.classList.remove('hidden'); r.style.animation = 'none'; r.offsetHeight; r.style.animation = ''; setTimeout(() => r.classList.add('hidden'), 6000); }
  }

  function fit() { if (G && lvl && current === 'game') G.resize(stage.clientWidth, stage.clientHeight); }
  new ResizeObserver(() => fit()).observe(stage);
  addEventListener('resize', fit);

  /* ----- cards ----- */
  function buildCards() {
    const bar = $('cardBar'); bar.innerHTML = '';
    G.avail.forEach((k, i) => {
      const b = CREW[k], btn = document.createElement('button'); btn.className = 'card'; btn.dataset.type = k; btn.dataset.focus = 'card-' + k;
      btn.setAttribute('aria-label', `${b.name}, ${b.role}, costs ${b.cost} DP`);
      btn.innerHTML = `<span class="nm">${b.name.toUpperCase()}</span><canvas></canvas><span class="cost"><small>DP</small>${b.cost}</span>`;
      btn.onclick = () => { Sound.ensure(); Sound.play('click'); G.setPlacing(k); if (G.placing) tip(b.ground === 'path' ? 'Tap a glowing floor tile' : 'Tap a glowing high deck'); };
      bar.appendChild(btn);
    });
    requestAnimationFrame(() => bar.querySelectorAll('.card').forEach(c => paintPortrait(c.querySelector('canvas'), c.dataset.type)));
  }

  /* ----- banners / tips ----- */
  function showBanner(t, sub, boss) {
    const b = $('banner'); b.className = 'banner' + (boss ? ' boss' : ''); b.innerHTML = t + (sub ? `<small>${sub}</small>` : '');
    b.style.animation = 'none'; b.offsetHeight; b.style.animation = '';
  }
  function tip(text) {
    const t = $('tip'); t.textContent = text; t.classList.remove('hidden'); clearTimeout(tipTimer); tipTimer = setTimeout(() => t.classList.add('hidden'), 2400);
  }
  let radioT = 0, radioPend = 0;
  function radio(who, text) {
    const c = CAST[who] || CAST.juno; paintPortrait($('radioPic'), c); $('radioName').textContent = c.name; $('radioTxt').textContent = text;
    $('radio').classList.remove('hidden'); clearTimeout(radioT); radioT = setTimeout(() => $('radio').classList.add('hidden'), 6500);
  }

  /* ----- game events ----- */
  G = new Game(cv, {
    emit(name, d) {
      switch (name) {
        case 'sfx': Sound.play(d); break;
        case 'deny': if (current === 'game') { tip(d); Sound.play('deny'); } break;
        case 'wave':
          showBanner(d.last ? 'FINAL WAVE' : 'WAVE ' + d.n + ' / ' + d.total, d.last ? 'Hold the line!' : '', d.last); if (d.last) Sound.mood(2);
          if (d.radio) { clearTimeout(radioPend); radioPend = setTimeout(() => radio(d.radio[0], d.radio[1]), 1200); } break;
        case 'boss': showBanner('⚠ BOSS', d.name, true); break;
        case 'boss-call': tip('The Hollow calls for backup!'); break;
        case 'placing': syncCards(); if (d) tut && tut.on('select:' + d); break;
        case 'select': renderPanel(d); if (d) tut && tut.on('select:field'); break;
        case 'deploy': tut && tut.on('deploy:' + d.type); break;
        case 'skill': tut && tut.on('skill'); break;
        case 'leak': pop(); break;
        case 'end': onEnd(d); break;
        case 'frame': frame(); break;
      }
    }
  });
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); Sound.ensure(); const t = G.tileAt(e.clientX, e.clientY); if (!t) return; G.hover = t; G.tap(t[0], t[1]);
  });
  cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') G.hover = G.tileAt(e.clientX, e.clientY); });
  cv.addEventListener('pointerleave', () => { G.hover = null; });

  function pop() { const h = $('hearts').querySelectorAll('i'); const i = G.lives; if (h.length === 1) { h[0].classList.add('pop'); setTimeout(() => h[0].classList.remove('pop'), 450); } else if (h[i]) { h[i].classList.add('off', 'pop'); } }

  function syncCards() { document.querySelectorAll('.card').forEach(c => c.classList.toggle('sel', G.placing === c.dataset.type)); }

  /* ----- HUD ----- */
  function hud(force) {
    const dp = Math.floor(G.dp), L = lastHud;
    if (force || L.dp !== dp) { $('dpVal').textContent = dp; L.dp = dp; document.querySelectorAll('.card').forEach(c => c.classList.toggle('cant', dp < CREW[c.dataset.type].cost)); }
    $('dpFill').style.width = Math.min(100, G.dp) + '%';
    if (force || L.lives !== G.lives || L.max !== G.maxLives) {
      L.lives = G.lives; L.max = G.maxLives; const h = $('hearts'); h.innerHTML = '';
      if (innerWidth < 560 && G.maxLives > 4) { const e = document.createElement('i'); e.textContent = '♥ ' + G.lives; h.appendChild(e); }
      else for (let i = 0; i < G.maxLives; i++) { const e = document.createElement('i'); e.textContent = '♥'; if (i >= G.lives) e.className = 'off'; h.appendChild(e); }
    }
    const p = G.progress(), left = G.nextWaveIn(); const wt = p.wave ? `Wave ${p.wave}/${p.total}` : `Wave 0/${p.total}`;
    if (L.wt !== wt) { $('waveTxt').textContent = wt; L.wt = wt; }
    let nb = '';
    if (G.state === 'prep') nb = '▶ START'; else if (G.waveIdx < p.total - 1) nb = '⏩ NEXT' + (left != null && G.autoWaves ? ' ' + Math.ceil(left) + 's' : ''); else nb = G.foes.length + G.queue.length + ' left';
    if (L.nb !== nb) { const b = $('btnNext'); b.innerHTML = nb; b.disabled = G.state !== 'prep' && G.waveIdx >= p.total - 1; L.nb = nb; b.classList.toggle('pulse', G.state === 'prep'); }
    const sub = G.state === 'prep' ? 'Get ready' : (G.foes.length + G.queue.length) + ' foes';
    if (L.sub !== sub) { $('waveSub').textContent = sub; L.sub = sub; }
  }
  function frame() { if (current !== 'game') return; hud(); updatePanel(); if (tut) tut.tick(); }

  $('btnNext').onclick = () => { Sound.ensure(); if (!G.allow({ kind: 'next' })) { tip('Follow the Captain first!'); return; } if (G.callNextWave()) Sound.play('click'); };
  $('btnSpeed').onclick = () => { G.setSpeed(G.speed === 1 ? 2 : 1); $('btnSpeed').innerHTML = G.speed + '&times;'; Sound.play('click'); };
  $('btnPause').onclick = () => pauseMenu();

  function pauseMenu() {
    if (G.state === 'won' || G.state === 'lost') return;
    G.paused = true; Sound.play('click');
    modal(`<h2>Paused</h2><p>${lvl.name}</p><div class="row"><button class="btn primary" id="pRes">Resume</button><button class="btn" id="pRe">Restart mission</button>
      <button class="btn" id="pMus">Music: ${save.music ? 'On' : 'Off'}</button><button class="btn" id="pSfx">Sound FX: ${save.sfx ? 'On' : 'Off'}</button><button class="btn ghost" id="pMap">Quit to map</button></div>`);
    $('pRes').onclick = () => { closeModal(); G.paused = false; };
    $('pRe').onclick = () => { closeModal(); beginGame(); };
    $('pMus').onclick = e => { save.music = !save.music; Sound.setMusic(save.music); if (save.music) Sound.startMusic(); persist(); e.target.textContent = 'Music: ' + (save.music ? 'On' : 'Off'); };
    $('pSfx').onclick = e => { save.sfx = !save.sfx; Sound.setSfx(save.sfx); persist(); e.target.textContent = 'Sound FX: ' + (save.sfx ? 'On' : 'Off'); };
    $('pMap').onclick = () => { closeModal(); G.paused = false; toHub(); };
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'game' && G.state !== 'won' && G.state !== 'lost' && $('modal').classList.contains('hidden')) pauseMenu(); });
  addEventListener('keydown', e => {
    if (current !== 'game' || !$('modal').classList.contains('hidden')) return;
    if (e.key >= '1' && e.key <= '6') { const k = G.avail[+e.key - 1]; if (k) G.setPlacing(k); }
    else if (e.key === ' ') { e.preventDefault(); $('btnNext').click(); }
    else if (e.key.toLowerCase() === 'p') pauseMenu();
    else if (e.key === 'Escape') { G.placing = null; G.select(null); syncCards(); }
  });

  /* ----- selected-unit panel ----- */
  let panelRefs = null;
  function renderPanel(c) {
    const p = $('unitPanel'); panelRefs = null;
    if (!c) { p.classList.add('hidden'); return; }
    const b = c.b, sk = b.skill;
    p.innerHTML = `<h4><b>${b.name}</b><span class="rk"></span></h4><div class="hp"><i></i></div>
      <button class="ubtn skill" data-focus="skill"><div class="fill"></div><span>★ ${sk.name}</span><small class="sp"></small></button>
      <p class="sdesc">${sk.desc}</p>
      <button class="ubtn promote"><span>Promote</span><small></small></button>
      <button class="ubtn retreat"><span>Retreat</span><small></small></button>`;
    p.classList.remove('hidden');
    panelRefs = { c, rk: p.querySelector('.rk'), hp: p.querySelector('.hp i'), skill: p.querySelector('.skill'), fill: p.querySelector('.fill'), sp: p.querySelector('.sp'), pro: p.querySelector('.promote'), ret: p.querySelector('.retreat') };
    panelRefs.skill.onclick = () => G.useSkill(c);
    panelRefs.pro.onclick = () => { G.promote(c); };
    panelRefs.ret.onclick = () => G.retreat(c);
    placePanel(c); updatePanel(true);
    if (tut) tut.refocus();
  }
  function placePanel(c) {
    const p = $('unitPanel'), sr = stage.getBoundingClientRect(), cr = cv.getBoundingClientRect(), k = cr.width / (G.cols * TILE);
    const ux = cr.left - sr.left + c.cx * k, uy = cr.top - sr.top + c.cy * k, pw = p.offsetWidth, ph = p.offsetHeight;
    let x = ux + 34 * k; if (x + pw > sr.width - 4) x = ux - 34 * k - pw;
    x = Math.max(4, Math.min(x, sr.width - pw - 4)); const y = Math.max(4, Math.min(uy - ph / 2, sr.height - ph - 4));
    p.style.left = x + 'px'; p.style.top = y + 'px';
  }
  function updatePanel() {
    const r = panelRefs; if (!r) return; const c = r.c;
    if (!G.crew.includes(c)) return;
    const st = G.stat(c), pc = G.promoteCost(c);
    r.rk.textContent = c.lv ? '★'.repeat(c.lv) : ''; r.hp.style.width = Math.max(0, c.hp / st.maxHp * 100) + '%';
    const ready = c.sp >= c.spMax && c.skillT <= 0;
    r.skill.classList.toggle('ready', ready); r.fill.style.width = (c.skillT > 0 ? c.skillT / c.b.skill.dur : c.sp / c.spMax) * 100 + '%';
    r.sp.textContent = c.skillT > 0 ? 'ACTIVE' : ready ? 'TAP!' : Math.ceil(c.spMax - c.sp) + 's';
    r.pro.querySelector('small').textContent = pc == null ? 'MAX' : pc + ' DP'; r.pro.classList.toggle('cant', pc != null && G.dp < pc); r.pro.disabled = pc == null;
    r.ret.querySelector('small').textContent = '+' + G.refund(c) + ' DP';
  }

  /* ----- finish ----- */
  function onEnd(r) {
    if (!r.won) {
      save.losses[lvl.id] = (save.losses[lvl.id] || 0) + 1; persist();
      const tips = ['Guards (Brick, Tank) must stand on the floor path. Shooters need the raised decks.', 'Promote crewmates — it makes them much stronger.', 'Armored foes shrug off bullets. Sparky’s electricity ignores armor!', 'Flying foes can’t be blocked. Put shooters near the reactor.', 'Skills are powerful — tap a crewmate when the star lights up.', 'Lumi keeps guards alive. Put her on a deck near your front line.'];
      const hard = (save.losses[lvl.id] || 0) >= 2 && save.diff !== 'crew';
      setTimeout(() => {
        modal(`<h2 class="lose">The Signal got through</h2><p>${tips[(lvl.id + (save.losses[lvl.id] || 0)) % tips.length]}</p>${hard ? '<p class="reward">Too tough? Try “Crew” difficulty in Settings.</p>' : ''}<div class="row"><button class="btn primary" id="rRe">Try again</button><button class="btn" id="rMap">Mission map</button></div>`);
        $('rRe').onclick = () => beginGame(); $('rMap').onclick = () => { closeModal(); toHub(); };
      }, 900);
      return;
    }
    const prev = save.stars[lvl.id] || 0; save.stars[lvl.id] = Math.max(prev, r.stars); if (lvl.id === LEVELS.length) save.ended = true; persist();
    const nxt = LEVELS.find(l => l.id === lvl.id + 1), reward = nxt && nxt.newCrew && !prev ? `<div class="reward">NEW CREWMATE: ${CREW[nxt.newCrew].name} the ${CREW[nxt.newCrew].role}!</div>` : '';
    setTimeout(() => {
      modal(`<h2 class="win">Mission Complete!</h2><p>${lvl.name}</p><div class="bigstars">${[1, 2, 3].map(n => `<i class="${n <= r.stars ? 'on' : ''}" style="animation-delay:${n * .25}s">★</i>`).join('')}</div>
        <p>Ship health left: ${r.lives}/${G.maxLives} · Foes stopped: ${G.kills}</p>${reward}
        <div class="row"><button class="btn primary" id="rGo">${!prev ? 'Continue the story' : 'Mission map'}</button><button class="btn" id="rRe">Play again</button></div>`);
      $('rRe').onclick = () => beginGame();
      $('rGo').onclick = () => { closeModal(); if (!prev && lvl.post) dialog(lvl.post, lvl, afterStory); else afterStory(); };
    }, 1200);
  }
  function afterStory() {
    if (lvl.finale && !save.epilogue) { save.epilogue = true; persist(); cinematic(EPILOGUE, toHub); }
    else toHub();
  }

  /* ============================================================
     TUTORIAL (Mission 1)
     ============================================================ */
  function Tutorial() {
    this.i = -1; this.steps = TUTORIAL; this.done = false;
    $('tut').classList.remove('hidden'); paintPortrait($('tutPic'), CAST.juno);
    G.lock = a => this.lock(a);
    $('tutNext').onclick = () => { Sound.play('click'); this.next(); };
    $('tutSkip').onclick = () => this.finish(true);
    this.next();
  }
  Tutorial.prototype = {
    cur() { return this.steps[this.i]; },
    next() {
      const prev = this.cur();
      if (prev && prev.startWave && G.state === 'prep') G.startWave();
      this.i++; const s = this.cur(); if (!s) { this.finish(false); return; }
      $('tutTxt').textContent = s.text; G.hint = s.tile || null;
      G.frozen = s.mode === 'info';
      $('tutNext').classList.toggle('hidden', s.mode !== 'info'); $('tutNext').textContent = s.release ? 'Let’s go!' : 'Next';
      if (s.fillSP) { const b = G.crewAt(2, 2); if (b) { b.sp = b.spMax; b.ready = true; } }
      this.refocus();
    },
    refocus() {
      document.querySelectorAll('.tut-focus').forEach(e => e.classList.remove('tut-focus')); const s = this.cur(); if (!s || !s.focus) return;
      const el = document.querySelector(`[data-focus="${s.focus}"]`); el && el.classList.add('tut-focus');
    },
    on(evt) { const s = this.cur(); if (s && s.mode === 'action' && s.wait === evt) { if (s.wait === 'select:field') { /* keep panel open */ } this.next(); } },
    tick() { const s = this.cur(); if (s && s.wait === 'waveclear' && G.waveIdx >= 0 && !G.foes.length && !G.queue.length) this.next(); },
    lock(a) {
      const s = this.cur(); if (!s || this.done) return true;
      if (s.mode !== 'action') { return false; }
      const al = s.allow, w = s.wait || '';
      let ok = false;
      if (w.startsWith('select:') && w !== 'select:field') ok = a.kind === 'select-card' && a.type === w.split(':')[1];
      else if (w.startsWith('deploy:')) ok = (a.kind === 'select-card' && a.type === al.type) || (a.kind === 'deploy' && a.type === al.type && a.x === al.tile[0] && a.y === al.tile[1]);
      else if (w === 'select:field') ok = a.kind === 'select-crew' && a.c.x === al.select[0] && a.c.y === al.select[1];
      else if (w === 'skill') ok = a.kind === 'skill';
      if (!ok) tip(a.kind === 'deploy' ? 'Tap the glowing tile!' : 'Follow the Captain’s lead!');
      return ok;
    },
    finish(skipped) {
      if (this.done) return; this.done = true; G.lock = null; G.hint = null; G.frozen = false; G.autoWaves = true;
      document.querySelectorAll('.tut-focus').forEach(e => e.classList.remove('tut-focus')); $('tut').classList.add('hidden');
      if (skipped && G.state === 'prep') showBanner('Deploy your crew', 'then press START', false);
      save.tutDone = true; persist(); tut = null;
    }
  };

  /* ---------- Boot ---------- */
  Sound.setMusic(save.music); Sound.setSfx(save.sfx);
  if (window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('installNote').classList.add('hidden');
  toTitle();
  addEventListener('resize', () => { if (current === 'title') Backdrop.start($('titleBg'), true); });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !TEST) {
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { }));
  }
  if (TEST) window.__t = { G, save: () => save, playLevel, toHub, LEVELS, beginGame, setLevel: l => { lvl = l; }, persist, unlock: () => { LEVELS.forEach(l => { save.stars[l.id] = save.stars[l.id] || 1; }); persist(); } };
})();
