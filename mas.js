// Jarvis v9: IA, contexto, fútbol, rutinas, mini pantallas de tiempo y temporizador, avisos al móvil.

// ================== CONEXIÓN CON EL SCRIPT DE GOOGLE ==================
const scriptBase = () => localStorage.getItem("jarvisResumenUrl") || "";
const scriptClave = () => localStorage.getItem("jarvisClave") || "";
const scriptListo = () => !!(scriptBase() && scriptClave());
const geminiClave = () => localStorage.getItem("jarvisGemini") || "";
const iaLista = () => !!(geminiClave() || scriptListo());

// IA directa con tu propia clave de Gemini (se guarda solo en este aparato)
const MODELOS_IA = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"];
function sistemaIA() {
  const mem = typeof memLeer === "function" ? memLeer() : { nombre: "", datos: [] };
  const ahora = new Date().toLocaleString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return "Eres Jarvis, el asistente personal de voz del usuario, al estilo del Jarvis de Iron Man: listo, cercano y con un punto de humor. " +
    "Responde SIEMPRE en español de España, en 1 a 4 frases cortas, porque se lee en voz alta. Sin asteriscos, sin markdown, sin emojis. " +
    "Si preguntan por partidos, resultados, clasificaciones, noticias o cualquier dato actual, BUSCA en Google y da datos concretos (equipos, día y hora en horario de España). " +
    "Fecha y hora actual: " + ahora + ". " + (cfg.ciudad ? "El usuario vive en " + cfg.ciudad + ". " : "") +
    (mem.nombre ? "Llama al usuario \"" + mem.nombre + "\". " : "") +
    (mem.equipo ? "Su equipo de fútbol es el " + mem.equipo.nombre + ". " : "") +
    ((mem.datos || []).length ? "Cosas que te pidió recordar: " + mem.datos.join(" | ") + ". " : "");
}
// ¿La pregunta necesita datos de hoy? Entonces se busca en Google (más lento pero actualizado)
const RE_ACTUAL = /partid|jornada|liga|champions|resultad|clasific|puesto|tabla|gol|fichaj|noticia|hoy|ma[ñn]ana|ayer|ahora|actual|[uú]ltim|pr[oó]xim|esta semana|este finde|precio|cu[aá]nto cuesta|cotiza|bolsa|elecci|gan[oó]|qui[eé]n gan|estreno|concierto|tiempo en|temperatura|2025|2026|2027|presidente|ceo|sigue siendo|todav[ií]a/i;
const sinThink = new Set();
const conTiempo = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
async function geminiDirecto(partes, conHistorial) {
  const texto = partes.map((p) => p.text || "").join(" ");
  const buscar = RE_ACTUAL.test(texto) && !partes.some((p) => p.inline_data);
  let partesFin = partes;
  if (buscar) {
    const hoy = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    partesFin = partes.map((p) => p.text ? { text: p.text + "\n\n(Hoy es " + hoy + ". Busca en Google información de hoy. Si es fútbol, da la jornada o los partidos que se juegan a partir de hoy, no los de la jornada anterior, con día y hora de España.)" } : p);
    transcriptEl.textContent = "🔎 Buscando en Google…";
  }
  const contents = (conHistorial ? iaHist.slice(-6).map((m) => ({ role: m.r === "j" ? "model" : "user", parts: [{ text: m.t.slice(0, 500) }] })) : []).concat([{ role: "user", parts: partesFin }]);
  // Rápido primero cuando no hace falta buscar; el modelo mejor primero cuando sí
  const modelos = buscar ? ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"] : ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-flash-latest"];
  const intentos = buscar ? [true, false] : [false];
  let ultimo = "";
  for (const conBusqueda of intentos) {
    for (const mod of modelos) {
      for (const sinPensar of (sinThink.has(mod) ? [false] : [true, false])) {
        const cuerpo = { contents, systemInstruction: { parts: [{ text: sistemaIA() }] }, generationConfig: { maxOutputTokens: 600, temperature: 0.6 } };
        if (sinPensar) cuerpo.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        if (conBusqueda) cuerpo.tools = [{ google_search: {} }];
        let r;
        try {
          r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + mod + ":generateContent", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": geminiClave() }, body: JSON.stringify(cuerpo), signal: conTiempo(conBusqueda ? 20000 : 12000) });
        } catch (e) { ultimo = mod + (e.name === "AbortError" ? " tardó demasiado" : " sin red"); break; }
        const d = await r.json().catch(() => ({}));
        const err = JSON.stringify(d.error || "");
        if (r.status === 400 && /API key|API_KEY/i.test(err)) throw new Error("clave");
        if (r.status === 403) throw new Error("clave");
        if (r.status === 400 && sinPensar && /think/i.test(err)) { sinThink.add(mod); continue; } // ese modelo no acepta el ajuste: reintenta sin él
        const c = d.candidates && d.candidates[0];
        const txt = c && c.content && c.content.parts ? c.content.parts.map((p) => p.text || "").join("").trim() : "";
        if (txt) {
          const web = !!(c.groundingMetadata && ((c.groundingMetadata.webSearchQueries || []).length || (c.groundingMetadata.groundingChunks || []).length));
          window.iaInfo = { modelo: mod, web, foto: partes.some((p) => p.inline_data) };
          localStorage.setItem("jarvisIaBusqueda", buscar ? (web ? "ok" : "fallo:" + (ultimo || "sin búsqueda")) : localStorage.getItem("jarvisIaBusqueda") || "");
          let out = txt.replace(/\*+/g, "").replace(/\[\d+(?:,\s*\d+)*\]/g, "").replace(/#+\s*/g, "");
          if (buscar && !web) out += "\n\n⚠️ No he podido buscar en internet: puede estar desactualizado.";
          return out;
        }
        ultimo = mod + " " + r.status + (d.error && d.error.message ? " " + d.error.message.slice(0, 80) : "");
        break;
      }
    }
  }
  throw new Error(ultimo || "sin respuesta");
}
async function script(params) {
  const q = Object.entries(Object.assign({ clave: scriptClave() }, params)).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  const r = await fetch(scriptBase() + "?" + q);
  return r.json();
}

