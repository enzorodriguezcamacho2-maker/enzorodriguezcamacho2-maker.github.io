// ================== APPS: CALENDARIO, MAPA Y ACCESOS ==================

// ---------- Paneles a pantalla completa ----------
function panelAbrir(id) {
  document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== id; });
  $("app").classList.add("con-panel");
}
function panelCerrar() {
  document.querySelectorAll(".panel").forEach((p) => { p.hidden = true; });
  $("app").classList.remove("con-panel");
}
document.querySelectorAll(".panel").forEach((p) => {
  // Que la barra espaciadora y las teclas no activen el micro mientras escribes en un panel
  p.addEventListener("keydown", (e) => { if (e.key !== "Escape") e.stopPropagation(); });
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") panelCerrar(); });

const pad2 = (x) => String(x).padStart(2, "0");
const capital = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// ================== CALENDARIO ==================
const CAL_KEY = "jarvisCal";
const DIAS_SEM = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_N = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const MESES_RE = "(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)";

const calLeer = () => { try { return JSON.parse(localStorage.getItem(CAL_KEY) || "[]"); } catch (e) { return []; } };
function calGuardar(l) {
  localStorage.setItem(CAL_KEY, JSON.stringify(l));
  calPintarTile();
  if (!$("panelCal").hidden) calPintar();
}
const fechaISO = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
const deISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const hoy0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fechaLarga = (d) => DIAS_SEM[d.getDay()] + ", " + d.getDate() + " de " + MESES[d.getMonth()];
const fechaCorta = (d) => DIAS_SEM[d.getDay()].slice(0, 3) + " " + d.getDate();

function calColor(t) {
  const n = quitarTildes((t || "").toLowerCase());
  if (/examen|control|prueba|entrega|recuperacion/.test(n)) return "#ff5e8a";
  if (/cumple|fiesta|cena|quedada|boda/.test(n)) return "#ffb547";
  if (/medico|dentista|hospital|cita|vacuna/.test(n)) return "#3ddc97";
  if (/partido|futbol|entreno|gimnasio|gym/.test(n)) return "#5ee7ff";
  if (/trabajo|reunion|presupuesto|obra|cliente/.test(n)) return "#f7d154";
  return "#8b7bff";
}

// Saca fecha, hora y título de una frase: "el 29 a las 10 examen de mates"
function calParsear(texto) {
  let r = " " + texto + " ", m, fecha = null, hora = "";
  const quitar = (mm) => { r = r.replace(mm[0], " "); };

  m = r.match(/\s(?:a|sobre|para|hacia)\s+las?\s+(\d{1,2})(?:[:.h](\d{2}))?(?:\s+y\s+(media|cuarto))?(?:\s+(de\s+la\s+ma[ñn]ana|de\s+la\s+tarde|de\s+la\s+noche|am|pm))?(?=\s)/i);
  let hh = null, mi = 0, per = "";
  if (m) { hh = +m[1]; mi = m[2] ? +m[2] : m[3] === "media" ? 30 : m[3] === "cuarto" ? 15 : 0; per = (m[4] || "").toLowerCase(); }
  else if ((m = r.match(/\s(\d{1,2}):(\d{2})(?=\s)/))) { hh = +m[1]; mi = +m[2]; per = "24h"; }
  if (m && hh !== null) {
    if (/tarde|noche|pm/.test(per) && hh < 12) hh += 12;
    else if (!per && hh >= 1 && hh <= 7) hh += 12;
    if (hh < 24 && mi < 60) { hora = pad2(hh) + ":" + pad2(mi); quitar(m); }
  }

  const hoy = hoy0();
  if ((m = r.match(/\spasado\s+ma[ñn]ana(?=\s)/i))) { fecha = sumarDias(hoy, 2); quitar(m); }
  else if ((m = r.match(/\shoy(?=\s)/i))) { fecha = hoy; quitar(m); }
  else if ((m = r.match(/\sma[ñn]ana(?=\s)/i))) { fecha = sumarDias(hoy, 1); quitar(m); }
  else if ((m = r.match(new RegExp("\\s(?:el\\s+)?(?:d[ií]a\\s+)?(\\d{1,2})\\s+de\\s+" + MESES_RE + "(?:\\s+(?:de\\s+|del\\s+)?(\\d{4}))?(?=\\s)", "i")))) {
    let mes = m[2].toLowerCase(); mes = mes === "setiembre" ? 8 : MESES.indexOf(mes);
    const y = m[3] ? +m[3] : hoy.getFullYear();
    fecha = new Date(y, mes, +m[1]);
    if (fecha.getDate() !== +m[1]) fecha = null;
    else { if (!m[3] && fecha < hoy) fecha.setFullYear(y + 1); quitar(m); }
  }
  else if ((m = r.match(/\s(?:el\s+)?(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?(?=\s)/))) {
    let y = m[3] ? +m[3] : hoy.getFullYear(); if (y < 100) y += 2000;
    fecha = new Date(y, +m[2] - 1, +m[1]);
    if (fecha.getDate() !== +m[1]) fecha = null;
    else { if (!m[3] && fecha < hoy) fecha.setFullYear(y + 1); quitar(m); }
  }
  else if ((m = r.match(/\s(el\s+|este\s+)?(pr[oó]ximo\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)(\s+que\s+viene)?(?=\s)/i))) {
    const dia = DIAS_N.indexOf(quitarTildes(m[3].toLowerCase()));
    let dd = (dia - hoy.getDay() + 7) % 7;
    if (dd === 0 && !/este/i.test(m[1] || "")) dd = 7;
    fecha = sumarDias(hoy, dd); quitar(m);
  }
  else if ((m = r.match(/\s(?:el\s+(?:d[ií]a\s+)?|d[ií]a\s+)(\d{1,2})(?=\s)/i))) {
    const d = +m[1];
    if (d >= 1 && d <= 31) {
      fecha = new Date(hoy.getFullYear(), hoy.getMonth(), d);
      if (fecha < hoy || fecha.getDate() !== d) { fecha = new Date(hoy.getFullYear(), hoy.getMonth() + 1, d); }
      if (fecha.getDate() !== d) fecha = null; else quitar(m);
    }
  }

  // Limpia el título
  let titulo = r.replace(/\s+/g, " ").trim();
  const inicio = /^(?:,|:|-|que|tengo|tienes|hay|de|del|el|la|para|en|un|una|y)\s+/i;
  const fin = /\s+(?:,|el|la|a|las|de|del|en|para|y)$/i;
  for (let i = 0; i < 6; i++) titulo = titulo.replace(inicio, "").replace(fin, "").replace(/^[,:\-\s]+|[,:\-\s]+$/g, "");
  return { fecha, hora, titulo: capital(titulo) };
}

const calMomento = (e) => { const d = deISO(e.fecha); const [h, mi] = (e.hora || "09:00").split(":").map(Number); d.setHours(h, mi, 0, 0); return d.getTime(); };
const calOrden = (a, b) => (a.fecha + (a.hora || "00:00")).localeCompare(b.fecha + (b.hora || "00:00"));

function calAnadir(p) {
  const ev = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fecha: fechaISO(p.fecha), hora: p.hora || "", titulo: p.titulo || "Evento" };
  if (calMomento(ev) <= Date.now()) ev.avisado = true;
  const l = calLeer(); l.push(ev); l.sort(calOrden); calGuardar(l);
  calSel = ev.fecha; calVista = new Date(p.fecha.getFullYear(), p.fecha.getMonth(), 1);
  const cuando = fechaLarga(p.fecha) + (ev.hora ? " a las " + ev.hora : "");
  nodoCalAnadir(ev);
  responder("📅 Apuntado en tu calendario", ev.titulo + "\n" + capital(cuando), {
    voz: "Apuntado: " + ev.titulo + ", el " + cuando,
    botones: [
      { texto: "Ver calendario", accion: () => calAbrir() },
      { texto: "Deshacer", accion: () => { calGuardar(calLeer().filter((x) => x.id !== ev.id)); responder("🗑 Quitado", ev.titulo + " ya no está en tu calendario."); } }
    ]
  });
  return ev;
}

function calAnadirTexto(s) {
  const p = calParsear(s);
  if (!p.fecha) {
    responder("📅 ¿Qué día?", "No he pillado la fecha. Prueba así:\n• «apunta el 29 examen de mates»\n• «ponme en el calendario mañana a las 5 dentista»\n• «el viernes tengo partido»", { voz: "¿Qué día? Dímelo con la fecha." });
    return;
  }
  calAnadir(p);
}

function calTexto(lista, mostrarDia) {
  return lista.map((e) => "• " + (mostrarDia ? capital(fechaCorta(deISO(e.fecha))) + " · " : "") + (e.hora || "Todo el día") + " · " + e.titulo).join("\n");
}

function calConsultar(resto) {
  const r = (resto || "").trim(), hoy = hoy0(), l = calLeer();
  let desde = hoy, hasta = sumarDias(hoy, 6), titulo = "Próximos 7 días";
  if (/semana que viene|proxima semana/.test(r)) {
    const lunes = sumarDias(hoy, ((8 - hoy.getDay()) % 7) || 7);
    desde = lunes; hasta = sumarDias(lunes, 6); titulo = "La semana que viene";
  } else if (/semana/.test(r)) { titulo = "Esta semana"; }
  else if (/mes/.test(r)) { hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); titulo = "Lo que queda de mes"; }
  else if (r) {
    const p = calParsear(r);
    if (p.fecha) { desde = hasta = p.fecha; titulo = capital(fechaLarga(p.fecha)); }
  }
  const a = fechaISO(desde), b = fechaISO(hasta);
  const ev = l.filter((e) => e.fecha >= a && e.fecha <= b).sort(calOrden);
  const unDia = a === b;
  const btn = [{ texto: "Abrir calendario", accion: () => { calSel = a; calVista = new Date(desde.getFullYear(), desde.getMonth(), 1); calAbrir(); } }];
  if (!ev.length) return responder("📅 " + titulo, "Nada apuntado. ¡Libre!", { voz: unDia ? "No tienes nada ese día." : "No tienes nada apuntado.", botones: btn });
  responder("📅 " + titulo, calTexto(ev, !unDia), {
    voz: "Tienes " + ev.length + (ev.length === 1 ? " cosa: " : " cosas: ") + ev.map((e) => e.titulo).join(", "),
    botones: btn
  });
}

// ---- Panel del calendario ----
let calVista = new Date(); calVista.setDate(1);
let calSel = fechaISO(new Date());

function calPintar() {
  const l = calLeer(), porDia = {};
  l.forEach((e) => { (porDia[e.fecha] = porDia[e.fecha] || []).push(e); });
  const y = calVista.getFullYear(), mm = calVista.getMonth();
  $("calMes").textContent = capital(MESES[mm]) + " " + y;
  const g = $("calGrid"); g.innerHTML = "";
  ["L", "M", "X", "J", "V", "S", "D"].forEach((d) => { const s = document.createElement("span"); s.className = "dow"; s.textContent = d; g.append(s); });
  const off = (new Date(y, mm, 1).getDay() + 6) % 7, total = new Date(y, mm + 1, 0).getDate(), hoyISO = fechaISO(new Date());
  for (let i = 0; i < off; i++) { const v = document.createElement("span"); v.className = "calcell vacia"; g.append(v); }
  for (let d = 1; d <= total; d++) {
    const iso = y + "-" + pad2(mm + 1) + "-" + pad2(d), dow = new Date(y, mm, d).getDay();
    const b = document.createElement("button");
    b.className = "calcell" + (iso === hoyISO ? " hoy" : "") + (iso === calSel ? " sel" : "") + (dow === 0 || dow === 6 ? " finde" : "");
    const num = document.createElement("span"); num.textContent = d; b.append(num);
    const dots = document.createElement("span"); dots.className = "dots";
    (porDia[iso] || []).slice(0, 3).forEach((e) => { const i = document.createElement("i"); i.style.setProperty("--c", calColor(e.titulo)); dots.append(i); });
    b.append(dots);
    b.addEventListener("click", () => { calSel = iso; calPintar(); });
    g.append(b);
  }
  // Lista del día elegido
  const dSel = deISO(calSel);
  $("calDiaTxt").textContent = (calSel === hoyISO ? "Hoy · " : "") + fechaLarga(dSel);
  const ul = $("calLista"); ul.innerHTML = "";
  const del = (porDia[calSel] || []).sort(calOrden);
  if (!del.length) {
    const li = document.createElement("li"); li.className = "vacio";
    li.textContent = "Nada planeado. Escríbelo abajo o di «apunta el " + dSel.getDate() + " examen de mates».";
    ul.append(li);
  }
  for (const e of del) {
    const li = document.createElement("li"); li.style.setProperty("--c", calColor(e.titulo));
    const t = document.createElement("span"); t.className = "ct"; t.textContent = e.hora || "Todo el día";
    const n = document.createElement("span"); n.className = "cn"; n.textContent = e.titulo;
    const x = document.createElement("button"); x.className = "cx"; x.title = "Borrar"; x.textContent = "✕";
    x.addEventListener("click", () => calGuardar(calLeer().filter((z) => z.id !== e.id)));
    li.append(t, n, x); ul.append(li);
  }
}

function calAbrir() { panelAbrir("panelCal"); calPintar(); }

$("calCerrar").addEventListener("click", panelCerrar);
$("calPrev").addEventListener("click", () => { calVista = new Date(calVista.getFullYear(), calVista.getMonth() - 1, 1); calPintar(); });
$("calNext").addEventListener("click", () => { calVista = new Date(calVista.getFullYear(), calVista.getMonth() + 1, 1); calPintar(); });
$("calHoy").addEventListener("click", () => { calVista = new Date(); calVista.setDate(1); calSel = fechaISO(new Date()); calPintar(); });
$("calForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const titulo = $("calTitulo").value.trim(); if (!titulo) return;
  const ev = { id: Date.now().toString(36), fecha: calSel, hora: $("calHora").value || "", titulo: capital(titulo) };
  if (calMomento(ev) <= Date.now()) ev.avisado = true;
  const l = calLeer(); l.push(ev); l.sort(calOrden); calGuardar(l);
  $("calTitulo").value = ""; $("calHora").value = "";
});

