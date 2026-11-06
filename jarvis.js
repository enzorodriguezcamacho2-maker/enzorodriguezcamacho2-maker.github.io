// ================== JARVIS v2 ==================
const $ = (id) => document.getElementById(id);
const EXT = false; // versión web

// ---------- Sitios que conoce (añade los tuyos) ----------
const SITIOS = {
  "youtube": "https://www.youtube.com",
  "gmail": "https://mail.google.com", "correo": "https://mail.google.com", "mi correo": "https://mail.google.com",
  "drive": "https://drive.google.com", "google drive": "https://drive.google.com",
  "documentos": "https://docs.google.com", "docs": "https://docs.google.com",
  "hojas de cálculo": "https://sheets.google.com", "sheets": "https://sheets.google.com",
  "google": "https://www.google.com",
  "github": "https://github.com",
  "whatsapp": "https://web.whatsapp.com",
  "wikipedia": "https://es.wikipedia.org",
  "calendario": "https://calendar.google.com", "mi calendario": "https://calendar.google.com",
  "maps": "https://maps.google.com", "google maps": "https://maps.google.com", "mapas": "https://maps.google.com",
  "fotos": "https://photos.google.com", "google fotos": "https://photos.google.com",
  "chatgpt": "https://chatgpt.com", "claude": "https://claude.ai", "gemini": "https://gemini.google.com",
  "spotify": "https://open.spotify.com", "netflix": "https://www.netflix.com",
  "tiktok": "https://www.tiktok.com", "instagram": "https://www.instagram.com",
  "facebook": "https://www.facebook.com", "twitter": "https://x.com", "x": "https://x.com",
  "twitch": "https://www.twitch.tv", "amazon": "https://www.amazon.es", "traductor": "https://translate.google.com"
};
const PALABRA_CLAVE = "jarvis";

// ---------- Configuración guardada ----------
const cfg = { voz: true, atento: false, avisos: false, ciudad: "" };
try { Object.assign(cfg, JSON.parse(localStorage.getItem("jarvisCfg") || "{}")); } catch (e) {}
function guardarCfg() {
  try { localStorage.setItem("jarvisCfg", JSON.stringify(cfg)); } catch (e) {}
  if (EXT && chrome.storage) chrome.storage.local.set({ inicio: cfg.inicio });
}

// ---------- Elementos ----------
const app = $("app"), statusEl = $("status"), transcriptEl = $("transcript");
const reply = $("reply"), rtitle = $("rtitle"), rtext = $("rtext"), rimg = $("rimg"), rfoot = $("rfoot");
const entrada = $("entrada"), micBtn = $("micBtn");
const orb = new ParticleOrb($("orb"));

// ---------- Reloj ----------
function reloj() {
  const d = new Date();
  $("hora").textContent = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  $("fecha").textContent = d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}
reloj(); setInterval(reloj, 5000);

// ---------- Estado visual ----------
let estado = "idle";
function setEstado(modo, texto) {
  estado = modo;
  app.classList.remove("listening", "speaking", "thinking");
  if (modo !== "idle") app.classList.add(modo);
  orb.setMode(modo);
  statusEl.textContent = texto || { idle: cfg.atento ? "Atento" : "En espera", listening: "Escuchando", thinking: "Pensando", speaking: "Hablando" }[modo];
}

// ---------- Tarjeta de respuesta ----------
function responder(titulo, texto, opts = {}) {
  rtitle.textContent = titulo;
  rtext.textContent = texto;
  if (opts.imagen) { rimg.src = opts.imagen; rimg.hidden = false; } else { rimg.hidden = true; rimg.removeAttribute("src"); }
  rfoot.innerHTML = "";
  for (const b of opts.botones || []) {
    const el = document.createElement(b.url ? "a" : "button");
    el.textContent = b.texto;
    if (b.url) { el.href = b.url; el.target = "_blank"; el.rel = "noopener"; }
    if (b.accion) el.addEventListener("click", b.accion);
    rfoot.append(el);
  }
  reply.hidden = false;
  reply.style.animation = "none"; void reply.offsetWidth; reply.style.animation = "";
  reply.scrollTop = 0;
  hablar(opts.voz !== undefined ? opts.voz : texto);
}

