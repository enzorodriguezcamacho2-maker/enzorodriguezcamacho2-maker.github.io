// Jarvis v21: tabla de partidos y clasificación (como el mapa), con datos confirmados y guardados.
// - Fuentes, por orden: ESPN directo → TheSportsDB → tu script de Google → ESPN por intermediario.
// - Nunca inventa: si ninguna fuente responde, lo dice (y enseña lo guardado si lo hay).
// - Se guarda en el aparato: al preguntar sale al instante. Se actualiza solo y borra lo de hace más de 2 semanas.

const FUT_KEY = "jarvisPartidos";
const TSDB = { "esp.1": 4335, "eng.1": 4328, "ita.1": 4332, "ger.1": 4331, "fra.1": 4334, "uefa.champions": 4480, "esp.2": 4400, "por.1": 4344 };
const LIGAS_PANEL = ["esp.1", "uefa.champions", "eng.1", "ita.1", "ger.1", "fra.1", "esp.2"];
const temporada = () => { const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 6 ? y + "-" + (y + 1) : (y - 1) + "-" + y; };
const futLeer = () => leerLS(FUT_KEY, {});
function futGuardar(c) {
  const lim = Date.now() - 14 * 86400e3; // borra partidos de hace más de 2 semanas
  for (const lg in c) {
    c[lg].partidos = (c[lg].partidos || []).filter((p) => p.t >= lim);
    if (Math.max(c[lg].act || 0, c[lg].actTabla || 0) < lim) delete c[lg];
  }
  guardarLS(FUT_KEY, c);
}

// ---------- Fuentes ----------
async function jsonDe(url, ms) { const r = await fetch(url, { signal: conTiempo(ms || 7000) }); if (!r.ok) throw new Error(r.status); return r.json(); }

