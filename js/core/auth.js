/* Kirish: sessiya, urinishlar cheklovi, rol tekshiruvi.
   Diqqat: server yo'q — bu namoyish darajasidagi himoya (parollar xeshlangan, ma'lumot shu brauzerda). */
(function (root) {
  'use strict';

  var App = root.App = root.App || {};
  var S = App.Store || (typeof require !== 'undefined' ? require('./store.js') : null);

  var SESSION_KEY = 'tbpro.session';
  var ATTEMPTS_KEY = 'tbpro.attempts';
  var MAX_ATTEMPTS = 5, LOCK_MS = 30000;
  var SHORT = 12 * 3600000, LONG = 30 * 86400000;

  var A = { SESSION_KEY: SESSION_KEY, MAX_ATTEMPTS: MAX_ATTEMPTS, LOCK_MS: LOCK_MS, storage: null, now: function () { return Date.now(); } };

  function read(key) {
    if (!A.storage) return null;
    try { var v = A.storage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function write(key, value) {
    if (!A.storage) return;
    try { if (value === null) A.storage.removeItem(key); else A.storage.setItem(key, JSON.stringify(value)); } catch (e) { /* bo'sh */ }
  }

  A.init = function (storage) { A.storage = storage || null; };

  A.lockRemaining = function () {
    var a = read(ATTEMPTS_KEY);
    if (!a || !a.lockedUntil) return 0;
    return Math.max(0, a.lockedUntil - A.now());
  };

  // Natija: { ok, user } yoki { ok:false, error, field, lockMs }
  A.login = function (login, password, remember) {
    if (!S.db) return { ok: false, error: 'Tizim hali sozlanmagan.' };
    var lock = A.lockRemaining();
    if (lock > 0) return { ok: false, error: 'Juda ko‘p urinish. ' + Math.ceil(lock / 1000) + ' soniyadan keyin qayta urinib ko‘ring.', lockMs: lock };
    var l = String(login || '').trim().toLowerCase();
    if (!l) return { ok: false, field: 'login', error: 'Loginni yozing.' };
    if (!password) return { ok: false, field: 'password', error: 'Parolni yozing.' };

    var u = S.db.users.filter(function (x) { return x.login === l; })[0];
    var good = u && S.hashPassword(password, u.salt) === u.passHash;
    if (!good) {
      var a = read(ATTEMPTS_KEY) || { count: 0 };
      a.count = (a.count || 0) + 1;
      if (a.count >= MAX_ATTEMPTS) { a.lockedUntil = A.now() + LOCK_MS; a.count = 0; }
      write(ATTEMPTS_KEY, a);
      var left = a.lockedUntil ? 0 : MAX_ATTEMPTS - a.count;
      // Login yoki parol qaysi biri noto'g'ri ekani aytilmaydi (xavfsizlik odati)
      return { ok: false, error: a.lockedUntil ? 'Juda ko‘p urinish. 30 soniyadan keyin qayta urinib ko‘ring.' : 'Login yoki parol noto‘g‘ri. Yana ' + left + ' ta urinish qoldi.', lockMs: a.lockedUntil ? LOCK_MS : 0 };
    }
    if (!u.active) return { ok: false, error: 'Hisobingiz faolsizlantirilgan. Administratorga murojaat qiling.' };

    write(ATTEMPTS_KEY, null);
    u.lastLoginAt = A.now();
    S.save();
    write(SESSION_KEY, { userId: u.id, expires: A.now() + (remember ? LONG : SHORT), remember: !!remember });
    return { ok: true, user: u };
  };

  A.logout = function () { write(SESSION_KEY, null); };

  A.currentUser = function () {
    if (!S.db) return null;
    var s = read(SESSION_KEY);
    if (!s || !s.userId || !s.expires || s.expires < A.now()) { if (s) write(SESSION_KEY, null); return null; }
    var u = S.user(s.userId);
    if (!u || !u.active) { write(SESSION_KEY, null); return null; }
    // "Meni eslab qol" bo'lsa — har kirishda muddat uzayadi
    if (s.remember) write(SESSION_KEY, { userId: u.id, expires: A.now() + LONG, remember: true });
    return u;
  };

  A.homeFor = function (user) { return user && user.role === 'admin' ? '#/admin' : '#/me'; };

  App.Auth = A;
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
})(typeof window !== 'undefined' ? window : globalThis);
