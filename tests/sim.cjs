/* Dev-only: runs the auto-bot over every mission on each difficulty. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto((process.env.BASE_URL || 'http://localhost:8000/') + '?test'); await p.waitForFunction(() => window.__t);
  await p.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'bot.js'), 'utf8') });
  const diffs = (process.argv[2] || 'crew,captain,impostor').split(',');
  for (const d of diffs) {
    const res = await p.evaluate(d => LEVELS.map(l => runBot(l.id, d)), d);
    console.log(d.padEnd(9), res.map(r => `${r.id}:${r.won ? 'W' : 'L'}${r.lives}/${r.max}@${r.t}s w${r.wave} c${r.crew}${r.foes ? ' f[' + r.left + ']' : ''}`).join('  '));
  }
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
