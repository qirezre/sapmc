/* ==========================================================================
   ScriptsFinance.html — Beranda Finance, Master Gaji, Potongan & Adjustment, Bonus, Payroll
   (juga dipakai Manajemen). Kalkulasi tetap di server; klien hanya menampilkan.
   ========================================================================== */
(function () {
  'use strict';
  var X = SAP, S = X.S, $ = X.$, esc = X.esc, ico = X.ico, rp = X.rp, V = X.views;
  var KAT = { KASBON: ['Potongan Khusus', 'b-warn'], POTONGAN_LAIN: ['Potongan Lain', 'b-bad'], BONUS_TAMBAHAN: ['Bonus Tambahan', 'b-ok'], KOREKSI_LEMBUR: ['Koreksi Lembur', 'b-info'] };
  var STAT = { BELUM: ['Belum disimpan', 'b-n'], DRAFT: ['Draft', 'b-warn'], PDF_SIAP: ['PDF siap', 'b-info'], TERKIRIM: ['Terkirim', 'b-ok'], GAGAL: ['Gagal kirim', 'b-bad'] };
  function pick() { return S.boot.pick || { perusahaan: [], cabang: [], shift: [], karyawan: [] }; }
  function can(k) { return S.boot.me.role === 'MANAJEMEN' || S.boot.me.perms[k]; }
  function compOpts(all) { return (all ? [{ v: '', l: 'Semua perusahaan' }] : []).concat(pick().perusahaan.filter(function (c) { return c.aktif; }).map(function (c) { return { v: c.id, l: c.nama }; })); }
  function compName(id) { var c = pick().perusahaan.filter(function (x) { return x.id === id; })[0]; return c ? c.nama : id; }
  function monthBar(p, prevAct, nextAct) {
    return '<div style="display:flex;align-items:center;gap:6px"><button class="btn btn-g btn-s" data-act="' + prevAct + '" aria-label="Bulan sebelumnya">' + ico('chevL', 'sm') + '</button><b style="min-width:132px;text-align:center">' + X.periodeLabel(p) + '</b><button class="btn btn-g btn-s" data-act="' + nextAct + '" aria-label="Bulan berikutnya">' + ico('chevR', 'sm') + '</button></div>';
  }
  function cabNm(id) { var c = pick().cabang.filter(function (x) { return x.id === id; })[0]; return c ? c.nama : id; }
  function cabSelect(id, comp, val) { return '<select class="sel" id="' + id + '" style="min-width:170px;width:auto" aria-label="Filter cabang"><option value="">Semua cabang</option>' + pick().cabang.filter(function (c) { return !comp || c.id_perusahaan === comp; }).map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === val ? ' selected' : '') + '>' + esc(c.nama) + '</option>'; }).join('') + '</select>'; }
  function stat(k, v, s, ic, i) { return '<div class="card stat"><span class="k"><span class="ic ' + ic + '">' + ico(i, 'sm') + '</span>' + k + '</span><span class="v">' + v + '</span><span class="s">' + (s || '&nbsp;') + '</span></div>'; }
  function selectComp(id, val, all) { return '<select class="sel" id="' + id + '" style="min-width:190px;width:auto" aria-label="Filter perusahaan">' + compOpts(all).map(function (o) { return '<option value="' + esc(o.v) + '"' + (o.v === val ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>'; }
  (V.__prefetch = V.__prefetch || []).push(function (role, p) {
    if (role !== 'FINANCE' && role !== 'MANAJEMEN') return;
    if (role === 'FINANCE') X.swr('fhome', 'fin.home', {}, function () {}, { ttl: 60000, anyNav: true });
    if (!(can('can_manage_kasbon') || can('can_manage_bonus') || can('can_koreksi_lembur') || can('can_generate_payroll'))) return;
    X.swr('adj:' + p + ':', 'adj.list', { periode: p, id_perusahaan: '' }, function () {}, { ttl: 60000, anyNav: true });
  });

  /* ---------------------------------------------------------------- BERANDA FINANCE */
  function payBlock(title, p, c) {
    var tot = c.total || 0, pct = function (n) { return tot ? Math.round(n / tot * 100) : 0; };
    return '<div class="card"><div class="card-h"><h3>' + title + '</h3><span class="badge b-n mono">' + p + '</span></div>' + (tot ? '<div style="display:flex;flex-direction:column;gap:12px">' +
      [['Draft', c.DRAFT, 'var(--warn)'], ['PDF siap', c.PDF_SIAP, 'var(--info)'], ['Terkirim', c.TERKIRIM, 'var(--ok)'], ['Gagal', c.GAGAL, 'var(--bad)']].map(function (x) { return '<div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>' + x[0] + '</span><b class="mono">' + x[1] + '</b></div><div class="hbar"><i style="width:' + pct(x[1]) + '%;background:' + x[2] + '"></i></div></div>'; }).join('') +
      '<div class="sline"><span class="muted">Total take home pay</span><b class="mono">' + rp(c.thp) + '</b></div></div>' : X.empty('card', 'Belum ada payroll', 'Payroll periode ini belum disimpan.')) + '</div>';
  }
  function fhomeHtml(d) {
    if (!d) return '<div class="page"><div class="grid g4">' + X.skel(4, 112) + '</div><div class="grid g2">' + X.skel(2, 220) + '</div></div>';
    return '<div class="page"><div class="grid g4" style="margin-bottom:14px">' + stat('Karyawan Aktif', d.karyawan, 'dalam cakupan Anda', 'ic-p', 'users') + stat('Hadir Hari Ini', d.hadir + '<small class="muted" style="font-size:14px"> /' + d.karyawan + '</small>', X.dateLabel(d.tanggal), 'ic-ok', 'check') + stat('Terlambat Hari Ini', d.telat, 'perlu perhatian', 'ic-w', 'clock') + stat('Potongan Khusus Bulan Ini', rp(d.kasbon), 'Bonus tambahan ' + rp(d.bonus), 'ic-b', 'edit') + '</div>' +
      '<div class="grid g2" style="margin-bottom:14px">' + payBlock('Payroll ' + X.periodeLabel(d.periode), d.periode, d.payroll) + payBlock('Payroll ' + X.periodeLabel(d.periodePrev), d.periodePrev, d.payrollPrev) + '</div>' +
      '<div class="card"><div class="card-h"><h3>Pintasan</h3><span class="badge ' + (d.quota < 20 ? 'b-bad' : 'b-ok') + '">' + ico('mail', 'sm') + 'Kuota email: ' + d.quota + '</span></div><div style="display:flex;gap:10px;flex-wrap:wrap">' +
      (can('can_manage_kasbon') || can('can_manage_bonus') || can('can_koreksi_lembur') ? '<button class="btn btn-g" data-go="adj">' + ico('edit', 'sm') + 'Potongan & Adjustment</button>' : '') + (can('can_master_gaji') ? '<button class="btn btn-g" data-go="gaji">' + ico('db', 'sm') + 'Master Gaji</button>' : '') + (can('can_manage_bonus') ? '<button class="btn btn-g" data-go="bonus">' + ico('gift', 'sm') + 'Bonus</button>' : '') + (can('can_generate_payroll') || can('can_send_payslip') ? '<button class="btn btn-p" data-go="payroll">' + ico('card', 'sm') + 'Proses Payroll</button>' : '') + '</div></div></div>';
  }
  V.fhome = { render: function (el) { el.innerHTML = fhomeHtml(null); X.swr('fhome', 'fin.home', {}, function (d) { if (S.route === 'fhome') el.innerHTML = fhomeHtml(d); }, { ttl: 15000 }); } };

  /* ---------------------------------------------------------------- KASBON & ADJUSTMENT */
  var J = { p: '', comp: '', data: null, tbl: null, el: null, tab: 'periode' };
  function adjTabs() {
    if (!can('can_manage_kasbon')) return '';
    return '<div class="toolbar"><div class="seg" role="tablist"><button role="tab" class="' + (J.tab !== 'master' ? 'on' : '') + '" data-act="aj-tab" data-t="periode">Potongan Periode</button><button role="tab" class="' + (J.tab === 'master' ? 'on' : '') + '" data-act="aj-tab" data-t="master">Master Potongan</button></div></div>';
  }
  X.ACT['aj-tab'] = function (b) { J.tab = b.dataset.t; paintAdj(J.el); };
  function katAllowed() { var a = []; if (can('can_manage_kasbon')) a.push('KASBON', 'POTONGAN_LAIN'); if (can('can_manage_bonus')) a.push('BONUS_TAMBAHAN'); if (can('can_koreksi_lembur')) a.push('KOREKSI_LEMBUR'); return a; }
  function adjShell() {
    var tot = J.data ? J.data.total : null;
    if (J.tab === 'master' && can('can_manage_kasbon')) return '<div class="page">' + adjTabs() + '<div id="gridbox"></div></div>';
    return '<div class="page">' + adjTabs() + '<div class="toolbar">' + monthBar(J.p, 'aj-prev', 'aj-next') + selectComp('ajc', J.comp, true) + '<span class="grow"></span><button class="btn btn-p" data-act="aj-add">' + ico('plus', 'sm') + 'Tambah Catatan</button></div>' +
      '<div class="grid g4 keep" style="margin-bottom:14px">' + stat('Potongan Khusus', tot ? rp(tot.kasbon) : '…', '', 'ic-w', 'edit') + stat('Potongan Lain', tot ? rp(tot.potongan_lain) : '…', '', 'ic-b', 'alert') + stat('Bonus Tambahan', tot ? rp(tot.bonus_tambahan) : '…', '', 'ic-ok', 'gift') + stat('Koreksi Lembur', tot ? rp(tot.koreksi_lembur) : '…', '', 'ic-i', 'trend') + '</div><div id="ajt">' + (J.data ? '' : X.skel(5, 56)) + '</div></div>';
  }
  function adjRows() { return (J.data ? J.data.rows : []).map(function (r) { r.nominal = Number(r.nominal); return r; }); }
  function adjTable() {
    var box = $('#ajt'); if (!box) return;
    var rows = adjRows(), k = function (r) { var m = KAT[r.kategori] || [r.kategori, 'b-n']; return '<span class="badge ' + m[1] + '">' + m[0] + '</span>'; };
    var act = function (r) { return r.tmp ? '<span class="spin" style="width:14px;height:14px;border-width:2px"></span>' : '<button class="ibtn sm" data-act="aj-edit" data-id="' + esc(r.id_catat) + '" aria-label="Ubah">' + ico('edit', 'sm') + '</button><button class="ibtn sm" data-act="aj-del" data-id="' + esc(r.id_catat) + '" aria-label="Hapus">' + ico('trash', 'sm') + '</button>'; };
    J.tbl = X.mountTable(box, { rows: rows, searchKeys: ['nama', 'kategori', 'keterangan'], searchPlaceholder: 'Cari karyawan / keterangan…', pageSize: 10, sort: null, emptyTitle: 'Belum ada catatan', emptySub: 'Tambahkan kasbon, potongan, atau bonus untuk periode ini.', actions: act,
      cols: [{ k: 'nama', label: 'Karyawan', render: function (r) { return '<b>' + esc(r.nama) + '</b><div class="mono muted" style="font-size:11px">' + esc(r.id_karyawan) + '</div>'; } }, { k: 'kategori', label: 'Kategori', render: k }, { k: 'keterangan', label: 'Keterangan', render: function (r) { return '<span class="muted">' + esc(r.keterangan || '-') + '</span>'; } }, { k: 'nominal', label: 'Nominal', num: true, render: function (r) { return (r.kategori === 'KASBON' || r.kategori === 'POTONGAN_LAIN' ? '<span style="color:var(--bad)">-' : '<span style="color:var(--ok-x)">+') + rp(Math.abs(r.nominal)).replace('Rp ', 'Rp ') + '</span>'; } }],
      mobileCard: function (r) { return '<div class="li"><div class="grow"><div class="t1">' + esc(r.nama) + '</div><div class="t2">' + k(r) + ' ' + esc(r.keterangan || '') + '</div></div><div class="tr"><b class="mono">' + rp(Math.abs(r.nominal)) + '</b><div>' + act(r) + '</div></div></div>'; } });
  }
  function paintAdj(el) {
    if (J.tab === 'master' && can('can_manage_kasbon')) { el.innerHTML = adjShell(); G.mount($('#gridbox', el), 'pot'); return; }
    var p = J.p, c = J.comp, key = 'adj:' + p + ':' + c; J.data = null; el.innerHTML = adjShell(); bindAdj(el);
    X.swr(key, 'adj.list', { periode: p, id_perusahaan: c }, function (d) { if (J.p === p && J.comp === c && S.route === 'adj') { J.data = d; el.innerHTML = adjShell(); bindAdj(el); adjTable(); } }, { ttl: 20000 });
  }
  function bindAdj(el) { var s = $('#ajc', el); if (s) s.onchange = function () { J.comp = s.value; paintAdj(el); }; }
  V.adj = { render: function (el) { J.p = J.p || X.periodeNow(); J.el = el; paintAdj(el); } };
  X.ACT['aj-prev'] = function () { J.p = X.periodeShift(J.p, -1); paintAdj(J.el); };
  X.ACT['aj-next'] = function () { J.p = X.periodeShift(J.p, 1); paintAdj(J.el); };
  function adjForm(r) {
    var emps = pick().karyawan.filter(function (k) { return k.aktif && (!J.comp || k.id_perusahaan === J.comp); }), kat = katAllowed();
    return X.field({ name: 'id_karyawan', label: 'Karyawan', type: 'select', required: true, value: r && r.id_karyawan, options: emps.map(function (k) { return { v: k.id, l: k.nama + ' · ' + k.id }; }) }) +
      '<div class="row2">' + X.field({ name: 'kategori', label: 'Kategori', type: 'select', required: true, value: r ? r.kategori : kat[0], options: kat.map(function (x) { return { v: x, l: KAT[x][0] }; }) }) + X.field({ name: 'nominal', label: 'Nominal (Rp)', type: 'number', required: true, value: r ? r.nominal : '', attrs: 'min="0" step="1000" data-rp="1"', placeholder: '0' }) + '</div>' +
      X.field({ name: 'keterangan', label: 'Keterangan', type: 'textarea', value: r && r.keterangan, help: 'Opsional, maks. 200 karakter. Koreksi lembur boleh bernilai negatif.' });
  }
  function adjModal(r) {
    if (!katAllowed().length) return X.toast('Anda tidak memiliki izin untuk fitur ini.', 'err');
    X.modal({ title: r ? 'Ubah Catatan' : 'Tambah Catatan', body: adjForm(r), footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="sv">Simpan</button>',
      onOpen: function (m) {
        m.$('#sv').onclick = function () {
          var f = X.readForm(m.el), nom = Number(f.nominal);
          if (!f.id_karyawan) return X.toast('Pilih karyawan.', 'warn'); if (!nom) return X.toast('Nominal wajib diisi.', 'warn');
          var payload = { id_catat: r && r.id_catat, periode: J.p, id_karyawan: f.id_karyawan, kategori: f.kategori, nominal: nom, keterangan: f.keterangan }, emp = pick().karyawan.filter(function (k) { return k.id === f.id_karyawan; })[0] || {};
          var tmp = { id_catat: r ? r.id_catat : 'tmp' + Date.now(), nama: emp.nama || f.id_karyawan, id_karyawan: f.id_karyawan, kategori: f.kategori, nominal: nom, keterangan: f.keterangan, tmp: true }, p = J.p, c = J.comp;
          if (J.data) { if (r) J.data.rows = J.data.rows.map(function (x) { return x.id_catat === r.id_catat ? tmp : x; }); else J.data.rows.unshift(tmp); adjTable(); }          // optimistic
          m.close();
          X.api('adj.save', payload).then(function (res) {
            if (!res.success) { X.toast(res.message, 'err'); } else X.toast(res.message);
            X.invalidate('adj:'); X.invalidate('bonus2:'); if (S.route === 'adj' && J.p === p && J.comp === c) paintAdjFresh(p, c);
          });
        };
      } });
  }
  function paintAdjFresh(p, c) {
    X.api('adj.list', { periode: p, id_perusahaan: c }, { quiet: true }).then(function (r) { if (r.success && J.p === p && J.comp === c && S.route === 'adj') { J.data = r.data; J.el.innerHTML = adjShell(); bindAdj(J.el); adjTable(); } });
  }
  X.ACT['aj-add'] = function () { adjModal(null); };
  X.ACT['aj-edit'] = function (b) { var r = J.data.rows.filter(function (x) { return x.id_catat === b.dataset.id; })[0]; if (r) adjModal(r); };
  X.ACT['aj-del'] = function (b) {
    var id = b.dataset.id, r = J.data.rows.filter(function (x) { return x.id_catat === id; })[0]; if (!r) return;
    X.confirm({ title: 'Hapus catatan?', html: 'Catatan <b>' + esc(KAT[r.kategori][0]) + '</b> untuk <b>' + esc(r.nama) + '</b> (' + rp(r.nominal) + ') akan dihapus.', danger: true, ok: 'Hapus' }).then(function (ok) {
      if (!ok) return; var bak = J.data.rows.slice(); J.data.rows = J.data.rows.filter(function (x) { return x.id_catat !== id; }); adjTable();
      X.api('adj.delete', { id_catat: id }).then(function (res) { if (!res.success) { J.data.rows = bak; adjTable(); X.toast(res.message, 'err'); } else { X.toast(res.message); X.invalidate('adj:'); X.invalidate('bonus2:'); paintAdjFresh(J.p, J.comp); } });
    });
  };

  /* ---------------------------------------------------------------- BONUS (total per cabang/perusahaan × persen karyawan) */
  var B = { p: '', comp: '', data: null, du: {}, dr: {}, el: null };
  function bn() { return Object.keys(B.du).length + Object.keys(B.dr).length; }
  function uTotal(u) { var d = B.du[u.key]; return d !== undefined ? d : (u.ada ? u.total_bonus : ''); }
  function rVal(r, f) { var d = B.dr[r.id_karyawan]; return d && d[f] !== undefined ? d[f] : r[f]; }
  function cOrig(r) { return r.bonus_custom === null || r.bonus_custom === undefined ? '' : r.bonus_custom; }
  function cVal(r) { var d = B.dr[r.id_karyawan]; return d && d.bonus_custom !== undefined ? d.bonus_custom : cOrig(r); }
  function unitOf(r) { var us = B.data.units || [], c = us.filter(function (u) { return u.key === 'C:' + r.id_cabang; })[0], p = us.filter(function (u) { return u.key === 'P:' + r.id_perusahaan; })[0]; return c && uTotal(c) !== '' ? c : p; }
  function bonusShell() {
    var n = bn();
    return '<div class="page"><div class="toolbar">' + monthBar(B.p, 'bn-prev', 'bn-next') + selectComp('bnc', B.comp, true) + '<span class="grow"></span><button class="btn btn-p" id="bnsave" data-act="bn-save" ' + (n ? '' : 'disabled') + '>' + ico('check', 'sm') + '<span id="bncnt">Simpan' + (n ? ' (' + n + ')' : '') + '</span></button></div>' +
      '<p class="help" style="margin-bottom:12px">Isi <b>total bonus</b> per cabang (atau seluruh perusahaan) untuk periode ini, lalu atur <b>persentase</b> tiap karyawan. Bonus karyawan = total × persen ÷ 100. Total cabang dipakai lebih dulu; bila kosong, memakai total perusahaan. Untuk karyawan yang bonusnya <b>tidak dari persen</b>, isi <b>Bonus Custom (Rp)</b>: nominal itu dipakai menggantikan perhitungan persen bulan ini (kosongkan untuk kembali ke persen). Bonus sekali-waktu tetap lewat <b>Potongan &amp; Adjustment</b>.</p><div id="bnt">' + (B.data ? '' : X.skel(5, 56)) + '</div></div>';
  }
  function bonusTable() {
    var box = $('#bnt'); if (!box || !B.data) return;
    if (!B.data.units || !B.data.rows) { box.innerHTML = '<div class="card flat">' + X.empty('alert', 'Versi server belum diperbarui', 'Ganti Code.gs, PayrollService.gs dan DashboardService.gs dengan versi terbaru, jalankan setupAppEnvironment, lalu deploy versi baru.') + '</div>'; return; }
    var us = B.data.units, rows = B.data.rows;
    var uh = '<div class="card flat" style="padding:0;overflow:hidden;margin-bottom:14px"><div class="card-h" style="padding:14px 16px 0"><h3>Total Bonus ' + X.periodeLabel(B.p) + '</h3></div><div style="overflow:auto"><table class="t" style="min-width:560px"><thead><tr><th>Cabang / Perusahaan</th><th class="num">Total Bonus (Rp)</th><th class="num">Σ Persen</th><th class="num">Terbagi (Rp)</th><th>Status</th></tr></thead><tbody>' +
      us.map(function (u) { var v = uTotal(u); return '<tr><td><b>' + esc(u.nama) + '</b>' + (u.tipe === 'PERUSAHAAN' ? '<div class="muted" style="font-size:11px">dipakai karyawan yang cabangnya belum punya total</div>' : '') + '</td><td class="num"><input class="inp mi' + (B.du[u.key] !== undefined ? ' dirty' : '') + '" style="width:150px;text-align:right;font-family:var(--mono);margin-left:auto" type="number" min="0" step="100000" inputmode="numeric" data-rp="1" placeholder="kosong" data-bu="' + esc(u.key) + '" value="' + esc(v) + '" aria-label="Total bonus ' + esc(u.nama) + '"></td><td class="num" data-us="' + esc(u.key) + '"></td><td class="num" data-ut="' + esc(u.key) + '"></td><td data-uz="' + esc(u.key) + '"></td></tr>'; }).join('') + '</tbody></table></div></div>';
    var rh = '<div class="search" style="margin-bottom:8px"><span>' + ico('search', 'sm') + '</span><input class="inp" id="bnq" placeholder="Cari karyawan / cabang…" aria-label="Cari"></div><div class="card flat" style="padding:0;overflow:hidden"><div style="overflow:auto;max-height:62vh"><table class="t mg" style="min-width:700px"><thead><tr><th>No</th><th>Karyawan</th><th>Cabang</th><th class="num">Bonus (%)</th><th class="num">Bonus Custom (Rp)</th><th class="num">Bonus Diterima (Rp)</th><th class="num">Bonus Tambahan</th></tr></thead><tbody>' +
      rows.map(function (r, i) { return '<tr data-q="' + esc((r.nama + ' ' + r.cabang).toLowerCase()) + '"><td class="muted">' + (i + 1) + '</td><td><b>' + esc(r.nama) + '</b></td><td>' + esc(r.cabang) + '</td><td class="num"><input class="inp mi' + (B.dr[r.id_karyawan] && B.dr[r.id_karyawan].bonus_persen !== undefined ? ' dirty' : '') + '" style="width:84px;text-align:right;font-family:var(--mono)" type="number" min="0" max="100" step="0.1" inputmode="decimal" placeholder="0" data-br="' + esc(r.id_karyawan) + '" data-f="bonus_persen" value="' + esc(rVal(r, 'bonus_persen') || '') + '" aria-label="Persen ' + esc(r.nama) + '"></td><td class="num"><input class="inp mi' + (B.dr[r.id_karyawan] && B.dr[r.id_karyawan].bonus_custom !== undefined ? ' dirty' : '') + '" style="width:120px;text-align:right;font-family:var(--mono)" type="number" min="0" step="10000" inputmode="numeric" placeholder="ikut %" data-br="' + esc(r.id_karyawan) + '" data-f="bonus_custom" value="' + esc(cVal(r)) + '" aria-label="Bonus custom ' + esc(r.nama) + '"></td><td class="num" data-rs="' + esc(r.id_karyawan) + '"></td><td class="num">' + rp(r.bonus_tambahan) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    box.innerHTML = uh + rh; bonusCalc();
    var q = $('#bnq', box); if (q) q.oninput = X.debounce(function () { var t = q.value.toLowerCase().trim(); X.$$('#bnt tbody tr[data-q]').forEach(function (tr) { tr.style.display = !t || tr.dataset.q.indexOf(t) >= 0 ? '' : 'none'; }); }, 120);
  }
  function bonusCalc() {
    if (!B.data || !B.data.units) return; var sum = {}, share = {}, custom = {};
    B.data.rows.forEach(function (r) { var u = unitOf(r), pr = Number(rVal(r, 'bonus_persen')) || 0, cv = cVal(r); if (cv !== '') { share[r.id_karyawan] = Number(cv) || 0; custom[r.id_karyawan] = true; return; } if (!u) return; sum[u.key] = (sum[u.key] || 0) + pr; var t = uTotal(u); share[r.id_karyawan] = Math.round((Number(t) || 0) * pr / 100); });
    B.data.units.forEach(function (u) {
      var t = uTotal(u), s = Math.round((sum[u.key] || 0) * 10) / 10, el = function (k) { return document.querySelector('[' + k + '="' + u.key + '"]'); };
      var a = el('data-us'), b = el('data-ut'), z = el('data-uz'); if (!a) return;
      a.textContent = s + '%'; b.textContent = rp(Math.round((Number(t) || 0) * s / 100));
      z.innerHTML = t === '' ? '<span class="badge b-n">Tidak diisi</span>' : s === 100 ? '<span class="badge b-ok">Pas 100%</span>' : s > 100 ? '<span class="badge b-bad">Lebih ' + Math.round((s - 100) * 10) / 10 + '%</span>' : (sum[u.key] ? '<span class="badge b-warn">Sisa ' + Math.round((100 - s) * 10) / 10 + '%</span>' : '<span class="badge b-n">Belum ada persen</span>');
    });
    B.data.rows.forEach(function (r) { var c = document.querySelector('[data-rs="' + r.id_karyawan + '"]'); if (c) c.innerHTML = share[r.id_karyawan] ? rp(share[r.id_karyawan]) + (custom[r.id_karyawan] ? ' <span class="badge b-info">custom</span>' : '') : (custom[r.id_karyawan] ? 'Rp 0 <span class="badge b-info">custom</span>' : '–'); });
  }
  function bnBadge() { var n = bn(), b = $('#bnsave'); if (b) b.disabled = !n; var c = $('#bncnt'); if (c) c.textContent = 'Simpan' + (n ? ' (' + n + ')' : ''); }
  function paintBonus(el) {
    var p = B.p, c = B.comp; B.data = null; el.innerHTML = bonusShell(); bindBonus(el);
    X.swr('bonus2:' + p + ':' + c, 'bonus.list', { periode: p, id_perusahaan: c }, function (d) { if (B.p === p && B.comp === c && S.route === 'bonus' && !bn()) { B.data = d; el.innerHTML = bonusShell(); bindBonus(el); bonusTable(); } else if (B.p === p && B.comp === c && S.route === 'bonus' && !B.data) { B.data = d; bonusTable(); } }, { ttl: 20000 });
  }
  function bindBonus(el) {
    var s = $('#bnc', el); if (s) s.onchange = function () { B.comp = s.value; B.du = {}; B.dr = {}; paintBonus(el); };
    if (!el.__bn) { el.__bn = true; el.addEventListener('input', function (e) {
      var t = e.target; if (!t.dataset || !B.data) return;
      if (t.dataset.bu) {
        var u = B.data.units.filter(function (x) { return x.key === t.dataset.bu; })[0], v = t.value === '' ? '' : Math.max(0, Number(t.value) || 0), orig = u.ada ? u.total_bonus : '';
        if (v === orig) delete B.du[u.key]; else B.du[u.key] = v; t.classList.toggle('dirty', v !== orig);
      } else if (t.dataset.br && t.dataset.f === 'bonus_custom') {
        var idc = t.dataset.br, rc = B.data.rows.filter(function (x) { return x.id_karyawan === idc; })[0], vc = t.value === '' ? '' : Math.max(0, Number(t.value) || 0), oc = cOrig(rc);
        var dc = (B.dr[idc] = B.dr[idc] || {}); if (vc === oc) { delete dc.bonus_custom; if (!Object.keys(dc).length) delete B.dr[idc]; } else dc.bonus_custom = vc; t.classList.toggle('dirty', vc !== oc);
      } else if (t.dataset.br) {
        var id = t.dataset.br, f = t.dataset.f, row = B.data.rows.filter(function (x) { return x.id_karyawan === id; })[0], v2 = Math.max(0, Number(t.value) || 0); if (f === 'bonus_persen') v2 = Math.min(100, v2);
        var d = (B.dr[id] = B.dr[id] || {}); if (v2 === (row[f] || 0)) { delete d[f]; if (!Object.keys(d).length) delete B.dr[id]; } else d[f] = v2; t.classList.toggle('dirty', v2 !== (row[f] || 0));
      } else return;
      bonusCalc(); bnBadge();
    }); }
  }
  V.bonus = { render: function (el) { B.p = B.p || X.periodeNow(); B.el = el; el.__bn = false; paintBonus(el); } };
  X.ACT['bn-prev'] = function () { B.p = X.periodeShift(B.p, -1); B.du = {}; paintBonus(B.el); };
  X.ACT['bn-next'] = function () { B.p = X.periodeShift(B.p, 1); B.du = {}; paintBonus(B.el); };
  X.ACT['bn-save'] = function (b) {
    var items = Object.keys(B.dr).map(function (id) { return Object.assign({ id_karyawan: id }, B.dr[id]); });
    var pools = Object.keys(B.du).map(function (k) { var u = B.data.units.filter(function (x) { return x.key === k; })[0]; return { id_perusahaan: u.id_perusahaan, id_cabang: u.id_cabang, total_bonus: B.du[k] }; });
    if (!items.length && !pools.length) return; b.disabled = true; b.innerHTML = '<span class="spin"></span>Menyimpan…';
    X.api('bonus.save', { periode: B.p, items: items, pools: pools }).then(function (r) {
      b.innerHTML = ico('check', 'sm') + '<span id="bncnt">Simpan</span>';
      if (!r.success) { X.toast(r.message, 'err'); b.disabled = false; return; }
      X.toast(r.message); B.du = {}; B.dr = {}; X.invalidate('bonus2:'); X.invalidate('payroll'); X.invalidate('master:');
      X.api('bonus.list', { periode: B.p, id_perusahaan: B.comp }, { quiet: true }).then(function (x) { if (x.success && S.route === 'bonus') { B.data = x.data; B.el.innerHTML = bonusShell(); bindBonus(B.el); bonusTable(); } });
    });
  };

  /* ---------------------------------------------------------------- PAYROLL */
  var P = { p: '', comp: '', cab: '', data: null, el: null, run: false };
  function stepsHtml() {
    var has = P.data && P.data.rows.length, sv = has && P.data.rows.some(function (r) { return r.status !== 'BELUM'; }), pdf = has && P.data.rows.some(function (r) { return r.status === 'PDF_SIAP' || r.status === 'TERKIRIM'; }), snt = has && P.data.rows.some(function (r) { return r.status === 'TERKIRIM'; });
    var s = [['Hitung', has], ['Simpan Draft', sv], ['Buat PDF', pdf], ['Kirim Email', snt]];
    return '<div class="steps">' + s.map(function (x, i) { return '<div class="stp ' + (x[1] ? 'done' : (i === 0 || s[i - 1][1] ? 'on' : '')) + '"><b>' + (x[1] ? ico('check', 'sm') : i + 1) + '</b>' + x[0] + '</div>'; }).join('') + '</div>';
  }
  function payShell() {
    var d = P.data, t = d && d.total;
    var acts = '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (can('can_generate_payroll') ? '<button class="btn btn-g" data-act="py-save" ' + (d && d.rows.length ? '' : 'disabled') + '>' + ico('db', 'sm') + 'Simpan Draft</button><button class="btn btn-g" data-act="py-pdf" ' + (d && d.rows.some(function (r) { return r.status !== 'BELUM'; }) ? '' : 'disabled') + '>' + ico('file', 'sm') + 'Buat PDF</button>' : '') + (can('can_send_payslip') ? '<button class="btn btn-p" data-act="py-send" ' + (d && d.rows.some(function (r) { return r.status === 'PDF_SIAP' || r.status === 'GAGAL'; }) ? '' : 'disabled') + '>' + ico('send', 'sm') + 'Kirim Email</button>' : '') + '</div>';
    return '<div class="page">' + stepsHtml() + '<div class="toolbar">' + monthBar(P.p, 'py-prev', 'py-next') + selectComp('pyc', P.comp, true) + cabSelect('pycab', P.comp, P.cab) + '<button class="btn btn-p" data-act="py-calc" id="pycalc">' + ico('refresh', 'sm') + 'Hitung Payroll</button><button class="btn btn-g" data-act="py-xlsx" title="Unduh rekap gaji semua perusahaan dan cabang untuk bulan ini (Excel)">' + ico('download', 'sm') + 'Rekap Gaji (Excel)</button></div>' +
      (d ? '<div class="grid keep" style="margin-bottom:14px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">' + stat('Karyawan', t.karyawan, X.periodeLabel(P.p) + (P.cab ? ' · ' + cabNm(P.cab) : ''), 'ic-p', 'users') + stat('Total Pendapatan', rp(t.pendapatan || 0), 'gaji + tunjangan + lembur + bonus', 'ic-b', 'db') + stat('Total THP', rp(t.thp), '', 'ic-ok', 'card') + stat('Total Potongan', rp(t.potongan), '', 'ic-b', 'alert') + stat('Total Lembur', rp(t.lembur), '', 'ic-i', 'trend') + '</div><div class="toolbar">' + acts + '</div><div id="pyt"></div>' : '<div class="card flat">' + X.empty('card', 'Mulai dengan menghitung payroll', 'Pilih periode dan perusahaan lalu tekan “Hitung Payroll”. Hasil hanya pratinjau sampai Anda menyimpannya sebagai draft.') + '</div>') + '</div>';
  }
  function payTable() {
    var box = $('#pyt'); if (!box || !P.data) return;
    X.mountTable(box, { rows: P.data.rows, searchKeys: ['nama', 'id_karyawan', 'email'], searchPlaceholder: 'Cari karyawan…', pageSize: 12, emptyTitle: 'Tidak ada data payroll', emptySub: 'Belum ada karyawan/absensi pada periode ini.',
      actions: function (r) { return r.status === 'PDF_SIAP' || r.status === 'TERKIRIM' || r.status === 'GAGAL' ? '<button class="ibtn sm" data-act="py-view" data-id="' + esc(r.id_payroll) + '" aria-label="Lihat slip PDF">' + ico('eye', 'sm') + '</button>' : ''; },
      cols: [{ k: 'nama', label: 'Karyawan', render: function (r) { return '<b>' + esc(r.nama) + '</b><div class="mono muted" style="font-size:11px">' + esc(r.id_karyawan) + ' · ' + esc(compName(r.id_perusahaan)) + '</div>'; } }, { k: 'total_hari_hadir', label: 'Hadir', num: true }, { k: 'frekuensi_telat', label: 'Telat (hari)', num: true, render: function (r) { return r.frekuensi_telat ? '<span class="badge b-warn">' + r.frekuensi_telat + '</span>' : '0'; } },
        { k: 'gaji_pokok', label: 'Pendapatan Tetap', num: true, render: function (r) { return rp(r.gaji_pokok + r.tunjangan_tetap); } }, { k: 'total_uang_lembur', label: 'Lembur', num: true, render: function (r) { return rp(r.total_uang_lembur); } }, { k: 'total_bonus', label: 'Bonus', num: true, render: function (r) { return rp(r.total_bonus); } },
        { k: 'total_pendapatan', label: 'Total Pendapatan', num: true, render: function (r) { return rp(r.total_pendapatan !== undefined ? r.total_pendapatan : r.gaji_pokok + r.tunjangan_tetap + r.total_uang_lembur + r.total_bonus); } },
        { k: 'total_potongan_telat', label: 'Potongan', num: true, render: function (r) { return '<span style="color:var(--bad)">-' + rp(r.total_potongan_telat + r.total_potongan_kasbon) + '</span>'; } }, { k: 'take_home_pay', label: 'THP', num: true, render: function (r) { return '<b>' + rp(r.take_home_pay) + '</b>'; } },
        { k: 'status', label: 'Status', render: function (r) { var m = STAT[r.status] || STAT.BELUM; return '<span class="badge ' + m[1] + '">' + m[0] + '</span>' + (r.berubah ? ' <span class="badge b-warn" title="Angka berubah sejak disimpan">Berubah</span>' : ''); } }],
      mobileCard: function (r) { var m = STAT[r.status] || STAT.BELUM; return '<div class="li"><div class="grow"><div class="t1">' + esc(r.nama) + '</div><div class="t2">' + r.total_hari_hadir + ' hari · telat ' + (r.frekuensi_telat || 0) + ' hari · <span class="badge ' + m[1] + '">' + m[0] + '</span>' + (r.berubah ? ' <span class="badge b-warn">Berubah</span>' : '') + '</div></div><div class="tr"><b class="mono">' + rp(r.take_home_pay) + '</b>' + (r.status === 'PDF_SIAP' || r.status === 'TERKIRIM' || r.status === 'GAGAL' ? '<div><button class="ibtn sm" data-act="py-view" data-id="' + esc(r.id_payroll) + '" aria-label="Lihat slip">' + ico('eye', 'sm') + '</button></div>' : '') + '</div></div>'; } });
  }

  /* ---------------------------------------------------------------- REKAP GAJI BULANAN (Excel): per perusahaan -> per cabang */
  var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  function loadXlsx() {
    return new Promise(function (resolve, reject) {
      if (window.XLSX) return resolve(window.XLSX);
      var s = document.createElement('script'); s.src = XLSX_URL; s.onload = function () { window.XLSX ? resolve(window.XLSX) : reject(new Error('XLSX')); }; s.onerror = function () { reject(new Error('Gagal memuat pustaka Excel. Periksa koneksi internet.')); };
      document.head.appendChild(s);
    });
  }
  function kompKey(n) { return String(n || '').replace(/\s*\(.*$/, '').trim() || 'Lainnya'; }
  function sheetName(n, used) { var b = String(n).replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 28).trim() || 'Sheet', x = b, i = 2; while (used[x.toLowerCase()]) x = b.slice(0, 26) + ' ' + (i++); used[x.toLowerCase()] = 1; return x; }
  function buildRekapGaji(XL, periode, rows) {
    var pendKeys = [], potKeys = [];
    rows.forEach(function (r) { var ri = {}; try { ri = JSON.parse(r.rincian_json || '{}'); } catch (e) { ri = {}; } r._ri = ri;
      (ri.pend || []).forEach(function (x) { var k = kompKey(x.n); if (pendKeys.indexOf(k) < 0) pendKeys.push(k); });
      (ri.pot || []).forEach(function (x) { var k = kompKey(x.n); if (potKeys.indexOf(k) < 0) potKeys.push(k); }); });
    var hdr = ['No', 'NIK', 'Nama', 'Jabatan', 'Hadir (hari)', 'Gaji Pokok'].concat(pendKeys, ['Lembur (jam)', 'Upah Lembur', 'Bonus', 'Total Pendapatan'], potKeys, ['Total Potongan', 'Take Home Pay']);
    var NUM0 = 5;                                   // kolom angka dimulai dari "Gaji Pokok"
    function line(r, no) {
      var ri = r._ri, pend = {}, pot = {}; (ri.pend || []).forEach(function (x) { pend[kompKey(x.n)] = (pend[kompKey(x.n)] || 0) + x.v; }); (ri.pot || []).forEach(function (x) { pot[kompKey(x.n)] = (pot[kompKey(x.n)] || 0) + x.v; });
      var gross = r.total_pendapatan !== undefined ? r.total_pendapatan : r.gaji_pokok + r.tunjangan_tetap + r.total_uang_lembur + r.total_bonus, pt = r.total_potongan_telat + r.total_potongan_kasbon;
      return [no, r.nik || '', r.nama, r.jabatan || '', r.total_hari_hadir, r.gaji_pokok].concat(pendKeys.map(function (k) { return pend[k] || 0; }), [r.total_jam_lembur || 0, r.total_uang_lembur, r.total_bonus, gross], potKeys.map(function (k) { return pot[k] || 0; }), [pt, r.take_home_pay]);
    }
    function sumRows(list) { var t = []; for (var c = 0; c < hdr.length; c++) t.push(c < 4 ? '' : 0); list.forEach(function (l) { for (var c = 4; c < hdr.length; c++) t[c] += Number(l[c]) || 0; }); return t; }
    function sheet(aoa, merges, widths) { var ws = XL.utils.aoa_to_sheet(aoa); ws['!cols'] = widths.map(function (w) { return { wch: w }; }); if (merges) ws['!merges'] = merges;
      var jam = hdr.indexOf('Lembur (jam)'); Object.keys(ws).forEach(function (a) { var c = XL.utils.decode_cell(a).c; if (a[0] !== '!' && typeof ws[a].v === 'number' && c >= NUM0 && c !== jam) ws[a].z = '#,##0'; }); return ws; }
    var wb = XL.utils.book_new(), used = {}, byComp = {}, compOrder = [];
    rows.forEach(function (r) { if (!byComp[r.id_perusahaan]) { byComp[r.id_perusahaan] = {}; compOrder.push(r.id_perusahaan); } (byComp[r.id_perusahaan][r.id_cabang] = byComp[r.id_perusahaan][r.id_cabang] || []).push(r); });
    var title = 'REKAP GAJI ' + X.periodeLabel(periode).toUpperCase();
    // ---- ringkasan
    var sum = [[title], ['Dirinci per perusahaan dan cabang'], [], ['Perusahaan', 'Cabang', 'Karyawan', 'Total Pendapatan', 'Total Potongan', 'Take Home Pay']], grand = [0, 0, 0, 0];
    compOrder.forEach(function (cid) {
      var ct = [0, 0, 0, 0]; Object.keys(byComp[cid]).forEach(function (cab) {
        var lst = byComp[cid][cab], lines = lst.map(function (r) { return line(r, 0); }), t = sumRows(lines), iG = hdr.indexOf('Total Pendapatan'), iP = hdr.indexOf('Total Potongan'), iT = hdr.indexOf('Take Home Pay'), v = [lst.length, t[iG], t[iP], t[iT]];
        sum.push([compName(cid), cabNm(cab), v[0], v[1], v[2], v[3]]); for (var i = 0; i < 4; i++) ct[i] += v[i];
      });
      sum.push(['Subtotal ' + compName(cid), '', ct[0], ct[1], ct[2], ct[3]]); for (var j = 0; j < 4; j++) grand[j] += ct[j];
    });
    sum.push([]); sum.push(['TOTAL KESELURUHAN', '', grand[0], grand[1], grand[2], grand[3]]);
    var wsS = XL.utils.aoa_to_sheet(sum); wsS['!cols'] = [{ wch: 34 }, { wch: 24 }, { wch: 11 }, { wch: 20 }, { wch: 18 }, { wch: 20 }];
    Object.keys(wsS).forEach(function (a) { if (a[0] !== '!' && typeof wsS[a].v === 'number' && XL.utils.decode_cell(a).c >= 3) wsS[a].z = '#,##0'; });
    XL.utils.book_append_sheet(wb, wsS, sheetName('Ringkasan', used));
    // ---- satu sheet per perusahaan, dibagi per cabang
    compOrder.forEach(function (cid) {
      var aoa = [[title + ' — ' + compName(cid)], []], cab = byComp[cid], ctot = [];
      Object.keys(cab).forEach(function (cb) {
        aoa.push(['CABANG: ' + cabNm(cb)]); aoa.push(hdr);
        var lines = cab[cb].map(function (r, i) { return line(r, i + 1); }); lines.forEach(function (l) { aoa.push(l); });
        var t = sumRows(lines); t[2] = 'Subtotal ' + cabNm(cb); aoa.push(t); aoa.push([]); ctot = ctot.concat(lines);
      });
      var tt = sumRows(ctot); tt[2] = 'TOTAL ' + compName(cid).toUpperCase(); aoa.push(tt);
      XL.utils.book_append_sheet(wb, sheet(aoa, null, [5, 14, 26, 18, 11, 14].concat(pendKeys.map(function () { return 16; }), [12, 14, 14, 16], potKeys.map(function () { return 16; }), [16, 16])), sheetName(compName(cid), used));
    });
    return wb;
  }
  X.ACT['py-xlsx'] = function (b) {
    var p = P.p; b.disabled = true; var old = b.innerHTML; b.innerHTML = '<span class="spin"></span>Menyiapkan…';
    var done = function () { b.disabled = false; b.innerHTML = old; };
    Promise.all([loadXlsx(), X.api('payroll.preview', { periode: p, id_perusahaan: '', id_cabang: '' })]).then(function (res) {
      var XL = res[0], r = res[1]; if (!r.success) { X.toast(r.message, 'err'); return; }
      if (!r.data.rows.length) { X.toast('Tidak ada data payroll pada ' + X.periodeLabel(p) + '.', 'warn'); return; }
      var wb = buildRekapGaji(XL, p, r.data.rows), b64 = XL.write(wb, { bookType: 'xlsx', type: 'base64' });
      X.saveB64('Rekap_Gaji_' + p + '.xlsx', b64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); X.toast('Rekap gaji ' + X.periodeLabel(p) + ' diunduh.');
    }).catch(function (e) { X.toast(e.message || 'Gagal membuat rekap gaji.', 'err'); }).then(done);
  };
  function repaintPay() { if (S.route !== 'payroll') return; P.el.innerHTML = payShell(); bindPay(); payTable(); }
  function bindPay() {
    var s = $('#pyc', P.el); if (s) s.onchange = function () { P.comp = s.value; P.cab = ''; P.data = null; repaintPay(); };
    var cb = $('#pycab', P.el); if (cb) cb.onchange = function () { P.cab = cb.value; P.data = null; repaintPay(); };
  }
  function calc(quiet) {
    var p = P.p, c = P.comp, cb = P.cab, b = $('#pycalc'); if (b && !quiet) { b.disabled = true; b.innerHTML = '<span class="spin"></span>Menghitung…'; }
    return X.api('payroll.preview', { periode: p, id_perusahaan: c, id_cabang: cb }, { quiet: quiet }).then(function (r) {
      if (P.p !== p || P.comp !== c || P.cab !== cb) return;
      if (!r.success) { X.toast(r.message, 'err'); repaintPay(); return; }
      P.data = r.data; repaintPay(); if (!quiet) X.toast('Payroll ' + X.periodeLabel(p) + ' dihitung (' + r.data.total.karyawan + ' karyawan).');
    });
  }
  V.payroll = { render: function (el) { P.p = P.p || X.periodeShift(X.periodeNow(), -1); P.el = el; P.data = null; el.innerHTML = payShell(); bindPay(); } };
  X.ACT['py-prev'] = function () { P.p = X.periodeShift(P.p, -1); P.data = null; repaintPay(); };
  X.ACT['py-next'] = function () { P.p = X.periodeShift(P.p, 1); P.data = null; repaintPay(); };
  X.ACT['py-calc'] = function () { calc(false); };
  X.ACT['py-save'] = function (b) {
    X.confirm({ title: 'Simpan sebagai DRAFT?', html: 'Hasil hitung <b>' + X.periodeLabel(P.p) + '</b> untuk ' + P.data.rows.length + ' karyawan akan disimpan. Jika angka berubah dari draft sebelumnya, PDF lama dibuang.', ok: 'Simpan Draft' }).then(function (ok) {
      if (!ok) return; b.disabled = true; b.innerHTML = '<span class="spin"></span>Menyimpan…';
      X.api('payroll.save', { periode: P.p, id_perusahaan: P.comp, id_cabang: P.cab }).then(function (r) { if (!r.success) { X.toast(r.message, 'err'); repaintPay(); return; } X.toast(r.message); X.invalidate('fhome'); calc(true); });
    });
  };
  /** Jalankan aksi server dalam potongan kecil dengan progress bar (aman dari batas 6 menit). */
  function batch(title, action, ids, size, extra, onItem) {
    var total = ids.length, done = 0, bad = 0, stop = '';
    var m = X.modal({ title: title, focus: false, body: '<div class="prog"><i id="pgb"></i></div><p class="help" style="margin-top:10px" id="pgt">Memulai…</p><div id="pgx"></div>', footer: '<button class="btn btn-p" id="pgok" disabled>Selesai</button>' });
    m.$('#pgok').onclick = function () { m.close(); };
    var upd = function () { var b = m.$('#pgb'), t = m.$('#pgt'); if (b) b.style.width = Math.round(done / total * 100) + '%'; if (t) t.textContent = done + ' dari ' + total + ' diproses' + (bad ? ' · ' + bad + ' gagal' : ''); };
    var chain = Promise.resolve();
    for (var i = 0; i < total; i += size) (function (part) {
      chain = chain.then(function () {
        if (stop) return; upd();
        return X.api(action, Object.assign({ periode: P.p, ids: part }, extra), { quiet: true }).then(function (r) {
          if (!r.success) { stop = r.message; return; } var res = onItem(r.data, part); done += res.ok; bad += res.bad; if (res.stop) stop = res.stop;
        });
      });
    })(ids.slice(i, i + size));
    return chain.then(function () {
      upd(); var t = m.$('#pgt'), ok = m.$('#pgok'); if (ok) ok.disabled = false;
      if (t) t.innerHTML = stop ? '<span class="errmsg">' + esc(stop) + '</span><br>' + done + ' dari ' + total + ' selesai.' : '<b style="color:var(--ok-x)">Selesai.</b> ' + done + ' dari ' + total + ' berhasil' + (bad ? ', ' + bad + ' gagal.' : '.');
      calc(true);
    });
  }
  X.ACT['py-pdf'] = function () {
    var rows = P.data.rows.filter(function (r) { return r.status !== 'BELUM'; }), todo = rows.filter(function (r) { return r.status === 'DRAFT'; });
    var run = function (list) { batch('Membuat Slip PDF', 'payroll.pdfBatch', list.map(function (r) { return r.id_payroll; }), 4, {}, function (d) { return { ok: d.berhasil, bad: d.gagal.length }; }); };
    if (todo.length) return run(todo);
    X.confirm({ title: 'Buat ulang semua PDF?', text: 'Semua slip sudah memiliki PDF. Buat ulang ' + rows.length + ' PDF?', ok: 'Buat ulang' }).then(function (ok) { if (ok) run(rows); });
  };
  X.ACT['py-send'] = function () {
    var todo = P.data.rows.filter(function (r) { return r.status === 'PDF_SIAP' || r.status === 'GAGAL'; });
    X.api('payroll.status', { periode: P.p, id_perusahaan: P.comp }, { quiet: true }).then(function (st) {
      var q = st.success ? st.data.quota : null;
      X.confirm({ title: 'Kirim slip via email?', html: todo.length + ' slip akan dikirim ke email masing-masing karyawan.' + (q !== null ? '<br>Sisa kuota email hari ini: <b>' + q + '</b>.' : '') + (q !== null && q < todo.length ? '<br><span style="color:var(--bad)">Kuota tidak cukup untuk semua — sisanya dapat dikirim besok.</span>' : ''), ok: 'Kirim Sekarang' }).then(function (ok) {
        if (!ok) return;
        batch('Mengirim Slip Gaji', 'payroll.send', todo.map(function (r) { return r.id_payroll; }), 10, {}, function (d, part) {
          var okc = 0, bad = 0, stop = ''; part.forEach(function (id) { var s = d.hasil[id]; if (s === 'TERKIRIM') okc++; else if (s === 'KUOTA') stop = 'Kuota email harian habis. Lanjutkan besok.'; else bad++; }); return { ok: okc, bad: bad, stop: stop };
        });
      });
    });
  };
  X.ACT['py-view'] = function (b) {
    var id = b.dataset.id, m = X.modal({ title: 'Slip Gaji', wide: true, body: '<div class="sk" style="height:60vh;border-radius:12px"></div>', footer: '<button class="btn btn-g" data-close>Tutup</button>' });
    X.api('payroll.pdfView', { id_payroll: id }, { quiet: true }).then(function (r) {
      if (!r.success) { m.$('.modal-b').innerHTML = '<p class="errmsg">' + esc(r.message) + '</p>'; return; }
      var bin = atob(r.data.base64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); var url = URL.createObjectURL(new Blob([u], { type: 'application/pdf' }));
      m.$('.modal-b').innerHTML = '<iframe class="pdfbox" src="' + url + '" title="Slip PDF"></iframe><p class="help" style="margin-top:8px">Jika pratinjau tidak tampil, gunakan tombol Unduh.</p>';
      m.$('.modal-f').insertAdjacentHTML('afterbegin', '<button class="btn btn-p" id="dlp">' + ico('download', 'sm') + 'Unduh PDF</button>'); m.$('#dlp').onclick = function () { X.saveB64(r.data.nama, r.data.base64); };
      m.onClose = function () { URL.revokeObjectURL(url); };
    });
  };

  /* ---------------------------------------------------------------- GRID MASTER GAJI / MASTER POTONGAN (edit massal tanpa buka kartu) */
  var G = (function () {
    var st = { gaji: { comp: '', d: null, dirty: {} }, pot: { comp: '', d: null, dirty: {} } };
    var BASE = { nik: 'NIK', jabatan: 'Jabatan', golongan_pajak: 'Gol. Pajak', gaji_pokok: 'Gaji Pokok' };
    var BASIS_SHORT = { PER_HADIR: 'rate per hari hadir', PER_TELAT: 'rate per hari telat', PER_MENIT_TELAT: 'rate per menit telat', PER_JAM_LEMBUR: 'rate per jam lembur', PER_KELUAR: 'rate per kali keluar', TANPA_TELAT: 'penuh bila tanpa telat' };
    function nDirty(k) { return Object.keys(st[k].dirty).length; }
    function key(k) { return 'grid:' + k + ':' + st[k].comp; }
    function head(k) {
      var s = st[k], isG = k === 'gaji', n = nDirty(k);
      return '<div class="toolbar" data-g="' + k + '">' + selectComp('gcomp_' + k, s.comp, true) + '<div class="search grow" style="min-width:180px"><span>' + ico('search', 'sm') + '</span><input class="inp" id="gq_' + k + '" placeholder="Cari nama / NIK / cabang…" aria-label="Cari"></div>' +
        (isG ? '<button class="btn btn-g" data-act="g-keluar" data-k="' + k + '">' + ico('clock', 'sm') + 'Input Kali Keluar</button>' : '') +
        (S.boot.me.role === 'MANAJEMEN' ? '<button class="btn btn-g" data-act="g-komp" data-k="' + k + '">' + ico('sliders', 'sm') + 'Kelola Komponen</button>' : '') +
        '<button class="btn btn-p" id="gsave_' + k + '" data-act="g-save" data-k="' + k + '" ' + (n ? '' : 'disabled') + '>' + ico('check', 'sm') + 'Simpan' + (n ? ' (' + n + ')' : '') + '</button></div>' +
        '<p class="help" style="margin-bottom:10px">' + (isG ? 'Ubah nominal langsung di tabel, lalu tekan Simpan. Gaji pokok menjadi dasar upah lembur (÷ 173 × pengali). Rate Lembur/Jam: angka abu-abu miring = otomatis (bulanan: gaji pokok ÷ 173; harian: tarif harian ÷ jam kerja sehari; × pengali). Ketik angka lain bila lembur dibayar flat per jam (mis. 10.000); kosongkan untuk kembali ke otomatis. Anak magang: pilih Tipe <b>Harian</b> lalu isi Tarif Harian — gaji = tarif × jumlah hari hadir (lembur dihitung dari tarif × 26 hari). Komponen berlabel kecil (mis. <i>per hari hadir</i>) diisi tarif per satuan — total dihitung otomatis dari absensi saat payroll.' : 'Potongan rutin per karyawan (mis. cicilan, BPJS, simpanan). Nilai 0 = tidak ada potongan. Komponen berbasis absen (mis. denda telat per menit) diisi tarif per satuannya; totalnya dihitung otomatis dari data absensi.') + '</p>';
    }
    /* Rate lembur/jam: tampil otomatis (gaji pokok ÷ 173 × pengali) bila belum diisi manual; bisa ditimpa. */
    function eff(s, r, f) { var d = s.dirty[r.id_karyawan]; return d && d[f] !== undefined ? d[f] : r[f]; }
    function autoRate(s, r) { var harian = eff(s, r, 'tipe_gaji') === 'HARIAN'; if (harian) return Math.round((Number(eff(s, r, 'tarif_harian')) || 0) / (r.jam_kerja_jam || 8) * (r.lembur_pengali || 1)); return Math.round((Number(eff(s, r, 'gaji_pokok')) || 0) / 173 * (r.lembur_pengali || 1)); }
    function lemburCell(r) {
      var s = st.gaji, dv = s.dirty[r.id_karyawan] && s.dirty[r.id_karyawan].tarif_lembur_jam, manual = dv !== undefined ? Number(dv) : Number(r.tarif_lembur_jam) || 0, auto = autoRate(s, r), isAuto = !manual;
      return '<td class="num"><input class="inp gi' + (dv !== undefined ? ' dirty' : '') + (isAuto ? ' auto' : '') + '" style="min-height:34px;padding:5px 8px;width:110px;text-align:right;font-family:var(--mono)' + (isAuto ? ';font-style:italic;color:var(--muted)' : '') + '" type="number" min="0" step="500" inputmode="numeric" data-rp="1" data-i="' + esc(r.id_karyawan) + '" data-f="tarif_lembur_jam" data-lauto="' + (isAuto ? 1 : 0) + '" value="' + (manual || auto || '') + '" placeholder="' + (auto || 0) + '" aria-label="Rate lembur per jam" title="' + (isAuto ? 'Otomatis dari gaji pokok. Ketik angka lain untuk mengisi manual (flat).' : 'Manual (flat). Kosongkan untuk kembali ke otomatis.') + '"></td>';
    }
    function tbl(k) {
      var s = st[k], d = s.d, isG = k === 'gaji'; if (!d) return X.skel(6, 48);
      if (!d.komponen.length && !isG) return '<div class="card flat">' + X.empty('sliders', 'Belum ada komponen potongan', 'Manajemen dapat menambahkannya lewat tombol Kelola Komponen.') + '</div>';
      var cell = function (r, f, v, num, w) { var dv = s.dirty[r.id_karyawan] && s.dirty[r.id_karyawan][f] !== undefined ? s.dirty[r.id_karyawan][f] : v; return '<td' + (num ? ' class="num"' : '') + '><input class="inp gi' + (s.dirty[r.id_karyawan] && s.dirty[r.id_karyawan][f] !== undefined ? ' dirty' : '') + '" style="min-height:34px;padding:5px 8px;width:' + w + 'px' + (num ? ';text-align:right;font-family:var(--mono)' : '') + '" ' + (num ? 'type="number" min="0" step="1000" inputmode="numeric" data-rp="1"' : 'type="text" maxlength="60"') + ' data-i="' + esc(r.id_karyawan) + '" data-f="' + esc(f) + '" value="' + esc(dv === 0 ? '' : dv) + '" placeholder="' + (num ? '0' : '') + '" aria-label="' + esc(f) + '"></td>'; };
      var tipeCell = function (r) { var dv = s.dirty[r.id_karyawan] && s.dirty[r.id_karyawan].tipe_gaji !== undefined ? s.dirty[r.id_karyawan].tipe_gaji : r.tipe_gaji; return '<td><select class="sel gi' + (s.dirty[r.id_karyawan] && s.dirty[r.id_karyawan].tipe_gaji !== undefined ? ' dirty' : '') + '" style="min-height:34px;padding:4px 8px;width:112px" data-i="' + esc(r.id_karyawan) + '" data-f="tipe_gaji" aria-label="Tipe gaji"><option value="BULANAN"' + (dv !== 'HARIAN' ? ' selected' : '') + '>Bulanan</option><option value="HARIAN"' + (dv === 'HARIAN' ? ' selected' : '') + '>Harian (magang)</option></select></td>'; };
      var th = '<th>No</th>' + (isG ? '' : '') + '<th>NIK</th><th>Cabang</th><th>Nama Karyawan</th>' + (isG ? '<th>Jabatan</th><th>Gol. Pajak</th><th class="num">Gaji Pokok (bulanan)</th><th>Tipe Gaji</th><th class="num">Tarif Harian</th><th class="num">Rate Lembur / Jam<div class="help" style="font-weight:500">abu-abu = otomatis, bisa diedit</div></th>' : '') + d.komponen.map(function (c) { return '<th class="num">' + esc(c.nama) + (isG ? '' : ' (Rp)') + (c.basis && c.basis !== 'TETAP' ? '<div class="help" style="font-weight:500">' + esc(BASIS_SHORT[c.basis] || c.basis_label || '') + '</div>' : '') + '</th>'; }).join('');
      var body = d.rows.map(function (r, i) {
        return '<tr data-q="' + esc((r.nama + ' ' + r.nik + ' ' + r.cabang).toLowerCase()) + '"><td class="muted">' + (i + 1) + '</td>' + (isG ? cell(r, 'nik', r.nik, false, 110) : '<td class="mono">' + esc(r.nik || '-') + '</td>') + '<td>' + esc(r.cabang) + '</td><td><b>' + esc(r.nama) + '</b></td>' +
          (isG ? cell(r, 'jabatan', r.jabatan, false, 130) + cell(r, 'golongan_pajak', r.golongan_pajak, false, 72) + cell(r, 'gaji_pokok', r.gaji_pokok, true, 120) + tipeCell(r) + cell(r, 'tarif_harian', r.tarif_harian, true, 110) + lemburCell(r) : '') +
          d.komponen.map(function (c) { return cell(r, 'k:' + c.id, r.komp[c.id] || 0, true, 110); }).join('') + '</tr>';
      }).join('');
      return '<div class="card flat" style="padding:0;overflow:hidden"><div style="overflow:auto;max-height:68vh"><table class="t gt" style="min-width:' + (isG ? 1260 : 640) + 'px"><thead><tr>' + th + '</tr></thead><tbody>' + (body || '<tr><td colspan="9" class="muted" style="text-align:center;padding:24px">Tidak ada karyawan.</td></tr>') + '</tbody></table></div></div>';
    }
    function paint(box, k) {
      var q = $('#gq_' + k, box), keep = q ? q.value : '';
      box.innerHTML = head(k) + '<div id="gt_' + k + '">' + tbl(k) + '</div>'; bind(box, k);
      var nq = $('#gq_' + k, box); if (nq && keep) { nq.value = keep; filter(box, k); }
    }
    function filter(box, k) { var q = ($('#gq_' + k, box).value || '').toLowerCase().trim(); X.$$('#gt_' + k + ' tbody tr', box).forEach(function (tr) { tr.style.display = !q || (tr.dataset.q || '').indexOf(q) >= 0 ? '' : 'none'; }); }
    function bind(box, k) {
      var s = st[k], c = $('#gcomp_' + k, box); if (c) c.onchange = function () { s.comp = c.value; s.d = null; s.dirty = {}; load(box, k); };
      var q = $('#gq_' + k, box); if (q) q.oninput = X.debounce(function () { filter(box, k); }, 120);
      var t = $('#gt_' + k, box); if (!t) return;
      t.oninput = function (e) {
        var el = e.target; if (!el.classList || !el.classList.contains('gi')) return;
        var id = el.dataset.i, f = el.dataset.f, row = s.d.rows.filter(function (r) { return r.id_karyawan === id; })[0], orig = f.indexOf('k:') === 0 ? (row.komp[f.slice(2)] || 0) : row[f], v = el.type === 'number' ? (el.value === '' ? 0 : Number(el.value)) : el.value;
        if (el.type === 'number' && (v < 0 || isNaN(v))) { el.classList.add('err'); return; } el.classList.remove('err');
        if (f === 'tarif_lembur_jam') {
          var au = autoRate(s, row), origM = Number(row.tarif_lembur_jam) || 0, tobe = (v === 0 || v === au) ? 0 : v;       // kosong / sama dengan otomatis = tetap otomatis
          if (tobe === origM) { if (s.dirty[id]) { delete s.dirty[id][f]; if (!Object.keys(s.dirty[id]).length) delete s.dirty[id]; } el.classList.remove('dirty'); } else { (s.dirty[id] = s.dirty[id] || {})[f] = tobe; el.classList.add('dirty'); }
          el.dataset.lauto = tobe ? 0 : 1; el.classList.toggle('auto', !tobe); el.style.fontStyle = tobe ? '' : 'italic'; el.style.color = tobe ? '' : 'var(--muted)';
          var b0 = $('#gsave_' + k, box), n0 = nDirty(k); if (b0) { b0.disabled = !n0; b0.lastChild.nodeValue = 'Simpan' + (n0 ? ' (' + n0 + ')' : ''); }
          return;
        }
        if (String(v) === String(orig === undefined ? '' : orig) || (v === 0 && !orig)) { if (s.dirty[id]) { delete s.dirty[id][f]; if (!Object.keys(s.dirty[id]).length) delete s.dirty[id]; } el.classList.remove('dirty'); }
        else { (s.dirty[id] = s.dirty[id] || {})[f] = v; el.classList.add('dirty'); }
        var b = $('#gsave_' + k, box), n = nDirty(k); if (b) { b.disabled = !n; b.lastChild.nodeValue = 'Simpan' + (n ? ' (' + n + ')' : ''); }
        if (k === 'gaji' && (f === 'gaji_pokok' || f === 'tarif_harian' || f === 'tipe_gaji')) {                      // rate otomatis ikut berubah
          var lc = t.querySelector('input[data-f="tarif_lembur_jam"][data-i="' + id + '"]');
          if (lc) { var au2 = autoRate(s, row); lc.placeholder = au2 || 0; if (lc.dataset.lauto === '1') lc.value = au2 || ''; }
        }
      };
    }
    function load(box, k) {
      var s = st[k], route = k === 'gaji' ? 'gaji.list' : 'pot.list', cc = s.comp; paint(box, k);
      X.swr(key(k), route, { id_perusahaan: cc }, function (d) { if (s.comp === cc && box.isConnected && !nDirty(k)) { s.d = d; paint(box, k); } }, { ttl: 20000 });
    }
    function mount(box, k) { st[k].box = box; load(box, k); }
    function save(k) {
      var s = st[k], box = s.box, items = Object.keys(s.dirty).map(function (id) {
        var o = { id_karyawan: id, komp: {} }, ch = s.dirty[id];
        Object.keys(ch).forEach(function (f) { if (f.indexOf('k:') === 0) o.komp[f.slice(2)] = ch[f]; else o[f] = ch[f]; });
        return o;
      });
      if (!items.length) return;
      var b = $('#gsave_' + k, box); b.disabled = true; b.innerHTML = '<span class="spin"></span>Menyimpan…';
      X.api(k === 'gaji' ? 'gaji.save' : 'pot.save', { items: items }).then(function (res) {
        if (!res.success) { X.toast(res.message, 'err'); b.disabled = false; b.innerHTML = ico('check', 'sm') + 'Simpan (' + items.length + ')'; return; }
        X.toast(res.message); s.dirty = {}; X.invalidate('grid:'); X.invalidate('master:'); X.invalidate('fhome'); X.invalidate('pay');
        X.api(k === 'gaji' ? 'gaji.list' : 'pot.list', { id_perusahaan: s.comp }, { quiet: true }).then(function (r) { if (r.success) { s.d = r.data; if (box.isConnected) paint(box, k); } });
      });
    }
    /* Jumlah kali keluar per bulan (komponen berbasis "per kali keluar", mis. Transport) */
    function keluarModal(k) {
      var s = st[k], K = { p: X.periodeNow(), d: null, dirty: {} };
      var m = X.modal({ title: 'Input Kali Keluar', wide: true, body: '<div id="klbox">' + X.skel(4, 44) + '</div>', footer: '<button class="btn btn-g" data-close>Tutup</button><button class="btn btn-p" id="klsave" disabled>Simpan</button>' });
      function nd() { return Object.keys(K.dirty).length; }
      function paintK() {
        var box = m.$('#klbox'); if (!box) return; var d = K.d;
        var bar = '<div class="toolbar"><button class="ibtn" data-kl="prev" aria-label="Bulan sebelumnya">' + ico('chevL') + '</button><b style="min-width:120px;text-align:center">' + esc(X.periodeLabel(K.p)) + '</b><button class="ibtn" data-kl="next" aria-label="Bulan berikutnya">' + ico('chevR') + '</button></div>';
        if (!d) { box.innerHTML = bar + X.skel(4, 44); bindK(); return; }
        if (!d.komponen.length) { box.innerHTML = bar + '<div class="card flat">' + X.empty('sliders', 'Belum ada komponen "per kali keluar"', 'Buat komponen (mis. Transport) lewat Kelola Komponen, pilih cara hitung <b>Dihitung per kali keluar</b>, lalu isi tarif per kali di Master Gaji.') + '</div>'; bindK(); return; }
        var head = '<th>Nama</th><th>Cabang</th>' + d.komponen.map(function (c) { return '<th class="num">' + esc(c.nama) + '<div class="help" style="font-weight:500">jumlah kali keluar</div></th><th class="num">Total (Rp)</th>'; }).join('');
        var body = d.rows.map(function (r) {
          return '<tr><td>' + esc(r.nama) + '</td><td>' + esc(r.cabang) + '</td>' + d.komponen.map(function (c) {
            var o = r.k[c.id], key = r.id_karyawan + '|' + c.id, v = K.dirty[key] !== undefined ? K.dirty[key] : o.jumlah, tot = Math.round((Number(v) || 0) * o.rate);
            return '<td class="num"><input class="inp gi' + (K.dirty[key] !== undefined ? ' dirty' : '') + '" type="number" min="0" max="1000" step="1" inputmode="decimal" style="min-height:34px;padding:5px 8px;width:80px;text-align:right" data-kl-i="' + esc(r.id_karyawan) + '" data-kl-c="' + esc(c.id) + '" value="' + esc(v === 0 ? '' : v) + '" placeholder="0"></td><td class="num mono" data-kl-t="' + esc(key) + '">' + (o.rate ? X.rp(tot) : '<span class="help">tarif belum diisi</span>') + '</td>';
          }).join('') + '</tr>';
        }).join('');
        box.innerHTML = bar + '<p class="help" style="margin-bottom:10px">Isi jumlah kali keluar tiap karyawan untuk bulan ini. Total = jumlah × tarif per kali (diisi di tabel Master Gaji). Kosong/0 = tidak ada.</p><div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + (body || '<tr><td colspan="9" class="help">Tidak ada karyawan.</td></tr>') + '</tbody></table></div>';
        bindK();
      }
      function bindK() {
        var sv = m.$('#klsave'); if (sv) { sv.disabled = !nd(); sv.textContent = 'Simpan' + (nd() ? ' (' + nd() + ')' : ''); }
        X.$$('[data-kl]', m.el).forEach(function (b) { b.onclick = function () { if (nd() && !window.confirm('Ada isian belum disimpan. Pindah bulan dan buang perubahan?')) return; K.p = X.periodeShift(K.p, b.dataset.kl === 'prev' ? -1 : 1); K.dirty = {}; load(); }; });
        X.$$('[data-kl-i]', m.el).forEach(function (inp) {
          inp.oninput = function () {
            var id = inp.dataset.klI, c = inp.dataset.klC, key = id + '|' + c, r = K.d.rows.filter(function (x) { return x.id_karyawan === id; })[0], o = r.k[c];
            var v = inp.value === '' ? 0 : Number(inp.value); if (isNaN(v) || v < 0) v = 0;
            if (v === o.jumlah) delete K.dirty[key]; else K.dirty[key] = v;
            inp.classList.toggle('dirty', K.dirty[key] !== undefined);
            var t = m.$('[data-kl-t="' + key + '"]'); if (t && o.rate) t.textContent = X.rp(Math.round(v * o.rate));
            var sv2 = m.$('#klsave'); if (sv2) { sv2.disabled = !nd(); sv2.textContent = 'Simpan' + (nd() ? ' (' + nd() + ')' : ''); }
          };
        });
      }
      function load() {
        K.d = null; paintK();
        X.api('keluar.list', { periode: K.p, id_perusahaan: s.comp }, { quiet: true }).then(function (r) { if (!m.el.isConnected) return; if (!r.success) { X.toast(r.message, 'err'); return; } K.d = r.data; paintK(); });
      }
      m.$('#klsave').onclick = function () {
        var btn = m.$('#klsave'), items = Object.keys(K.dirty).map(function (key) { var a = key.split('|'); return { id_karyawan: a[0], id_komponen: a[1], jumlah: K.dirty[key] }; }); if (!items.length) return;
        btn.disabled = true;
        X.api('keluar.save', { periode: K.p, items: items }).then(function (res) {
          btn.disabled = false; if (!res.success) return X.toast(res.message, 'err');
          X.toast(res.message); K.dirty = {}; X.invalidate('pay'); load();
        });
      };
      load();
    }
    function kompModal(k) {
      var m = X.modal({ title: 'Kelola Komponen', body: '<div id="kmbox">' + X.skel(3, 44) + '</div>', footer: '<button class="btn btn-g" data-close>Tutup</button>' });
      var basisOpts = [{ v: 'TETAP', l: 'Tetap per bulan' }];
      var draw = function (list) {
        var box = m.$('#kmbox'); if (!box) return;
        box.innerHTML = '<p class="help" style="margin-bottom:10px">Komponen berlaku untuk semua perusahaan dan otomatis menjadi kolom di Master Gaji / Master Potongan serta baris di slip gaji.</p>' +
          (list.length ? list.map(function (c) { return '<div class="sline" style="gap:8px;flex-wrap:wrap"><span><b>' + esc(c.nama) + '</b> <span class="badge ' + (c.jenis === 'PENDAPATAN' ? 'b-ok' : 'b-warn') + '">' + (c.jenis === 'PENDAPATAN' ? 'Pendapatan' : 'Potongan') + '</span>' + (bool(c.status_aktif) ? '' : ' <span class="badge b-n">Nonaktif</span>') + '</span><span style="display:flex;gap:6px;align-items:center"><select class="sel" style="min-height:34px;padding:4px 8px;width:auto" data-kb="' + esc(c.id_komponen) + '" aria-label="Dasar hitung ' + esc(c.nama) + '">' + basisOpts.map(function (o) { return '<option value="' + o.v + '"' + (o.v === c.basis ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select><button class="btn btn-g btn-s" data-km="' + esc(c.id_komponen) + '">' + (bool(c.status_aktif) ? 'Nonaktifkan' : 'Aktifkan') + '</button></span></div>'; }).join('') : '<div class="muted">Belum ada komponen.</div>') +
          '<div class="lbl" style="margin:16px 0 6px">TAMBAH KOMPONEN BARU</div><div class="row2">' + X.field({ name: 'knama', label: 'Nama komponen', placeholder: 'mis. Uang Makan', attrs: 'maxlength="40"' }) + X.field({ name: 'kjenis', label: 'Jenis', type: 'select', value: k === 'pot' ? 'POTONGAN' : 'PENDAPATAN', options: [{ v: 'PENDAPATAN', l: 'Pendapatan' }, { v: 'POTONGAN', l: 'Potongan' }] }) + '</div>' +
          X.field({ name: 'kcara', label: 'Cara hitung', type: 'select', value: 'TETAP', options: [{ v: 'TETAP', l: 'Tetap (nominal sama tiap bulan)' }, { v: 'HITUNG', l: 'Dihitung dari absensi' }] }) +
          '<div id="kbwrap" style="display:none">' + X.field({ name: 'kbasis', label: 'Dihitung per', type: 'select', value: 'PER_HADIR', options: basisOpts.filter(function (o) { return o.v !== 'TETAP'; }), help: 'Nominal per karyawan diisi di tabel sebagai RATE per satuan. Contoh: Tunjangan Kehadiran dihitung per hari hadir, rate Rp 25.000 → hadir 22 hari = Rp 550.000.' }) + '</div>' + '<button class="btn btn-p" id="kadd">' + ico('plus', 'sm') + 'Tambah</button>';
        var done = function (res) { if (!res.success) return X.toast(res.message, 'err'); X.toast(res.message); X.invalidate('grid:'); X.invalidate('komp'); refresh(); };
        m.$('#kadd').onclick = function () { var nama = m.$('[name=knama]').value.trim(); if (!nama) return X.toast('Nama komponen wajib diisi.', 'warn'); X.api('komp.save', { nama: nama, jenis: m.$('[name=kjenis]').value, basis: m.$('[name=kcara]').value === 'HITUNG' ? m.$('[name=kbasis]').value : 'TETAP' }).then(done); };
        m.$('[name=kcara]').onchange = function () { m.$('#kbwrap').style.display = this.value === 'HITUNG' ? '' : 'none'; };
        X.$$('[data-kb]', box).forEach(function (sel) { sel.onchange = function () { var c = list.filter(function (x) { return x.id_komponen === sel.dataset.kb; })[0]; X.api('komp.save', { id_komponen: c.id_komponen, nama: c.nama, jenis: c.jenis, basis: sel.value }).then(done); }; });
        X.$$('[data-km]', box).forEach(function (bt) { bt.onclick = function () { var c = list.filter(function (x) { return x.id_komponen === bt.dataset.km; })[0]; X.api('komp.save', { id_komponen: c.id_komponen, nama: c.nama, jenis: c.jenis, aktif: !bool(c.status_aktif) }).then(done); }; });
      };
      var refresh = function () { X.api('komp.list', {}, { quiet: true }).then(function (r) { if (r.success) { basisOpts = r.data.basis; draw(r.data.list); ['gaji', 'pot'].forEach(function (kk) { var s = st[kk]; if (s.box && s.box.isConnected && !nDirty(kk)) { s.d = null; load(s.box, kk); } }); } }); };
      m.onClose = function () { ['gaji', 'pot'].forEach(function (kk) { var s = st[kk]; if (s.box && s.box.isConnected && !nDirty(kk)) load(s.box, kk); }); };
      refresh();
    }
    function bool(v) { return v === true || v === 'true' || v === 'TRUE'; }
    X.ACT['g-save'] = function (b) { save(b.dataset.k); };
    X.ACT['g-komp'] = function (b) { kompModal(b.dataset.k); };
    X.ACT['g-keluar'] = function (b) { keluarModal(b.dataset.k); };
    return { mount: mount };
  })();
  V.gaji = { render: function (el) { el.innerHTML = '<div class="page"><div id="gridbox"></div></div>'; G.mount($('#gridbox', el), 'gaji'); } };
})();
