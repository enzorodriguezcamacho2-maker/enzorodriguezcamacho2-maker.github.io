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

async function partidosDeFuentes(liga) {
  const ymd = (d) => d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  const ruta = "/apis/site/v2/sports/soccer/" + liga + "/scoreboard?dates=" + ymd(sumarDias(hoy0(), -8)) + "-" + ymd(sumarDias(hoy0(), 10)) + "&limit=100";
  // 1) ESPN directo
  try { const d = await jsonDe("https://site.api.espn.com" + ruta); const ps = (d.events || []).map(deEspn); if (ps.length) return { partidos: ps, fuente: "ESPN" }; } catch (e) {}
  // 2) TheSportsDB (gratis, se puede leer desde el navegador)
  const id = TSDB[liga];
  if (id) {
    try {
      const base = "https://www.thesportsdb.com/api/v1/json/3/";
      let ronda = null;
      try { const nx = await jsonDe(base + "eventsnextleague.php?id=" + id); ronda = +((nx.events || [])[0] || {}).intRound || null; } catch (e) {}
      if (!ronda) { const ps = await jsonDe(base + "eventspastleague.php?id=" + id); ronda = (+((ps.events || [])[0] || {}).intRound || 0) + 1; }
      const rondas = await Promise.all([ronda - 1, ronda].filter((r) => r > 0).map((r) => jsonDe(base + "eventsround.php?id=" + id + "&r=" + r + "&s=" + temporada()).catch(() => ({}))));
      const vistos = new Set();
      const ps = rondas.flatMap((x) => x.events || []).map(deTsdb).filter((p) => p.t && !vistos.has(p.local + p.visit + p.t) && vistos.add(p.local + p.visit + p.t));
      if (ps.length) return { partidos: ps, fuente: "TheSportsDB" };
    } catch (e) {}
  }
  // 3) Tu script de Google / 4) intermediario
  try { const d = await espn(ruta); const ps = (d.events || []).map(deEspn); if (ps.length) return { partidos: ps, fuente: "ESPN" }; } catch (e) {}
  throw new Error("sin fuente");
}

async function tablaDeFuentes(liga) {
  if (liga.startsWith("uefa")) throw new Error("sin tabla");
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
// Se refresca solo: cada 12 h, o antes si había un partido en juego o que ya debería haber acabado.
function necesitaRefresco(c) {
  if (!c || !c.act || !c.fuente || !(c.partidos || []).length) return true;
  const edad = Date.now() - c.act;
  if (edad > 12 * 3600e3) return true;
  if (edad > 10 * 60e3 && (c.partidos || []).some((p) => p.estado === "in" || (p.estado === "pre" && p.t < Date.now() - 2 * 3600e3))) return true;
  return false;
}
async function jornada(liga, forzar) {
  const c = futLeer();
  const guardado = c[liga];
  if (guardado && !forzar && !necesitaRefresco(guardado)) return Object.assign({ deCache: true }, guardado);
  try {
    const r = await partidosDeFuentes(liga);
    const nuevo = Object.assign(guardado || {}, { partidos: r.partidos, fuente: r.fuente, act: Date.now() });
    const c2 = futLeer(); c2[liga] = nuevo; futGuardar(c2);
    return nuevo;
  } catch (e) {
    if (guardado && guardado.fuente && guardado.partidos && guardado.partidos.length) return Object.assign({ deCache: true, viejo: true }, guardado);
    throw e;
  }
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
  document.querySelectorAll(".futtab").forEach((t) => t.classList.toggle("on", t.dataset.tab === futTab));
}
async function futPintar(forzar) {
  futChips();
  const lista = $("futLista"), pie = $("futPie");
  $("futTitulo").textContent = NOMBRES_LIGA[futLiga];
  lista.innerHTML = '<div class="futcarga">Cargando datos confirmados…</div>';
  try {
    if (futTab === "tabla") {
      const r = await clasificacion(futLiga, forzar);
      lista.innerHTML = "";
      const tb = document.createElement("table"); tb.className = "futtabla";
      tb.innerHTML = "<thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>DG</th><th>Pts</th></tr></thead>";
      const body = document.createElement("tbody");
      const fav = (memLeer().equipo || {}).nombre || "";
      r.tabla.forEach((x) => {
        const tr = document.createElement("tr");
        if (x.pos <= 4) tr.className = "champ"; else if (x.pos >= r.tabla.length - 2) tr.className = "desc";
        if (fav && normEq(x.eq).includes(normEq(fav).split(" ").pop())) tr.classList.add("fav");
        const c = (t) => { const td = document.createElement("td"); td.textContent = t; return td; };
        const eq = document.createElement("td"); eq.className = "eqcel";
        if (x.esc) { const im = document.createElement("img"); im.src = x.esc; im.alt = ""; im.loading = "lazy"; im.onerror = () => im.remove(); eq.append(im); }
        eq.append(x.eq);
        tr.append(c(x.pos), eq, c(x.pj ?? ""), c(x.dg > 0 ? "+" + x.dg : x.dg ?? ""), c(x.pts));
        body.append(tr);
      });
      tb.append(body); lista.append(tb);
      pie.textContent = "✅ Datos de " + r.fuente + " · actualizado " + hace(r.act).toLowerCase() + (r.viejo ? " (sin conexión: guardado)" : "");
      return;
    }
    const r = await jornada(futLiga, forzar);
    const ps = r.partidos.slice().sort((a, b) => a.t - b.t);
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
    grupo("Próximos partidos", proximos);
    grupo("Resultados", jugados);
    pie.textContent = "✅ Datos de " + r.fuente + " · actualizado " + hace(r.act).toLowerCase() + (r.viejo ? " (sin conexión: guardado)" : r.deCache ? " · guardado" : "");
  } catch (e) {
    lista.innerHTML = '<div class="futcarga">⚠️ No he podido confirmar los datos ahora mismo y no tengo nada guardado de esta liga. Prueba en un momento.</div>';
    pie.textContent = "";
  }
}
function futAbrir(liga, tab) {
  if (liga) futLiga = liga;
  futTab = tab || "partidos";
  panelAbrir("panelFutbol");
  futPintar();
}
document.querySelectorAll(".futtab").forEach((t) => t.addEventListener("click", () => { futTab = t.dataset.tab; futPintar(); }));
$("futCerrar").addEventListener("click", panelCerrar);
$("futRecargar").addEventListener("click", () => futPintar(true));

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
  let liga = ligaDe(q) || "esp.1"; if (liga.startsWith("uefa")) liga = "esp.1";
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

// Precarga en segundo plano tu liga (así al preguntar sale al instante)
setTimeout(() => {
  const fav = memLeer().equipo;
  const liga = (fav && fav.liga) || "esp.1";
  if (necesitaRefresco(futLeer()[liga])) jornada(liga).catch(() => {});
}, 8000);

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