// ---------- Voz de respuesta ----------
let hablando = false;
function vozEsp() {
  const voces = speechSynthesis.getVoices();
  if (cfg.vozNombre) { const elegida = voces.find((v) => v.name === cfg.vozNombre); if (elegida) return elegida; }
  return voces.find((v) => v.lang === "es-ES" && /google/i.test(v.name)) || voces.find((v) => v.lang === "es-ES") || voces.find((v) => v.lang.startsWith("es"));
}
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => {};
function hablar(texto) {
  if (!texto || !cfg.voz || !("speechSynthesis" in window)) { if (estado !== "listening") setEstado("idle"); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "es-ES"; u.rate = cfg.vozRitmo || 1.03; u.pitch = cfg.vozTono || 1;
  const v = vozEsp(); if (v) u.voice = v;
  u.onstart = () => { hablando = true; setEstado("speaking"); };
  u.onend = u.onerror = () => { hablando = false; setEstado("idle"); };
  speechSynthesis.speak(u);
}
function primerasFrases(t, n) {
  const partes = t.match(/[^.!?]+[.!?]+/g) || [t];
  return partes.slice(0, n).join(" ").trim();
}

// ---------- Abrir webs ----------
function abrir(url) {
  const w = window.open(url, "_blank");
  if (!w) {
    // Chrome bloqueó la ventana (pasa con órdenes de voz): botón para abrirla a mano
    const el = document.createElement("a");
    el.href = url; el.target = "_blank"; el.rel = "noopener"; el.textContent = "Abrir ahora ↗";
    rfoot.prepend(el);
    reply.hidden = false;
    if (!localStorage.getItem("jarvisAvisoPopups")) {
      transcriptEl.textContent = "Chrome ha bloqueado la pestaña. Pulsa «Abrir ahora» o permite las ventanas emergentes (mira Ajustes).";
      try { localStorage.setItem("jarvisAvisoPopups", "1"); } catch (e) {}
    }
  }
}

// ---------- Utilidades ----------
const quitarTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
async function json(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json(); }
const NUM = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, medio: 0.5, media: 0.5 };
const aNumero = (s) => (NUM[s] !== undefined ? NUM[s] : parseFloat(String(s).replace(",", ".")));

// ---------- Calculadora (sin eval) ----------
function calcular(expr) {
  let s = expr.toLowerCase()
    .replace(/ra[ií]z cuadrada de\s*(\d+(?:[.,]\d+)?)/g, (m, n) => String(Math.sqrt(parseFloat(n.replace(",", ".")))))
    .replace(/multiplicado por/g, "*").replace(/dividido (entre|por)/g, "/")
    .replace(/elevado a( la)?/g, "^").replace(/al cuadrado/g, "^2").replace(/al cubo/g, "^3")
    .replace(/(\d)\s*[x×]\s*(\d)/g, "$1*$2").replace(/(\d)\s*[x×]\s*(\d)/g, "$1*$2")
    .replace(/\bpor\b/g, "*").replace(/\bentre\b/g, "/").replace(/÷/g, "/")
    .replace(/m[aá]s/g, "+").replace(/menos/g, "-")
    .replace(/(\d+(?:[.,]\d+)?)\s*(%|por ciento) de\s*(\d+(?:[.,]\d+)?)/g, "($1/100*$3)")
    .replace(/(\d),(\d)/g, "$1.$2").replace(/\s+/g, "").replace(/[=?]$/, "");
  const raiz = /ra[ií]z/i.test(expr);
  if (!/^[\d.+\-*/^()]+$/.test(s) || (!raiz && !/[+\-*/^]/.test(s.replace(/^-/, "")))) return null;
  let i = 0;
  const peek = () => s[i];
  function prim() {
    if (peek() === "(") { i++; const v = sum(); if (s[i] !== ")") throw 0; i++; return v; }
    if (peek() === "-") { i++; return -prim(); }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]);
  }
  function pow() { let b = prim(); while (peek() === "^") { i++; b = Math.pow(b, prim()); } return b; }
  function mul() { let v = pow(); while (peek() === "*" || peek() === "/") { const op = s[i++]; const r = pow(); v = op === "*" ? v * r : v / r; } return v; }
  function sum() { let v = mul(); while (peek() === "+" || peek() === "-") { const op = s[i++]; const r = mul(); v = op === "+" ? v + r : v - r; } return v; }
  try { const v = sum(); if (i !== s.length || !isFinite(v)) return null; return v; } catch (e) { return null; }
}

// ---------- Wikipedia ----------
async function wiki(tema) {
  setEstado("thinking", "Buscando");
  transcriptEl.textContent = "Buscando «" + tema + "»…";
  try {
    const s = await json(`https://es.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(tema)}&limit=1&namespace=0&format=json&origin=*`);
    const titulo = s[1] && s[1][0];
    if (!titulo) throw 0;
    const r = await json(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo.replace(/ /g, "_"))}`);
    if (!r.extract) throw 0;
    const url = r.content_urls && r.content_urls.desktop ? r.content_urls.desktop.page : `https://es.wikipedia.org/wiki/${encodeURIComponent(titulo)}`;
    transcriptEl.textContent = r.title;
    responder(r.title, r.extract, {
      imagen: r.thumbnail && r.thumbnail.source,
      voz: primerasFrases(r.extract, 2),
      botones: [{ texto: "Leer en Wikipedia", url }, { texto: "Buscar en Google", url: "https://www.google.com/search?q=" + encodeURIComponent(tema) }]
    });
  } catch (e) {
    responder("Sin resultados", `No he encontrado «${tema}» en Wikipedia.`, {
      botones: [{ texto: "Buscar en Google", url: "https://www.google.com/search?q=" + encodeURIComponent(tema) }]
    });
  }
}