// Subtítulo del acceso "Calendario"
function calPintarTile() {
  const el = $("tileCalSub"); if (!el) return;
  const l = calLeer(), hoy = fechaISO(new Date()), sem = fechaISO(sumarDias(hoy0(), 6));
  const deHoy = l.filter((e) => e.fecha === hoy), semana = l.filter((e) => e.fecha >= hoy && e.fecha <= sem);
  el.textContent = deHoy.length ? "Hoy: " + deHoy[0].titulo : semana.length ? semana.length + " esta semana" : "Nada hoy";
  $("tileCal").classList.toggle("aviso", deHoy.length > 0);
}

// Avisos de eventos (a su hora, o a las 9:00 si es de todo el día)
function calRevisar() {
  const l = calLeer(), ahora = Date.now(); let cambio = false;
  for (const e of l) {
    if (e.avisado) continue;
    const at = calMomento(e);
    if (at <= ahora) {
      e.avisado = true; cambio = true;
      if (ahora - at < 6 * 3600e3) {
        avisar("📅 " + e.titulo, e.hora ? "Ahora · " + e.hora : "Hoy");
        responder("📅 " + (e.hora ? "Es la hora" : "Hoy tienes"), (e.hora ? e.hora + " · " : "") + e.titulo, { voz: (e.hora ? "Es la hora de: " : "Hoy tienes: ") + e.titulo });
      }
    }
  }
  if (cambio) calGuardar(l);
}
setInterval(calRevisar, 20000);
setTimeout(calRevisar, 1500);

