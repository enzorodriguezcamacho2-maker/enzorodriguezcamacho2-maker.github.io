// ================== FUNCIONES EXTRA ==================

// ---------- Historial ----------
function guardarHistorial(orden) {
  try {
    const h = JSON.parse(localStorage.getItem("jarvisHist") || "[]");
    h.unshift(orden); localStorage.setItem("jarvisHist", JSON.stringify(h.slice(0, 20)));
  } catch (e) {}
}
function pintarHistorial() {
  let h = [];
  try { h = JSON.parse(localStorage.getItem("jarvisHist") || "[]"); } catch (e) {}
  $("historial").textContent = h.length ? h.map((x) => "• " + x).join("\n") : "Todavía nada";
}

// ---------- Recordatorios (a una hora o dentro de X) ----------
const leerRec = () => { try { return JSON.parse(localStorage.getItem("jarvisRec") || "[]"); } catch (e) { return []; } };
const guardarRec = (r) => { try { localStorage.setItem("jarvisRec", JSON.stringify(r)); } catch (e) {} };
function nuevoRecordatorio(at, txt) { const r = leerRec(); r.push({ at, txt }); r.sort((a, b) => a.at - b.at); guardarRec(r); }
setInterval(() => {
  const ahora = Date.now(), r = leerRec();
  const vencidos = r.filter((x) => x.at <= ahora);
  if (!vencidos.length) return;
  guardarRec(r.filter((x) => x.at > ahora));
  for (const v of vencidos) {
    const msg = v.txt ? "Te recuerdo: " + v.txt : "¡Es la hora!";
    avisar("Jarvis", msg);
    responder("🔔 Recordatorio", msg);
  }
}, 5000);
const horaTxt = (ms) => new Date(ms).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
function diaTxt(ms) {
  const d = new Date(ms), hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return "hoy";
  const m = new Date(); m.setDate(m.getDate() + 1);
  if (d.toDateString() === m.toDateString()) return "mañana";
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric" });
}

// ---------- Cronómetro ----------
let crono = null;

// ---------- Conversiones ----------
const UNIDADES = {
  km: ["len", 1000], kilometro: ["len", 1000], kilometros: ["len", 1000],
  m: ["len", 1], metro: ["len", 1], metros: ["len", 1],
  cm: ["len", 0.01], centimetro: ["len", 0.01], centimetros: ["len", 0.01],
  mm: ["len", 0.001], milimetro: ["len", 0.001], milimetros: ["len", 0.001],
  milla: ["len", 1609.344], millas: ["len", 1609.344],
  pie: ["len", 0.3048], pies: ["len", 0.3048],
  pulgada: ["len", 0.0254], pulgadas: ["len", 0.0254],
  yarda: ["len", 0.9144], yardas: ["len", 0.9144],
  kg: ["mas", 1], kilo: ["mas", 1], kilos: ["mas", 1], kilogramo: ["mas", 1], kilogramos: ["mas", 1],
  g: ["mas", 0.001], gramo: ["mas", 0.001], gramos: ["mas", 0.001],
  libra: ["mas", 0.45359237], libras: ["mas", 0.45359237],
  onza: ["mas", 0.0283495], onzas: ["mas", 0.0283495],
  l: ["vol", 1], litro: ["vol", 1], litros: ["vol", 1],
  ml: ["vol", 0.001], mililitro: ["vol", 0.001], mililitros: ["vol", 0.001],
  galon: ["vol", 3.78541], galones: ["vol", 3.78541],
  grado: ["tmp", "C"], grados: ["tmp", "C"], "grados celsius": ["tmp", "C"],
  celsius: ["tmp", "C"], centigrados: ["tmp", "C"], c: ["tmp", "C"],
  fahrenheit: ["tmp", "F"], f: ["tmp", "F"]
};
const MONEDAS = {
  euro: "EUR", euros: "EUR", dolar: "USD", dolares: "USD", "dolar americano": "USD", "dolares americanos": "USD",
  "libra esterlina": "GBP", "libras esterlinas": "GBP", libra: "GBP", libras: "GBP",
  yen: "JPY", yenes: "JPY", "peso mexicano": "MXN", "pesos mexicanos": "MXN",
  franco: "CHF", francos: "CHF", "franco suizo": "CHF", "francos suizos": "CHF",
  yuan: "CNY", yuanes: "CNY", real: "BRL", reales: "BRL",
  "dolar canadiense": "CAD", "dolares canadienses": "CAD", "corona sueca": "SEK", "coronas suecas": "SEK", bitcoin: null
};
const limpiaU = (w) => quitarTildes(w.toLowerCase()).replace(/^grados?\s+/, "").replace(/\s+/g, " ").trim();
async function convertir(num, de, a) {
  const u1 = UNIDADES[limpiaU(de)], u2 = UNIDADES[limpiaU(a)];
  const fmtN = (x) => Number(x.toFixed(4)).toLocaleString("es-ES", { maximumFractionDigits: 3 });
  if (u1 && u2 && u1[0] === u2[0]) {
    let r;
    if (u1[0] === "tmp") r = u1[1] === u2[1] ? num : u1[1] === "C" ? num * 9 / 5 + 32 : (num - 32) * 5 / 9;
    else r = num * u1[1] / u2[1];
    responder("📏 " + fmtN(r) + " " + a, `${fmtN(num)} ${de} = ${fmtN(r)} ${a}`, { voz: `Son ${fmtN(r)} ${a}` });
    return true;
  }
  const m1 = MONEDAS[limpiaU(de)], m2 = MONEDAS[limpiaU(a)];
  if (m1 && m2) {
    setEstado("thinking", "Consultando");
    try {
      const d = await json(`https://api.frankfurter.app/latest?amount=${num}&from=${m1}&to=${m2}`);
      const r = d.rates[m2];
      responder("💱 " + fmtN(r) + " " + m2, `${fmtN(num)} ${m1} = ${fmtN(r)} ${m2}\nCambio del ${new Date(d.date).toLocaleDateString("es-ES")}`, { voz: `Son ${fmtN(r)} ${a}` });
    } catch (e) { responder("💱 Sin conexión", "No he podido consultar el cambio ahora mismo."); }
    return true;
  }
  return false;
}