// ---------- Tiempo (Open-Meteo, gratis) ----------
const CODIGOS = {
  0: ["Despejado", "☀️"], 1: ["Casi despejado", "🌤"], 2: ["Parcialmente nublado", "⛅"], 3: ["Nublado", "☁️"],
  45: ["Niebla", "🌫"], 48: ["Niebla", "🌫"], 51: ["Llovizna", "🌦"], 53: ["Llovizna", "🌦"], 55: ["Llovizna fuerte", "🌧"],
  61: ["Lluvia débil", "🌦"], 63: ["Lluvia", "🌧"], 65: ["Lluvia fuerte", "🌧"], 71: ["Nieve débil", "🌨"], 73: ["Nieve", "🌨"], 75: ["Nevada fuerte", "❄️"],
  80: ["Chubascos", "🌦"], 81: ["Chubascos", "🌧"], 82: ["Chubascos fuertes", "⛈"], 95: ["Tormenta", "⛈"], 96: ["Tormenta con granizo", "⛈"], 99: ["Tormenta con granizo", "⛈"]
};
async function ubicacion(nombre) {
  if (nombre) {
    const g = await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nombre)}&count=1&language=es`);
    const p = g.results && g.results[0];
    return p ? { lat: p.latitude, lon: p.longitude, nombre: p.name } : null;
  }
  if (cfg.ciudad) return ubicacion(cfg.ciudad);
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude, nombre: "tu zona" }),
      () => res(null), { timeout: 8000 });
  });
}
async function tiempo(lugar, cuando) {
  if (window.ctxSet) ctxSet({ tipo: "tiempo", lugar, cuando });
  setEstado("thinking", "Consultando");
  try {
    const u = await ubicacion(lugar);
    if (!u) {
      responder("¿Dónde estás?", lugar ? `No encuentro «${lugar}».` : "Dime tu ciudad: por ejemplo «mi ciudad es Madrid», o ponla en Ajustes.");
      return;
    }
    const d = await json(`https://api.open-meteo.com/v1/forecast?latitude=${u.lat}&longitude=${u.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`);
    const c = d.current, dd = d.daily;
    if (window.nodoTiempo) nodoTiempo(u.nombre, d, cuando);
    if (cuando === "semana") {
      const lineas = dd.time.map((f, i) => {
        const [de, ic] = CODIGOS[dd.weather_code[i]] || ["", "🌡"];
        const dia = i === 0 ? "Hoy" : new Date(f + "T12:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
        return `${ic} ${dia.charAt(0).toUpperCase() + dia.slice(1)}: ${Math.round(dd.temperature_2m_max[i])}° / ${Math.round(dd.temperature_2m_min[i])}°  ·  💧${dd.precipitation_probability_max[i]}%`;
      });
      transcriptEl.textContent = "Previsión en " + u.nombre;
      responder("Próximos días en " + u.nombre, lineas.join("\n"), { voz: "Esta es la previsión para los próximos días en " + u.nombre });
      return;
    }
    if (cuando === "manana") {
      const [de, ic] = CODIGOS[dd.weather_code[1]] || ["Variable", "🌡"];
      const mx = Math.round(dd.temperature_2m_max[1]), mn = Math.round(dd.temperature_2m_min[1]), ll = dd.precipitation_probability_max[1];
      transcriptEl.textContent = "Mañana en " + u.nombre;
      responder("Mañana en " + u.nombre, `${ic} ${de}\nMáx ${mx} °C · Mín ${mn} °C · Lluvia ${ll}%`, { voz: `Mañana en ${u.nombre}: ${de.toLowerCase()}, máxima de ${mx} y mínima de ${mn}.` + (ll >= 40 ? ` Probabilidad de lluvia del ${ll} por ciento.` : "") });
      return;
    }
    const [desc, ico] = CODIGOS[c.weather_code] || ["Variable", "🌡"];
    const t = Math.round(c.temperature_2m), max = Math.round(dd.temperature_2m_max[0]), min = Math.round(dd.temperature_2m_min[0]);
    const lluvia = dd.precipitation_probability_max ? dd.precipitation_probability_max[0] : null;
    const texto = `${ico} ${desc}, ${t} °C (sensación ${Math.round(c.apparent_temperature)} °C)\n` +
      `Máx ${max} °C · Mín ${min} °C\n` +
      `Viento ${Math.round(c.wind_speed_10m)} km/h · Humedad ${c.relative_humidity_2m}%` +
      (lluvia !== null ? ` · Lluvia ${lluvia}%` : "");
    transcriptEl.textContent = "Tiempo en " + u.nombre;
    responder("Tiempo en " + u.nombre, texto, {
      voz: `En ${u.nombre} hace ${t} grados, ${desc.toLowerCase()}. Máxima de ${max} y mínima de ${min}.` + (lluvia >= 40 ? ` Probabilidad de lluvia del ${lluvia} por ciento.` : "")
    });
  } catch (e) {
    responder("Sin conexión", "No he podido consultar el tiempo ahora mismo.");
  }
}

