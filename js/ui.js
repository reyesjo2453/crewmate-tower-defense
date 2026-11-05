'use strict';
/* ============================================================
   UI: screens, story dialogue, mission map, HUD, tutorial, saves.
   ============================================================ */
(() => {
  const $ = id => document.getElementById(id);
  const TEST = /[?&]test/.test(location.search);
  const BUILD = 'v12'; // keep in step with VERSION in sw.js

  /* ---------- Save ---------- */
  const SAVE_KEY = 'crewmate-command-v1';
  const defaults = () => ({ stars: {}, diff: 'captain', music: true, sfx: true, intro: false, tutDone: false, seen: {}, losses: {}, ended: false, looks: {}, squads: {}, coach: {}, lookSeen: 0,
    mods: {}, xp: {}, ups: {}, st: {}, flags: {}, medals: {}, endless: {}, a11y: { cb: false, big: false, vib: true, calm: false, nums: true } });
  let mem = null;
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === 'object') return Object.assign(defaults(), s); } catch (e) { }
    return mem || defaults();
  }
  let save = loadSave();
  function applyPrefs() {
    STYLE.looks = save.looks; A11Y.cb = !!save.a11y.cb; JUICE.calm = !!save.a11y.calm; document.body.classList.toggle('calm', JUICE.calm); JUICE.nums = save.a11y.nums !== false;
    document.body.classList.toggle('big-ui', !!save.a11y.big);
  }
  applyPrefs();
  function persist() { mem = save; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }
  const unlocked = id => id === 1 || (save.stars[id - 1] || 0) > 0;
  const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
  const totalBolts = () => Object.values(save.mods).reduce((a, b) => a + b.length, 0);
  const crewLevel = k => xpLevel(save.xp[k] || 0);
  const pointsLeft = k => crewLevel(k) - Object.values(save.ups[k] || {}).reduce((a, b) => a + b, 0);
  const bestEndless = () => Math.max(0, ...Object.values(save.endless));
  const endlessOpen = () => (save.stars[ENDLESS.unlockAfter] || 0) > 0;
  const foeTags = d => [d.flying && 'FLIES', d.stealth && 'SNEAKY', d.ranged && 'SHOOTS', d.boss && 'BOSS', d.def >= 40 && 'ARMORED', d.splits && 'SPLITS',
    (d.burrow || d.drill) && 'BURROWS', d.drain && 'DRAINS DP', d.explodes && 'EXPLODES', d.steady && 'UNSLOWABLE',
    d.mend && 'HEALS FOES', d.ward && 'SHIELDS FOES', d.rally && 'SPEEDS UP FOES', d.songs && 'SINGS'].filter(Boolean);
  // a friendly buzz on phones for big moments (Settings → Vibration)
  function buzz(p) { try { if (save.a11y.vib && navigator.vibrate) navigator.vibrate(p); } catch (e) { } }
  // little pop-up for medals and level-ups
  function toast(html) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800);
  }
  /* ---------- Medals ---------- */
  function medalCtx() {
    return { st: save.st, flags: save.flags, stars: totalStars(), bolts: totalBolts(), best: bestEndless(), lvl: Math.max(0, ...CREW_ORDER.map(crewLevel)), looks: unlockedLooks().length };
  }
  function checkMedals(quiet) {
    const m = medalCtx(), fresh = MEDALS.filter(x => !save.medals[x.id] && x.test(m));
    fresh.forEach(x => { save.medals[x.id] = Date.now(); if (!quiet) toast(`<b>${x.icon} Medal: ${x.name}</b><small>${x.desc}</small>`); });
    if (fresh.length) { persist(); if (!quiet) Sound.play('medal'); }
    return fresh;
  }
  const bump = (k, n) => { save.st[k] = (save.st[k] || 0) + (n || 1); };

  /* ---------- Screens ---------- */
  let current = 'title';
  function show(id) {
    const was = current;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('hidden', s.id !== 's-' + id));
    const el = $('s-' + id); if (el && was !== id) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); clearTimeout(show.t); show.t = setTimeout(() => el.classList.remove('enter'), 650); }
    current = id; if (id !== 'game') { if (G) G.stop(); $('rotate').classList.add('hidden'); Sound.muffle(false); }
    if (id !== 'ward') Wardrobe.stop();
    if (id === 'title' || id === 'hub' || id === 'log' || id === 'set' || id === 'squad' || id === 'ward' || id === 'endless') Sound.mood('title');
    else if (id === 'dialog' || id === 'intro') Sound.mood('story');
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
  // each speaker's 'talking' blip pitch
  const VOICE = { juno: 330, brick: 200, tank: 140, rook: 262, lumi: 440, sparky: 560, echo: 392, hollow: 92, kestrel: 350, mimic: 175, ship: 620, wrench: 294, marshal: 220, bubbles: 660, friend: 247, static: 80, maestro: 130 };
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
    const pitch = VOICE[who] || 300;
    d.timer = setInterval(() => { n += 2; tx.textContent = text.slice(0, n); if (n % 4 === 0 && /\w/.test(text[n - 1] || '')) Sound.voice(pitch, (text.slice(n - 4, n).match(/[aeiouy]/i) || [])[0]); if (n >= text.length) { clearInterval(d.timer); d.typing = false; tx.textContent = text; } }, 22);
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
    $('hubStars').textContent = '★ ' + totalStars() + ' / ' + LEVELS.length * 3 + (totalBolts() ? '  ⚡ ' + totalBolts() : '');
    const crewDot = unlockedLooks().length > save.lookSeen || CREW_ORDER.some(k => reachedCrew().includes(k) && pointsLeft(k) > 0);
    $('hubWard').innerHTML = 'Crew' + (crewDot ? '<i class="dot"></i>' : '');
    $('hubEnd').classList.toggle('hidden', !endlessOpen()); $('hubEnd').textContent = '♾ Endless';
    let nextMarked = false; const paints = [];
    CHAPTERS.forEach(ch => {
      const sec = document.createElement('div'); sec.className = 'chapter';
      sec.innerHTML = `<h3 style="color:${ch.color}">Chapter ${ch.id}: ${ch.name}</h3><p>${ch.sub}</p>`;
      const grid = document.createElement('div'); grid.className = 'cards';
      LEVELS.filter(l => l.chapter === ch.id).forEach(l => {
        const ok = unlocked(l.id), st = save.stars[l.id] || 0, b = document.createElement('button');
        b.className = 'lvl' + (ok ? '' : ' locked'); b.style.animationDelay = (0.03 * (l.id % 6)) + 's'; b.disabled = !ok; b.setAttribute('aria-label', `Mission ${l.id}: ${l.name}${ok ? '' : ' (locked)'}`);
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
    document.querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('on', t.dataset.tab === logTab));
    const list = $('logList'); list.innerHTML = ''; const paints = [];
    const reach = Math.max(1, ...LEVELS.filter(l => unlocked(l.id)).map(l => l.id));
    if (logTab === 'crew') {
      CREW_ORDER.forEach(k => {
        const b = CREW[k], open = LEVELS.some(l => l.id <= reach && l.crew.includes(k));
        const e = document.createElement('div'); e.className = 'entry' + (open ? '' : ' lock');
        const c = document.createElement('canvas'); e.appendChild(c); paints.push([c, k]);
        e.insertAdjacentHTML('beforeend', open ? `<div><h4>${b.name}</h4><div class="role">${b.role}</div><p>${b.blurb}</p>
          <div class="stats"><span>LV ${crewLevel(k)}</span><span>HP ${b.hp}</span><span>${b.heal ? 'HEAL ' + b.heal : b.repair ? 'REPAIR ' + b.repair : b.shields ? 'SHIELDS' : 'ATK ' + b.atk}</span><span>${b.block ? 'BLOCKS ' + b.block : 'RANGE ' + b.range}</span><span>DEF ${b.def}</span><span>COST ${b.cost}</span></div>
          <p><b>Skill — ${b.skill.name}:</b> ${b.skill.desc}</p>${combosFor(k).map(cb => `<p class="combo-line" style="--cc:${cb.color}"><b>${cb.icon} ${cb.name}</b> (with ${CREW[cb.pair[0] === k ? cb.pair[1] : cb.pair[0]].name}): ${cb.desc}</p>`).join('')}</div>` : `<div><h4>???</h4><p>Reach a later mission to wake this crewmate.</p></div>`);
        list.appendChild(e);
      });
    } else if (logTab === 'medals') {
      const got = MEDALS.filter(m => save.medals[m.id]).length;
      list.insertAdjacentHTML('beforeend', `<p class="medal-sum">${got} / ${MEDALS.length} medals</p>`);
      const grid = document.createElement('div'); grid.className = 'medals';
      MEDALS.forEach(m => { const on = !!save.medals[m.id]; grid.insertAdjacentHTML('beforeend', `<div class="medal${on ? ' on' : ''}"><i>${on ? m.icon : '🔒'}</i><b>${m.name}</b><small>${m.desc}</small></div>`); });
      list.appendChild(grid);
    } else {
      Object.keys(FOES).forEach(k => {
        const f = FOES[k], open = save.seen[k];
        const e = document.createElement('div'); e.className = 'entry' + (open ? '' : ' lock');
        const c = document.createElement('canvas'); e.appendChild(c); paints.push([c, k]);
        const tags = foeTags(f);
        e.insertAdjacentHTML('beforeend', open ? `<div><h4>${f.name}</h4><div class="role">${f.boss ? 'Boss' : 'Foe'}</div><p>${f.lore}</p>
          <div class="stats"><span>HP ${f.hp}</span><span>SPD ${f.spd}</span><span>DEF ${f.def}</span>${tags.map(t => `<span>${t}</span>`).join('')}</div><p><b>Tip:</b> ${f.tip}</p></div>` : `<div><h4>???</h4><p>You haven’t met this one yet.</p></div>`);
        list.appendChild(e);
      });
    }
    requestAnimationFrame(() => paints.forEach(([c, k]) => paintPortrait(c, k, true)));
  }
  document.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { logTab = t.dataset.tab; Sound.play('click'); renderLog(); });
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
    $('optMusic').checked = save.music; $('optSfx').checked = save.sfx; soundInfo();
    $('optCb').checked = !!save.a11y.cb; $('optBig').checked = !!save.a11y.big; $('optVib').checked = save.a11y.vib !== false; $('optCalm').checked = !!save.a11y.calm; $('optNums').checked = save.a11y.nums !== false;
  }
  $('optCb').onchange = e => { save.a11y.cb = e.target.checked; applyPrefs(); persist(); };
  $('optBig').onchange = e => { save.a11y.big = e.target.checked; applyPrefs(); persist(); };
  $('optVib').onchange = e => { save.a11y.vib = e.target.checked; persist(); buzz(60); };
  $('optCalm').onchange = e => { save.a11y.calm = e.target.checked; applyPrefs(); persist(); };
  $('optNums').onchange = e => { save.a11y.nums = e.target.checked; applyPrefs(); persist(); };
  $('optMusic').onchange = e => { save.music = e.target.checked; Sound.setMusic(save.music); persist(); };
  $('optSfx').onchange = e => { save.sfx = e.target.checked; Sound.setSfx(save.sfx); persist(); Sound.play('click'); };
  /** a small status line, so a player (or a grown-up helping) can see the sound engine is alive */
  function soundInfo() {
    const h = Sound.health(), st = { running: 'on', suspended: 'paused — tap anywhere', interrupted: 'paused by the device — tap anywhere', none: 'starts on your first tap' }[h.state] || h.state;
    $('soundInfo').textContent = 'Sound: ' + st + (h.rate ? ' · ' + (h.rate / 1000).toFixed(1) + ' kHz' : '') + (h.heals ? ' · restarted ' + h.heals + '×' : '') + ' · game ' + BUILD;
  }
  $('btnFixSound').onclick = () => { Sound.repair(); $('btnFixSound').textContent = '🔊 Sound restarted ✓'; setTimeout(soundInfo, 400); };
  $('btnTutAgain').onclick = () => { save.tutDone = false; persist(); $('btnTutAgain').textContent = 'Tutorial will play in Mission 1 ✓'; };
  $('btnReset').onclick = () => confirmBox('Reset everything?', 'This erases your stars, unlocks and logbook.', 'Reset', () => { save = defaults(); applyPrefs(); persist(); Sound.setMusic(save.music); Sound.setSfx(save.sfx); renderSettings(); });
  $('setBack').onclick = () => { Sound.play('click'); toTitle(); };

  /* ----- save transfer: the whole save as one copy-and-paste code ----- */
  const CODE_TAG = 'CREW1-';
  function sum(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h.toString(36).slice(-4).padStart(4, '0'); }
  function saveCode() {
    const body = btoa(unescape(encodeURIComponent(JSON.stringify(save))));
    return CODE_TAG + sum(body) + body;
  }
  function readCode(code) {
    code = (code || '').replace(/\s+/g, '');
    if (!code.startsWith(CODE_TAG)) return { err: 'That doesn’t look like a save code. It should start with ' + CODE_TAG };
    const ck = code.slice(CODE_TAG.length, CODE_TAG.length + 4), body = code.slice(CODE_TAG.length + 4);
    if (sum(body) !== ck) return { err: 'Part of the code is missing or changed. Try copying the whole thing again.' };
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(body))));
      if (!d || typeof d !== 'object' || typeof d.stars !== 'object') throw 0;
      const out = Object.assign(defaults(), d); out.a11y = Object.assign(defaults().a11y, d.a11y || {});
      return { save: out };
    } catch (e) { return { err: 'That code couldn’t be read. Try copying the whole thing again.' }; }
  }
  function copyText(text, ta, btn) {
    const ok = () => { btn.textContent = 'Copied! ✓'; Sound.play('click'); };
    const old = () => { ta.focus(); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { btn.textContent = 'Select and copy it'; } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, old); else old();
  }
  $('btnExport').onclick = () => {
    Sound.play('click'); const code = saveCode();
    modal(`<h2>Your save code</h2><p class="tiny">${totalStars()} ★ · ${Object.keys(save.stars).length} missions. Paste this into “Load a save code” on your other device.</p>
      <textarea class="codebox" id="codeOut" readonly>${code}</textarea><div class="row"><button class="btn primary" id="cCopy">Copy</button><button class="btn" id="cClose">Done</button></div>`);
    const ta = $('codeOut'); ta.onclick = () => ta.select();
    $('cCopy').onclick = () => copyText(code, ta, $('cCopy')); $('cClose').onclick = closeModal;
  };
  $('btnImport').onclick = () => {
    Sound.play('click');
    modal(`<h2>Load a save code</h2><p class="tiny">This replaces the progress on this device.</p>
      <textarea class="codebox" id="codeIn" placeholder="Paste your ${CODE_TAG}… code here" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
      <p class="tiny" id="codeMsg"></p><div class="row"><button class="btn primary" id="cLoad">Load</button><button class="btn" id="cCancel">Cancel</button></div>`);
    $('cCancel').onclick = closeModal;
    $('cLoad').onclick = () => {
      const r = readCode($('codeIn').value);
      if (r.err) { $('codeMsg').textContent = r.err; $('codeIn').classList.add('bad'); Sound.play('deny'); return; }
      const st = Object.values(r.save.stars).reduce((a, b) => a + b, 0);
      confirmBox('Replace this save?', `Load the save with ${st} ★ and ${Object.keys(r.save.stars).length} missions cleared? Progress on this device will be replaced.`, 'Load it', () => {
        save = r.save; applyPrefs(); persist(); Sound.setMusic(save.music); Sound.setSfx(save.sfx); renderSettings(); toast('💾 Save loaded!');
      });
    };
  };

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
  $('hubWard').onclick = () => { Sound.ensure(); Sound.play('click'); Wardrobe.open('hub'); };
  $('hubEnd').onclick = () => { Sound.ensure(); Sound.play('click'); toEndless(); };

  /* ============================================================
     WARDROBE (hats, visors and pets, unlocked with stars)
     ============================================================ */
  const unlockedLooks = () => Object.values(LOOKS).flat().filter(i => (i.stars > 0 || i.bolts) && lookOpen(i, totalStars(), totalBolts()));
  const reachedCrew = () => { const reach = Math.max(1, ...LEVELS.filter(l => unlocked(l.id)).map(l => l.id)); return CREW_ORDER.filter(k => LEVELS.some(l => l.id <= reach && l.crew.includes(k))); };
  const Wardrobe = (() => {
    let who = 'brick', from = 'hub', raf = 0, tab = 'train';
    const SLOTS = [['hat', 'Hats'], ['visor', 'Visors'], ['pet', 'Pets']];
    function open(f, k) {
      from = f || 'hub'; const crew = reachedCrew(); who = k && crew.includes(k) ? k : crew.includes(who) ? who : crew[0];
      show('ward'); Backdrop.stop(); $('wStars').textContent = '★ ' + totalStars() + (totalBolts() ? ' ⚡ ' + totalBolts() : '');
      if (from === 'squad') tab = 'style';
      const ul = unlockedLooks().length, fresh = ul > save.lookSeen; save.lookSeen = ul; persist();
      const bar = $('wCrew'); bar.innerHTML = '';
      crew.forEach(k => { const b = document.createElement('button'); b.dataset.k = k; b.setAttribute('aria-label', CREW[k].name); b.innerHTML = '<canvas></canvas><span class="lv"></span>'; b.onclick = () => { who = k; Sound.play('click'); render(); }; bar.appendChild(b); });
      render(); loop(); if (fresh) tipLater('New styles unlocked! ✨'); checkMedals();
    }
    function tipLater(t) { setTimeout(() => { if (current === 'ward') { const el = $('wStars'); el.textContent = t; setTimeout(() => { el.textContent = '★ ' + totalStars(); }, 2600); } }, 200); }
    function render() {
      $('wCrew').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.k === who); paintPortrait(b.querySelector('canvas'), b.dataset.k); b.querySelector('.lv').textContent = 'Lv ' + crewLevel(b.dataset.k) + (pointsLeft(b.dataset.k) > 0 ? ' •' : ''); });
      document.querySelectorAll('[data-wtab]').forEach(b => b.classList.toggle('on', b.dataset.wtab === tab));
      if (tab === 'train') { training(); return; }
      const box = $('wItems'); box.innerHTML = ''; const cur = save.looks[who] || {}, have = totalStars(), bolts = totalBolts(), paints = [];
      for (const [slot, title] of SLOTS) {
        box.insertAdjacentHTML('beforeend', `<h3>${title}</h3>`); const grid = document.createElement('div'); grid.className = 'w-grid';
        for (const it of LOOKS[slot]) {
          const lock = !lookOpen(it, have, bolts), on = (cur[slot] || LOOKS[slot][0].id) === it.id, b = document.createElement('button');
          b.className = 'item' + (on ? ' on' : '') + (lock ? ' lock' : '') + (it.bolts ? ' bolt' : ''); b.dataset.slot = slot; b.dataset.id = it.id;
          const need = it.bolts ? '⚡ ' + it.bolts : '★ ' + it.stars;
          b.setAttribute('aria-label', it.name + (lock ? ', needs ' + (it.bolts ? it.bolts + ' challenge bolts' : it.stars + ' stars') : ''));
          b.innerHTML = `<canvas></canvas><span>${lock ? need : it.name}</span>`;
          b.onclick = () => {
            if (lock) { Sound.play('deny'); return; }
            save.looks[who] = Object.assign({}, save.looks[who], { [slot]: it.id }); STYLE.looks = save.looks; persist(); Sound.play('promote'); render();
          };
          grid.appendChild(b); paints.push([b.querySelector('canvas'), slot, it]);
        }
        box.appendChild(grid);
      }
      requestAnimationFrame(() => paints.forEach(([c, slot, it]) => paintItem(c, slot, it)));
    }
    function training() {
      const box = $('wItems'), b = CREW[who], xp = save.xp[who] || 0, lv = crewLevel(who), pts = pointsLeft(who), u = save.ups[who] || {};
      const lo = XP_LEVELS[lv], hi = XP_LEVELS[lv + 1], frac = hi ? (xp - lo) / (hi - lo) : 1;
      box.innerHTML = `<div class="train"><h3>${b.name} · ${b.role}</h3><div class="lvrow"><b>Level ${lv}</b><span>${hi ? xp + ' / ' + hi + ' XP' : 'MAX LEVEL'}</span></div>
        <div class="xpbar"><i style="width:${Math.round(frac * 100)}%"></i></div>
        <p class="pts">${pts > 0 ? `<b>${pts}</b> upgrade point${pts > 1 ? 's' : ''} to spend!` : lv < XP_MAX_LEVEL ? 'Go on missions to earn XP and level up.' : 'Fully trained!'}</p>
        <div class="ups"></div><p class="tiny">${b.blurb}<br><b>Skill — ${b.skill.name}:</b> ${b.skill.desc}</p>
        <button class="btn small ghost" id="wReset">Reset points</button></div>`;
      const ups = box.querySelector('.ups');
      UPGRADES.forEach(up => {
        const r = u[up.id] || 0, row = document.createElement('div'); row.className = 'up';
        row.innerHTML = `<i>${up.icon}</i><div><b>${up.name}</b><small>${up.desc} per rank</small><span class="pips">${Array.from({ length: up.max }, (_, i) => `<em class="${i < r ? 'on' : ''}"></em>`).join('')}</span></div><button class="btn small" data-up="${up.id}" ${pts <= 0 || r >= up.max ? 'disabled' : ''}>+</button>`;
        row.querySelector('button').onclick = () => { save.ups[who] = Object.assign({}, u, { [up.id]: r + 1 }); persist(); Sound.play('promote'); render(); };
        ups.appendChild(row);
      });
      $('wReset').onclick = () => { save.ups[who] = {}; persist(); Sound.play('retreat'); render(); };
    }
    document.querySelectorAll('[data-wtab]').forEach(b => b.onclick = () => { tab = b.dataset.wtab; Sound.play('click'); render(); });
    function paintItem(cv, slot, it) {
      const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth || 70, h = cv.clientHeight || 58; cv.width = w * dpr; cv.height = h * dpr;
      const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); const b = CREW[who], lk = lookFor(who);
      if (slot === 'pet') { if (it.id === 'none') { ctx.fillStyle = '#4a5278'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('—', w / 2, h * 0.62); } else drawPet(ctx, it.id, w / 2, h * 0.86, h * 0.95, 0.4, b.color, 1); return; }
      const hat = slot === 'hat' ? (it.id === 'signature' ? b.hat : it.id) : lk.hat, visor = slot === 'visor' ? it.c : lk.visor;
      drawCrewmate(ctx, w / 2, h * (slot === 'hat' ? 1.18 : 1.05), h * (slot === 'hat' ? 0.95 : 1.05), { color: b.color, hat, visor, facing: 1, t: 0, idle: false, noShadow: true });
    }
    function loop() {
      cancelAnimationFrame(raf); const cv = $('wPreview'); const t0 = performance.now();
      const frame = now => {
        raf = requestAnimationFrame(frame); const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
        const t = (now - t0) / 1000, b = CREW[who], lk = lookFor(who), s = Math.min(h * 0.75, w * 0.7);
        drawCrewmate(ctx, w / 2 + s * 0.12, h * 0.9, s, { color: b.color, hat: lk.hat, visor: lk.visor, pet: lk.pet, facing: 1, t, idle: true, wide: b.block >= 3 ? 1.15 : 1 });
        ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.name, w / 2, 24);
      };
      raf = requestAnimationFrame(frame);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; }
    $('wBack').onclick = () => { Sound.play('click'); stop(); from === 'squad' ? toSquad() : toHub(); };
    return { open, stop };
  })();

  /* ============================================================
     SQUAD SELECT
     ============================================================ */
  let squad = null, chosenMods = []; const preSeen = new Set();
  const sqKey = () => lvl.endless ? 'e' + lvl.id : lvl.id;
  const seats = () => lvl.endless ? Math.min(lvl.crew.length, ENDLESS.squad + (DIFFICULTY[save.diff].easy ? 1 : 0)) : squadSize(lvl, save.diff);
  const benched = k => chosenMods.includes('nomed') && !!(CREW[k].heal || CREW[k].shields);
  const needsSquad = () => lvl.crew.length > seats();
  const needsBrief = () => needsSquad() || !!lvl.endless || (wasCleared && modsFor(lvl).length > 0);
  function defaultSquad() {
    const size = seats(), pref = SQUAD_PREF.concat(CREW_ORDER);
    const prev = (save.squads[sqKey()] || []).filter(k => lvl.crew.includes(k));
    const out = lvl.newCrew && !benched(lvl.newCrew) ? [lvl.newCrew] : [];
    for (const k of [...prev, ...pref]) if (lvl.crew.includes(k) && !benched(k) && !out.includes(k) && out.length < size) out.push(k);
    return out;
  }
  function toSquad() {
    show('squad'); Backdrop.stop();
    if (!squad || !squad.every(k => lvl.crew.includes(k) && !benched(k))) squad = defaultSquad();
    const size = seats(), pick = needsSquad(), canMod = wasCleared && !lvl.endless;
    $('sqTitle').textContent = lvl.endless ? 'Endless run' : pick ? 'Choose your squad' : 'Mission briefing';
    $('sqIntro').innerHTML = lvl.endless ? `<b>Endless · ${lvl.name}</b> — waves keep coming and keep getting tougher. Pick <b>${size}</b> crewmates. How long can you last?`
      : `<b>Mission ${lvl.id}: ${lvl.name}</b> — ${pick ? `pick up to <b>${size}</b> crewmates. Read the intel and bring the right answers!` : 'read the intel, then deploy.'}`;
    $('sqCrewWrap').classList.toggle('hidden', !pick);
    const box = $('sqCrew'); box.innerHTML = '';
    const draw = () => {
      box.querySelectorAll('.pick').forEach(b => { const k = b.dataset.k, on = squad.includes(k); b.classList.toggle('on', on); b.classList.toggle('off', (!on && squad.length >= size) || benched(k)); b.classList.toggle('bench', benched(k)); b.setAttribute('aria-pressed', on); });
      $('sqCount').innerHTML = pick ? `<b>${squad.length}</b> / ${size} seats` : chosenMods.length ? `<b>${chosenMods.length}</b> challenge${chosenMods.length > 1 ? 's' : ''} on` : '';
      $('sqGo').disabled = pick && !squad.length;
      const team = pick ? squad : lvl.crew.filter(k => !benched(k)), cbs = COMBOS.filter(cb => cb.pair.every(k => team.includes(k)));
      $('sqCombos').innerHTML = cbs.length ? `<b>Combos in this squad</b> <small>(stand them within 2 tiles)</small>` + cbs.map(cb => `<span class="combo-chip" style="--cc:${cb.color}" title="${cb.desc}">${cb.icon} ${cb.name}<small>${CREW[cb.pair[0]].name} + ${CREW[cb.pair[1]].name}</small></span>`).join('') : '';
    };
    if (pick) lvl.crew.forEach(k => {
      const b = CREW[k], el = document.createElement('button'); el.className = 'pick'; el.dataset.k = k;
      el.innerHTML = `${k === lvl.newCrew ? '<span class="new">NEW</span>' : ''}<canvas></canvas><div class="nm">${b.name}<small> Lv${crewLevel(k)}</small></div><div class="rl">${b.role}</div><div class="cs">${b.cost} DP · ${b.ground === 'path' ? 'floor' : 'deck'}</div>`;
      el.onclick = () => {
        if (benched(k)) { tipSquad('No Medics challenge — ' + b.name + ' stays home.'); Sound.play('deny'); return; }
        if (k === lvl.newCrew && squad.includes(k)) { tipSquad(b.name + ' insists on coming — it’s their big day!'); Sound.play('deny'); return; }
        if (squad.includes(k)) squad = squad.filter(x => x !== k);
        else if (squad.length < size) squad.push(k);
        else { tipSquad('Squad is full — tap someone to swap them out.'); Sound.play('deny'); return; }
        Sound.play('click'); draw();
      };
      box.appendChild(el);
    });
    // challenges (only on missions you've already won)
    $('sqModsWrap').classList.toggle('hidden', !canMod);
    const mb = $('sqMods'); mb.innerHTML = '';
    if (canMod) {
      const beaten = save.mods[lvl.id] || [];
      $('sqModsSum').textContent = `⚡ ${beaten.length} / ${modsFor(lvl).length} earned on this mission`;
      modsFor(lvl).forEach(k => {
        const m = MODIFIERS[k], el = document.createElement('button'); el.className = 'mod' + (chosenMods.includes(k) ? ' on' : '') + (beaten.includes(k) ? ' won' : ''); el.dataset.mod = k;
        el.innerHTML = `<i>${m.icon}</i><b>${m.name}</b><small>${m.desc}</small>${beaten.includes(k) ? '<em>⚡</em>' : ''}`;
        el.setAttribute('aria-pressed', chosenMods.includes(k));
        el.onclick = () => {
          chosenMods = chosenMods.includes(k) ? chosenMods.filter(x => x !== k) : chosenMods.concat(k); Sound.play('click');
          if (k === 'nomed') squad = null; toSquad();
        };
        mb.appendChild(el);
      });
    }
    const intel = $('sqIntel'); intel.innerHTML = '';
    const foes = [...new Set(lvl.waves.flatMap(w => w.spawns.map(s => s.type)))], paints = [];
    foes.forEach(f => {
      const d = FOES[f], tags = foeTags(d);
      const el = document.createElement('div'); el.className = 'intel'; el.title = d.tip; el.innerHTML = `<canvas></canvas><div>${d.name}<small>${tags.join(' · ') || 'WALKS'}</small></div>`;
      intel.appendChild(el); paints.push([el.querySelector('canvas'), f]);
    });
    if (lvl.endless) intel.insertAdjacentHTML('beforeend', `<div class="intel hz">🎲 Remixed foes<small>TOUGHER EVERY WAVE</small></div><div class="intel hz">⚠ Boss<small>EVERY ${ENDLESS.bossEvery} WAVES</small></div><div class="intel hz">🚨 Sabotage<small>EVERY ${ENDLESS.saboEvery} WAVES</small></div><div class="intel hz">🏆 Best<small>WAVE ${save.endless[lvl.id] || 0}</small></div>`);
    if (lvl.doors && !chosenMods.includes('nodoors')) intel.insertAdjacentHTML('beforeend', `<div class="intel hz">🚪 ${lvl.doors.length} door${lvl.doors.length > 1 ? 's' : ''}<small>TAP TO SLAM</small></div>`);
    if (lvl.sabo) [...new Set(Object.values(lvl.sabo))].forEach(k => intel.insertAdjacentHTML('beforeend', `<div class="intel hz">${SABOTAGE[k].icon} ${SABOTAGE[k].name}<small>SABOTAGE</small></div>`));
    draw();
    requestAnimationFrame(() => { box.querySelectorAll('.pick').forEach(el => paintPortrait(el.querySelector('canvas'), el.dataset.k)); paints.forEach(([c, f]) => paintPortrait(c, f)); });
  }
  function tipSquad(t) { const el = $('sqCount'); el.textContent = t; clearTimeout(tipSquad.t); tipSquad.t = setTimeout(() => { if (current === 'squad') el.innerHTML = `<b>${squad.length}</b> / ${seats()} seats`; }, 2200); }
  $('sqBack').onclick = () => { Sound.play('click'); lvl && lvl.endless ? toEndless() : toHub(); };
  $('sqWard').onclick = () => { Sound.play('click'); Wardrobe.open('squad', squad[0]); };
  $('sqGo').onclick = () => { if (needsSquad() && !squad.length) return; Sound.ensure(); Sound.play('deploy'); if (needsSquad()) { save.squads[sqKey()] = squad.slice(); persist(); } beginGame(); };

  /* ============================================================
     ENDLESS MODE
     ============================================================ */
  function makeEndless(base) {
    return Object.assign({}, base, { endless: true, crew: reachedCrew(), waves: [], sabo: null, pre: null, post: null, radio: null, tutorial: false, newCrew: null, finale: false, finale2: false });
  }
  function toEndless() {
    show('endless'); Backdrop.stop(); const list = $('endList'); list.innerHTML = '';
    $('endBest').textContent = '♾ Best: wave ' + bestEndless();
    const grid = document.createElement('div'); grid.className = 'cards';
    LEVELS.filter(l => (save.stars[l.id] || 0) > 0).forEach(l => {
      const b = document.createElement('button'); b.className = 'lvl';
      const thumb = renderBoard(l, 22); thumb.style.width = '100%'; thumb.style.height = '118px'; b.appendChild(thumb);
      b.insertAdjacentHTML('beforeend', `<div class="stars">♾ ${save.endless[l.id] || 0}</div><div class="meta"><div class="num">${THEMES[l.theme].name.toUpperCase()}</div><div class="nm">${l.name}</div><div class="pl">Best: ${save.endless[l.id] ? 'wave ' + save.endless[l.id] : 'not tried yet'}</div></div>`);
      b.onclick = () => { Sound.ensure(); Sound.play('click'); lvl = makeEndless(l); wasCleared = false; squad = null; chosenMods = []; toSquad(); };
      grid.appendChild(b);
    });
    list.appendChild(grid);
  }
  $('endBack').onclick = () => { Sound.play('click'); toHub(); };

  /* ============================================================
     GAME CONTROLLER
     ============================================================ */
  const cv = $('cv'), stage = $('stage');
  let G = null, lvl = null, tut = null, tipTimer = 0, lastHud = {}, wasCleared = false, forceTut = false, coachT = 0, hintT = 0, showMe = null;

  function playLevel(id) {
    lvl = LEVELS.find(l => l.id === id); wasCleared = (save.stars[id] || 0) > 0; squad = null; chosenMods = [];
    const go = () => { if (needsBrief()) toSquad(); else beginGame(); };
    if (!wasCleared && lvl.pre && !preSeen.has(id)) { preSeen.add(id); dialog(lvl.pre, lvl, go); } else go();
  }

  function beginGame() {
    closeModal(); show('game'); Backdrop.stop();
    const runTut = !!lvl.tutorial && (!save.tutDone || forceTut); forceTut = false;
    lvl.waves.forEach(w => w.spawns.forEach(s => { save.seen[s.type] = true; })); persist();
    G.start(lvl, save.diff, { autoWaves: !runTut, squad: needsSquad() ? squad : null, mods: lvl.endless ? [] : chosenMods, ups: save.ups });
    $('bossIntro').classList.add('hidden'); G.hint = null;
    buildCards(); lastHud = {}; fit(); G.run(); hud(true);
    Sound.mood('battle'); Sound.intensity(0); Sound.danger(0); if (save.music) Sound.startMusic();
    $('tut').classList.add('hidden'); $('unitPanel').classList.add('hidden'); $('radio').classList.add('hidden'); clearTimeout(radioPend); clearTimeout(radioT);
    tut = null; G.frozen = false;
    if (runTut) tut = new Tutorial(); else if (lvl.endless) showBanner('ENDLESS', 'How long can you last?', false); else showBanner(chosenMods.length ? 'CHALLENGE ON ' + chosenMods.map(k => MODIFIERS[k].icon).join(' ') : 'Deploy your crew', 'then press START', false);
    $('btnSpeed').innerHTML = '1&times;';
    clearTimeout(coachT); showMe = null;
    const nc = lvl.newCrew;
    if (!runTut && nc && SHOWME[nc] && !save.coach['new_' + nc] && G.avail.includes(nc)) {
      showMe = { type: nc };
      coachT = setTimeout(() => { if (G.level !== lvl || !showMe) return; radio(nc, SHOWME[nc].say, 11000); pointShowMe(); }, 900);
    } else doorCoach(1400);
    if (innerHeight > innerWidth * 1.1) { const r = $('rotate'); r.classList.remove('hidden'); r.style.animation = 'none'; r.offsetHeight; r.style.animation = ''; setTimeout(() => r.classList.add('hidden'), 6000); }
  }
  function doorCoach(ms) {
    if (tut || !G.doors.length || save.coach.door) return;
    const d = G.doors[0]; coachT = setTimeout(() => { if (G.level !== lvl) return; radio(DOOR.coach[0], DOOR.coach[1], 10000); G.hint = [d.x, d.y]; coachT = setTimeout(() => { if (!tut) G.hint = null; }, 9000); }, ms);
  }
  // glow the new crewmate's card and the best tile for them, until they're placed
  function pointShowMe() {
    if (!showMe) return;
    const card = document.querySelector(`.card[data-type="${showMe.type}"]`); if (card) { card.classList.add('tut-focus'); card.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    const h = G.suggest(showMe.type); G.hint = h ? [h.x, h.y] : null;
  }
  function doneShowMe(placed) {
    if (!showMe) return; const k = showMe.type; showMe = null;
    document.querySelectorAll('.card.tut-focus').forEach(c => c.classList.remove('tut-focus'));
    if (!placed) return;
    save.coach['new_' + k] = true; persist(); G.hint = null;
    if (SHOWME[k].after) { clearTimeout(radioPend); radioPend = setTimeout(() => radio(k, SHOWME[k].after, 7000), 500); }
    doorCoach(5000);
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
  function radio(who, text, ms) {
    const c = CAST[who] || CAST.juno; paintPortrait($('radioPic'), CAST[who] ? who : c); $('radioName').textContent = c.name; $('radioTxt').textContent = text; Sound.chatter(VOICE[who] || 300, Math.min(9, 3 + Math.round(text.length / 18)));
    $('radio').classList.remove('hidden'); clearTimeout(radioT); radioT = setTimeout(() => $('radio').classList.add('hidden'), ms || 6500);
  }

  /* ----- game events ----- */
  G = new Game(cv, {
    emit(name, d, e) {
      switch (name) {
        case 'sfx': Sound.play(d, e); break;
        case 'deny': if (current === 'game') { tip(d); Sound.play('deny'); } break;
        case 'wave':
          showBanner(d.last ? 'FINAL WAVE' : 'WAVE ' + d.n + ' / ' + d.total, d.last ? 'Hold the line!' : '', d.last); 
          if (d.radio) { clearTimeout(radioPend); radioPend = setTimeout(() => radio(d.radio[0], d.radio[1]), 1200); } break;
        case 'boss': bossIntro(d); break;
        case 'kill': bump('kills'); bump(d.type); save.seen[d.type] = true; break;
        case 'final-kill': showBanner('ALL CLEAR!', '', false); break;
        case 'drill': tip('It drilled underground — wait for it to surface!'); buzz(80); break;
        case 'build': if (!save.coach.build) { save.coach.build = true; radio('wrench', 'Barricade up! It holds back two foes. I’ll keep patching it — you keep me alive!', 7000); } break;
        case 'boss-call': tip(d.name + ' calls for backup!'); break;
        case 'song': tip(SONGS[d].tip); buzz(40); break;
        case 'combo': {
          bump('combos'); if (new Set(G.links.map(l => l.cb.id)).size >= 3) save.flags.team = true;
          const ck = 'combo_' + d.cb.id;
          if (!save.coach[ck] && !tut) { save.coach[ck] = true; persist(); clearTimeout(radioPend); radio(d.cb.pair[0], `${d.cb.icon} COMBO — ${d.cb.name}! ${d.cb.desc}`, 7500); }
          else tip(`${d.cb.icon} Combo: ${d.cb.name}!`);
          break;
        }
        case 'door': bump('doors'); if (!save.coach.door) { save.coach.door = true; persist(); if (G.hint && G.doorAt(G.hint[0], G.hint[1])) G.hint = null; } break;
        case 'door-smash': tip('Bosses smash right through doors!'); buzz(90); break;
        case 'sabotage': {
          buzz([80, 40, 80]);
          showBanner('⚠ SABOTAGE', d.def.name, true); tip(d.def.desc);
          const ck = 'sabo_' + d.kind; if (!save.coach[ck]) { save.coach[ck] = true; persist(); clearTimeout(radioPend); radioPend = setTimeout(() => radio(d.def.coach[0], d.def.coach[1], 9000), 900); }
          break;
        }
        case 'sabotage-end': if (d.fixed) { bump('fixes'); if (d.kind === 'reactor' && d.left < 5) save.flags.cool = true; }
          tip(d.fixed ? 'Fixed! Nice work, Commander.' : d.kind === 'reactor' ? 'The reactor overheated!' : SABOTAGE[d.kind].name + ' wore off.'); break;
        case 'placing': syncCards(); if (d) tut && tut.on('select:' + d); break;
        case 'select': renderPanel(d); if (d) tut && tut.on('select:field'); break;
        case 'deploy': tut && tut.on('deploy:' + d.type);
          if (showMe) { if (d.type === showMe.type) doneShowMe(true); else pointShowMe(); }
          else if (!tut && G.hint) G.hint = null; break;
        case 'skill': Sound.bark(VOICE[d.type] || 300, d.type === 'tank' || d.type === 'brick'); bump('skills'); tut && tut.on('skill'); break;
        case 'promote': bump('promotes'); break;
        case 'leak': if (d) { pop(); buzz(50); } break;
        case 'end': onEnd(d); break;
        case 'frame': frame(); break;
      }
    }
  });
  // a dramatic card the first time each boss shows up
  function bossIntro(def) {
    const key = Object.keys(FOES).find(k => FOES[k] === def), first = !save.coach['boss_' + key];
    showBanner('⚠ BOSS', def.name, true); buzz([120, 60, 220]);
    if (!first || tut) return;
    save.coach['boss_' + key] = true; persist();
    const el = $('bossIntro'); $('biName').textContent = def.name; $('biLore').textContent = def.lore; $('biTip').textContent = def.tip;
    el.classList.remove('hidden'); el.style.animation = 'none'; el.offsetHeight; el.style.animation = '';
    paintPortrait($('biPic'), key, true); Sound.play('bossIntro'); G.frozen = true;
    let t = 0; const done = () => { clearTimeout(t); el.onclick = null; el.classList.add('hidden'); if (!tut) G.frozen = false; };
    t = setTimeout(done, 3200); el.onclick = done;
  }
  $('btnHint').onclick = () => {
    Sound.ensure(); if (tut) { tip('Follow the Captain first!'); return; }
    if (G.state === 'won' || G.state === 'lost') return;
    const h = G.suggest(); Sound.play('click');
    if (!h) { tip('Looking good, Commander! Hold the line.'); return; }
    if (h.promote) { G.placing = null; syncCards(); G.select(h.promote); tip('Try promoting ' + h.promote.b.name + ' — tap PROMOTE!'); return; }
    const b = CREW[h.type]; G.hint = [h.x, h.y]; clearTimeout(hintT); hintT = setTimeout(() => { if (!tut) G.hint = null; }, 6000);
    if (h.wait) tip(`Save up ${b.cost} DP for ${b.name}, then place them on the glowing tile.`);
    else { if (G.placing !== h.type) G.setPlacing(h.type); tip(`Try ${b.name} on the glowing tile!`); }
  };
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
    const p = G.progress(), left = G.nextWaveIn(); const wt = G.endless ? `♾ Wave ${p.wave}` : p.wave ? `Wave ${p.wave}/${p.total}` : `Wave 0/${p.total}`;
    if (L.wt !== wt) { $('waveTxt').textContent = wt; L.wt = wt; }
    let nb = '';
    if (G.state === 'prep') nb = '▶ START'; else if (G.waveIdx < p.total - 1) nb = '⏩ NEXT' + (left != null && G.autoWaves ? ' ' + Math.ceil(left) + 's' : ''); else nb = G.foes.length + G.queue.length + ' left';
    if (L.nb !== nb) { const b = $('btnNext'); b.innerHTML = nb; b.disabled = G.state !== 'prep' && G.waveIdx >= p.total - 1; L.nb = nb; b.classList.toggle('pulse', G.state === 'prep'); }
    const sub = G.state === 'prep' ? 'Get ready' : (G.foes.length + G.queue.length) + ' foes';
    if (L.sub !== sub) { $('waveSub').textContent = sub; L.sub = sub; }
  }
  function frame() { if (current !== 'game') return; Sound.muffle(G.paused); hud(); updatePanel(); if (tut) tut.tick(); music(); }
  // adaptive soundtrack: layers follow how hot the fight is
  function music() {
    if (G.state === 'won' || G.state === 'lost' || G.state === 'stopped') return;
    let near = 0, boss = false;
    for (const f of G.foes) { const p = f.d / f.r.len; if (p > near) near = p; if (f.def.boss) boss = true; }
    Sound.mood(boss ? 'boss' : 'battle');
    const n = G.foes.length, last = G.waveIdx === G.level.waves.length - 1;
    let lv = G.state === 'prep' ? 0 : n === 0 ? 1 : n < 5 ? 2 : 3;
    if (last && n > 0) lv = 3;
    Sound.intensity(lv);
    const low = G.lives <= Math.max(1, Math.floor(G.maxLives * 0.3)) && G.state === 'playing' ? 0.45 : 0;
    const alarm = G.sabo && G.sabo.kind === 'reactor' ? 0.4 + 0.5 * (1 - G.sabo.t / G.sabo.dur) : 0;
    if (G.sabo && lv < 2 && G.state === 'playing') Sound.intensity(2);
    Sound.danger(Math.max((near - 0.55) / 0.4, low, alarm));
  }

  $('btnNext').onclick = () => { Sound.ensure(); if (!G.allow({ kind: 'next' })) { tip('Follow the Captain first!'); return; } if (G.callNextWave()) Sound.play('click'); };
  $('btnSpeed').onclick = () => { G.setSpeed(G.speed === 1 ? 2 : G.speed === 2 ? 0.5 : 1); $('btnSpeed').innerHTML = (G.speed === 0.5 ? '½' : G.speed) + '&times;'; Sound.play('click'); };
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
    $('pMap').onclick = () => { closeModal(); G.paused = false; persist(); lvl.endless ? toEndless() : toHub(); };
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'game' && G.state !== 'won' && G.state !== 'lost' && $('modal').classList.contains('hidden')) pauseMenu(); });
  addEventListener('keydown', e => {
    if (current !== 'game' || !$('modal').classList.contains('hidden')) return;
    if (e.key >= '1' && e.key <= '9') { const k = G.avail[+e.key - 1]; if (k) G.setPlacing(k); }
    else if (e.key.toLowerCase() === 'h') $('btnHint').click();
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
  function awardXP(amount) {
    const ups = [];
    G.avail.forEach(k => { const before = crewLevel(k); save.xp[k] = (save.xp[k] || 0) + amount; const after = crewLevel(k); if (after > before) ups.push(CREW[k].name + ' → Lv ' + after); });
    return `<div class="xp">+${amount} XP for the squad${ups.length ? `<br><b>LEVEL UP!</b> ${ups.join(', ')} — spend points in Crew` : ''}</div>`;
  }
  const medalHtml = list => list.length ? `<div class="reward">MEDAL${list.length > 1 ? 'S' : ''}: ${list.map(m => m.icon + ' ' + m.name).join(', ')}</div>` : '';
  function onEnd(r) {
    if (lvl.endless) {
      const waves = Math.max(0, r.waves || 0), prevBest = save.endless[lvl.id] || 0; save.endless[lvl.id] = Math.max(prevBest, waves);
      const xp = awardXP(Math.max(8, waves * XP_GAIN.endlessWave)); persist(); const medals = checkMedals(true); persist(); buzz(300);
      setTimeout(() => {
        modal(`<h2 class="${waves > prevBest ? 'win' : 'lose'}">${waves > prevBest ? 'New best!' : 'Run over'}</h2><p>${lvl.name} · Endless</p><div class="bigscore">♾ ${waves}<small>wave${waves === 1 ? '' : 's'} survived</small></div>
          <p>Best on this map: wave ${save.endless[lvl.id]} · Foes stopped: ${G.kills}</p>${xp}${medalHtml(medals)}
          <div class="row"><button class="btn primary" id="rRe">Try again</button><button class="btn" id="rEnd">Endless maps</button></div>`);
        $('rRe').onclick = () => beginGame(); $('rEnd').onclick = () => { closeModal(); toEndless(); };
        if (medals.length) Sound.play('medal');
      }, 900);
      return;
    }
    if (!r.won) {
      save.losses[lvl.id] = (save.losses[lvl.id] || 0) + 1; const xp = awardXP(XP_GAIN.loss); persist(); buzz(300);
      const tips = ['Guards (Brick, Tank) must stand on the floor path. Shooters need the raised decks.', 'Promote crewmates — it makes them much stronger.', 'Armored foes shrug off bullets. Sparky’s electricity ignores armor!', 'Flying foes can’t be blocked. Put shooters near the reactor.', 'Skills are powerful — tap a crewmate when the star lights up.', 'Lumi keeps guards alive. Put her on a deck near your front line.', 'Stuck? Tap the 💡 button for a hint.', 'Train your crew between missions: spend upgrade points in the Crew screen.'];
      const hard = (save.losses[lvl.id] || 0) >= 2 && !DIFFICULTY[save.diff].easy;
      setTimeout(() => {
        modal(`<h2 class="lose">The Signal got through</h2><p>${tips[(lvl.id + (save.losses[lvl.id] || 0)) % tips.length]}</p>${hard ? '<p class="reward">Too tough? Try “Crew” or “Story” difficulty in Settings.</p>' : ''}${xp}<div class="row"><button class="btn primary" id="rRe">Try again</button>${needsBrief() ? `<button class="btn" id="rSq">${needsSquad() ? 'Change squad' : 'Briefing'}</button>` : ''}<button class="btn" id="rMap">Mission map</button></div>`);
        $('rRe').onclick = () => beginGame(); $('rMap').onclick = () => { closeModal(); toHub(); };
        if ($('rSq')) $('rSq').onclick = () => { closeModal(); toSquad(); };
      }, 900);
      return;
    }
    const prev = save.stars[lvl.id] || 0, before = totalStars(), boltsBefore = totalBolts(); save.stars[lvl.id] = Math.max(prev, r.stars); if (lvl.id === LEVELS.length) save.ended = true;
    // challenges won → ⚡ bolts; medal flags
    const beaten = save.mods[lvl.id] || []; const newBolts = chosenMods.filter(k => !beaten.includes(k)); if (newBolts.length) save.mods[lvl.id] = beaten.concat(newBolts);
    if (r.lives >= G.maxLives) save.flags.flawless = true;
    if (lvl.id >= 4 && G.deployed <= 4) save.flags.minimal = true;
    if (chosenMods.length >= 3) save.flags.dare = true;
    if (save.diff === 'impostor' && lvl.chapter >= 3) save.flags.imp = true;
    if (lvl.finale) save.flags.ch3 = true; if (lvl.finale2) save.flags.ch4 = true; if (lvl.finale3) save.flags.ch5 = true;
    const xp = awardXP(XP_GAIN.win + XP_GAIN.star * r.stars); persist();
    const medals = checkMedals(true); buzz([60, 40, 60, 40, 140]);
    const newLooks = Object.values(LOOKS).flat().filter(i => (i.stars > 0 || i.bolts) && lookOpen(i, totalStars(), totalBolts()) && !lookOpen(i, before, boltsBefore));
    const styleMsg = newLooks.length ? `<div class="reward">NEW STYLE${newLooks.length > 1 ? 'S' : ''}: ${newLooks.map(i => i.name).join(', ')}! Visit the Crew screen.</div>` : '';
    const boltMsg = newBolts.length ? `<div class="reward bolt">⚡ +${newBolts.length} challenge bolt${newBolts.length > 1 ? 's' : ''}: ${newBolts.map(k => MODIFIERS[k].name).join(', ')}</div>` : '';
    const nxt = LEVELS.find(l => l.id === lvl.id + 1), reward = nxt && nxt.newCrew && !prev ? `<div class="reward">NEW CREWMATE: ${CREW[nxt.newCrew].name} the ${CREW[nxt.newCrew].role}!</div>` : '';
    const endMsg = lvl.id === ENDLESS.unlockAfter && !prev ? '<div class="reward">♾ ENDLESS MODE unlocked on the mission map!</div>' : '';
    setTimeout(() => {
      modal(`<h2 class="win">Mission Complete!</h2><p>${lvl.name}</p><div class="bigstars">${[1, 2, 3].map(n => `<i class="${n <= r.stars ? 'on' : ''}" style="animation-delay:${n * .25}s">★</i>`).join('')}</div>
        <p>Ship health left: ${r.lives}/${G.maxLives} · Foes stopped: ${G.kills}</p>${boltMsg}${reward}${endMsg}${styleMsg}${xp}${medalHtml(medals)}
        <div class="row"><button class="btn primary" id="rGo">${!prev ? 'Continue the story' : 'Mission map'}</button><button class="btn" id="rRe">Play again</button></div>`);
      $('rRe').onclick = () => beginGame();
      $('rGo').onclick = () => { closeModal(); if (!prev && lvl.post) dialog(lvl.post, lvl, afterStory); else afterStory(); };
      if (medals.length) setTimeout(() => Sound.play('medal'), 900);
    }, 1200);
  }
  function afterStory() {
    if (lvl.finale && !save.epilogue) { save.epilogue = true; persist(); cinematic(EPILOGUE, toHub); }
    else if (lvl.finale2 && !save.epilogue2) { save.epilogue2 = true; persist(); cinematic(EPILOGUE2, toHub); }
    else if (lvl.finale3 && !save.epilogue3) { save.epilogue3 = true; persist(); cinematic(EPILOGUE3, toHub); }
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
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then(r => r.update()).catch(() => { }));
    // a new version took over while this page still runs the old code: reload, but only somewhere calm
    let had = !!navigator.serviceWorker.controller, reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had) { had = true; return; }
      const go = () => { if (reloaded) return; reloaded = true; location.reload(); };
      if (current === 'title') go(); else { const w = setInterval(() => { if (current === 'title') { clearInterval(w); go(); } }, 1000); }
    });
  }
  if (TEST) window.__t = { G, save: () => save, playLevel, toSquad, Wardrobe, squad: () => squad, toHub, toEndless, toLog, toSettings, checkMedals, saveCode, readCode, mods: m => { if (m) chosenMods = m; return chosenMods; }, lvl: () => lvl, LEVELS, beginGame, setLevel: l => { lvl = l; }, persist, unlock: () => { LEVELS.forEach(l => { save.stars[l.id] = save.stars[l.id] || 1; }); persist(); } };
})();
