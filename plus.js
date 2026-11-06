// Jarvis v13: avisos con voz, buenos días automático, recordatorios por ubicación, música,
// gastos, hábitos, traductor por voz, fotos con IA, fondo según la hora y el tiempo,
// voz de mayordomo, sonidos, equipo favorito y goles en directo.

const hoyISO = () => fechaISO(new Date());
const nombreUsuario = () => (typeof memNombre === "function" && memNombre()) || "";
const conNombre = (s) => (nombreUsuario() ? nombreUsuario() + ", " : "") + s;

// ================== SONIDOS ==================
let pxAudio = null;
function pxTono(notas, vol) {
  if (cfg.sonidos === false) return;
  try {
    pxAudio = pxAudio || new AudioContext();
    const t0 = pxAudio.currentTime;
    notas.forEach(([f, d, dur], i) => {
      const o = pxAudio.createOscillator(), g = pxAudio.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(vol || 0.07, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + (dur || 0.16));
      o.connect(g).connect(pxAudio.destination); o.start(t0 + d); o.stop(t0 + d + (dur || 0.16) + 0.02);
    });
  } catch (e) {}
}
const SONIDO = {
  escucha: () => pxTono([[660, 0], [990, 0.08]]),
  listo: () => pxTono([[880, 0, 0.12], [1320, 0.07, 0.2]], 0.05),
  gol: () => pxTono([[523, 0, 0.2], [659, 0.15, 0.2], [784, 0.3, 0.2], [1046, 0.45, 0.5]], 0.12)
};
let pxEstadoAnt = "idle";
const _setEstado = setEstado;
setEstado = function (modo, texto) {
  if (modo === "listening" && pxEstadoAnt !== "listening") SONIDO.escucha();
  pxEstadoAnt = modo;
  return _setEstado(modo, texto);
};
const _responder = responder;
responder = function (titulo, texto, opts) { SONIDO.listo(); return _responder(titulo, texto, opts); };

// ================== VOZ (otra voz y modo mayordomo) ==================
function vozComandos(n) {
  if (/^(?:cambia(?:me)?\s+(?:de\s+|la\s+)?voz|otra voz|siguiente voz|prueba otra voz)$/.test(n)) {
    const voces = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("es"));
    if (!voces.length) { responder("🗣 Voces", "Tu dispositivo solo tiene una voz en español."); return true; }
    const i = voces.findIndex((v) => v.name === (vozEsp() || {}).name);
    const v = voces[(i + 1) % voces.length];
    cfg.vozNombre = v.name; guardarCfg();
    responder("🗣 Voz " + ((i + 1) % voces.length + 1) + " de " + voces.length, v.name + "\nDi «otra voz» para probar la siguiente.", { voz: "¿Qué tal suena esta voz?" });
    return true;
  }
  if (/^(?:modo mayordomo|voz de mayordomo|habla como jarvis|voz de jarvis|modo iron man)$/.test(n)) {
    cfg.vozRitmo = 0.95; cfg.vozTono = 0.8; cfg.mayordomo = true; guardarCfg();
    responder("🎩 Modo mayordomo", "A su servicio" + (nombreUsuario() ? ", " + nombreUsuario() : "") + ". Hablaré más pausado y grave.", { voz: "A su servicio" + (nombreUsuario() ? ", " + nombreUsuario() : ", señor") + ". ¿En qué puedo ayudarle?" });
    return true;
  }
  if (/^(?:voz normal|quita el modo mayordomo|modo normal)$/.test(n)) {
    cfg.vozRitmo = 1.03; cfg.vozTono = 1; cfg.mayordomo = false; guardarCfg();
    responder("🗣 Voz normal", "Vuelvo a mi voz de siempre."); return true;
  }
  if (/^(?:quita|desactiva|sin)\s+(?:los\s+)?sonidos$/.test(n)) { cfg.sonidos = false; guardarCfg(); responder("🔇 Sonidos", "Sin pitidos."); return true; }
  if (/^(?:pon|activa)\s+(?:los\s+)?sonidos$/.test(n)) { cfg.sonidos = true; guardarCfg(); responder("🔔 Sonidos", "Pitidos activados."); return true; }
  return false;
}

// ================== AVISOS CON VOZ (30 min antes) ==================
function pxAvisos30() {
  const ya = leerLS("jarvisAvisos30", {}), ahora = Date.now(); let cambio = false;
  for (const e of calLeer()) {
    if (!e.hora) continue;
    const id = e.id || e.fecha + e.hora + e.titulo, falta = calMomento(e) - ahora;
    if (falta > 0 && falta <= 30 * 60e3 && !ya[id]) {
      ya[id] = ahora; cambio = true;
      const min = Math.max(1, Math.round(falta / 60e3));
      avisar("⏰ En " + min + " min", e.titulo);
      responder("⏰ En " + min + " minutos", e.hora + " · " + e.titulo, { voz: conNombre("en " + min + " minutos tienes " + e.titulo + ".") });
    }
  }
  if (cambio) { for (const k in ya) if (ahora - ya[k] > 2 * 86400e3) delete ya[k]; guardarLS("jarvisAvisos30", ya); }
}
setInterval(pxAvisos30, 30000);
setTimeout(pxAvisos30, 5000);

