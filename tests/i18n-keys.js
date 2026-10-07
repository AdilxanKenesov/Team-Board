// Koddan tarjima qilinadigan barcha o'zbekcha matnlarni yig'adi (t('...'), sahifa sarlavhalari, menyu,
// yorliqlar, validatsiya va xato xabarlari). tests/unit.js ruscha lug'atda hammasi borligini tekshiradi.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const LIT = /'((?:[^'\\\n]|\\.)*)'/g;
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? files(path.join(dir, d.name)) : d.name.endsWith('.js') ? [path.join(dir, d.name)] : []);
}
// Tarjima qilinmaydigan topilmalar: CSS klasslar, id'lar, ikonka nomlari, matnli hisobot (eksport o'zbekcha qoladi)
const IGNORE = /^(tf-title|eyeOff|O‘zbekcha|Jami: | · \S+: )$|^[a-z-]+(--[a-z]+)?( [a-z-]+(--[a-z]+)?)+$/;
module.exports = function keys() {
  const out = new Set();
  const add = (v) => { if (v && !IGNORE.test(v)) out.add(v.replace(/\\'/g, "'")); };
  for (const f of files(path.join(ROOT, 'js'))) {
    const name = path.basename(f);
    if (['i18n.js', 'i18n-ru.js', 'sha256.js'].includes(name)) continue;
    let s = fs.readFileSync(f, 'utf8');
    if (name === 'store.js') s = s.slice(0, s.indexOf('S.seedDemo'));
    for (const m of s.matchAll(/\bt\(\s*'((?:[^'\\\n]|\\.)*)'/g)) add(m[1]);
    for (const m of s.matchAll(/\btitle:\s*'((?:[^'\\\n]|\\.)*)'/g)) add(m[1]);
    if (name === 'app.js') {                              // menyu: ['key', '#/...', 'Nom', 'icon', 'Qisqa']
      for (const m of s.matchAll(/\['\w+', '#\/[^']*', '([^']+)', '\w+'(?:, '([^']+)')?\]/g)) { add(m[1]); add(m[2]); }
      for (const m of s.matchAll(/\['[^']+', t\('[^']+'\)\]/g)) void m;
    }
    if (['logic.js', 'store.js', 'auth.js'].includes(name)) {
      for (const line of s.split('\n')) {
        if (/^\s*\/\//.test(line)) continue;
        if (!/(error|errors|e\.\w+|\w+_LABELS|NOTIF_TPL|return '|: ')/.test(line)) continue;
        for (const m of line.matchAll(LIT)) {
          const v = m[1];
          if (/[A-Za-zʻ‘’]/.test(v) && /[ .‘’A-Z]/.test(v) && !/[;{}()=\[\]|\\/]/.test(v.replace(/\{\w+\}/g, '')) && !/^[a-z_.-]+$/.test(v) && !/^tbpro/.test(v) && !/^u_|^p_|^t_/.test(v)) add(v);
        }
      }
    }
    if (['auth.js', 'reports.js', 'member.js', 'dashboard.js'].includes(name)) {
      for (const m of s.matchAll(/\[\s*'(\w+)',\s*'([^']+)'/g)) if (/[A-Z ]/.test(m[2])) add(m[2]);   // ['7', 'Oxirgi 7 kun'], ['board', '...']
      for (const m of s.matchAll(/'(Xayrli \w+)'/g)) add(m[1]);
    }
  }
  return [...out];
};
if (require.main === module) console.log(JSON.stringify(module.exports(), null, 0).replace(/","/g, '",\n"'));