// ---------- Hora en otra ciudad ----------
async function horaEn(lugar) {
  setEstado("thinking", "Consultando");
  try {
    const g = await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(lugar)}&count=1&language=es`);
    const p = g.results && g.results[0];
    if (!p || !p.timezone) throw 0;
    const h = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: p.timezone });
    const dia = new Date().toLocaleDateString("es-ES", { weekday: "long", timeZone: p.timezone });
    responder("🌍 " + h + " en " + p.name, `En ${p.name}${p.country ? " (" + p.country + ")" : ""} son las ${h}, ${dia}.`, { voz: `En ${p.name} son las ${h}` });
  } catch (e) { responder("🌍 No lo encuentro", `No sé dónde está «${lugar}».`); }
}

// ---------- Días que faltan ----------
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const FIESTAS = { "navidad": [12, 25], "nochebuena": [12, 24], "nochevieja": [12, 31], "fin de ano": [12, 31], "ano nuevo": [1, 1], "reyes": [1, 6], "san valentin": [2, 14], "halloween": [10, 31], "verano": [6, 21], "el verano": [6, 21], "invierno": [12, 21], "primavera": [3, 20], "otono": [9, 22] };
function diasHasta(texto) {
  const t = quitarTildes(texto.toLowerCase()).replace(/^(la |el )/, "").trim();
  let mes, dia, nombre = texto;
  if (/^mi cumpleanos/.test(t)) {
    if (!cfg.cumple) return responder("🎂 ¿Cuándo es?", "Dime «mi cumpleaños es el 3 de mayo» y lo recuerdo.");
    [mes, dia] = cfg.cumple; nombre = "tu cumpleaños";
  } else if (FIESTAS[t]) { [mes, dia] = FIESTAS[t]; }
  else {
    const m = t.match(/(\d{1,2})\s+de\s+([a-z]+)/);
    if (!m || MESES.indexOf(m[2]) < 0) return responder("📅 No lo entiendo", "Prueba con «cuántos días faltan para Navidad» o «para el 25 de diciembre».");
    dia = +m[1]; mes = MESES.indexOf(m[2]) + 1;
  }
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  let obj = new Date(hoy.getFullYear(), mes - 1, dia);
  if (obj < hoy) obj = new Date(hoy.getFullYear() + 1, mes - 1, dia);
  const n = Math.round((obj - hoy) / 86400000);
  const f = obj.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  responder("📅 " + (n === 0 ? "¡Es hoy!" : n + (n === 1 ? " día" : " días")), n === 0 ? `¡${nombre} es hoy! 🎉` : `Faltan ${n} días para ${nombre} (${f}).`);
}

// ---------- Interpreta las órdenes nuevas (devuelve true si la ha entendido) ----------
function extra(t, n, o) {
  let m;

  // Guardar la dirección del resumen de Telegram: "configura resumen https://..."
  m = o.match(/^configura(?:r)? (?:el )?resumen\s+(https?:\/\/\S+)/i);
  if (m) {
    localStorage.setItem("jarvisResumenUrl", m[1]);
    responder("✅ Resumen configurado", "Ya puedo leer el último resumen de Telegram.");
    return true;
  }

  // Guardar la clave de acceso: "configura clave XXXX"
  m = o.match(/^configura(?:r)? (?:la )?clave\s+(\S+)/i);
  if (m) {
    localStorage.setItem("jarvisClave", m[1]);
    responder("✅ Clave guardada", "Ya puedo pedir resúmenes por tema.");
    return true;
  }

  // Pedir un resumen de un tema: "tema Real Madrid" -> Jarvis lo pide al script y muestra el resultado
  m = o.match(/^(?:pon(?:er)? el )?tema\s*:?\s+(.+)$/i);
  if (m) {
    const base = localStorage.getItem("jarvisResumenUrl");
    const clave = localStorage.getItem("jarvisClave");
    if (!base || !clave) {
      responder("Falta configurar", "Di: configura resumen, con la dirección, y luego: configura clave, con tu clave.");
      return true;
    }
    const tema = m[1].trim();
    responder("📰 " + tema, "Buscando noticias sobre " + tema + "…", { voz: "Buscando noticias sobre " + tema });
    fetch(base + "?tema=" + encodeURIComponent(tema) + "&clave=" + encodeURIComponent(clave))
      .then(r => r.json()).then(d => {
        if (d.error) return responder("Error", d.error);
        responder("📰 " + tema, d.resumen || "No he encontrado nada sobre " + tema + ".");
      }).catch(() => responder("Sin conexión", "No he podido contactar con el script. Revisa la dirección y la clave."));
    return true;
  }

  // Leer el último resumen que te envió Telegram: "resumen"
  if (/^(?:dame el |ver el |leer el )?(?:último |ultimo )?resumen$/i.test(o.trim())) {
    const url = localStorage.getItem("jarvisResumenUrl");
    if (!url) { responder("Falta configurar", "Di: configura resumen y pega la dirección que te da Apps Script."); return true; }
    responder("📰 Resumen", "Cargando el último resumen…", { voz: "Un momento" });
    fetch(url).then(r => r.json()).then(d => {
      responder("📰 Último resumen", d.resumen || "Todavía no hay ningún resumen guardado.");
    }).catch(() => responder("Sin conexión", "No he podido leer el resumen. Revisa la dirección configurada."));
    return true;
  }

  // Hora en otra ciudad
  m = o.match(/^(?:qu[eé]) hora es en\s+(.+)$/i);
  if (m) { horaEn(m[1]); return true; }

  // Recordatorio a una hora: "recuérdame a las 18:30 llamar a mamá", "alarma a las 7 de la mañana"
  m = o.match(/^(?:recu[eé]rdame|av[ií]same|ponme una alarma|pon una alarma|pon alarma|alarma|despi[eé]rtame)\s+(?:a las|para las|a la)\s+(\d{1,2})(?:[:.h]\s?(\d{2}))?(?:\s+y\s+(media|cuarto))?(?:\s+(de la mañana|de la manana|de la tarde|de la noche|am|pm))?(?:\s+(?:para que |que |de |para |a )?(.+))?$/i);
  if (m) {
    let h = +m[1], mi = m[2] ? +m[2] : m[3] === "media" ? 30 : m[3] === "cuarto" ? 15 : 0;
    const per = m[4] ? quitarTildes(m[4].toLowerCase()) : "";
    if (/tarde|noche|pm/.test(per) && h < 12) h += 12;
    if (/manana|am/.test(per) && h === 12) h = 0;
    const d = new Date(); d.setHours(h, mi, 0, 0);
    if (!per && h < 12 && d <= new Date() && new Date().getHours() < h + 12) d.setHours(h + 12);
    if (d <= new Date()) d.setDate(d.getDate() + 1);
    const txt = (m[5] || "").trim();
    nuevoRecordatorio(d.getTime(), txt);
    responder("🔔 Recordatorio", `${diaTxt(d.getTime())} a las ${horaTxt(d.getTime())}${txt ? ": " + txt : ""}.\n(Jarvis tiene que estar abierto para avisarte)`, { voz: `Vale, te aviso ${diaTxt(d.getTime())} a las ${horaTxt(d.getTime())}` });
    return true;
  }

  // Recordatorio dentro de X: "recuérdame en 10 minutos sacar la ropa"
  m = o.match(/^(?:recu[eé]rdame|av[ií]same)\s+(?:en|dentro de)\s+(\d+(?:[.,]\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta|cuarenta|cincuenta|media|medio)\s*(segundos?|minutos?|horas?)(?:\s+(?:que |de |para |a )?(.+))?$/i);
  if (m) {
    const k = /^seg/i.test(m[2]) ? 1 : /^min/i.test(m[2]) ? 60 : 3600;
    const v = (m[1].toLowerCase() === "media" || m[1].toLowerCase() === "medio") && k === 3600 ? 0.5 : aNumero(m[1].toLowerCase());
    const at = Date.now() + Math.round(v * k * 1000);
    const txt = (m[3] || "").trim();
    nuevoRecordatorio(at, txt);
    responder("🔔 Recordatorio", `A las ${horaTxt(at)}${txt ? ": " + txt : ""}.`, { voz: "Vale, te aviso a las " + horaTxt(at) });
    return true;
  }

  // Lista / borrar recordatorios
  if (/(mis recordatorios|que recordatorios|lee los recordatorios|ver recordatorios|mis alarmas)/.test(n)) {
    const r = leerRec();
    if (!r.length) { responder("🔔 Recordatorios", "No tienes recordatorios pendientes."); return true; }
    responder("🔔 Recordatorios (" + r.length + ")", r.map((x) => `• ${diaTxt(x.at)} ${horaTxt(x.at)}${x.txt ? " — " + x.txt : ""}`).join("\n"), {
      botones: [{ texto: "Borrar todos", accion: () => { guardarRec([]); responder("🔔 Recordatorios", "Borrados."); } }]
    });
    return true;
  }
  if (/(borra|elimina|cancela|quita)\s+(los |mis |todos los |las |mis |todas las )?(recordatorios|alarmas)/.test(n)) { guardarRec([]); responder("🔔 Recordatorios", "Borrados."); return true; }

  // Cronómetro
  if (/(inicia|empieza|arranca|pon|activa|enciende)\s+(el |un )?cronometro/.test(n)) {
    crono = { ini: Date.now() };
    responder("⏱ Cronómetro", "En marcha. Di «para el cronómetro» cuando quieras.", { voz: "Cronómetro en marcha" });
    return true;
  }
  if (/(para|deten|pausa|apaga|cuanto lleva|como va)\s+(el )?cronometro/.test(n)) {
    if (!crono) { responder("⏱ Cronómetro", "No hay ningún cronómetro en marcha."); return true; }
    const s = Math.round((Date.now() - crono.ini) / 1000);
    if (!/cuanto|como/.test(n)) crono = null;
    responder("⏱ " + fmt(s), (crono ? "Llevas " : "Tiempo total: ") + fmt(s) + ".", { voz: `${Math.floor(s / 60)} minutos y ${s % 60} segundos` });
    return true;
  }

  // Pomodoro
  if (/(pomodoro|modo concentracion|modo estudio|modo enfoque|quiero concentrarme)/.test(n)) {
    iniciarTimer(25 * 60, "Descanso");
    responder("🎯 Concentración", "25 minutos de concentración. Te aviso cuando toque descansar 5 minutos.", { voz: "Modo concentración. Veinticinco minutos. A por ello." });
    return true;
  }
  if (/^(descanso|toca descanso|modo descanso)/.test(n)) { iniciarTimer(5 * 60, "Vuelve al trabajo"); responder("☕ Descanso", "5 minutos de descanso."); return true; }

  // Conversiones: "convierte 10 km a millas", "50 euros en dólares", "cuántos dólares son 50 euros"
  m = n.match(/^(?:convierte|convertir|pasa|pasame|cuanto es|cuanto son|cuantos son|cuantas son|cuanto)?\s*(\d+(?:[.,]\d+)?)\s*(?:grados\s+)?([a-z ]+?)\s+(?:a|en)\s+(?:grados\s+)?([a-z ]+)$/);
  if (m) { const p = convertir(parseFloat(m[1].replace(",", ".")), m[2], m[3]); if (UNIDADES[limpiaU(m[2])] || MONEDAS[limpiaU(m[2])]) { p.then((ok) => { if (!ok) responder("🤔", "No sé convertir eso."); }); return true; } }
  m = n.match(/^cuant[oa]s\s+([a-z ]+?)\s+(?:son|hay en|tiene|equivalen a)\s+(\d+(?:[.,]\d+)?)\s*(?:grados\s+)?([a-z ]+)$/);
  if (m && (UNIDADES[limpiaU(m[3])] || MONEDAS[limpiaU(m[3])])) { convertir(parseFloat(m[2].replace(",", ".")), m[3], m[1]).then((ok) => { if (!ok) responder("🤔", "No sé convertir eso."); }); return true; }

  // Cumpleaños y días que faltan
  m = o.match(/^mi cumplea[ñn]os es (?:el )?(\d{1,2}) de ([a-záéíóú]+)/i);
  if (m && MESES.indexOf(quitarTildes(m[2].toLowerCase())) >= 0) {
    cfg.cumple = [MESES.indexOf(quitarTildes(m[2].toLowerCase())) + 1, +m[1]]; guardarCfg();
    responder("🎂 Apuntado", `Tu cumpleaños es el ${m[1]} de ${m[2]}.`); return true;
  }
  m = o.match(/^cu[aá]ntos d[ií]as (?:faltan |quedan )?(?:para|hasta)\s+(.+)$/i);
  if (m) { diasHasta(m[1]); return true; }

  // Mapas
  m = o.match(/^(?:c[oó]mo (?:llego|voy|se va|ir) (?:a|al|hasta)|ruta (?:a|al|hasta)|ll[eé]vame (?:en coche )?(?:a la|al) )\s*(.+)$/i);
  if (m) { responder("🗺 Ruta", "Cómo llegar a " + m[1] + ".", { voz: "Te enseño la ruta" }); abrir("https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(m[1])); return true; }
  m = o.match(/^(?:d[oó]nde (?:est[aá]|queda|hay)|busca en el mapa|mapa de)\s+(.+)$/i) || o.match(/^(.+?)\s+cerca(?: de m[ií]| de aqu[ií])?$/i);
  if (m) { responder("🗺 Mapa", m[1], { voz: "Lo busco en el mapa" }); abrir("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(m[1])); return true; }

  // Noticias
  m = o.match(/^(?:noticias|[uú]ltimas noticias|qu[eé] noticias hay|qu[eé] ha pasado)(?:\s+(?:de|sobre|del|de la)\s+(.+))?$/i);
  if (m) {
    const tema = m[1] && !/^(hoy|hoy en d[ií]a)$/i.test(m[1]) ? m[1] : "";
    responder("📰 Noticias", tema ? "Noticias sobre " + tema + "." : "Las noticias de hoy.", { voz: "Abriendo las noticias" });
    abrir(tema ? `https://news.google.com/search?q=${encodeURIComponent(tema)}&hl=es&gl=ES&ceid=ES:es` : "https://news.google.com/?hl=es&gl=ES&ceid=ES:es");
    return true;
  }

  // Azar
  m = n.match(/(?:lanza|tira|echa)\s+(?:un |el |(\d+|dos|tres|cuatro|cinco) )?dados?/);
  if (m) {
    const k = m[1] ? aNumero(m[1]) : 1;
    const tiradas = Array.from({ length: Math.min(k, 10) }, () => 1 + Math.floor(Math.random() * 6));
    const cara = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    responder("🎲 " + tiradas.join(" + "), tiradas.map((x) => cara[x]).join(" ") + (tiradas.length > 1 ? "  = " + tiradas.reduce((a, b) => a + b) : ""), { voz: tiradas.length > 1 ? "Suman " + tiradas.reduce((a, b) => a + b) : "Ha salido un " + tiradas[0] });
    return true;
  }
  if (/(lanza|tira|echa)\s+(una |la )?moneda|cara o cruz/.test(n)) { const r = Math.random() < 0.5 ? "Cara" : "Cruz"; responder("🪙 " + r, "Ha salido " + r.toLowerCase() + "."); return true; }
  m = n.match(/numero (?:al azar|aleatorio)(?: (?:entre|del) (\d+) (?:y|al) (\d+))?/);
  if (m) { const a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : 100; const r = Math.min(a, b) + Math.floor(Math.random() * (Math.abs(b - a) + 1)); responder("🔢 " + r, `Número al azar entre ${Math.min(a, b)} y ${Math.max(a, b)}: ${r}.`, { voz: "El " + r }); return true; }

  return false;
}

// ---------- Instalar como app ----------
let eventoInstalar = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); eventoInstalar = e; $("filaInstalar").hidden = false; });
$("instalarBtn").addEventListener("click", async () => {
  if (!eventoInstalar) return;
  eventoInstalar.prompt(); await eventoInstalar.userChoice; eventoInstalar = null; $("filaInstalar").hidden = true;
});
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {});
