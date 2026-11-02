/* ==========================================================================
   ScriptsManajemen.html — Dashboard, Master Data, Hak Akses, Pengaturan WA/Email, Migrasi
   ========================================================================== */
(function () {
  'use strict';
  var X = SAP, S = X.S, $ = X.$, esc = X.esc, ico = X.ico, rp = X.rp, V = X.views;
  function pick() { return S.boot.pick || { perusahaan: [], cabang: [], shift: [], karyawan: [] }; }
  function compName(id) { var c = pick().perusahaan.filter(function (x) { return x.id === id; })[0]; return c ? c.nama : id; }
  function cabName(id) { if (id === 'ALL') return 'Semua cabang'; var c = pick().cabang.filter(function (x) { return x.id === id; })[0]; return c ? c.nama : (id || '-'); }
  function stat(k, v, s, ic, i) { return '<div class="card stat"><span class="k"><span class="ic ' + ic + '">' + ico(i, 'sm') + '</span>' + k + '</span><span class="v">' + v + '</span><span class="s">' + (s || '&nbsp;') + '</span></div>'; }
  (V.__prefetch = V.__prefetch || []).push(function (role, p) {
    if (role !== 'MANAJEMEN') return;
    X.swr('dash:' + p, 'dash.summary', { periode: p }, function () {}, { ttl: 60000, anyNav: true });
    X.swr('master:karyawan', 'master.list', { entity: 'karyawan' }, function () {}, { ttl: 120000, anyNav: true });
  });

  /* ---------------------------------------------------------------- DASHBOARD */
  var D = { p: '', el: null };
  function chart(trend) {
    if (!trend.length) return X.empty('trend', 'Belum ada data absensi', 'Grafik muncul setelah ada absensi pada periode ini.');
    var max = Math.max.apply(null, trend.map(function (t) { return t.hadir; })) || 1;
    return '<div class="bars" role="img" aria-label="Grafik kehadiran harian">' + trend.map(function (t) {
      var ok = t.hadir - t.telat, h = function (n) { return Math.round(n / max * 100); };
      return '<div class="c" data-t="' + esc(X.dateLabel(t.tgl)) + ': ' + t.hadir + ' hadir, ' + t.telat + ' telat"><i class="b" style="height:' + h(t.telat) + '%"></i><i class="a" style="height:' + h(ok) + '%"></i></div>';
    }).join('') + '</div><div class="legend"><span><i style="background:var(--primary)"></i>Tepat waktu</span><span><i style="background:var(--warn)"></i>Terlambat</span></div>';
  }
  function dashHtml(d) {
    var head = '<div class="toolbar"><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-g btn-s" data-act="ds-prev" aria-label="Bulan sebelumnya">' + ico('chevL', 'sm') + '</button><b style="min-width:132px;text-align:center">' + X.periodeLabel(D.p) + '</b><button class="btn btn-g btn-s" data-act="ds-next" aria-label="Bulan berikutnya" ' + (D.p >= X.periodeNow() ? 'disabled' : '') + '>' + ico('chevR', 'sm') + '</button></div><span class="grow"></span><button class="btn btn-g btn-s" data-act="ds-refresh">' + ico('refresh', 'sm') + 'Muat ulang</button></div>';
    if (!d) return '<div class="page">' + head + '<div class="grid g4">' + X.skel(4, 112) + '</div><div class="split" style="margin-top:14px"><div class="sk" style="height:260px;border-radius:16px"></div><div class="sk" style="height:260px;border-radius:16px"></div></div></div>';
    var k = d.kpi, pay = d.payroll;
    return '<div class="page">' + head + '<div class="grid g4" style="margin-bottom:14px">' + stat('Karyawan Aktif', k.karyawan, k.perusahaan + ' perusahaan', 'ic-p', 'users') + stat('Hadir Hari Ini', k.hadirHariIni, k.belumHadir + ' belum absen', 'ic-ok', 'check') + stat('Terlambat Hari Ini', k.telatHariIni, k.telatBulan + ' kali bulan ini', 'ic-w', 'clock') + stat('Total Menit Telat', (k.menitTelatBulan || 0) + ' mnt', 'Lembur ' + rp(k.nominalLembur), 'ic-b', 'alert') + '</div>' +
      '<div class="split"><div class="card"><div class="card-h"><h3>Kehadiran Harian</h3><span class="badge b-n">' + X.periodeLabel(d.periode) + '</span></div>' + chart(d.trend) + '</div>' +
      '<div class="card"><div class="card-h"><h3>Payroll ' + X.periodeLabel(d.periode) + '</h3></div>' + (pay.total ? '<div class="stat" style="padding:0 0 12px"><span class="s">Total take home pay</span><span class="v">' + rp(k.thpBulan) + '</span></div>' + [['Draft', pay.DRAFT, 'b-warn'], ['PDF siap', pay.PDF_SIAP, 'b-info'], ['Terkirim', pay.TERKIRIM, 'b-ok'], ['Gagal', pay.GAGAL, 'b-bad']].map(function (x) { return '<div class="sline"><span class="badge ' + x[2] + '">' + x[0] + '</span><b class="mono">' + x[1] + '</b></div>'; }).join('') : X.empty('card', 'Belum ada payroll', 'Belum disimpan untuk periode ini.')) + '</div></div>' +
      '<div class="split" style="margin-top:14px"><div class="card"><div class="card-h"><h3>Kehadiran per Perusahaan (hari ini)</h3></div>' + (d.perCompany.length ? d.perCompany.map(function (c) { return '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:4px"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.nama) + '</b><span class="mono muted">' + c.hadir + '/' + c.karyawan + ' · ' + c.rate + '%</span></div><div class="hbar"><i style="width:' + c.rate + '%"></i></div></div>'; }).join('') : X.empty('building', 'Belum ada perusahaan', '')) + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:14px"><div class="card"><div class="card-h"><h3>Paling Sering Terlambat</h3></div>' + (d.topTelat.length ? d.topTelat.map(function (t, i) { return '<div class="sline"><span><b class="mono muted">' + (i + 1) + '.</b> ' + esc(t.nama) + '</span><span class="mono">' + t.kali + 'x · ' + t.menit + ' mnt</span></div>'; }).join('') : '<p class="muted">Tidak ada keterlambatan.</p>') + '</div>' +
      '<div class="card"><div class="card-h"><h3>Aktivitas Terbaru</h3></div>' + (d.audit.length ? d.audit.map(function (a) { return '<div class="sline" style="flex-direction:column;gap:2px"><span style="font-weight:600;font-size:13px">' + esc(a.aksi) + '</span><span class="muted" style="font-size:12px">' + esc(a.email) + ' · ' + esc(String(a.waktu).slice(5, 16)) + '</span></div>'; }).join('') : '<p class="muted">Belum ada aktivitas.</p>') + '</div></div></div></div>';
  }
  function paintDash(force) {
    var p = D.p; D.el.innerHTML = dashHtml(null);
    X.swr('dash:' + p, 'dash.summary', { periode: p }, function (d) { if (D.p === p && S.route === 'dash') D.el.innerHTML = dashHtml(d); }, { ttl: force ? 0 : 30000 });
  }
  V.dash = { render: function (el) { D.p = D.p || X.periodeNow(); D.el = el; var c = X.LS.get('c:' + S.boot.me.id + ':dash:' + D.p); if (c) el.innerHTML = dashHtml(c.d); paintDash(); } };
  X.ACT['ds-prev'] = function () { D.p = X.periodeShift(D.p, -1); paintDash(); };
  X.ACT['ds-next'] = function () { if (D.p < X.periodeNow()) { D.p = X.periodeShift(D.p, 1); paintDash(); } };
  X.ACT['ds-refresh'] = function () { paintDash(true); };

  /* ---------------------------------------------------------------- MASTER DATA */
  var TZ = [{ v: 'WIB', l: 'WIB (UTC+7)' }, { v: 'WITA', l: 'WITA (UTC+8)' }, { v: 'WIT', l: 'WIT (UTC+9)' }];
  var ENT = {
    perusahaan: { label: 'Perusahaan', pk: 'id_perusahaan', soft: true, name: 'nama_perusahaan' },
    cabang: { label: 'Cabang', pk: 'id_cabang', name: 'nama_cabang' },
    shift: { label: 'Shift', pk: 'id_shift', name: 'nama_shift' },
    karyawan: { label: 'Karyawan', pk: 'id_karyawan', soft: true, name: 'nama_lengkap' }
  };
  var M = { ent: 'karyawan', rows: {}, el: null, tbl: null, dirty: {}, news: {}, err: {}, n: 0, q: '', f: { comp: '', cab: '', role: '', st: 'aktif' } };
  var ROLES = [{ v: 'PEGAWAI', l: 'Pegawai' }, { v: 'KEPALA', l: 'Kepala Toko' }, { v: 'HR', l: 'HR' }, { v: 'FINANCE', l: 'Finance' }, { v: 'MANAJEMEN', l: 'Manajemen' }];
  var MC = {
    perusahaan: [['nama_perusahaan', 'Nama Perusahaan', 't', 220], ['pakai_shift', 'Pakai Shift', 'c'], ['rumus_lembur_jam', 'Pengali Lembur', 'n', 96, '0.1'], ['toleransi_telat_menit', 'Toleransi Telat (mnt)', 'n', 96, '1'], ['hari_pengingat', 'Hari Pengingat WA', 'hari', 150], ['status_aktif', 'Aktif', 'c']],
    cabang: [['id_perusahaan', 'Perusahaan', 'comp', 180], ['nama_cabang', 'Nama Cabang', 't', 190], ['jam_masuk_reguler', 'Masuk', 'time', 104], ['jam_pulang_reguler', 'Pulang', 'time', 104], ['zona_waktu', 'Zona', 's', 110, TZ]],
    shift: [['id_perusahaan', 'Perusahaan', 'comp', 180], ['id_cabang', 'Cabang', 'cab', 170], ['nama_shift', 'Nama Shift', 't', 170], ['jam_masuk', 'Masuk', 'time', 104], ['jam_pulang', 'Pulang', 'time', 104]],
    karyawan: [['nama_lengkap', 'Nama Lengkap', 't', 180], ['email', 'Email', 't', 210], ['no_wa', 'No. WA', 't', 124], ['role', 'Peran', 's', 118, ROLES], ['id_perusahaan', 'Perusahaan', 'comp', 170], ['id_cabang', 'Cabang', 'cab', 160], ['id_shift_default', 'Shift', 'shf', 150], ['nik', 'NIK', 't', 116], ['jabatan', 'Jabatan', 't', 136], ['golongan_pajak', 'Gol. Pajak', 't', 76], ['status_aktif', 'Aktif', 'c']]
  };
  function compOptions() { return pick().perusahaan.map(function (c) { return { v: c.id, l: c.nama }; }); }
  function cabOptions(comp, withAll) { return (withAll ? [{ v: 'ALL', l: 'Semua cabang' }] : [{ v: '', l: '— pilih cabang —' }]).concat(pick().cabang.filter(function (c) { return c.id_perusahaan === comp; }).map(function (c) { return { v: c.id, l: c.nama }; })); }
  function shiftOptions(comp) { return [{ v: 'REGULER', l: 'Jadwal Reguler' }].concat(pick().shift.filter(function (s) { return s.id_perusahaan === comp; }).map(function (s) { return { v: s.id, l: s.nama }; })); }
  function nDirty() { var ent = M.ent; return Object.keys(M.dirty[ent] || {}).length + (M.news[ent] || []).length; }
  function bv(v) { return v === true || v === 'true' || v === 'TRUE'; }
  function rowState(r) { return bv(r.tersembunyi) ? 'sembunyi' : (r.status_aktif === false || r.status_aktif === 'false' ? 'nonaktif' : 'aktif'); }
  var STOPT = [{ v: 'aktif', l: 'Aktif' }, { v: 'nonaktif', l: 'Nonaktif' }, { v: 'sembunyi', l: 'Disembunyikan' }, { v: 'semua', l: 'Semua status' }];
  function selHtml(id, opts, val, w) { return '<select class="sel mflt" id="' + id + '" style="width:' + w + 'px;max-width:100%" aria-label="Filter ' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(val) ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>'; }
  function filterBar() {
    var ent = M.ent, f = M.f, h = '<div class="toolbar" style="flex-wrap:wrap;gap:8px;margin:8px 0 0"><div class="search grow" style="min-width:200px"><span>' + ico('search', 'sm') + '</span><input class="inp" id="msq" placeholder="Cari ' + ENT[ent].label.toLowerCase() + '…" value="' + esc(M.q) + '" aria-label="Cari"></div>';
    if (ent !== 'perusahaan') h += selHtml('fcomp', [{ v: '', l: 'Semua perusahaan' }].concat(compOptions()), f.comp, 190);
    if (ent === 'shift' || ent === 'karyawan') h += selHtml('fcab', [{ v: '', l: 'Semua cabang' }].concat(pick().cabang.filter(function (c) { return !f.comp || c.id_perusahaan === f.comp; }).map(function (c) { return { v: c.id, l: c.nama }; })), f.cab, 170);
    if (ent === 'karyawan') h += selHtml('frole', [{ v: '', l: 'Semua peran' }].concat(ROLES), f.role, 140);
    if (ENT[ent].soft) h += selHtml('fst', STOPT, f.st, 150);
    return h + '</div>';
  }
  function masterShell() {
    var n = nDirty();
    return '<div class="page"><div class="toolbar"><div class="seg" role="tablist">' + Object.keys(ENT).map(function (k) { return '<button role="tab" class="' + (M.ent === k ? 'on' : '') + '" data-act="ms-tab" data-e="' + k + '">' + ENT[k].label + '</button>'; }).join('') + '</div><span class="grow"></span>' +
      '<button class="btn btn-g" data-act="ms-add">' + ico('plus', 'sm') + 'Tambah Baris</button><button class="btn btn-p" id="mssave" data-act="ms-save" ' + (n ? '' : 'disabled') + '>' + ico('check', 'sm') + 'Simpan' + (n ? ' (' + n + ')' : '') + '</button></div>' +
      '<div id="msf">' + filterBar() + '</div>' +
      '<p class="help" style="margin:8px 0 10px">Ubah langsung di tabel, lalu tekan <b>Simpan</b>. Gaji diatur di menu <b>Master Gaji</b>. Tombol tempat sampah di ujung baris: nonaktifkan, sembunyikan, atau hapus permanen. <span id="mscount" class="muted"></span></p><div id="mst">' + X.skel(5, 56) + '</div></div>';
  }
  function curVal(ent, key, row, f) { var d = M.dirty[ent] && M.dirty[ent][key]; return d && d[f] !== undefined ? d[f] : (row ? row[f] : ''); }
  var HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  function hariLabel(v) { var a = String(v === undefined || v === null ? '' : v).split(',').filter(function (x) { return x !== ''; }); if (!a.length) return 'Ikut pengaturan umum'; if (a.length === 7) return 'Setiap hari'; return a.map(function (x) { return HARI[+x]; }).join(', '); }
  X.ACT['hari-pick'] = function (b) {
    var inp = b.previousElementSibling, cur = String(inp.value || '').split(',').filter(function (x) { return x !== ''; });
    var order = [1, 2, 3, 4, 5, 6, 0];
    var m = X.modal({ title: 'Hari Pengingat Absensi', body: '<p class="muted" style="margin-bottom:10px">Pengingat WhatsApp hanya dikirim pada hari yang dicentang untuk perusahaan ini. Kosongkan semua = ikut pengaturan umum (menu Pengaturan).</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
      order.map(function (d) { return '<label class="chk"><input type="checkbox" data-hr="' + d + '" ' + (cur.indexOf(String(d)) >= 0 ? 'checked' : '') + '><span>' + HARI[d] + '</span></label>'; }).join('') + '</div>',
      footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="hrok">Pakai</button>',
      onOpen: function (mm) { mm.$('#hrok').onclick = function () { var v = order.filter(function (d) { return mm.$('[data-hr="' + d + '"]').checked; }).join(','); inp.value = v; b.textContent = hariLabel(v); b.classList.add('dirty'); mm.close(); inp.dispatchEvent(new Event('change', { bubbles: true })); }; } });
  };
  function cellHtml(ent, key, row, col) {
    var f = col[0], t = col[2], w = col[3] || 110, v = curVal(ent, key, row, f), isD = !!(M.dirty[ent] && M.dirty[ent][key] && M.dirty[ent][key][f] !== undefined) || (row && row._new);
    var at = ' data-k="' + esc(key) + '" data-f="' + f + '" aria-label="' + esc(col[1]) + '"', cls = 'inp mi' + (isD ? ' dirty' : '');
    if (t === 'c') return '<td style="text-align:center"><input type="checkbox" class="mi' + (isD ? ' dirty' : '') + '"' + at + (bv(v) ? ' checked' : '') + '></td>';
    if (t === 'n') return '<td class="num"><input class="' + cls + '" style="width:' + w + 'px;text-align:right;font-family:var(--mono)" type="number" min="0" step="' + (col[4] || '1') + '" inputmode="decimal" value="' + esc(v === 0 || v === '0' ? '' : v) + '" placeholder="0"' + at + '></td>';
    if (t === 'hari') return '<td><input type="hidden" class="mi" value="' + esc(v) + '"' + at + '><button type="button" class="btn btn-g btn-s' + (isD ? ' dirty' : '') + '" data-act="hari-pick" style="min-width:' + w + 'px;justify-content:flex-start">' + esc(hariLabel(v)) + '</button></td>';
    if (t === 'time') return '<td><input class="' + cls + '" style="width:' + w + 'px" type="time" value="' + esc(v) + '"' + at + '></td>';
    if (t === 't') return '<td><input class="' + cls + '" style="width:' + w + 'px" type="text" maxlength="120" value="' + esc(v) + '"' + at + '></td>';
    var comp = curVal(ent, key, row, 'id_perusahaan'), opts = t === 's' ? col[4] : t === 'comp' ? compOptions() : t === 'cab' ? cabOptions(comp, ent === 'shift') : shiftOptions(comp);
    if (t !== 's' && v && !opts.some(function (o) { return String(o.v) === String(v); })) opts = opts.concat([{ v: v, l: v + ' (tidak ditemukan)' }]);
    return '<td><select class="sel mi' + (isD ? ' dirty' : '') + '" style="width:' + w + 'px"' + at + '>' + opts.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(v) ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select></td>';
  }
  function masterTable(soft) {
    var box = $('#mst'); if (!box) return; var ent = M.ent, rows = M.rows[ent], e = ENT[ent];
    if (!rows) return; if (soft && nDirty()) return;
    var cols = MC[ent], list = (M.news[ent] || []).concat(rows.slice().sort(function (a, b) { return String(a[e.name]).toLowerCase() < String(b[e.name]).toLowerCase() ? -1 : 1; }));
    var th = '<th>No</th>' + cols.map(function (c) { return '<th' + (c[2] === 'n' ? ' class="num"' : '') + '>' + esc(c[1]) + '</th>'; }).join('') + '<th></th>';
    var body = list.map(function (r, i) {
      var key = r._new ? r._key : r[e.pk], pending = r.tmp, er = M.err[key], st = r._new ? 'aktif' : rowState(r), off = st !== 'aktif';
      var act = r._new ? '<button class="ibtn sm" data-act="ms-rmnew" data-id="' + esc(key) + '" aria-label="Batalkan baris">' + ico('trash', 'sm') + '</button>' : '<button class="ibtn sm" data-act="ms-del" data-id="' + esc(key) + '" aria-label="' + (e.soft ? 'Nonaktifkan, sembunyikan atau hapus' : 'Hapus') + '">' + ico('trash', 'sm') + '</button>' + (ent === 'perusahaan' ? '<button class="btn btn-g btn-s" data-act="ms-logo" data-id="' + esc(key) + '">Logo</button>' : '');
      return '<tr data-key="' + esc(key) + '" data-new="' + (r._new ? 1 : 0) + '" data-st="' + st + '" data-comp="' + esc(ent === 'perusahaan' ? key : (r.id_perusahaan || '')) + '" data-cab="' + esc(ent === 'cabang' ? key : (r.id_cabang || '')) + '" data-role="' + esc(r.role || '') + '" data-q="' + esc((String(r[e.name] || '') + ' ' + (r.email || '') + ' ' + (r.nik || '') + ' ' + key).toLowerCase()) + '"' + (er ? ' class="rerr" title="' + esc(er) + '"' : '') + (off ? ' style="opacity:.55"' : '') + '><td class="muted">' + (r._new ? '+' : i + 1 - (M.news[ent] || []).length) + '</td>' + cols.map(function (c) { return cellHtml(ent, key, r, c); }).join('') + '<td style="white-space:nowrap">' + (er ? '<span class="errmsg" style="display:block;max-width:220px;white-space:normal;font-size:11px">' + esc(er) + '</span>' : '') + act + '</td></tr>';
    }).join('');
    box.innerHTML = '<div class="card flat" style="padding:0;overflow:hidden"><div style="overflow:auto;max-height:70vh"><table class="t mg"><thead><tr>' + th + '</tr></thead><tbody>' + (body || '<tr><td colspan="' + (cols.length + 2) + '" class="muted" style="text-align:center;padding:24px">Belum ada data. Tekan Tambah Baris.</td></tr>') + '</tbody></table></div></div>';
    gridFilter();
  }
  function gridFilter() {
    var q = (M.q || '').toLowerCase().trim(), f = M.f, soft = ENT[M.ent].soft, shown = 0, total = 0;
    X.$$('#mst tbody tr[data-q]').forEach(function (tr) {
      var d = tr.dataset, isNew = d.new === '1'; total++;
      var ok = isNew || ((!q || d.q.indexOf(q) >= 0) && (M.ent === 'perusahaan' || !f.comp || d.comp === f.comp) && (!(M.ent === 'shift' || M.ent === 'karyawan') || !f.cab || d.cab === f.cab || (M.ent === 'shift' && d.cab === 'ALL')) && (M.ent !== 'karyawan' || !f.role || d.role === f.role) && (!soft || f.st === 'semua' || d.st === f.st));
      tr.style.display = ok ? '' : 'none'; if (ok) shown++;
    });
    var c = $('#mscount'); if (c) c.textContent = 'Menampilkan ' + shown + ' dari ' + total + ' baris.';
  }
  function saveBtn() { var b = $('#mssave'), n = nDirty(); if (b) { b.disabled = !n; b.lastChild.nodeValue = 'Simpan' + (n ? ' (' + n + ')' : ''); } }
  function gridEdit(e) {
    var el = e.target; if (!el.classList || !el.classList.contains('mi')) return;
    var ent = M.ent, key = el.dataset.k, f = el.dataset.f, nw = (M.news[ent] || []).filter(function (x) { return x._key === key; })[0], pk = ENT[ent].pk;
    var row = nw || (M.rows[ent] || []).filter(function (x) { return x[pk] === key; })[0]; if (!row) return;
    var col = MC[ent].filter(function (c) { return c[0] === f; })[0], v = el.type === 'checkbox' ? el.checked : (col[2] === 'n' ? (el.value === '' ? 0 : Number(el.value)) : el.value);
    var set = function (ff, vv, node) {
      if (nw) { nw[ff] = vv; return; }
      var orig = row[ff], same = typeof vv === 'boolean' ? bv(orig) === vv : String(orig === undefined || orig === null ? '' : orig) === String(vv);
      if (typeof vv === 'number' && Number(orig || 0) === vv) same = true;
      var d = (M.dirty[ent] = M.dirty[ent] || {}); if (same) { if (d[key]) { delete d[key][ff]; if (!Object.keys(d[key]).length) delete d[key]; } } else (d[key] = d[key] || {})[ff] = vv;
      if (node) node.classList.toggle('dirty', !same);
    };
    set(f, v, el); delete M.err[key];
    if (f === 'id_perusahaan') {
      var tr = el.closest('tr');
      [['id_cabang', function () { return cabOptions(v, ent === 'shift'); }, ent === 'shift' ? 'ALL' : ''], ['id_shift_default', function () { return shiftOptions(v); }, 'REGULER']].forEach(function (x) {
        var sel = tr.querySelector('[data-f="' + x[0] + '"]'); if (!sel) return;
        sel.innerHTML = x[1]().map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>'; }).join(''); sel.value = x[2]; set(x[0], sel.value, sel);
      });
    }
    saveBtn();
  }
  function bindGrid(el) {
    var box = $('#mst', el); if (box) { box.oninput = gridEdit; box.onchange = gridEdit; }
    bindFilter(el);
  }
  function bindFilter(el) {
    var q = $('#msq', el); if (q) q.oninput = X.debounce(function () { M.q = q.value; gridFilter(); }, 120);
    var g = function (id, fn) { var n = $('#' + id, el); if (n) n.onchange = function () { fn(n.value); gridFilter(); }; };
    g('fcomp', function (v) { M.f.comp = v; M.f.cab = ''; var bar = $('#msf', el); bar.innerHTML = filterBar(); bindFilter(el); $('#fcomp', el).focus(); });
    g('fcab', function (v) { M.f.cab = v; }); g('frole', function (v) { M.f.role = v; }); g('fst', function (v) { M.f.st = v; });
  }
  function fieldsFor(ent, r) {
    var F = X.field, v = function (k, d) { return r && r[k] !== undefined ? r[k] : d; }, comp = v('id_perusahaan', compOptions()[0] && compOptions()[0].v);
    if (ent === 'perusahaan') return F({ name: 'nama_perusahaan', label: 'Nama Perusahaan', required: true, value: v('nama_perusahaan', '') }) + F({ name: 'pakai_shift', type: 'check', label: 'Perusahaan ini menggunakan sistem shift', value: v('pakai_shift', false) }) +
      '<div class="row2">' + F({ name: 'rumus_lembur_jam', label: 'Pengali Lembur', type: 'number', value: v('rumus_lembur_jam', 1) || 1, attrs: 'min="0.1" max="5" step="0.1"', help: 'Upah/jam = gaji pokok ÷ 173 × pengali. Isi 1 untuk tarif standar.' }) + F({ name: 'toleransi_telat_menit', label: 'Toleransi Telat (menit)', type: 'number', value: v('toleransi_telat_menit', 0), attrs: 'min="0"', help: 'Keterlambatan hanya dicatat (menit & hari), tidak ada potongan.' }) + '</div>' +
      F({ name: 'status_aktif', type: 'check', label: 'Perusahaan aktif', value: v('status_aktif', true) }) +
      (r && r.id_perusahaan ? '<div class="field"><label>Logo Slip Gaji</label><div id="lgbox" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div id="lgprev" class="muted" style="width:120px;height:56px;border:1px dashed var(--line);border-radius:10px;display:grid;place-items:center;font-size:12px;overflow:hidden">Memuat…</div><input type="file" id="lgfile" accept="image/png,image/jpeg,image/webp" hidden><button type="button" class="btn btn-g btn-s" id="lgpick">Unggah Logo</button><button type="button" class="btn btn-g btn-s" id="lgdel">Hapus</button></div><p class="help">PNG/JPG, otomatis diperkecil. Tampil di kop slip gaji PDF.</p></div>' : '<p class="help">Simpan perusahaan dahulu, lalu buka Ubah untuk mengunggah logo slip gaji.</p>');
    if (ent === 'cabang') return F({ name: 'id_perusahaan', label: 'Perusahaan', type: 'select', required: true, value: comp, options: compOptions() }) + F({ name: 'nama_cabang', label: 'Nama Cabang', required: true, value: v('nama_cabang', '') }) +
      '<div class="row2">' + F({ name: 'jam_masuk_reguler', label: 'Jam Masuk Reguler', type: 'time', value: v('jam_masuk_reguler', '08:00') }) + F({ name: 'jam_pulang_reguler', label: 'Jam Pulang Reguler', type: 'time', value: v('jam_pulang_reguler', '17:00') }) + '</div>' +
      '<div class="row2">' + F({ name: 'zona_waktu', label: 'Zona Waktu', type: 'select', value: v('zona_waktu', 'WIB'), options: TZ }) + '</div>';
    if (ent === 'shift') return F({ name: 'id_perusahaan', label: 'Perusahaan', type: 'select', required: true, value: comp, options: compOptions() }) + F({ name: 'id_cabang', label: 'Cabang', type: 'select', required: true, value: v('id_cabang', 'ALL'), options: cabOptions(comp, true) }) + F({ name: 'nama_shift', label: 'Nama Shift', required: true, value: v('nama_shift', ''), placeholder: 'Shift Pagi' }) +
      '<div class="row2">' + F({ name: 'jam_masuk', label: 'Jam Masuk', type: 'time', required: true, value: v('jam_masuk', '08:00') }) + F({ name: 'jam_pulang', label: 'Jam Pulang', type: 'time', required: true, value: v('jam_pulang', '16:00') }) + '</div><p class="help">Jam pulang ≤ jam masuk dianggap shift lintas hari (mis. 23:00–07:00).</p>';
    return F({ name: 'nama_lengkap', label: 'Nama Lengkap', required: true, value: v('nama_lengkap', '') }) + F({ name: 'email', label: 'Email (Google)', type: 'email', required: true, value: v('email', ''), placeholder: 'nama@gmail.com' }) +
      '<div class="row2">' + F({ name: 'no_wa', label: 'No. WhatsApp', value: v('no_wa', ''), placeholder: '628…' }) + F({ name: 'role', label: 'Peran', type: 'select', value: v('role', 'PEGAWAI'), options: ROLES }) + '</div>' +
      F({ name: 'id_perusahaan', label: 'Perusahaan', type: 'select', required: true, value: comp, options: compOptions() }) + '<div class="row2">' + F({ name: 'id_cabang', label: 'Cabang', type: 'select', value: v('id_cabang', ''), options: cabOptions(comp, false) }) + F({ name: 'id_shift_default', label: 'Shift Default', type: 'select', value: v('id_shift_default', 'REGULER'), options: shiftOptions(comp) }) + '</div>' +
      '<div class="row3 keep">' + F({ name: 'nik', label: 'NIK', value: v('nik', '') }) + F({ name: 'jabatan', label: 'Jabatan', value: v('jabatan', '') }) + F({ name: 'golongan_pajak', label: 'Gol. Pajak', value: v('golongan_pajak', ''), placeholder: 'TK/0' }) + '</div>' +
      F({ name: 'status_aktif', type: 'check', label: 'Karyawan aktif', value: v('status_aktif', true) });
  }
  function colsFor(ent) {
    var id = { k: ENT[ent].pk, label: 'ID', render: function (r) { return '<span class="mono muted">' + esc(r[ENT[ent].pk]) + '</span>'; } }, act = { k: 'status_aktif', label: 'Status', render: function (r) { return r.status_aktif === false || r.status_aktif === 'false' ? '<span class="badge b-n">Nonaktif</span>' : '<span class="badge b-ok">Aktif</span>'; } };
    if (ent === 'perusahaan') return [id, { k: 'nama_perusahaan', label: 'Perusahaan', render: function (r) { return '<b>' + esc(r.nama_perusahaan) + '</b>'; } }, { k: 'pakai_shift', label: 'Shift', render: function (r) { return r.pakai_shift ? '<span class="badge b-info">Shift</span>' : '<span class="badge b-n">Reguler</span>'; } }, { k: 'toleransi_telat_menit', label: 'Toleransi', num: true, render: function (r) { return r.toleransi_telat_menit + ' mnt'; } }, { k: 'rumus_lembur_jam', label: 'Pengali Lembur', num: true, render: function (r) { return '×' + (r.rumus_lembur_jam || 1); } }, act];
    if (ent === 'cabang') return [id, { k: 'nama_cabang', label: 'Cabang', render: function (r) { return '<b>' + esc(r.nama_cabang) + '</b>'; } }, { k: 'id_perusahaan', label: 'Perusahaan', render: function (r) { return '<span class="badge b-co">' + esc(compName(r.id_perusahaan)) + '</span>'; } }, { k: 'jam_masuk_reguler', label: 'Jam Reguler', render: function (r) { return '<span class="mono">' + esc(r.jam_masuk_reguler) + '–' + esc(r.jam_pulang_reguler) + '</span>'; } }, { k: 'zona_waktu', label: 'Zona' }];
    if (ent === 'shift') return [id, { k: 'nama_shift', label: 'Shift', render: function (r) { return '<b>' + esc(r.nama_shift) + '</b>'; } }, { k: 'id_perusahaan', label: 'Perusahaan', render: function (r) { return '<span class="badge b-co">' + esc(compName(r.id_perusahaan)) + '</span>'; } }, { k: 'id_cabang', label: 'Cabang', render: function (r) { return esc(cabName(r.id_cabang)); } }, { k: 'jam_masuk', label: 'Jam', render: function (r) { return '<span class="mono">' + esc(r.jam_masuk) + '–' + esc(r.jam_pulang) + '</span>' + (r.lintas_hari ? ' <span class="badge b-warn">+1 hari</span>' : ''); } }];
    return [id, { k: 'nama_lengkap', label: 'Karyawan', render: function (r) { return '<b>' + esc(r.nama_lengkap) + '</b><div class="muted" style="font-size:12px">' + esc(r.email) + '</div>'; } }, { k: 'role', label: 'Peran', render: function (r) { return '<span class="badge ' + (r.role === 'MANAJEMEN' ? 'b-bad' : r.role === 'FINANCE' ? 'b-info' : 'b-n') + '">' + esc(r.role) + '</span>'; } }, { k: 'id_perusahaan', label: 'Perusahaan', render: function (r) { return '<span class="badge b-co">' + esc(compName(r.id_perusahaan)) + '</span>'; } }, act];
  }
  function paintMaster(el) {
    var ent = M.ent; el.innerHTML = masterShell(); bindGrid(el); if (M.rows[ent]) masterTable();
    X.swr('master:' + ent, 'master.list', { entity: ent }, function (rows) { M.rows[ent] = rows; if (M.ent === ent && S.route === 'master') masterTable(true); }, { ttl: 15000 });
  }
  V.master = { render: function (el) { M.el = el; paintMaster(el); }, onBoot: function () { if (S.route === 'master') masterTable(true); } };
  X.ACT['ms-tab'] = function (b) { M.ent = b.dataset.e; M.q = ''; M.f = { comp: M.f.comp, cab: '', role: '', st: 'aktif' }; paintMaster(M.el); };
  var NEWDEF = function (ent) {
    var c0 = (compOptions()[0] || {}).v || '', cb = cabOptions(c0, false)[1];
    return ({ perusahaan: { nama_perusahaan: '', pakai_shift: false, rumus_lembur_jam: 1, toleransi_telat_menit: 0, status_aktif: true },
      cabang: { id_perusahaan: c0, nama_cabang: '', jam_masuk_reguler: '08:00', jam_pulang_reguler: '17:00', zona_waktu: 'WIB' },
      shift: { id_perusahaan: c0, id_cabang: 'ALL', nama_shift: '', jam_masuk: '08:00', jam_pulang: '16:00' },
      karyawan: { nama_lengkap: '', email: '', no_wa: '', role: 'PEGAWAI', id_perusahaan: c0, id_cabang: cb ? cb.v : '', id_shift_default: 'REGULER', nik: '', jabatan: '', golongan_pajak: '', status_aktif: true } })[ent];
  };
  X.ACT['ms-rmnew'] = function (b) { var ent = M.ent; M.news[ent] = (M.news[ent] || []).filter(function (x) { return x._key !== b.dataset.id; }); masterTable(); saveBtn(); };
  X.ACT['ms-logo'] = function (b) {
    var id = b.dataset.id; X.modal({ title: 'Logo Slip Gaji', body: '<div id="lgbox" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div id="lgprev" class="muted" style="width:140px;height:64px;border:1px dashed var(--line);border-radius:10px;display:grid;place-items:center;font-size:12px;overflow:hidden">Memuat…</div><input type="file" id="lgfile" accept="image/png,image/jpeg,image/webp" hidden><button type="button" class="btn btn-g btn-s" id="lgpick">Unggah Logo</button><button type="button" class="btn btn-g btn-s" id="lgdel">Hapus</button></div><p class="help" style="margin-top:10px">PNG/JPG, otomatis diperkecil. Tampil di kop slip gaji PDF.</p>', footer: '<button class="btn btn-g" data-close>Tutup</button>', onOpen: function (m) { logoUi(m, id); } });
  };
  X.ACT['ms-save'] = function (b) {
    var ent = M.ent, pk = ENT[ent].pk, items = [];
    (M.news[ent] || []).forEach(function (r) { var o = Object.assign({}, r); items.push(o); });
    Object.keys(M.dirty[ent] || {}).forEach(function (k) { var o = {}; o[pk] = k; items.push(Object.assign(o, M.dirty[ent][k])); });
    if (!items.length) return;
    var bad = items.filter(function (it) { return it._key && !String(it[ENT[ent].name] || '').trim(); });
    if (bad.length) { bad.forEach(function (it) { M.err[it._key] = 'Nama wajib diisi.'; }); masterTable(); return X.toast('Isi nama pada baris baru terlebih dahulu.', 'warn'); }
    b.disabled = true; b.innerHTML = '<span class="spin"></span>Menyimpan…';
    X.api('master.saveBulk', { entity: ent, items: items }).then(function (res) {
      b.innerHTML = ico('check', 'sm') + 'Simpan';
      if (!res.success) { X.toast(res.message, 'err'); b.disabled = false; return; }
      var okKeys = {}; (res.data.hasil || []).forEach(function (h) { okKeys[h.key] = true; });
      M.news[ent] = (M.news[ent] || []).filter(function (r) { return !okKeys[r._key]; });
      Object.keys(M.dirty[ent] || {}).forEach(function (k) { if (okKeys[k]) delete M.dirty[ent][k]; });
      (res.data.hasil || []).forEach(function (h) { delete M.err[h.key]; });
      (res.data.gagal || []).forEach(function (g) { M.err[g.key] = g.pesan; });
      X.toast(res.message, res.data.gagal.length ? 'warn' : undefined); X.invalidate('master:'); X.invalidate('dash:');
      X.api('master.list', { entity: ent }, { quiet: true }).then(function (r) { if (r.success) { M.rows[ent] = r.data; } if (M.ent === ent) { masterTable(); saveBtn(); } });
      X.refreshBoot();
    });
  };
  function reload() { X.invalidate('master:'); X.invalidate('dash:'); X.api('master.list', { entity: M.ent }, { quiet: true }).then(function (r) { if (r.success) { M.rows[M.ent] = r.data; if (S.route === 'master') masterTable(true); } }); X.refreshBoot(); }
  function logoUi(m, id) {
    var prev = m.$('#lgprev'), file = m.$('#lgfile'), show = function (src) { prev.innerHTML = src ? '<img alt="Logo" src="' + src + '" style="max-width:100%;max-height:100%;object-fit:contain">' : 'Belum ada logo'; };
    X.api('logo.get', { id_perusahaan: id }, { quiet: true }).then(function (r) { if (prev.isConnected) show(r.success ? r.data.src : ''); });
    m.$('#lgpick').onclick = function () { file.click(); };
    file.onchange = function () {
      var f = file.files && file.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () {
        var img = new Image(); img.onload = function () {
          var k = Math.min(1, 360 / img.width, 160 / img.height), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); var d = cv.toDataURL('image/png'); show(d); prev.classList.add('sk');
          X.api('logo.save', { id_perusahaan: id, foto: d }).then(function (res) { prev.classList.remove('sk'); X.toast(res.message, res.success ? undefined : 'err'); if (!res.success) show(''); });
        }; img.onerror = function () { X.toast('File gambar tidak valid.', 'err'); }; img.src = String(rd.result);
      }; rd.readAsDataURL(f); file.value = '';
    };
    m.$('#lgdel').onclick = function () { X.api('logo.save', { id_perusahaan: id, hapus: true }).then(function (res) { X.toast(res.message, res.success ? undefined : 'err'); if (res.success) show(''); }); };
  }
  function openForm(ent, row, prefill) {
    var e = ENT[ent], r = prefill || row;
    X.modal({ title: (row ? 'Ubah ' : 'Tambah ') + e.label, body: fieldsFor(ent, r), footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="sv">Simpan</button>',
      onOpen: function (m) {
        var comp = m.$('[name=id_perusahaan]');
        if (ent === 'perusahaan' && row) logoUi(m, row.id_perusahaan);
        if (comp && (ent === 'shift' || ent === 'karyawan')) comp.onchange = function () {
          var cab = m.$('[name=id_cabang]'), sh = m.$('[name=id_shift_default]'), opt = function (arr) { return arr.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + '</option>'; }).join(''); };
          if (cab) cab.innerHTML = opt(cabOptions(comp.value, ent === 'shift')); if (sh) sh.innerHTML = opt(shiftOptions(comp.value));
        };
        m.$('#sv').onclick = function () {
          var f = X.readForm(m.el);
          if (ent === 'perusahaan' && !f.nama_perusahaan.trim()) return X.toast('Nama perusahaan wajib diisi.', 'warn');
          if (ent === 'cabang' && !f.nama_cabang.trim()) return X.toast('Nama cabang wajib diisi.', 'warn');
          if (ent === 'shift' && (!f.nama_shift.trim() || !f.jam_masuk || !f.jam_pulang)) return X.toast('Lengkapi nama dan jam shift.', 'warn');
          if (ent === 'karyawan' && (!f.nama_lengkap.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))) return X.toast('Nama dan email yang valid wajib diisi.', 'warn');
          if (row) f[e.pk] = row[e.pk];
          ['rumus_lembur_jam', 'toleransi_telat_menit'].forEach(function (k) { if (f[k] !== undefined) f[k] = Number(f[k]) || 0; });
          var tmp = Object.assign({}, row || {}, f, { tmp: true }); if (!row) tmp[e.pk] = 'tmp'; var bak = (M.rows[ent] || []).slice();
          M.rows[ent] = row ? bak.map(function (x) { return x[e.pk] === row[e.pk] ? tmp : x; }) : [tmp].concat(bak); masterTable(); m.close();           // optimistic
          X.api('master.save', { entity: ent, row: f }).then(function (res) {
            if (!res.success) { M.rows[ent] = bak; if (M.ent === ent) masterTable(); X.toast(res.message, 'err'); openForm(ent, row, f); return; }
            X.toast(res.message); reload();
          });
        };
      } });
  }
  X.ACT['ms-add'] = function () {
    if (!compOptions().length && M.ent !== 'perusahaan') return X.toast('Buat perusahaan terlebih dahulu.', 'warn');
    var o = NEWDEF(M.ent); o._new = true; o._key = 'NEW-' + (++M.n); (M.news[M.ent] = M.news[M.ent] || []).unshift(o); M.q = ''; var q = $('#msq'); if (q) q.value = '';
    masterTable(); saveBtn(); var f = document.querySelector('#mst tbody tr input.mi'); if (f) f.focus();
  };
  X.ACT['ms-edit'] = function (b) { var e = ENT[M.ent], r = (M.rows[M.ent] || []).filter(function (x) { return x[e.pk] === b.dataset.id; })[0]; if (r) openForm(M.ent, r); };
  X.ACT['ms-del'] = function (b) {
    var ent = M.ent, e = ENT[ent], r = (M.rows[ent] || []).filter(function (x) { return x[e.pk] === b.dataset.id; })[0]; if (!r) return;
    var st = rowState(r), nm = r[e.name];
    var run = function (mode) {
      var bak = M.rows[ent].slice(), up = function (patch) { return bak.map(function (x) { return x[e.pk] === r[e.pk] ? Object.assign({}, x, patch) : x; }); };
      M.rows[ent] = mode === 'hapus' ? bak.filter(function (x) { return x[e.pk] !== r[e.pk]; }) : mode === 'nonaktif' ? up({ status_aktif: false }) : mode === 'aktif' ? up({ status_aktif: true }) : mode === 'sembunyi' ? up({ tersembunyi: true }) : up({ tersembunyi: false });
      masterTable();
      X.api('master.delete', { entity: ent, id: r[e.pk], mode: mode }).then(function (res) { if (!res.success) { M.rows[ent] = bak; if (M.ent === ent) masterTable(); X.toast(res.message, 'err'); } else { X.toast(res.message); reload(); } });
    };
    var hapus = function () {
      X.confirm({ title: 'Hapus permanen ' + e.label.toLowerCase() + '?', html: '<b>' + esc(nm) + '</b> akan dihapus dari database dan <b>tidak bisa dikembalikan</b>.' + (ent === 'karyawan' ? ' Riwayat absensi &amp; slip lama tetap tersimpan tetapi tidak lagi terhubung ke nama ini.' : ''), danger: true, ok: 'Hapus permanen' }).then(function (ok) { if (ok) run('hapus'); });
    };
    if (!e.soft) return hapus();
    var item = function (mode, ic, title, desc, danger) { return '<button class="btn btn-g" data-mode="' + mode + '" style="width:100%;justify-content:flex-start;text-align:left;margin-bottom:8px;height:auto;padding:10px 12px;' + (danger ? 'color:var(--bad)' : '') + '"><span style="display:block"><b>' + title + '</b><span class="muted" style="display:block;font-size:12px;font-weight:400;white-space:normal">' + desc + '</span></span></button>'; };
    var body = (st === 'aktif' ? item('nonaktif', '', 'Nonaktifkan', 'Tidak bisa login dan tidak ikut absensi/payroll. Data & riwayat tetap ada, bisa diaktifkan lagi.') : '') +
      (st === 'nonaktif' ? item('aktif', '', 'Aktifkan kembali', 'Kembali aktif seperti semula.') : '') +
      (st !== 'sembunyi' ? item('sembunyi', '', 'Sembunyikan', 'Hilang dari daftar (arsip). Data tetap utuh; tampil lagi lewat filter status “Disembunyikan”.') : item('tampil', '', 'Tampilkan kembali', 'Muncul lagi di daftar.')) +
      item('hapus', '', 'Hapus permanen', 'Dihapus dari database, tidak bisa dibatalkan.', true);
    X.modal({ title: nm, body: body, footer: '<button class="btn btn-g" data-close>Batal</button>', onOpen: function (m) {
      X.$$('[data-mode]', m.el).forEach(function (bt) { bt.onclick = function () { var mode = bt.dataset.mode; m.close(); if (mode === 'hapus') hapus(); else run(mode); }; });
    } });
  };

  /* ---------------------------------------------------------------- HAK AKSES */
  var K = { data: null, dirty: {}, el: null, tab: 'keuangan' };
  var PERM = [['can_manage_kasbon', 'Kelola potongan'], ['can_master_gaji', 'Master gaji'], ['can_manage_bonus', 'Kelola bonus'], ['can_koreksi_lembur', 'Koreksi lembur'], ['can_generate_payroll', 'Hitung payroll'], ['can_send_payslip', 'Kirim slip gaji']];
  var PERM_ABS = [['can_edit_absen', 'Ubah data kedatangan'], ['can_absen_wakil', 'Absenkan karyawan (foto)'], ['can_approve_lembur', 'Setujui lembur']];
  function aksesHtml() {
    if (!K.data) return '<div class="page">' + X.skel(3, 180) + '</div>';
    var n = Object.keys(K.dirty).length;
    var head = '<div class="toolbar"><p class="help grow">Atur izin per akun, dipisah: <b>Akses Keuangan</b> (khusus Finance: gaji, bonus, payroll, slip) dan <b>Akses Absensi &amp; Lembur</b> (Finance, HR, Kepala Toko: ubah absensi, absenkan, setujui lembur). Perubahan dari kedua tab disimpan bersamaan.</p><button class="btn btn-p" data-act="ak-save" ' + (n ? '' : 'disabled') + '>' + ico('check', 'sm') + 'Simpan' + (n ? ' (' + n + ')' : '') + '</button></div>';
    if (!K.data.users.length) return '<div class="page">' + head + '<div class="card flat">' + X.empty('shield', 'Belum ada akun Finance/HR/Kepala Toko', 'Buat karyawan dengan peran tersebut di Master Data → Karyawan.', '<button class="btn btn-p" data-go="master">Ke Master Data</button>') + '</div></div>';
    var tabs = '<div class="seg" style="margin-bottom:14px" role="tablist"><button class="' + (K.tab === 'keuangan' ? 'on' : '') + '" data-act="ak-tab" data-t="keuangan">Akses Keuangan (Finance)</button><button class="' + (K.tab === 'absensi' ? 'on' : '') + '" data-act="ak-tab" data-t="absensi">Akses Absensi & Lembur</button></div>';
    var shown = K.data.users.filter(function (u) { return K.tab === 'absensi' || u.role === 'FINANCE'; });
    if (!shown.length) return '<div class="page">' + head + tabs + '<div class="card flat">' + X.empty('shield', 'Belum ada akun', 'Buat karyawan dengan peran Finance di Master Data → Karyawan.', '<button class="btn btn-p" data-go="master">Ke Master Data</button>') + '</div></div>';
    return '<div class="page">' + head + tabs + '<div class="grid g2">' + shown.map(function (u) {
      var p = K.dirty[u.id_karyawan] || u.perms, all = p.allowed_companies.indexOf('ALL') >= 0;
      return '<div class="card"><div class="prof" style="margin-bottom:12px"><span class="av">' + esc(X.initials(u.nama)) + '</span><div style="min-width:0"><b>' + esc(u.nama) + '</b>' + (u.aktif ? '' : ' <span class="badge b-n">Nonaktif</span>') + ' <span class="badge b-info">' + esc(u.role || 'FINANCE') + '</span><div class="muted" style="font-size:12px">' + esc(u.email) + '</div></div></div>' +
        (K.tab === 'keuangan' ? PERM : PERM_ABS).map(function (x) { return '<div class="sline" style="align-items:center"><span>' + x[1] + '</span><label class="sw"><input type="checkbox" data-pm="' + esc(u.id_karyawan) + '|' + x[0] + '" ' + (p[x[0]] ? 'checked' : '') + ' aria-label="' + esc(x[1]) + '"></label></div>'; }).join('') +
        (K.tab === 'absensi' && u.role === 'KEPALA' ? '<p class="help" style="margin-top:12px">Kepala Toko otomatis dibatasi pada <b>cabangnya sendiri</b> (sesuai Master Data → Karyawan).</p></div>' : K.tab === 'absensi' && u.role === 'FINANCE' ? '<p class="help" style="margin-top:12px">Cakupan perusahaan mengikuti pengaturan di tab <b>Akses Keuangan</b>.</p></div>' : '<div class="lbl" style="margin:14px 0 8px">AKSES PERUSAHAAN</div><label class="chk"><input type="checkbox" data-pall="' + esc(u.id_karyawan) + '" ' + (all ? 'checked' : '') + '><span>Semua perusahaan</span></label>' +
        (all ? '' : '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">' + (p.allowed_companies.length ? p.allowed_companies.map(function (c) { return '<span class="tag-x">' + esc(compName(c)) + '<button data-act="ak-rm" data-u="' + esc(u.id_karyawan) + '" data-c="' + esc(c) + '" aria-label="Hapus akses">' + ico('x', 'sm') + '</button></span>'; }).join('') : '<span class="muted">Belum ada perusahaan dipilih.</span>') + '</div>' +
          '<select class="sel" data-padd="' + esc(u.id_karyawan) + '" aria-label="Tambah perusahaan"><option value="">+ Tambah perusahaan…</option>' + K.data.perusahaan.filter(function (c) { return p.allowed_companies.indexOf(c.id) < 0; }).map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.nama) + '</option>'; }).join('') + '</select>') + '</div>');
    }).join('') + '</div></div>';
  }
  function cloneP(u) { return JSON.parse(JSON.stringify(K.dirty[u] || K.data.users.filter(function (x) { return x.id_karyawan === u; })[0].perms)); }
  function paintAkses() { var y = window.scrollY; K.el.innerHTML = aksesHtml(); window.scrollTo(0, y); }
  V.akses = {
    render: function (el) {
      K.el = el; K.dirty = {}; el.innerHTML = aksesHtml();
      if (!el.__ak) {
        el.__ak = true;
        el.addEventListener('change', function (e) {
          var t = e.target, pm = t.dataset.pm, pa = t.dataset.pall, pd = t.dataset.padd;
          if (pm) { var s = pm.split('|'), p = cloneP(s[0]); p[s[1]] = t.checked; K.dirty[s[0]] = p; paintAkses(); }
          else if (pa) { var p2 = cloneP(pa); p2.allowed_companies = t.checked ? ['ALL'] : []; K.dirty[pa] = p2; paintAkses(); }
          else if (pd && t.value) { var p3 = cloneP(pd); p3.allowed_companies.push(t.value); K.dirty[pd] = p3; paintAkses(); }
        });
      }
      X.swr('akses', 'akses.list', {}, function (d) { if (S.route === 'akses') { K.data = d; if (!Object.keys(K.dirty).length) { el.innerHTML = aksesHtml(); } } }, { ttl: 15000 });
    }
  };
  X.ACT['ak-tab'] = function (b) { K.tab = b.dataset.t; paintAkses(); };
  X.ACT['ak-rm'] = function (b) { var p = cloneP(b.dataset.u); p.allowed_companies = p.allowed_companies.filter(function (c) { return c !== b.dataset.c; }); K.dirty[b.dataset.u] = p; paintAkses(); };
  X.ACT['ak-save'] = function (b) {
    var items = Object.keys(K.dirty).map(function (id) { return { id_karyawan: id, perms: K.dirty[id] }; }); if (!items.length) return; b.disabled = true;
    var snap = K.dirty; K.data.users.forEach(function (u) { if (snap[u.id_karyawan]) u.perms = snap[u.id_karyawan]; }); K.dirty = {}; paintAkses();            // optimistic
    X.api('akses.save', { items: items }).then(function (r) { if (!r.success) { K.dirty = snap; paintAkses(); return X.toast(r.message, 'err'); } X.toast(r.message); X.invalidate('akses'); X.invalidate('master:karyawan'); });
  };

  /* ---------------------------------------------------------------- PENGATURAN (WA + Email) */
  var W = { d: null, el: null };
  function waHtml(d) {
    if (!d) return '<div class="page">' + X.skel(3, 200) + '</div>';
    var days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], act = String(d.hari).split(',');
    return '<div class="page"><div class="split"><div style="display:flex;flex-direction:column;gap:14px">' +
      '<div class="card"><div class="card-h"><h3>Pengingat WhatsApp</h3><label class="sw"><input type="checkbox" id="w_aktif" ' + (d.aktif ? 'checked' : '') + ' aria-label="Aktifkan pengingat"></label></div>' +
      '<div class="row2">' + X.field({ name: 'provider', label: 'Provider', type: 'select', value: d.provider, options: ['FONNTE', 'WABLAS', 'CUSTOM'] }) + X.field({ name: 'interval', label: 'Interval penjadwal', type: 'select', value: d.interval, options: [{ v: 5, l: 'Tiap 5 menit' }, { v: 10, l: 'Tiap 10 menit' }, { v: 15, l: 'Tiap 15 menit' }, { v: 30, l: 'Tiap 30 menit' }] }) + '</div>' +
      X.field({ name: 'url', label: 'URL API Gateway', value: d.url, placeholder: 'https://api.fonnte.com/send' }) +
      X.field({ name: 'token', label: 'Token API', type: 'password', value: '', placeholder: d.tokenSet ? d.tokenMasked + ' (tersimpan)' : 'Tempel token dari provider', attrs: 'autocomplete="new-password"', help: 'Token disimpan aman di Script Properties — tidak pernah ditampilkan kembali.' }) +
      (d.tokenSet ? X.field({ name: 'hapusToken', type: 'check', label: 'Hapus token tersimpan' }) : '') +
      '<div class="row2">' + X.field({ name: 'menitSebelum', label: 'Ingatkan H- (menit)', type: 'number', value: d.menitSebelum, attrs: 'min="1" max="120"' }) + '<div class="field"><label>Hari aktif</label><div style="display:flex;gap:4px;flex-wrap:wrap">' + days.map(function (n, i) { return '<label class="chk" style="min-height:34px"><input type="checkbox" data-day="' + i + '" ' + (act.indexOf(String(i)) >= 0 ? 'checked' : '') + '><span>' + n + '</span></label>'; }).join('') + '</div></div></div>' +
      '<div class="row2 keep">' + X.field({ name: 'masukAktif', type: 'check', label: 'Kirim pengingat MASUK', value: d.masukAktif }) + X.field({ name: 'pulangAktif', type: 'check', label: 'Kirim pengingat PULANG', value: d.pulangAktif }) + '</div>' +
      X.field({ name: 'menitSetelah', label: 'Ingatkan pulang X menit setelah jam pulang', type: 'number', value: d.menitSetelah, attrs: 'min="0" max="240"', help: '0 = tepat saat jam pulang, bila pegawai belum absen pulang.' }) +
      X.field({ name: 'tplPagi', label: 'Template pengingat masuk', type: 'textarea', value: d.tplPagi, help: 'Variabel: {nama} {shift} {jam_masuk} {jam_pulang} {cabang} {perusahaan}' }) + X.field({ name: 'tplPulang', label: 'Template pengingat pulang', type: 'textarea', value: d.tplPulang }) + '</div>' +
      '<div class="card"><div class="card-h"><h3>Notifikasi Email Keterlambatan</h3><label class="sw"><input type="checkbox" id="w_email" ' + (d.emailTelat ? 'checked' : '') + ' aria-label="Aktifkan email telat"></label></div>' +
      X.field({ name: 'ccTelat', label: 'CC (opsional)', value: d.ccTelat, placeholder: 'hr@perusahaan.com, manajer@perusahaan.com' }) + X.field({ name: 'telatMode', label: 'Perhitungan menit telat', type: 'select', value: d.telatMode, options: [{ v: 'JADWAL', l: 'Dari jam jadwal (tanpa mengurangi toleransi)' }, { v: 'SETELAH_TOLERANSI', l: 'Setelah toleransi dikurangi' }] }) + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:14px"><div class="card"><div class="card-h"><h3>Penjadwal Otomatis</h3><span class="badge ' + (d.triggerAktif ? 'b-ok' : 'b-n') + '">' + (d.triggerAktif ? 'Berjalan' : 'Mati') + '</span></div><p class="help" style="margin-bottom:12px">Trigger waktu Apps Script memeriksa pengingat sesuai interval. Aktifkan setelah menyimpan pengaturan.</p><button class="btn ' + (d.triggerAktif ? 'btn-g' : 'btn-p') + ' btn-block" data-act="wa-trg" data-on="' + (d.triggerAktif ? '0' : '1') + '">' + ico('zap', 'sm') + (d.triggerAktif ? 'Matikan penjadwal' : 'Aktifkan penjadwal') + '</button></div>' +
      '<div class="card"><div class="card-h"><h3>Kirim Pesan Uji</h3></div>' + X.field({ name: 'tNo', label: 'Nomor tujuan', placeholder: '628…' }) + '<button class="btn btn-g btn-block" data-act="wa-test">' + ico('send', 'sm') + 'Kirim uji</button></div>' +
      '<button class="btn btn-p btn-block btn-xl" data-act="wa-save">' + ico('check') + 'Simpan Pengaturan</button></div></div></div>';
  }
  V.wa = { render: function (el) { W.el = el; el.innerHTML = waHtml(W.d); X.swr('wa', 'wa.get', {}, function (d) { if (S.route === 'wa') { W.d = d; el.innerHTML = waHtml(d); } }, { ttl: 10000 }); } };
  X.ACT['wa-save'] = function (b) {
    var f = X.readForm(W.el), days = X.$$('[data-day]', W.el).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.day; }).join(',');
    b.disabled = true; b.innerHTML = '<span class="spin"></span>Menyimpan…';
    X.api('wa.save', { aktif: $('#w_aktif').checked, provider: f.provider, url: f.url, token: f.token, hapusToken: f.hapusToken, menitSebelum: f.menitSebelum, masukAktif: !!f.masukAktif, pulangAktif: !!f.pulangAktif, menitSetelah: Number(f.menitSetelah) || 0, interval: Number(f.interval), hari: days, tplPagi: f.tplPagi, tplPulang: f.tplPulang, emailTelat: $('#w_email').checked, ccTelat: f.ccTelat, telatMode: f.telatMode }).then(function (r) {
      if (!r.success) { b.disabled = false; b.innerHTML = ico('check') + 'Simpan Pengaturan'; return X.toast(r.message, 'err'); }
      W.d = r.data; X.invalidate('wa'); X.toast('Pengaturan disimpan.'); S.boot.app.wa = r.data.aktif; S.boot.app.telatMode = r.data.telatMode; X.LS.set('boot', S.boot); W.el.innerHTML = waHtml(r.data);
    });
  };
  X.ACT['wa-trg'] = function (b) { b.disabled = true; X.api('wa.trigger', { aktif: b.dataset.on === '1' }).then(function (r) { b.disabled = false; if (!r.success) return X.toast(r.message, 'err'); W.d.triggerAktif = r.data.triggerAktif; X.toast(r.message); W.el.innerHTML = waHtml(W.d); }); };
  X.ACT['wa-test'] = function (b) { var no = (X.readForm(W.el).tNo || '').trim(); if (!no) return X.toast('Isi nomor tujuan.', 'warn'); b.disabled = true; X.api('wa.test', { no_wa: no }).then(function (r) { b.disabled = false; X.toast(r.message, r.success ? '' : 'err'); }); };

  /* ---------------------------------------------------------------- MIGRASI */
  var G = { tipe: 'ABSENSI', text: '', res: null };
  var TPL = {
    ABSENSI: 'tanggal,email,jam_masuk,jam_pulang,id_shift\n2026-10-01,budi@contoh.com,07:58,17:05,\n2026-10-02,budi@contoh.com,08:20,17:00,',
    PAYROLL: 'No,Bulan,Tahun,NIK,Nama Karyawan,Cabang,Kehadiran (Hari),Jam Lembur,Bonus (%),Golongan Pajak,Gaji Pokok,Tunjangan Jabatan,Tunjangan Kinerja,Tunjangan Keluarga,Tunjangan Kehadiran,Lembur (Rp),Subsidi BPJS,Bonus (Rp),Tarif Pajak,Cicilan BMT,Potongan BPJS,Simpanan BMT,Potongan PPh21,GAJI BERSIH (THP)\n1,Agustus,2025,3201001,Siti Rahma,Toko Utama,26,2,0%,TK/0,4000000,300000,200000,0,150000,50000,0,0,0.00%,250000,100000,50000,0,4300000',
    KARYAWAN: 'email,nama_lengkap,no_wa,role,id_perusahaan,id_cabang,nik,jabatan,golongan_pajak,gaji_pokok,Tunjangan Jabatan,Cicilan BMT\nsiti@contoh.com,Siti Rahma,081234567890,PEGAWAI,COMP-01,BR-001,3201001,Staf Admin,TK/0,4000000,100000,300000,150000'
  };
  function migHtml() {
    var r = G.res, hint = G.tipe === 'PAYROLL' ? 'Salin langsung tabel <b>Input Data Gaji Bulanan</b> lama (satu baris = satu karyawan per bulan). Kolom wajib: <b>Bulan, Tahun</b>. Karyawan dicocokkan lewat NIK lalu nama; bila belum ketemu, baris <b>tetap diimpor</b> dan terhubung otomatis setelah data Karyawan cocok. Kolom <b>Tunjangan…/Subsidi…</b> = pendapatan, <b>Potongan…/Cicilan…/Simpanan…/PPh…</b> = potongan; selisih THP dicatat sebagai baris Penyesuaian.' : G.tipe === 'ABSENSI' ? 'Kolom wajib: <b>tanggal, email, jam_masuk, jam_pulang</b>. Opsional: id_shift. Telat &amp; lembur dihitung otomatis; status ditandai MIGRASI_LAMA.' : 'Boleh tanpa email/ID: kolom dikenali dari <b>NIK, Nama Karyawan, Perusahaan, Cabang</b> (nama atau ID). Data tidak cocok tetap diimpor dengan nilai bawaan + peringatan, lalu rapikan langsung di tabel Master Data. Karyawan yang sudah ada (NIK/email sama) diperbarui.';
    return '<div class="page"><div class="split"><div class="card"><div class="card-h"><h3>Impor Data Lama</h3><div class="seg"><button class="' + (G.tipe === 'ABSENSI' ? 'on' : '') + '" data-act="mg-tipe" data-t="ABSENSI">Absensi</button><button class="' + (G.tipe === 'KARYAWAN' ? 'on' : '') + '" data-act="mg-tipe" data-t="KARYAWAN">Karyawan</button><button class="' + (G.tipe === 'PAYROLL' ? 'on' : '') + '" data-act="mg-tipe" data-t="PAYROLL">Gaji Lama</button></div></div>' +
      '<div class="banner info" style="margin-bottom:14px">' + ico('info') + '<div>' + hint + ' Salin dari Excel/Sheets (TSV) atau CSV, baris pertama = judul kolom.</div></div>' +
      '<div class="field"><label for="mgtxt">Tempel data atau pilih file</label><textarea class="txt mono" id="mgtxt" style="min-height:200px;font-size:12px" placeholder="Tempel data di sini…" spellcheck="false">' + esc(G.text) + '</textarea></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn btn-g" style="cursor:pointer">' + ico('upload', 'sm') + 'Pilih file CSV/TSV<input type="file" id="mgfile" accept=".csv,.tsv,.txt" style="display:none"></label><button class="btn btn-g" data-act="mg-tpl">' + ico('download', 'sm') + 'Unduh templat</button><span class="grow" style="flex:1"></span>' + (G.tipe === 'PAYROLL' ? '<button class="btn btn-g" data-act="mg-relink">' + ico('check', 'sm') + 'Cocokkan ulang karyawan</button>' : '') + '<button class="btn btn-p" data-act="mg-val">' + ico('search', 'sm') + 'Validasi (uji coba)</button></div></div>' +
      '<div class="card"><div class="card-h"><h3>Hasil Validasi</h3></div>' + (r ? '<div class="grid g2 keep" style="margin-bottom:12px">' + stat('Akan diimpor', r.valid, 'dari ' + r.total, 'ic-ok', 'check') + stat('Ditolak', r.jumlahError, 'tidak bisa diimpor', r.jumlahError ? 'ic-w' : 'ic-ok', 'alert') + '</div>' +
        (r.contoh.length ? '<div class="lbl" style="margin-bottom:6px">CONTOH BARIS VALID</div><div class="muted" style="font-size:12px;margin-bottom:12px">' + r.contoh.map(esc).join('<br>') + '</div>' : '') +
        (r.peringatan && r.peringatan.length ? '<div class="lbl" style="margin-bottom:6px;color:var(--warn)">PERINGATAN — tetap diimpor (' + r.jumlahPeringatan + ')</div><div style="max-height:160px;overflow:auto;margin-bottom:12px">' + r.peringatan.map(function (e) { return '<div class="sline" style="font-size:12px"><b class="mono">Baris ' + e.baris + '</b><span style="color:var(--warn);text-align:right">' + esc(e.pesan) + '</span></div>'; }).join('') + '</div>' : '') +
        (r.errors.length ? '<div class="lbl" style="margin-bottom:6px">TIDAK BISA DIIMPOR (maks. 100)</div><div style="max-height:200px;overflow:auto">' + r.errors.map(function (e) { return '<div class="sline" style="font-size:12px"><b class="mono">Baris ' + e.baris + '</b><span style="color:var(--bad);text-align:right">' + esc(e.pesan) + '</span></div>'; }).join('') + '</div>' : '') +
        '<button class="btn btn-ok btn-block" style="margin-top:14px" data-act="mg-imp" ' + (r.valid ? '' : 'disabled') + '>' + ico('upload', 'sm') + 'Impor ' + r.valid + ' baris</button>' : X.empty('upload', 'Belum divalidasi', 'Tekan “Validasi” untuk memeriksa data sebelum diimpor. Tidak ada data yang diubah pada tahap ini.')) + '</div></div></div>';
  }
  function paintMig() { var el = G.el; el.innerHTML = migHtml(); var t = $('#mgtxt', el); t.oninput = function () { G.text = t.value; if (G.res) { G.res = null; } }; var f = $('#mgfile', el); f.onchange = function () { var file = f.files && f.files[0]; if (!file) return; var rd = new FileReader(); rd.onload = function () { G.text = String(rd.result || ''); G.res = null; paintMig(); }; rd.readAsText(file); }; }
  V.migrasi = { render: function (el) { G.el = el; paintMig(); } };
  X.ACT['mg-tipe'] = function (b) { G.tipe = b.dataset.t; G.res = null; G.text = ''; paintMig(); };
  X.ACT['mg-tpl'] = function () { X.saveText('templat_' + G.tipe.toLowerCase() + '.csv', TPL[G.tipe]); };
  X.ACT['mg-val'] = function (b) {
    G.text = $('#mgtxt').value; if (!G.text.trim()) return X.toast('Tempel data terlebih dahulu.', 'warn'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Memeriksa…';
    X.api('migrasi.validate', { tipe: G.tipe, text: G.text }).then(function (r) { if (!r.success) { X.toast(r.message, 'err'); } else G.res = r.data; paintMig(); });
  };
  X.ACT['mg-relink'] = function (b) { b.disabled = true; X.api('migrasi.relink', {}).then(function (r) { b.disabled = false; X.toast(r.message, r.success ? undefined : 'err'); if (r.success) { X.invalidate(''); } }); };
  X.ACT['mg-imp'] = function (b) {
    X.confirm({ title: 'Impor ' + G.res.valid + ' baris?', html: 'Data akan ditambahkan/diperbarui pada <b>' + (G.tipe === 'ABSENSI' ? 'Absensi' : G.tipe === 'PAYROLL' ? 'Payroll (gaji lama)' : 'Karyawan') + '</b>. ' + (G.res.jumlahPeringatan ? G.res.jumlahPeringatan + ' peringatan tetap diimpor. ' : '') + G.res.jumlahError + ' baris ditolak. Baris migrasi dapat ditimpa dengan impor ulang.', ok: 'Impor Sekarang' }).then(function (ok) {
      if (!ok) return; b.disabled = true; b.innerHTML = '<span class="spin"></span>Mengimpor…';
      X.api('migrasi.import', { tipe: G.tipe, text: G.text }).then(function (r) {
        if (!r.success) { X.toast(r.message, 'err'); paintMig(); return; }
        X.toast(r.message); G.res = null; G.text = ''; X.invalidate(''); X.refreshBoot(); paintMig();
      });
    });
  };

  /* ---------------------------------------------------------------- HR: MONITOR ABSEN & REKAP */
  var HM = { tgl: '', comp: '', cab: '', st: 'semua', q: '', data: null, el: null };
  var LSB = { PENDING: ['menunggu', 'b-warn'], DISETUJUI: ['disetujui', 'b-ok'], DITOLAK: ['ditolak', 'b-bad'] };
  function can(k) { return !!(S.boot.me.perms && S.boot.me.perms[k]); }
  function canEdit() { return can('can_edit_absen'); }
  var HSTAT = { BELUM: ['Belum absen', 'b-bad'], TERLAMBAT: ['Terlambat', 'b-warn'], HADIR: ['Hadir', 'b-ok'], PULANG: ['Sudah pulang', 'b-info'], IZIN: ['Izin', 'b-info'], SAKIT: ['Sakit', 'b-info'] };
  function hrToday() { return X.nowIn(S.tz).date; }
  function addDay(d, n) { var t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function cabSel(id, comp, val) { return selHtml(id, [{ v: '', l: 'Semua cabang' }].concat(pick().cabang.filter(function (c) { return !comp || c.id_perusahaan === comp; }).map(function (c) { return { v: c.id, l: c.nama }; })), val, 170); }
  function hmBar() {
    return '<div class="toolbar" style="gap:8px"><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-g btn-s" data-act="hm-prev" aria-label="Hari sebelumnya">' + ico('chevL', 'sm') + '</button><input type="date" class="inp" id="hmtgl" value="' + esc(HM.tgl) + '" max="' + esc(hrToday()) + '" style="width:150px" aria-label="Tanggal"><button class="btn btn-g btn-s" data-act="hm-next" aria-label="Hari berikutnya" ' + (HM.tgl >= hrToday() ? 'disabled' : '') + '>' + ico('chevR', 'sm') + '</button></div>' +
      selHtml('hmcomp', [{ v: '', l: 'Semua perusahaan' }].concat(compOptions()), HM.comp, 190) + '<span id="hmcabw">' + cabSel('hmcab', HM.comp, HM.cab) + '</span><span class="grow"></span><button class="btn btn-g btn-s" data-act="hm-refresh">' + ico('refresh', 'sm') + 'Muat ulang</button></div>';
  }
  function hmBody() {
    var d = HM.data; if (!d) return '<div class="grid g4">' + X.skel(4, 100) + '</div><div style="margin-top:14px">' + X.skel(5, 52) + '</div>';
    var sm = d.summary, q = HM.q.toLowerCase().trim();
    var rows = d.rows.filter(function (r) { return (HM.st === 'semua' || r.status === HM.st || (HM.st === 'IZINSAKIT' && (r.status === 'IZIN' || r.status === 'SAKIT')) || (HM.st === 'BELUMPULANG' && r.waktu_masuk && !r.waktu_pulang)) && (!q || (r.nama + ' ' + r.jabatan + ' ' + r.cabang).toLowerCase().indexOf(q) >= 0); });
    var chips = [['semua', 'Semua', sm.total], ['BELUM', 'Belum absen', sm.belum], ['TERLAMBAT', 'Terlambat', sm.terlambat], ['BELUMPULANG', 'Belum pulang', sm.belumPulang], ['PULANG', 'Sudah pulang', sm.pulang], ['IZINSAKIT', 'Izin/Sakit', (sm.izin || 0) + (sm.sakit || 0)]];
    return '<div class="grid g4" style="margin-bottom:14px">' + stat('Karyawan', sm.total, X.dateLabel(d.tanggal), 'ic-p', 'users') + stat('Sudah Absen', sm.hadir, sm.total ? Math.round(sm.hadir / sm.total * 100) + '% hadir' : '', 'ic-ok', 'check') + stat('Belum Absen', sm.belum, 'perlu dicek', 'ic-w', 'alert') + stat('Terlambat', sm.terlambat, sm.menitTelat + ' menit total', 'ic-b', 'clock') + '</div>' +
      '<div class="toolbar" style="gap:8px"><div class="seg" role="tablist">' + chips.map(function (c) { return '<button class="' + (HM.st === c[0] ? 'on' : '') + '" data-act="hm-st" data-s="' + c[0] + '">' + c[1] + ' <span class="muted">' + c[2] + '</span></button>'; }).join('') + '</div><div class="search grow" style="min-width:180px"><span>' + ico('search', 'sm') + '</span><input class="inp" id="hmq" placeholder="Cari nama / jabatan / cabang…" value="' + esc(HM.q) + '" aria-label="Cari"></div></div>' +
      '<div class="card flat" style="padding:0;overflow:hidden"><div style="overflow:auto;max-height:68vh"><table class="t"><thead><tr><th>Karyawan</th><th>Cabang</th><th>Status</th><th>Masuk</th><th>Pulang</th><th class="num">Telat</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) {
        var stt = HSTAT[r.status], wa = r.no_wa ? '<a class="btn btn-g btn-s" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/' + esc(r.no_wa) + '" aria-label="WhatsApp">WA</a>' : '';
        return '<tr><td><b>' + esc(r.nama) + '</b><div class="muted" style="font-size:12px">' + esc(r.jabatan || r.perusahaan) + '</div></td><td>' + esc(r.cabang) + '</td><td><span class="badge ' + stt[1] + '">' + stt[0] + '</span>' + (r.status === 'IZIN' || r.status === 'SAKIT' ? '<div class="muted" style="font-size:11px">' + (r.izin_dihitung ? 'dihitung hadir' : 'tidak dihitung') + '</div>' : '') + (r.izin_menunggu ? '<div class="muted" style="font-size:11px">ada pengajuan izin</div>' : '') + '</td><td class="mono">' + (r.waktu_masuk ? X.hm(r.waktu_masuk) : '–') + (r.jadwal_masuk ? '<div class="muted" style="font-size:11px">jadwal ' + esc(r.jadwal_masuk) + '</div>' : '') + '</td><td class="mono">' + (r.waktu_pulang ? X.hm(r.waktu_pulang) : '–') + (r.menit_lembur ? '<div style="font-size:11px"><span class="badge ' + LSB[r.status_lembur || 'DISETUJUI'][1] + '" title="' + esc(r.alasan_lembur) + '">Lembur ' + r.menit_lembur + 'm · ' + LSB[r.status_lembur || 'DISETUJUI'][0] + '</span></div>' : '') + (r.diubah_oleh ? '<div class="muted" style="font-size:10px" title="Diubah oleh ' + esc(r.diubah_oleh) + '">diubah manual</div>' : '') + '</td><td class="num mono">' + (r.menit_terlambat ? r.menit_terlambat + ' mnt' : '–') + '</td><td style="white-space:nowrap">' +
          (r.id_absen ? '<button class="btn btn-g btn-s" data-act="hm-foto" data-id="' + esc(r.id_absen) + '" data-n="' + esc(r.nama) + '" data-in="' + (r.foto_masuk ? 1 : 0) + '" data-out="' + (r.foto_pulang ? 1 : 0) + '">Foto</button> ' : (wa + ' ')) +
          (can('can_absen_wakil') && HM.tgl === hrToday() && (!r.id_absen || !r.waktu_pulang) ? '<button class="btn btn-p btn-s" data-act="hm-wakil" data-id="' + esc(r.id_karyawan) + '" data-k="' + (r.id_absen ? 'OUT' : 'IN') + '">' + ico('clock', 'sm') + (r.id_absen ? 'Absenkan pulang' : 'Absenkan masuk') + '</button> ' : '') +
          (canEdit() && r.id_absen ? '<button class="btn btn-g btn-s" data-act="hm-hapus" data-id="' + esc(r.id_absen) + '" data-n="' + esc(r.nama) + '" aria-label="Hapus absensi" title="Hapus absensi hari ini">' + ico('trash', 'sm') + '</button> ' : '') + (canEdit() && !r.id_absen && r.status === 'BELUM' ? '<button class="btn btn-g btn-s" data-act="iz-catat" data-id="' + esc(r.id_karyawan) + '" data-t="' + esc(HM.tgl) + '">Izin/Sakit</button> ' : '') + (canEdit() ? '<button class="btn btn-g btn-s" data-act="hm-edit" data-id="' + esc(r.id_karyawan) + '">' + (r.id_absen ? 'Ubah' : 'Isi manual') + '</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">Tidak ada data untuk filter ini.</td></tr>') + '</tbody></table></div></div>';
  }
  function hmPaint(force) {
    var el = HM.el; if (!el) return;
    el.innerHTML = '<div class="page"><div id="hmbar">' + hmBar() + '</div><div id="hmbody">' + hmBody() + '</div></div>'; hmBind();
    var key = 'hmon:' + HM.tgl + ':' + HM.comp + ':' + HM.cab, tgl = HM.tgl;
    X.swr(key, 'hr.monitor', { tanggal: tgl, id_perusahaan: HM.comp, id_cabang: HM.cab }, function (d) { if (S.route === 'hmon' && HM.tgl === tgl) { HM.data = d; var b = $('#hmbody'); if (b) { b.innerHTML = hmBody(); hmBindBody(); } } }, { ttl: force ? 0 : 20000 });
  }
  function hmBind() {
    var g = function (id, fn) { var n = $('#' + id); if (n) n.onchange = function () { fn(n.value); }; };
    g('hmtgl', function (v) { if (v) { HM.tgl = v > hrToday() ? hrToday() : v; HM.data = null; hmPaint(); } });
    g('hmcomp', function (v) { HM.comp = v; HM.cab = ''; HM.data = null; hmPaint(); });
    g('hmcab', function (v) { HM.cab = v; HM.data = null; hmPaint(); });
    hmBindBody();
  }
  function hmBindBody() { var q = $('#hmq'); if (q) q.oninput = X.debounce(function () { HM.q = q.value; var b = $('#hmbody'); if (b) { var pos = q.selectionStart; b.innerHTML = hmBody(); hmBindBody(); var q2 = $('#hmq'); if (q2) { q2.focus(); q2.setSelectionRange(pos, pos); } } }, 150); }
  V.hmon = { render: function (el) { HM.el = el; HM.tgl = HM.tgl || hrToday(); hmPaint(); } };
  X.ACT['hm-prev'] = function () { HM.tgl = addDay(HM.tgl, -1); HM.data = null; hmPaint(); };
  X.ACT['hm-next'] = function () { if (HM.tgl < hrToday()) { HM.tgl = addDay(HM.tgl, 1); HM.data = null; hmPaint(); } };
  X.ACT['hm-refresh'] = function () { hmPaint(true); };
  X.ACT['hm-st'] = function (b) { HM.st = b.dataset.s; var bd = $('#hmbody'); if (bd) { bd.innerHTML = hmBody(); hmBindBody(); } };
  X.ACT['hm-wakil'] = function (b) {
    var r = (HM.data ? HM.data.rows : []).filter(function (x) { return x.id_karyawan === b.dataset.id; })[0]; if (!r) return; var kind = b.dataset.k;
    var send = function (photo, alasan) {
      X.toast('Mengirim absen ' + r.nama + '…', 'info');
      X.api('absen.proxy', { id_karyawan: r.id_karyawan, jenis: kind, foto: photo, alasan_lembur: alasan || '' }).then(function (res) {
        if (res.code === 'ALASAN') { var mm = parseInt((/(\d+) menit/.exec(res.message || '') || [0, 1])[1], 10); return X.askAlasanLembur(mm).then(function (v) { if (v) send(photo, v); }); }
        if (!res.success) return X.toast(res.message, 'err');
        X.toast(res.message); X.invalidate('hmon:'); X.invalidate('hrk:'); X.invalidate('lbr:'); HM.data = null; hmPaint(true);
      });
    };
    X.proxyCam(kind, { nama: r.nama, id: r.id_karyawan, org: r.perusahaan + ' · ' + r.cabang, cb: function (photo) { send(photo, ''); } });
  };
  X.ACT['hm-edit'] = function (b) {
    var r = (HM.data ? HM.data.rows : []).filter(function (x) { return x.id_karyawan === b.dataset.id; })[0]; if (!r) return;
    var shs = pick().shift.filter(function (x) { return x.id_perusahaan === r.id_perusahaan && (x.id_cabang === 'ALL' || x.id_cabang === r.id_cabang); });
    var shOpts = shs.length ? shs.map(function (x) { return { v: x.id, l: x.nama }; }) : null;
    var F = X.field;
    X.modal({ title: (r.id_absen ? 'Ubah' : 'Isi') + ' absensi · ' + r.nama, body: '<p class="help" style="margin-bottom:10px">' + esc(X.dateLabel(HM.data.tanggal)) + ' · setiap perubahan dicatat (siapa, kapan, alasan).</p>' +
      '<div class="row2">' + F({ name: 'masuk', label: 'Jam masuk', type: 'time', required: true, value: r.waktu_masuk ? X.hm(r.waktu_masuk) : '' }) + F({ name: 'pulang', label: 'Jam pulang', type: 'time', value: r.waktu_pulang ? X.hm(r.waktu_pulang) : '', help: 'Kosongkan bila belum pulang.' }) + '</div>' +
      (shOpts ? F({ name: 'id_shift', label: 'Shift', type: 'select', value: r.shift || shOpts[0].v, options: shOpts }) : '') +
      F({ name: 'alasan', type: 'textarea', label: 'Alasan perubahan', required: true, placeholder: 'mis. lupa absen / HP rusak / koreksi dari kepala toko' }) +
      '<div class="lbl" style="margin:12px 0 6px">LEMBUR (bila ada)</div>' + F({ name: 'alasan_lembur', label: 'Alasan lembur', value: r.alasan_lembur || '', placeholder: 'diisi bila pulang melewati jam kerja' }) +
      (can('can_approve_lembur') ? F({ name: 'setujui', type: 'check', label: 'Setujui lembur sekaligus', value: r.status_lembur === 'DISETUJUI' }) : '<p class="help">Lembur hasil koreksi menunggu persetujuan.</p>'),
      footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="hmsv">Simpan</button>',
      onOpen: function (m) {
        m.$('#hmsv').onclick = function () {
          var f = X.readForm(m.el); if (!f.masuk) return X.toast('Jam masuk wajib diisi.', 'warn'); if (!String(f.alasan || '').trim()) return X.toast('Alasan perubahan wajib diisi.', 'warn');
          var bt = m.$('#hmsv'); bt.disabled = true; bt.innerHTML = '<span class="spin"></span>Menyimpan…';
          X.api('absen.edit', { id_karyawan: r.id_karyawan, tanggal: HM.data.tanggal, masuk: f.masuk, pulang: f.pulang, id_shift: f.id_shift, alasan: f.alasan, alasan_lembur: f.alasan_lembur, setujui: !!f.setujui }).then(function (res) {
            bt.disabled = false; bt.innerHTML = 'Simpan'; if (!res.success) return X.toast(res.message, 'err');
            m.close(); X.toast(res.message); X.invalidate('hmon:'); X.invalidate('hrk:'); X.invalidate('lbr:'); HM.data = null; hmPaint(true);
          });
        };
      } });
  };
  X.ACT['hm-foto'] = function (b) {
    var id = b.dataset.id, mk = function (j, ada) { return '<div style="text-align:center"><div class="lbl" style="margin-bottom:6px">' + (j === 'IN' ? 'MASUK' : 'PULANG') + '</div>' + (ada ? '<div class="sk" data-ph="' + j + '" style="height:200px;border-radius:12px"></div>' : '<div class="muted" style="height:200px;display:grid;place-items:center;border:1px dashed var(--line);border-radius:12px">Tidak ada foto</div>') + '</div>'; };
    X.modal({ title: 'Foto absen · ' + b.dataset.n, body: '<div class="grid g2">' + mk('IN', b.dataset.in === '1') + mk('OUT', b.dataset.out === '1') + '</div>', footer: '<button class="btn btn-g" data-close>Tutup</button>', onOpen: function (m) {
      ['IN', 'OUT'].forEach(function (j) { var slot = m.$('[data-ph="' + j + '"]'); if (!slot) return; X.api('absen.foto', { id: id, jenis: j }, { quiet: true }).then(function (res) { if (!slot.isConnected) return; if (res.success) slot.outerHTML = '<img class="photo" alt="Foto ' + j + '" src="' + res.data.src + '" style="max-width:100%;border-radius:12px">'; else { slot.classList.remove('sk'); slot.textContent = 'Foto tidak tersedia'; } }); });
    } });
  };


  /* ---------------------------------------------------------------- HR: IZIN & SAKIT */
  var IZ = { p: '', comp: '', cab: '', st: '', sel: {}, data: null, el: null };
  var IZB = { MENUNGGU: ['Menunggu', 'b-warn'], DISETUJUI: ['Disetujui', 'b-ok'], DITOLAK: ['Ditolak', 'b-bad'] };
  function izBar() {
    return '<div class="toolbar" style="gap:8px"><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-g btn-s" data-act="iz-prev" aria-label="Bulan sebelumnya">' + ico('chevL', 'sm') + '</button><b style="min-width:132px;text-align:center">' + X.periodeLabel(IZ.p) + '</b><button class="btn btn-g btn-s" data-act="iz-next" aria-label="Bulan berikutnya">' + ico('chevR', 'sm') + '</button></div>' +
      selHtml('izcomp', [{ v: '', l: 'Semua perusahaan' }].concat(compOptions()), IZ.comp, 190) + '<span>' + cabSel('izcab', IZ.comp, IZ.cab) + '</span>' +
      selHtml('izst', [{ v: '', l: 'Semua status' }, { v: 'MENUNGGU', l: 'Menunggu' }, { v: 'DISETUJUI', l: 'Disetujui' }, { v: 'DITOLAK', l: 'Ditolak' }], IZ.st, 150) +
      '<span class="grow"></span><button class="btn btn-p btn-s" data-act="iz-catat">' + ico('plus', 'sm') + 'Catat Izin/Sakit</button></div>';
  }
  function izBody() {
    if (!IZ.data) return X.skel(5, 52);
    var rows = IZ.data.rows, n = Object.keys(IZ.sel).filter(function (k) { return IZ.sel[k]; }).length;
    var act = '<div class="toolbar" style="gap:8px"><b>' + n + ' dipilih</b><button class="btn btn-p btn-s" data-act="iz-setuju" data-h="1" ' + (n ? '' : 'disabled') + '>Setujui · dihitung hadir</button><button class="btn btn-g btn-s" data-act="iz-setuju" data-h="0" ' + (n ? '' : 'disabled') + '>Setujui · tidak dihitung</button><button class="btn btn-g btn-s" data-act="iz-tolak" ' + (n ? '' : 'disabled') + '>Tolak</button>' + (IZ.data.menunggu ? '<span class="muted">' + IZ.data.menunggu + ' pengajuan menunggu (semua periode)</span>' : '') + '</div>';
    return act + '<div class="card flat" style="padding:0;overflow:hidden"><div style="overflow:auto;max-height:68vh"><table class="t"><thead><tr><th></th><th>Tanggal</th><th>Karyawan</th><th>Jenis</th><th>Keterangan</th><th>Status</th><th>Dihitung</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (z) {
        var st = IZB[z.status] || ['', ''];
        return '<tr><td><input type="checkbox" data-izsel="' + esc(z.id) + '" ' + (IZ.sel[z.id] ? 'checked' : '') + ' aria-label="Pilih"></td><td class="mono">' + esc(X.dateLabel(z.tanggal)) + '</td><td><b>' + esc(z.nama) + '</b><div class="muted" style="font-size:12px">' + esc(z.cabang) + '</div></td><td>' + (z.jenis === 'SAKIT' ? 'Sakit' : 'Izin') + '</td><td>' + esc(z.keterangan || '-') + '</td><td><span class="badge ' + st[1] + '">' + st[0] + '</span></td><td>' + (z.status === 'DISETUJUI' ? (z.dihitung ? 'Ya' : 'Tidak') : '–') + '</td><td><button class="btn btn-g btn-s" data-act="iz-hapus" data-id="' + esc(z.id) + '" aria-label="Hapus">' + ico('trash', 'sm') + '</button></td></tr>';
      }).join('') : '<tr><td colspan="8" class="muted" style="text-align:center;padding:24px">Belum ada izin/sakit pada periode ini.</td></tr>') + '</tbody></table></div></div>' +
      '<p class="help" style="margin-top:8px">“Dihitung hadir” = hari itu dihitung sebagai hari masuk di payroll (gaji harian & tunjangan per hadir), tanpa potongan telat. “Tidak dihitung” = tidak dibayar/ tidak menambah hari hadir.</p>';
  }
  function izBind() {
    var g = function (id, fn) { var n = $('#' + id); if (n) n.onchange = function () { fn(n.value); IZ.data = null; IZ.sel = {}; izPaint(); }; };
    g('izcomp', function (v) { IZ.comp = v; IZ.cab = ''; }); g('izcab', function (v) { IZ.cab = v; }); g('izst', function (v) { IZ.st = v; });
    X.$$('[data-izsel]', IZ.el).forEach(function (c) { c.onchange = function () { IZ.sel[c.dataset.izsel] = c.checked; var b = $('#izbody'); if (b) { b.innerHTML = izBody(); izBind2(); } }; });
  }
  function izBind2() { X.$$('[data-izsel]', IZ.el).forEach(function (c) { c.onchange = function () { IZ.sel[c.dataset.izsel] = c.checked; var b = $('#izbody'); if (b) { b.innerHTML = izBody(); izBind2(); } }; }); }
  function izPaint(force) {
    var el = IZ.el; if (!el) return;
    el.innerHTML = '<div class="page"><div id="izbar">' + izBar() + '</div><div id="izbody">' + izBody() + '</div></div>'; izBind();
    var p = IZ.p;
    X.swr('izn:' + p + ':' + IZ.comp + ':' + IZ.cab + ':' + IZ.st, 'izin.list', { periode: p, id_perusahaan: IZ.comp, id_cabang: IZ.cab, status: IZ.st }, function (d) { if (S.route === 'izin' && IZ.p === p) { IZ.data = d; var b = $('#izbody'); if (b) { b.innerHTML = izBody(); izBind2(); } } }, { ttl: force ? 0 : 15000 });
  }
  function izReload() { X.invalidate('izn:'); X.invalidate('hmon:'); X.invalidate('hrk:'); X.invalidate('hist:'); X.invalidate('pay'); IZ.data = null; IZ.sel = {}; izPaint(true); }
  V.izin = { render: function (el) { IZ.el = el; IZ.p = IZ.p || X.periodeNow(); izPaint(); } };
  X.ACT['iz-prev'] = function () { IZ.p = X.periodeShift(IZ.p, -1); IZ.data = null; IZ.sel = {}; izPaint(); };
  X.ACT['iz-next'] = function () { IZ.p = X.periodeShift(IZ.p, 1); IZ.data = null; IZ.sel = {}; izPaint(); };
  function izIds() { return Object.keys(IZ.sel).filter(function (k) { return IZ.sel[k]; }); }
  X.ACT['iz-setuju'] = function (b) {
    var h = b.dataset.h === '1', ids = izIds(); if (!ids.length) return;
    X.api('izin.putus', { ids: ids, aksi: 'SETUJU', dihitung: h }).then(function (r) { if (r.success) { X.toast(r.message + (h ? ' (dihitung hadir)' : ' (tidak dihitung)')); izReload(); } });
  };
  X.ACT['iz-tolak'] = function () {
    var ids = izIds(); if (!ids.length) return;
    var m = X.modal({ title: 'Tolak ' + ids.length + ' pengajuan', body: X.field({ name: 'catatan', type: 'textarea', label: 'Alasan penolakan (opsional)' }), footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="iztl">Tolak</button>',
      onOpen: function (mm) { mm.$('#iztl').onclick = function () { X.api('izin.putus', { ids: ids, aksi: 'TOLAK', catatan: mm.$('[name=catatan]').value }).then(function (r) { if (r.success) { mm.close(); X.toast(r.message); izReload(); } }); }; } });
  };
  X.ACT['iz-hapus'] = function (b) {
    X.confirm({ title: 'Hapus data izin/sakit?', html: 'Data ini dihapus permanen dan tidak lagi mempengaruhi payroll.', ok: 'Hapus' }).then(function (ok) { if (!ok) return; X.api('izin.hapus', { id: b.dataset.id }).then(function (r) { if (r.success) { X.toast('Dihapus.'); izReload(); } }); });
  };
  X.ACT['iz-catat'] = function (b) {
    var td = (b && b.dataset && b.dataset.t) || hrToday(), emps = pick().karyawan.filter(function (k) { return k.aktif !== false; });
    var m = X.modal({ title: 'Catat Izin / Sakit', body: X.field({ name: 'id_karyawan', type: 'select', label: 'Karyawan', options: emps.map(function (k) { return { v: k.id, l: k.nama }; }), value: b && b.dataset && b.dataset.id || '' }) +
      X.field({ name: 'jenis', type: 'select', label: 'Jenis', options: [{ v: 'IZIN', l: 'Izin' }, { v: 'SAKIT', l: 'Sakit' }] }) +
      '<div class="grid g2 keep">' + X.field({ name: 'tanggal_mulai', type: 'date', label: 'Dari tanggal', value: td }) + X.field({ name: 'tanggal_selesai', type: 'date', label: 'Sampai tanggal', value: td }) + '</div>' +
      X.field({ name: 'keterangan', type: 'text', label: 'Keterangan (opsional)' }) +
      X.field({ name: 'dihitung', type: 'check', label: 'Dihitung sebagai hari hadir', help: 'Centang bila hari ini tetap dihitung masuk (tanpa potongan).' }),
      footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="izsv2">Simpan</button>',
      onOpen: function (mm) {
        var a = mm.$('[name=tanggal_mulai]'), e = mm.$('[name=tanggal_selesai]'); a.onchange = function () { if (e.value < a.value) e.value = a.value; };
        mm.$('#izsv2').onclick = function () { var d = X.readForm(mm.el); if (!d.id_karyawan) return X.toast('Pilih karyawan.', 'warn'); X.api('izin.simpan', d).then(function (r) { if (r.success) { mm.close(); X.toast(r.message); izReload(); } }); };
      } });
  };

  X.ACT['hm-hapus'] = function (b) {
    var id = b.dataset.id;
    X.modal({ title: 'Hapus absensi ' + b.dataset.n + '?', body: '<p class="muted" style="margin-bottom:10px">Data masuk/pulang beserta foto, telat, dan lemburnya dihapus permanen. Karyawan kembali berstatus "belum absen". Tindakan ini tercatat di log.</p>' + X.field({ name: 'alasan', type: 'text', label: 'Alasan penghapusan', required: true, placeholder: 'mis. salah absen / tes' }),
      footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="hmdel" style="background:var(--bad)">Hapus</button>',
      onOpen: function (m) { m.$('#hmdel').onclick = function () { var al = m.$('[name=alasan]').value.trim(); if (al.length < 3) return X.toast('Alasan wajib diisi.', 'warn'); var bt = m.$('#hmdel'); bt.disabled = true;
        X.api('absen.hapus', { id_absen: id, alasan: al }).then(function (r) { bt.disabled = false; if (!r.success) return; m.close(); X.toast(r.message); X.invalidate('hmon:'); X.invalidate('hrk:'); X.invalidate('lbr:'); X.invalidate('hist:'); X.invalidate('dash:'); X.invalidate('pay'); HM.data = null; hmPaint(true); }); }; } });
  };
  var HR = { p: '', comp: '', cab: '', q: '', data: null, el: null };
  function hrBar() {
    return '<div class="toolbar" style="gap:8px"><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-g btn-s" data-act="hr-prev" aria-label="Bulan sebelumnya">' + ico('chevL', 'sm') + '</button><b style="min-width:132px;text-align:center">' + X.periodeLabel(HR.p) + '</b><button class="btn btn-g btn-s" data-act="hr-next" aria-label="Bulan berikutnya" ' + (HR.p >= X.periodeNow() ? 'disabled' : '') + '>' + ico('chevR', 'sm') + '</button></div>' +
      selHtml('hrcomp', [{ v: '', l: 'Semua perusahaan' }].concat(compOptions()), HR.comp, 190) + '<span id="hrcabw">' + cabSel('hrcab', HR.comp, HR.cab) + '</span><div class="search grow" style="min-width:160px"><span>' + ico('search', 'sm') + '</span><input class="inp" id="hrq" placeholder="Cari nama…" value="' + esc(HR.q) + '" aria-label="Cari"></div><button class="btn btn-g btn-s" data-act="hr-csv">' + ico('download', 'sm') + 'CSV</button></div>';
  }
  function hrList() { var q = HR.q.toLowerCase().trim(); return (HR.data ? HR.data.rows : []).filter(function (r) { return !q || (r.nama + ' ' + r.jabatan).toLowerCase().indexOf(q) >= 0; }); }
  function hrBody() {
    if (!HR.data) return X.skel(6, 52);
    var rows = hrList(), tot = rows.reduce(function (a, r) { a.h += r.hadir; a.t += r.telat; a.m += r.menitTelat; a.l += r.jamLembur; return a; }, { h: 0, t: 0, m: 0, l: 0 });
    return '<div class="card flat" style="padding:0;overflow:hidden"><div style="overflow:auto;max-height:70vh"><table class="t"><thead><tr><th>Karyawan</th><th>Cabang</th><th class="num">Hari Hadir</th><th class="num">Izin</th><th class="num">Sakit</th><th class="num">Telat (kali)</th><th class="num">Menit Telat</th><th class="num">Lembur (jam)</th><th class="num">Lupa Pulang</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) { return '<tr data-act="hr-detail" data-id="' + esc(r.id_karyawan) + '" data-n="' + esc(r.nama) + '" style="cursor:pointer"><td><b>' + esc(r.nama) + '</b><div class="muted" style="font-size:12px">' + esc(r.jabatan) + '</div></td><td>' + esc(r.cabang) + '</td><td class="num mono">' + r.hadir + '</td><td class="num mono">' + (r.izin || 0) + '</td><td class="num mono">' + (r.sakit || 0) + '</td><td class="num mono">' + (r.telat ? '<span class="badge b-warn">' + r.telat + '</span>' : '0') + '</td><td class="num mono">' + r.menitTelat + '</td><td class="num mono">' + r.jamLembur + '</td><td class="num mono">' + (r.lupaPulang ? '<span class="badge b-bad">' + r.lupaPulang + '</span>' : '0') + '</td></tr>'; }).join('') + '<tr style="font-weight:700"><td colspan="2">Total</td><td class="num mono">' + tot.h + '</td><td></td><td></td><td class="num mono">' + tot.t + '</td><td class="num mono">' + tot.m + '</td><td class="num mono">' + Math.round(tot.l * 10) / 10 + '</td><td></td></tr>' : '<tr><td colspan="9" class="muted" style="text-align:center;padding:24px">Tidak ada data.</td></tr>') + '</tbody></table></div></div><p class="help" style="margin-top:8px">Klik baris untuk melihat rincian harian karyawan.</p>';
  }
  function hrPaint(force) {
    var el = HR.el; if (!el) return; el.innerHTML = '<div class="page"><div id="hrbar">' + hrBar() + '</div><div id="hrbody">' + hrBody() + '</div></div>'; hrBind();
    var p = HR.p, key = 'hrk:' + p + ':' + HR.comp + ':' + HR.cab;
    X.swr(key, 'hr.rekap', { periode: p, id_perusahaan: HR.comp, id_cabang: HR.cab }, function (d) { if (S.route === 'hrekap' && HR.p === p) { HR.data = d; var b = $('#hrbody'); if (b) b.innerHTML = hrBody(); } }, { ttl: force ? 0 : 30000 });
  }
  function hrBind() {
    var g = function (id, fn) { var n = $('#' + id); if (n) n.onchange = function () { fn(n.value); HR.data = null; hrPaint(); }; };
    g('hrcomp', function (v) { HR.comp = v; HR.cab = ''; }); g('hrcab', function (v) { HR.cab = v; });
    var q = $('#hrq'); if (q) q.oninput = X.debounce(function () { HR.q = q.value; var b = $('#hrbody'); if (b) b.innerHTML = hrBody(); }, 150);
  }
  V.hrekap = { render: function (el) { HR.el = el; HR.p = HR.p || X.periodeNow(); hrPaint(); } };
  X.ACT['hr-prev'] = function () { HR.p = X.periodeShift(HR.p, -1); HR.data = null; hrPaint(); };
  X.ACT['hr-next'] = function () { if (HR.p < X.periodeNow()) { HR.p = X.periodeShift(HR.p, 1); HR.data = null; hrPaint(); } };
  X.ACT['hr-csv'] = function () {
    var rows = hrList(); if (!rows.length) return X.toast('Tidak ada data.', 'warn');
    var q = function (v) { return '"' + String(v === undefined ? '' : v).replace(/"/g, '""') + '"'; };
    var csv = ['Nama,Jabatan,Cabang,Hari Hadir,Izin,Sakit,Telat (kali),Menit Telat,Lembur (jam),Lupa Pulang'].concat(rows.map(function (r) { return [q(r.nama), q(r.jabatan), q(r.cabang), r.hadir, r.izin || 0, r.sakit || 0, r.telat, r.menitTelat, r.jamLembur, r.lupaPulang].join(','); })).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'rekap-absensi-' + HR.p + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  X.ACT['hr-detail'] = function (b) {
    var id = b.dataset.id, p = HR.p;
    X.modal({ title: b.dataset.n + ' · ' + X.periodeLabel(p), wide: true, body: '<div id="hrdet">' + X.skel(4, 44) + '</div>', footer: '<button class="btn btn-g" data-close>Tutup</button>', onOpen: function (m) {
      X.api('absen.history', { periode: p, id_karyawan: id }, { quiet: true }).then(function (r) {
        var box = m.$('#hrdet'); if (!box) return; if (!r.success) { box.innerHTML = '<p class="muted">' + esc(r.message) + '</p>'; return; }
        var rows = r.data.rows;
        box.innerHTML = rows.length ? '<table class="t"><thead><tr><th>Tanggal</th><th>Jadwal</th><th>Masuk</th><th>Pulang</th><th class="num">Telat</th><th>Status</th></tr></thead><tbody>' + rows.map(function (x) { return '<tr><td>' + esc(X.dateLabel(x.tanggal)) + '</td><td class="mono">' + esc(x.jadwal_masuk) + '–' + esc(x.jadwal_pulang) + '</td><td class="mono">' + X.hm(x.waktu_masuk) + '</td><td class="mono">' + (x.waktu_pulang ? X.hm(x.waktu_pulang) : '<span class="badge b-bad">belum</span>') + '</td><td class="num mono">' + (x.menit_terlambat ? x.menit_terlambat + ' mnt' : '–') + '</td><td><span class="badge ' + (x.menit_terlambat ? 'b-warn' : 'b-ok') + '">' + (x.menit_terlambat ? 'Terlambat' : 'Hadir') + '</span></td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">Belum ada absensi pada periode ini.</p>';
      });
    } });
  };

  /* ---------------------------------------------------------------- PERSETUJUAN LEMBUR */
  var LB = { p: '', st: 'PENDING', data: null, el: null, sel: {} };
  function lbBody() {
    var d = LB.data; if (!d) return X.skel(5, 64);
    var chips = [['PENDING', 'Menunggu', d.count.PENDING], ['DISETUJUI', 'Disetujui', d.count.DISETUJUI], ['DITOLAK', 'Ditolak', d.count.DITOLAK], ['SEMUA', 'Semua', d.count.PENDING + d.count.DISETUJUI + d.count.DITOLAK]];
    var n = Object.keys(LB.sel).length;
    return '<div class="toolbar" style="gap:8px"><div class="seg" role="tablist">' + chips.map(function (c) { return '<button class="' + (LB.st === c[0] ? 'on' : '') + '" data-act="lb-st" data-s="' + c[0] + '">' + c[1] + ' <span class="muted">' + c[2] + '</span></button>'; }).join('') + '</div><span class="grow"></span>' +
      (LB.st === 'PENDING' || LB.st === 'SEMUA' ? '<button class="btn btn-g" data-act="lb-all">Pilih semua menunggu</button><button class="btn btn-g" data-act="lb-do" data-k="DITOLAK" ' + (n ? '' : 'disabled') + '>Tolak (' + n + ')</button><button class="btn btn-p" data-act="lb-do" data-k="DISETUJUI" ' + (n ? '' : 'disabled') + '>' + ico('check', 'sm') + 'Setujui (' + n + ')</button>' : '') + '</div>' +
      (d.rows.length ? '<div class="list">' + d.rows.map(function (r) {
        var pend = r.status === 'PENDING', stt = LSB[r.status];
        return '<div class="li"><label style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:' + (pend && !r.sendiri ? 'pointer' : 'default') + '">' + (pend && !r.sendiri ? '<input type="checkbox" data-lb="' + esc(r.id_absen) + '" ' + (LB.sel[r.id_absen] ? 'checked' : '') + ' aria-label="Pilih">' : '<span style="width:16px"></span>') +
          '<div class="grow" style="min-width:0"><div class="t1"><b>' + esc(r.nama) + '</b> <span class="muted">· ' + esc(r.cabang) + '</span></div><div class="t2">' + esc(X.dateLabel(r.tanggal)) + ' · pulang ' + (r.waktu_pulang ? X.hm(r.waktu_pulang) : '-') + ' (jadwal ' + esc(r.jadwal_pulang) + ') · <b>' + Math.floor(r.menit / 60) + ' j ' + (r.menit % 60) + ' m</b></div><div class="t2" style="white-space:normal">Alasan: ' + (r.alasan ? esc(r.alasan) : '<i>tidak diisi</i>') + (r.diubah_oleh ? ' · dikoreksi ' + esc(r.diubah_oleh) : '') + '</div></div></label>' +
          '<div class="tr"><span class="badge ' + stt[1] + '">' + stt[0] + '</span>' + (r.oleh && !pend ? '<div class="muted" style="font-size:10px">' + esc(r.oleh) + '</div>' : '') + (r.sendiri && pend ? '<div class="muted" style="font-size:10px">lembur sendiri</div>' : '') + '</div></div>';
      }).join('') + '</div>' : '<div class="card flat">' + X.empty('check', 'Tidak ada lembur', 'Tidak ada pengajuan lembur dengan status ini pada periode ini.') + '</div>');
  }
  function lbPaint(force) {
    var el = LB.el; if (!el) return; var p = LB.p;
    var bar = '<div class="toolbar"><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-g btn-s" data-act="lb-prev" aria-label="Bulan sebelumnya">' + ico('chevL', 'sm') + '</button><b style="min-width:132px;text-align:center">' + X.periodeLabel(p) + '</b><button class="btn btn-g btn-s" data-act="lb-next" aria-label="Bulan berikutnya" ' + (p >= X.periodeNow() ? 'disabled' : '') + '>' + ico('chevR', 'sm') + '</button></div><span class="grow"></span><p class="help">Hanya lembur yang disetujui yang dihitung ke payroll.</p></div>';
    el.innerHTML = '<div class="page narrow-ish"><div id="lbbar">' + bar + '</div><div id="lbbody">' + lbBody() + '</div></div>'; lbBind();
    X.swr('lbr:' + p, 'lembur.list', { periode: p, status: 'SEMUA' }, function (d) { if (S.route === 'lembur' && LB.p === p) { LB.data = d; LB.all = d.rows; lbRender(); } }, { ttl: force ? 0 : 15000 });
  }
  function lbRender() { var d = LB.data; if (!d) return; var all = LB.all || d.rows; d = { count: d.count, rows: all.filter(function (r) { return LB.st === 'SEMUA' || r.status === LB.st; }) }; var keep = LB.data; LB.data = d; var b = $('#lbbody'); if (b) { b.innerHTML = lbBody(); lbBind(); } LB.data = keep; }
  function lbBind() { X.$$('[data-lb]', LB.el).forEach(function (c) { c.onchange = function () { if (c.checked) LB.sel[c.dataset.lb] = true; else delete LB.sel[c.dataset.lb]; lbRender(); }; }); }
  V.lembur = { render: function (el) { LB.el = el; LB.p = LB.p || X.periodeNow(); LB.sel = {}; lbPaint(); } };
  X.ACT['lb-prev'] = function () { LB.p = X.periodeShift(LB.p, -1); LB.data = null; LB.sel = {}; lbPaint(); };
  X.ACT['lb-next'] = function () { if (LB.p < X.periodeNow()) { LB.p = X.periodeShift(LB.p, 1); LB.data = null; LB.sel = {}; lbPaint(); } };
  X.ACT['lb-st'] = function (b) { LB.st = b.dataset.s; LB.sel = {}; lbRender(); };
  X.ACT['lb-all'] = function () { (LB.all || []).forEach(function (r) { if (r.status === 'PENDING' && !r.sendiri) LB.sel[r.id_absen] = true; }); lbRender(); };
  X.ACT['lb-do'] = function (b) {
    var ids = Object.keys(LB.sel); if (!ids.length) return; var k = b.dataset.k, p = LB.p;
    X.confirm({ title: (k === 'DISETUJUI' ? 'Setujui ' : 'Tolak ') + ids.length + ' lembur?', text: k === 'DISETUJUI' ? 'Lembur akan dihitung ke payroll.' : 'Lembur tidak akan dihitung ke payroll.', ok: k === 'DISETUJUI' ? 'Setujui' : 'Tolak', danger: k === 'DITOLAK' }).then(function (ok) {
      if (!ok) return;
      X.api('lembur.decide', { items: ids.map(function (id) { return { id_absen: id, keputusan: k }; }) }).then(function (res) {
        if (!res.success) return X.toast(res.message, 'err'); X.toast(res.message, res.data.gagal.length ? 'warn' : undefined); LB.sel = {}; X.invalidate('lbr:'); X.invalidate('hmon:'); X.invalidate('hrk:'); X.invalidate('pay'); lbPaint(true);
      });
    });
  };

  /* ---------------------------------------------------------------- INPUT ABSEN BULANAN (manual) */
  var AM = { mode: 'total', p: '', comp: '', cab: '', emp: '', f: null, rows: [], shift: '', setujui: true, alasan: 'Input manual absensi bulan ini', el: null };
  var DN = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  function amEmps() { return pick().karyawan.filter(function (k) { return k.aktif && k.role !== 'MANAJEMEN' && (!AM.comp || k.id_perusahaan === AM.comp) && (!AM.cab || k.id_cabang === AM.cab); }).sort(function (a, b) { return a.nama < b.nama ? -1 : 1; }); }
  function amJadwal() { var f = AM.f; if (!f) return { masuk: '08:00', pulang: '17:00' }; var s = f.shifts.filter(function (x) { return x.id_shift === AM.shift; })[0]; return s ? { masuk: s.jam_masuk, pulang: s.jam_pulang } : f.jadwal; }
  function hmToM(v) { var p = String(v || '0:0').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
  function mToHm(m) { m = ((m % 1440) + 1440) % 1440; return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  function amDirty(r) { var o = r.o; return r.hadir !== o.hadir || (r.hadir && (r.masuk !== o.masuk || r.pulang !== o.pulang || r.alasan_lembur !== o.alasan_lembur)); }
  function amCount() { return AM.rows.filter(amDirty).length; }
  function amShell() {
    if (AM.mode === 'total') return atShell();
    var emps = amEmps(), n = amCount();
    var bar = '<div class="toolbar" style="gap:8px"><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-g btn-s" data-act="am-prev" aria-label="Bulan sebelumnya">' + ico('chevL', 'sm') + '</button><b style="min-width:132px;text-align:center">' + X.periodeLabel(AM.p) + '</b><button class="btn btn-g btn-s" data-act="am-next" aria-label="Bulan berikutnya" ' + (AM.p >= X.periodeNow() ? 'disabled' : '') + '>' + ico('chevR', 'sm') + '</button></div>' +
      selHtml('amcomp', [{ v: '', l: 'Semua perusahaan' }].concat(compOptions()), AM.comp, 190) + '<span id="amcabw">' + cabSel('amcab', AM.comp, AM.cab) + '</span>' +
      selHtml('amemp', [{ v: '', l: '— pilih karyawan —' }].concat(emps.map(function (k) { return { v: k.id, l: k.nama }; })), AM.emp, 220) + '</div>';
    return '<div class="page"><div id="ambar">' + bar + '</div><div class="toolbar"><div class="seg" role="tablist"><button role="tab" class="' + (AM.mode === 'total' ? 'on' : '') + '" data-act="am-mode" data-m="total">Total Sebulan</button><button role="tab" class="' + (AM.mode !== 'total' ? 'on' : '') + '" data-act="am-mode" data-m="hari">Per Hari</button></div></div><p class="help" style="margin-bottom:10px">' + 'Pilih karyawan, centang hari hadir, atur jam &amp; lembur per hari, lalu <b>Simpan</b>.' + ' Perubahan dicatat atas nama Anda.</p><div id="ambody">' + amBody() + '</div></div>';
  }
  function amBody() {
    if (!AM.emp) return '<div class="card flat">' + X.empty('users', 'Pilih karyawan', 'Pilih perusahaan/cabang lalu karyawan untuk mengisi absensi bulan ini.') + '</div>';
    if (!AM.f) return X.skel(6, 44);
    var f = AM.f, j = amJadwal(), n = amCount(), hadir = AM.rows.filter(function (r) { return r.hadir; }).length, lemb = AM.rows.reduce(function (a, r) { return a + (r.hadir ? r.lembur : 0); }, 0);
    var top = '<div class="card" style="margin-bottom:12px"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><b>' + esc(f.nama) + '</b><span class="badge b-info">' + hadir + ' hari hadir</span><span class="badge b-n">Lembur ' + Math.floor(lemb / 60) + ' j ' + (lemb % 60) + ' m</span><span class="muted" style="font-size:12px">Jadwal ' + esc(j.masuk) + '–' + esc(j.pulang) + '</span><span class="grow"></span>' +
      '<button class="btn btn-g btn-s" data-act="am-preset" data-k="5">Centang Sen–Jum</button><button class="btn btn-g btn-s" data-act="am-preset" data-k="6">Centang Sen–Sab</button><button class="btn btn-g btn-s" data-act="am-preset" data-k="0">Kosongkan</button></div>' +
      '<div class="row2" style="margin-top:10px">' + (f.shifts.length ? '<div class="field" style="margin:0"><label>Shift untuk hari baru</label>' + selHtml('amshift', f.shifts.map(function (s) { return { v: s.id_shift, l: s.nama + ' · ' + s.jam_masuk + '–' + s.jam_pulang }; }), AM.shift, 260).replace('class="sel mflt"', 'class="sel"') + '</div>' : '') +
      '<div class="field" style="margin:0"><label>Catatan / alasan input manual</label><input class="inp" id="amalasan" value="' + esc(AM.alasan) + '" maxlength="150"></div></div>' +
      (can('can_approve_lembur') ? '<label class="chk" style="margin-top:8px"><input type="checkbox" id="amsetuju" ' + (AM.setujui ? 'checked' : '') + '><span>Setujui lembur sekaligus (bila tidak, lembur menunggu persetujuan)</span></label>' : '<p class="help" style="margin-top:8px">Lembur yang Anda isi akan menunggu persetujuan.</p>') + '</div>';
    var rows = AM.rows.map(function (r, i) {
      var off = r.future, wk = r.dow === 0 ? ' style="background:var(--surface2)"' : '';
      return '<tr' + wk + ' data-i="' + i + '"><td><b>' + DN[r.dow] + '</b> ' + r.tanggal.slice(8) + '</td><td style="text-align:center"><input type="checkbox" class="amh" ' + (r.hadir ? 'checked' : '') + (off || r.app ? ' disabled' : '') + ' aria-label="Hadir ' + r.tanggal + '"></td>' +
        '<td><input type="time" class="inp amm" style="width:132px" value="' + esc(r.masuk) + '" ' + (r.hadir && !off ? '' : 'disabled') + '></td><td><input type="time" class="inp amp" style="width:132px" value="' + esc(r.pulang) + '" ' + (r.hadir && !off ? '' : 'disabled') + '></td>' +
        '<td class="num"><input type="number" min="0" step="15" class="inp aml" style="width:84px;text-align:right" value="' + (r.lembur || '') + '" placeholder="0" ' + (r.hadir && !off ? '' : 'disabled') + '></td><td><input class="inp amal" style="width:200px" maxlength="150" placeholder="alasan lembur" value="' + esc(r.alasan_lembur) + '" ' + (r.hadir && r.lembur && !off ? '' : 'disabled') + '></td>' +
        '<td>' + (r.app ? '<span class="badge b-info" title="Absen lewat aplikasi (ada foto)">App</span> ' : '') + (r.o.hadir && r.status_lembur ? '<span class="badge ' + LSB[r.status_lembur][1] + '">' + LSB[r.status_lembur][0] + '</span>' : '') + (amDirty(r) ? '<span class="badge b-warn">diubah</span>' : '') + '</td></tr>';
    }).join('');
    return top + '<div class="toolbar"><span class="grow"></span><button class="btn btn-p" id="amsave" data-act="am-save" ' + (n ? '' : 'disabled') + '>' + ico('check', 'sm') + 'Simpan' + (n ? ' (' + n + ' hari)' : '') + '</button></div>' +
      '<div class="card flat" style="padding:0;overflow:hidden"><div style="overflow:auto;max-height:66vh"><table class="t"><thead><tr><th>Tanggal</th><th>Hadir</th><th>Masuk</th><th>Pulang</th><th class="num">Lembur (menit)</th><th>Alasan lembur</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }
  /* ---- Mode TOTAL SEBULAN: tabel semua karyawan (seperti Master Data) ---- */
  var AT = { data: null, rows: [], q: '', opt: { auto: true, ist: 60, jk: '', setujui: true, alasan: 'Input total sebulan' }, init: { auto: true, ist: 60, jk: '' }, busy: false };
  function hj(m) { return Math.floor(m / 60) + ' j' + (m % 60 ? ' ' + (m % 60) + ' m' : ''); }
  function atNum(v) { return Math.max(0, Number(String(v === undefined || v === null ? '' : v).replace(',', '.')) || 0); }
  /* jam kerja sehari (menit): diisi manual (jam) atau otomatis = jadwal masuk-pulang − istirahat */
  function atKerja(durasi, ist, jk) { return jk !== '' && jk !== undefined && atNum(jk) > 0 ? Math.round(atNum(jk) * 60) : Math.max(0, durasi - ist); }
  function atCalc(r) {
    var normal = AT.data ? AT.data.normal : 0, ist = Math.max(0, Math.floor(atNum(AT.opt.ist))), kerja = atKerja(r.durasi, ist, AT.opt.jk), hari = Math.floor(atNum(r.hari));
    var on = AT.opt.auto && !r.harian, lebih = on ? Math.max(0, hari - normal) : 0, oto = lebih * kerja, tam = Math.round(atNum(r.lem) * 60);
    return { oto: oto, total: oto + tam, lebih: lebih, hari: hari };
  }
  function atDirty(r) {
    var o = r.o, optCh = AT.opt.auto !== AT.init.auto || Number(AT.opt.ist) !== AT.init.ist || String(AT.opt.jk) !== String(AT.init.jk);
    return String(atNum(r.hari)) !== String(o.hari) || String(atNum(r.lem)) !== String(o.lem) || String(atNum(r.telH)) !== String(o.telH) || String(atNum(r.telM)) !== String(o.telM) || (optCh && atNum(r.hari) > 0);
  }
  function atCount() { return AT.rows.filter(atDirty).length; }
  function atShell() {
    var n = atCount();
    var bar = '<div class="toolbar" style="gap:8px"><div style="display:flex;align-items:center;gap:6px"><button class="btn btn-g btn-s" data-act="am-prev" aria-label="Bulan sebelumnya">' + ico('chevL', 'sm') + '</button><b style="min-width:132px;text-align:center">' + X.periodeLabel(AM.p) + '</b><button class="btn btn-g btn-s" data-act="am-next" aria-label="Bulan berikutnya" ' + (AM.p >= X.periodeNow() ? 'disabled' : '') + '>' + ico('chevR', 'sm') + '</button></div>' +
      selHtml('amcomp', [{ v: '', l: 'Semua perusahaan' }].concat(compOptions()), AM.comp, 190) + '<span id="amcabw">' + cabSel('amcab', AM.comp, AM.cab) + '</span>' +
      '<div class="search grow" style="min-width:160px"><span>' + ico('search', 'sm') + '</span><input class="inp" id="atq" placeholder="Cari nama / cabang…" value="' + esc(AT.q) + '" aria-label="Cari"></div>' +
      '<button class="btn btn-p" id="atsave" data-act="at-save" ' + (n ? '' : 'disabled') + '>' + ico('check', 'sm') + 'Simpan' + (n ? ' (' + n + ')' : '') + '</button></div>';
    var seg = '<div class="toolbar"><div class="seg" role="tablist"><button role="tab" class="on" data-act="am-mode" data-m="total">Total Sebulan</button><button role="tab" data-act="am-mode" data-m="hari">Per Hari</button></div></div>';
    var opt = '<div class="card" style="margin-bottom:12px;padding:12px 14px"><div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center">' +
      '<label class="chk"><input type="checkbox" id="atauto" ' + (AT.opt.auto ? 'checked' : '') + '><span>Libur tiap Minggu: hari masuk di atas hari kerja normal = lembur 1 hari penuh</span></label>' +
      '<label style="display:flex;gap:6px;align-items:center">Istirahat <input class="inp" id="atist" type="number" min="0" max="240" step="5" style="width:72px;min-height:34px;padding:4px 8px" value="' + esc(AT.opt.ist) + '"> menit</label>' +
      '<label style="display:flex;gap:6px;align-items:center" title="Kosongkan agar otomatis (jam masuk-pulang dikurangi istirahat)">Jam kerja sehari <input class="inp" id="atjk" type="number" min="0" max="24" step="0.5" style="width:78px;min-height:34px;padding:4px 8px" placeholder="otomatis" value="' + esc(AT.opt.jk) + '"> jam</label>' +
      (can('can_approve_lembur') ? '<label class="chk"><input type="checkbox" id="atsetuju" ' + (AT.opt.setujui ? 'checked' : '') + '><span>Setujui lembur sekaligus</span></label>' : '<span class="help">Lembur menunggu persetujuan.</span>') +
      '<input class="inp" id="atalasan" style="flex:1;min-width:180px;min-height:34px" maxlength="150" placeholder="Catatan / alasan input" value="' + esc(AT.opt.alasan) + '"></div>' +
      '<p class="help" id="atinfo" style="margin-top:8px">' + atInfo() + '</p></div>';
    return '<div class="page"><div id="ambar">' + bar + '</div>' + seg + opt + '<div id="atbody">' + atTable() + '</div></div>';
  }
  function atInfo() {
    var d = AT.data; if (!d) return 'Memuat…';
    return '<b>' + X.periodeLabel(AM.p) + '</b>: ' + d.dim + ' hari, ' + d.minggu + ' hari Minggu libur → <b>' + d.normal + ' hari kerja normal</b>. Isi <b>hari masuk</b> per karyawan; kelebihan di atas ' + d.normal + ' hari otomatis jadi lembur penuh (jam kerja sehari: otomatis dari jadwal − istirahat, atau isi manual di kolom "Jam kerja sehari"). Isian lembur tambahan, terlambat, dan istirahat bersifat opsional. Hanya baris yang diubah yang disimpan; absen manual lama bulan ini diganti, absen asli (foto) tidak diubah.';
  }
  function atRowHtml(r, i) {
    var c = atCalc(r), inp = function (f, w, extra) { return '<td class="num"><input class="inp ati' + (String(atNum(r[f])) !== String(r.o[f]) ? ' dirty' : '') + '" data-f="' + f + '" type="number" inputmode="decimal" min="0" ' + (extra || '') + ' style="width:' + w + 'px;min-height:34px;padding:5px 8px;text-align:right;font-family:var(--mono)" value="' + esc(r[f] === 0 || r[f] === '0' ? '' : r[f]) + '" placeholder="0" aria-label="' + f + ' ' + esc(r.nama) + '"></td>'; };
    return '<tr data-i="' + i + '" data-q="' + esc((r.nama + ' ' + r.cabang).toLowerCase()) + '"><td class="muted">' + (i + 1) + '</td><td><b>' + esc(r.nama) + '</b><div class="muted" style="font-size:11px">' + esc(r.cabang) + (r.harian ? ' · harian' : '') + (r.real ? ' · ' + r.real + ' absen asli' : '') + '</div></td><td class="mono muted" style="font-size:12px">' + esc(r.jadwal) + '</td>' +
      inp('hari', 72, 'max="31" step="1"') + inp('lem', 84, 'step="0.5"') + inp('telH', 72, 'max="31" step="1"') + inp('telM', 84, 'step="1"') +
      '<td class="num mono at-oto">' + (c.oto ? hj(c.oto) : '-') + '</td><td class="num mono at-tot"><b>' + (c.total ? hj(c.total) : '-') + '</b></td><td class="at-st">' + (atDirty(r) ? '<span class="badge b-warn">diubah</span>' : '') + '</td></tr>';
  }
  function atTable() {
    if (!AT.data) return X.skel(8, 44);
    if (!AT.rows.length) return '<div class="card flat">' + X.empty('users', 'Tidak ada karyawan', 'Ubah filter perusahaan / cabang.') + '</div>';
    return '<div class="card flat" style="padding:0;overflow:hidden"><div style="overflow:auto;max-height:66vh"><table class="t" id="att"><thead><tr><th>No</th><th>Karyawan</th><th>Jadwal</th><th class="num">Hari masuk</th><th class="num">Lembur tambahan (jam)</th><th class="num">Terlambat (hari)</th><th class="num">Terlambat (menit)</th><th class="num">Lembur otomatis</th><th class="num">Total lembur</th><th></th></tr></thead><tbody>' + AT.rows.map(atRowHtml).join('') + '</tbody></table></div></div>';
  }
  function atLoad() {
    AT.data = null; AT.rows = []; atRepaint();
    var p = AM.p, comp = AM.comp, cab = AM.cab;
    X.api('absen.totalList', { periode: p, id_perusahaan: comp, id_cabang: cab }, { quiet: true }).then(function (r) {
      if (AM.mode !== 'total' || AM.p !== p) return; if (!r.success) { X.toast(r.message, 'err'); return; }
      AT.data = r.data; AT.init = { auto: AT.opt.auto, ist: Number(AT.opt.ist) || 0, jk: AT.opt.jk };
      AT.rows = r.data.rows.map(function (x) {
        var kerja = atKerja(x.durasi_menit, AT.init.ist, AT.init.jk), lebih = (AT.opt.auto && !x.harian) ? Math.max(0, x.hadir - r.data.normal) : 0, tam = Math.max(0, x.lembur_menit - lebih * kerja);
        var o = { hari: x.hadir, lem: tam ? Math.round(tam / 6) / 10 : 0, telH: x.telat_hari, telM: x.telat_menit };
        return { id: x.id_karyawan, nama: x.nama, cabang: x.cabang, harian: x.harian, durasi: x.durasi_menit, jadwal: x.jadwal, real: x.real, o: o, hari: o.hari, lem: o.lem, telH: o.telH, telM: o.telM };
      });
      atRepaint();
    });
  }
  function atRepaint() { var el = AM.el; if (!el || AM.mode !== 'total') return; var y = window.scrollY; el.innerHTML = atShell(); atBind(); window.scrollTo(0, y); atFilter(); }
  function atFilter() { var q = (AT.q || '').toLowerCase().trim(); X.$$('#att tbody tr').forEach(function (tr) { tr.style.display = !q || tr.dataset.q.indexOf(q) >= 0 ? '' : 'none'; }); }
  function atRefreshInfoAll() { var inf = $('#atinfo'); if (inf) inf.innerHTML = atInfo(); var b = $('#atsave'), n = atCount(); if (b) { b.disabled = !n || AT.busy; b.innerHTML = ico('check', 'sm') + 'Simpan' + (n ? ' (' + n + ')' : ''); } }
  function atRefreshRow(tr) {
    var r = AT.rows[+tr.dataset.i], c = atCalc(r); tr.querySelector('.at-oto').textContent = c.oto ? hj(c.oto) : '-'; tr.querySelector('.at-tot').innerHTML = '<b>' + (c.total ? hj(c.total) : '-') + '</b>';
    tr.querySelector('.at-st').innerHTML = atDirty(r) ? '<span class="badge b-warn">diubah</span>' : '';
    tr.querySelectorAll('.ati').forEach(function (n) { n.classList.toggle('dirty', String(atNum(r[n.dataset.f])) !== String(r.o[n.dataset.f])); });
    atRefreshInfoAll();
  }
  function atBind() {
    var el = AM.el, g = function (id, fn) { var n = $('#' + id, el); if (n) n.onchange = function () { fn(n.value); }; };
    g('amcomp', function (v) { AM.comp = v; AM.cab = ''; atLoad(); });
    g('amcab', function (v) { AM.cab = v; atLoad(); });
    var q = $('#atq', el); if (q) q.oninput = function () { AT.q = q.value; atFilter(); };
    var chg = function () { X.$$('#att tbody tr', el).forEach(atRefreshRow); atRefreshInfoAll(); };
    var au = $('#atauto', el); if (au) au.onchange = function () { AT.opt.auto = au.checked; chg(); };
    var is = $('#atist', el); if (is) is.oninput = function () { AT.opt.ist = is.value; chg(); };
    var jk = $('#atjk', el); if (jk) jk.oninput = function () { AT.opt.jk = jk.value; chg(); };
    var su = $('#atsetuju', el); if (su) su.onchange = function () { AT.opt.setujui = su.checked; };
    var al = $('#atalasan', el); if (al) al.oninput = function () { AT.opt.alasan = al.value; };
    var tb = $('#att tbody', el); if (tb) tb.oninput = function (e) { var t = e.target; if (!t.classList.contains('ati')) return; var tr = t.closest('tr'); AT.rows[+tr.dataset.i][t.dataset.f] = t.value; atRefreshRow(tr); };
  }
  X.ACT['at-save'] = function (b) {
    var ch = AT.rows.filter(atDirty); if (!ch.length || AT.busy) return;
    var over = ch.filter(function (r) { return atNum(r.hari) > 31; }); if (over.length) return X.toast('Hari masuk maksimal 31 (' + over[0].nama + ').', 'warn');
    AT.busy = true; var done = 0, fails = [], p = AM.p, chunks = []; for (var i = 0; i < ch.length; i += 5) chunks.push(ch.slice(i, i + 5));
    var next = function (k) {
      if (k >= chunks.length) {
        AT.busy = false; X.toast((ch.length - fails.length) + ' karyawan tersimpan' + (fails.length ? ', ' + fails.length + ' gagal.' : '.'), fails.length ? 'warn' : undefined);
        fails.slice(0, 3).forEach(function (f) { X.toast(f.nama + ': ' + f.message, 'warn'); });
        X.invalidate('hmon:'); X.invalidate('hrk:'); X.invalidate('lbr:'); X.invalidate('hist:'); X.invalidate('dash:'); X.invalidate('pay'); atLoad(); return;
      }
      b.disabled = true; b.innerHTML = '<span class="spin"></span>Menyimpan ' + done + '/' + ch.length + '…';
      X.api('absen.totalBulk', { periode: p, alasan: AT.opt.alasan || 'Input total sebulan', setujui: AT.opt.setujui, auto_libur: AT.opt.auto, istirahat_menit: AT.opt.ist === '' ? 60 : Number(AT.opt.ist), jam_kerja_menit: atNum(AT.opt.jk) > 0 ? Math.round(atNum(AT.opt.jk) * 60) : 0,
        items: chunks[k].map(function (r) { return { id_karyawan: r.id, hari: Math.floor(atNum(r.hari)), lembur_jam: atNum(r.lem), telat_hari: Math.floor(atNum(r.telH)), telat_menit: Math.floor(atNum(r.telM)) }; }) }, { quiet: true }).then(function (res) {
        if (!res.success) { chunks[k].forEach(function (r) { fails.push({ nama: r.nama, message: res.message }); }); }
        else res.data.hasil.forEach(function (h) { if (!h.success) fails.push({ nama: h.nama, message: h.message }); });
        done += chunks[k].length; next(k + 1);
      });
    };
    next(0);
  };
  function amLoad() {
    if (!AM.emp) { AM.f = null; AM.rows = []; return amRepaint(); }
    var id = AM.emp, p = AM.p; AM.f = null; amRepaint();
    X.api('absen.monthForm', { id_karyawan: id, periode: p }, { quiet: true }).then(function (r) {
      if (AM.emp !== id || AM.p !== p) return; if (!r.success) { X.toast(r.message, 'err'); return; }
      AM.f = r.data; AM.shift = r.data.default_shift; var j = amJadwal();
      AM.rows = r.data.days.map(function (d) { var o = { hadir: d.hadir, masuk: d.masuk, pulang: d.pulang, alasan_lembur: d.alasan_lembur }; return { tanggal: d.tanggal, dow: d.dow, future: d.future, app: d.dari_aplikasi, hadir: d.hadir, masuk: d.masuk, pulang: d.pulang, lembur: d.lembur, alasan_lembur: d.alasan_lembur, status_lembur: d.status_lembur, id_shift: d.id_shift, o: o }; });
      amRepaint();
    });
  }
  function amRepaint() { var el = AM.el; if (!el) return; var y = window.scrollY; el.innerHTML = amShell(); amBind(); window.scrollTo(0, y); }
  function amBind() {
    if (AM.mode === 'total') return atBind();
    var el = AM.el, g = function (id, fn) { var n = $('#' + id, el); if (n) n.onchange = function () { fn(n.value); }; };
    g('amcomp', function (v) { AM.comp = v; AM.cab = ''; AM.emp = ''; AM.f = null; amRepaint(); });
    g('amcab', function (v) { AM.cab = v; AM.emp = ''; AM.f = null; amRepaint(); });
    g('amemp', function (v) { AM.emp = v; amLoad(); });
    g('amshift', function (v) { AM.shift = v; amRepaint(); });
    var al = $('#amalasan', el); if (al) al.oninput = function () { AM.alasan = al.value; };
    var su = $('#amsetuju', el); if (su) su.onchange = function () { AM.setujui = su.checked; };
    var tb = $('#ambody tbody', el); if (!tb) return;
    var rowOf = function (e) { var tr = e.target.closest('tr[data-i]'); return tr ? { tr: tr, r: AM.rows[+tr.dataset.i] } : null; };
    var refreshRow = function (x) { var i = +x.tr.dataset.i, keep = document.activeElement && document.activeElement.className; amRepaintKeep(i, keep); };
    tb.onchange = function (e) {
      var x = rowOf(e); if (!x) return; var r = x.r, t = e.target, j = amJadwal();
      if (t.classList.contains('amh')) { r.hadir = t.checked; if (r.hadir) { r.masuk = r.masuk || j.masuk; r.pulang = r.pulang || j.pulang; r.lembur = Math.max(0, hmToM(r.pulang) - hmToM(j.pulang)); } }
      else if (t.classList.contains('amm')) r.masuk = t.value;
      else if (t.classList.contains('amp')) { r.pulang = t.value; var d = hmToM(r.pulang) - hmToM(j.pulang); if (hmToM(j.pulang) <= hmToM(j.masuk) && d < -720) d += 1440; r.lembur = Math.max(0, d); }
      else if (t.classList.contains('aml')) { r.lembur = Math.max(0, Math.floor(Number(t.value) || 0)); r.pulang = mToHm(hmToM(j.pulang) + r.lembur); }
      else if (t.classList.contains('amal')) r.alasan_lembur = t.value;
      refreshRow(x);
    };
  }
  function amRepaintKeep(i, cls) {
    var body = $('#ambody'); if (!body) return; var sc = body.querySelector('div[style*="overflow:auto"]'), top = sc ? sc.scrollTop : 0; body.innerHTML = amBody(); amBind();
    var sc2 = body.querySelector('div[style*="overflow:auto"]'); if (sc2) sc2.scrollTop = top;
  }
  V.amanual = { render: function (el) { AM.el = el; AM.p = AM.p || X.periodeNow(); el.innerHTML = amShell(); amBind(); if (AM.mode === 'total') atLoad(); else if (AM.emp && !AM.f) amLoad(); } };
  X.ACT['am-prev'] = function () { AM.p = X.periodeShift(AM.p, -1); if (AM.mode === 'total') atLoad(); else amLoad(); };
  X.ACT['am-next'] = function () { if (AM.p < X.periodeNow()) { AM.p = X.periodeShift(AM.p, 1); if (AM.mode === 'total') atLoad(); else amLoad(); } };
  X.ACT['am-preset'] = function (b) {
    var k = +b.dataset.k, j = amJadwal();
    AM.rows.forEach(function (r) {
      if (r.future || r.app) return;
      if (k === 0) { if (!r.o.hadir || !r.app) r.hadir = false; return; }
      if (r.dow >= 1 && r.dow <= k && !r.hadir) { r.hadir = true; r.masuk = j.masuk; r.pulang = j.pulang; r.lembur = 0; }
    });
    amRepaintKeep();
  };
  X.ACT['am-mode'] = function (b) { AM.mode = b.dataset.m; amRepaint(); if (AM.mode === 'total') atLoad(); else if (AM.emp && !AM.f) amLoad(); };
  X.ACT['am-save'] = function (b) {
    var ch = AM.rows.filter(amDirty); if (!ch.length) return; var bad = ch.filter(function (r) { return r.hadir && (!r.masuk); });
    if (bad.length) return X.toast('Jam masuk wajib diisi pada ' + bad.length + ' hari.', 'warn');
    var noA = ch.filter(function (r) { return r.hadir && r.lembur > 0 && !String(r.alasan_lembur || '').trim(); });
    var id = AM.emp, p = AM.p; b.disabled = true; b.innerHTML = '<span class="spin"></span>Menyimpan…';
    X.api('absen.bulk', { id_karyawan: id, periode: p, alasan: AM.alasan || 'Input manual', setujui: AM.setujui, id_shift: AM.shift, days: ch.map(function (r) { return { tanggal: r.tanggal, hadir: r.hadir, masuk: r.masuk, pulang: r.pulang, alasan_lembur: r.alasan_lembur || (r.lembur ? AM.alasan : ''), id_shift: r.id_shift || AM.shift }; }) }).then(function (res) {
      b.innerHTML = ico('check', 'sm') + 'Simpan';
      if (!res.success) { b.disabled = false; return X.toast(res.message, 'err'); }
      X.toast(res.message, res.data.gagal.length ? 'warn' : undefined); if (res.data.gagal.length) X.toast(res.data.gagal[0].tanggal + ': ' + res.data.gagal[0].pesan, 'warn');
      X.invalidate('hmon:'); X.invalidate('hrk:'); X.invalidate('lbr:'); X.invalidate('hist:'); X.invalidate('dash:'); X.invalidate('pay'); amLoad();
    });
  };
})();
