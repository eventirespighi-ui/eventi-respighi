(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const state = {
    events: [], category: "Tutti", view: "feed",
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    archiveOpen: false
  };
  const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const dayNames = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
  const shortDays = ["LUN","MAR","MER","GIO","VEN","SAB","DOM"];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const parseDate = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    return m ? new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), 12) : null;
  };
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const fmtDate = (d) => `${String(d.getDate()).padStart(2,"0")} ${monthNames[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
  const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
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
    const desc = e.description ? `<div class="event-description">${esc(e.description)}</div>` : "";
    const image = e.imageUrl && /^https?:\/\//i.test(e.imageUrl) ? `<img class="event-image" src="${esc(e.imageUrl)}" alt="Locandina: ${esc(e.title)}" loading="lazy">` : "";
    const info = e.infoUrl && /^https?:\/\//i.test(e.infoUrl) ? `<a class="event-action" href="${esc(e.infoUrl)}" target="_blank" rel="noopener">DETTAGLI ↗</a>` : "";
    return `<article class="event-item">
      <div class="event-date">${esc(dateText)}<span class="weekday">${d ? dayNames[d.getDay()].toUpperCase() : ""}</span></div>
      <div class="event-main">
        <div class="event-category">${esc(categoryOf(e.category))}</div>
        <h2 class="event-title">${esc(e.title)}</h2>${desc}${image}
      </div>
      <div class="event-side">
        ${e.startTime ? `<div class="event-meta">ORE ${esc(e.startTime)}${e.endTime ? " — " + esc(e.endTime) : ""}</div>` : ""}
        ${e.location ? `<div class="event-meta">${esc(e.location)}</div>` : ""}
        ${e.artist ? `<div class="event-meta">${esc(e.artist)}</div>` : ""}
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
  }
  function bindICS() {
    document.querySelectorAll(".ics-button").forEach(btn => btn.addEventListener("click", () => {
      const e = state.events.find(x => String(x.id) === btn.dataset.eventId);
      if (e) downloadICS(e);
    }));
  }
  function renderMonth() {
    const year = state.month.getFullYear(), month = state.month.getMonth();
    $("month-title").textContent = `${monthNames[month]} ${year}`;
    const first = new Date(year,month,1), offset = (first.getDay()+6)%7;
    const start = new Date(year,month,1-offset);
    let html = shortDays.map(d => `<div class="calendar-cell heading">${d}</div>`).join("");
    for (let i=0;i<42;i++) {
      const d = new Date(start); d.setDate(start.getDate()+i);
      const key = dateKey(d), dayEvents = visibleEvents().filter(e=>e.date===key);
      const cls = ["calendar-cell", d.getMonth()!==month?"other-month":"", dateKey(today())===key?"today":""].join(" ");
      html += `<div class="${cls}"><span class="calendar-day">${d.getDate()}</span>${dayEvents.slice(0,2).map(e=>`<span class="calendar-dot">${esc(e.title)}</span>`).join("")}${dayEvents.length>2?`<span class="calendar-dot">+${dayEvents.length-2}</span>`:""}</div>`;
    }
    $("calendar-grid").innerHTML = html;
    const monthEvents = visibleEvents().filter(e=>{const d=parseDate(e.date); return d && d.getFullYear()===year && d.getMonth()===month;}).sort((a,b)=>a.date.localeCompare(b.date)||(a.startTime||"").localeCompare(b.startTime||""));
    $("calendar-events").innerHTML = monthEvents.length ? `<h3>APPUNTAMENTI DEL MESE</h3>${monthEvents.map(e=>`<a class="calendar-event-link" href="${esc(e.infoUrl || "#")}" ${e.infoUrl?'target="_blank" rel="noopener"':""}>${esc(fmtDate(parseDate(e.date)))} · ${esc(e.startTime || "")} — ${esc(e.title)}</a>`).join("")}` : `<p class="event-meta">Nessun appuntamento in questo mese.</p>`;
  }
  function setView(view) {
    state.view = view;
    $("feed-view").classList.toggle("hidden",view!=="feed");
    $("month-view").classList.toggle("hidden",view!=="month");
    $("feed-view-button").classList.toggle("active",view==="feed");
    $("month-view-button").classList.toggle("active",view==="month");
    if (view==="month") renderMonth();
  }
  function setCategory(category) {
    state.category = category;
    document.querySelectorAll(".filter-button").forEach(b=>b.classList.toggle("active",b.dataset.category===category));
    renderFeed(); if(state.view==="month") renderMonth();
  }
  function normalize(row) {
    return {
      id:String(row.id || ""), title:String(row.title || "").trim(), date:String(row.date || "").trim(),
      endDate:String(row.endDate || "").trim(), startTime:String(row.startTime || "").trim(),
      endTime:String(row.endTime || "").trim(), category:String(row.category || "Altri eventi"),
      description:String(row.description || ""), location:String(row.location || ""),
      imageUrl:String(row.imageUrl || ""), infoUrl:String(row.infoUrl || ""), artist:String(row.artist || "")
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
      renderFeed(); renderMonth();
    };
    const script = document.createElement("script");
    script.src = `${url}${url.includes("?")?"&":"?"}callback=${callback}&t=${Date.now()}`;
    script.onerror = () => { $("status").textContent = "Errore di collegamento al database. Riprova più tardi."; };
    document.body.appendChild(script);
  }
  $("feed-view-button").addEventListener("click",()=>setView("feed"));
  $("month-view-button").addEventListener("click",()=>setView("month"));
  $("filters").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(b)setCategory(b.dataset.category);});
  $("prev-month").addEventListener("click",()=>{state.month.setMonth(state.month.getMonth()-1);renderMonth();});
  $("next-month").addEventListener("click",()=>{state.month.setMonth(state.month.getMonth()+1);renderMonth();});
  $("archive-toggle").addEventListener("click",()=>{
    state.archiveOpen=!state.archiveOpen;
    $("archive-content").classList.toggle("hidden",!state.archiveOpen);
    $("archive-toggle").setAttribute("aria-expanded",String(state.archiveOpen));
    $("archive-symbol").textContent=state.archiveOpen?"−":"＋";
  });
  loadEvents();
})();