// ================== COLOR DEL ORBE SEGÚN LO QUE HACE ==================
const _nodoMostrar = nodoMostrar;
nodoMostrar = function (id, segundos) {
  if (NODOS[id]) orb.setTinte(NODOS[id][0], 7000);
  return _nodoMostrar(id, segundos);
};

// ================== CONTEXTO DE LA CONVERSACIÓN ==================
let ctx = {};
function ctxSet(c) { ctx = Object.assign({}, c, { ts: Date.now() }); }
const ctxVivo = () => ctx.tipo && Date.now() - ctx.ts < 10 * 60 * 1000;

// ================== IA (Gemini, a través del script) ==================
let iaHist = [];
async function preguntarIA(texto) {
  if (!iaLista()) {
    responder("🤖 Falta tu clave de IA", "Abre Ajustes (la rueda de arriba) y pega tu clave de Gemini en «Clave de IA».", { voz: "Para responder con inteligencia artificial necesito tu clave. Ponla en ajustes." });
    return;
  }
  setEstado("thinking");
  if (geminiClave()) {
    try {
      const r = await geminiDirecto([{ text: texto }], true);
      iaHist.push({ r: "u", t: texto }, { r: "j", t: r }); iaHist = iaHist.slice(-12);
      ctxSet({ tipo: "ia" });
      responder("🤖 Jarvis", r, { botones: [{ texto: "Buscar en Google", url: "https://www.google.com/search?q=" + encodeURIComponent(texto) }] });
    } catch (e) {
      if (e.message === "clave") responder("🤖 Clave no válida", "Google dice que tu clave de IA no vale. Revísala en Ajustes.", { voz: "Tu clave de inteligencia artificial no es válida." });
      else responder("🤖 Sin respuesta", "La IA no ha respondido ahora mismo. Prueba en un momento.", { voz: "La inteligencia artificial no responde ahora. Prueba en un momento." });
    }
    return;
  }
  const mem = typeof memLeer === "function" ? memLeer() : { nombre: "", datos: [] };
  try {
    const d = await script({
      accion: "ia", q: texto,
      hist: JSON.stringify(iaHist.slice(-6).map((m) => ({ r: m.r, t: m.t.slice(0, 400) }))),
      nombre: mem.nombre || "", datos: (mem.datos || []).join(" | ").slice(0, 600)
    });
    if (d.respuesta) {
      iaHist.push({ r: "u", t: texto }, { r: "j", t: d.respuesta });
      iaHist = iaHist.slice(-12);
      ctxSet({ tipo: "ia" });
      responder("🤖 Jarvis", d.respuesta, {
        botones: [{ texto: "Buscar en Google", url: "https://www.google.com/search?q=" + encodeURIComponent(texto) }]
      });
    } else if (d.error) {
      responder("🤖 No he podido", d.error === "Clave incorrecta" ? "La clave no coincide con la del script. Di «configura clave …» otra vez." : d.error, { voz: "No he podido responder ahora." });
    } else {
      responder("🤖 Falta actualizar el script", "Tu script de Google es la versión antigua. Pega el código nuevo y crea una versión nueva de la implementación.", { voz: "Necesito que actualices el script de Google." });
    }
  } catch (e) {
    responder("🤖 Sin conexión", "No he podido hablar con la IA ahora mismo.", { voz: "No he podido conectar." });
  }
}

// ================== MINI PANTALLA: TIEMPO ==================
function nodoTiempo(lugar, d, cuando) {
  const c = d.current, dd = d.daily, i0 = cuando === "manana" ? 1 : 0;
  const cod = i0 ? dd.weather_code[1] : c.weather_code;
  const [desc, ico] = CODIGOS[cod] || ["Variable", "🌡"];
  $("nodoTiempoLugar").textContent = lugar + (i0 ? " · mañana" : "");
  $("nodoTiempoIco").textContent = ico;
  $("nodoTiempoTemp").textContent = i0 ? Math.round(dd.temperature_2m_max[1]) + "°" : Math.round(c.temperature_2m) + "°";
  $("nodoTiempoDesc").textContent = desc + " · " + Math.round(dd.temperature_2m_max[i0]) + "°/" + Math.round(dd.temperature_2m_min[i0]) + "°";
  const dias = $("nodoTiempoDias"); dias.innerHTML = "";
  for (let i = 1; i <= 4 && i < dd.time.length; i++) {
    const f = new Date(dd.time[i] + "T12:00");
    const s = document.createElement("span");
    const em = document.createElement("em"); em.textContent = (CODIGOS[dd.weather_code[i]] || ["", "🌡"])[1];
    s.append(DIAS_SEM[f.getDay()].slice(0, 2), em, Math.round(dd.temperature_2m_max[i]) + "°");
    dias.append(s);
  }
  nodoMostrar("nodoTiempo");
}
$("nodoTiempo").addEventListener("click", () => ejecutar("tiempo esta semana" + (ctx.lugar ? " en " + ctx.lugar : "")));