function deEspn(ev) {
  const p = partido(ev);
  return { t: +p.fecha, local: p.local, visit: p.visit, gl: p.gl, gv: p.gv, estado: p.estado, reloj: p.reloj, escL: p.escL, escV: p.escV };
}
function deTsdb(e) {
  const t = Date.parse((e.strTimestamp || (e.dateEvent + "T" + (e.strTime || "00:00:00"))).replace(/\+00:00$/, "") + "Z");
  const st = String(e.strStatus || "");
  const fin = /finished|^ft$|aet|pen/i.test(st) || (e.intHomeScore != null && e.intHomeScore !== "" && t < Date.now() - 2.5 * 3600e3);
  const vivo = /^(1h|2h|ht|live|in play|\d+')/i.test(st);
  return { t, local: e.strHomeTeam, visit: e.strAwayTeam, gl: e.intHomeScore ?? "", gv: e.intAwayScore ?? "", estado: fin ? "post" : vivo ? "in" : "pre", reloj: vivo ? st : "", escL: e.strHomeTeamBadge ? e.strHomeTeamBadge + "/tiny" : "", escV: e.strAwayTeamBadge ? e.strAwayTeamBadge + "/tiny" : "", ronda: e.intRound };
}

let futDiag = []; // qué ha fallado (se enseña si no sale nada)
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// Equipos que van primero (ids de ESPN)
const PRIORITARIOS = [{ id: "86", n: "Real Madrid" }, { id: "83", n: "Barcelona" }, { id: "1068", n: "Atlético" }];
const claveP = (p) => normEq(p.local) + "|" + normEq(p.visit) + "|" + new Date(p.t).toDateString();

// Ejecuta tareas de 3 en 3, con una pausa entre grupos; avisa tras cada grupo
async function deTresEnTres(tareas, alAcabarGrupo, pausa) {
  for (let i = 0; i < tareas.length; i += 3) {
    const res = await Promise.all(tareas.slice(i, i + 3).map((t) => t().catch((e) => { futDiag.push(e.message || "fallo"); return null; })));
    if (alAcabarGrupo) alAcabarGrupo(res.filter(Boolean).flat());
    if (i + 3 < tareas.length) await espera(pausa || 700);
  }
}
function mezclar(liga, nuevos, fuente) {
  const c = futLeer(), g = c[liga] = c[liga] || { partidos: [], dias: {} };
  const mapa = new Map((g.partidos || []).map((p) => [claveP(p), p]));
  nuevos.forEach((p) => { if (p && p.t) mapa.set(claveP(p), Object.assign(mapa.get(claveP(p)) || {}, p)); });
  g.partidos = [...mapa.values()];
  if (nuevos.length) { g.fuente = fuente; g.act = Date.now(); }
  futGuardar(c);
  return c[liga];
}
// ¿Hay que volver a pedir este día? Pasado: una vez basta. Hoy: cada 10 min. Futuro: cada hora.
function diaCaducado(g, iso) {
  const ts = (g && g.dias && g.dias[iso]) || 0, hoy = fechaISO(new Date());
  if (!ts) return true;
  if (iso < hoy) return ts < deISO(iso).getTime() + 86400e3 + 3 * 3600e3; // pedido antes de que acabara ese día
  if (iso === hoy) return Date.now() - ts > 10 * 60e3;
  return Date.now() - ts > 60 * 60e3;
}
function marcarDia(liga, iso) { const c = futLeer(); if (!c[liga]) return; c[liga].dias = c[liga].dias || {}; c[liga].dias[iso] = Date.now(); for (const k in c[liga].dias) if (k < fechaISO(sumarDias(hoy0(), -15))) delete c[liga].dias[k]; futGuardar(c); }

let cargando = {};
// Carga progresiva: 1) Madrid, Barça y Atlético · 2) días cercanos de 3 en 3 · 3) semana siguiente
async function cargarProgresivo(liga, alAvanzar, hasta) {
  if (cargando[liga]) return cargando[liga];
  futDiag = [];
  const tarea = (async () => {
    const yyyymmdd = (d) => d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    let exitos = 0;
    const tras = (ps, fuente) => { if (ps.length) { exitos++; mezclar(liga, ps, fuente); if (alAvanzar) alAvanzar(); } };
    // 1) Los tres grandes (solo en LaLiga y Champions)
    if (liga === "esp.1" || liga === "uefa.champions") {
      const g = futLeer()[liga];
      if (!g || !g.prio || Date.now() - g.prio > 60 * 60e3) {
        const tareas = PRIORITARIOS.map((e) => async () => {
          const [a, b] = await Promise.all([
            jsonDe("https://site.api.espn.com/apis/site/v2/sports/soccer/" + liga + "/teams/" + e.id + "/schedule"),
            jsonDe("https://site.api.espn.com/apis/site/v2/sports/soccer/" + liga + "/teams/" + e.id + "/schedule?fixture=true").catch(() => ({}))
          ]);
          const lim = Date.now() - 14 * 86400e3, max = Date.now() + 21 * 86400e3;
          return (a.events || []).concat(b.events || []).map(deEspn).filter((p) => p.t >= lim && p.t <= max);
        });
        await deTresEnTres(tareas, (ps) => tras(ps, "ESPN"));
        const c = futLeer(); if (c[liga]) { c[liga].prio = Date.now(); futGuardar(c); }
      }
    }
    // 2) y 3) Día a día: hoy, los próximos, los pasados y la semana siguiente
    const dias = [];
    for (let i = 0; i <= (hasta || 14); i++) dias.push(sumarDias(hoy0(), i));
    for (let i = 1; i <= 7; i++) dias.splice(Math.min(dias.length, 4 + i * 2), 0, sumarDias(hoy0(), -i)); // intercala días pasados
    const g = futLeer()[liga];
    const pendientes = dias.filter((d) => diaCaducado(g, fechaISO(d)));
    const tareas = pendientes.map((d) => async () => {
      const r = await jsonDe("https://site.api.espn.com/apis/site/v2/sports/soccer/" + liga + "/scoreboard?dates=" + yyyymmdd(d));
      marcarDia(liga, fechaISO(d));
      return (r.events || []).map(deEspn);
    });
    await deTresEnTres(tareas, (ps) => { if (ps.length) tras(ps, "ESPN"); else exitos++; });
    // Reserva: TheSportsDB, despacio (no deja muchas peticiones seguidas)
    if (!exitos && TSDB[liga]) {
      const base = "https://www.thesportsdb.com/api/v1/json/3/";
      for (const d of dias.slice(0, 10)) {
        try { const r = await jsonDe(base + "eventsday.php?d=" + fechaISO(d) + "&l=" + TSDB[liga], 9000); tras((r.events || []).map(deTsdb), "TheSportsDB"); marcarDia(liga, fechaISO(d)); }
        catch (e) { futDiag.push("TSDB: " + e.message); }
        await espera(2200);
      }
    }
  })();
  cargando[liga] = tarea;
  try { await tarea; } finally { delete cargando[liga]; }
}

async function tablaDeFuentes(liga) {
  try {
    const d = await jsonDe("https://site.api.espn.com/apis/v2/sports/soccer/" + liga + "/standings");
    const t = tablaEspn(d); if (t.length) return { tabla: t, fuente: "ESPN" };
  } catch (e) {}
  const id = TSDB[liga];
  if (id) {
    try {
      const d = await jsonDe("https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=" + id + "&s=" + temporada());
      const t = (d.table || []).map((x) => ({ pos: +x.intRank, eq: x.strTeam, pts: +x.intPoints, pj: +x.intPlayed, dg: +x.intGoalDifference, esc: x.strBadge ? x.strBadge + "/tiny" : "" })).sort((a, b) => a.pos - b.pos);
      if (t.length) return { tabla: t, fuente: "TheSportsDB" };
    } catch (e) {}
  }
  try { const d = await espn("/apis/v2/sports/soccer/" + liga + "/standings"); const t = tablaEspn(d); if (t.length) return { tabla: t, fuente: "ESPN" }; } catch (e) {}
  throw new Error("sin fuente");
}
function tablaEspn(d) {
  const g = (d.children && d.children[0]) || d;
  return ((g.standings || {}).entries || []).map((e) => {
    const st = {}; (e.stats || []).forEach((x) => { st[x.name] = x.value; });
    return { pos: st.rank, eq: e.team.shortDisplayName || e.team.displayName, pts: st.points, pj: st.gamesPlayed, dg: st.pointDifferential, esc: (e.team.logos && e.team.logos[0] && e.team.logos[0].href) || "" };
  }).sort((a, b) => (a.pos || 99) - (b.pos || 99));
}

// ---------- Caché: al instante si está guardado ----------
const tieneDatos = (g) => !!(g && g.fuente && (g.partidos || []).length);
// Devuelve los partidos: si hay guardados, al momento (y actualiza por detrás); si no, espera a la primera carga
async function jornada(liga, forzar, alAvanzar) {
  const g = futLeer()[liga];
  if (tieneDatos(g) && !forzar) {
    cargarProgresivo(liga, alAvanzar).catch(() => {});
    return Object.assign({ deCache: true }, g);
  }
  await cargarProgresivo(liga, alAvanzar);
  const g2 = futLeer()[liga];
  if (tieneDatos(g2)) return g2;
  throw new Error("sin fuente");
}

async function clasificacion(liga, forzar) {
  const c = futLeer(), g = c[liga];
  if (g && g.tabla && !forzar && Date.now() - (g.actTabla || 0) < 12 * 3600e3) return { tabla: g.tabla, fuente: g.fuenteTabla, act: g.actTabla, deCache: true };
  try {
    const r = await tablaDeFuentes(liga);
    const c2 = futLeer(); c2[liga] = Object.assign(c2[liga] || { partidos: [] }, { tabla: r.tabla, fuenteTabla: r.fuente, actTabla: Date.now() }); futGuardar(c2);
    return { tabla: r.tabla, fuente: r.fuente, act: Date.now() };
  } catch (e) {
    if (g && g.tabla) return { tabla: g.tabla, fuente: g.fuenteTabla, act: g.actTabla, deCache: true, viejo: true };
    throw e;
  }
}

// ---------- Pantalla de partidos (como el mapa) ----------
let futLiga = "esp.1", futTab = "partidos";
const horaES = (t) => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const diaES = (t) => { const d = new Date(t), h0 = hoy0(), d0 = new Date(d); d0.setHours(0, 0, 0, 0); const dif = Math.round((d0 - h0) / 86400e3); return (dif === 0 ? "Hoy" : dif === 1 ? "Mañana" : dif === -1 ? "Ayer" : capital(DIAS_SEM[d.getDay()])) + " " + d.getDate() + " " + MESES[d.getMonth()].slice(0, 3); };

function futChips() {
  const box = $("futLigas"); box.innerHTML = "";
  LIGAS_PANEL.forEach((lg) => {
    const b = document.createElement("button"); b.className = "pill" + (lg === futLiga ? " on" : ""); b.textContent = NOMBRES_LIGA[lg];
    b.addEventListener("click", () => { futLiga = lg; futPintar(); });
    box.append(b);
  });
  const esUcl = futLiga === "uefa.champions";
  if (!esUcl && futTab === "cuadro") futTab = "partidos";
  $("futTabCuadro").hidden = !esUcl;
  $("futTabs").classList.toggle("tres", esUcl);
  document.querySelectorAll(".futtab").forEach((t) => t.classList.toggle("on", t.dataset.tab === futTab));
}
async function futPintar(forzar) {
  futChips();
  const lista = $("futLista"), pie = $("futPie");
  $("futTitulo").textContent = NOMBRES_LIGA[futLiga];
  lista.innerHTML = '<div class="futcarga">Cargando datos confirmados…</div>';
  try {
    if (futTab === "cuadro") { await pintarCuadro(forzar); return; }
    if (futTab === "tabla") {
      const r = await clasificacion(futLiga, forzar);
      lista.innerHTML = "";
      const tb = document.createElement("table"); tb.className = "futtabla";
      tb.innerHTML = "<thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>DG</th><th>Pts</th></tr></thead>";
      const body = document.createElement("tbody");
      const fav = (memLeer().equipo || {}).nombre || "";
      r.tabla.forEach((x) => {
        const tr = document.createElement("tr");
        if (futLiga === "uefa.champions") tr.className = x.pos <= 8 ? "champ" : x.pos <= 24 ? "playoff" : "desc";
        else if (x.pos <= 4) tr.className = "champ"; else if (x.pos >= r.tabla.length - 2) tr.className = "desc";
        if (fav && normEq(x.eq).includes(normEq(fav).split(" ").pop())) tr.classList.add("fav");
        const c = (t) => { const td = document.createElement("td"); td.textContent = t; return td; };
        const eq = document.createElement("td"); eq.className = "eqcel";
        if (x.esc) { const im = document.createElement("img"); im.src = x.esc; im.alt = ""; im.loading = "lazy"; im.onerror = () => im.remove(); eq.append(im); }
        eq.append(x.eq);
        tr.append(c(x.pos), eq, c(x.pj ?? ""), c(x.dg > 0 ? "+" + x.dg : x.dg ?? ""), c(x.pts));
        body.append(tr);
      });
      tb.append(body); lista.append(tb);
      if (futLiga === "uefa.champions") {
        const ley = document.createElement("div"); ley.className = "futley";
        ley.innerHTML = '<span><i class="champ"></i>1-8: a octavos</span><span><i class="playoff"></i>9-24: playoff</span><span><i class="desc"></i>25-36: eliminados</span>';
        lista.append(ley);
      }
      pie.textContent = "✅ Datos de " + r.fuente + " · actualizado " + hace(r.act).toLowerCase() + (r.viejo ? " (sin conexión: guardado)" : "");
      return;
    }
    const ligaPintada = futLiga;
    const r = await jornada(futLiga, forzar, () => { if (!$("panelFutbol").hidden && futLiga === ligaPintada && futTab === "partidos") clearTimeout(futRepintar), futRepintar = setTimeout(() => futPintarDatos(futLeer()[ligaPintada]), 150); });
    futPintarDatos(r);
  } catch (e) {
    lista.innerHTML = '<div class="futcarga">⚠️ No he podido confirmar los datos ahora mismo y no tengo nada guardado de esta liga. Prueba con ↻ en un momento.</div>';
    pie.textContent = futDiag.length ? "Detalle: " + [...new Set(futDiag)].slice(0, 4).join(" · ") : "";
  }
}
let futRepintar = null;
function futPintarDatos(r) {
    if (!r) return;
    const lista = $("futLista"), pie = $("futPie");
    const ps = (r.partidos || []).slice().sort((a, b) => a.t - b.t);
    lista.innerHTML = "";
    if (!ps.length) { lista.innerHTML = '<div class="futcarga">No hay partidos estos días.</div>'; }
    // Primero lo que viene (y lo que se juega ahora); después los resultados recientes
    const proximos = ps.filter((p) => p.estado !== "post"), jugados = ps.filter((p) => p.estado === "post").reverse();
    const grupo = (titulo, arr) => {
      if (!arr.length) return;
      const h = document.createElement("h6"); h.textContent = titulo; lista.append(h);
      let dAnt = "";
      arr.forEach((p) => {
        const d = diaES(p.t);
        if (d !== dAnt) { const s = document.createElement("div"); s.className = "futdia"; s.textContent = d; lista.append(s); dAnt = d; }
        const fila = document.createElement("div"); fila.className = "futfila " + p.estado;
        const eq = (nom, esc, lado) => { const e = document.createElement("span"); e.className = "eq " + lado; if (esc) { const im = document.createElement("img"); im.src = esc; im.alt = ""; im.loading = "lazy"; im.onerror = () => im.remove(); e.append(im); } const n = document.createElement("b"); n.textContent = nom; e.append(n); return e; };
        const mid = document.createElement("span"); mid.className = "mid";
        mid.textContent = p.estado === "pre" ? horaES(p.t) : p.gl + " - " + p.gv;
        if (p.estado === "in") { const v = document.createElement("small"); v.textContent = p.reloj || "EN VIVO"; mid.append(v); }
        fila.append(eq(p.local, p.escL, "l"), mid, eq(p.visit, p.escV, "v"));
        lista.append(fila);
      });
    };
    // Primero Madrid, Barça y Atlético
    const esGrande = (p) => PRIORITARIOS.some((e) => [p.local, p.visit].some((x) => normEq(x).includes(normEq(e.n).split(" ").pop()) || normEq(x).includes("atletico")));
    if (futLiga === "esp.1" || futLiga === "uefa.champions") {
      const grandes = proximos.filter(esGrande).slice(0, 6);
      grupo("⭐ Madrid, Barça y Atlético", grandes);
      grupo("Próximos partidos", proximos.filter((p) => !grandes.includes(p)));
    } else grupo("Próximos partidos", proximos);
    grupo("Resultados", jugados);
    const cargandoAun = !!cargando[futLiga];
    pie.textContent = "✅ Datos de " + r.fuente + " · actualizado " + hace(r.act).toLowerCase() + (cargandoAun ? " · cargando más…" : "");
}
function futAbrir(liga, tab) {
  if (liga) futLiga = liga;
  futTab = tab || "partidos";
  panelAbrir("panelFutbol");
  futPintar();
}
document.querySelectorAll(".futtab").forEach((t) => t.addEventListener("click", () => { futTab = t.dataset.tab; futPintar(); }));
$("futCerrar").addEventListener("click", panelCerrar);
$("futRecargar").addEventListener("click", () => { const c = futLeer(); if (c[futLiga]) { c[futLiga].dias = {}; c[futLiga].prio = 0; futGuardar(c); } futPintar(true); });

// ---------- Respuestas por voz (con datos confirmados) ----------
const _futbolProximosV = futbolProximos;
futbolProximos = async function (q) {
  const liga = ligaDe(q) || "esp.1";
  setEstado("thinking");
  try {
    const r = await jornada(liga);
    const nq = normEq(q || "");
    let ps = r.partidos.filter((p) => p.estado !== "post").sort((a, b) => a.t - b.t);
    if (/manana/.test(nq)) ps = ps.filter((p) => new Date(p.t).toDateString() === sumarDias(hoy0(), 1).toDateString());
    else if (/hoy/.test(nq)) ps = ps.filter((p) => new Date(p.t).toDateString() === new Date().toDateString());
    else if (/finde|fin de semana/.test(nq)) ps = ps.filter((p) => [5, 6, 0, 1].includes(new Date(p.t).getDay()) && p.t - Date.now() < 5 * 86400e3);
    futAbrir(liga, "partidos");
    if (!ps.length) { responder("⚽ " + NOMBRES_LIGA[liga], "No hay partidos por jugar en esas fechas. Te dejo la tabla con los últimos resultados.", { voz: "No hay partidos en esas fechas." }); return; }
    const p0 = ps[0];
    responder("⚽ " + NOMBRES_LIGA[liga] + " · " + ps.length + " partidos", ps.slice(0, 4).map((p) => diaES(p.t) + " " + horaES(p.t) + " · " + p.local + " - " + p.visit).join("\n") + (ps.length > 4 ? "\n…y " + (ps.length - 4) + " más en la tabla" : "") + "\n✅ " + r.fuente, {
      voz: "El próximo es " + p0.local + " contra " + p0.visit + ", " + diaES(p0.t).toLowerCase() + " a las " + horaES(p0.t) + ". Tienes todos en la tabla."
    });
  } catch (e) {
    futAbrir(liga, "partidos");
    responder("⚽ Sin confirmar", "No he podido confirmar los partidos ahora mismo, así que no te digo nada que no sea seguro. Prueba en un momento.", { voz: "No he podido confirmar los partidos ahora mismo." });
  }
};
const _futbolClasV = futbolClasificacion;
futbolClasificacion = async function (q) {
  let liga = ligaDe(q) || "esp.1"; if (liga === "uefa.europa") liga = "uefa.champions";
  setEstado("thinking");
  try {
    const r = await clasificacion(liga);
    futAbrir(liga, "tabla");
    const t = r.tabla;
    responder("🏆 " + NOMBRES_LIGA[liga], t.slice(0, 5).map((x) => x.pos + ". " + x.eq + " · " + x.pts + " pts").join("\n") + "\n✅ " + r.fuente, { voz: "Líder: " + t[0].eq + " con " + t[0].pts + " puntos. Segundo, " + t[1].eq + " con " + t[1].pts + ". Tienes la tabla completa en pantalla." });
  } catch (e) {
    futAbrir(liga, "tabla");
    responder("🏆 Sin confirmar", "No he podido confirmar la clasificación ahora mismo. Prueba en un momento.", { voz: "No he podido confirmar la clasificación." });
  }
};
futbolHoy = function () { return futbolProximos("hoy"); };

// En segundo plano: al abrir y luego cada hora (cada 10 min si hay partido hoy), poco a poco
function futFondo() {
  const fav = memLeer().equipo, liga = (fav && fav.liga) || "esp.1";
  cargarProgresivo(liga, () => { if (!$("panelFutbol").hidden && futLiga === liga && futTab === "partidos") futPintarDatos(futLeer()[liga]); }).catch(() => {});
  const g = futLeer()[liga], hayHoy = g && (g.partidos || []).some((p) => new Date(p.t).toDateString() === new Date().toDateString() && p.estado !== "post");
  setTimeout(futFondo, (hayHoy ? 10 : 60) * 60e3);
}
setTimeout(futFondo, 6000);

// La IA nunca contesta de fútbol sin datos confirmados
const _datosRealesV = datosReales;
datosReales = async function (texto) {
  const r = await _datosRealesV(texto);
  if (RE_FUTBOL.test(texto) && !r.fuentes.includes("ESPN")) {
    try {
      const liga = ligaDe(texto) || ((memLeer().equipo || {}).liga) || "esp.1";
      const j = await jornada(liga);
      r.texto = "Partidos confirmados (" + j.fuente + "):\n" + j.partidos.sort((a, b) => a.t - b.t).map((p) => "- " + diaES(p.t) + " " + horaES(p.t) + ": " + p.local + " - " + p.visit + (p.estado === "post" ? " → " + p.gl + "-" + p.gv + " (final)" : p.estado === "in" ? " → " + p.gl + "-" + p.gv + " (en juego)" : " (por jugar)")).join("\n") + (r.texto ? "\n\n" + r.texto : "");
      r.fuentes.unshift(j.fuente);
    } catch (e) { r.sinFutbol = true; }
  }
  return r;
};

// Comandos: "abre el fútbol", "tabla de partidos", "jornada de la Premier"
const _masComandosF = masComandos;
masComandos = function (t, n, o) {
  if (/^(?:abre\s+(?:el\s+)?)?(?:futbol|resultados|tabla de partidos|partidos)$/.test(n)) { futAbrir(futLiga, "partidos"); responder("⚽ Fútbol", "Partidos y clasificación con datos confirmados.", { voz: "" }); return true; }
  return _masComandosF(t, n, o);
};

// Preguntas de un equipo ("cómo va el Madrid", "cuándo juega el Barça"): primero con lo guardado/confirmado
const _futbolEquipoV = futbolEquipo;
futbolEquipo = async function (q, modo) {
  const fav = memLeer().equipo;
  const objetivo = normEq(ALIAS_EQ[normEq(q).replace(/^(el|la)\s+/, "")] || q).replace(/^(el|la)\s+/, "");
  const coincide = (nom) => { const a = normEq(nom); return a === objetivo || a.includes(objetivo) || (objetivo.length > 4 && objetivo.includes(a)); };
  const ligas = [...new Set([(fav && coincide(fav.nombre) && fav.liga) || "esp.1", "esp.1", "uefa.champions"])];
  setEstado("thinking");
  for (const lg of ligas) {
    let j; try { j = await jornada(lg); } catch (e) { continue; }
    const suyos = j.partidos.filter((p) => coincide(p.local) || coincide(p.visit)).sort((a, b) => a.t - b.t);
    if (!suyos.length) continue;
    const nombre = coincide(suyos[0].local) ? suyos[0].local : suyos[0].visit;
    const vivo = suyos.find((p) => p.estado === "in"), ult = suyos.filter((p) => p.estado === "post").pop(), prox = suyos.find((p) => p.estado === "pre");
    ctxSet({ tipo: "futbol", modo, equipo: nombre });
    const txtP = (p) => p.local + " " + p.gl + " - " + p.gv + " " + p.visit;
    const pie = "\n✅ " + j.fuente + (j.viejo ? " (guardado)" : "");
    const nodo = (p, t) => nodoFutbol({ estado: p.estado, local: p.local, visit: p.visit, gl: p.gl, gv: p.gv, escL: p.escL, escV: p.escV, reloj: p.reloj, fecha: new Date(p.t) }, NOMBRES_LIGA[lg], t);
    if (vivo) { nodo(vivo, "¡En directo!"); responder("⚽ En directo", txtP(vivo) + (vivo.reloj ? " · " + vivo.reloj : "") + pie, { voz: "Ahora mismo va " + vivo.local + " " + vivo.gl + ", " + vivo.visit + " " + vivo.gv }); return; }
    if ((modo === "proximo" || !ult) && prox) {
      nodo(prox, ult ? "Último: " + txtP(ult) : "");
      responder("⚽ Próximo partido del " + nombre, prox.local + " - " + prox.visit + "\n" + diaES(prox.t) + " a las " + horaES(prox.t) + pie, { voz: "El " + nombre + " juega " + diaES(prox.t).toLowerCase() + " a las " + horaES(prox.t) + ": " + prox.local + " contra " + prox.visit });
      return;
    }
    if (ult) {
      const g = coincide(ult.local) ? +ult.gl - +ult.gv : +ult.gv - +ult.gl, ver = g > 0 ? "ganó" : g < 0 ? "perdió" : "empató";
      nodo(ult, prox ? "Próximo: " + diaES(prox.t) + " " + horaES(prox.t) : "");
      responder("⚽ El " + nombre + " " + ver, txtP(ult) + " (" + diaES(ult.t) + ")" + (prox ? "\nPróximo: " + prox.local + " - " + prox.visit + ", " + diaES(prox.t) + " a las " + horaES(prox.t) : "") + pie, { voz: "El " + nombre + " " + ver + ": " + ult.local + " " + ult.gl + ", " + ult.visit + " " + ult.gv + "." + (prox ? " El próximo, " + diaES(prox.t).toLowerCase() + " a las " + horaES(prox.t) + "." : "") });
      return;
    }
  }
  return _futbolEquipoV(q, modo);
};


// ================== CHAMPIONS: fase liga y eliminatorias ==================
const RONDAS = [
  [/play-?off|knockout round/i, "Playoff de acceso a octavos", 1],
  [/round of 16|octavos/i, "Octavos de final", 2],
  [/quarter|cuartos/i, "Cuartos de final", 3],
  [/semi/i, "Semifinales", 4],
  [/final/i, "Final", 5]
];
function rondaDe(ev) {
  const comp = (ev.competitions || [])[0] || {};
  const txt = [((comp.notes || [])[0] || {}).headline, ev.season && ev.season.slug, ev.name, ev.shortName].filter(Boolean).join(" ");
  const r = RONDAS.find(([re]) => re.test(txt));
  if (!r || /league phase|fase liga|matchday/i.test(txt) && !/play-?off|round of|quarter|semi/i.test(txt)) return null;
  return { nombre: r[1], orden: r[2], vuelta: /2nd leg|vuelta|second leg/i.test(txt) };
}
// Fechas de la competición (incluye las eliminatorias aunque falten meses)
async function fechasUcl() {
  const d = await jsonDe("https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard");
  const cal = ((d.leagues || [])[0] || {}).calendar || [];
  const fechas = [];
  cal.forEach((c) => {
    if (typeof c === "string") fechas.push(c);
    else { if (c.startDate) fechas.push(c.startDate); (c.entries || []).forEach((e) => e.startDate && fechas.push(e.startDate)); }
  });
  return [...new Set(fechas.map((f) => f.slice(0, 10)))].sort();
}
async function cargarCuadro(forzar) {
  const c = futLeer(), g = c["uefa.champions"] = c["uefa.champions"] || { partidos: [] };
  if (g.cuadro && !forzar && Date.now() - (g.actCuadro || 0) < 6 * 3600e3) return g.cuadro;
  const fechas = await fechasUcl();
  // Las eliminatorias van de febrero a junio del segundo año de la temporada
  const fin = +temporada().slice(5);
  const ko = fechas.filter((f) => f >= fin + "-02-01" && f <= fin + "-06-30");
  const yyyymmdd = (f) => f.replace(/-/g, "");
  const evs = [];
  await deTresEnTres(ko.map((f) => async () => (await jsonDe("https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=" + yyyymmdd(f))).events || []), (lote) => evs.push(...lote));
  const cruces = {};
  evs.forEach((ev) => {
    const r = rondaDe(ev); if (!r) return;
    const p = deEspn(ev);
    const k = r.orden + "|" + [normEq(p.local), normEq(p.visit)].sort().join("|");
    const x = cruces[k] = cruces[k] || { ronda: r.nombre, orden: r.orden, partidos: [] };
    x.partidos.push(Object.assign(p, { vuelta: r.vuelta }));
  });
  const cuadro = Object.values(cruces).map((x) => { x.partidos.sort((a, b) => a.t - b.t); return x; }).sort((a, b) => a.orden - b.orden || a.partidos[0].t - b.partidos[0].t);
  const c2 = futLeer(); c2["uefa.champions"] = Object.assign(c2["uefa.champions"] || { partidos: [] }, { cuadro, fechasKo: ko, actCuadro: Date.now() }); futGuardar(c2);
  return cuadro;
}
async function pintarCuadro(forzar) {
  const lista = $("futLista"), pie = $("futPie");
  const cuadro = await cargarCuadro(forzar);
  lista.innerHTML = "";
  if (!cuadro.length) {
    const ko = (futLeer()["uefa.champions"] || {}).fechasKo || [];
    const prox = ko.find((f) => f >= fechaISO(new Date()));
    lista.innerHTML = '<div class="futinfo"><b>🏆 Ahora: fase liga</b><p>Los 8 primeros van directos a octavos. Del 9.º al 24.º juegan un playoff (ida y vuelta) para entrar en octavos. Del 25.º en adelante, eliminados.</p><p>Cuando se haga el sorteo, los cruces aparecerán aquí solos.' + (prox ? " Las eliminatorias empiezan el " + deISO(prox).toLocaleDateString("es-ES", { day: "numeric", month: "long" }) + "." : "") + "</p></div>";
    pie.textContent = "✅ Calendario de ESPN";
    return;
  }
  let rondaAnt = "";
  cuadro.forEach((x) => {
    if (x.ronda !== rondaAnt) { const h = document.createElement("h6"); h.textContent = x.ronda; lista.append(h); rondaAnt = x.ronda; }
    const ida = x.partidos[0], vta = x.partidos[1];
    const box = document.createElement("div"); box.className = "cruce";
    // Global: suma de goles de cada equipo en los partidos jugados
    const eqA = ida.local, eqB = ida.visit;
    let gA = 0, gB = 0, jugados = 0;
    x.partidos.forEach((p) => { if (p.estado === "pre") return; jugados++; const l = +p.gl || 0, v = +p.gv || 0; if (normEq(p.local) === normEq(eqA)) { gA += l; gB += v; } else { gA += v; gB += l; } });
    const fila = (nom, esc, g, gana) => { const d = document.createElement("div"); d.className = "crfila" + (gana ? " gana" : ""); if (esc) { const im = document.createElement("img"); im.src = esc; im.alt = ""; im.onerror = () => im.remove(); d.append(im); } const b = document.createElement("b"); b.textContent = nom; const n = document.createElement("span"); n.textContent = jugados ? g : ""; d.append(b, n); return d; };
    const acabado = x.partidos.length > 1 ? vta.estado === "post" : ida.estado === "post";
    box.append(fila(eqA, ida.escL, gA, acabado && gA > gB), fila(eqB, ida.escV, gB, acabado && gB > gA));
    const info = document.createElement("small");
    info.textContent = x.partidos.map((p) => (x.partidos.length > 1 ? (p.vuelta ? "Vuelta" : "Ida") + ": " : "") + (p.estado === "pre" ? diaES(p.t) + " " + horaES(p.t) : p.local + " " + p.gl + "-" + p.gv + " " + p.visit)).join(" · ");
    box.append(info);
    lista.append(box);
  });
  pie.textContent = "✅ Datos de ESPN · cuadro actualizado " + hace((futLeer()["uefa.champions"] || {}).actCuadro).toLowerCase();
}
// Si la Champions ya está en eliminatorias, abre directamente el cuadro
const _futAbrirV = futAbrir;
futAbrir = function (liga, tab) {
  const g = futLeer()["uefa.champions"];
  if (liga === "uefa.champions" && tab === "tabla" && g && (g.cuadro || []).length) tab = "cuadro";
  return _futAbrirV(liga, tab);
};
