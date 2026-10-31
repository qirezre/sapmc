/* ==========================================================================
   SAP-MC · Scripts.html — inti SPA
   - 1x doGet; semua navigasi di klien (0 ms), tanpa ?page= / window.location
   - Stale-While-Revalidate (localStorage) + optimistic UI + dedupe request
   - Token sesi: memori + localStorage (TIDAK pernah di URL)
   ========================================================================== */
(function () {
  'use strict';
  var S = { token: '', boot: null, route: '', nav: 0, off: 0, inflight: 0, tz: 'Asia/Jakarta' };
  var views = {}, ACT = {}, LSP = 'sapmc:1:';

  /* ---------- util dasar ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 150); }; }
  var LS = {
    get: function (k) { try { var v = localStorage.getItem(LSP + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(LSP + k, JSON.stringify(v)); } catch (e) { /* penuh/diblokir */ } },
    raw: function (k) { try { return localStorage.getItem(LSP + k) || ''; } catch (e) { return ''; } },
    setRaw: function (k, v) { try { localStorage.setItem(LSP + k, v); } catch (e) { /* abaikan */ } },
    del: function (k) { try { localStorage.removeItem(LSP + k); } catch (e) { /* abaikan */ } },
    clearUser: function () { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(LSP) === 0 && k !== LSP + 'pubinfo') localStorage.removeItem(k); }); } catch (e) { /* abaikan */ } }
  };

  /* ---------- ikon SVG (gaya feather) ---------- */
  var IC = {
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    chevL: '<polyline points="15 18 9 12 15 6"/>', chevR: '<polyline points="9 18 15 12 9 6"/>', chevD: '<polyline points="6 9 12 15 18 9"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
  };
  function ico(n, c) { return '<svg class="i ' + (c || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }

  /* ---------- format ---------- */
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + 'Rp ' + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function nf(n) { return String(Math.round((Number(n) || 0) * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  var HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function dparts(ymd) { var p = String(ymd).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function dateLabel(ymd, long) { if (!ymd) return '-'; var d = dparts(ymd); return HARI[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + (long ? BLN[d.getUTCMonth()] : BLN[d.getUTCMonth()].slice(0, 3)) + ' ' + d.getUTCFullYear(); }
  function hm(s) { s = String(s || ''); return s.length >= 16 ? s.slice(11, 16) : (s.length >= 5 ? s.slice(0, 5) : '-'); }
  function periodeLabel(p) { return BLN[+p.slice(5) - 1] + ' ' + p.slice(0, 4); }
  function periodeShift(p, n) { var y = +p.slice(0, 4), m = +p.slice(5) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + ('0' + (m + 1)).slice(-2); }
  function nowIn(tz, ms) {
    var d = new Date(ms === undefined ? Date.now() + S.off : ms), o;
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: tz || S.tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(d), m = {};
      p.forEach(function (x) { m[x.type] = x.value; }); o = { date: m.year + '-' + m.month + '-' + m.day, h: m.hour, m: m.minute, s: m.second };
    } catch (e) { o = { date: d.toISOString().slice(0, 10), h: ('0' + d.getHours()).slice(-2), m: ('0' + d.getMinutes()).slice(-2), s: ('0' + d.getSeconds()).slice(-2) }; }
    o.hm = o.h + ':' + o.m; o.time = o.hm + ':' + o.s; o.full = o.date + ' ' + o.time; o.min = (+o.h) * 60 + (+o.m); return o;
  }
  function periodeNow() { return nowIn(S.tz).date.slice(0, 7); }
  function initials(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase(); }
  function hmMin(s) { var p = String(s || '0:0').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); }

  /* ---------- loader tipis di atas layar ---------- */
  var tlT = 0;
  function busy(d) {
    S.inflight = Math.max(0, S.inflight + d); var el = $('#tl'); if (!el) return;
    if (S.inflight > 0) { clearTimeout(tlT); tlT = setTimeout(function () { if (S.inflight > 0) { el.classList.add('on'); el.style.width = '70%'; } }, 220); }
    else { clearTimeout(tlT); el.style.width = '100%'; setTimeout(function () { el.classList.remove('on'); el.style.width = '0'; }, 250); }
  }

  /* ---------- API ---------- */
  var pend = {};
  function api(action, payload, o) {
    o = o || {};
    var key = o.dedupe ? action + '|' + JSON.stringify(payload || {}) : '';
    if (key && pend[key]) return pend[key];
    var p = new Promise(function (resolve) {
      if (!o.quiet) busy(1);
      var done = function (r) { if (!o.quiet) busy(-1); if (key) delete pend[key]; resolve(r); };
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, (window.SAPMC_CONFIG.TIMEOUT_MS || 60000));
      fetch(window.SAPMC_CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // WAJIB text/plain: menghindari CORS preflight yang ditolak GAS
        body: JSON.stringify({ action: action, token: S.token, payload: payload || {} }),
        signal: ctl ? ctl.signal : undefined
      }).then(function (res) { return res.text(); }).then(function (txt) {
        clearTimeout(tm); var r = null; try { r = JSON.parse(txt); } catch (e) { r = null; }
        if (!r) { done({ success: false, code: 'NET', message: 'Server tidak mengirim JSON. Periksa GAS_URL (js/config.js) & pengaturan deployment.' }); return; }
        if (r.code === 'AUTH' && S.token && action !== 'auth.logout') { expire(); }
        done(r);
      }).catch(function (e) {
        clearTimeout(tm); done({ success: false, code: 'NET', message: 'Koneksi bermasalah. ' + (e && e.name === 'AbortError' ? 'Waktu habis.' : (e && e.message ? String(e.message).slice(0, 120) : '')) });
      });
    });
    if (key) pend[key] = p;
    return p;
  }
  function expire() {
    if (!S.token) return;
    S.token = ''; LS.clearUser(); S.boot = null; toast('Sesi berakhir. Silakan masuk kembali.', 'warn'); showLogin();
  }
  /** Stale-While-Revalidate: paint(data, stale) dipanggil seketika dari cache lalu dari server bila berbeda. */
  function swr(key, action, payload, paint, o) {
    o = o || {}; var nav = S.nav, ck = 'c:' + (S.boot ? S.boot.me.id : '') + ':' + key, c = LS.get(ck), now = Date.now();
    if (c && c.d !== undefined) paint(c.d, true);
    var fresh = c && !o.force && (now - c.t) < (o.ttl === undefined ? 20000 : o.ttl);
    if (fresh) return Promise.resolve();
    return api(action, payload, { quiet: !!c, dedupe: true }).then(function (r) {
      if (!r.success) { if (!c && (!o.guard || o.guard())) { if (o.onError) o.onError(r); else toast(r.message, 'err'); } return; }
      var j = JSON.stringify(r.data), same = c && JSON.stringify(c.d) === j;
      LS.set(ck, { t: Date.now(), d: r.data });
      if (!same && (S.nav === nav || o.anyNav) && (!o.guard || o.guard())) paint(r.data, false);
    });
  }
  function invalidate(prefix) {
    try { var base = LSP + 'c:' + (S.boot ? S.boot.me.id : '') + ':'; Object.keys(localStorage).forEach(function (k) { if (k.indexOf(base + (prefix || '')) === 0) localStorage.removeItem(k); }); } catch (e) { /* abaikan */ }
  }

  /* ---------- toast / modal / konfirmasi ---------- */
  function toast(msg, type, ms) {
    var box = $('#toasts'), el = document.createElement('div');
    el.className = 'toast ' + (type || ''); el.setAttribute('role', type === 'err' ? 'alert' : 'status');
    el.innerHTML = '<span style="flex:none;margin-top:1px">' + ico(type === 'err' ? 'alert' : type === 'warn' ? 'alert' : type === 'info' ? 'info' : 'check', 'sm') + '</span><span style="flex:1">' + esc(msg) + '</span><button class="x" aria-label="Tutup">' + ico('x', 'sm') + '</button>';
    var kill = function () { el.remove(); }; el.querySelector('.x').onclick = kill; box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(kill, ms || (type === 'err' ? 6000 : 3200));
  }
  var stack = [];
  function modal(o) {
    var ovl = $('#ovl'), el = document.createElement('div');
    el.className = 'modal' + (o.wide ? ' wide' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', o.title || 'Dialog');
    el.innerHTML = '<div class="modal-h"><h3>' + esc(o.title || '') + '</h3><button class="ibtn sm" data-close aria-label="Tutup">' + ico('x') + '</button></div><div class="modal-b">' + (o.body || '') + '</div>' + (o.footer ? '<div class="modal-f">' + o.footer + '</div>' : '');
    stack.forEach(function (s) { s.el.style.display = 'none'; });
    ovl.appendChild(el); ovl.classList.add('on'); document.body.style.overflow = 'hidden';
    var h = { el: el, close: function () { closeTop(el); }, $: function (s) { return $(s, el); } };
    stack.push(h);
    el.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) h.close(); });
    setTimeout(function () { var f = el.querySelector('input:not([type=hidden]),select,textarea,button.btn-p'); if (f && o.focus !== false) f.focus(); }, 40);
    if (o.onOpen) o.onOpen(h);
    return h;
  }
  function closeTop(el) {
    var i = stack.findIndex(function (s) { return s.el === el; }); if (i < 0) return;
    stack[i].el.remove(); var cl = stack[i].onClose; stack.splice(i, 1);
    if (stack.length) stack[stack.length - 1].el.style.display = ''; else { $('#ovl').classList.remove('on'); document.body.style.overflow = ''; }
    if (cl) cl();
  }
  function closeAll() { while (stack.length) closeTop(stack[stack.length - 1].el); }
  function confirmBox(o) {
    return new Promise(function (resolve) {
      var m = modal({ title: o.title || 'Konfirmasi', body: '<p style="color:var(--muted)">' + (o.html || esc(o.text || '')) + '</p>', focus: false,
        footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn ' + (o.danger ? 'btn-d' : 'btn-p') + '" data-ok>' + esc(o.ok || 'Ya, lanjutkan') + '</button>' });
      var res = false; m.onClose = function () { resolve(res); };
      m.$('[data-ok]').onclick = function () { res = true; m.close(); };
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });
  document.addEventListener('mousedown', function (e) { if (e.target.id === 'ovl' && stack.length) stack[stack.length - 1].close(); });

  /* ---------- form helper ---------- */
  function field(o) {
    var id = 'f_' + o.name, req = o.required ? ' <span style="color:var(--bad)">*</span>' : '', v = o.value === undefined || o.value === null ? '' : o.value, a = o.attrs || '', inp;
    if (o.type === 'select') inp = '<select class="sel" id="' + id + '" name="' + o.name + '" ' + a + '>' + (o.options || []).map(function (x) { var val = typeof x === 'object' ? x.v : x, lab = typeof x === 'object' ? x.l : x; return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join('') + '</select>';
    else if (o.type === 'textarea') inp = '<textarea class="txt" id="' + id + '" name="' + o.name + '" ' + a + '>' + esc(v) + '</textarea>';
    else if (o.type === 'check') return '<div class="field"><label class="chk"><input type="checkbox" id="' + id + '" name="' + o.name + '"' + (v === true || v === 'true' ? ' checked' : '') + ' ' + a + '><span>' + esc(o.label) + '</span></label>' + (o.help ? '<span class="help">' + o.help + '</span>' : '') + '</div>';
    else inp = '<input class="inp" id="' + id + '" name="' + o.name + '" type="' + (o.type || 'text') + '" value="' + esc(v) + '" ' + (o.placeholder ? 'placeholder="' + esc(o.placeholder) + '"' : '') + ' ' + (o.type === 'number' ? 'inputmode="decimal"' : '') + ' ' + a + '>';
    return '<div class="field"><label for="' + id + '">' + esc(o.label) + req + '</label>' + inp + (o.help ? '<span class="help">' + o.help + '</span>' : '') + '</div>';
  }
  function readForm(root) {
    var o = {}; $$('[name]', root).forEach(function (el) { o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); return o;
  }

  /* ---------- skeleton & kosong ---------- */
  function skel(n, h) { var s = ''; for (var i = 0; i < (n || 3); i++) s += '<div class="sk" style="height:' + (h || 64) + 'px;margin-bottom:10px;border-radius:14px"></div>'; return s; }
  function empty(icon, title, sub, action) { return '<div class="empty"><div class="eic">' + ico(icon || 'info', 'lg') + '</div><b style="color:var(--text)">' + esc(title) + '</b><span>' + esc(sub || '') + '</span>' + (action || '') + '</div>'; }
  function saveB64(name, b64, mime) {
    try {
      var bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([u], { type: mime || 'application/pdf' })), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (e) { toast('Gagal menyiapkan unduhan.', 'err'); }
  }
  function saveText(name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- DataTable (cari, urut, halaman) ---------- */
  function mountTable(el, cfg) {
    var st = { q: '', sort: cfg.sort || null, dir: 1, page: 1 }, size = cfg.pageSize || 10, rows = cfg.rows || [];
    function view() {
      var r = rows.slice(), q = st.q.toLowerCase();
      if (q) r = r.filter(function (x) { return (cfg.searchKeys || []).some(function (k) { return String(x[k] === undefined ? '' : x[k]).toLowerCase().indexOf(q) >= 0; }); });
      if (st.sort) r.sort(function (a, b) { var x = a[st.sort], y = b[st.sort]; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'id')) * st.dir; });
      return r;
    }
    function paint() {
      var r = view(), pages = Math.max(1, Math.ceil(r.length / size)); st.page = Math.min(st.page, pages);
      var pg = r.slice((st.page - 1) * size, st.page * size), has = el.querySelector('[data-tq]');
      var head = '<div class="toolbar">' + (cfg.searchKeys ? '<div class="search grow"><span>' + ico('search', 'sm') + '</span><input class="inp" data-tq placeholder="' + esc(cfg.searchPlaceholder || 'Cari…') + '" value="' + esc(st.q) + '" aria-label="Cari"></div>' : '') + (cfg.toolbar || '') + '</div>';
      var body;
      if (!pg.length) body = '<div class="card flat">' + empty('search', cfg.emptyTitle || 'Belum ada data', cfg.emptySub || (st.q ? 'Tidak ada hasil untuk pencarian ini.' : ''), cfg.emptyAction) + '</div>';
      else {
        var t = '<div class="tw ' + (cfg.mobileCard ? 'only-d' : '') + '"><table class="t"><thead><tr>' + cfg.cols.map(function (c) { return '<th class="' + (c.num ? 'num ' : '') + (c.sort !== false && c.k ? 'sortable' : '') + '" ' + (c.sort !== false && c.k ? 'data-sort="' + c.k + '"' : '') + '>' + esc(c.label) + (st.sort === c.k ? (st.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>'; }).join('') + (cfg.actions ? '<th></th>' : '') + '</tr></thead><tbody>' +
          pg.map(function (x) { return '<tr>' + cfg.cols.map(function (c) { return '<td class="' + (c.num ? 'num' : '') + '">' + (c.render ? c.render(x) : esc(x[c.k])) + '</td>'; }).join('') + (cfg.actions ? '<td class="tr" style="white-space:nowrap">' + cfg.actions(x) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>';
        if (cfg.mobileCard) t += '<div class="list only-m">' + pg.map(cfg.mobileCard).join('') + '</div>';
        body = t;
      }
      var pager = r.length > size ? '<div class="pager"><span>' + ((st.page - 1) * size + 1) + '–' + Math.min(st.page * size, r.length) + ' dari ' + r.length + '</span><span style="display:flex;gap:6px"><button class="btn btn-g btn-s" data-pg="-1" ' + (st.page <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya">' + ico('chevL', 'sm') + '</button><span class="mono" style="align-self:center">' + st.page + '/' + pages + '</span><button class="btn btn-g btn-s" data-pg="1" ' + (st.page >= pages ? 'disabled' : '') + ' aria-label="Berikutnya">' + ico('chevR', 'sm') + '</button></span></div>' : '';
      if (has && el.__ready) { el.querySelector('[data-body]').innerHTML = body + pager; return; }
      el.innerHTML = head + '<div data-body>' + body + pager + '</div>'; el.__ready = true;
    }
    if (!el.__bound) {
      el.__bound = true;
      el.addEventListener('input', debounce(function (e) { if (e.target.matches('[data-tq]')) { el.__st.q = e.target.value; el.__st.page = 1; el.__paint(); } }, 120));
      el.addEventListener('click', function (e) {
        var s = e.target.closest('[data-sort]'), p = e.target.closest('[data-pg]');
        if (s) { var k = s.dataset.sort; if (el.__st.sort === k) el.__st.dir *= -1; else { el.__st.sort = k; el.__st.dir = 1; } el.__paint(); }
        if (p && !p.disabled) { el.__st.page += +p.dataset.pg; el.__paint(); }
      });
    }
    el.__st = st; el.__paint = paint; el.__ready = false; paint();
    return { setRows: function (r) { rows = r; paint(); }, paint: paint };
  }

  /* ---------- tema ---------- */
  function applyTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
    LS.setRaw('theme', t); try { localStorage.setItem('sapmc:theme', t); } catch (e) { /* abaikan */ }
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#0B1120' : '#4F46E5';
  }
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  ACT.theme = function () { applyTheme(isDark() ? 'light' : 'dark'); renderChrome(); };

  /* ---------- navigasi & shell ---------- */
  var NAV = {
    PEGAWAI: [['absen', 'Absen', 'clock'], ['riwayat', 'Riwayat', 'calendar'], ['slip', 'Slip Gaji', 'file'], ['profil', 'Profil', 'user']],
    FINANCE: [['fhome', 'Beranda', 'home'], ['gaji', 'Master Gaji', 'db', ['can_master_gaji']], ['adj', 'Potongan', 'edit', ['can_manage_kasbon', 'can_manage_bonus', 'can_koreksi_lembur', 'can_generate_payroll']], ['bonus', 'Bonus', 'gift', ['can_manage_bonus']], ['payroll', 'Payroll', 'card', ['can_generate_payroll', 'can_send_payslip']],
      'Akun Saya', ['absen', 'Absen', 'clock'], ['riwayat', 'Riwayat', 'calendar'], ['slip', 'Slip Saya', 'file'], ['profil', 'Profil', 'user']],
    HR: [['hmon', 'Monitor Absen', 'users'], ['hrekap', 'Rekap Bulanan', 'calendar'], ['amanual', 'Input Absen Bulanan', 'edit', ['can_edit_absen']], ['lembur', 'Persetujuan Lembur', 'check', ['can_approve_lembur']],
      'Akun Saya', ['absen', 'Absen', 'clock'], ['riwayat', 'Riwayat', 'calendar'], ['slip', 'Slip Saya', 'file'], ['profil', 'Profil', 'user']],
    MANAJEMEN: [['dash', 'Dashboard', 'grid'], ['master', 'Master Data', 'db'], ['hmon', 'Monitor Absen', 'users'], ['hrekap', 'Rekap Absen', 'calendar'], ['amanual', 'Input Absen Bulanan', 'edit'], ['lembur', 'Persetujuan Lembur', 'check'], ['payroll', 'Payroll', 'card'], ['gaji', 'Master Gaji', 'db'], ['adj', 'Potongan', 'edit'], ['bonus', 'Bonus', 'gift'], 'Sistem', ['akses', 'Hak Akses', 'shield'], ['wa', 'Pengaturan', 'sliders'], ['migrasi', 'Migrasi Data', 'upload'], ['profil', 'Profil', 'user']]
  };
  NAV.KEPALA = NAV.HR;
  NAV.FINANCE.splice(NAV.FINANCE.indexOf('Akun Saya'), 0, ['amanual', 'Input Absen Bulanan', 'edit', ['can_edit_absen']], ['lembur', 'Persetujuan Lembur', 'check', ['can_approve_lembur']]);
  function navItems() {
    var me = S.boot.me, list = NAV[me.role] || NAV.PEGAWAI;
    return list.filter(function (x) { return typeof x === 'string' || !x[3] || me.role === 'MANAJEMEN' || x[3].some(function (k) { return me.perms[k]; }); })
      .filter(function (x, i, a) { return typeof x !== 'string' || (a[i + 1] && typeof a[i + 1] !== 'string'); });
  }
  function homeRoute() { var r = S.boot.me.role; return r === 'MANAJEMEN' ? 'dash' : r === 'FINANCE' ? 'fhome' : (r === 'HR' || r === 'KEPALA') ? 'hmon' : 'absen'; }
  function allowed(name) { return navItems().some(function (x) { return typeof x !== 'string' && x[0] === name; }); }

  function renderChrome() {
    if (!S.boot) return;
    var me = S.boot.me, items = navItems(), sc = S.boot.schedule || {}, real = items.filter(function (x) { return typeof x !== 'string'; });
    $('#side').innerHTML = '<div class="brand"><span class="logo">' + ico('clock') + '</span><span>' + esc(S.boot.app.nama) + '</span></div><nav class="nav">' +
      items.map(function (x) { return typeof x === 'string' ? '<div class="sec">' + esc(x) + '</div>' : '<a data-go="' + x[0] + '" class="' + (S.route === x[0] ? 'on' : '') + '" role="link" tabindex="0">' + ico(x[2]) + '<span>' + esc(x[1]) + '</span></a>'; }).join('') +
      '</nav><div class="side-foot"><div class="ucard"><span class="av">' + esc(initials(me.nama)) + '</span><div style="min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(me.nama) + '</div><div class="muted" style="font-size:12px">' + esc(me.roleLabel) + '</div></div></div>' +
      '<div style="display:flex;gap:6px"><button class="btn btn-g btn-s" data-act="theme" style="flex:1" aria-label="Ganti tema">' + ico(isDark() ? 'sun' : 'moon', 'sm') + (isDark() ? 'Terang' : 'Gelap') + '</button><button class="btn btn-g btn-s" data-act="logout" aria-label="Keluar">' + ico('logout', 'sm') + 'Keluar</button></div></div>';
    var bn = real.length > 5 ? real.slice(0, 4) : real, more = real.length > 5;
    $('#bnav').innerHTML = bn.map(function (x) { return '<a data-go="' + x[0] + '" class="' + (S.route === x[0] ? 'on' : '') + '" role="link" tabindex="0">' + ico(x[2]) + '<span>' + esc(x[1]) + '</span></a>'; }).join('') +
      (more ? '<a data-act="more" class="' + (real.slice(4).some(function (x) { return x[0] === S.route; }) ? 'on' : '') + '" role="button" tabindex="0">' + ico('more') + '<span>Lainnya</span></a>' : '');
    var cur = real.filter(function (x) { return x[0] === S.route; })[0], title = cur ? cur[1] : '';
    $('#top').innerHTML = '<div style="display:flex;align-items:center;gap:10px;min-width:0"><div class="brand"><span class="logo" style="width:32px;height:32px;border-radius:10px">' + ico('clock', 'sm') + '</span></div><h1>' + esc(title) + '</h1></div>' +
      '<div style="display:flex;align-items:center;gap:8px">' + (sc.perusahaan ? '<span class="badge b-co only-d">' + ico('building', 'sm') + esc(sc.perusahaan) + '</span>' : '') +
      '<button class="ibtn" data-act="theme" aria-label="Ganti tema" style="display:inline-grid">' + ico(isDark() ? 'sun' : 'moon') + '</button><button class="av" data-go="profil" aria-label="Profil" style="width:38px;height:38px;cursor:pointer">' + esc(initials(me.nama)) + '</button></div>';
  }
  function go(name) {
    if (!S.boot) return;
    if (!views[name] || !allowed(name)) name = homeRoute();
    if (stack.length) closeAll();
    S.route = name; S.nav++; LS.setRaw('route', name);
    var el = $('#view'); el.classList.remove('view'); void el.offsetWidth; el.classList.add('view');
    renderChrome();
    el.innerHTML = '';
    try { views[name].render(el, S.nav); } catch (e) { el.innerHTML = '<div class="page">' + empty('alert', 'Terjadi kesalahan tampilan', String(e.message || e)) + '</div>'; }
    window.scrollTo(0, 0);
  }
  ACT.more = function () {
    var items = navItems().filter(function (x) { return typeof x !== 'string'; }).slice(4);
    modal({ title: 'Menu Lainnya', body: '<div class="list">' + items.map(function (x) { return '<div class="li click" data-go="' + x[0] + '" data-close role="link" tabindex="0"><span class="av">' + ico(x[2], 'sm') + '</span><div class="grow"><div class="t1">' + esc(x[1]) + '</div></div>' + ico('chevR', 'sm') + '</div>'; }).join('') + '</div>' });
  };
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); return; }
    var a = e.target.closest('[data-act]'); if (a && ACT[a.dataset.act]) { e.preventDefault(); ACT[a.dataset.act](a, e); }
  });
  document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=link],[role=button]')) { e.preventDefault(); e.target.click(); } });

  /* ---------- sesi & login ---------- */
  function enter(d) {
    S.token = d.token; S.boot = d.boot; S.tz = (d.boot.schedule && d.boot.schedule.tz) || S.tz; S.off = (d.boot.serverNow || Date.now()) - Date.now();
    LS.setRaw('token', S.token); LS.set('boot', S.boot);
    $('#login').classList.remove('on'); $('#login').innerHTML = ''; $('#app').classList.add('on');
    go(LS.raw('route') && allowed(LS.raw('route')) ? LS.raw('route') : homeRoute());
    prefetch(); waGate();
  }
  /* Wajib isi nomor WhatsApp: dialog tanpa tombol tutup selama no_wa masih kosong */
  var WAG = null;
  function waGate() {
    if (!S.boot || !S.boot.me || S.boot.me.no_wa || WAG) return;
    var m = modal({ title: 'Isi Nomor WhatsApp Anda', focus: true,
      body: '<p style="color:var(--muted);margin-bottom:12px">Nomor WhatsApp wajib diisi sebelum memakai aplikasi. Dipakai untuk pengingat absensi dan info slip gaji.</p><div class="field"><label for="wag">Nomor WhatsApp</label><input class="inp" id="wag" inputmode="tel" placeholder="081234567890 atau 6281234567890" autocomplete="tel"><span class="help">Boleh diawali 0 atau 62.</span></div><div class="errmsg" id="wagerr" style="min-height:18px"></div>',
      footer: '<button class="btn btn-p" id="wagsv">Simpan & Lanjut</button>' });
    WAG = m; m.el.querySelector('[data-close]').style.display = 'none';
    var close = m.close; m.close = function () { if (S.boot && S.boot.me && !S.boot.me.no_wa) return; WAG = null; close(); };
    m.$('#wagsv').onclick = function () {
      var v = m.$('#wag').value, b = m.$('#wagsv'), er = m.$('#wagerr'); er.textContent = ''; b.disabled = true;
      api('profil.updateWa', { no_wa: v }).then(function (r) {
        b.disabled = false; if (!r.success) { er.textContent = r.message; return; }
        S.boot.me.no_wa = r.data.no_wa; LS.set('boot', S.boot); var p = $('#pwa'); if (p) p.textContent = r.data.no_wa; m.close(); toast('Nomor WhatsApp tersimpan.');
      });
    };
    m.$('#wag').onkeydown = function (e) { if (e.key === 'Enter') m.$('#wagsv').click(); };
  }
  function refreshBoot() {
    return api('boot', {}, { quiet: true }).then(function (r) {
      if (!r.success) { if (r.code !== 'AUTH' && r.code !== 'NET') toast(r.message, 'err'); return; }
      var changed = JSON.stringify(r.data) !== JSON.stringify(S.boot);
      S.off = (r.data.serverNow || Date.now()) - Date.now();
      if (changed) { var role = S.boot.me.role; S.boot = r.data; S.tz = r.data.schedule.tz || S.tz; LS.set('boot', S.boot); if (role !== r.data.me.role) { go(homeRoute()); } else { renderChrome(); if (views[S.route] && views[S.route].onBoot) views[S.route].onBoot(); } waGate(); }
    });
  }
  function prefetch() {
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 900); };
    idle(function () { var r = S.boot.me.role, p = periodeNow(); (views.__prefetch || []).forEach(function (f) { try { f(r, p); } catch (e) { /* abaikan */ } }); });
  }
  ACT.logout = function () {
    confirmBox({ title: 'Keluar dari aplikasi?', text: 'Anda perlu masuk kembali dengan kode OTP.', ok: 'Keluar' }).then(function (ok) {
      if (!ok) return; api('auth.logout', {}, { quiet: true }); S.token = ''; LS.clearUser(); S.boot = null; $('#app').classList.remove('on'); showLogin();
    });
  };
  function stepper(n) {
    return '<div class="stepper"><div class="stp ' + (n === 1 ? 'on' : 'done') + '"><b>' + (n === 1 ? '1' : ico('check', 'sm')) + '</b>Kirim Kode</div><div class="stp-line"></div><div class="stp ' + (n === 2 ? 'on' : '') + '"><b>2</b>Buat Sandi</div></div>';
  }

  /* ---------- Input Rupiah dengan titik ribuan (1.000, 10.000) — dapat dimatikan di Akun Saya ---------- */
  var RPIN = {
    on: function () { try { return localStorage.getItem('sapmc:fmtrp') !== '0'; } catch (e) { return true; } },
    set: function (v) { try { localStorage.setItem('sapmc:fmtrp', v ? '1' : '0'); } catch (e) { /* abaikan */ } },
    fmt: function (d) { return String(d).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },
    enhance: function (el) {
      if (el.__rp || !RPIN.on()) return; el.__rp = true;
      var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'), raw0 = el.value;
      try { el.type = 'text'; } catch (e) { /* abaikan */ } el.setAttribute('inputmode', 'numeric');
      Object.defineProperty(el, 'value', {
        configurable: true,
        get: function () { return String(desc.get.call(el)).replace(/\D/g, ''); },        // kode lain selalu membaca angka murni
        set: function (v) { var d = String(v === null || v === undefined ? '' : v).replace(/[^\d]/g, ''); desc.set.call(el, d ? RPIN.fmt(d) : ''); }
      });
      el.value = raw0;
      el.addEventListener('input', function () {
        var cur = desc.get.call(el), pos = el.selectionStart || 0, digitsBefore = cur.slice(0, pos).replace(/\D/g, '').length, d = cur.replace(/\D/g, ''), out = d ? RPIN.fmt(d) : '';
        if (out === cur) return; desc.set.call(el, out);
        var n = 0, p = 0; while (p < out.length && n < digitsBefore) { if (/\d/.test(out[p])) n++; p++; } try { el.setSelectionRange(p, p); } catch (e) { /* abaikan */ }
      }, true);
    },
    scan: function (root) { if (!root || !root.querySelectorAll) return; if (root.matches && root.matches('input[data-rp]')) RPIN.enhance(root); var l = root.querySelectorAll('input[data-rp]'); for (var i = 0; i < l.length; i++) RPIN.enhance(l[i]); }
  };
  if (window.MutationObserver) new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) RPIN.scan(n); }); }); }).observe(document.documentElement, { childList: true, subtree: true });
  var L = { email: '', cd: 0, timer: 0, auto: false };
  function showLogin(state, extra) {
    $('#app').classList.remove('on'); var el = $('#login'); el.classList.add('on');
    var pub = LS.get('pubinfo'), chip = pub ? '<div class="tc" style="margin-top:20px"><span class="chip">' + ico('building', 'sm') + pub.jumlahPerusahaan + ' Perusahaan Terafiliasi</span></div>' : '<div class="tc" style="margin-top:20px"><span class="chip" id="lgchip">' + ico('building', 'sm') + 'Multi-Perusahaan Terpadu</span></div>';
    var brand = '<div class="lg-brand"><span class="logo">' + ico('clock', 'lg') + '</span><h1>SAP-MC</h1><p>Sistem Absensi &amp; Payroll Terpadu</p></div>';
    if (state === 'denied') {
      var why = extra.alasan === 'NONAKTIF' ? 'Akun Anda sedang dinonaktifkan.' : 'Email ini belum terdaftar sebagai karyawan.';
      el.innerHTML = '<div class="lg-card denied"><div class="big">' + ico('lock', 'lg') + '</div><h1 style="font-size:22px;margin-bottom:8px">Akses Ditolak</h1><span class="badge b-bad mono">403_FORBIDDEN</span><p class="muted" style="margin-top:12px">' + why + '</p>' +
        '<div class="idbox"><div><span class="muted">Email</span><b class="mono">' + esc(extra.email) + '</b></div><div><span class="muted">Status</span><b>' + (extra.alasan === 'NONAKTIF' ? 'Nonaktif' : 'Tidak terdaftar') + '</b></div></div>' +
        '<button class="btn btn-p btn-block" data-act="lg-retry">Coba Email Lain</button><button class="btn btn-g btn-block" style="margin-top:10px" data-act="lg-help">Hubungi HR / Manajemen</button></div>'; return;
    }
    if (state === 'setup') {
      el.innerHTML = '<div class="lg-card">' + brand + stepper(2) + '<p class="tc muted" style="margin-bottom:10px">Kode 6 digit dikirim ke<br><b style="color:var(--text)" class="mono">' + esc(extra.masked || L.email) + '</b></p><div class="otp" id="otp">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<input inputmode="numeric" maxlength="1" autocomplete="' + (i ? 'off' : 'one-time-code') + '" aria-label="Digit ' + (i + 1) + '">'; }).join('') + '</div>' +
        '<div class="field" style="margin-top:14px"><label for="lgpw1">Kata sandi baru</label><input class="inp" id="lgpw1" name="new-password" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter, huruf + angka"></div>' +
        '<div class="field"><label for="lgpw2">Ulangi kata sandi</label><input class="inp" id="lgpw2" type="password" autocomplete="new-password"></div>' +
        '<button type="button" class="btn btn-g btn-s" data-act="lg-eye" style="margin-top:2px">Tampilkan kata sandi</button>' +
        '<div class="errmsg tc" id="lgerr" style="min-height:20px;margin:8px 0"></div><button class="btn btn-p btn-block" id="lgverify">Simpan &amp; Masuk</button>' +
        '<div class="tc" style="margin-top:14px;display:flex;justify-content:center;gap:14px"><button class="btn btn-g btn-s" id="lgresend" disabled>Kirim ulang</button><button class="btn btn-g btn-s" data-act="lg-retry">Kembali</button></div>' + chip + '</div>';
      bindOtp(); startCd(extra.cooldown || 45); return;
    }
    if (state === 'reset') {
      el.innerHTML = '<div class="lg-card">' + brand + stepper(1) + '<p class="tc muted" style="margin-bottom:12px">Pertama kali masuk atau lupa kata sandi? Kami kirim kode verifikasi ke email Anda untuk membuat kata sandi.</p>' +
        '<div class="field"><label for="lgemail">Email Karyawan</label><input class="inp" id="lgemail" type="email" inputmode="email" autocomplete="email" placeholder="nama@perusahaan.com" value="' + esc(L.email) + '"></div>' +
        '<div class="errmsg" id="lgerr" style="min-height:18px;margin-bottom:6px"></div><button class="btn btn-p btn-block" id="lgsend">Kirim Kode ke Email</button>' +
        '<div class="tc" style="margin-top:12px"><button class="btn btn-g btn-s" data-act="lg-retry">Kembali ke Masuk</button></div>' + chip + '</div>';
      var i2 = $('#lgemail'); i2.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendOtp(false); }); $('#lgsend').onclick = function () { sendOtp(false); };
      setTimeout(function () { i2.focus(); }, 50); return;
    }
    el.innerHTML = '<div class="lg-card">' + brand + '<div class="field"><label for="lgemail">Email Karyawan</label><input class="inp" id="lgemail" name="email" type="email" inputmode="email" autocomplete="username" placeholder="nama@perusahaan.com" value="' + esc(L.email) + '"></div>' +
      '<div class="field"><label for="lgpw">Kata Sandi</label><input class="inp" id="lgpw" name="password" type="password" autocomplete="current-password" placeholder="Kata sandi Anda"></div>' +
      '<button type="button" class="btn btn-g btn-s" data-act="lg-eye" style="margin-top:2px">Tampilkan kata sandi</button>' +
      '<div class="errmsg" id="lgerr" style="min-height:18px;margin:6px 0"></div><button class="btn btn-p btn-block" id="lgsend">Masuk</button>' +
      '<div class="tc" style="margin-top:12px"><button class="btn btn-g btn-s" data-act="lg-forgot">Pertama kali masuk / Lupa kata sandi?</button></div>' + chip + '</div>';
    var inp = $('#lgemail'), pw = $('#lgpw'); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') pw.focus(); }); pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); }); $('#lgsend').onclick = doLogin;
    if (!state) setTimeout(function () { (inp.value ? pw : inp).focus(); }, 50);
  }
  function startCd(n) {
    clearInterval(L.timer); L.cd = n; var b = $('#lgresend'); if (!b) return;
    var tick = function () { var bb = $('#lgresend'); if (!bb) { clearInterval(L.timer); return; } if (L.cd > 0) { bb.disabled = true; bb.textContent = 'Kirim ulang (' + L.cd + 's)'; L.cd--; } else { bb.disabled = false; bb.textContent = 'Kirim ulang'; clearInterval(L.timer); } };
    tick(); L.timer = setInterval(tick, 1000); b.onclick = function () { sendOtp(true); };
  }
  function bindOtp() {
    var ins = $$('#otp input'), get = function () { return ins.map(function (i) { return i.value; }).join(''); };
    ins.forEach(function (inp, i) {
      inp.addEventListener('input', function () { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); if (get().length === 6) $('#lgpw1').focus(); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) { ins[i - 1].focus(); ins[i - 1].value = ''; } if (e.key === 'Enter') verify(); });
      inp.addEventListener('paste', function (e) { var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6); if (t) { e.preventDefault(); ins.forEach(function (x, j) { x.value = t[j] || ''; }); (ins[Math.min(t.length, 5)]).focus(); if (t.length === 6) $('#lgpw1').focus(); } });
    });
    ['#lgpw1', '#lgpw2'].forEach(function (q) { $(q).addEventListener('keydown', function (e) { if (e.key === 'Enter') verify(); }); });
    $('#lgverify').onclick = verify; setTimeout(function () { ins[0].focus(); }, 50);
  }
  function sendOtp(resend, emailArg) {
    var email = emailArg || (resend ? L.email : ($('#lgemail').value || '').trim().toLowerCase()), err = $('#lgerr'), b = $('#lgsend') || $('#lgresend');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Masukkan email yang valid.'; $('#lgemail') && $('#lgemail').classList.add('err'); return; }
    L.email = email; if (b) { b.disabled = true; b.innerHTML = '<span class="spin"></span> Mengirim…'; }
    api('auth.sendOtp', { email: email }).then(function (r) {
      if (r.success && r.data && r.data.denied) return showLogin('denied', r.data);
      if (!r.success) { if (b) { b.disabled = false; b.textContent = resend ? 'Kirim ulang' : 'Kirim Kode ke Email'; } if ($('#lgerr')) $('#lgerr').textContent = r.message; return; }
      if (resend) { toast('Kode baru dikirim.', 'info'); startCd(r.data.cooldown); } else showLogin('setup', r.data);
    });
  }
  function verify() {
    var code = $$('#otp input').map(function (i) { return i.value; }).join(''), b = $('#lgverify'), err = $('#lgerr'), p1 = $('#lgpw1').value, p2 = $('#lgpw2').value;
    if (code.length !== 6) { err.textContent = 'Masukkan 6 digit kode.'; return; }
    if (p1.length < 8 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) { err.textContent = 'Kata sandi minimal 8 karakter dan memuat huruf + angka.'; return; }
    if (p1 !== p2) { err.textContent = 'Ulangi kata sandi tidak sama.'; return; }
    if (b.disabled) return; b.disabled = true; b.innerHTML = '<span class="spin"></span> Menyimpan…'; err.textContent = '';
    api('auth.setPassword', { email: L.email, kode: code, password: p1 }).then(function (r) {
      if (r.success && r.data && r.data.denied) return showLogin('denied', r.data);
      if (!r.success) { b.disabled = false; b.textContent = 'Simpan & Masuk'; err.textContent = r.message; if (r.code !== 'WEAK') { $$('#otp input').forEach(function (i) { i.value = ''; }); $$('#otp input')[0].focus(); } return; }
      toast('Kata sandi tersimpan. Selanjutnya masuk dengan email + kata sandi.', 'ok'); enter(r.data);
    });
  }
  function doLogin() {
    var email = ($('#lgemail').value || '').trim().toLowerCase(), pw = $('#lgpw').value, err = $('#lgerr'), b = $('#lgsend');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Masukkan email yang valid.'; return; }
    if (!pw) { err.textContent = 'Masukkan kata sandi.'; $('#lgpw').focus(); return; }
    L.email = email; err.textContent = ''; b.disabled = true; b.innerHTML = '<span class="spin"></span> Masuk…';
    api('auth.login', { email: email, password: pw }).then(function (r) {
      if (r.success && r.data && r.data.denied) return showLogin('denied', r.data);
      if (!r.success) {
        if (r.code === 'NEED_SETUP') { toast('Anda belum punya kata sandi. Kode verifikasi dikirim ke email.', 'info'); b.textContent = 'Mengirim kode…'; return sendOtp(false, email); }
        b.disabled = false; b.textContent = 'Masuk'; err.textContent = r.message; $('#lgpw').value = ''; $('#lgpw').focus(); return;
      }
      enter(r.data);
    });
  }
  ACT['lg-forgot'] = function () { var v = ($('#lgemail') || {}).value; if (v) L.email = v.trim().toLowerCase(); showLogin('reset'); };
  ACT['lg-eye'] = function (btn) { var show = btn.dataset.on !== '1'; btn.dataset.on = show ? '1' : '0'; btn.textContent = show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'; ['#lgpw', '#lgpw1', '#lgpw2'].forEach(function (q) { var i = $(q); if (i) i.type = show ? 'text' : 'password'; }); };
  ACT['lg-retry'] = function () { showLogin(); };
  ACT['lg-help'] = function () { modal({ title: 'Hubungi HR / Manajemen', body: '<p style="color:var(--muted)">Minta HR atau Manajemen mendaftarkan / mengaktifkan email Anda pada menu <b>Master Data → Karyawan</b>, lalu coba masuk kembali.</p>', footer: '<button class="btn btn-p" data-close>Mengerti</button>' }); };

  function start() {
    applyTheme(isDark() ? 'dark' : 'light');
    var tok = LS.raw('token'), boot = LS.get('boot');
    if (tok && boot && boot.me) {                        // sesi tersimpan: tampil 0 ms dari cache, validasi di latar
      S.token = tok; S.boot = boot; S.tz = (boot.schedule && boot.schedule.tz) || S.tz;
      $('#app').classList.add('on'); go(LS.raw('route') && allowed(LS.raw('route')) ? LS.raw('route') : homeRoute()); prefetch(); refreshBoot(); waGate(); return;
    }
    showLogin();
    api('app.publicInfo', {}, { quiet: true }).then(function (r) { if (r.success) { LS.set('pubinfo', r.data); var c = $('#lgchip'); if (c) c.innerHTML = ico('building', 'sm') + r.data.jumlahPerusahaan + ' Perusahaan Terafiliasi'; } });
  }

  /* ---------- ticker jam server ---------- */
  setInterval(function () {
    var els = $$('[data-clock]'); if (!els.length) return; var n = nowIn(S.tz);
    els.forEach(function (e) { e.textContent = e.dataset.clock === 'date' ? dateLabel(n.date, true) : n.time; });
    if (views[S.route] && views[S.route].tick) views[S.route].tick(n);
  }, 1000);
  window.addEventListener('offline', function () { toast('Anda sedang offline.', 'warn'); });
  window.addEventListener('online', function () { toast('Koneksi pulih.', 'info'); if (S.token) refreshBoot(); });

  window.SAP = { S: S, $: $, $$: $$, esc: esc, ico: ico, rp: rp, nf: nf, dateLabel: dateLabel, hm: hm, hmMin: hmMin, periodeLabel: periodeLabel, periodeShift: periodeShift, periodeNow: periodeNow, nowIn: nowIn, initials: initials,
    RPIN: RPIN, setToken: function (t) { S.token = t; LS.setRaw('token', t); },
    api: api, swr: swr, invalidate: invalidate, toast: toast, modal: modal, closeAll: closeAll, confirm: confirmBox, field: field, readForm: readForm, skel: skel, empty: empty, saveB64: saveB64, saveText: saveText,
    mountTable: mountTable, debounce: debounce, go: go, views: views, ACT: ACT, LS: LS, refreshBoot: refreshBoot, showLogin: showLogin, renderChrome: renderChrome, applyTheme: applyTheme, isDark: isDark, start: start, busy: busy };
})();