// ================== MINI PANTALLA: TEMPORIZADOR ==================
let timerTotal = 0;
function nodoTimerTick(r, seg, etiqueta) {
  if (!$("nodoTimer").classList.contains("on") || seg !== timerTotal) {
    timerTotal = seg;
    $("nodoTimerTxt").textContent = etiqueta || "Temporizador";
    nodoMostrar("nodoTimer", 0);
  }
  $("nodoTimerNum").textContent = fmt(r);
  $("nodoTimerArco").style.strokeDashoffset = String(100 * (1 - r / Math.max(1, seg)));
  document.querySelector(".ntimer").classList.toggle("poco", r <= 10);
}
function nodoTimerFin() { timerTotal = 0; nodoOcultar("nodoTimer", true); }
$("nodoTimer").addEventListener("click", () => ejecutar("cancela el temporizador"));

// ================== FÚTBOL (datos públicos de ESPN) ==================
const LIGAS = ["esp.1", "eng.1", "ita.1", "ger.1", "fra.1", "por.1", "esp.2", "ned.1", "usa.1"];
const ALIAS_EQ = {
  "madrid": "real madrid", "real madrid": "real madrid", "el madrid": "real madrid", "merengues": "real madrid",
  "barca": "barcelona", "barsa": "barcelona", "el barca": "barcelona", "fc barcelona": "barcelona", "barcelona": "barcelona",
  "atleti": "atletico madrid", "atletico": "atletico madrid", "atletico de madrid": "atletico madrid",
  "athletic": "athletic club", "athletic de bilbao": "athletic club", "bilbao": "athletic club",
  "betis": "real betis", "real sociedad": "real sociedad", "la real": "real sociedad", "celta": "celta vigo", "celta de vigo": "celta vigo",
  "city": "manchester city", "manchester city": "manchester city", "united": "manchester united", "manchester united": "manchester united",
  "psg": "paris saint-germain", "paris": "paris saint-germain", "bayern": "bayern munich", "bayern de munich": "bayern munich",
  "juve": "juventus", "inter": "internazionale", "inter de milan": "internazionale", "milan": "ac milan",
  "dortmund": "borussia dortmund", "liverpool": "liverpool", "arsenal": "arsenal", "chelsea": "chelsea", "tottenham": "tottenham hotspur",
  "benfica": "benfica", "oporto": "fc porto", "porto": "fc porto", "sporting": "sporting cp", "rayo": "rayo vallecano", "espanyol": "espanyol"
};
const NOMBRES_LIGA = { "esp.1": "LaLiga", "eng.1": "Premier League", "ita.1": "Serie A", "ger.1": "Bundesliga", "fra.1": "Ligue 1", "por.1": "Liga Portugal", "esp.2": "LaLiga 2", "ned.1": "Eredivisie", "usa.1": "MLS", "uefa.champions": "Champions" };

let espnRoto = false;
async function espn(ruta) {
  if (!espnRoto) {
    try {
      const r = await fetch("https://site.api.espn.com" + ruta, { signal: conTiempo(7000) });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      localStorage.setItem("jarvisEspn", "ok");
      return d;
    } catch (e) {
      // Si falla (bloqueo del navegador o sin red), no lo reintenta en esta sesión: va directo a la IA
      espnRoto = true;
      localStorage.setItem("jarvisEspn", "fallo:" + (e.message || e.name || "bloqueado"));
    }
  }
  if (!scriptListo()) throw new Error("espn");
  return script({ accion: "espn", ruta });
}

const equiposCache = {};
async function equiposDe(liga) {
  if (!equiposCache[liga]) {
    const d = await espn("/apis/site/v2/sports/soccer/" + liga + "/teams");
    equiposCache[liga] = ((((d.sports || [])[0] || {}).leagues || [])[0] || {}).teams || [];
  }
  return equiposCache[liga];
}
const normEq = (s) => quitarTildes(String(s || "").toLowerCase()).replace(/\bfc\b|\bcf\b|\bclub de futbol\b/g, "").replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ").trim();
async function buscarEquipo(q) {
  q = normEq(q).replace(/^(el|la|los|las)\s+/, "");
  const objetivo = ALIAS_EQ[q] || ALIAS_EQ[normEq(q)] || q;
  let parcial = null;
  for (const liga of LIGAS) {
    let lista = [];
    try { lista = await equiposDe(liga); } catch (e) { if (espnRoto && !scriptListo()) throw e; continue; }
    for (const x of lista) {
      const t = x.team || x;
      const nombres = [t.displayName, t.shortDisplayName, t.name, t.location, t.nickname].map(normEq);
      if (nombres.includes(objetivo)) return { t, liga };
      if (!parcial && objetivo.length > 3 && nombres.some((n) => n.includes(objetivo) || (n.length > 3 && objetivo.includes(n)))) parcial = { t, liga };
    }
    if (parcial && liga === "esp.1") return parcial; // prioriza España
  }
  return parcial;
}

