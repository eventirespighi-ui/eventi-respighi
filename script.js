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
          <button class="event-action share-toggle" type="button" aria-expanded="false">CONDIVIDI <span aria-hidden="true">＋</span></button>
          <div class="share-options hidden" role="group" aria-label="Scegli il formato di condivisione">
            <button class="share-format" type="button" data-event-id="${esc(e.id)}" data-format="story">STORIA</button>
            <button class="share-format" type="button" data-event-id="${esc(e.id)}" data-format="post">POST</button>
            <span class="share-status" role="status" aria-live="polite"></span>
          </div>
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
    bindShare();
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
  function bindShare() {
    document.querySelectorAll(".share-toggle").forEach(btn => btn.addEventListener("click", () => {
      const panel = btn.nextElementSibling;
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("hidden", !open);
      btn.querySelector("span").textContent = open ? "−" : "＋";
    }));
    document.querySelectorAll(".share-format").forEach(btn => btn.addEventListener("click", async () => {
      const event = state.events.find(item => String(item.id) === btn.dataset.eventId);
      if (!event) return;
      const panel = btn.closest(".share-options");
      const status = panel.querySelector(".share-status");
      const buttons = panel.querySelectorAll(".share-format");
      buttons.forEach(button => { button.disabled = true; });
      status.textContent = "Preparo l’immagine…";
      try {
        const blob = await createShareImage(event, btn.dataset.format);
        const filename = `${fileSlug(event.title)}-${btn.dataset.format}.png`;
        const file = typeof File === "function" ? new File([blob], filename, {type:"image/png"}) : null;
        const shareText = [shareCategory(event.category), fmtDate(parseDate(event.date)), event.startTime ? `ore ${event.startTime}` : ""].filter(Boolean).join(" · ");
        let canShareFile = false;
        try { canShareFile = Boolean(file && navigator.share && navigator.canShare && navigator.canShare({files:[file]})); } catch (_) {}
        if (canShareFile) {
          try {
            await navigator.share({files:[file], title:event.title, text:shareText, url:sharePageUrl()});
            status.textContent = "Menu di condivisione completato.";
            return;
          } catch (error) {
            if (error && error.name === "AbortError") {
              status.textContent = "Condivisione annullata.";
              return;
            }
          }
        }
        downloadBlob(blob, filename);
        let copied = false;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(sharePageUrl());
            copied = true;
          }
        } catch (_) {}
        status.textContent = copied ? "Immagine scaricata; link copiato." : "Immagine scaricata. Condividila dal social scelto.";
      } catch (error) {
        status.textContent = "Non riesco a preparare l’immagine. Riprova.";
      } finally {
        buttons.forEach(button => { button.disabled = false; });
      }
    }));
  }
  function shareCategory(category) {
    const label = categoryOf(category);
    return (label === "Concerti" ? "Concerto" : label === "Seminari" ? "Seminario" : label).toLowerCase();
  }
  function sharePageUrl() {
    const localHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    return window.location.protocol === "file:" || localHost
      ? "https://eventirespighi-ui.github.io/eventi-respighi/"
      : window.location.href.split("#")[0];
  }
  function fileSlug(value) {
    return String(value || "evento").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "evento";
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function loadShareLogo() {
    return new Promise(resolve => {
      const logo = new Image();
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      };
      const timeout = setTimeout(() => finish(null), 2000);
      logo.onload = () => finish(logo);
      logo.onerror = () => finish(null);
      logo.src = new URL("logo-respighi.svg", document.baseURI).href;
    });
  }
  function drawWrappedText(ctx, value, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(value || "").trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) {
      let last = visible[visible.length - 1];
      while (last.length && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      visible[visible.length - 1] = `${last}…`;
    }
    visible.forEach((text, index) => ctx.fillText(text, x, y + index * lineHeight));
    return y + visible.length * lineHeight;
  }
  async function createShareImage(event, format) {
    const story = format === "story";
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = story ? 1920 : 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas non disponibile");
    const colors = getComputedStyle(document.documentElement);
    const background = colors.getPropertyValue("--green").trim() || "#EB5B3B";
    const foreground = "#FFFFFF";
    const soft = foreground;
    const red = colors.getPropertyValue("--red").trim() || "#E30613";
    const padding = 88;
    const titleSize = story ? 78 : 64;
    const titleLine = story ? 92 : 76;
    const detailSize = story ? 40 : 34;

    ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = foreground;
    ctx.font = "700 28px Manrope, Arial, sans-serif";
    ctx.fillText("STAGIONE 2026 / 2027", padding, 154);
    const logo = await loadShareLogo();
    if (logo) {
      const logoHeight = 224;
      const ratio = (logo.naturalWidth || 1) / (logo.naturalHeight || 1);
      const logoWidth = Math.min(448, logoHeight * ratio);
      ctx.drawImage(logo, canvas.width - padding - logoWidth, 24, logoWidth, logoHeight);
    }
    ctx.globalAlpha = .45; ctx.fillRect(padding, 292, canvas.width - padding * 2, 2); ctx.globalAlpha = 1;

    let y = story ? 420 : 360;
    ctx.fillStyle = foreground;
    await Promise.race([
      Promise.all([
        document.fonts.load(`700 ${story ? 44 : 38}px "Helvetica Neue LT Pro Extended"`),
        document.fonts.load(`600 ${story ? 30 : 26}px "Helvetica Neue LT Pro Extended"`),
        document.fonts.load(`800 ${titleSize}px Manrope`)
      ]).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 1500))
    ]);
    ctx.font = `700 ${story ? 44 : 38}px "Helvetica Neue LT Pro Extended", Arial, sans-serif`;
    ctx.fillText(shareCategory(event.category), padding, y);
    y += story ? 94 : 78;

    ctx.fillStyle = foreground;
    ctx.font = `800 ${titleSize}px Manrope, Arial, sans-serif`;
    y = drawWrappedText(ctx, event.title, padding, y, canvas.width - padding * 2, titleLine, 3);
    y += story ? 26 : 16;
    if (event.subtitle) {
      ctx.fillStyle = foreground;
      ctx.font = `500 ${story ? 42 : 34}px Manrope, Arial, sans-serif`;
      y = drawWrappedText(ctx, event.subtitle, padding, y, canvas.width - padding * 2, story ? 54 : 44, 2) + (story ? 38 : 26);
    }

    ctx.fillStyle = red; ctx.fillRect(padding, y, 92, 8); y += story ? 88 : 68;
    const date = parseDate(event.date);
    ctx.fillStyle = foreground;
    ctx.font = `700 ${detailSize}px Manrope, Arial, sans-serif`;
    const dateText = date ? fmtDate(date) : event.date;
    y = drawWrappedText(ctx, dateText, padding, y, canvas.width - padding * 2, detailSize + 14, 1);
    if (date) {
      const dateWidth = ctx.measureText(dateText).width;
      ctx.fillStyle = soft;
      ctx.font = `600 ${story ? 30 : 26}px "Helvetica Neue LT Pro Extended", Arial, sans-serif`;
      ctx.fillText(dayNames[date.getDay()].toLowerCase(), padding + dateWidth + 18, y - (detailSize + 14));
    }
    y += (story ? 30 : 20);
    if (event.startTime) {
      ctx.fillStyle = foreground;
      ctx.font = `700 ${detailSize}px Manrope, Arial, sans-serif`;
      y = drawWrappedText(ctx, `ORE ${event.startTime}${event.endTime ? ` — ${event.endTime}` : ""}`, padding, y, canvas.width - padding * 2, detailSize + 12, 1) + (story ? 26 : 16);
    }
    if (event.location) {
      ctx.fillStyle = soft;
      ctx.font = `500 ${detailSize}px Manrope, Arial, sans-serif`;
      y = drawWrappedText(ctx, event.location, padding, y, canvas.width - padding * 2, detailSize + 12, 2) + (story ? 30 : 20);
    }
    if (event.description) {
      ctx.fillStyle = foreground;
      ctx.font = `400 ${story ? 32 : 27}px Manrope, Arial, sans-serif`;
      y = drawWrappedText(ctx, event.description, padding, y, canvas.width - padding * 2, story ? 46 : 38, story ? 5 : 3);
    }

    const footerY = canvas.height - (story ? 110 : 82);
    ctx.globalAlpha = .45; ctx.fillRect(padding, footerY - 38, canvas.width - padding * 2, 2); ctx.globalAlpha = 1;
    ctx.fillStyle = foreground;
    ctx.font = `700 ${story ? 24 : 20}px Manrope, Arial, sans-serif`;
    ctx.fillText("CONSERVATORIO OTTORINO RESPIGHI · VIA EZIO 32, LATINA", padding, footerY);
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Esportazione immagine non riuscita")), "image/png"));
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