// ---------- Avisos ----------
function avisar(titulo, texto) {
  pitido();
  if (cfg.avisos && "Notification" in window && Notification.permission === "granted") {
    try { new Notification(titulo, { body: texto, icon: "icon-192.png" }); } catch (e) {}
  }
}

// ---------- Temporizador ----------
let timer = null;
const fmt = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : String(m).padStart(2, "0")) + ":" + String(x).padStart(2, "0"); };
function pitido() {
  try {
    const ac = new AudioContext();
    [0, 0.35, 0.7, 1.4, 1.75, 2.1].forEach((t0) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ac.currentTime + t0);
      g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + 0.25);
      o.connect(g).connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + 0.3);
    });
    setTimeout(() => ac.close(), 3000);
  } catch (e) {}
}
function cancelarTimer() { if (timer) clearInterval(timer.int); timer = null; $("timerchip").hidden = true; if (window.nodoTimerFin) nodoTimerFin(); }
function iniciarTimer(seg, etiqueta) {
  cancelarTimer();
  const fin = Date.now() + seg * 1000;
  $("timerchip").hidden = false;
  $("tlabel").textContent = etiqueta || "";
  const tick = () => {
    const r = Math.max(0, Math.round((fin - Date.now()) / 1000));
    $("timer").textContent = fmt(r);
    if (window.nodoTimerTick) nodoTimerTick(r, seg, etiqueta);
    if (r <= 0) {
      cancelarTimer();
      const msg = etiqueta ? "Te recuerdo: " + etiqueta : "¡Se acabó el tiempo!";
      avisar("Jarvis", msg);
      responder(etiqueta ? "🔔 Recordatorio" : "⏱ Temporizador", msg, { voz: etiqueta ? "Te recuerdo: " + etiqueta : "Se acabó el tiempo" });
    }
  };
  timer = { int: setInterval(tick, 250) };
  tick();
}
$("timerX").addEventListener("click", () => { cancelarTimer(); responder("Temporizador", "Cancelado."); });

// ---------- Notas ----------
const leerNotas = () => { try { return JSON.parse(localStorage.getItem("jarvisNotas") || "[]"); } catch (e) { return []; } };
const guardarNotas = (n) => { try { localStorage.setItem("jarvisNotas", JSON.stringify(n)); } catch (e) {} };

// ---------- Chistes ----------
const CHISTES = [
  "¿Qué le dice un bit a otro? Nos vemos en el bus.",
  "—Doctor, me siento como un ordenador. —¿Desde cuándo? —Desde que me encendieron.",
  "¿Por qué el libro de matemáticas está triste? Porque tiene demasiados problemas.",
  "¿Cuál es el colmo de un informático? Que su mujer le pida espacio y le formatee el disco.",
  "Había una vez un WiFi tan malo que hasta las ovejas se descargaban antes.",
  "¿Qué hace una abeja en el gimnasio? Zum-ba."
];