// ================== BUENOS DÍAS AUTOMÁTICO ==================
setTimeout(() => {
  const h = new Date().getHours();
  if (cfg.rutinaAuto === false || h < 5 || h >= 12) return;
  if (localStorage.getItem("jarvisRutinaDia") === hoyISO()) return;
  localStorage.setItem("jarvisRutinaDia", hoyISO());
  rutina(false);
}, 3500);
function rutinaComandos(n) {
  if (/^(?:desactiva|quita|no quiero)\s+(?:el\s+)?buenos dias automatico$/.test(n)) { cfg.rutinaAuto = false; guardarCfg(); responder("☀️ Desactivado", "Ya no te daré los buenos días solo."); return true; }
  if (/^(?:activa|pon)\s+(?:el\s+)?buenos dias automatico$/.test(n)) { cfg.rutinaAuto = true; guardarCfg(); responder("☀️ Activado", "Cada mañana, al abrirme, te daré los buenos días."); return true; }
  return false;
}

// ================== LUGARES: "cuando llegue a casa recuérdame…" ==================
const LUG_KEY = "jarvisLugares";
const lugLeer = () => Object.assign({ sitios: {}, pendientes: [] }, leerLS(LUG_KEY, {}));
const lugGuardar = (l) => guardarLS(LUG_KEY, l, "LUGARES");
const distM = (a, b) => { const R = 6371e3, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const posActual = () => new Promise((ok, ko) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude }), ko, { enableHighAccuracy: true, timeout: 15000 }) : ko(new Error("sin gps")));
let pxVigia = null;
function lugVigilar() {
  const l = lugLeer();
  if (!l.pendientes.length) { if (pxVigia != null) { navigator.geolocation.clearWatch(pxVigia); pxVigia = null; } return; }
  if (pxVigia != null || !navigator.geolocation) return;
  pxVigia = navigator.geolocation.watchPosition((p) => {
    const aqui = { lat: p.coords.latitude, lon: p.coords.longitude }, l2 = lugLeer();
    const llegados = l2.pendientes.filter((x) => x.lat != null && distM(aqui, x) < (x.radio || 150));
    if (!llegados.length) return;
    l2.pendientes = l2.pendientes.filter((x) => !llegados.includes(x)); lugGuardar(l2);
    llegados.forEach((x) => { avisar("📍 Has llegado a " + x.sitio, x.txt); responder("📍 Has llegado a " + x.sitio, x.txt, { voz: conNombre("ya estás en " + x.sitio + ". Te recuerdo: " + x.txt) }); });
    lugVigilar();
  }, () => {}, { enableHighAccuracy: true, maximumAge: 60000 });
}
setTimeout(lugVigilar, 2500);

