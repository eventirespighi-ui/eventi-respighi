(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const state = {
    events: [], category: "Tutti",
    archiveOpen: false
  };
  const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const dayNames = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const parseDate = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    return m ? new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), 12) : null;
  };
  const fmtDate = (d) => `${String(d.getDate()).padStart(2,"0")} ${monthNames[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
  const isPast = (e) => {
    const d = parseDate(e.date); if (!d) return false;
    const [h,m] = (e.endTime || e.startTime || "23:59").split(":").map(Number);
    d.setHours(h || 23, m || 59, 0, 0);
    return d < new Date();
  };
  const categoryOf = (s) => {
    const v = String(s || "").trim().toLowerCase();
    if (v.includes("concert")) return "Concerti";
    if (v.includes("master")) return "Masterclass";
    if (v.includes("semin")) return "Seminari";
    return "Altri eventi";
  };
  function calendarUrl(e) {
    const d = e.date.replaceAll("-","");
    const start = d + (e.startTime || "00:00").replace(":","") + "00";
    let endDate = (e.endDate || e.date).replaceAll("-","");
    let endTime = e.endTime || (e.startTime ? addHour(e.startTime) : "01:00");
    const end = endDate + endTime.replace(":","") + "00";
    const params = new URLSearchParams({
      action:"TEMPLATE", text:e.title, dates:`${start}/${end}`,
      details:[e.description || "", e.infoUrl || ""].filter(Boolean).join("\n\n"),
      location:e.location || ""
    });
    return "https://calendar.google.com/calendar/render?" + params.toString();
  }
  function addHour(t) {
    const [h,m] = t.split(":").map(Number);
    return `${String((h+1)%24).padStart(2,"0")}:${String(m||0).padStart(2,"0")}`;
  }
  function icsEscape(s) { return String(s || "").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;"); }
  function downloadICS(e) {
    const startDate = e.date.replaceAll("-","");
    const endDate = (e.endDate || e.date).replaceAll("-","");
    const start = startDate + "T" + (e.startTime || "0000").replace(":","") + "00";
    const end = endDate + "T" + (e.endTime || (e.startTime ? addHour(e.startTime) : "0100")).replace(":","") + "00";
    const stamp = new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Conservatorio Respighi//Eventi//IT","CALSCALE:GREGORIAN","BEGIN:VEVENT",
      `UID:${icsEscape(e.id || start + e.title)}@eventi-respighi`,
      `DTSTAMP:${stamp}`,`DTSTART;TZID=Europe/Rome:${start}`,`DTEND;TZID=Europe/Rome:${end}`,
      `SUMMARY:${icsEscape(e.title)}`,`DESCRIPTION:${icsEscape(e.description || "")}`,
      `LOCATION:${icsEscape(e.location || "")}`,"END:VEVENT","END:VCALENDAR"];
    const blob = new Blob([lines.join("\r\n")], {type:"text/calendar;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${(e.title || "evento").toLowerCase().replace(/[^a-z0-9]+/g,"-")}.ics`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function eventMarkup(e, compact=false) {
    const d = parseDate(e.date);
    const dateText = d ? fmtDate(d) : e.date;
    const category = categoryOf(e.category);
    const categoryLabel = category === "Concerti" ? "Concerto" : category === "Seminari" ? "Seminario" : category;
    const desc = e.description ? `<div class="event-description">${esc(e.description)}</div>` : "";
    const image = e.imageUrl && /^https?:\/\//i.test(e.imageUrl) ? `<img class="event-image" src="${esc(e.imageUrl)}" alt="Locandina: ${esc(e.title)}" loading="lazy">` : "";
    const info = e.infoUrl && /^https?:\/\//i.test(e.infoUrl) ? `<a class="event-action" href="${esc(e.infoUrl)}" target="_blank" rel="noopener">DETTAGLI ↗</a>` : "";
    return `<article class="event-item">
      ${image}
      <div class="event-date">${esc(dateText)}<span class="weekday">${d ? dayNames[d.getDay()] : ""}</span></div>
      <div class="event-main">
        <div class="event-category${category === "Concerti" || category === "Masterclass" || category === "Seminari" ? " extended-category" : ""}">${esc(categoryLabel)}</div>
        <h2 class="event-title">${esc(e.title)}</h2>
        ${e.subtitle ? `<p class="event-subtitle">${esc(e.subtitle)}</p>` : ""}
        ${e.description ? `<button class="event-action description-toggle" type="button" aria-expanded="false">DESCRIZIONE <span aria-hidden="true">＋</span></button><div class="description-panel hidden">${desc}</div>` : ""}
      </div>
      <div class="event-side">
        ${e.startTime ? `<div class="event-meta">ORE ${esc(e.startTime)}${e.endTime ? " — " + esc(e.endTime) : ""}</div>` : ""}
        ${e.location ? `<div class="event-meta">${esc(e.location)}</div>` : ""}
        <div class="event-actions">
          <a class="event-action" href="${esc(calendarUrl(e))}" target="_blank" rel="noopener">+ GOOGLE CALENDAR</a>
          <button class="event-action ics-button" type="button" data-event-id="${esc(e.id)}">+ APPLE / .ICS</button>
          ${info}
        </div>
      </div>
    </article>`;
  }
  function visibleEvents() {
    return state.events.filter(e => state.category === "Tutti" || categoryOf(e.category) === state.category);
  }
  function renderFeed() {
    const future = visibleEvents().filter(e => !isPast(e)).sort((a,b) => a.date.localeCompare(b.date) || (a.startTime||"").localeCompare(b.startTime||""));
    $("events-list").innerHTML = future.map(e => eventMarkup(e)).join("");
    $("empty-state").classList.toggle("hidden", future.length > 0);
    $("status").textContent = `${future.length} ${future.length === 1 ? "EVENTO IN PROGRAMMA" : "EVENTI IN PROGRAMMA"}`;
    const past = visibleEvents().filter(isPast).sort((a,b) => b.date.localeCompare(a.date));
    $("archive-list").innerHTML = past.length ? past.map(e => eventMarkup(e,true)).join("") : `<p class="empty-state">Nessun evento archiviato in questa selezione.</p>`;
    bindICS();
    bindDescriptions();
  }
  function bindDescriptions() {
    document.querySelectorAll(".description-toggle").forEach(btn => btn.addEventListener("click", () => {
      const panel = btn.nextElementSibling;
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("hidden", !open);
      btn.querySelector("span").textContent = open ? "−" : "＋";
    }));
  }
  function bindICS() {
    document.querySelectorAll(".ics-button").forEach(btn => btn.addEventListener("click", () => {
      const e = state.events.find(x => String(x.id) === btn.dataset.eventId);
      if (e) downloadICS(e);
    }));
  }
  function setCategory(category) {
    state.category = category;
    document.querySelectorAll(".filter-button").forEach(b=>b.classList.toggle("active",b.dataset.category===category));
    renderFeed();
  }
  function normalize(row) {
    return {
      id:String(row.id || ""), title:String(row.title || "").trim(), date:String(row.date || "").trim(),
      endDate:String(row.endDate || "").trim(), startTime:String(row.startTime || "").trim(),
      endTime:String(row.endTime || "").trim(), category:String(row.category || "Altri eventi"),
      description:String(row.description || ""), location:String(row.location || ""),
      imageUrl:String(row.imageUrl || ""), infoUrl:String(row.infoUrl || ""), subtitle:String(row.subtitle || "")
    };
  }
  function loadEvents() {
    const url = window.EVENTS_CONFIG && window.EVENTS_CONFIG.apiUrl;
    if (!url || url.includes("INCOLLA_QUI")) {
      $("status").textContent = "CONFIGURAZIONE NECESSARIA: collega il foglio Google per caricare gli eventi.";
      return;
    }
    const callback = "respighiEventsCallback";
    window[callback] = (payload) => {
      delete window[callback];
      if (!payload || !payload.ok || !Array.isArray(payload.events)) {
        $("status").textContent = "Non è stato possibile caricare gli eventi. Controlla la configurazione.";
        return;
      }
      state.events = payload.events.map(normalize).filter(e=>e.title && parseDate(e.date));
      renderFeed();
    };
    const script = document.createElement("script");
    script.src = `${url}${url.includes("?")?"&":"?"}callback=${callback}&t=${Date.now()}`;
    script.onerror = () => { $("status").textContent = "Errore di collegamento al database. Riprova più tardi."; };
    document.body.appendChild(script);
  }
  $("filters").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(b)setCategory(b.dataset.category);});
  $("archive-toggle").addEventListener("click",()=>{
    state.archiveOpen=!state.archiveOpen;
    $("archive-content").classList.toggle("hidden",!state.archiveOpen);
    $("archive-toggle").setAttribute("aria-expanded",String(state.archiveOpen));
    $("archive-symbol").textContent=state.archiveOpen?"−":"＋";
  });
  loadEvents();
})();
