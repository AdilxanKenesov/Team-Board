/* Loyihalar (admin): kartalar, progress, jamoa, yaratish/tahrir, arxiv. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;
  var tab = 'active';

  App.openProjectForm = function (project) {
    var me = App.me();
    var color = project ? project.color : L.COLORS[S.db.projects.length % L.COLORS.length];
    var name = h('input', { id: 'pf-name', class: 'input', type: 'text', maxlength: '40', value: project ? project.name : '', placeholder: t('Masalan: Yoshlar forumi') });
    var desc = h('textarea', { id: 'pf-desc', class: 'input', rows: '3', maxlength: '300', placeholder: t('Loyiha maqsadi qisqacha') });
    desc.value = project ? project.description : '';
    var sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('Rang') }, L.COLORS.map(function (c) {
      var b = h('button', { type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(c === color), 'aria-pressed': String(c === color), 'aria-label': c, onClick: function () {
        color = c; sw.querySelectorAll('.swatch').forEach(function (x) { var on = x === b; x.setAttribute('aria-pressed', String(on)); x.setAttribute('aria-checked', String(on)); });
      } });
      b.style.setProperty('--sw', c);
      return b;
    }));
    var form = h('form', { class: 'form', id: 'project-form', novalidate: true },
      U.field(t('Nom'), name, { id: 'pf-name' }),
      U.field(t('Tavsif'), desc, { id: 'pf-desc', optional: true }),
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, t('Rang')), sw));
    function submit() {
      var r = S.saveProject(me, project ? project.id : null, { name: name.value, description: desc.value, color: color });
      if (!r.ok) { U.showErrors(form, r.errors || {}, { name: 'pf-name' }); if (r.error) U.toast(t(r.error), { kind: 'error' }); return; }
      m.close();
      U.toast(project ? t('Loyiha saqlandi.') : t('“{x}” loyihasi yaratildi.', { x: r.project.name }), { undo: true });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    var m = U.modal({ title: project ? t('Loyihani tahrirlash') : t('Yangi loyiha'), body: form, initialFocus: '#pf-name',
      actions: [{ label: t('Bekor qilish'), onClick: function (e, api) { api.close(); } }, { label: project ? t('Saqlash') : t('Yaratish'), kind: 'primary', id: 'pf-submit', onClick: submit }] });
  };

  R.add('/admin/projects', { name: 'projects', role: 'admin', title: 'Loyihalar', nav: 'projects', render: function (view) {
    var me = App.me(), today = App.today();
    var list = S.db.projects.filter(function (p) { return tab === 'active' ? !p.archived : p.archived; });
    var stats = L.perProject(S.db.tasks, S.db.projects, today);
    var nArch = S.db.projects.filter(function (p) { return p.archived; }).length;

    view.appendChild(h('div', { class: 'page-head' },
      h('div', { class: 'seg-ctl', role: 'tablist', 'aria-label': t('Loyihalar') },
        h('button', { type: 'button', role: 'tab', id: 'pt-active', 'aria-selected': String(tab === 'active'), onClick: function () { tab = 'active'; App.refresh(); } }, t('Faol'), ' ', h('span', { class: 'muted num' }, String(S.db.projects.length - nArch))),
        h('button', { type: 'button', role: 'tab', id: 'pt-archived', 'aria-selected': String(tab === 'archived'), onClick: function () { tab = 'archived'; App.refresh(); } }, t('Arxiv'), ' ', h('span', { class: 'muted num' }, String(nArch)))),
      h('button', { type: 'button', class: 'btn btn--primary', id: 'add-project', onClick: function () { App.openProjectForm(); } }, U.icon('plus'), t('Yangi loyiha'))));

    if (!list.length) {
      view.appendChild(h('div', { class: 'card' }, tab === 'active'
        ? U.empty('folder', t('Hali loyiha yo‘q'), t('Vazifalarni yo‘nalishlar bo‘yicha guruhlash uchun loyiha yarating.'), h('button', { type: 'button', class: 'btn btn--primary', onClick: function () { App.openProjectForm(); } }, U.icon('plus'), t('Yangi loyiha')))
        : U.empty('archive', t('Arxiv bo‘sh'))));
      return;
    }
    var grid = h('div', { class: 'proj-grid' });
    list.forEach(function (p) {
      var s = stats.filter(function (x) { return x.project.id === p.id; })[0];
      var tasks = S.db.tasks.filter(function (x) { return x.projectId === p.id; });
      var people = [];
      tasks.forEach(function (x) { if (x.assigneeId && people.indexOf(x.assigneeId) === -1) people.push(x.assigneeId); });
      var c = L.counts(tasks, today);
      var card = h('article', { class: 'card proj-card' + (p.archived ? ' is-archived' : ''), 'aria-labelledby': 'pc-' + p.id },
        h('div', { class: 'proj-card__band' }),
        h('div', { class: 'proj-card__body' },
          h('div', { class: 'proj-card__head' }, h('h3', { id: 'pc-' + p.id }, p.name),
            h('button', { type: 'button', class: 'icon-btn', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': t('{x}: amallar', { x: p.name }), 'data-key': 'pm-' + p.id, onClick: function (e) {
              U.menu(e.currentTarget, [
                { label: t('Taxtada ochish'), icon: 'board', onClick: function () { Object.assign(App.getTaskFilter('admin'), { projectId: p.id }); R.go('#/admin/board'); } },
                { label: t('Ro‘yxatda ochish'), icon: 'list', onClick: function () { Object.assign(App.getTaskFilter('table'), { projectId: p.id }); R.go('#/admin/tasks'); } },
                { label: t('Tahrirlash'), icon: 'edit', onClick: function () { App.openProjectForm(p); } },
                { label: p.archived ? t('Arxivdan qaytarish') : t('Arxivlash'), icon: 'archive', onClick: function () {
                  S.archiveProject(me, p.id, !p.archived);
                  U.toast(p.archived ? t('“{x}” arxivdan qaytarildi.', { x: p.name }) : t('“{x}” arxivlandi.', { x: p.name }), { undo: true });
                } }
              ]);
            } }, U.icon('more'))),
          p.description ? h('p', { class: 'proj-card__desc' }, p.description) : h('p', { class: 'proj-card__desc muted' }, t('Tavsif yo‘q')),
          h('div', { class: 'proj-card__progress' }, h('div', { class: 'segbar' }, L.STATUSES.map(function (st) { var i = h('i', { class: 's-' + st }); i.style.flexGrow = c[st] || 0; return i; })),
            h('div', { class: 'proj-card__nums' }, h('b', { class: 'num' }, s.percent + '%'), h('span', { class: 'muted' }, t('{a} / {b} ta tugagan', { a: s.done, b: s.total })),
              s.overdue ? h('span', { class: 'late-chip' }, t('{n} kechikkan', { n: s.overdue })) : null)),
          h('div', { class: 'proj-card__foot' },
            h('div', { class: 'avatars' }, people.slice(0, 5).map(function (id) { return U.avatar(S.user(id), 'sm'); }),
              people.length > 5 ? h('span', { class: 'avatar avatar--sm avatar--empty' }, '+' + (people.length - 5)) : null),
            h('button', { type: 'button', class: 'btn btn--sm', 'data-key': 'po-' + p.id, onClick: function () { Object.assign(App.getTaskFilter('admin'), { projectId: p.id }); R.go('#/admin/board'); } }, t('Taxtada ochish'), U.icon('fwd')))));
      card.style.setProperty('--pc', p.color);
      grid.appendChild(card);
    });
    view.appendChild(grid);
  } });
})(window);