// Saca los datos de un partido de ESPN
function partido(ev) {
  const comp = (ev.competitions || [])[0] || {};
  const st = (comp.status || ev.status || {}), ty = st.type || {};
  const cs = comp.competitors || [];
  const loc = cs.find((c) => c.homeAway === "home") || cs[0] || {}, vis = cs.find((c) => c.homeAway === "away") || cs[1] || {};
  const gol = (c) => c.score == null ? "" : typeof c.score === "object" ? (c.score.displayValue ?? c.score.value ?? "") : c.score;
  const esc = (c) => (c.team && (c.team.logo || (c.team.logos && c.team.logos[0] && c.team.logos[0].href))) || "";
  const nom = (c) => (c.team && (c.team.shortDisplayName || c.team.displayName)) || "";
  return {
    estado: ty.state || "pre", detalle: ty.shortDetail || ty.detail || "", reloj: st.displayClock || "",
    fecha: new Date(ev.date || comp.date), local: nom(loc), visit: nom(vis), gl: String(gol(loc)), gv: String(gol(vis)),
    escL: esc(loc), escV: esc(vis), idL: loc.team && loc.team.id, idV: vis.team && vis.team.id, liga: (ev.league && ev.league.abbreviation) || ""
  };
}
const fechaPartido = (f) => {
  const hoy = hoy0(), d0 = new Date(f); d0.setHours(0, 0, 0, 0);
  const dif = Math.round((d0 - hoy) / 86400000);
  const hora = f.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const dia = dif === 0 ? "hoy" : dif === 1 ? "mañana" : dif === -1 ? "ayer" : DIAS_SEM[f.getDay()] + " " + f.getDate();
  return dia + " a las " + hora;
};

function nodoFutbol(p, ligaNombre, pie) {
  $("nodoFutbolLiga").textContent = ligaNombre || "Fútbol";
  $("nodoFutbolEq1").textContent = p.local; $("nodoFutbolEq2").textContent = p.visit;
  [["nodoFutbolEsc1", p.escL], ["nodoFutbolEsc2", p.escV]].forEach(([id, src]) => { const im = $(id); im.hidden = !src; if (src) im.src = src; });
  const est = $("nodoFutbolEstado");
  if (p.estado === "pre") { $("nodoFutbolMarcador").textContent = "vs"; est.textContent = fechaPartido(p.fecha); est.className = ""; }
  else { $("nodoFutbolMarcador").textContent = p.gl + " - " + p.gv; est.textContent = p.estado === "in" ? (p.reloj || p.detalle || "En juego") : "Final"; est.className = p.estado === "in" ? "vivo" : ""; }
  $("nodoFutbolPie").textContent = pie || "";
  nodoMostrar("nodoFutbol", 60);
}

async function futbolEquipo(q, modo) {
  ctxSet({ tipo: "futbol", modo });
  setEstado("thinking");
  try {
    const e = await buscarEquipo(q);
    if (!e) {
      if (iaLista()) return preguntarIA("Fútbol, datos actuales de hoy: " + (modo === "proximo" ? "¿Cuándo juega " : "¿Cómo ha quedado ") + q + "?");
      responder("⚽ No lo encuentro", "No encuentro el equipo «" + q + "».", { voz: "No encuentro ese equipo" }); return;
    }
    const { t, liga } = e, nombre = t.shortDisplayName || t.displayName;
    ctxSet({ tipo: "futbol", modo, equipo: nombre });
    // ¿Está jugando ahora o hoy? (liga y Champions)
    let hoyP = null;
    for (const lg of [liga, "uefa.champions", "uefa.europa"]) {
      try {
        const sb = await espn("/apis/site/v2/sports/soccer/" + lg + "/scoreboard");
        const ev = (sb.events || []).map(partido).find((p) => p.idL === t.id || p.idV === t.id);
        if (ev) { hoyP = Object.assign(ev, { lg }); if (ev.estado === "in") break; }
      } catch (err) {}
    }
    const [pas, fut] = await Promise.all([
      espn("/apis/site/v2/sports/soccer/" + liga + "/teams/" + t.id + "/schedule").catch(() => ({})),
      espn("/apis/site/v2/sports/soccer/" + liga + "/teams/" + t.id + "/schedule?fixture=true").catch(() => ({}))
    ]);
    const jugados = (pas.events || []).map(partido).filter((p) => p.estado === "post").sort((a, b) => b.fecha - a.fecha);
    const proximos = (fut.events || []).map(partido).filter((p) => p.estado === "pre" && p.fecha > Date.now() - 3 * 3600000).sort((a, b) => a.fecha - b.fecha);
    const ult = jugados[0], prox = proximos[0];
    const txtPar = (p) => p.local + " " + p.gl + " - " + p.gv + " " + p.visit;

    if (hoyP && hoyP.estado === "in") {
      nodoFutbol(hoyP, NOMBRES_LIGA[hoyP.lg], "¡En directo!");
      responder("⚽ En directo", txtPar(hoyP) + " · " + (hoyP.reloj || hoyP.detalle), { voz: "Ahora mismo va " + hoyP.local + " " + hoyP.gl + ", " + hoyP.visit + " " + hoyP.gv + ". Minuto " + (hoyP.reloj || "").replace("'", "") });
      return;
    }
    if (modo === "proximo" || (!ult && prox)) {
      const p = (hoyP && hoyP.estado === "pre") ? hoyP : prox;
      if (!p) { responder("⚽ " + nombre, "No encuentro su próximo partido.", { voz: "No encuentro su próximo partido" }); return; }
      nodoFutbol(p, NOMBRES_LIGA[p.lg || liga], ult ? "Último: " + txtPar(ult) : "");
      responder("⚽ Próximo partido", p.local + " - " + p.visit + "\n" + capital(fechaPartido(p.fecha)), { voz: nombre + " juega " + fechaPartido(p.fecha) + ": " + p.local + " contra " + p.visit });
      return;
    }
    const base = (hoyP && hoyP.estado === "post") ? hoyP : ult;
    if (!base) { responder("⚽ " + nombre, "No tengo resultados recientes.", { voz: "No tengo resultados recientes" }); return; }
    const gano = (base.idL === t.id ? +base.gl - +base.gv : +base.gv - +base.gl);
    const veredicto = gano > 0 ? "ganó" : gano < 0 ? "perdió" : "empató";
    nodoFutbol(base, NOMBRES_LIGA[base.lg || liga], prox ? "Próximo: " + (prox.idL === t.id ? prox.visit : prox.local) + ", " + fechaPartido(prox.fecha) : "");
    responder("⚽ " + nombre + " " + veredicto, txtPar(base) + " (" + fechaPartido(base.fecha).replace(/ a las.*/, "") + ")" + (prox ? "\nPróximo: " + prox.local + " - " + prox.visit + ", " + fechaPartido(prox.fecha) : ""), {
      voz: "El " + nombre + " " + veredicto + ": " + base.local + " " + base.gl + ", " + base.visit + " " + base.gv + "." + (prox ? " El próximo partido es " + fechaPartido(prox.fecha) + "." : "")
    });
  } catch (e) {
    if (iaLista()) return preguntarIA("Fútbol, datos actuales de hoy: " + (window.ultimaOrden || ((modo === "proximo" ? "¿Cuándo juega el " : "¿Cómo ha quedado el ") + q + "?")));
    responder("⚽ Sin datos", "No he podido consultar el fútbol ahora mismo.", { voz: "No he podido consultar el fútbol" });
  }
}