// ================== MAPA ==================
let mapa = null, mini = null, capaMapa = null, capaMini = null, marca = null, cajaMini = null, satelite = false, leafletCarga = null;
const CAPAS = {
  oscuro: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap", sub: "abc" },
  sat: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "© Esri", sub: "" }
};

function cargarLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletCarga) return leafletCarga;
  leafletCarga = new Promise((ok, ko) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.append(css);
    const s = document.createElement("script"); s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => ok(); s.onerror = () => { leafletCarga = null; ko(new Error("leaflet")); };
    document.head.append(s);
  });
  return leafletCarga;
}

const capaDe = (c, extra) => L.tileLayer(c.url, Object.assign({ attribution: c.attr, maxZoom: 19, subdomains: c.sub || "abc" }, extra || {}));

// Mapa oscuro: invierte los colores de OSM con CSS; el satélite se ve normal
const aplicarTema = () => ["mapaMain", "mapaMini"].forEach((id) => $(id).classList.toggle("oscuro", !satelite));

async function mapaIniciar() {
  await cargarLeaflet();
  if (mapa) { mapa.invalidateSize(); mini.invalidateSize(); return; }
  mapa = L.map("mapaMain", { zoomControl: false, worldCopyJump: true }).setView([40.2, -3.7], 5);
  L.control.zoom({ position: "topright" }).addTo(mapa);
  capaMapa = capaDe(CAPAS.oscuro).addTo(mapa);
  mini = L.map("mapaMini", { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false }).setView([40.2, -3.7], 1);
  capaMini = capaDe(CAPAS.oscuro).addTo(mini);
  aplicarTema();
  cajaMini = L.rectangle(mapa.getBounds(), { color: "#5ee7ff", weight: 1.5, fillOpacity: 0.18, interactive: false }).addTo(mini);
  const sync = () => { mini.setView(mapa.getCenter(), Math.max(1, mapa.getZoom() - 3), { animate: false }); cajaMini.setBounds(mapa.getBounds()); };
  mapa.on("move zoom", sync); sync();
  mini.on("click", (e) => mapa.flyTo(e.latlng, Math.max(mapa.getZoom(), 6), { duration: 1.2 }));
}

