/**
 * Penerima data dari link.mitologiinspira.com ke Google Sheet.
 * Cara pasang ada di README.md bagian "Sambungkan ke Google Sheet".
 *
 * Tab yang dibuat otomatis:
 *  - "Leads QR"                     : pengisi form awal
 *  - "Waiting List Utama IOITE"     : pendaftar kelas/quest yang SUDAH punya laporan Lakon
 *  - "Waiting List Cadangan IOITE"  : pendaftar yang BELUM punya laporan Lakon
 *  - "Semua Pendaftaran IOITE"      : gabungan keduanya, urut waktu daftar, mudah difilter per kegiatan
 *
 * Setiap data dari aplikasi membawa "id" unik. Data dengan id yang sudah ada dilewati,
 * jadi pengiriman ulang dari HP (sinyal putus, dll.) tidak membuat baris ganda.
 */
const SHEET_NAME = "Leads QR";
const SHEET_IOITE_UTAMA = "Waiting List Utama IOITE";
const SHEET_IOITE_CADANGAN = "Waiting List Cadangan IOITE";
const SHEET_IOITE_SEMUA = "Semua Pendaftaran IOITE";

const HEAD_LEADS = ["Waktu", "Nama", "WhatsApp", "Jabatan", "Perusahaan", "Email", "Sumber QR", "Link WA", "Status", "Halaman", "Perangkat", "ID"];
const HEAD_IOITE = ["Waktu", "Nama", "WhatsApp", "Hari", "Kegiatan", "Status", "Halaman", "Antrian", "Punya Lakon", "ID"];
const HEAD_SEMUA = ["Waktu", "Hari", "Kegiatan", "Antrian", "Nama", "WhatsApp", "Punya Lakon", "Daftar di", "Status", "ID"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return out({ ok: false, error: "busy" });
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const phone = String(d.phone || "").replace(/\D/g, "");
    if (!/^628\d{7,11}$/.test(phone)) return out({ ok: false, error: "phone" });

    // Pendaftaran Quest/Kelas IOITE masuk sheet waiting list terpisah (utama/cadangan)
    if (d.type === "ioite") return doPostIoite(d, phone);

    const sh = getSheet(SHEET_NAME, HEAD_LEADS);
    const id = clean(d.id);
    if (id && hasId(sh, HEAD_LEADS.length, id)) return out({ ok: true, duplicate: true });
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || "")) ? clean(d.email) : "";
    sh.appendRow([
      new Date(), clean(d.name), "'" + phone, clean(d.jabatan), clean(d.company), email, clean(d.source),
      "https://wa.me/" + phone, "Baru", clean(d.page), clean(d.ua), id
    ]);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Pendaftaran Quest/Kelas halaman IOITE. d.list = "utama" (sudah punya laporan Lakon) atau "cadangan" (belum).
function doPostIoite(d, phone) {
  const isUtama = d.list === "utama";
  const sh = getSheet(isUtama ? SHEET_IOITE_UTAMA : SHEET_IOITE_CADANGAN, HEAD_IOITE);
  const all = getSheet(SHEET_IOITE_SEMUA, HEAD_SEMUA);
  const id = clean(d.id);
  const day = clean(d.day), item = clean(d.itemName);
  if (!item) return out({ ok: false, error: "item" });

  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, HEAD_IOITE.length).getValues() : [];
  let antrian = 1;
  for (const r of rows) {
    if (id && String(r[9]) === id) return out({ ok: true, duplicate: true });
    if (String(r[3]) === day && String(r[4]) === item) {
      antrian++;
      // orang yang sama mendaftar kegiatan yang sama dua kali: abaikan
      if (String(r[2]).replace(/\D/g, "") === phone) return out({ ok: true, duplicate: true });
    }
  }

  // Sudah di daftar cadangan lalu kini daftar utama (baru punya Lakon): tandai baris lama, jangan hapus
  if (isUtama) markMoved(day, item, phone);

  const now = new Date();
  const lakon = isUtama ? "Sudah" : "Belum";
  sh.appendRow([now, clean(d.name), "'" + phone, day, item, "Baru", clean(d.page), antrian, lakon, id]);
  all.appendRow([now, day, item, antrian, clean(d.name), "'" + phone, lakon, isUtama ? "Utama" : "Cadangan", "Baru", id]);
  return out({ ok: true, antrian: antrian });
}

function markMoved(day, item, phone) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_IOITE_CADANGAN);
  if (!sh || sh.getLastRow() < 2) return;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, HEAD_IOITE.length).getValues();
  rows.forEach((r, i) => {
    if (String(r[3]) === day && String(r[4]) === item && String(r[2]).replace(/\D/g, "") === phone && r[5] === "Baru") {
      sh.getRange(i + 2, 6).setValue("Pindah ke Utama");
    }
  });
}

// Ambil sheet; buat jika belum ada; lengkapi header jika sheet lama punya kolom lebih sedikit
function getSheet(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(head);
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < head.length) {
    sh.getRange(1, 1, 1, head.length).setValues([head]);
  }
  return sh;
}

function hasId(sh, col, id) {
  if (sh.getLastRow() < 2) return false;
  return sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues().some(r => String(r[0]) === id);
}

// batasi panjang dan cegah formula injection di Sheet
function clean(s) { return String(s || "").slice(0, 120).replace(/^[=+\-@\t\r]/, "'$&"); }

function doGet() { return out({ ok: true, service: "inspira-digital-guestbook" }); }

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