// Detecta de qué liga hablas ("" si no nombras ninguna)
function ligaDe(q) {
  const nq = normEq(q || "");
  if (/premier|inglesa|inglaterra/.test(nq)) return "eng.1";
  if (/champions|liga de campeones/.test(nq)) return "uefa.champions";
  if (/europa league|liga europa/.test(nq)) return "uefa.europa";
  if (/italia|italiana|serie a|calcio/.test(nq)) return "ita.1";
  if (/bundesliga|alemana|alemania/.test(nq)) return "ger.1";
  if (/francesa|francia|ligue/.test(nq)) return "fra.1";
  if (/segunda|hypermotion|liga 2/.test(nq)) return "esp.2";
  if (/portugal|portuguesa/.test(nq)) return "por.1";
  if (/liga|laliga|espanola|espana|primera|jornada/.test(nq)) return "esp.1";
  return "";
}

// Próximos partidos de una liga: "próximos partidos de la liga", "partidos del finde", "jornada de la Champions"
async function futbolProximos(q) {
  ctxSet({ tipo: "futbol", modo: "proximo" });
  setEstado("thinking");
  const liga = ligaDe(q) || "esp.1", nq = normEq(q || "");
  const ymd = (d) => d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  let desde = hoy0(), dias = 10;
  if (/manana/.test(nq)) { desde = sumarDias(hoy0(), 1); dias = 0; }
  else if (/hoy/.test(nq)) dias = 0;
  else if (/finde|fin de semana/.test(nq)) { const dw = hoy0().getDay(); desde = sumarDias(hoy0(), dw === 0 ? 0 : (5 - dw + 7) % 7); dias = dw === 0 ? 0 : 3; }
  else if (/semana/.test(nq)) dias = 7;
  try {
    const sb = await espn("/apis/site/v2/sports/soccer/" + liga + "/scoreboard?dates=" + ymd(desde) + "-" + ymd(sumarDias(desde, dias)) + "&limit=60");
    const ps = (sb.events || []).map(partido).filter((p) => p.estado !== "post").sort((a, b) => a.fecha - b.fecha).slice(0, 12);
    if (!ps.length) { responder("⚽ " + NOMBRES_LIGA[liga], "No hay partidos programados en esas fechas.", { voz: "No hay partidos en esas fechas." }); return; }
    const lineas = []; let diaAnt = "";
    ps.forEach((p) => {
      const d = capital(DIAS_SEM[p.fecha.getDay()]) + " " + p.fecha.getDate();
      if (d !== diaAnt) { lineas.push(d + ":"); diaAnt = d; }
      lineas.push("   " + (p.estado === "in" ? "🔴 " + p.gl + "-" + p.gv + " " : p.fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) + "  ") + p.local + " - " + p.visit);
    });
    nodoFutbol(ps[0], NOMBRES_LIGA[liga], ps.length > 1 ? "Y " + (ps.length - 1) + " partidos más" : "");
    const p0 = ps[0];
    responder("⚽ Próximos partidos · " + NOMBRES_LIGA[liga], lineas.join("\n"), { voz: "El próximo es " + p0.local + " contra " + p0.visit + ", " + fechaPartido(p0.fecha) + ". Te dejo el resto en pantalla." });
  } catch (e) {
    if (iaLista()) return preguntarIA("Fútbol, datos actuales de hoy: " + (window.ultimaOrden || "¿Cuáles son los próximos partidos de " + NOMBRES_LIGA[liga] + "?"));
    responder("⚽ Sin datos", "No he podido consultar los partidos ahora mismo.", { voz: "No he podido consultar los partidos" });
  }
}

