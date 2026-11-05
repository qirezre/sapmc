/* ==========================================================================
   ScriptsPegawai.html — Absen selfie, Riwayat, Slip Gaji, Profil
   Absen masuk/pulang bersifat OPTIMISTIC: UI berubah 0 ms, server mengonfirmasi di latar.
   ========================================================================== */
(function () {
  'use strict';
  var X = SAP, S = X.S, $ = X.$, esc = X.esc, ico = X.ico, rp = X.rp, V = X.views;
  (V.__prefetch = V.__prefetch || []).push(function (role, p) {
    X.swr('hist:' + p, 'absen.history', { periode: p }, function () {}, { ttl: 60000, anyNav: true });
    X.swr('slip', 'slip.list', {}, function () {}, { ttl: 120000, anyNav: true });
  });

  /* ---------------------------------------------------------------- ABSEN */
  var A = { shiftId: '', shiftDate: '', busy: false, mount: null, izin: null };
  function sched() { return S.boot.schedule; }
  function sc0() { return S.boot.schedule || {}; }
  function jd() { var j = sched().jadwal, n = X.nowIn(S.tz); return j && j.tanggal === n.date ? j : {}; }   // jadwal shift hari ini (bila sudah diatur HR)
  function curShift() {
    var sc = sched(), list = sc.pakaiShift ? sc.shifts : [sc.reguler], rec = activeRec();
    var id = rec && rec.id_shift ? rec.id_shift : (sc.pakaiShift ? (jd().id_shift || A.shiftId) : 'REGULER');   // bershift: ikut jadwal HR; bila belum dijadwalkan, pilih sendiri
    return list.filter(function (s) { return s.id_shift === id; })[0] || (sc.pakaiShift ? null : list[0]);
  }
  function activeRec() {
    var r = S.boot.today; if (!r) return null; var n = X.nowIn(S.tz);
    if (r.waktu_pulang && r.tanggal < n.date) return null;                      // sudah selesai & hari berganti
    if (!r.waktu_pulang && r.tanggal < n.date && !r.lintas) return null;       // lupa pulang kemarin (non-lintas) -> hari baru
    return r;
  }
  function lateInfo(sh, n) {
    var sc = sched(), st = X.hmMin(sh.jam_masuk), now = n.min;
    if (sh.lintas && now < X.hmMin(sh.jam_pulang) && now < st) now += 1440;
    var raw = now - st, tol = sc.toleransi || 0, counted = raw > tol ? (S.boot.app.telatMode === 'SETELAH_TOLERANSI' ? raw - tol : raw) : 0;
    return { raw: raw, counted: counted, tol: tol };
  }
  function banner(rec, sh, n) {
    var ic = function (c, i) { return '<span style="flex:none">' + ico(i, 'lg') + '</span>'; };
    if (rec && rec.waktu_pulang) return '<div class="banner ok">' + ic('', 'check') + '<div><b>Absensi hari ini selesai</b>Terima kasih, sampai jumpa besok.</div></div>';
    if (rec) {
      if (rec.menit_terlambat > 0) return '<div class="banner warn">' + ic('', 'alert') + '<div><b>Terlambat ' + rec.menit_terlambat + ' menit</b>Keterlambatan dicatat pada rekap kehadiran Anda.</div></div>';
      return '<div class="banner ok">' + ic('', 'check') + '<div><b>Tepat waktu</b>Absen masuk Anda tercatat tanpa keterlambatan.</div></div>';
    }
    if (!sh) return '<div class="banner info">' + ic('', 'info') + '<div><b>Pilih shift dulu</b>Pilih shift kerja Anda hari ini sebelum absen masuk.</div></div>';
    var li = lateInfo(sh, n), dur = X.hmMin(sh.jam_pulang) - X.hmMin(sh.jam_masuk); if (dur <= 0) dur += 1440;
    if (li.raw > dur) return '<div class="banner info">' + ic('', 'info') + '<div><b>Di luar jam kerja</b>Jadwal ' + esc(sh.jam_masuk) + '–' + esc(sh.jam_pulang) + '. Pilih shift yang sesuai bila Anda bekerja sekarang.</div></div>';
    if (li.raw <= 0) { var la = sc0().lemburAwal, awal = -li.raw, extra = la && la.aktif && awal > la.batas ? '<br><b>Masuk sekarang dihitung lembur ' + awal + ' menit</b> (menunggu persetujuan HR).' : ''; return '<div class="banner info">' + ic('', 'info') + '<div><b>Belum jam masuk</b>Jam masuk ' + esc(sh.jam_masuk) + '. Absen sebelum waktu tersebut agar tepat waktu.' + extra + '</div></div>'; }
    if (!li.counted) return '<div class="banner warn">' + ic('', 'clock') + '<div><b>Dalam toleransi (' + li.raw + ' mnt)</b>Toleransi ' + li.tol + ' menit. Segera absen.</div></div>';
    return '<div class="banner bad">' + ic('', 'alert') + '<div><b>Terlambat ' + li.counted + ' menit</b>Keterlambatan akan dicatat bila absen sekarang.</div></div>';
  }
  function absenHtml() {
    var me = S.boot.me, sc = sched(), sh = curShift(), n = X.nowIn(S.tz), rec = activeRec();
    var jj = jd(), lib = sc.pakaiShift && !rec && !!jj.libur, terjadwal = sc.pakaiShift && !rec && !!jj.id_shift && !!sh;
    var shiftUi = terjadwal ? '<div class="sline"><span class="muted">Shift hari ini (sesuai jadwal)</span><b>' + esc(sh.nama) + '</b></div>' : sc.pakaiShift ? '<div class="field" style="margin:0 0 12px"><label for="shsel">Pilih Shift Hari Ini</label><select class="sel" id="shsel" ' + (rec ? 'disabled' : '') + '>' + (sh ? '' : '<option value="" selected>— Pilih shift dulu —</option>') + sc.shifts.map(function (s) { return '<option value="' + esc(s.id_shift) + '"' + (sh && s.id_shift === sh.id_shift ? ' selected' : '') + '>' + esc(s.nama) + ' · ' + esc(s.jam_masuk) + '–' + esc(s.jam_pulang) + '</option>'; }).join('') + '</select></div>' : '';
    var rule = '<div class="sline"><span class="muted">Jam kerja</span><b class="mono">' + (sh ? esc(sh.jam_masuk) + ' – ' + esc(sh.jam_pulang) + (sh.lintas ? ' (+1)' : '') : '-') + '</b></div><div class="sline"><span class="muted">Toleransi</span><b class="mono">' + sc.toleransi + ' menit</b></div>';
    var pend = rec && rec.pending ? ' <span class="pending-dot" title="Menyimpan…"></span>' : '';
    var btn, iz = A.izin && A.izin.tanggal === n.date && !rec ? A.izin : null, izBox = '';
    if (iz) izBox = '<div class="banner ' + (iz.status === 'DISETUJUI' ? 'info' : 'warn') + '">' + ico('info') + '<div><b>' + (iz.jenis === 'SAKIT' ? 'Sakit' : 'Izin') + ' hari ini · ' + (iz.status === 'DISETUJUI' ? 'disetujui' + (iz.dihitung ? ' (dihitung hadir)' : ' (tidak dihitung)') : 'menunggu persetujuan HR') + '</b>Anda tidak perlu absen.' + (iz.status === 'MENUNGGU' ? ' <a href="#" data-act="izin-batal" data-id="' + esc(iz.id) + '" style="color:var(--primary);font-weight:600">Batalkan pengajuan</a>' : '') + '</div></div>';
    var izBtn = !rec && !iz && !lib ? '<button class="btn btn-g btn-block" data-act="izin-form">' + ico('edit') + 'Tidak hadir? Ajukan Izin / Sakit</button>' : '';
    if (lib && !iz) btn = '<button class="btn btn-g btn-xl btn-block" disabled>' + ico('calendar') + 'Libur hari ini</button>';
    else if (iz) btn = '<button class="btn btn-g btn-xl btn-block" disabled>' + ico('check') + (iz.jenis === 'SAKIT' ? 'Sakit' : 'Izin') + ' hari ini</button>';
    else if (!rec) btn = '<button class="btn btn-p btn-xl btn-block hero-btn" data-act="punch" data-kind="IN">' + ico('camera') + 'ABSEN MASUK (SELFIE)</button>';
    else if (!rec.waktu_pulang) btn = '<button class="btn btn-xl btn-block hero-btn" style="background:var(--dark);color:#fff" data-act="punch" data-kind="OUT" ' + (rec.pending ? 'disabled' : '') + '>' + ico('camera') + 'ABSEN PULANG (SELFIE)</button>';
    else btn = '<button class="btn btn-g btn-xl btn-block" disabled>' + ico('check') + 'Absensi Selesai</button>';
    return '<div class="page narrow" style="display:flex;flex-direction:column;gap:14px">' + obBanner() +
      '<div class="card"><div class="prof"><span class="av lg">' + esc(X.initials(me.nama)) + '</span><div style="min-width:0"><h2 style="font-size:18px;overflow:hidden;text-overflow:ellipsis">' + esc(me.nama) + '</h2><div class="mono muted" style="font-size:12px">' + esc(me.id) + '</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><span class="badge b-co">' + esc(sc.perusahaan) + '</span><span class="badge b-n">' + ico('pin', 'sm') + esc(sc.cabang) + '</span></div></div></div></div>' +
      '<div class="card clock"><div style="display:flex;justify-content:space-between;align-items:center"><span class="sm">Waktu Server</span><span class="pill-w">' + ico('clock', 'sm') + esc(sc.zona) + '</span></div><div class="big" data-clock="time">' + n.time + '</div><div class="sm" data-clock="date">' + X.dateLabel(n.date, true) + '</div></div>' +
      (iz ? izBox : lib ? '<div class="banner info">' + ico('info') + '<div><b>Jadwal Anda hari ini: Libur</b>Tidak perlu absen. Hubungi HR/atasan bila jadwal ini keliru.</div></div>' : '<div class="card">' + shiftUi + rule + '</div>' + '<div id="bnr">' + banner(rec, sh, n) + '</div>') +
      '<div class="grid g2 keep"><div class="card punch"><span class="lbl">MASUK' + pend + '</span><span class="v">' + (rec ? X.hm(rec.waktu_masuk) : '--:--') + '</span><span class="help">' + (rec ? (rec.menit_terlambat ? 'Terlambat ' + rec.menit_terlambat + ' mnt' : 'Tepat waktu') : 'Belum absen') + '</span></div>' +
      '<div class="card punch"><span class="lbl">PULANG</span><span class="v">' + (rec && rec.waktu_pulang ? X.hm(rec.waktu_pulang) : '--:--') + '</span><span class="help">' + (rec && rec.menit_lembur ? 'Lembur ' + rec.menit_lembur + ' mnt' + (rec.status_lembur === 'PENDING' ? ' · menunggu persetujuan' : rec.status_lembur === 'DITOLAK' ? ' · tidak dihitung' : '') : rec && rec.waktu_pulang ? 'Selesai' : 'Belum absen') + '</span></div></div>' +
      btn + izBtn + (jj.minggu && jj.minggu.length ? '<div class="card"><div class="muted" style="font-size:12px;margin-bottom:6px">Jadwal shift 7 hari ke depan</div>' + jj.minggu.map(function (m) { return '<div class="sline"><span class="muted">' + esc(X.dateLabel(m.t)) + '</span><b>' + esc(m.s) + '</b></div>'; }).join('') + '</div>' : '') + '<p class="help tc" style="display:flex;gap:6px;justify-content:center;align-items:center">' + ico('bell', 'sm') + (S.boot.app.wa ? 'Pengingat absensi dikirim via WhatsApp ke nomor Anda.' : 'Pastikan absen tepat waktu setiap hari.') + '</p></div>';
  }
  V.absen = {
    render: function (el) {
      A.mount = el; var td = X.nowIn(S.tz).date; if (A.shiftDate !== td) { A.shiftDate = td; A.shiftId = ''; } el.innerHTML = absenHtml(); bindAbsen(el); X.flushOutbox();
      X.api('absen.state', {}, { quiet: true, dedupe: true }).then(function (r) {                  // sinkron di latar
        if (!r.success || A.busy || S.route !== 'absen') return;
        var izChg = JSON.stringify(r.data.izin) !== JSON.stringify(A.izin); A.izin = r.data.izin || null;
        if (izChg) { el.innerHTML = absenHtml(); bindAbsen(el); }
        if (JSON.stringify(r.data.today) !== JSON.stringify(S.boot.today)) { S.boot.today = r.data.today; X.LS.set('boot', S.boot); el.innerHTML = absenHtml(); bindAbsen(el); }
      });
    },
    onBoot: function () { if (!A.busy && S.route === 'absen') { A.mount.innerHTML = absenHtml(); bindAbsen(A.mount); } },
    tick: function (n) { var b = $('#bnr'); if (b && !A.izin && !activeRec() && curShift()) b.innerHTML = banner(null, curShift(), n); }
  };
  function bindAbsen(el) { var s = $('#shsel', el); if (s) s.onchange = function () { A.shiftId = s.value; el.innerHTML = absenHtml(); bindAbsen(el); }; }

  var ALASAN = '';
  var LST = { PENDING: ['Menunggu persetujuan', 'b-warn'], DISETUJUI: ['Disetujui', 'b-ok'], DITOLAK: ['Ditolak', 'b-bad'] };
  /** menit lembur bila pulang sekarang (perkiraan sisi klien; server tetap menghitung ulang) */
  function lemburSekarang(rec) {
    if (!rec) return 0; var n = X.nowIn(S.tz), nowAbs = Date.parse(n.date + 'T00:00:00Z') / 60000 + n.min;
    var dur = X.hmMin(rec.jadwal_pulang) - X.hmMin(rec.jadwal_masuk); if (dur <= 0) dur += 1440;
    var gr = sched().lemburMulai; gr = gr === undefined || gr === null ? 30 : gr;
    var raw = Math.floor(nowAbs - (Date.parse(rec.tanggal + 'T00:00:00Z') / 60000 + X.hmMin(rec.jadwal_masuk) + dur));
    return raw > gr ? raw : 0;   // sampai batas = tidak dihitung; lebih dari batas = dihitung penuh
  }
  function askAlasan(menit) {
    return new Promise(function (resolve) {
      var done = false;
      X.modal({ title: 'Alasan Lembur', body: '<p class="muted" style="margin-bottom:10px">Anda pulang <b>' + menit + ' menit</b> setelah jam kerja. Isi alasan lembur — lembur dihitung setelah disetujui atasan/HR.</p>' + X.field({ name: 'alasan', type: 'textarea', label: 'Alasan lembur', required: true, placeholder: 'mis. menyelesaikan stok opname / toko ramai' }),
        footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="als">Lanjut ambil foto</button>',
        onOpen: function (m) { var t = m.$('[name=alasan]'); m.onClose = function () { if (!done) resolve(null); }; m.$('#als').onclick = function () { var v = t.value.trim(); if (v.length < 3) return X.toast('Alasan lembur wajib diisi.', 'warn'); done = true; m.close(); resolve(v); }; } });
    });
  }
  /** Masuk lebih awal (dihitung lembur): alasan BOLEH diisi, tidak wajib. resolve(teks) | resolve('') bila dilewati | resolve(null) bila dibatalkan */
  function askAlasanAwal(menit) {
    return new Promise(function (resolve) {
      var done = false;
      X.modal({ title: 'Masuk Lebih Awal', body: '<p class="muted" style="margin-bottom:10px">Anda masuk <b>' + menit + ' menit</b> lebih awal dari jadwal. Waktu ini dicatat sebagai lembur dan menunggu persetujuan HR. Alasan boleh diisi (tidak wajib).</p>' + X.field({ name: 'alasan', type: 'textarea', label: 'Alasan (opsional)', placeholder: 'mis. membuka toko / menerima barang' }),
        footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-g" id="alsk">Lewati</button><button class="btn btn-p" id="als">Lanjut ambil foto</button>',
        onOpen: function (m) { var t = m.$('[name=alasan]'); m.onClose = function () { if (!done) resolve(null); }; m.$('#als').onclick = function () { done = true; var v = t.value.trim(); m.close(); resolve(v); }; m.$('#alsk').onclick = function () { done = true; m.close(); resolve(''); }; } });
    });
  }
  X.ACT.punch = function (b) {
    var kind = b.dataset.kind; ALASAN = '';
    if (obGet()) return X.flushOutbox();                                       // ada absen tertunda: kirim itu dulu
    if (kind === 'OUT') { var mnt = lemburSekarang(activeRec()); if (mnt > 0) return askAlasan(mnt).then(function (v) { if (v) { ALASAN = v; openCam('OUT'); } }); }
    if (kind === 'IN') {
      var sh0 = curShift(), la = sc0().lemburAwal, n0 = X.nowIn(S.tz), aw = sh0 && la && la.aktif ? -lateInfo(sh0, n0).raw : 0;
      if (aw > la.batas) return askAlasanAwal(aw).then(function (v) { if (v !== null) { ALASAN = v; openCam('IN'); } });
    }
    openCam(kind);
  };

  /* ---------------------------------------------------------------- IZIN / SAKIT */
  function refreshAbsen() { return X.api('absen.state', {}, { quiet: true }).then(function (r) { if (r.success) { A.izin = r.data.izin || null; S.boot.today = r.data.today; } if (S.route === 'absen' && A.mount) { A.mount.innerHTML = absenHtml(); bindAbsen(A.mount); } }); }
  X.ACT['izin-form'] = function () {
    var td = X.nowIn(S.tz).date;
    var m = X.modal({ title: 'Ajukan Izin / Sakit', body: '<p class="muted" style="margin-bottom:10px">Pilih ini bila Anda tidak masuk kerja. HR akan menyetujui dan menentukan apakah hari tersebut dihitung atau tidak.</p>' +
      X.field({ name: 'jenis', type: 'select', label: 'Jenis', options: [{ v: 'IZIN', l: 'Izin' }, { v: 'SAKIT', l: 'Sakit' }] }) +
      '<div class="grid g2 keep">' + X.field({ name: 'tanggal_mulai', type: 'date', label: 'Dari tanggal', value: td, required: true }) + X.field({ name: 'tanggal_selesai', type: 'date', label: 'Sampai tanggal', value: td, required: true }) + '</div>' +
      X.field({ name: 'keterangan', type: 'textarea', label: 'Keterangan', required: true, placeholder: 'mis. demam, keperluan keluarga' }),
      footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="izsv">Kirim Pengajuan</button>',
      onOpen: function (mm) {
        var a = mm.$('[name=tanggal_mulai]'), b = mm.$('[name=tanggal_selesai]'); a.onchange = function () { if (b.value < a.value) b.value = a.value; };
        mm.$('#izsv').onclick = function () {
          var d = X.readForm(mm.el); if (!d.tanggal_mulai || !d.tanggal_selesai) return X.toast('Isi tanggal.', 'warn'); if (d.keterangan.trim().length < 3) return X.toast('Isi keterangan singkat.', 'warn');
          var btn = mm.$('#izsv'); btn.disabled = true;
          X.api('izin.ajukan', d).then(function (r) { btn.disabled = false; if (!r.success) return; mm.close(); X.toast(r.message || 'Pengajuan terkirim.', 'ok'); refreshAbsen(); });
        };
      } });
  };
  X.ACT['izin-batal'] = function (b) {
    X.api('izin.batal', { id: b.dataset.id }).then(function (r) { if (r.success) { X.toast('Pengajuan dibatalkan.', 'ok'); refreshAbsen(); if (S.route === 'riwayat') paintRiwayat(R.el); } });
  };
  var IZST = { MENUNGGU: ['Menunggu', 'b-warn'], DISETUJUI: ['Disetujui', 'b-ok'], DITOLAK: ['Ditolak', 'b-bad'] };
  function izinListHtml(rows) {
    if (!rows || !rows.length) return '';
    return '<h3 style="font-size:14px;margin:18px 0 8px">Izin & Sakit</h3><div class="list">' + rows.map(function (z) {
      var st = IZST[z.status] || ['', ''];
      return '<div class="li"><div class="av" style="flex-direction:column;line-height:1;font-size:15px"><span>' + z.tanggal.slice(8) + '</span></div><div class="grow"><div class="t1">' + (z.jenis === 'SAKIT' ? 'Sakit' : 'Izin') + (z.status === 'DISETUJUI' ? (z.dihitung ? ' · dihitung hadir' : ' · tidak dihitung') : '') + '</div><div class="t2">' + esc(z.keterangan || '') + (z.status === 'DITOLAK' && z.catatan ? ' — ' + esc(z.catatan) : '') + '</div></div><div class="tr"><span class="badge ' + st[1] + '">' + st[0] + '</span>' +
        (z.status === 'MENUNGGU' ? ' <button class="btn btn-g btn-s" data-act="izin-batal" data-id="' + esc(z.id) + '">Batal</button>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------------- KAMERA */
  var C = { stream: null, kind: '', photo: '', timer: 0 };
  function wmLines(kind) {
    var me = S.boot.me, sc = sched(), n = X.nowIn(S.tz);
    if (C.proxy) return [C.proxy.nama + ' · ' + C.proxy.id, n.date + ' ' + n.time + ' ' + sc.zona, C.proxy.org, (kind === 'IN' ? 'ABSEN MASUK' : 'ABSEN PULANG') + ' · diabsenkan ' + me.nama];
    return [me.nama + ' · ' + me.id, n.date + ' ' + n.time + ' ' + sc.zona, sc.perusahaan + ' · ' + sc.cabang, kind === 'IN' ? 'ABSEN MASUK' : 'ABSEN PULANG'];
  }
  function camShell(inner, title) {
    return '<div class="cam-top"><div><b>' + esc(title) + '</b><div style="font-size:12px;opacity:.7">Foto selfie otomatis diberi watermark & dikompres</div></div><button class="ibtn" style="color:#fff" data-act="cam-close" aria-label="Tutup kamera">' + ico('x') + '</button></div>' + inner;
  }
  function openCam(kind) {
    if (A.busy) return; C.kind = kind; C.photo = '';
    var cam = $('#cam'); cam.classList.add('on'); document.body.style.overflow = 'hidden';
    var title = kind === 'IN' ? 'Absen Masuk' : 'Absen Pulang';
    cam.innerHTML = camShell('<div class="cam-view" id="cview"><div class="spin" style="width:32px;height:32px"></div></div><div class="cam-bot"><span style="font-size:13px;opacity:.8">Menyalakan kamera…</span></div>', title);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return camFallback('Kamera langsung tidak tersedia di peramban ini.');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 1280 } }, audio: false }).then(function (st) {
      C.stream = st; var wm = wmLines(kind);
      cam.innerHTML = camShell('<div class="cam-view" id="cview"><video id="cvid" class="mir" autoplay playsinline muted></video><div class="oval" id="oval"></div><div class="wm" id="wm"></div></div>' +
        '<div class="cam-bot"><span style="font-size:13px;opacity:.85">Posisikan wajah di dalam oval, pastikan pencahayaan cukup</span><button class="shutter" data-act="cam-shot" aria-label="Ambil foto"><i></i></button></div>', title);
      var v = $('#cvid'); v.srcObject = st; v.play().catch(function () { /* autoplay */ });
      var upd = function () { var w = $('#wm'); if (w) w.innerHTML = wmLines(kind).map(esc).join('<br>'); }; upd(); clearInterval(C.timer); C.timer = setInterval(upd, 1000);
      setTimeout(function () { var o = $('#oval'); if (o) o.classList.add('ok'); }, 900);
    }).catch(function (e) {
      camFallback(e && e.name === 'NotAllowedError' ? 'Izin kamera ditolak atau diblokir oleh halaman penyemat (iframe). Anda tetap dapat mengambil foto lewat kamera perangkat.' : 'Kamera tidak dapat diakses.');
    });
  }
  function camFallback(msg) {
    var cam = $('#cam'), title = C.kind === 'IN' ? 'Absen Masuk' : 'Absen Pulang';
    cam.innerHTML = camShell('<div class="cam-view" id="cview"><div class="camfall"><span class="av lg" style="background:rgba(255,255,255,.1);color:#fff;border-color:transparent">' + ico('camera', 'lg') + '</span><p style="opacity:.85">' + esc(msg) + '</p>' +
      '<label class="btn btn-p btn-xl" style="cursor:pointer">' + ico('camera') + 'Ambil Foto Selfie<input type="file" id="cfile" accept="image/*" capture="user" style="display:none"></label></div></div><div class="cam-bot"></div>', title);
    $('#cfile').onchange = function (e) { var f = e.target.files && e.target.files[0]; if (!f) return; var img = new Image(), url = URL.createObjectURL(f); img.onload = function () { shoot(img, img.naturalWidth, img.naturalHeight, false); URL.revokeObjectURL(url); }; img.src = url; };
  }
  function shoot(src, w, h, fromVideo) {
    var max = 720, k = Math.min(1, max / Math.max(w, h)), cw = Math.round(w * k), ch = Math.round(h * k), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var g = cv.getContext('2d'); g.drawImage(src, 0, 0, cw, ch);
    var lines = wmLines(C.kind), fs = Math.max(11, Math.round(cw / 36)), pad = Math.round(fs * .7), bh = lines.length * (fs + 4) + pad * 2;
    g.fillStyle = 'rgba(15,23,42,.7)'; g.fillRect(0, ch - bh, cw, bh); g.fillStyle = '#fff'; g.font = '600 ' + fs + 'px "JetBrains Mono",monospace'; g.textBaseline = 'top';
    lines.forEach(function (t, i) { g.fillText(t, pad, ch - bh + pad + i * (fs + 4)); });
    var q = 0.74, d = cv.toDataURL('image/jpeg', q); while (d.length > 230000 && q > 0.4) { q -= 0.08; d = cv.toDataURL('image/jpeg', q); }
    C.photo = d; stopStream(); clearInterval(C.timer);
    var cam = $('#cam'), title = C.kind === 'IN' ? 'Absen Masuk' : 'Absen Pulang';
    cam.innerHTML = camShell('<div class="cam-view"><img src="' + d + '" alt="Pratinjau selfie"></div><div class="cam-bot"><span class="mono" style="font-size:12px;opacity:.75">' + Math.round(d.length * 0.75 / 1024) + ' KB · terkompresi</span><div style="display:flex;gap:10px;width:100%;max-width:420px"><button class="btn btn-g" style="flex:1" data-act="cam-redo">Ulangi</button><button class="btn btn-p" style="flex:2" data-act="cam-send">' + ico('check') + 'Kirim Absen</button></div></div>', title);
  }
  function stopStream() { if (C.stream) { C.stream.getTracks().forEach(function (t) { t.stop(); }); C.stream = null; } }
  function closeCam(keepProxy) { if (keepProxy !== true) C.proxy = null; stopStream(); clearInterval(C.timer); var c = $('#cam'); c.classList.remove('on'); c.innerHTML = ''; document.body.style.overflow = ''; }
  X.ACT['cam-close'] = closeCam;
  X.ACT['cam-redo'] = function () { openCam(C.kind); };
  X.ACT['cam-shot'] = function () { var v = $('#cvid'); if (!v || !v.videoWidth) return X.toast('Kamera belum siap.', 'warn'); shoot(v, v.videoWidth, v.videoHeight, true); };
  X.ACT['cam-send'] = function () { var kind = C.kind, photo = C.photo, px = C.proxy; closeCam(true); C.proxy = null; if (px) return px.cb(photo); punch(kind, photo); };
  /* Absenkan karyawan lain (HP bermasalah): kamera dipakai oleh akun yang diberi izin. px = {nama,id,org,cb(photo)} */
  X.proxyCam = function (kind, px) { C.proxy = px; openCam(kind); };
  X.askAlasanLembur = askAlasan;

  /* ---------------------------------------------------------------- KIRIM ABSEN (optimistic) */
  /* Antrean kirim: absen disimpan di HP sampai server mengonfirmasi, supaya tidak hilang bila sinyal putus,
     aplikasi tertutup, atau sesi login habis. Dikirim ulang dengan JAM ASLI saat tombol ditekan (t_klien). */
  var OBK = 'sapmc:outbox';
  function obGet() { try { var o = JSON.parse(localStorage.getItem(OBK) || 'null'); return o && S.boot && o.uid === S.boot.me.id ? o : null; } catch (e) { return null; } }
  function obSet(o) { try { if (o) localStorage.setItem(OBK, JSON.stringify(o)); else localStorage.removeItem(OBK); } catch (e) { /* penyimpanan penuh: lanjut tanpa antrean */ } }
  function repaintAbsen() { if (S.route === 'absen' && A.mount) { A.mount.innerHTML = absenHtml(); bindAbsen(A.mount); } }
  function obBanner() {
    var o = obGet(); if (!o) return '';
    return '<div class="banner bad">' + ico('alert') + '<div><b>Absen ' + (o.kind === 'IN' ? 'masuk' : 'pulang') + ' pukul ' + esc(o.jam) + ' BELUM terkirim ke server</b>Foto dan jam Anda tersimpan di HP. Pastikan internet aktif lalu tekan <b>Kirim ulang</b>.' +
      '<div style="margin-top:8px"><button class="btn btn-p btn-s" data-act="ob-retry">Kirim ulang sekarang</button></div></div></div>';
  }
  function sendPunch(o) {
    var prev = S.boot.today;
    return X.api(o.kind === 'IN' ? 'absen.clockIn' : 'absen.clockOut', { foto: o.photo, id_shift: o.id_shift, alasan_lembur: o.alasan || '', t_klien: o.t }).then(function (r) {
      A.busy = false;
      if (r.success) {
        obSet(null); S.boot.today = r.data.today; S.off = (r.data.serverNow || Date.now()) - Date.now(); X.LS.set('boot', S.boot); X.invalidate('hist:');
        X.toast(r.message, r.data.today.menit_terlambat && o.kind === 'IN' ? 'warn' : '');
      } else if (r.code === 'NET' || r.code === 'AUTH') {
        S.boot.today = prev && prev.pending ? o.prev || null : prev;                 // batalkan tampilan sementara; antrean tetap tersimpan
        X.toast('Absen belum terkirim — tersimpan di HP. ' + (r.code === 'AUTH' ? 'Masuk kembali, lalu absen otomatis dikirim.' : 'Periksa internet lalu tekan Kirim ulang.'), 'err');
      } else if (r.code === 'DUP') {
        obSet(null); X.toast('Absen ini sudah tercatat sebelumnya.'); X.refreshBoot();
      } else if (r.code === 'ALASAN') {
        S.boot.today = o.prev || prev; var mm = parseInt((/(\d+) menit/.exec(r.message || '') || [0, 1])[1], 10);
        askAlasan(isNaN(mm) ? 1 : mm).then(function (v) { if (v) { o.alasan = v; obSet(o); A.busy = true; S.boot.today = Object.assign({}, S.boot.today || {}, { pending: true }); sendPunch(o); } else { obSet(null); repaintAbsen(); } });
        return;
      } else {
        obSet(null); S.boot.today = o.prev || prev;
        X.modal({ title: 'Absen belum tersimpan', body: '<p class="muted">' + esc(r.message) + '</p>', footer: '<button class="btn btn-p" data-close>Mengerti</button>' });
        if (r.code === 'NOIN') X.refreshBoot();
      }
      repaintAbsen();
    });
  }
  function punch(kind, photo) {
    if (A.busy) return; A.busy = true;
    var prev = S.boot.today, n = X.nowIn(S.tz), sh = curShift(), li = lateInfo(sh, n), tmp;
    if (kind === 'IN') tmp = { id: 'tmp', tanggal: n.date, id_shift: sh.id_shift, jadwal_masuk: sh.jam_masuk, jadwal_pulang: sh.jam_pulang, waktu_masuk: n.full, waktu_pulang: '', menit_terlambat: li.counted, denda: li.denda, menit_lembur: 0, nominal_lembur: 0, status: li.counted ? 'TERLAMBAT' : 'HADIR', lintas: sh.lintas, pending: true };
    else tmp = Object.assign({}, prev, { waktu_pulang: n.full, pending: true });
    var o = { uid: S.boot.me.id, kind: kind, photo: photo, alasan: ALASAN, id_shift: sh.id_shift, t: Date.now() + S.off, jam: n.time.slice(0, 5), prev: prev };
    obSet(o); S.boot.today = tmp; repaintAbsen();
    sendPunch(o);
  }
  /* kirim ulang antrean: dipanggil dari tombol, saat online lagi, saat aplikasi dibuka, dan setelah login */
  X.flushOutbox = function () {
    var o = obGet(); if (!o || A.busy) return;
    if (Date.now() + S.off - o.t > 12 * 3600e3) { obSet(null); X.modal({ title: 'Absen tertunda terlalu lama', body: '<p class="muted">Absen ' + (o.kind === 'IN' ? 'masuk' : 'pulang') + ' pukul ' + esc(o.jam) + ' tidak bisa dikirim otomatis karena sudah lebih dari 12 jam. Mohon hubungi HR untuk mencatatnya manual.</p>', footer: '<button class="btn btn-p" data-close>Mengerti</button>' }); repaintAbsen(); return; }
    A.busy = true; S.boot.today = o.kind === 'OUT' ? Object.assign({}, S.boot.today || o.prev || {}, { pending: true }) : S.boot.today; repaintAbsen(); sendPunch(o);
  };
  X.ACT['ob-retry'] = function () { X.flushOutbox(); };
  window.addEventListener('online', function () { if (S.boot) X.flushOutbox(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.boot) X.flushOutbox(); });

  /* ---------------------------------------------------------------- RIWAYAT */
  var R = { p: '' };
  function riwayatHtml(d, loading) {
    var cur = X.periodeNow(), p = R.p, head = '<div class="toolbar" style="justify-content:space-between"><button class="btn btn-g btn-s" data-act="rw-prev" aria-label="Bulan sebelumnya">' + ico('chevL', 'sm') + '</button><b style="font-size:16px">' + X.periodeLabel(p) + '</b><button class="btn btn-g btn-s" data-act="rw-next" aria-label="Bulan berikutnya" ' + (p >= cur ? 'disabled' : '') + '>' + ico('chevR', 'sm') + '</button></div>';
    if (!d) return '<div class="page narrow">' + head + '<div class="grid g2 keep">' + X.skel(4, 76) + '</div>' + X.skel(4, 72) + '</div>';
    var s = d.summary, sum = '<div class="grid g2 keep" style="margin-bottom:14px">' +
      st('Hari Hadir', s.hadir + ' hari', 'ic-ok', 'check') + st('Total Menit Telat', s.menitTelat + ' mnt', 'ic-w', 'clock') + st('Hari Terlambat', s.telat + ' hari', 'ic-b', 'alert') + st('Lembur', (Math.round(s.menitLembur / 6) / 10) + ' jam', 'ic-i', 'trend') + '</div>';
    var list = d.rows.length ? '<div class="list">' + d.rows.map(function (r) {
      var dt = X.dateLabel(r.tanggal).split(', ');
      return '<div class="li click" data-act="rw-open" data-id="' + esc(r.id) + '" role="button" tabindex="0"><div class="av" style="flex-direction:column;line-height:1;font-size:15px"><span>' + r.tanggal.slice(8) + '</span><span style="font-size:9px;font-weight:600">' + dt[0] + '</span></div><div class="grow"><div class="t1 mono" style="font-size:13px">' + X.hm(r.waktu_masuk) + ' → ' + (r.waktu_pulang ? X.hm(r.waktu_pulang) : '--:--') + '</div><div class="t2">' + (r.menit_lembur ? 'Lembur ' + r.menit_lembur + ' mnt' + (r.status_lembur && r.status_lembur !== 'DISETUJUI' ? ' · ' + LST[r.status_lembur][0].toLowerCase() : '') : r.waktu_pulang ? 'Selesai' : 'Belum pulang') + '</div></div>' +
        (r.menit_terlambat ? '<div class="tr"><span class="badge b-warn">Telat ' + r.menit_terlambat + 'm</span></div>' : '<span class="badge b-ok">Tepat</span>') + '</div>';
    }).join('') + '</div>' : (d.izin && d.izin.length ? '' : '<div class="card flat">' + X.empty('calendar', 'Belum ada absensi', 'Tidak ada data absensi pada ' + X.periodeLabel(p) + '.') + '</div>');
    return '<div class="page narrow">' + head + sum + list + izinListHtml(d.izin) + '</div>';
  }
  function st(k, v, ic, i) { return '<div class="card stat"><span class="k"><span class="ic ' + ic + '">' + ico(i, 'sm') + '</span></span><span class="s">' + k + '</span><span class="v" style="font-size:18px;line-height:24px">' + v + '</span></div>'; }
  function paintRiwayat(el) {
    var key = 'hist:' + R.p, p = R.p; el.innerHTML = riwayatHtml(null);
    X.swr(key, 'absen.history', { periode: p }, function (d) { if (R.p === p && S.route === 'riwayat') { R.data = d; el.innerHTML = riwayatHtml(d); } }, { ttl: 30000 });
  }
  V.riwayat = { render: function (el) { R.p = R.p || X.periodeNow(); R.el = el; paintRiwayat(el); } };
  X.ACT['rw-prev'] = function () { R.p = X.periodeShift(R.p, -1); paintRiwayat(R.el); };
  X.ACT['rw-next'] = function () { if (R.p < X.periodeNow()) { R.p = X.periodeShift(R.p, 1); paintRiwayat(R.el); } };
  X.ACT['rw-open'] = function (b) {
    var r = (R.data && R.data.rows || []).filter(function (x) { return x.id === b.dataset.id; })[0]; if (!r) return;
    var ph = function (j, has, lab) { return '<div><div class="lbl" style="margin-bottom:6px">' + lab + '</div>' + (has ? '<div class="photo sk" data-ph="' + j + '"></div>' : '<div class="photo" style="display:grid;place-items:center;color:var(--muted)">Tidak ada foto</div>') + '</div>'; };
    var m = X.modal({ title: X.dateLabel(r.tanggal, true), body: '<div class="sline"><span class="muted">Jadwal</span><b class="mono">' + esc(r.jadwal_masuk) + '–' + esc(r.jadwal_pulang) + '</b></div><div class="sline"><span class="muted">Masuk</span><b class="mono">' + X.hm(r.waktu_masuk) + '</b></div><div class="sline"><span class="muted">Pulang</span><b class="mono">' + (r.waktu_pulang ? X.hm(r.waktu_pulang) : '--:--') + '</b></div>' +
      '<div class="sline"><span class="muted">Keterlambatan</span><b class="mono">' + r.menit_terlambat + ' mnt</b></div><div class="sline"><span class="muted">Lembur</span><b class="mono">' + r.menit_lembur + ' mnt' + (r.status_lembur ? ' <span class="badge ' + LST[r.status_lembur][1] + '">' + LST[r.status_lembur][0] + '</span>' : '') + '</b></div>' + (r.alasan_lembur ? '<div class="sline"><span class="muted">Alasan lembur</span><span style="text-align:right;max-width:60%">' + esc(r.alasan_lembur) + '</span></div>' : '') +
      '<div class="grid g2 keep" style="margin-top:14px">' + ph('IN', r.foto_masuk, 'Foto Masuk') + ph('OUT', r.foto_pulang, 'Foto Pulang') + '</div>' });
    ['IN', 'OUT'].forEach(function (j) { var slot = m.$('[data-ph="' + j + '"]'); if (!slot) return; X.api('absen.foto', { id: r.id, jenis: j }, { quiet: true }).then(function (res) { if (res.success && slot.isConnected) { slot.outerHTML = '<img class="photo" alt="Foto ' + j + '" src="' + res.data.src + '">'; } else if (slot.isConnected) { slot.classList.remove('sk'); slot.textContent = 'Foto tidak tersedia'; } }); });
  };

  /* ---------------------------------------------------------------- SLIP */
  var SL = { el: null, rows: [] };
  function slipHtml(rows) {
    if (!rows) return '<div class="page narrow">' + X.skel(3, 88) + '</div>';
    if (!rows.length) return '<div class="page narrow"><div class="card flat">' + X.empty('file', 'Belum ada slip gaji', 'Slip akan muncul di sini setelah Finance menerbitkan payroll periode Anda.') + '</div></div>';
    return '<div class="page narrow"><div class="list">' + rows.map(function (r) {
      return '<div class="li click" data-act="sl-open" data-p="' + r.periode_bulan + '" role="button" tabindex="0"><span class="av">' + ico('file', 'sm') + '</span><div class="grow"><div class="t1">' + X.periodeLabel(r.periode_bulan) + '</div><div class="t2">Take Home Pay</div></div><div class="tr"><b class="mono">' + rp(r.slip.thp) + '</b><div>' + (r.status === 'TERKIRIM' ? '<span class="badge b-ok">Terkirim</span>' : '<span class="badge b-info">Siap</span>') + '</div></div></div>';
    }).join('') + '</div></div>';
  }
  V.slip = { render: function (el) { SL.el = el; el.innerHTML = slipHtml(null); X.swr('slip', 'slip.list', {}, function (d) { if (S.route === 'slip') { SL.rows = d; el.innerHTML = slipHtml(d); } }, { ttl: 30000 }); } };
  X.ACT['sl-open'] = function (b) {
    var r = SL.rows.filter(function (x) { return x.periode_bulan === b.dataset.p; })[0]; if (!r) return; var s = r.slip;
    var line = function (k, v, neg) { return '<div class="sline"><span>' + k + '</span><b class="mono ' + (neg ? '' : '') + '" ' + (neg ? 'style="color:var(--bad)"' : '') + '>' + (neg ? '- ' : '') + rp(v) + '</b></div>'; };
    X.modal({ title: 'Slip Gaji ' + X.periodeLabel(r.periode_bulan), body: '<div class="sline"><span class="muted">Kehadiran</span><b class="mono">' + s.hadir + ' hari · ' + s.hariTelat + ' hari terlambat</b></div><div class="lbl" style="margin:12px 0 4px">PENDAPATAN</div>' + (s.pendapatan || []).map(function (x) { return line(esc(x.n), x.v); }).join('') +
      '<div class="lbl" style="margin:14px 0 4px">POTONGAN</div>' + ((s.potongan || []).length ? s.potongan.map(function (x) { return line(esc(x.n), x.v, 1); }).join('') : '<div class="sline"><span class="muted">Tidak ada potongan</span><b>-</b></div>') +
      '<div class="banner info" style="margin-top:14px;justify-content:space-between;align-items:center"><b>Take Home Pay</b><b class="mono" style="font-size:18px">' + rp(s.thp) + '</b></div><p class="help" style="margin-top:8px"><i>Terbilang: ' + esc(s.terbilang) + '</i></p>',
      footer: '<button class="btn btn-g" data-close>Tutup</button><button class="btn btn-p" id="dl">' + ico('download', 'sm') + 'Unduh PDF</button>',
      onOpen: function (m) { m.$('#dl').onclick = function () { var btn = m.$('#dl'); btn.disabled = true; X.api('slip.download', { periode: r.periode_bulan }).then(function (res) { btn.disabled = false; if (res.success) { X.saveB64(res.data.nama, res.data.base64); X.toast('Slip diunduh.'); } else X.toast(res.message, 'err'); }); }; } });
  };

  /* ---------------------------------------------------------------- PROFIL */
  V.profil = {
    render: function (el) {
      var me = S.boot.me, sc = S.boot.schedule;
      el.innerHTML = '<div class="page narrow" style="display:flex;flex-direction:column;gap:14px"><div class="card tc"><span class="av lg" style="margin:0 auto 10px">' + esc(X.initials(me.nama)) + '</span><h2 style="font-size:18px">' + esc(me.nama) + '</h2><div class="muted">' + esc(me.email) + '</div><div style="margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap"><span class="badge b-info">' + esc(me.roleLabel) + '</span><span class="badge b-co">' + esc(sc.perusahaan) + '</span></div></div>' +
        '<div class="card"><div class="sline"><span class="muted">ID Karyawan</span><b class="mono">' + esc(me.id) + '</b></div><div class="sline"><span class="muted">Cabang</span><b>' + esc(sc.cabang) + '</b></div><div class="sline"><span class="muted">Zona Waktu</span><b>' + esc(sc.zona) + '</b></div>' +
        '<div class="sline"><span class="muted">WhatsApp</span><span style="display:flex;gap:8px;align-items:center"><b class="mono" id="pwa">' + esc(me.no_wa || '-') + '</b><button class="btn btn-g btn-s" data-act="pf-wa">' + ico('edit', 'sm') + 'Ubah</button></span></div></div>' +
        '<div class="card"><div class="sline" style="align-items:center"><span>Mode Gelap</span><label class="sw"><input type="checkbox" id="dm" ' + (X.isDark() ? 'checked' : '') + ' aria-label="Mode gelap"></label></div>' + (S.boot.me.role === 'FINANCE' || S.boot.me.role === 'MANAJEMEN' ? '<div class="sline" style="align-items:center"><span>Titik ribuan pada nominal<br><span class="help">Tampilan 1.000 / 10.000 saat mengetik angka Rupiah</span></span><label class="sw"><input type="checkbox" id="fr" ' + (X.RPIN.on() ? 'checked' : '') + ' aria-label="Titik ribuan"></label></div>' : '') + '</div>' +
        '<button class="btn btn-g btn-block" data-act="pf-pw">' + ico('lock', 'sm') + 'Ubah kata sandi</button><button class="btn btn-g btn-block" data-act="pf-all">' + ico('lock', 'sm') + 'Keluar dari semua perangkat</button><button class="btn btn-d btn-block" data-act="logout">' + ico('logout', 'sm') + 'Keluar</button><p class="help tc">' + esc(S.boot.app.nama) + ' v' + esc(S.boot.app.versi) + '</p></div>';
      var fr = $('#fr', el); if (fr) fr.onchange = function () { X.RPIN.set(this.checked); X.toast(this.checked ? 'Titik ribuan aktif.' : 'Titik ribuan dimatikan.'); };
      $('#dm', el).onchange = function () { X.applyTheme(this.checked ? 'dark' : 'light'); X.renderChrome(); };
    }
  };
  X.ACT['pf-wa'] = function () {
    X.modal({ title: 'Ubah Nomor WhatsApp', body: X.field({ name: 'no_wa', label: 'Nomor WhatsApp', value: S.boot.me.no_wa, placeholder: '6281234567890', help: 'Gunakan format 628xxxxxxxxxx. Dipakai untuk pengingat absensi.' }), footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="sv">Simpan</button>',
      onOpen: function (m) { m.$('#sv').onclick = function () { var v = X.readForm(m.el).no_wa, b = m.$('#sv'); b.disabled = true; X.api('profil.updateWa', { no_wa: v }).then(function (r) { b.disabled = false; if (!r.success) return X.toast(r.message, 'err'); S.boot.me.no_wa = r.data.no_wa; X.LS.set('boot', S.boot); var p = $('#pwa'); if (p) p.textContent = r.data.no_wa; m.close(); X.toast(r.message); }); }; } });
  };
  X.ACT['pf-pw'] = function () {
    X.modal({ title: 'Ubah Kata Sandi', body: '<div class="field"><label for="pw0">Kata sandi saat ini</label><input class="inp" id="pw0" type="password" autocomplete="current-password"></div><div class="field"><label for="pw1">Kata sandi baru</label><input class="inp" id="pw1" type="password" autocomplete="new-password" placeholder="Minimal 8 karakter, huruf + angka"></div><div class="field"><label for="pw2">Ulangi kata sandi baru</label><input class="inp" id="pw2" type="password" autocomplete="new-password"></div><p class="help">Setelah diubah, perangkat lain harus masuk ulang. Lupa kata sandi saat ini? Keluar, lalu pilih &quot;Lupa kata sandi&quot; di halaman masuk.</p><div class="errmsg" id="pwerr" style="min-height:18px"></div>',
      footer: '<button class="btn btn-g" data-close>Batal</button><button class="btn btn-p" id="pwsv">Simpan</button>',
      onOpen: function (m) {
        m.$('#pwsv').onclick = function () {
          var a = m.$('#pw0').value, b = m.$('#pw1').value, c = m.$('#pw2').value, er = m.$('#pwerr'), btn = m.$('#pwsv');
          if (!a) { er.textContent = 'Isi kata sandi saat ini.'; return; }
          if (b.length < 8 || !/[A-Za-z]/.test(b) || !/\d/.test(b)) { er.textContent = 'Kata sandi baru minimal 8 karakter dan memuat huruf + angka.'; return; }
          if (b !== c) { er.textContent = 'Ulangi kata sandi tidak sama.'; return; }
          btn.disabled = true; er.textContent = '';
          X.api('auth.changePassword', { lama: a, baru: b }).then(function (r) {
            btn.disabled = false; if (!r.success) { er.textContent = r.message; return; }
            X.setToken(r.data.token); X.closeAll(); X.toast(r.message || 'Kata sandi diubah.');
          });
        };
      } });
  };
  X.ACT['pf-all'] = function () { X.confirm({ title: 'Keluar dari semua perangkat?', text: 'Semua sesi aktif Anda akan diakhiri.', ok: 'Keluar semua' }).then(function (ok) { if (!ok) return; X.api('auth.logout', { semua: true }, { quiet: true }).then(function () { X.LS.clearUser(); S.token = ''; S.boot = null; $('#app').classList.remove('on'); X.showLogin(); }); }); };
})();
