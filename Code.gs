/*
 * CONSERVATORIO OTTORINO RESPIGHI — API EVENTI
 *
 * 1. Apri il Google Sheet degli eventi.
 * 2. Estensioni > Apps Script.
 * 3. Incolla questo file in Code.gs.
 * 4. Salva e distribuisci come applicazione web.
 *
 * Il foglio deve chiamarsi "Eventi" e avere le intestazioni indicate
 * nel modello CSV/README. Il servizio è in sola lettura.
 */
const SHEET_NAME = "Eventi";

function doGet(e) {
  const callback = (e && e.parameter && e.parameter.callback) || "";
  const result = getEvents_();
  const json = JSON.stringify(result);
  if (callback && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function getEvents_() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Non trovo un foglio chiamato "' + SHEET_NAME + '".');
    const values = sheet.getDataRange().getDisplayValues();
    if (values.length < 2) return { ok: true, events: [] };
    const headers = values[0].map(h => String(h).trim().toLowerCase());
    const rows = values.slice(1);
    const events = rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i] || "");
      return {
        id: obj.id,
        published: obj.pubblicato,
        date: normalizeDate_(obj.data),
        endDate: normalizeDate_(obj.data_fine),
        startTime: normalizeTime_(obj.ora_inizio),
        endTime: normalizeTime_(obj.ora_fine),
        title: obj.titolo,
        category: obj.categoria,
        description: obj.descrizione,
        location: obj.luogo,
        imageUrl: obj.immagine,
        infoUrl: obj.link_info,
        subtitle: obj.sottotitolo,
        artist: obj.sottotitolo // compatibilità con la versione del sito già pubblicata
      };
    }).filter(ev => String(ev.published).trim().toUpperCase() === "SI" && ev.title && ev.date);
    events.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    return { ok: true, events: events };
  } catch (err) {
    return { ok: false, error: String(err), events: [] };
  }
}

function normalizeDate_(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  // Recommended sheet format: yyyy-MM-dd. Also accepts dd/MM/yyyy.
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return m[1] + "-" + String(m[2]).padStart(2,"0") + "-" + String(m[3]).padStart(2,"0");
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return m[3] + "-" + String(m[2]).padStart(2,"0") + "-" + String(m[1]).padStart(2,"0");
  return "";
}
function normalizeTime_(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  return m ? String(m[1]).padStart(2,"0") + ":" + m[2] : "";
}