async function lugComandos(n, o) {
  let m = n.match(/^(?:guarda|apunta)\s+(?:este\s+sitio|donde\s+estoy|mi\s+ubicacion|aqui)\s+como\s+(?:mi\s+|el\s+|la\s+)?(.+)$/)
    || n.match(/^(?:esta\s+es|este\s+es|aqui\s+(?:es|esta))\s+(?:mi\s+|el\s+|la\s+)?(casa|trabajo|gym|gimnasio|instituto|uni|universidad|colegio|oficina)$/);
  if (m) {
    const sitio = m[1].trim();
    try {
      const p = await posActual(), l = lugLeer(); l.sitios[sitio] = p; lugGuardar(l);
      responder("📍 Guardado", "Ahora sé dónde está «" + sitio + "».", { voz: "Hecho. Ya sé dónde está " + sitio });
    } catch (e) { responder("📍 Sin ubicación", "Necesito permiso de ubicación. Actívalo en el candado de la barra de direcciones."); }
    return true;
  }
  m = o.match(/^(?:cuando\s+llegue\s+(?:a|al)\s+(.+?)\s*,?\s+(?:recu[eé]rdame|av[ií]same\s+(?:de|para))\s+(?:que\s+)?(.+)|recu[eé]rdame\s+(?:que\s+)?(.+?)\s+cuando\s+llegue\s+(?:a|al)\s+(.+))$/i);
  if (m) {
    let sitio = (m[1] || m[4]).replace(/^(?:mi|el|la)\s+/i, "").trim(), txt = (m[2] || m[3]).trim();
    const l = lugLeer(), clave = Object.keys(l.sitios).find((k) => quitarTildes(k.toLowerCase()) === quitarTildes(sitio.toLowerCase()));
    let pos = clave ? l.sitios[clave] : null;
    if (!pos) {
      try {
        const r = await (await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&q=" + encodeURIComponent(sitio))).json();
        if (r.length) pos = { lat: +r[0].lat, lon: +r[0].lon, radio: 600 };
      } catch (e) {}
    }
    if (!pos) { responder("📍 ¿Dónde está " + sitio + "?", "Cuando estés allí, di «guarda este sitio como " + sitio + "» y luego vuelve a pedírmelo.", { voz: "No sé dónde está " + sitio + ". Cuando estés allí, dime: guarda este sitio como " + sitio }); return true; }
    l.pendientes.push({ sitio, txt, lat: pos.lat, lon: pos.lon, radio: pos.radio || 150 }); lugGuardar(l); lugVigilar();
    responder("📍 Te lo recordaré", "Cuando llegues a " + sitio + ": " + txt + "\n(Funciona con Jarvis abierto en el móvil.)", { voz: "Vale. Cuando llegues a " + sitio + " te recuerdo " + txt });
    return true;
  }
  if (/^(?:mis\s+)?(?:sitios|lugares)(?:\s+guardados)?$/.test(n)) {
    const l = lugLeer(), s = Object.keys(l.sitios);
    responder("📍 Tus sitios", (s.length ? "Guardados: " + s.join(", ") : "Ninguno. Di «guarda este sitio como casa».") + (l.pendientes.length ? "\nPendientes:\n" + l.pendientes.map((x) => "• " + x.sitio + ": " + x.txt).join("\n") : ""));
    return true;
  }
  return false;
}

// ================== MÚSICA ==================
const GENEROS = ["reggaeton", "reguet[oó]n", "trap", "rap", "pop", "rock", "techno", "electr[oó]nica", "house", "flamenco", "salsa", "bachata", "jazz", "cl[aá]sica", "lo-?fi", "lofi", "phonk", "drill", "indie", "metal", "cumbia", "dembow", "afrobeat", "k-?pop"];
function musicaComandos(n, o) {
  let m = o.match(/^(?:pon(?:me)?|reproduce|abre)\s+(.+?)\s+en\s+spotify$/i);
  if (m) { responder("🎧 Spotify", "Buscando «" + m[1] + "» en Spotify.", { voz: "Lo busco en Spotify" }); abrir("https://open.spotify.com/search/" + encodeURIComponent(m[1])); return true; }
  m = n.match(/^(?:pon(?:me)?|quiero)\s+(?:algo\s+de\s+)?musica\s+(?:para\s+)?(entrenar|el gym|el gimnasio|correr|estudiar|concentrarme|dormir|relajarme|una fiesta|fiesta|conducir|cocinar|motivarme)$/);
  if (m) {
    const Q = { entrenar: "gym workout motivation music playlist", "el gym": "gym workout motivation music playlist", "el gimnasio": "gym workout motivation music playlist", correr: "running music playlist", estudiar: "lofi música para estudiar", concentrarme: "música para concentrarse", dormir: "música para dormir", relajarme: "música relajante", "una fiesta": "música de fiesta playlist", fiesta: "música de fiesta playlist", conducir: "música para conducir playlist", cocinar: "música para cocinar playlist", motivarme: "motivational music playlist" };
    responder("🎧 Música para " + m[1], "Te pongo una lista en YouTube.", { voz: "Marchando música para " + m[1] });
    abrir("https://www.youtube.com/results?search_query=" + encodeURIComponent(Q[m[1]]));
    return true;
  }
  m = n.match(new RegExp("^(?:pon(?:me)?|quiero)\\s+(?:musica\\s+(?:de\\s+)?|algo\\s+de\\s+|un\\s+poco\\s+de\\s+)?(" + GENEROS.join("|") + ")$"));
  if (m) {
    responder("🎧 " + capital(m[1]), "Te pongo una lista de " + m[1] + " en YouTube.", { voz: "Marchando " + m[1] });
    abrir("https://www.youtube.com/results?search_query=" + encodeURIComponent(m[1] + " playlist 2026"));
    return true;
  }
  return false;
}

// ================== GASTOS ==================
const GAS_KEY = "jarvisGastos";
const gasLeer = () => leerLS(GAS_KEY, []);
const gasGuardar = (l) => { const lim = fechaISO(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)); guardarLS(GAS_KEY, l.filter((x) => x.f >= lim).slice(-150), "GASTOS"); };
const CATS = [["comida", /comida|comer|restaurante|cena|almuerzo|desayuno|bocadillo|burger|pizza|mcdonald|kebab|super|mercadona|lidl|carrefour|compra/], ["transporte", /gasolina|gasoil|diesel|bus|metro|tren|taxi|uber|cabify|parking|aparcamiento|peaje|transporte/], ["ocio", /cine|fiesta|copas|bar|cerveza|concierto|juego|videojuego|ocio|entrada|discoteca/], ["ropa", /ropa|zapatillas|camiseta|pantalon|chaqueta|zara|nike|adidas/], ["gym", /gym|gimnasio|proteina|suplementos|creatina/], ["suscripciones", /netflix|spotify|hbo|disney|amazon|prime|suscripcion|movil|telefono|internet/], ["salud", /farmacia|medico|dentista|salud/]];
const catDe = (s) => { const n = quitarTildes(s.toLowerCase()); const c = CATS.find(([, re]) => re.test(n)); return c ? c[0] : (n.split(" ")[0] || "otros"); };
const euros = (x) => x.toLocaleString("es-ES", { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";

function gasPintar(desde, titulo) {
  const l = gasLeer().filter((x) => x.f >= desde), por = {};
  l.forEach((x) => { por[x.c] = (por[x.c] || 0) + x.e; });
  const total = l.reduce((a, x) => a + x.e, 0), cats = Object.entries(por).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $("nodoGastosTit").textContent = titulo;
  $("nodoGastosTotal").textContent = euros(total);
  const ul = $("nodoGastosLista"); ul.innerHTML = "";
  const max = cats.length ? cats[0][1] : 1;
  cats.forEach(([c, e]) => {
    const li = document.createElement("li");
    const n = document.createElement("span"); n.textContent = capital(c);
    const b = document.createElement("i"); b.style.width = Math.max(6, (e / max) * 100) + "%";
    const v = document.createElement("small"); v.textContent = euros(e);
    li.append(n, b, v); ul.append(li);
  });
  nodoMostrar("nodoGastos", 60);
  return { total, cats, l };
}
function gasComandos(n, o) {
  let m = n.match(/^(?:me\s+)?(?:he\s+gastado|gaste|gasto(?:\s+de)?|pague|he\s+pagado|apunta\s+(?:un\s+)?gasto\s+de)\s+(\d+(?:[.,]\d+)?)\s*(?:euros?|eur|€|pavos)?(?:\s+(?:en|de|por)\s+(?:el\s+|la\s+|un\s+|una\s+)?(.+))?$/);
  if (m) {
    const e = numES(m[1]), concepto = (m[2] || "otros").trim(), c = catDe(concepto);
    const l = gasLeer(); l.push({ f: hoyISO(), e, c, t: concepto.slice(0, 30) }); gasGuardar(l);
    const mes = fechaISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const r = gasPintar(mes, "Gastos de " + MESES[new Date().getMonth()]);
    responder("💸 Apuntado: " + euros(e), capital(concepto) + " (" + c + ")\nEste mes llevas " + euros(r.total) + ".", {
      voz: "Apuntado. Este mes llevas " + Math.round(r.total) + " euros.",
      botones: [{ texto: "Deshacer", accion: () => { gasGuardar(gasLeer().slice(0, -1)); responder("💸 Quitado", "He borrado el último gasto."); } }]
    });
    return true;
  }
  m = n.match(/^(?:cuanto\s+(?:he\s+gastado|llevo\s+gastado|me\s+he\s+gastado|gasto)|(?:mis\s+)?gastos)(?:\s+(?:de|en)\s+(?!este|esta|hoy|el\s+mes|la\s+semana)(.+?))?(?:\s+(este mes|esta semana|hoy|el mes pasado|del mes|de la semana|de hoy))?$/);
  if (m) {
    const per = m[2] || "este mes", d = new Date();
    let desde = fechaISO(new Date(d.getFullYear(), d.getMonth(), 1)), titulo = "Gastos de " + MESES[d.getMonth()], hasta = "9999";
    if (/semana/.test(per)) { desde = fechaISO(sumarDias(hoy0(), -((d.getDay() + 6) % 7))); titulo = "Gastos de la semana"; }
    if (/hoy/.test(per)) { desde = hoyISO(); titulo = "Gastos de hoy"; }
    if (/pasado/.test(per)) { desde = fechaISO(new Date(d.getFullYear(), d.getMonth() - 1, 1)); hasta = fechaISO(new Date(d.getFullYear(), d.getMonth(), 1)); titulo = "Gastos de " + MESES[(d.getMonth() + 11) % 12]; }
    let l = gasLeer().filter((x) => x.f >= desde && x.f < hasta);
    if (m[1]) { const c = catDe(m[1]); l = l.filter((x) => x.c === c); titulo += " · " + c; }
    const total = l.reduce((a, x) => a + x.e, 0);
    if (!m[1] && hasta === "9999") gasPintar(desde, titulo);
    const por = {}; l.forEach((x) => { por[x.c] = (por[x.c] || 0) + x.e; });
    responder("💸 " + titulo, l.length ? "Total: " + euros(total) + "\n" + Object.entries(por).sort((a, b) => b[1] - a[1]).map(([c, e]) => "• " + capital(c) + ": " + euros(e)).join("\n") : "No hay gastos apuntados.", { voz: l.length ? "Llevas " + euros(total).replace("€", "euros") + (Object.keys(por).length > 1 ? ". Lo que más, " + Object.entries(por).sort((a, b) => b[1] - a[1])[0][0] : "") : "No tienes gastos apuntados." });
    return true;
  }
  if (/^(?:borra|quita|elimina)\s+el\s+ultimo\s+gasto$/.test(n)) { gasGuardar(gasLeer().slice(0, -1)); responder("💸 Quitado", "He borrado el último gasto."); return true; }
  return false;
}
$("nodoGastos").addEventListener("click", () => ejecutar("cuánto he gastado este mes"));

// ================== HÁBITOS ==================
const HAB_KEY = "jarvisHabitos";
const habLeer = () => leerLS(HAB_KEY, {});
function habGuardar(h) { const lim = fechaISO(sumarDias(hoy0(), -45)); for (const k in h) if (k < lim) delete h[k]; guardarLS(HAB_KEY, h, "HABITOS"); }
const META_AGUA = 8;
function habRacha() {
  const dias = new Set(Object.keys(habLeer()).filter((k) => habLeer()[k].gym));
  (typeof gymLeer === "function" ? gymLeer() : []).forEach((x) => dias.add(x.fecha));
  let r = 0, d = hoy0();
  if (!dias.has(fechaISO(d))) d = sumarDias(d, -1); // hoy aún puedes ir
  // Permite 1 día de descanso entre entrenos
  let huecos = 0;
  while (r < 400) { if (dias.has(fechaISO(d))) { r++; huecos = 0; } else if (++huecos > 1) break; d = sumarDias(d, -1); }
  return r;
}
function habPintar() {
  const h = habLeer()[hoyISO()] || {};
  const agua = h.agua || 0;
  $("habAgua").textContent = agua + "/" + META_AGUA;
  $("habAguaBarra").style.width = Math.min(100, (agua / META_AGUA) * 100) + "%";
  $("habSueno").textContent = h.sueno != null ? String(h.sueno).replace(".", ",") + " h" : "–";
  { const r = habRacha(); $("habRacha").textContent = r + (r === 1 ? " día" : " días"); }
  nodoMostrar("nodoHabitos", 45);
}
function habComandos(n) {
  let m = n.match(/^(?:me\s+he\s+bebido|he\s+bebido|bebi|apunta)\s+(?:(\d+|un|una|dos|tres|cuatro|medio)\s+)?(?:vasos?|botellas?|botellin(?:es)?)\s+de\s+agua$/) || n.match(/^(?:he\s+bebido\s+agua|agua|vaso de agua|un vaso de agua)$/);
  if (m) {
    const v = m[1] ? aNum(m[1]) : 1, mult = /botell/.test(n) ? 2 : 1;
    const h = habLeer(), d = h[hoyISO()] = h[hoyISO()] || {}; d.agua = (d.agua || 0) + v * mult; habGuardar(h); habPintar();
    const falta = META_AGUA - d.agua;
    responder("💧 " + d.agua + " de " + META_AGUA + " vasos", falta > 0 ? "Te quedan " + falta + " para la meta de hoy." : "¡Meta de agua cumplida! 🎉", { voz: falta > 0 ? "Llevas " + d.agua + ". Te quedan " + falta + "." : "Meta de agua cumplida. ¡Bien hecho!" });
    return true;
  }
  m = n.match(/^(?:he|hoy he|esta noche he)\s+dormido\s+(\d+(?:[.,]\d+)?|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)(?:\s+y\s+media)?\s+horas?(?:\s+y\s+media)?$/);
  if (m) {
    const horas = aNum(m[1]) + (/y media/.test(n) ? 0.5 : 0);
    const h = habLeer(), d = h[hoyISO()] = h[hoyISO()] || {}; d.sueno = horas; habGuardar(h); habPintar();
    responder("😴 " + String(horas).replace(".", ",") + " horas", horas >= 7 ? "Buen descanso." : "Poco descanso. Intenta acostarte antes esta noche.", { voz: horas >= 7 ? "Bien, buen descanso." : "Has dormido poco. Hoy intenta acostarte antes." });
    return true;
  }
  if (/^(?:he ido al|hoy he ido al|fui al|he entrenado|hoy he entrenado|ya he entrenado)\s*(?:gym|gimnasio)?$/.test(n)) {
    const h = habLeer(), d = h[hoyISO()] = h[hoyISO()] || {}; d.gym = 1; habGuardar(h); habPintar();
    const r = habRacha();
    responder("🔥 Racha de " + r + (r === 1 ? " día" : " días"), "¡Entreno apuntado!", { voz: "Apuntado. Llevas una racha de " + r + (r === 1 ? " día" : " días") + ". Sigue así." });
    return true;
  }
  if (/^(?:mis\s+)?habitos$|^como\s+voy\s+hoy$|^cuanta\s+agua\s+(?:he\s+bebido|llevo)$|^(?:mi\s+)?racha$/.test(n)) {
    habPintar();
    const h = habLeer()[hoyISO()] || {};
    responder("📊 Tus hábitos de hoy", "💧 Agua: " + (h.agua || 0) + "/" + META_AGUA + " vasos\n😴 Sueño: " + (h.sueno != null ? h.sueno + " h" : "sin apuntar") + "\n🔥 Racha de gym: " + habRacha() + (habRacha() === 1 ? " día" : " días") + "\n\nDi «he bebido un vaso de agua», «he dormido 7 horas» o «he ido al gym».", { voz: "Llevas " + (h.agua || 0) + " vasos de agua y una racha de " + habRacha() + " días de gym." });
    return true;
  }
  return false;
}
$("nodoHabitos").addEventListener("click", () => ejecutar("he bebido un vaso de agua"));

// ================== TRADUCTOR POR VOZ ==================
const IDI = { ingles: ["en", "en-GB"], frances: ["fr", "fr-FR"], aleman: ["de", "de-DE"], italiano: ["it", "it-IT"], portugues: ["pt", "pt-PT"], chino: ["zh", "zh-CN"], japones: ["ja", "ja-JP"], arabe: ["ar", "ar-SA"], ruso: ["ru", "ru-RU"], catalan: ["ca", "ca-ES"], coreano: ["ko", "ko-KR"], holandes: ["nl", "nl-NL"], turco: ["tr", "tr-TR"], polaco: ["pl", "pl-PL"], griego: ["el", "el-GR"], rumano: ["ro", "ro-RO"], valenciano: ["ca", "ca-ES"], gallego: ["gl", "gl-ES"], euskera: ["eu", "eu-ES"] };
function hablarEn(texto, lang) {
  if (!cfg.voz || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto); u.lang = lang; u.rate = 0.95;
  const v = speechSynthesis.getVoices().find((x) => x.lang === lang) || speechSynthesis.getVoices().find((x) => x.lang.startsWith(lang.slice(0, 2)));
  if (v) u.voice = v;
  u.onstart = () => setEstado("speaking"); u.onend = u.onerror = () => setEstado("idle");
  speechSynthesis.speak(u);
}
function tradComandos(n, o) {
  const RE_I = "(" + Object.keys(IDI).join("|") + ")";
  let m = n.match(new RegExp("^(?:como\\s+se\\s+dice|como\\s+digo|traduce(?:me)?|traduceme|dime)\\s+(.+?)\\s+(?:en|al|a)\\s+" + RE_I + "$"))
    || n.match(new RegExp("^(?:dime\\s+)?en\\s+" + RE_I + "\\s+(.+)$"));
  if (!m) return false;
  let idioma, frase;
  if (IDI[m[1]]) { idioma = m[1]; frase = m[2]; } else { frase = m[1]; idioma = m[2]; }
  // Recupera la frase con mayúsculas y tildes del texto original
  const orig = o.replace(/[¿?¡!]/g, "");
  const mo = orig.match(new RegExp("^(?:c[oó]mo\\s+se\\s+dice|c[oó]mo\\s+digo|trad[uú]ce(?:me)?|dime)\\s+(.+?)\\s+(?:en|al|a)\\s+\\S+$", "i")) || orig.match(/^(?:dime\s+)?en\s+\S+\s+(.+)$/i);
  if (mo) frase = mo[1];
  frase = frase.replace(/^["«']|["»']$/g, "");
  const [cod, voz] = IDI[idioma];
  setEstado("thinking");
  fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(frase) + "&langpair=es|" + cod).then((r) => r.json()).then((d) => {
    const tr = d.responseData && d.responseData.translatedText;
    if (!tr) throw new Error("vacía");
    _responder("🌍 En " + ({ ingles: "inglés", frances: "francés", aleman: "alemán", japones: "japonés", arabe: "árabe", portugues: "portugués", catalan: "catalán", holandes: "holandés" }[idioma] || idioma), "«" + frase + "»\n→ " + tr, { voz: "" });
    SONIDO.listo();
    setTimeout(() => hablarEn(tr, voz), 250);
    // Botón para repetir
    const b = document.createElement("button"); b.textContent = "🔊 Repetir"; b.addEventListener("click", () => hablarEn(tr, voz)); rfoot.append(b);
  }).catch(() => {
    responder("🌍 Traductor", "No he podido traducir ahora. Te abro Google Translate.");
    abrir("https://translate.google.com/?sl=es&tl=" + cod + "&text=" + encodeURIComponent(frase));
  });
  return true;
}

// ================== FOTOS CON IA ==================
let fotoPregunta = "";
const fotoInput = document.createElement("input");
fotoInput.type = "file"; fotoInput.accept = "image/*"; fotoInput.setAttribute("capture", "environment"); fotoInput.hidden = true;
document.body.append(fotoInput);
function abrirCamara(pregunta) { fotoPregunta = pregunta || ""; fotoInput.value = ""; fotoInput.click(); }
$("camBtn").addEventListener("click", () => abrirCamara(entrada.value.trim()));
fotoInput.addEventListener("change", async () => {
  const f = fotoInput.files[0]; if (!f) return;
  if (!iaLista()) { responder("📷 Falta la IA", "Para mirar fotos necesito tu clave. Di «configura clave …»."); return; }
  setEstado("thinking");
  transcriptEl.textContent = "Mirando la foto…";
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(f); });
    const k = Math.min(1, 1024 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const datos = c.toDataURL("image/jpeg", 0.8);
    const q = fotoPregunta && !/^(?:que es esto|mira esto|abre la camara|haz una foto|hazme una foto|camara|foto)$/.test(quitarTildes(fotoPregunta.toLowerCase())) ? fotoPregunta : "¿Qué es esto? Dímelo en pocas frases y, si es útil, añade un consejo.";
    const r = await fetch(scriptBase(), { method: "POST", body: JSON.stringify({ clave: scriptClave(), accion: "foto", imagen: datos.split(",")[1], tipo: "image/jpeg", q, nombre: nombreUsuario() }) });
    const d = await r.json();
    entrada.value = "";
    if (d.respuesta) { iaHist.push({ r: "u", t: "[foto] " + q }, { r: "j", t: d.respuesta }); ctxSet({ tipo: "ia" }); responder("📷 Esto es lo que veo", d.respuesta, { imagen: datos }); }
    else responder("📷 No he podido", d.error || "Actualiza el script de Google para poder mirar fotos.", { imagen: datos });
  } catch (e) { responder("📷 Sin conexión", "No he podido analizar la foto ahora."); }
});
function fotoComandos(n, o) {
  if (/^(?:que es esto|mira esto|abre la camara|haz(?:me)? una foto|camara|que ves|analiza esto|mira la foto)$/.test(n)) { abrirCamara(o); responder("📷 Cámara", "Haz o elige una foto y te digo qué es.", { voz: "Enséñamelo" }); return true; }
  const m = o.match(/^(?:mira|f[ií]jate)\s+(?:esta\s+foto\s+)?y\s+(?:dime\s+)?(.+)$/i) || o.match(/^(qu[eé]\s+(?:planta|animal|coche|marca|producto|ejercicio|comida|plato|perro|flor|seta|insecto)\s+es\s+(?:esta|este|esto))$/i);
  if (m) { abrirCamara(m[1]); responder("📷 Cámara", "Haz la foto y te lo digo.", { voz: "Haz la foto" }); return true; }
  return false;
}

// ================== EQUIPO FAVORITO Y GOLES EN DIRECTO ==================
const favLeer = () => (typeof memLeer === "function" && memLeer().equipo) || null;
async function favPoner(q) {
  setEstado("thinking");
  const e = await buscarEquipo(q).catch(() => null);
  if (!e) { responder("⚽ No lo encuentro", "No encuentro el equipo «" + q + "»."); return; }
  const fav = { nombre: e.t.shortDisplayName || e.t.displayName, id: String(e.t.id), liga: e.liga, escudo: (e.t.logos && e.t.logos[0] && e.t.logos[0].href) || e.t.logo || "" };
  const mem = memLeer(); mem.equipo = fav; memGuardar(mem);
  if (iaLista()) script({ accion: "fav", id: fav.id, liga: fav.liga, nombre: fav.nombre }).catch(() => {});
  responder("⚽ ¡Aúpa " + fav.nombre + "!", "Tu equipo es el " + fav.nombre + ".\nDi «cómo vamos» o «cuándo jugamos». Te avisaré de los goles" + (iaLista() ? " aquí y en el móvil." : " aquí."), { voz: "Hecho. Tu equipo es el " + fav.nombre + ". Te avisaré de cada gol." });
  pxVivo();
}
function favComandos(n, o) {
  let m = o.match(/^(?:mi\s+equipo(?:\s+favorito)?\s+es|soy\s+(?:del|de\s+la)|mi\s+equipo\s+es\s+el)\s+(?:el\s+|la\s+)?(.+)$/i);
  if (m && !/^(?:el\s+)?(?:mejor|peor)$/i.test(m[1])) { favPoner(m[1]); return true; }
  const fav = favLeer();
  if (/^(?:como\s+(?:vamos|va\s+mi\s+equipo|hemos\s+quedado|quedamos)|hemos\s+ganado|ganamos|resultado\s+de\s+mi\s+equipo|como\s+va\s+el\s+partido)$/.test(n)) {
    if (!fav) { responder("⚽ ¿De qué equipo eres?", "Dime «mi equipo es el …» y ya lo sabré siempre."); return true; }
    futbolEquipo(fav.nombre, "resultado"); return true;
  }
  if (/^(?:cuando\s+(?:jugamos|juega\s+mi\s+equipo)|proximo\s+partido|siguiente\s+partido|contra\s+quien\s+jugamos)$/.test(n)) {
    if (!fav) { responder("⚽ ¿De qué equipo eres?", "Dime «mi equipo es el …» y ya lo sabré siempre."); return true; }
    futbolEquipo(fav.nombre, "proximo"); return true;
  }
  return false;
}
// Mientras Jarvis está abierto, mira cada minuto si tu equipo juega y canta los goles
let pxMarcador = null, pxVivoT = null;
async function pxVivo() {
  clearTimeout(pxVivoT);
  const fav = favLeer();
  let siguiente = 10 * 60e3;
  if (fav && !document.hidden) {
    for (const lg of [fav.liga || "esp.1", "uefa.champions", "uefa.europa"]) {
      let sb; try { sb = await espn("/apis/site/v2/sports/soccer/" + lg + "/scoreboard"); } catch (e) { continue; }
      const p = (sb.events || []).map(partido).find((x) => x.idL === fav.id || x.idV === fav.id);
      if (!p) continue;
      if (p.estado === "in") {
        siguiente = 60e3;
        const marc = p.gl + "-" + p.gv;
        if (pxMarcador && pxMarcador.id === p.idL + p.idV && pxMarcador.m !== marc) {
          const [al, av] = pxMarcador.m.split("-").map(Number);
          const mio = (+p.gl > al ? p.idL : p.idV) === fav.id;
          SONIDO.gol(); orb.setTinte(mio ? "#3ee6a8" : "#ff5e8a", 9000);
          avisar(mio ? "⚽ ¡GOL!" : "😬 Gol en contra", p.local + " " + p.gl + " - " + p.gv + " " + p.visit);
          responder(mio ? "⚽🔥 ¡GOOOL del " + fav.nombre + "!" : "😬 Gol en contra", p.local + " " + p.gl + " - " + p.gv + " " + p.visit + " · " + (p.reloj || ""), { voz: mio ? "¡Goooool del " + fav.nombre + "! " + p.local + " " + p.gl + ", " + p.visit + " " + p.gv : "Gol en contra. " + p.local + " " + p.gl + ", " + p.visit + " " + p.gv });
        }
        pxMarcador = { id: p.idL + p.idV, m: marc };
        nodoFutbol(p, NOMBRES_LIGA[lg], "¡En directo!");
      } else if (p.estado === "pre" && p.fecha - Date.now() < 30 * 60e3) siguiente = 60e3;
      break;
    }
  }
  pxVivoT = setTimeout(pxVivo, siguiente);
}
setTimeout(() => {
  // Si ya le dijiste "recuerda que mi equipo es el X", úsalo como favorito
  const mem = memLeer();
  if (!mem.equipo) { const d = (mem.datos || []).map((x) => x.match(/mi\s+equipo(?:\s+favorito)?\s+es\s+(?:el\s+|la\s+)?(.+)/i)).find(Boolean); if (d) { favPoner(d[1]); return; } }
  pxVivo();
}, 6000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) pxVivo(); });