const AYUDA = [
  "🤖  Cualquier pregunta: «cómo se hace una tortilla», «quién ganó el último mundial»",
  "⚽  «cómo va el Madrid», «cuándo juega el Barça», «clasificación de la liga», «partidos de hoy», «próximos partidos de la liga», «partidos del finde»",
  "☀️  «buenos días» (tiempo, tu día y titulares), «buenas noches» (lo de mañana)",
  "🔁  Después de una respuesta: «¿y mañana?», «¿y en Barcelona?», «¿y el Atleti?»",
  "💪  Gym: «press banca 4x8 con 60 kilos», «descanso», «mi récord en sentadilla», «qué hice el último día»",
  "🛒  «añade leche y huevos a la lista», «qué tengo en la lista», «ya tengo leche»",
  "💱  «precio del bitcoin», «cuánto son 50 dólares en euros», «a cuánto está el dólar»",
  "⚽  «mi equipo es el Madrid», luego «cómo vamos», «cuándo jugamos» (y te canto los goles en directo)",
  "📷  Botón de cámara o «qué es esto»: le enseñas algo y te dice qué es",
  "🌍  «cómo se dice buenos días en inglés» (te lo dice en voz alta)",
  "💸  «he gastado 12 euros en comida», «cuánto he gastado este mes»",
  "💧  «he bebido un vaso de agua», «he dormido 7 horas», «he ido al gym», «mis hábitos»",
  "📍  «guarda este sitio como casa», «cuando llegue a casa recuérdame sacar la basura»",
  "🎧  «pon música para entrenar», «pon reguetón», «pon Quevedo en Spotify»",
  "🎩  «modo mayordomo», «otra voz», «quita los sonidos»",
  "🚀  «escríbele a Claude que me resuma la Segunda Guerra Mundial», «pregúntale a ChatGPT…», «abre Gemini y escribe…»",
  "💬  «escríbele a mamá por WhatsApp que llego tarde», «manda un correo a Pablo diciendo…», «llama a mamá»",
  "📇  «guarda el número de mamá 612345678», «el correo de Pablo es pablo@gmail.com», «mis contactos»",
  "🆕  «novedades» o «historial de versiones»: qué ha cambiado en Jarvis",
  "🧠  «llámame Mbappé», «recuerda que mi equipo es el Madrid», «cuál es mi equipo», «qué recuerdas»",
  "🌐  «abre youtube», «abre github.com»",
  "🔎  «busca recetas de pasta», «pon Bad Bunny en YouTube»",
  "📚  «infórmame de Marte», «quién es Messi»",
  "☀️  «qué tiempo hace», «tiempo mañana», «tiempo esta semana en Sevilla»",
  "⏱  «temporizador de 10 minutos», «inicia el cronómetro», «modo concentración»",
  "🔔  «recuérdame a las 18:30 llamar a mamá», «recuérdame en 20 minutos sacar la ropa»",
  "🧮  «cuánto es 25 por 4», «15% de 80»",
  "📏  «convierte 10 km a millas», «50 euros a dólares», «30 grados a fahrenheit»",
  "🌍  «qué hora es en Tokio», «traduce buenos días al inglés»",
  "📅  «cuántos días faltan para Navidad», «mi cumpleaños es el 3 de mayo»",
  "📅  «apunta el 29 examen de mates», «mañana a las 5 dentista», «qué tengo esta semana», «abre el calendario»",
  "🗺  «búscame en el mapa París», «llévame a Roma», «abre el mapa», «cómo llego a la Sagrada Familia»",
  "📰  «resumen» (lo último de Telegram), «tema Real Madrid» (resumen de ese tema)",
  "📰  «noticias de hoy», «noticias de fútbol»",
  "📝  «apunta comprar pan», «lee mis notas»",
  "🎲  «lanza un dado», «cara o cruz», «número al azar entre 1 y 50»"
].join("\n");

const IDIOMAS = { "ingles": "en", "frances": "fr", "aleman": "de", "italiano": "it", "portugues": "pt", "espanol": "es", "chino": "zh-CN", "japones": "ja", "arabe": "ar", "ruso": "ru", "catalan": "ca", "coreano": "ko" };

