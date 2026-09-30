/**
 * Penerima lead dari link.mitologiinspira.com ke Google Sheet.
 * Cara pasang ada di README.md bagian "Sambungkan ke Google Sheet".
 */
const SHEET_NAME = "Leads QR";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    const phone = String(d.phone || "").replace(/\D/g, "");
    if (!/^628\d{7,11}$/.test(phone)) return out({ ok: false, error: "phone" });

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

function doGet() { return out({ ok: true, service: "mitologi-link-leads" }); }

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