// ================== FONDO SEGÚN LA HORA Y EL TIEMPO ==================
const cielo = document.createElement("div"); cielo.className = "cielo"; cielo.id = "cielo";
for (let i = 0; i < 70; i++) { const s = document.createElement("i"); s.className = "est"; s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 70}%;animation-delay:${(Math.random() * 4).toFixed(2)}s;--t:${(0.5 + Math.random() * 1.6).toFixed(2)}px`; cielo.append(s); }
for (let i = 0; i < 60; i++) { const s = document.createElement("b"); s.className = "gota"; s.style.cssText = `left:${Math.random() * 100}%;animation-delay:${(Math.random() * 1.2).toFixed(2)}s;animation-duration:${(0.55 + Math.random() * 0.5).toFixed(2)}s`; cielo.append(s); }
for (let i = 0; i < 3; i++) { const s = document.createElement("u"); s.className = "nube"; s.style.cssText = `top:${8 + i * 18}%;animation-delay:${-i * 25}s`; cielo.append(s); }
$("app").prepend(cielo);
let pxTiempoCod = null;
function pxCielo() {
  const h = new Date().getHours();
  const fase = h >= 6 && h < 9 ? "amanecer" : h >= 9 && h < 18 ? "dia" : h >= 18 && h < 21 ? "atardecer" : "noche";
  const c = pxTiempoCod, lluvia = c != null && ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95), nieve = c != null && ((c >= 71 && c <= 77) || c === 85 || c === 86), nubes = c != null && (c === 2 || c === 3 || c === 45 || c === 48);
  cielo.className = "cielo " + fase + (lluvia ? " lluvia" : "") + (nieve ? " nieve" : "") + (nubes || lluvia ? " nubes" : "");
}
async function pxCieloTiempo() {
  try { const t = await datosTiempo(); if (t) pxTiempoCod = t.d.current.weather_code; } catch (e) {}
  pxCielo();
}
pxCielo();
setTimeout(pxCieloTiempo, 2000);
setInterval(pxCieloTiempo, 30 * 60e3);
setInterval(pxCielo, 5 * 60e3);
// Cuando consultas el tiempo de tu ciudad, el fondo se actualiza
const _nodoTiempo = nodoTiempo;
nodoTiempo = function (lugar, d, cuando) { if (!cuando && (!ctx.lugar || ctx.lugar === cfg.ciudad)) { pxTiempoCod = d.current.weather_code; pxCielo(); } return _nodoTiempo(lugar, d, cuando); };

// ================== ENGANCHE CON JARVIS ==================
NODOS.nodoGastos = ["#f7d154", "br"];
NODOS.nodoHabitos = ["#5ec8ff", "bl"];
const _masComandos2 = masComandos;
masComandos = function (t, n, o) {
  if (vozComandos(n) || rutinaComandos(n) || favComandos(n, o) || tradComandos(n, o) || fotoComandos(n, o) || musicaComandos(n, o) || gasComandos(n, o) || habComandos(n)) return true;
  // Lugares (asíncrono: devuelve true si la frase es suya)
  if (/^(?:guarda|apunta)\s+(?:este\s+sitio|donde\s+estoy|mi\s+ubicacion|aqui)\s+como|^(?:esta\s+es|este\s+es|aqui\s+(?:es|esta))\s+(?:mi\s+|el\s+|la\s+)?(?:casa|trabajo|gym|gimnasio|instituto|uni|universidad|colegio|oficina)$|cuando\s+llegue\s+(?:a|al)\s|^(?:mis\s+)?(?:sitios|lugares)(?:\s+guardados)?$/.test(n)) { lugComandos(n, o); return true; }
  return _masComandos2(t, n, o);
};
if (typeof SYNC !== "undefined") {
  SYNC.GASTOS = { clave: GAS_KEY, leer: () => gasLeer() };
  SYNC.HABITOS = { clave: HAB_KEY, leer: () => habLeer() };
  SYNC.LUGARES = { clave: LUG_KEY, leer: () => lugLeer() };
  ["GASTOS", "HABITOS", "LUGARES"].forEach((k) => { if (!syncTs(k) && localStorage.getItem(SYNC[k].clave)) localStorage.setItem("jarvisTs_" + k, 1); });
}
// Al apuntar un entreno, también cuenta para la racha
if (typeof gymRegistrar === "function") {
  const _gymRegistrar = gymRegistrar;
  gymRegistrar = function (...a) { const r = _gymRegistrar(...a); const h = habLeer(), d = h[hoyISO()] = h[hoyISO()] || {}; if (!d.gym) { d.gym = 1; habGuardar(h); } return r; };
}