function mapaInfo(nombre, dir, lat, lon) {
  $("mapaInfo").hidden = false;
  $("mapaNombre").textContent = nombre;
  $("mapaDir").textContent = dir || "";
  const q = lat != null ? lat + "," + lon : nombre;
  $("mapaRuta").href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(q);
  $("mapaGoogle").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  $("mapaRuta").hidden = $("mapaGoogle").hidden = !lat && lat !== 0 && !dir;
}

function mapaMarca(lat, lon) {
  if (marca) marca.remove();
  marca = L.marker([lat, lon], { icon: L.divIcon({ className: "pin", html: "<span></span>", iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(mapa);
}

function mapaAbrir() {
  panelAbrir("panelMapa");
  requestAnimationFrame(() => {
    mapaIniciar().then(() => { mapa.invalidateSize(); mini.invalidateSize(); })
      .catch(() => mapaInfo("Sin conexión", "No he podido cargar el mapa. Revisa internet."));
  });
}

async function mapaBuscar(q, callado) {
  q = (q || "").trim(); if (!q) return mapaAbrir();
  panelAbrir("panelMapa");
  $("mapaQ").value = q;
  mapaInfo("Buscando…", q);
  try {
    await new Promise((r) => requestAnimationFrame(r));
    await mapaIniciar();
    mapa.invalidateSize(); mini.invalidateSize();
    const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&q=" + encodeURIComponent(q));
    const j = await r.json();
    if (!j.length) { mapaInfo("Sin resultados", "No encuentro «" + q + "»."); if (!callado) hablar("No lo encuentro"); return; }
    const p = j[0], lat = +p.lat, lon = +p.lon, b = p.boundingbox.map(Number);
    const nombre = p.name || p.display_name.split(",")[0];
    mapa.flyToBounds([[b[0], b[2]], [b[1], b[3]]], { duration: 2.2, maxZoom: 16, padding: [40, 40] });
    mapaMarca(lat, lon);
    mapaInfo(nombre, p.display_name.split(",").slice(1, 4).join(",").trim(), lat, lon);
    if (!callado) hablar("Aquí tienes " + nombre);
  } catch (e) {
    mapaInfo("Sin conexión", "No he podido buscar ahora mismo.");
  }
}

$("mapaCerrar").addEventListener("click", panelCerrar);
$("mapaQ").addEventListener("keydown", (e) => { if (e.key === "Enter") mapaBuscar(e.target.value); });
$("mapaSat").addEventListener("click", () => {
  if (!mapa) return;
  satelite = !satelite;
  const c = satelite ? CAPAS.sat : CAPAS.oscuro;
  capaMapa.remove(); capaMapa = capaDe(c).addTo(mapa);
  capaMini.remove(); capaMini = capaDe(c).addTo(mini); cajaMini.bringToFront();
  $("mapaSat").classList.toggle("on", satelite);
  aplicarTema();
});
$("mapaYo").addEventListener("click", () => {
  if (!navigator.geolocation || !mapa) return;
  mapaInfo("Buscándote…", "");
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude: la, longitude: lo } = pos.coords;
    mapa.flyTo([la, lo], 15, { duration: 1.8 }); mapaMarca(la, lo);
    mapaInfo("Estás aquí", la.toFixed(4) + ", " + lo.toFixed(4), la, lo);
  }, () => mapaInfo("Sin ubicación", "No me has dado permiso para ver dónde estás."), { enableHighAccuracy: true, timeout: 10000 });
});

// ================== ÓRDENES DE VOZ ==================
function apps(t, n, o) {
  let m;
  if (memoria(t, n, o)) return true;
  if (typeof masComandos === "function" && masComandos(t, n, o)) return true;
  // Abrir paneles
  if (/^(?:abre|abrir|ver|ensename|muestrame|ensena|mira)?\s*(?:el\s+|mi\s+)?(?:calendario|agenda)$/.test(n)) { calAbrir(); return true; }
  if (/^(?:abre|abrir|ver|ensename|muestrame)?\s*(?:el\s+)?mapa$/.test(n)) { mapaAbrir(); return true; }

  // Consultar
  m = n.match(/^(?:que tengo|que hay en (?:mi |el )?(?:calendario|agenda)|que planes tengo|mis planes|mi agenda|agenda de|tengo algo)(.*)$/);
  if (m) { calConsultar(m[1]); return true; }

  // Borrar del calendario
  if (/calendario|agenda/.test(n)) {
    m = o.match(/^(?:borra|elimina|quita)\s+(?:del?\s+(?:mi\s+|el\s+)?(?:calendario|agenda)\s+)?(?:el\s+evento\s+)?(.+?)(?:\s+del?\s+(?:mi\s+|el\s+)?(?:calendario|agenda))?$/i);
    if (m) {
      const q = quitarTildes(m[1].toLowerCase()), l = calLeer();
      const fuera = l.filter((e) => quitarTildes(e.titulo.toLowerCase()).includes(q));
      if (!fuera.length) { responder("📅 No lo encuentro", "No hay nada que se llame «" + m[1] + "» en tu calendario."); return true; }
      calGuardar(l.filter((e) => !fuera.includes(e)));
      responder("🗑 Borrado", calTexto(fuera, true), { voz: "Borrado del calendario" });
      return true;
    }
  }

  // Añadir: "ponme en mi calendario el 29 examen", "apunta examen el 29 en el calendario"
  m = o.match(/^(?:p[oó]n(?:me)?|apunta(?:me)?|an[oó]ta(?:me)?|a[ñn]ade|agrega|guarda|mete|agenda(?:me)?)\s+(?:(?:en|a)\s+(?:mi|el)\s+|al\s+|en\s+)?(?:calendario|agenda)\s*[,:]?\s+(.+)$/i)
    || o.match(/^(?:p[oó]n(?:me)?|apunta(?:me)?|an[oó]ta(?:me)?|a[ñn]ade|agrega|guarda|mete)\s+(.+?)\s+(?:en|a|al)\s+(?:mi\s+|el\s+)?(?:calendario|agenda)$/i);
  if (m) { calAnadirTexto(m[1]); return true; }

  // "apunta el 29 examen", "mañana tengo dentista", "el viernes tengo partido" (solo si hay fecha)
  m = o.match(/^(?:apunta(?:me)?|an[oó]ta(?:me)?|agenda(?:me)?|tengo)\s+(.+)$/i) || o.match(/^(.+?\s+tengo\s+.+)$/i);
  if (m) { const p = calParsear(m[1]); if (p.fecha && p.titulo) { calAnadir(p); return true; } }

  // Mapa: "búscame en el mapa París", "enséñame Roma en el mapa", "llévame a París", "dónde está Tokio"
  m = o.match(/^(?:b[uú]sca(?:me)?|ens[eé][ñn]ame|mu[eé]strame|p[oó]n(?:me)?|localiza|abre)\s+(?:en\s+el\s+mapa|el\s+mapa\s+de|en\s+(?:google\s+)?maps)\s+(.+)$/i)
    || o.match(/^(?:b[uú]sca(?:me)?|ens[eé][ñn]ame|mu[eé]strame|localiza)\s+(.+?)\s+en\s+(?:el\s+mapa|(?:google\s+)?maps)$/i)
    || o.match(/^(?:mapa\s+de|ll[eé]vame\s+a|vamos\s+a|vuela\s+a|d[oó]nde\s+(?:est[aá]|queda))\s+(.+?)(?:\s+en\s+el\s+mapa)?$/i);
  if (m) { nodoMapaBuscar(m[1]); return true; }

  return false;
}

// ================== ACCESOS RÁPIDOS ==================
document.querySelectorAll(".tile").forEach((b) => {
  b.addEventListener("click", () => ejecutar(b.dataset.cmd));
  b.addEventListener("pointermove", (e) => {
    const r = b.getBoundingClientRect();
    b.style.setProperty("--mx", (e.clientX - r.left) + "px");
    b.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
});
if (cfg.ciudad) $("tileTiempoSub").textContent = cfg.ciudad;
calPintarTile();
setInterval(calPintarTile, 60000);

// Cerrar la tarjeta de respuesta y compactar los accesos cuando hay respuesta
$("rclose").addEventListener("click", () => { $("reply").hidden = true; });
new MutationObserver(() => $("app").classList.toggle("con-respuesta", !$("reply").hidden))
  .observe($("reply"), { attributes: true, attributeFilter: ["hidden"] });


// ================== RED: MINI PANTALLAS CONECTADAS AL ORBE ==================
// Cada mini pantalla ocupa una esquina libre (arriba-izq, arriba-der, abajo-izq, abajo-der)
const NODOS = { nodoMapa: ["#3ee6a8", "tl"], nodoCal: ["#8b7bff", "tr"], nodoTiempo: ["#ffc24b", "bl"], nodoTimer: ["#5ee7ff", "br"], nodoFutbol: ["#ff5e8a", "tl"] };
const SLOTS = ["tl", "tr", "bl", "br"];
const ocultarT = {};
const enPanel = () => $("app").classList.contains("con-panel");
const nodoSlot = (n) => SLOTS.find((s) => n.classList.contains("s-" + s));

function redPintar() {
  const st = document.querySelector(".stage"), svg = $("red");
  const r0 = st.getBoundingClientRect(); if (!r0.width) return;
  const cx = r0.width / 2, cy = r0.height / 2, R = Math.min(r0.width, r0.height) * 0.27;
  svg.setAttribute("viewBox", "0 0 " + r0.width + " " + r0.height);
  for (const id in NODOS) {
    let g = svg.querySelector('[data-n="' + id + '"]');
    if (!g) {
      g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.dataset.n = id; g.style.setProperty("--c", NODOS[id][0]);
      g.innerHTML = '<path class="base" pathLength="1"/><path class="flujo"/><circle class="nudo" r="4"/><circle class="nudo" r="3"/>';
      svg.append(g);
    }
    const n = $(id), on = n.classList.contains("on");
    g.classList.toggle("on", on);
    if (!on) continue;
    const r = n.getBoundingClientRect(), sl = nodoSlot(n) || "tl";
    const izq = sl[1] === "l", arriba = sl[0] === "t";
    const ex = izq ? r.right - r0.left : r.left - r0.left;
    const ey = arriba ? Math.min(r.bottom - r0.top - 18, cy) : Math.max(r.top - r0.top + 18, cy);
    const ang = Math.atan2(ey - cy, ex - cx), sx = cx + Math.cos(ang) * R, sy = cy + Math.sin(ang) * R;
    const mx = (sx + ex) / 2, my = arriba ? Math.min(sy, ey) - 30 : Math.max(sy, ey) + 30;
    const d = "M" + sx + " " + sy + " Q" + mx + " " + my + " " + ex + " " + ey;
    g.querySelectorAll("path").forEach((p) => p.setAttribute("d", d));
    const c = g.querySelectorAll("circle");
    c[0].setAttribute("cx", ex); c[0].setAttribute("cy", ey); c[1].setAttribute("cx", sx); c[1].setAttribute("cy", sy);
  }
}

function nodoMostrar(id, segundos) {
  const n = $(id);
  if (!n.classList.contains("on")) {
    // Busca esquina: la preferida si está libre; si no, otra libre; si no, quita la más antigua
    const ocupadas = {};
    for (const k in NODOS) { const o = $(k); if (k !== id && o.classList.contains("on")) ocupadas[nodoSlot(o)] = k; }
    let sl = NODOS[id][1];
    if (ocupadas[sl]) sl = SLOTS.find((s) => !ocupadas[s]) || sl;
    if (ocupadas[sl]) nodoOcultar(ocupadas[sl], true);
    SLOTS.forEach((s) => n.classList.remove("s-" + s));
    n.classList.add("s-" + sl);
    n.dataset.desde = Date.now();
  }
  redPintar();
  requestAnimationFrame(() => { n.classList.add("on"); redPintar(); });
  clearTimeout(ocultarT[id]);
  if (segundos !== 0) ocultarT[id] = setTimeout(() => nodoOcultar(id), (segundos || 40) * 1000);
}
function nodoOcultar(id, ya) {
  clearTimeout(ocultarT[id]);
  if (!ya && $(id).matches(":hover")) { ocultarT[id] = setTimeout(() => nodoOcultar(id), 5000); return; }
  $(id).classList.remove("on"); redPintar();
}
window.addEventListener("resize", redPintar);
new ResizeObserver(redPintar).observe(document.querySelector(".stage"));

// ----- Mini mapa -----
let homeMap = null, homePin = null;
async function nodoMapaIniciar() {
  await cargarLeaflet();
  if (homeMap) { homeMap.invalidateSize(); return; }
  homeMap = L.map("homeMapa", { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false })
    .setView([40.4, -3.7], 3);
  capaDe(CAPAS.oscuro).addTo(homeMap);
  $("homeMapa").classList.add("oscuro");
}
async function nodoMapaBuscar(q) {
  q = (q || "").trim(); if (!q) return mapaAbrir();
  if (enPanel()) return mapaBuscar(q);
  $("nodoMapaTxt").textContent = "Buscando " + q + "…";
  nodoMostrar("nodoMapa");
  try {
    await nodoMapaIniciar();
    const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&q=" + encodeURIComponent(q));
    const j = await r.json();
    if (!j.length) { $("nodoMapaTxt").textContent = "No encuentro " + q; hablar("No lo encuentro"); return; }
    const p = j[0], lat = +p.lat, lon = +p.lon, nombre = p.name || p.display_name.split(",")[0];
    const dir = p.display_name.split(",").slice(1, 4).join(",").trim();
    try { localStorage.setItem("jarvisLugar", JSON.stringify({ nombre, lat, lon })); } catch (e) {}
    $("nodoMapaTxt").textContent = nombre;
    homeMap.invalidateSize();
    homeMap.setView(homeMap.getCenter(), 3, { animate: false });
    setTimeout(() => homeMap.flyTo([lat, lon], 11, { duration: 2.4 }), 450);
    if (homePin) homePin.remove();
    homePin = L.marker([lat, lon], { icon: L.divIcon({ className: "pin", html: "<span></span>", iconSize: [14, 14], iconAnchor: [7, 7] }) }).addTo(homeMap);
    const dest = encodeURIComponent(lat + "," + lon);
    responder("📍 " + nombre, dir || "Aquí lo tienes en el mapa.", {
      voz: "Aquí tienes " + nombre,
      botones: [
        { texto: "Abrir mapa grande", accion: () => mapaBuscar(nombre, true) },
        { texto: "Cómo llegar", url: "https://www.google.com/maps/dir/?api=1&destination=" + dest }
      ]
    });
  } catch (e) { $("nodoMapaTxt").textContent = "Sin conexión"; }
}
$("nodoMapa").addEventListener("click", () => {
  let u = null; try { u = JSON.parse(localStorage.getItem("jarvisLugar") || "null"); } catch (e) {}
  if (u) mapaBuscar(u.nombre, true); else mapaAbrir();
});

// ----- Mini calendario -----
function nodoCalPintar(y, mm, resaltar) {
  const l = calLeer(), dias = {};
  l.forEach((e) => { const d = deISO(e.fecha); if (d.getFullYear() === y && d.getMonth() === mm) dias[d.getDate()] = e; });
  $("nodoCalMes").textContent = capital(MESES[mm]) + " " + y;
  const g = $("nodoCalGrid"); g.innerHTML = "";
  ["L", "M", "X", "J", "V", "S", "D"].forEach((d) => { const s = document.createElement("span"); s.className = "dw"; s.textContent = d; g.append(s); });
  const off = (new Date(y, mm, 1).getDay() + 6) % 7, total = new Date(y, mm + 1, 0).getDate(), h = new Date();
  for (let i = 0; i < off; i++) g.append(document.createElement("span"));
  for (let d = 1; d <= total; d++) {
    const s = document.createElement("span"); s.textContent = d; s.dataset.d = d;
    if (h.getFullYear() === y && h.getMonth() === mm && h.getDate() === d) s.classList.add("hoy");
    if (dias[d] && d !== resaltar) { s.classList.add("ev"); s.style.setProperty("--c", calColor(dias[d].titulo)); }
    g.append(s);
  }
}
function nodoCalAnadir(ev) {
  if (enPanel()) return;
  const f = deISO(ev.fecha), col = calColor(ev.titulo);
  nodoCalPintar(f.getFullYear(), f.getMonth(), f.getDate());
  $("nodoCalTxt").textContent = "";
  nodoMostrar("nodoCal");
  // La etiqueta sale del orbe y vuela hasta su día
  setTimeout(() => {
    const st = document.querySelector(".stage"), r0 = st.getBoundingClientRect();
    const celda = $("nodoCalGrid").querySelector('[data-d="' + f.getDate() + '"]'); if (!celda) return;
    const rc = celda.getBoundingClientRect();
    const v = document.createElement("div"); v.className = "volador"; v.textContent = ev.titulo; v.style.setProperty("--c", col);
    st.append(v);
    const w = v.offsetWidth, hh = v.offsetHeight;
    const x0 = r0.width / 2 - w / 2, y0 = r0.height / 2 - hh / 2;
    const x1 = rc.left - r0.left + rc.width / 2 - w / 2, y1 = rc.top - r0.top + rc.height / 2 - hh / 2;
    v.style.left = "0px"; v.style.top = "0px";
    const a = v.animate([
      { transform: "translate(" + x0 + "px," + y0 + "px) scale(.3)", opacity: 0 },
      { transform: "translate(" + x0 + "px," + (y0 - 20) + "px) scale(1.15)", opacity: 1, offset: 0.25 },
      { transform: "translate(" + ((x0 + x1) / 2) + "px," + (Math.min(y0, y1) - 40) + "px) scale(1)", opacity: 1, offset: 0.6 },
      { transform: "translate(" + x1 + "px," + y1 + "px) scale(.2)", opacity: 0.2 }
    ], { duration: 1500, easing: "cubic-bezier(.45,0,.25,1)", fill: "forwards" });
    a.onfinish = () => {
      v.remove();
      celda.style.setProperty("--c", col); celda.classList.add("pop");
      $("nodoCalTxt").textContent = f.getDate() + " · " + ev.titulo + (ev.hora ? " · " + ev.hora : "");
    };
  }, 900);
}
$("nodoCal").addEventListener("click", () => calAbrir());

// ================== MEMORIA ==================
const memLeer = () => { try { return Object.assign({ nombre: "", datos: [] }, JSON.parse(localStorage.getItem("jarvisMem") || "{}")); } catch (e) { return { nombre: "", datos: [] }; } };
const memGuardar = (m) => { try { localStorage.setItem("jarvisMem", JSON.stringify(m)); } catch (e) {} };
const memNombre = () => memLeer().nombre;
const PALABRAS_VACIAS = new Set("que cual cuales cuando donde quien como cuanto cuanta es son era mi mis el la los las de del un una y a en me te se lo le por para con sabes dime tengo".split(" "));
const claves = (s) => quitarTildes(s.toLowerCase()).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !PALABRAS_VACIAS.has(w));

function memoria(t, n, o) {
  let m;
  const mem = memLeer();
  // Nombre: "llámame Mbappé", "a partir de ahora me llamas el mejor", "quiero que me llames X", "me llamo X"
  m = o.match(/^(?:(?:quiero\s+que\s+)?(?:a\s+partir\s+de\s+ahora\s+|desde\s+ahora\s+)?(?:quiero\s+que\s+)?(?:ll[aá]mame|me\s+llam(?:as|es|ar[aá]s)|ll[aá]mame\s+siempre)|mi\s+nombre\s+es|me\s+llamo|puedes\s+llamarme)\s+(.+)$/i);
  if (m && !/^(?:a\s+las|en\s+\d|ma[ñn]ana)/i.test(m[1])) {
    const nom = m[1].replace(/\s+(?:a\s+partir\s+de\s+ahora|desde\s+ahora|por\s+favor)$/i, "").trim();
    mem.nombre = nom.charAt(0).toUpperCase() + nom.slice(1); memGuardar(mem); saludoInicial();
    responder("🧠 Lo recordaré", "A partir de ahora te llamo " + mem.nombre + ".", { voz: "Entendido, " + mem.nombre + ". Así te llamaré a partir de ahora." });
    return true;
  }
  if (/^(?:como me llamo|cual es mi nombre|sabes como me llamo|quien soy)$/.test(n)) {
    responder("🧠 Tu nombre", mem.nombre ? "Eres " + mem.nombre + "." : "Aún no me lo has dicho. Di «llámame …».", { voz: mem.nombre ? "Eres " + mem.nombre : "Aún no me has dicho cómo llamarte" });
    return true;
  }
  if (/^(?:olvida|borra)\s+(?:mi\s+nombre|como me llamo)$/.test(n)) { mem.nombre = ""; memGuardar(mem); saludoInicial(); responder("🧠 Olvidado", "Ya no uso ningún nombre para ti."); return true; }

  // Guardar datos: "recuerda que mi equipo es el Madrid", "acuérdate de que el código del wifi es 1234"
  m = o.match(/^(?:recuerda|acu[eé]rdate(?:\s+de)?|no\s+(?:te\s+)?olvides(?:\s+de)?|apr[eé]ndete|memoriza|guarda\s+en\s+(?:tu\s+)?memoria)\s+(?:que\s+)?(.+)$/i);
  if (m && !/^(?:recuerdame|recuerda\s+me)/.test(n)) {
    const dato = m[1].trim();
    mem.datos = mem.datos.filter((d) => quitarTildes(d.toLowerCase()) !== quitarTildes(dato.toLowerCase()));
    mem.datos.push(dato); memGuardar(mem);
    responder("🧠 Guardado en mi memoria", dato, { voz: "Vale" + (mem.nombre ? ", " + mem.nombre : "") + ". Lo recordaré." });
    return true;
  }
  // Ver memoria
  if (/^(?:que\s+(?:recuerdas|sabes)(?:\s+de\s+mi)?|que\s+tienes\s+en\s+(?:tu\s+)?memoria|(?:ver|ensename|muestrame|abre)\s+(?:tu\s+|la\s+)?memoria|memoria)$/.test(n)) {
    const lineas = (mem.nombre ? ["• Te llamas " + mem.nombre] : []).concat(mem.datos.map((d) => "• " + d));
    responder("🧠 Lo que recuerdo", lineas.length ? lineas.join("\n") : "Todavía nada. Di «recuerda que …» o «llámame …».", {
      voz: lineas.length ? "Recuerdo " + lineas.length + (lineas.length === 1 ? " cosa" : " cosas") : "Todavía no recuerdo nada",
      botones: lineas.length ? [{ texto: "Borrar todo", accion: () => { memGuardar({ nombre: "", datos: [] }); saludoInicial(); responder("🧠 Memoria borrada", "He olvidado todo."); } }] : []
    });
    return true;
  }
  // Olvidar: "olvida lo del wifi", "olvídalo todo"
  if (/^(?:olvida(?:lo)?|borra)\s+(?:todo|toda\s+tu\s+memoria|tu\s+memoria)$/.test(n)) { memGuardar({ nombre: "", datos: [] }); saludoInicial(); responder("🧠 Memoria borrada", "He olvidado todo."); return true; }
  m = n.match(/^(?:olvida|olvidate\s+de|borra\s+de\s+(?:tu\s+)?memoria)\s+(?:lo\s+de\s+|que\s+)?(.+)$/);
  if (m) {
    const k = claves(m[1]); const antes = mem.datos.length;
    mem.datos = mem.datos.filter((d) => !k.length || !k.every((w) => claves(d).includes(w)));
    if (mem.datos.length < antes) { memGuardar(mem); responder("🧠 Olvidado", "Ya no lo recuerdo."); return true; }
  }
  // Responder preguntas con lo que recuerda: "cuál es mi equipo", "cuál es el código del wifi"
  if (mem.datos.length && /^(?:cual|cuales|cuando|donde|quien|como|que|cuanto|sabes)\b/.test(n)) {
    const k = claves(n);
    if (k.length) {
      let mejor = null, pts = 0;
      for (const d of mem.datos) { const c = claves(d), p = k.filter((w) => c.includes(w)).length; if (p > pts) { pts = p; mejor = d; } }
      if (mejor && pts >= Math.min(2, k.length)) { responder("🧠 Me dijiste", mejor, { voz: mejor }); return true; }
    }
  }
  return false;
}

function saludoInicial() {
  const nom = memNombre();
  if ($("reply").hidden && /^Hola/.test(transcriptEl.textContent))
    transcriptEl.textContent = nom ? "Hola, " + nom + ". Toca el orbe o escribe." : "Hola, soy Jarvis. Toca el orbe o escribe.";
}
saludoInicial();