async function futbolClasificacion(q) {
  ctxSet({ tipo: "clasificacion" });
  setEstado("thinking");
  let liga = ligaDe(q) || "esp.1";
  if (liga.startsWith("uefa")) liga = "esp.1";
  try {
    const d = await espn("/apis/v2/sports/soccer/" + liga + "/standings");
    const grupo = (d.children && d.children[0]) || d;
    const entradas = ((grupo.standings || {}).entries || []).map((e) => {
      const st = {}; (e.stats || []).forEach((s) => { st[s.name] = s.value; });
      return { eq: e.team.shortDisplayName || e.team.displayName, pts: st.points, pj: st.gamesPlayed, pos: st.rank };
    }).sort((a, b) => (a.pos || 99) - (b.pos || 99) || b.pts - a.pts);
    if (!entradas.length) throw new Error("vacía");
    const top = entradas.slice(0, 8).map((e, i) => (e.pos || i + 1) + ". " + e.eq + " · " + e.pts + " pts");
    responder("🏆 " + NOMBRES_LIGA[liga], top.join("\n"), { voz: "Líder: " + entradas[0].eq + " con " + entradas[0].pts + " puntos. Segundo, " + entradas[1].eq + " con " + entradas[1].pts + "." });
  } catch (e) {
    if (iaLista()) return preguntarIA("Fútbol, datos actuales de hoy: " + (window.ultimaOrden || "¿Cómo va la clasificación de " + NOMBRES_LIGA[liga] + "?"));
    responder("🏆 Sin datos", "No he podido traer la clasificación.", { voz: "No he podido traer la clasificación" });
  }
}

async function futbolHoy() {
  setEstado("thinking");
  try {
    const lineas = [];
    let directo = null, fallos = 0;
    for (const lg of ["esp.1", "uefa.champions", "eng.1"]) {
      const sb = await espn("/apis/site/v2/sports/soccer/" + lg + "/scoreboard").catch(() => ({ fallo: 1 }));
      if (sb.fallo) { fallos++; continue; }
      const ps = (sb.events || []).map(partido).filter((p) => p.fecha.toDateString() === new Date().toDateString());
      if (ps.length) lineas.push(NOMBRES_LIGA[lg] + ":");
      ps.forEach((p) => {
        if (p.estado === "in" && !directo) directo = Object.assign(p, { lg });
        lineas.push("  " + (p.estado === "pre" ? p.fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) + "  " + p.local + " - " + p.visit : p.local + " " + p.gl + "-" + p.gv + " " + p.visit + (p.estado === "in" ? "  (" + (p.reloj || "en juego") + ")" : "")));
      });
    }
    if (fallos === 3 && iaLista()) return preguntarIA("Fútbol, datos actuales de hoy: " + (window.ultimaOrden || "¿Qué partidos de fútbol hay hoy?"));
    if (directo) nodoFutbol(directo, NOMBRES_LIGA[directo.lg], "En directo");
    responder("⚽ Partidos de hoy", lineas.length ? lineas.join("\n") : "Hoy no hay partidos de LaLiga, Champions ni Premier.", { voz: lineas.length ? "Estos son los partidos de hoy." : "Hoy no hay partidos importantes." });
  } catch (e) { if (iaLista()) return preguntarIA("Fútbol, datos actuales de hoy: " + (window.ultimaOrden || "¿Qué partidos de fútbol hay hoy?")); responder("⚽ Sin datos", "No he podido consultar los partidos."); }
}

// ================== RUTINAS ==================
async function datosTiempo() {
  const u = await ubicacion(cfg.ciudad || "");
  if (!u) return null;
  const d = await json(`https://api.open-meteo.com/v1/forecast?latitude=${u.lat}&longitude=${u.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`);
  return { u, d };
}
async function rutina(manana) {
  setEstado("thinking");
  const nom = typeof memNombre === "function" ? memNombre() : "";
  const dia = manana ? sumarDias(hoy0(), 1) : hoy0();
  const lineas = [], voz = [];
  const saludo = manana ? "Buenas noches" : "Buenos días";
  voz.push(saludo + (nom ? ", " + nom : "") + ".");
  if (!manana) { const f = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }); voz.push("Hoy es " + f + "."); }
  try {
    const t = await datosTiempo();
    if (t) {
      const i = manana ? 1 : 0, dd = t.d.daily;
      const [desc, ico] = CODIGOS[dd.weather_code[i]] || ["Variable", "🌡"];
      const mx = Math.round(dd.temperature_2m_max[i]), mn = Math.round(dd.temperature_2m_min[i]), ll = dd.precipitation_probability_max[i];
      lineas.push(ico + " " + (manana ? "Mañana" : "Hoy") + " en " + t.u.nombre + ": " + desc.toLowerCase() + ", " + mn + "° a " + mx + "°" + (ll >= 40 ? " · lluvia " + ll + "%" : ""));
      voz.push((manana ? "Mañana en " : "En ") + t.u.nombre + ": " + desc.toLowerCase() + ", máxima de " + mx + " grados." + (ll >= 40 ? " Lleva paraguas, hay un " + ll + " por ciento de lluvia." : ""));
      nodoTiempo(t.u.nombre, t.d, manana ? "manana" : "");
      ctxSet({ tipo: "tiempo", lugar: cfg.ciudad || "", cuando: manana ? "manana" : "" });
    }
  } catch (e) {}
  const ev = calLeer().filter((e) => e.fecha === fechaISO(dia)).sort(calOrden);
  if (ev.length) {
    lineas.push("📅 " + (manana ? "Mañana" : "Hoy") + " tienes:\n" + ev.map((e) => "   • " + (e.hora ? e.hora + " · " : "") + e.titulo).join("\n"));
    voz.push((manana ? "Mañana tienes " : "Hoy tienes ") + ev.map((e) => e.titulo + (e.hora ? " a las " + e.hora : "")).join(", ") + ".");
    nodoCalPintar(dia.getFullYear(), dia.getMonth(), -1);
    const celda = $("nodoCalGrid").querySelector('[data-d="' + dia.getDate() + '"]');
    if (celda) { celda.style.setProperty("--c", calColor(ev[0].titulo)); celda.classList.add("pop"); }
    $("nodoCalTxt").textContent = ev[0].titulo + (ev.length > 1 ? " y " + (ev.length - 1) + " más" : "");
    nodoMostrar("nodoCal");
  } else {
    lineas.push("📅 " + (manana ? "Mañana" : "Hoy") + " no tienes nada apuntado.");
    voz.push(manana ? "Mañana no tienes nada apuntado." : "No tienes nada apuntado para hoy.");
  }
  if (!manana && scriptListo()) {
    try {
      const d = await script({ accion: "titulares", n: 3 });
      if (d.titulares && d.titulares.length) {
        const tit = d.titulares.map((x) => x.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+-\s+[^-]+$/, ""));
        lineas.push("📰 Titulares:\n" + tit.map((x) => "   • " + x).join("\n"));
        voz.push("Titulares del día: " + tit.join(". ") + ".");
      }
    } catch (e) {}
  }
  if (manana) voz.push("Que descanses.");
  responder("☀️ " + saludo + (nom ? ", " + nom : ""), lineas.join("\n"), { voz: voz.join(" ") });
}

