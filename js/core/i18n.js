/* Tarjima: matnlar o'zbekcha yoziladi (kalit = o'zbekcha matn), ruscha lug'atdan olinadi.
   {nom} ko'rinishidagi o'rinlar params bilan to'ldiriladi. Lug'atda yo'q matn o'zbekcha qoladi. */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var I = { lang: 'uz', RU: {} };

  function fill(s, p) {
    if (!p) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) { return p[k] != null ? p[k] : m; });
  }

  I.t = function (text, params) {
    var s = I.lang === 'ru' && I.RU[text] ? I.RU[text] : text;
    return fill(s, params);
  };
  I.setLang = function (lang) {
    I.lang = lang === 'ru' ? 'ru' : 'uz';
    if (typeof document !== 'undefined') document.documentElement.lang = I.lang;
  };
  I.add = function (dict) { Object.keys(dict).forEach(function (k) { I.RU[k] = dict[k]; }); };

  // Oy va kun nomlari
  I.MONTHS = {
    uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
    ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  };
  I.MONTHS_NOM = {
    uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
    ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  };
  I.WEEK = { uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] };
  I.WEEK_FULL = {
    uz: ['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'],
    ru: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
  };
  I.months = function () { return I.MONTHS[I.lang]; };
  I.monthsNom = function () { return I.MONTHS_NOM[I.lang]; };
  I.week = function () { return I.WEEK[I.lang]; };
  I.weekFull = function () { return I.WEEK_FULL[I.lang]; };

  App.I18n = I;
  App.t = I.t;
  if (typeof module !== 'undefined' && module.exports) module.exports = I;
})(typeof window !== 'undefined' ? window : globalThis);
