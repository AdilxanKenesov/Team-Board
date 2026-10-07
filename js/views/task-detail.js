/* Vazifa: yaratish/tahrir formasi (modal) va tafsilot paneli (izohlar, checklist, tarix). */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t;
  var h = U.h;

  function activeUsers() { return S.db.users.filter(function (u) { return u.active; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'uz'); }); }
  function activeProjects() { return S.db.projects.filter(function (p) { return !p.archived; }); }

  /* ================= Forma ================= */
  // task — tahrir uchun; preset — yangi vazifa uchun boshlang'ich qiymatlar (status, due, projectId, assigneeId)
  App.openTaskForm = function (task, preset) {
    var me = App.me();
    if (!me || me.role !== 'admin') return;
    var p = preset || {};
    var v = task ? JSON.parse(JSON.stringify(task)) : { title: '', description: '', projectId: p.projectId || '', assigneeId: p.assigneeId || '', priority: 'orta', due: p.due || '', tags: [], checklist: [], status: p.status || 'new' };

    var title = h('input', { id: 'tf-title', class: 'input', type: 'text', maxlength: '140', value: v.title, placeholder: t('Masalan: Forum dasturini tuzish') });
    var desc = h('textarea', { id: 'tf-desc', class: 'input', rows: '4', maxlength: '2200', placeholder: t('Batafsil: nima qilish kerak, qanday natija kutiladi') });
    desc.value = v.description || '';

    var proj = h('select', { id: 'tf-project', class: 'input' }, h('option', { value: '' }, t('Loyihasiz')),
      activeProjects().concat(task && task.projectId && S.project(task.projectId) && S.project(task.projectId).archived ? [S.project(task.projectId)] : [])
        .map(function (x) { return h('option', { value: x.id }, x.name); }));
    proj.value = v.projectId || '';

    var who = h('select', { id: 'tf-assignee', class: 'input' }, h('option', { value: '' }, t('Biriktirilmagan')),
      activeUsers().map(function (u) { return h('option', { value: u.id }, u.name + (u.position ? ' — ' + u.position : '')); }));
    who.value = v.assigneeId || '';

    var prio = v.priority;
    var prioCtl = h('div', { class: 'seg-ctl', role: 'radiogroup', 'aria-label': t('Muhimlik'), id: 'tf-priority' }, L.PRIORITIES.map(function (x) {
      return h('button', { type: 'button', role: 'radio', 'aria-checked': String(x === prio), 'aria-pressed': String(x === prio), dataset: { v: x }, onClick: function (e) {
        prio = x;
        prioCtl.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === x)); b.setAttribute('aria-checked', String(b.dataset.v === x)); });
        e.currentTarget.focus();
      } }, U.priorityMark(x), t(L.PRIORITY_LABELS[x]));
    }));

    var due = U.dateField({ id: 'tf-due', value: v.due || '', min: task ? null : App.today() });
    var status = h('select', { id: 'tf-status', class: 'input' }, L.STATUSES.map(function (s) { return h('option', { value: s }, t(L.STATUS_LABELS[s])); }));
    status.value = v.status;
    var tags = h('input', { id: 'tf-tags', class: 'input', type: 'text', value: (v.tags || []).join(', '), placeholder: t('dizayn, sayt'), list: 'tf-tag-list' });
    var tagList = h('datalist', { id: 'tf-tag-list' }, L.allTags(S.db.tasks).map(function (g) { return h('option', { value: g }); }));

    // Checklist muharriri
    var items = (v.checklist || []).map(function (c) { return { id: c.id, text: c.text, done: c.done }; });
    var clList = h('ul', { class: 'cl-edit', id: 'tf-checklist' });
    var clInput = h('input', { class: 'input', type: 'text', id: 'tf-cl-new', maxlength: '120', placeholder: t('Yangi band va Enter') });
    function drawItems() {
      U.clear(clList);
      items.forEach(function (it, i) {
        var inp = h('input', { class: 'input input--sm', type: 'text', value: it.text, maxlength: '120', 'aria-label': t('{n}-band', { n: i + 1 }), onInput: function (e) { it.text = e.target.value; } });
        clList.appendChild(h('li', null, h('input', { type: 'checkbox', checked: it.done, 'aria-label': t('Bajarilgan'), onChange: function (e) { it.done = e.target.checked; } }), inp,
          h('button', { type: 'button', class: 'icon-btn icon-btn--danger', 'aria-label': t('Bandni o‘chirish'), onClick: function () { items.splice(i, 1); drawItems(); clInput.focus(); } }, U.icon('close'))));
      });
    }
    clInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var txt = L.clean(clInput.value);
      if (!txt) return;
      items.push({ id: L.uid('c'), text: txt, done: false });
      clInput.value = '';
      drawItems();
    });
    drawItems();

    var form = h('form', { class: 'form', id: 'task-form', novalidate: true },
      U.field(t('Nom'), title, { id: 'tf-title' }),
      U.field(t('Tavsif'), desc, { id: 'tf-desc', optional: true }),
      h('div', { class: 'form__row' }, U.field(t('Loyiha'), proj, { id: 'tf-project' }), U.field(t('Mas’ul'), who, { id: 'tf-assignee' })),
      h('div', { class: 'form__row' }, U.field(t('Muddat'), due.el, { id: 'tf-due', optional: true }),
        task ? U.field(t('Holat'), status, { id: 'tf-status' }) : U.field(t('Teglar'), tags, { id: 'tf-tags', optional: true, hint: t('Vergul bilan ajrating, ko‘pi bilan 6 ta') })),
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, t('Muhimlik')), prioCtl),
      task ? U.field(t('Teglar'), tags, { id: 'tf-tags', optional: true, hint: t('Vergul bilan ajrating, ko‘pi bilan 6 ta') }) : null,
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, t('Checklist'), h('span', { class: 'field__opt' }, ' ' + t('ixtiyoriy'))), clList, clInput,
        h('p', { class: 'field__error', id: 'tf-checklist-error', role: 'alert' })),
      tagList);

    var m = U.modal({
      title: task ? t('Vazifani tahrirlash') : t('Yangi vazifa'), body: form, size: 'lg', initialFocus: '#tf-title',
      actions: [
        { label: t('Bekor qilish'), onClick: function (e, api) { api.close(); } },
        { label: task ? t('Saqlash') : t('Vazifa yaratish'), kind: 'primary', id: 'tf-submit', onClick: function () { submit(); } }
      ]
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    form.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); } });

    function submit() {
      if (clInput.value.trim()) { items.push({ id: L.uid('c'), text: L.clean(clInput.value), done: false }); clInput.value = ''; drawItems(); }
      var input = { title: title.value, description: desc.value, projectId: proj.value || null, assigneeId: who.value || null, priority: prio,
        due: due.get(), tags: tags.value, checklist: items, status: task ? status.value : (v.status || 'new') };
      var r = task ? S.updateTask(me, task.id, input) : S.createTask(me, input);
      if (!r.ok) {
        if (r.errors) {
          due.setError(r.errors.due);
          U.showErrors(form, r.errors, { title: 'tf-title', description: 'tf-desc', projectId: 'tf-project', assigneeId: 'tf-assignee', due: 'tf-due', tags: 'tf-tags', checklist: 'tf-checklist' });
        } else U.toast(t(r.error), { kind: 'error' });
        return;
      }
      m.close();
      App.flashTask = r.task.id;
      U.toast(task ? t('“{x}” saqlandi.', { x: r.task.title }) : t('“{x}” yaratildi.', { x: r.task.title }) + (r.task.assigneeId ? ' ' + t('Mas’ulga bildirishnoma yuborildi.') : ''), { undo: true });
    }
    return m;
  };

  /* ================= Tafsilot paneli ================= */
  var openDrawer = null;
  App.openTask = function (id) {
    var me = App.me();
    var task = S.task(id);
    if (!task) { U.toast(t('Vazifa topilmadi yoki o‘chirilgan.'), { kind: 'error' }); return; }
    if (!L.can(me, 'view', task)) { U.toast(t('Bu vazifani ko‘rish uchun ruxsat yo‘q.'), { kind: 'error' }); return; }
    if (openDrawer) openDrawer.close();

    var tools = [];
    if (L.can(me, 'edit', task)) {
      tools.push(h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Tahrirlash'), title: t('Tahrirlash'), id: 'td-edit', onClick: function () { d.close(); App.openTaskForm(S.task(id)); } }, U.icon('edit')));
      tools.push(h('button', { type: 'button', class: 'icon-btn icon-btn--danger', 'aria-label': t('O‘chirish'), title: t('O‘chirish'), id: 'td-delete', onClick: function () { App.deleteTask(id, d); } }, U.icon('trash')));
    }
    tools.push(h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Havolani nusxalash'), title: t('Havolani nusxalash'), onClick: function () {
      var url = location.href.split('#')[0] + '#' + (me.role === 'admin' ? '/admin/board' : '/me/board') + '?task=' + id;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { U.toast(t('Havola nusxalandi.')); }, function () { U.toast(url); });
      else U.toast(url);
    } }, U.icon('copy')));

    var d = U.drawer({ title: t('Vazifa'), tools: tools, wide: true, onClose: function () { unsub(); openDrawer = null; } });
    openDrawer = d;
    function draw() {
      var tk = S.task(id);
      if (!tk) { d.close(); return; }
      var focusId = document.activeElement && d.body.contains(document.activeElement) ? document.activeElement.id : null;
      var draft = U.$('td-comment') ? U.$('td-comment').value : '';
      U.clear(d.body);
      d.body.appendChild(detailBody(tk, me));
      if (draft && U.$('td-comment')) U.$('td-comment').value = draft;
      if (focusId && U.$(focusId)) U.$(focusId).focus();
    }
    var unsub = S.subscribe(function () { if (openDrawer === d) draw(); });
    draw();
    setTimeout(function () { var f = d.body.querySelector('#td-status-sel, .td-move, #td-comment'); if (f) f.focus(); }, 0);
    return d;
  };

  App.deleteTask = function (id, drawerApi) {
    var me = App.me(), tk = S.task(id);
    if (!tk) return;
    U.confirm({ title: t('Vazifani o‘chirish'), text: t('“{x}” va uning izohlari o‘chiriladi. 6 soniya ichida bekor qilish mumkin.', { x: tk.title }), okLabel: t('O‘chirish'), danger: true })
      .then(function (yes) {
        if (!yes) return;
        if (drawerApi) drawerApi.close();
        var r = S.deleteTask(me, id);
        if (r.ok) U.toast(t('“{x}” o‘chirildi.', { x: tk.title }), { undo: true });
      });
  };

  function metaRow(label, value) { return h('div', { class: 'td-meta__row' }, h('dt', null, label), h('dd', null, value)); }

  function detailBody(tk, me) {
    var today = App.today();
    var project = tk.projectId ? S.project(tk.projectId) : null;
    var assignee = tk.assigneeId ? S.user(tk.assigneeId) : null;
    var creator = tk.createdBy ? S.user(tk.createdBy) : null;
    var wrap = h('div', { class: 'td' });

    // Sarlavha
    wrap.appendChild(h('div', { class: 'td__head' },
      project ? U.projectChip(project) : h('span', { class: 'muted' }, t('Loyihasiz')),
      h('h3', { class: 'td__title', id: 'td-title' }, tk.title),
      tk.tags.length ? h('div', { class: 'tags' }, tk.tags.map(function (g) { return h('span', { class: 'tag' }, '#' + g); })) : null));

    // Holat
    var statusBox = h('div', { class: 'td__status' });
    if (me.role === 'admin') {
      var sel = h('div', { class: 'seg-ctl seg-ctl--status', role: 'group', 'aria-label': t('Holat'), id: 'td-status-sel' }, L.STATUSES.map(function (s) {
        return h('button', { type: 'button', id: 'td-st-' + s, 'aria-pressed': String(tk.status === s), onClick: function () {
          if (tk.status === s) return;
          var r = S.moveTask(me, tk.id, s);
          if (r.ok) U.toast(t('“{x}” → {s}.', { x: tk.title, s: t(L.STATUS_LABELS[s]) }), { undo: true });
        } }, h('span', { class: 'dot dot--' + s }), t(L.STATUS_LABELS[s]));
      }));
      statusBox.appendChild(sel);
    } else if (L.can(me, 'status', tk)) {
      statusBox.appendChild(U.statusPill(tk.status));
      (L.MOVES[tk.status] || []).forEach(function (to) {
        var fwd = L.STATUSES.indexOf(to) > L.STATUSES.indexOf(tk.status);
        statusBox.appendChild(h('button', { type: 'button', class: 'btn btn--sm td-move' + (fwd ? ' btn--primary' : ''), id: 'td-mv-' + to, onClick: function () {
          var r = S.moveTask(me, tk.id, to);
          if (r.ok) U.toast(t('“{x}” → {s}.', { x: tk.title, s: t(L.STATUS_LABELS[to]) }), { undo: true });
          else U.toast(t(r.error), { kind: 'error' });
        } }, fwd ? null : U.icon('back'), to === 'doing' && tk.status === 'new' ? t('Boshlash') : to === 'done' ? t('Tugatish') : to === 'doing' ? t('Qayta ochish') : t('Qaytarish'), fwd ? U.icon('fwd') : null));
      });
    } else statusBox.appendChild(U.statusPill(tk.status));
    wrap.appendChild(statusBox);

    // Ma'lumotlar
    var dueEl = tk.due ? h('span', { class: 'td-due' + (L.isOverdue(tk, today) ? ' is-late' : L.isDueSoon(tk, today, 1) ? ' is-soon' : '') }, U.icon('calendar'), U.longDate(tk.due),
      h('small', null, ' · ' + U.dueLabel(tk, today))) : h('span', { class: 'muted' }, t('Muddat yo‘q'));
    wrap.appendChild(h('dl', { class: 'td-meta' },
      metaRow(t('Mas’ul'), assignee ? h('span', { class: 'cell-user' }, U.avatar(assignee, 'sm'), assignee.name) : h('span', { class: 'muted' }, t('Biriktirilmagan'))),
      metaRow(t('Muddat'), dueEl),
      metaRow(t('Muhimlik'), U.priorityMark(tk.priority, true)),
      metaRow(t('Yaratgan'), h('span', null, creator ? creator.name : '—', h('small', { class: 'muted' }, ' · ' + U.fmtDateTime(tk.createdAt)))),
      tk.completedAt ? metaRow(t('Tugatilgan'), U.fmtDateTime(tk.completedAt)) : null));

    // Tavsif
    if (tk.description) wrap.appendChild(h('section', { class: 'td__sec' }, h('h4', null, t('Tavsif')), h('p', { class: 'td__desc' }, tk.description)));

    // Checklist
    if (tk.checklist.length) {
      var pr = L.checklistProgress(tk), canCheck = L.can(me, 'checklist', tk);
      wrap.appendChild(h('section', { class: 'td__sec' },
        h('div', { class: 'td__sec-head' }, h('h4', null, t('Checklist')), h('span', { class: 'muted num' }, pr.done + ' / ' + pr.all)),
        h('div', { class: 'bar bar--ok' }, h('i', { style: { width: pr.percent + '%' } })),
        h('ul', { class: 'cl' }, tk.checklist.map(function (c) {
          return h('li', null, h('label', { class: 'check' + (c.done ? ' is-done' : '') },
            h('input', { type: 'checkbox', id: 'td-cl-' + c.id, checked: c.done, disabled: !canCheck, onChange: function () { S.toggleCheck(me, tk.id, c.id); } }),
            h('span', null, c.text)));
        }))));
    }

    // Izohlar
    var comments = S.db.comments.filter(function (c) { return c.taskId === tk.id; }).sort(function (a, b) { return a.at - b.at; });
    var sec = h('section', { class: 'td__sec' }, h('div', { class: 'td__sec-head' }, h('h4', null, t('Izohlar')), h('span', { class: 'muted num' }, String(comments.length))));
    var list = h('ul', { class: 'comments' });
    if (!comments.length) list.appendChild(h('li', { class: 'comments__empty' }, t('Hali izoh yo‘q. Birinchi bo‘lib yozing.')));
    comments.forEach(function (c) {
      var u = S.user(c.userId);
      list.appendChild(h('li', { class: 'comment' + (c.userId === me.id ? ' is-mine' : '') }, U.avatar(u, 'sm'),
        h('div', { class: 'comment__body' },
          h('div', { class: 'comment__head' }, h('b', null, u ? u.name : '—'), h('time', { title: U.fmtDateTime(c.at) }, U.ago(c.at)),
            (me.role === 'admin' || c.userId === me.id) ? h('button', { type: 'button', class: 'icon-btn icon-btn--danger comment__del', 'aria-label': t('Izohni o‘chirish'), onClick: function () {
              S.deleteComment(me, c.id); U.toast(t('Izoh o‘chirildi.'), { undo: true });
            } }, U.icon('trash')) : null),
          h('p', null, c.text))));
    });
    sec.appendChild(list);
    if (L.can(me, 'comment', tk)) {
      var ta = h('textarea', { id: 'td-comment', class: 'input', rows: '2', maxlength: '1100', placeholder: t('Izoh yozing… (Ctrl+Enter — yuborish)'), 'aria-label': t('Izoh') });
      var err = h('p', { class: 'field__error', id: 'td-comment-error', role: 'alert' });
      function send() {
        var r = S.addComment(me, tk.id, ta.value);
        if (!r.ok) { err.textContent = t(r.error); ta.setAttribute('aria-invalid', 'true'); ta.focus(); return; }
        ta.value = '';
        setTimeout(function () { var x = U.$('td-comment'); if (x) { x.value = ''; x.focus(); } }, 0);
      }
      ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); send(); } });
      ta.addEventListener('input', function () { err.textContent = ''; ta.removeAttribute('aria-invalid'); });
      sec.appendChild(h('div', { class: 'composer' }, U.avatar(me, 'sm'), h('div', { class: 'composer__main' }, ta, err,
        h('div', { class: 'composer__row' }, h('button', { type: 'button', class: 'btn btn--primary btn--sm', id: 'td-send', onClick: send }, U.icon('comment'), t('Yuborish'))))));
    }
    wrap.appendChild(sec);

    // Tarix
    var acts = S.db.activity.filter(function (a) { return a.taskId === tk.id; }).slice(0, 12);
    if (acts.length) {
      wrap.appendChild(h('section', { class: 'td__sec' }, h('h4', null, t('Tarix')),
        h('ol', { class: 'timeline' }, acts.map(function (a) {
          var u = a.userId ? S.user(a.userId) : null;
          return h('li', null, h('span', { class: 'timeline__dot', 'aria-hidden': 'true' }), h('span', { class: 'timeline__text' }, h('b', null, u ? u.name : '—'), ' ', App.activityText(a, true)),
            h('time', { title: U.fmtDateTime(a.at) }, U.ago(a.at)));
        }))));
    }
    return wrap;
  }

  // Faollik yozuvi matni (sahifalar va panel uchun umumiy)
  App.activityText = function (a, short) {
    var x = short ? '' : '“' + a.title + '” ';
    var d = a.detail || {};
    switch (a.type) {
      case 'create': return t('{x}vazifani yaratdi', { x: x });
      case 'update': return t('{x}vazifani tahrirladi', { x: x });
      case 'move': return t('{x}holatini o‘zgartirdi: {a} → {b}', { x: x, a: t(L.STATUS_LABELS[d.from] || ''), b: t(L.STATUS_LABELS[d.to] || '') });
      case 'delete': return t('“{x}” vazifasini o‘chirdi', { x: a.title });
      case 'comment': return t('{x}izoh yozdi', { x: x });
      case 'check': return t('{x}checklist bandini belgiladi: {i}', { x: x, i: d.item || '' });
      case 'uncheck': return t('{x}checklist bandini qaytardi: {i}', { x: x, i: d.item || '' });
      case 'bulk': return t('{n} ta vazifani ommaviy o‘zgartirdi', { n: d.count || '' });
      case 'bulk-delete': return t('{n} ta vazifani o‘chirdi', { n: d.count || '' });
      case 'project-create': return t('“{x}” loyihasini yaratdi', { x: a.title });
      case 'project-update': return t('“{x}” loyihasini tahrirladi', { x: a.title });
      case 'project-archive': return t('“{x}” loyihasini arxivladi', { x: a.title });
      case 'project-restore': return t('“{x}” loyihasini arxivdan qaytardi', { x: a.title });
      case 'user-create': return t('{x}ni xodim sifatida qo‘shdi', { x: a.title });
      case 'user-update': return t('{x} ma’lumotlarini tahrirladi', { x: a.title });
      case 'user-activate': return t('{x} hisobini faollashtirdi', { x: a.title });
      case 'user-deactivate': return t('{x} hisobini faolsizlantirdi', { x: a.title });
      case 'user-password': return t('{x} parolini tikladi', { x: a.title });
      case 'clear-samples': return t('namuna vazifalarni o‘chirdi ({x})', { x: a.title });
      case 'setup': return t('tizimni sozladi');
      default: return a.type;
    }
  };
})(window);