// ================== MISMO JARVIS EN EL MÓVIL Y EN EL CHROMEBOOK ==================
// El calendario y la memoria se guardan también en tu script de Google.
// Al abrir Jarvis en cualquier aparato, se trae la versión más nueva.
const SYNC = {
  CAL: { clave: "jarvisCal", leer: () => { const hace = fechaISO(sumarDias(hoy0(), -7)); return calLeer().filter((e) => e.fecha >= hace).slice(0, 70).map((e) => ({ id: e.id, fecha: e.fecha, hora: e.hora || "", titulo: String(e.titulo).slice(0, 60), avisado: e.avisado ? 1 : 0 })); } },
  MEM: { clave: "jarvisMem", leer: () => memLeer() }
};
const syncTs = (k) => +(localStorage.getItem("jarvisTs_" + k) || 0);
const syncT = {};
function syncSubir(k) {
  localStorage.setItem("jarvisTs_" + k, Date.now());
  if (!scriptListo()) return;
  clearTimeout(syncT[k]);
  syncT[k] = setTimeout(() => {
    fetch(scriptBase(), { method: "POST", body: JSON.stringify({ clave: scriptClave(), accion: "guardar", k, ts: syncTs(k), v: SYNC[k].leer() }) })
      .then((r) => r.json()).then((d) => { if (d.ok) localStorage.setItem("jarvisUltSync", Date.now()); }).catch(() => {});
  }, 1200);
}
let bajando = false;
async function syncBajar() {
  if (!scriptListo() || bajando) return;
  bajando = true;
  try {
    const d = await script({ accion: "leer" });
    if (!d.error) { localStorage.setItem("jarvisUltSync", Date.now()); localStorage.setItem("jarvisScriptNuevo", d.CAL !== undefined ? "1" : "0"); }
    for (const k of Object.keys(SYNC)) {
      const srv = d[k];
      if (srv && srv.ts > syncTs(k)) {
        localStorage.setItem(SYNC[k].clave, JSON.stringify(srv.v));
        localStorage.setItem("jarvisTs_" + k, srv.ts);
        if (k === "CAL") { calPintarTile(); if (!$("panelCal").hidden) calPintar(); }
        if (k === "MEM") saludoInicial();
      } else if (!srv && syncTs(k)) syncSubir(k); // el script aún no lo tiene: súbelo
    }
  } catch (e) {}
  bajando = false;
}
const _calGuardar = calGuardar;
calGuardar = function (l) { _calGuardar(l); syncSubir("CAL"); };
const _memGuardar = memGuardar;
memGuardar = function (m) { _memGuardar(m); syncSubir("MEM"); };
// Primera vez: si ya tenías cosas guardadas, cuentan como cambio local
["CAL", "MEM"].forEach((k) => { if (!syncTs(k) && localStorage.getItem(SYNC[k].clave)) localStorage.setItem("jarvisTs_" + k, 1); });
setTimeout(syncBajar, 1500);
document.addEventListener("visibilitychange", () => { if (!document.hidden) syncBajar(); });
setInterval(syncBajar, 5 * 60 * 1000);

