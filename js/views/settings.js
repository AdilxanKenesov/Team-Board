/* Sozlamalar: profil, parol, ko'rinish (mavzu, til), ma'lumotlar (zaxira, import, demo, tozalash), tizim haqida. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, A = App.Auth, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;

  function section(id, icon, title, sub, body, cls) {
    return h('section', { class: 'card set-card' + (cls ? ' ' + cls : ''), 'aria-labelledby': id },
      h('div', { class: 'set-card__head' }, h('span', { class: 'set-card__ico' }, U.icon(icon)),
        h('div', null, h('h2', { class: 'card__title', id: id }, title), sub ? h('p', { class: 'muted set-card__sub' }, sub) : null)),
      h('div', { class: 'card__body' }, body));
  }

  function seg(idPrefix, label, value, options, onPick) {
    return h('div', { class: 'seg-ctl', role: 'group', 'aria-label': label }, options.map(function (o) {
      return h('button', { type: 'button', id: idPrefix + o[0], 'aria-pressed': String(o[0] === value), onClick: function () { onPick(o[0]); } }, o[2] ? U.icon(o[2]) : null, o[1]);
    }));
  }

  function bytes(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; }

  R.add('/settings', { name: 'settings', role: 'user', title: 'Sozlamalar', nav: 'settings', render: function (view) {
    var me = App.me(), prefs = S.settingsFor(me.id);
    var grid = h('div', { class: 'set-grid' });

    /* Profil */
    var color = me.color;
    var name = h('input', { id: 'st-name', class: 'input', type: 'text', maxlength: '40', value: me.name, autocomplete: 'name' });
    var pos = h('input', { id: 'st-position', class: 'input', type: 'text', maxlength: '40', value: me.position || '', placeholder: t('Masalan: Dizayner') });
    var preview = U.avatar(me, 'xl');
    var sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('Avatar rangi') }, L.COLORS.map(function (c) {
      var b = h('button', { type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(c === color), 'aria-label': c, onClick: function () {
        color = c; preview.style.setProperty('--av', c);
        sw.querySelectorAll('.swatch').forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
      } });
      b.style.setProperty('--sw', c);
      return b;
    }));
    var pform = h('form', { class: 'form', id: 'profile-form', novalidate: true },
      h('div', { class: 'set-profile' }, preview, h('div', null, h('b', null, me.name), h('p', { class: 'muted' }, '@' + me.login + ' · ' + t(L.ROLE_LABELS[me.role])))),
      h('div', { class: 'form__row' }, U.field(t('Ism familiya'), name, { id: 'st-name' }), U.field(t('Lavozim'), pos, { id: 'st-position', optional: true })),
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, t('Avatar rangi')), sw),
      h('div', null, h('button', { type: 'submit', class: 'btn btn--primary', id: 'st-profile-save' }, U.icon('check'), t('Profilni saqlash'))));
    pform.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = S.updateProfile(me, { name: name.value, position: pos.value, color: color });
      if (!r.ok) { U.showErrors(pform, r.errors || {}, { name: 'st-name' }); return; }
      App.rebuildShell();
      U.toast(t('Profil saqlandi.'));
    });
    grid.appendChild(section('st-h-profile', 'user', t('Profil'), t('Ismingiz va avataringiz jamoaga shunday ko‘rinadi.'), pform));

    /* Xavfsizlik */
    var cur = App.passwordInput('st-cur', 'current-password'), nw = App.passwordInput('st-new', 'new-password'), nw2 = App.passwordInput('st-new2', 'new-password');
    var sform = h('form', { class: 'form', id: 'password-form', novalidate: true },
      U.field(t('Joriy parol'), cur, { id: 'st-cur' }),
      h('div', { class: 'form__row' }, U.field(t('Yangi parol'), nw, { id: 'st-new', hint: t('Kamida 6 ta belgi, harf va raqam') }), U.field(t('Yangi parolni takrorlang'), nw2, { id: 'st-new2' })),
      h('div', null, h('button', { type: 'submit', class: 'btn', id: 'st-pass-save' }, U.icon('key'), t('Parolni o‘zgartirish'))));
    sform.addEventListener('submit', function (e) {
      e.preventDefault();
      if (U.$('st-new').value !== U.$('st-new2').value) { U.showErrors(sform, { next2: t('Parollar bir xil emas.') }, { next2: 'st-new2' }); return; }
      var r = S.changeOwnPassword(me, U.$('st-cur').value, U.$('st-new').value);
      if (!r.ok) { U.showErrors(sform, r.errors || {}, { current: 'st-cur', next: 'st-new' }); return; }
      ['st-cur', 'st-new', 'st-new2'].forEach(function (id) { U.$(id).value = ''; });
      U.toast(t('Parol o‘zgartirildi.'));
    });
    grid.appendChild(section('st-h-security', 'lock', t('Xavfsizlik'), me.lastLoginAt ? t('Oxirgi kirish: {x}', { x: U.fmtDateTime(me.lastLoginAt) }) : null, sform));

    /* Ko'rinish */
    function savePref(patch) { S.saveSettings(me, patch); U.toast(t('Sozlama saqlandi.')); }
    grid.appendChild(section('st-h-look', 'sun', t('Ko‘rinish'), t('Har bir foydalanuvchining o‘z sozlamasi saqlanadi.'), h('div', { class: 'set-rows' },
      h('div', { class: 'set-row' }, h('div', null, h('b', null, t('Mavzu')), h('p', { class: 'muted' }, t('“Tizim” — kompyuter sozlamasiga moslashadi.'))),
        seg('st-theme-', t('Mavzu'), prefs.theme, [['system', t('Tizim'), 'settings'], ['light', t('Yorug‘'), 'sun'], ['dark', t('Qorong‘i'), 'moon']], function (v) { savePref({ theme: v }); })),
      h('div', { class: 'set-row' }, h('div', null, h('b', null, t('Til')), h('p', { class: 'muted' }, t('Interfeys tili.'))),
        seg('st-lang-', t('Til'), prefs.lang, [['uz', 'O‘zbekcha'], ['ru', 'Русский']], function (v) { savePref({ lang: v }); })))));

    /* Ma'lumotlar (faqat admin) */
    if (me.role === 'admin') {
      var raw = ''; try { raw = root.localStorage.getItem(S.KEY) || ''; } catch (e) { raw = ''; }
      var nSamples = S.db.tasks.filter(function (x) { return x.sample; }).length;
      var file = h('input', { type: 'file', id: 'st-import-file', accept: 'application/json,.json', hidden: true, onChange: function () {
        var fl = file.files && file.files[0]; if (!fl) return;
        var rd = new FileReader();
        rd.onload = function () {
          U.confirm({ title: t('Zaxiradan tiklash'), text: t('Joriy ma’lumotlar “{x}” fayli bilan almashtiriladi. Davom etasizmi?', { x: fl.name }), okLabel: t('Tiklash'), danger: true }).then(function (ok) {
            if (!ok) return;
            var r = S.importJSON(me, String(rd.result));
            if (!r.ok) { U.toast(t(r.error), { kind: 'error' }); return; }
            U.toast(t('Tiklandi: {u} xodim, {n} vazifa.', { u: r.counts.users, n: r.counts.tasks }), { undo: true });
          });
          file.value = '';
        };
        rd.readAsText(fl);
      } });
      var stats = [[t('Xodimlar'), S.db.users.length], [t('Loyihalar'), S.db.projects.length], [t('Vazifalar'), S.db.tasks.length], [t('Izohlar'), S.db.comments.length], [t('Hajmi'), bytes(new Blob([raw]).size)]];
      grid.appendChild(section('st-h-data', 'archive', t('Ma’lumotlar'), t('Hammasi shu brauzerning xotirasida (localStorage) saqlanadi.'), h('div', { class: 'set-rows' },
        h('div', { class: 'set-stats' }, stats.map(function (s) { return h('div', null, h('b', { class: 'num' }, String(s[1])), h('span', null, s[0])); })),
        h('div', { class: 'set-row' }, h('div', null, h('b', null, t('Zaxira nusxa')), h('p', { class: 'muted' }, t('Barcha ma’lumotlarni JSON fayl sifatida yuklab oling yoki fayldan tiklang.'))),
          h('div', { class: 'set-actions' },
            h('button', { type: 'button', class: 'btn', id: 'st-export', onClick: function () { U.download('jamoa-taxtasi-zaxira-' + App.today() + '.json', S.exportJSON(), 'application/json'); U.toast(t('Zaxira fayl yuklandi.')); } }, U.icon('download'), t('Yuklab olish')),
            h('button', { type: 'button', class: 'btn', id: 'st-import', onClick: function () { file.click(); } }, U.icon('upload'), t('Fayldan tiklash')), file)),
        h('div', { class: 'set-row' }, h('div', null, h('b', null, t('Namuna vazifalar')), h('p', { class: 'muted' }, nSamples ? t('{n} ta demo vazifa bor. O‘chirsangiz, faqat o‘zingiz yaratganlari qoladi.', { n: nSamples }) : t('Namuna vazifalar yo‘q.'))),
          h('button', { type: 'button', class: 'btn', id: 'st-clear-samples', disabled: !nSamples, onClick: function () {
            U.confirm({ title: t('Namunalarni o‘chirish'), text: t('{n} ta namuna vazifa va ularning izohlari o‘chiriladi.', { n: nSamples }), okLabel: t('O‘chirish'), danger: true }).then(function (ok) {
              if (!ok) return; var r = S.clearSamples(me); if (r.ok) U.toast(t('{n} ta namuna o‘chirildi.', { n: r.count }), { undo: true });
            });
          } }, U.icon('trash'), t('O‘chirish'))),
        h('div', { class: 'set-row set-row--danger' }, h('div', null, h('b', null, t('Xavfli hudud')), h('p', { class: 'muted' }, t('Demo ma’lumotlarni qayta yuklash yoki hammasini o‘chirib, tizimni noldan boshlash.'))),
          h('div', { class: 'set-actions' },
            h('button', { type: 'button', class: 'btn', id: 'st-demo', onClick: function () {
              U.confirm({ title: t('Demoni qayta yuklash'), text: t('Joriy ma’lumotlar demo tashkilot bilan almashtiriladi. Qayta kirish kerak bo‘ladi.'), okLabel: t('Qayta yuklash'), danger: true }).then(function (ok) {
                if (!ok) return; S.loadDemo(); S.runReminders(); A.logout(); U.toast(t('Demo qayta yuklandi. Qaytadan kiring.')); R.go('#/login');
              });
            } }, U.icon('sparkle'), t('Demoni qayta yuklash')),
            h('button', { type: 'button', class: 'btn btn--danger', id: 'st-wipe', onClick: function () {
              U.confirm({ title: t('Hammasini o‘chirish'), text: t('Barcha xodimlar, loyihalar, vazifalar va izohlar butunlay o‘chiriladi. Buni qaytarib bo‘lmaydi.'), okLabel: t('Butunlay o‘chirish'), danger: true }).then(function (ok) {
                if (!ok) return; A.logout(); S.wipe(); U.toast(t('Barcha ma’lumotlar o‘chirildi.'));
              });
            } }, U.icon('trash'), t('Hammasini o‘chirish')))))));
    }

    /* Tizim haqida */
    grid.appendChild(section('st-h-about', 'sparkle', t('Tizim haqida'), null, h('div', { class: 'set-about' },
      h('p', null, h('b', null, 'Jamoa taxtasi Pro'), ' · ', t('kutubxonasiz HTML, CSS va JavaScript; internet va server talab qilinmaydi.')),
      h('div', { class: 'alert alert--info' }, U.icon('lock'), h('span', null, t('Parollar SHA-256 + tuz bilan xeshlanadi va 5 marta xato kiritilganda kirish 30 soniyaga bloklanadi. Lekin bu namoyish darajasidagi himoya: ma’lumotlar shu brauzerda saqlanadi, haqiqiy tizimda server kerak.'))),
      h('p', { class: 'muted' }, t('Yorliqlar: Ctrl+K — qidirish, N — yangi vazifa, ? — barcha yorliqlar.'))), 'set-card--wide'));

    view.appendChild(grid);
  } });
})(window);