// ================== CEREBRO: interpreta la orden ==================
function ejecutar(ordenOriginal) {
  let orden = ordenOriginal.trim().replace(/^jarvis[\s,.:]*/i, "");
  if (!orden) { hablar("¿Sí?"); return; }
  transcriptEl.textContent = "«" + orden + "»";
  const t = orden.toLowerCase().replace(/[¿?¡!]/g, "").replace(/\.$/, "").trim();
  const n = quitarTildes(t);
  const o = orden.replace(/[¿?¡!]/g, "").replace(/\.$/, "").trim(); // conserva mayúsculas
  guardarHistorial(orden);
  window.ultimaOrden = orden;
  if (apps(t, n, o) || extra(t, n, o)) return;
  let m;

  // Saludos y charla
  if (/^(hola|buenas|hey|ey|buenos dias|buenas tardes|buenas noches)\b/.test(n)) {
    const h = new Date().getHours();
    const s = h < 13 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
    const nom = typeof memNombre === "function" ? memNombre() : "";
    return responder(s + (nom ? ", " + nom : "") + " 👋", "¿En qué te ayudo? Di «qué puedes hacer» para ver ejemplos.", { voz: s + (nom ? ", " + nom : "") + ". ¿En qué te ayudo?" });
  }
  if (/^(gracias|muchas gracias|genial|perfecto)/.test(n)) return responder("😊", "¡De nada!", { voz: "De nada" + (typeof memNombre === "function" && memNombre() ? ", " + memNombre() : "") });
  if (/(quien eres|como te llamas|que eres)/.test(n)) return responder("Soy Jarvis", "Tu asistente personal. Abro webs, busco información, te digo el tiempo, pongo temporizadores, hago cuentas y guardo notas.");
  if (/(que puedes hacer|ayuda|comandos|que sabes hacer)/.test(n)) return responder("Esto es lo que sé hacer", AYUDA, { voz: "Esto es lo que sé hacer." });
  if (/chiste/.test(n)) return responder("😄 Chiste", CHISTES[Math.floor(Math.random() * CHISTES.length)]);
  if (/^(cierrate|cierra jarvis|adios jarvis|apagate)/.test(n)) { hablar("Hasta luego"); setTimeout(() => window.close(), 900); return; }

  // Hora y fecha
  if (/(que hora es|dime la hora|hora es)/.test(n)) {
    const h = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    return responder("🕒 " + h, "Son las " + h + ".");
  }
  if (/(que dia es|que fecha|a que estamos|dia de hoy)/.test(n)) {
    const f = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return responder("📅 Hoy", f.charAt(0).toUpperCase() + f.slice(1) + ".", { voz: "Hoy es " + f });
  }

  // Temporizador
  if (/(cancela|quita|para|borra|deten).*(temporizador|alarma|cuenta)/.test(n)) {
    cancelarTimer(); return responder("Temporizador", "Cancelado.");
  }
  m = n.match(/(temporizador|alarma|avisame|cuenta atras|cronometro).*?(\d+(?:[.,]\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta|cuarenta|cincuenta|sesenta|medio|media)\s*(segundos?|minutos?|horas?)(?:\s*y\s*(\d+|media|medio)\s*(segundos?|minutos?)?)?/);
  if (m) {
    const k = m[3].startsWith("seg") ? 1 : m[3].startsWith("min") ? 60 : 3600;
    let seg = aNumero(m[2]) * k;
    if (m[4]) seg += (m[4] === "media" || m[4] === "medio") ? k / 2 : aNumero(m[4]) * (m[5] ? (m[5].startsWith("seg") ? 1 : 60) : k / 60);
    seg = Math.round(seg);
    if (seg > 0) { iniciarTimer(seg); return responder("⏱ Temporizador", "Te aviso en " + fmt(seg) + ".", { voz: "Hecho, temporizador puesto" }); }
  }

  // Calculadora
  m = t.match(/^(?:cuanto es|cuánto es|cuanto son|cuánto son|calcula|calcular|resultado de|y)\s+(.+)$/);
  const posible = m ? m[1] : t;
  const res = calcular(posible);
  if (res !== null) {
    const r = Number(res.toFixed(8)).toLocaleString("es-ES", { maximumFractionDigits: 6 });
    return responder("🧮 " + r, posible.replace(/\s+/g, " ") + " = " + r, { voz: "Son " + r });
  }

  // Ciudad
  m = o.match(/^(?:mi ciudad es|vivo en|estoy en)\s+(.+)$/i);
  if (m) { cfg.ciudad = m[1].trim(); guardarCfg(); $("optCiudad").value = cfg.ciudad; return responder("📍 Guardado", "Tu ciudad es " + cfg.ciudad + "."); }

  // Tiempo
  if (/(tiempo|temperatura|clima|llover|lluvia|calor|frio|grados)/.test(n) && !/temporizador/.test(n)) {
    const cuando = /(semana|proximos dias|estos dias|varios dias)/.test(n) ? "semana" : /\bmanana\b/.test(n.replace(/de la manana/, "")) ? "manana" : "";
    m = o.match(/\ben\s+([a-záéíóúñü\s.-]+?)(?:\s+(?:mañana|manana|hoy|esta semana|los próximos días|los proximos dias))?$/i);
    const lugar = m && !/^(casa|la calle|mi zona)$/i.test(m[1].trim()) ? m[1].trim() : "";
    tiempo(lugar, cuando); return;
  }

  // Notas
  m = o.match(/^(?:apunta|anota|apúntame|apuntame|anótame|anotame|recuérdame|recuerdame|guarda la nota|nota)\s+(?:que\s+)?(.+)$/i);
  if (m) {
    const notas = leerNotas(); notas.push({ txt: m[1], fecha: Date.now() }); guardarNotas(notas);
    return responder("📝 Nota guardada", m[1], { voz: "Apuntado" });
  }
  if (/(lee|leeme|dime|muestrame|ver|ensename|cuales son)\s+(mis\s+|las\s+)?notas/.test(n) || n === "notas" || n === "mis notas") {
    const notas = leerNotas();
    if (!notas.length) return responder("📝 Notas", "No tienes notas. Di «apunta…» para crear una.");
    return responder("📝 Tus notas (" + notas.length + ")", notas.map((x, i) => (i + 1) + ". " + x.txt).join("\n"), {
      voz: "Tienes " + notas.length + (notas.length === 1 ? " nota: " : " notas: ") + notas.map((x) => x.txt).join(". "),
      botones: [{ texto: "Borrar todas", accion: () => { guardarNotas([]); responder("📝 Notas", "Notas borradas."); } }]
    });
  }
  if (/(borra|elimina|limpia)\s+(mis\s+|las\s+|todas las\s+)?notas/.test(n)) { guardarNotas([]); return responder("📝 Notas", "Notas borradas."); }

  // Traducir
  m = n.match(/^traduce(?:me)?\s+(.+?)\s+(?:al|a)\s+(ingles|frances|aleman|italiano|portugues|espanol|chino|japones|arabe|ruso|catalan|coreano)$/);
  if (m) {
    const m2 = o.match(/^trad[uú]ce(?:me)?\s+(.+?)\s+(?:al|a)\s+\S+$/i);
    const original = m2 ? m2[1] : m[1];
    responder("🌍 Traductor", "Traduciendo «" + original + "» al " + m[2] + "…", { voz: "Abriendo el traductor" });
    abrir(`https://translate.google.com/?sl=auto&tl=${IDIOMAS[m[2]]}&text=${encodeURIComponent(original)}&op=translate`);
    return;
  }

  // YouTube
  m = o.match(/^(?:pon|ponme|reproduce|busca|búscame|buscame)\s+(.+?)\s+en\s+youtube$/i) || o.match(/^(?:pon|ponme|reproduce)\s+(?:la canción\s+|la cancion\s+|música de\s+|musica de\s+|el vídeo de\s+|el video de\s+)?(.+)$/i);
  if (m && !SITIOS[m[1].trim().toLowerCase()]) {
    responder("▶️ YouTube", "Buscando «" + m[1] + "» en YouTube.", { voz: "Lo pongo en YouTube" });
    abrir("https://www.youtube.com/results?search_query=" + encodeURIComponent(m[1]));
    return;
  }

  // Abrir sitios
  m = o.match(/^(?:abre|abrir|ábreme|abreme|ve a|vete a|entra en|llévame a|llevame a|pon)\s+(.+)$/i);
  if (m) {
    const obj = m[1].replace(/^(la |el |los |las |mi |mis )/, "").trim();
    const objN = quitarTildes(obj.toLowerCase());
    let url, nota = "Abriendo " + obj;
    const clave = Object.keys(SITIOS).find((k) => quitarTildes(k) === objN || quitarTildes(k) === quitarTildes(m[1].trim().toLowerCase()));
    if (clave) url = SITIOS[clave];
    else if (/^[\w-]+(\s?(punto|\.)\s?[\w-]+)+$/i.test(obj)) { const dom = obj.toLowerCase().replace(/\s?punto\s?/g, ".").replace(/\s/g, ""); url = "https://" + dom; nota = "Abriendo " + dom; }
    else { url = "https://www.google.com/search?q=" + encodeURIComponent(obj); nota = "Buscando " + obj + " en Google"; }
    responder("🌐 " + nota.replace(/^(Abriendo|Buscando) /, "").replace(/ en Google$/, ""), nota + ".", { voz: nota });
    abrir(url);
    return;
  }

  // Información (Wikipedia)
  m = o.match(/^(?:infórmame|informame|infórmeme|háblame|hablame|cuéntame|cuentame|dime algo|explícame|explicame)\s+(?:de|sobre|acerca de|qué es|que es)\s+(.+)$/i)
    || o.match(/^(?:qué|que|quién|quien|quiénes|quienes)\s+(?:es|son|fue|fueron|era)\s+(?:un |una |el |la |los |las )?(.+)$/i);
  if (m) { wiki(m[1]); return; }

  // Buscar en Google
  m = o.match(/^(?:busca|buscar|búscame|buscame|googlea|investiga)\s+(?:en google\s+)?(.+)$/i);
  if (m) {
    responder("🔎 Google", "Buscando «" + m[1] + "».", { voz: "Buscando " + m[1] });
    abrir("https://www.google.com/search?q=" + encodeURIComponent(m[1]));
    return;
  }

  // No entendido: pregunta a la IA (si está configurada); si no, Wikipedia para temas cortos
  if (typeof iaLista === "function" && iaLista() && (t.split(" ").length > 2 || (ctxVivo() && ctx.tipo === "ia"))) { preguntarIA(orden); return; }
  if (t.split(" ").length <= 4) { wiki(t); return; }
  responder("🤔 No lo tengo claro", "Aún no sé hacer eso. ¿Lo busco en Google?", {
    voz: "No sé hacer eso todavía. ¿Lo busco en Google?",
    botones: [{ texto: "Buscar en Google", url: "https://www.google.com/search?q=" + encodeURIComponent(orden) }, { texto: "Ver lo que sé hacer", accion: () => ejecutar("qué puedes hacer") }]
  });
}

// ================== MICRÓFONO ==================
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, escuchando = false, directo = false;

// Nivel de voz para que el orbe reaccione
let audioCtx = null, micStream = null, raf = 0;
// En Android el micrófono no se puede compartir: si lo usamos para el orbe, el reconocimiento de voz no oye nada
const MOVIL = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
async function medirMic(on) {
  if (MOVIL) { orb.level = on ? 0.35 : 0; return; }
  if (on && !micStream) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new AudioContext();
      const an = audioCtx.createAnalyser(); an.fftSize = 256;
      audioCtx.createMediaStreamSource(micStream).connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const loop = () => { an.getByteFrequencyData(data); let s = 0; for (const v of data) s += v; orb.level = Math.min(1, s / data.length / 70); raf = requestAnimationFrame(loop); };
      loop();
    } catch (e) { micStream = null; }
  } else if (!on && micStream) {
    cancelAnimationFrame(raf); micStream.getTracks().forEach((tr) => tr.stop()); micStream = null;
    if (audioCtx) audioCtx.close(); audioCtx = null; orb.level = 0;
  }
}