// ================== COMANDOS NUEVOS ==================
function masComandos(t, n, o) {
  let m;
  // Rutinas
  if (/^(?:buenos dias|buen dia|buenos dias jarvis|empieza el dia|resumen del dia|mi dia)$/.test(n)) { rutina(false); return true; }
  if (/^(?:buenas noches|buenas noches jarvis|me voy a dormir|me voy a la cama)$/.test(n)) { rutina(true); return true; }

  // Seguir la conversación: "¿y mañana?", "¿y en Barcelona?", "¿y el Atleti?"
  if (ctxVivo()) {
    if (ctx.tipo === "tiempo") {
      if (/^y\s+(?:para\s+)?manana$/.test(n)) { tiempo(ctx.lugar || "", "manana"); return true; }
      if (/^y\s+(?:hoy|ahora)$/.test(n)) { tiempo(ctx.lugar || "", ""); return true; }
      if (/^y\s+(?:esta semana|la semana|los proximos dias)$/.test(n)) { tiempo(ctx.lugar || "", "semana"); return true; }
      m = o.match(/^y\s+en\s+(.+?)(?:\s+(mañana|manana))?$/i);
      if (m) { tiempo(m[1], m[2] ? "manana" : ctx.cuando === "manana" ? "manana" : ""); return true; }
    }
    if (ctx.tipo === "futbol") {
      m = o.match(/^y\s+(?:el\s+|la\s+|los\s+)?(.+)$/i);
      if (m && !/^(?:manana|hoy|ahora|tu|yo)$/.test(quitarTildes(m[1].toLowerCase()))) { futbolEquipo(m[1], ctx.modo); return true; }
      if (/^(?:y\s+)?cuando juega(?:\s+ahora)?$/.test(n) && ctx.equipo) { futbolEquipo(ctx.equipo, "proximo"); return true; }
    }
  }

  // Fútbol
  if (/^(?:partidos de hoy|que partidos hay hoy|que partidos hay|hay futbol hoy|resultados de hoy|futbol hoy)$/.test(n)) { futbolHoy(); return true; }
  // Próximos partidos de una liga o de un equipo
  m = n.match(/^(?:dime\s+|ensename\s+|cuales\s+son\s+)?(?:los\s+)?(?:proximos|siguientes|proxima|siguiente|que)\s+(?:partidos?|jornada)(?:\s+hay)?(?:\s+(?:de|del|en)\s+(?:la\s+|el\s+)?(.+))?$/)
    || n.match(/^(?:partidos|jornada|calendario)\s+(?:de|del|en)\s+(?:la\s+|el\s+|este\s+)?(.+)$/)
    || n.match(/^(?:la\s+)?(jornada)$/);
  if (m) {
    const resto = m[1] || "";
    if (!resto || ligaDe(resto) || /^(?:hoy|manana|finde|fin de semana|semana|esta semana|este finde)$/.test(resto)) { futbolProximos(resto); return true; }
    futbolEquipo(resto, "proximo"); return true;
  }
  m = n.match(/^(?:clasificacion|tabla|como va la liga|como esta la liga|quien va primero)(?:\s+(?:de\s+)?(?:la\s+)?(.+))?$/)
    || (/(?:puestos|clasificacion|tabla)/.test(n) && /(?:liga|premier|champions|serie a|bundesliga|ligue)/.test(n) ? [n, n] : null);
  if (m) { futbolClasificacion(m[1] || ""); return true; }
  m = o.match(/^(?:cu[aá]ndo\s+juega|pr[oó]ximo\s+partido\s+del?|siguiente\s+partido\s+del?|a\s+qu[eé]\s+hora\s+juega|contra\s+qui[eé]n\s+juega)\s+(?:el\s+|la\s+)?(.+)$/i);
  if (m) { futbolEquipo(m[1], "proximo"); return true; }
  m = o.match(/^(?:c[oó]mo\s+(?:va|van|ha\s+quedado|qued[oó]|ha\s+ido|le\s+fue\s+al?|fue)|resultado\s+del?|marcador\s+del?|qu[eé]\s+tal\s+(?:va|fue|ha\s+ido)|ha\s+ganado|gan[oó])\s+(?:el\s+|la\s+)?(.+?)(?:\s+(?:hoy|ayer|en\s+el\s+partido))?$/i);
  if (m && !/^(?:el\s+|la\s+|mi\s+)?(?:dia|día|tiempo|todo|cosa|eso|temporizador|cuenta atr[aá]s|examen|trabajo|proyecto)$/i.test(m[1])) { futbolEquipo(m[1], "resultado"); return true; }

  // Pequeñas cosas
  if (/^(?:lanza|tira)\s+(?:una\s+)?moneda$|^cara o cruz$/.test(n)) { const r = Math.random() < 0.5 ? "Cara" : "Cruz"; responder("🪙 " + r, "Ha salido " + r.toLowerCase() + ".", { voz: "Ha salido " + r.toLowerCase() }); return true; }
  m = n.match(/^(?:lanza|tira)\s+(?:un\s+)?dado(?:\s+de\s+(\d+))?$/);
  if (m) { const c = +(m[1] || 6), r = 1 + Math.floor(Math.random() * c); responder("🎲 " + r, "Ha salido un " + r + ".", { voz: "Ha salido un " + r }); return true; }
  m = n.match(/^(?:elige|escoge)\s+(?:entre\s+)?(.+)$/);
  if (m && /\s(?:o|y)\s|,/.test(m[1])) {
    const ops = o.replace(/^(?:elige|escoge)\s+(?:entre\s+)?/i, "").split(/\s*,\s*|\s+o\s+|\s+y\s+/i).filter(Boolean);
    const r = ops[Math.floor(Math.random() * ops.length)];
    responder("🎯 " + r, "Me quedo con: " + r + ".", { voz: "Elijo " + r }); return true;
  }
  return false;
}

