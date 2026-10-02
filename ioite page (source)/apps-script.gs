/**
 * Penerima lead dari link.mitologiinspira.com ke Google Sheet.
 * Cara pasang ada di README.md bagian "Sambungkan ke Google Sheet".
 */
const SHEET_NAME = "Leads QR";
const SHEET_IOITE_UTAMA = "Waiting List Utama IOITE";
const SHEET_IOITE_CADANGAN = "Waiting List Cadangan IOITE";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    const phone = String(d.phone || "").replace(/\D/g, "");
    if (!/^628\d{7,11}$/.test(phone)) return out({ ok: false, error: "phone" });

    // Pendaftaran Quest/Kelas IOITE masuk sheet waiting list terpisah (utama/cadangan)
    if (d.type === "ioite") return doPostIoite(d, phone);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(SHEET_NAME);
      sh.appendRow(["Waktu", "Nama", "WhatsApp", "Jabatan", "Perusahaan", "Email", "Sumber QR", "Link WA", "Status", "Halaman", "Perangkat"]);
      sh.setFrozenRows(1);
    }
    const clean = s => String(s || "").slice(0, 120).replace(/^[=+\-@]/, "'$&"); // cegah formula injection
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || "")) ? clean(d.email) : "";
    sh.appendRow([
      new Date(), clean(d.name), "'" + phone, clean(d.jabatan), clean(d.company), email, clean(d.source),
      "https://wa.me/" + phone, "Baru", clean(d.page), clean(d.ua)
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
  const clean = s => String(s || "").slice(0, 120).replace(/^[=+\-@]/, "'$&");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = d.list === "utama" ? SHEET_IOITE_UTAMA : SHEET_IOITE_CADANGAN;
  let sh = ss.getSheetByName(sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
    sh.appendRow(["Waktu", "Nama", "WhatsApp", "Hari", "Kegiatan", "Status", "Halaman"]);
    sh.setFrozenRows(1);
  }
  sh.appendRow([
    new Date(), clean(d.name), "'" + phone, clean(d.day), clean(d.itemName), "Baru", clean(d.page)
  ]);
  return out({ ok: true });
}

function doGet() { return out({ ok: true, service: "mitologi-link-leads" }); }

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