function pedirPermiso() {
  responder("🎙 Micrófono bloqueado", "Pulsa el icono del candado o de ajustes (arriba, a la izquierda de la dirección) → Micrófono → Permitir. Después recarga la página.", { voz: "" });
}

if (!SR) {
  transcriptEl.textContent = "Este navegador no reconoce voz. Usa Chrome.";
} else {
  rec = new SR();
  rec.lang = "es-ES";
  rec.interimResults = true;

  rec.onstart = () => { escuchando = true; if (!hablando) setEstado(cfg.atento && !directo ? "idle" : "listening"); if (!cfg.atento || directo) medirMic(true); };
  rec.onend = () => {
    escuchando = false;
    medirMic(false);
    if (cfg.atento) setTimeout(() => { if (!escuchando) try { rec.continuous = true; rec.start(); } catch (e) {} }, 300);
    else if (estado === "listening") setEstado("idle");
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") { cfg.atento = false; $("optAtento").checked = false; guardarCfg(); pedirPermiso(); }
    if (e.error === "no-speech" && !cfg.atento) transcriptEl.textContent = "No te he oído. Prueba otra vez.";
    if (e.error === "audio-capture") transcriptEl.textContent = "No encuentro el micrófono. Cierra otras apps que lo usen y prueba otra vez.";
    if (e.error === "network") transcriptEl.textContent = "El reconocimiento de voz necesita internet. Revisa la conexión.";
  };
  rec.onresult = (e) => {
    if (hablando) return;
    let interim = "", final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += txt; else interim += txt;
    }
    const activo = !cfg.atento || directo;
    if (interim && (activo || interim.toLowerCase().includes(PALABRA_CLAVE))) {
      if (!activo) setEstado("listening");
      transcriptEl.innerHTML = "";
      const s = document.createElement("span"); s.className = "interim"; s.textContent = interim;
      transcriptEl.append(s);
    }
    if (!final) return;
    const low = final.toLowerCase();
    if (activo) { directo = false; ejecutar(final); if (cfg.atento) medirMic(false); return; }
    const idx = low.indexOf(PALABRA_CLAVE);
    if (idx === -1) { if (estado === "listening") setEstado("idle"); return; }
    const resto = final.slice(idx + PALABRA_CLAVE.length).replace(/^[\s,.:]+/, "");
    if (!resto) { directo = true; medirMic(true); setEstado("listening"); hablar("¿Sí?"); return; }
    ejecutar(resto);
  };
}

function escuchar() {
  if (!rec) return;
  if (hablando) { speechSynthesis.cancel(); hablando = false; }
  if (cfg.atento) {
    directo = true; medirMic(true); setEstado("listening");
    if (!escuchando) try { rec.continuous = true; rec.start(); } catch (e) {}
    return;
  }
  if (escuchando) { rec.stop(); return; }
  rec.continuous = false;
  try { rec.start(); } catch (e) {}
}

function aplicarAtento() {
  if (!rec) return;
  if (cfg.atento) { rec.continuous = true; if (!escuchando) try { rec.start(); } catch (e) {} setEstado("idle"); }
  else { try { rec.stop(); } catch (e) {} setEstado("idle"); }
}

// ================== EVENTOS ==================
$("orb").addEventListener("click", escuchar);
micBtn.addEventListener("click", escuchar);
entrada.addEventListener("keydown", (e) => { if (e.key === "Enter" && entrada.value.trim()) { ejecutar(entrada.value); entrada.value = ""; } });
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && document.activeElement !== entrada && !(document.activeElement && document.activeElement.type === "text")) { e.preventDefault(); escuchar(); }
  if (e.key === "Escape") $("sheet").hidden = true;
});
document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => ejecutar(c.dataset.cmd)));

// Ajustes
$("ajustesBtn").addEventListener("click", () => { $("sheet").hidden = !$("sheet").hidden; });
$("cerrarAjustes").addEventListener("click", () => { $("sheet").hidden = true; });
$("optAtento").checked = cfg.atento; $("optVoz").checked = cfg.voz; $("optAvisos").checked = cfg.avisos; $("optCiudad").value = cfg.ciudad;
$("optAtento").addEventListener("change", (e) => { cfg.atento = e.target.checked; guardarCfg(); aplicarAtento(); });
$("optVoz").addEventListener("change", (e) => { cfg.voz = e.target.checked; guardarCfg(); if (!cfg.voz) speechSynthesis.cancel(); });
$("optAvisos").addEventListener("change", async (e) => {
  cfg.avisos = e.target.checked;
  if (cfg.avisos && "Notification" in window && Notification.permission !== "granted") {
    const p = await Notification.requestPermission();
    if (p !== "granted") { cfg.avisos = false; e.target.checked = false; }
  }
  guardarCfg();
});
$("ajustesBtn").addEventListener("click", () => pintarHistorial());
$("optCiudad").addEventListener("change", (e) => { cfg.ciudad = e.target.value.trim(); guardarCfg(); });

// Arranque
guardarCfg();
setEstado("idle");
if (cfg.atento) aplicarAtento();
