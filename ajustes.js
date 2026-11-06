// Jarvis v15: menú de ajustes detallado (estado de la IA, uso, voz, perfil, conexiones).

// ================== CONTADOR DE USO ==================
const USO_KEY = "jarvisUso";
const usoLeer = () => Object.assign({ dias: {}, total: 0, primer: hoyISO(), ultIA: 0, modelo: "", web: false }, leerLS(USO_KEY, {}));
function usoSumar(campo, n) {
  const u = usoLeer(), d = u.dias[hoyISO()] = u.dias[hoyISO()] || {};
  d[campo] = (d[campo] || 0) + (n || 1);
  if (campo === "o") u.total++;
  const lim = fechaISO(sumarDias(hoy0(), -60));
  for (const k in u.dias) if (k < lim) delete u.dias[k];
  guardarLS(USO_KEY, u);
  return u;
}
const usoSuma = (campo, desde) => Object.entries(usoLeer().dias).filter(([k]) => k >= desde).reduce((a, [, d]) => a + (d[campo] || 0), 0);

// Órdenes
const _ejecutarUso = ejecutar;
ejecutar = function (orden) { if (orden && String(orden).trim()) usoSumar("o"); return _ejecutarUso(orden); };
// Preguntas a la IA, búsquedas web, fotos y modelo usado
const _geminiUso = geminiDirecto;
geminiDirecto = async function (partes, hist) {
  const r = await _geminiUso(partes, hist);
  const u = usoSumar("ia");
  if (window.iaInfo) {
    if (window.iaInfo.web) usoSumar("web");
    if (window.iaInfo.foto) usoSumar("fotos");
    const u2 = usoLeer(); u2.modelo = window.iaInfo.modelo; u2.web = window.iaInfo.web || u2.web; u2.ultIA = Date.now(); guardarLS(USO_KEY, u2);
  }
  return r;
};
// IA a través del script (cuando no hay clave propia)
const _preguntarUso = preguntarIA;
preguntarIA = async function (texto) {
  if (!geminiClave() && scriptListo()) { usoSumar("ia"); const u = usoLeer(); u.ultIA = Date.now(); u.modelo = u.modelo || "Gemini (vía script)"; guardarLS(USO_KEY, u); }
  return _preguntarUso(texto);
};
// Fútbol
["futbolEquipo", "futbolProximos", "futbolClasificacion", "futbolHoy"].forEach((f) => {
  const orig = window[f];
  if (typeof orig === "function") window[f] = function (...a) { usoSumar("fut"); return orig.apply(this, a); };
});

// ================== PINTAR LOS AJUSTES ==================
const hace = (ts) => {
  if (!ts) return "Nunca";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "Hace un momento";
  if (s < 3600) return "Hace " + Math.round(s / 60) + " min";
  if (s < 86400) return "Hace " + Math.round(s / 3600) + " h";
  return new Date(+ts).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + " · " + new Date(+ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};
const ocultarClave = (k) => k.length > 10 ? k.slice(0, 4) + "••••••••" + k.slice(-4) : "••••••";
function punto(id, estado, texto) {
  const i = $(id); i.className = "pt " + estado;
  const t = $(id + "Txt"); if (t && texto != null) t.textContent = texto;
}
const NOM_MOD = { "gemini-flash-latest": "Gemini Flash", "gemini-flash-lite-latest": "Gemini Flash Lite", "gemini-3.5-flash-lite": "Gemini 3.5 Flash Lite" };

async function ajPintar() {
  const k = geminiClave(), u = usoLeer(), hoy = hoyISO();
  const mes = fechaISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const semana = fechaISO(sumarDias(hoy0(), -((new Date().getDay() + 6) % 7)));
  // --- IA ---
  const activa = !!k || scriptListo();
  const est = $("iaEstado");
  est.textContent = k ? "Activada" : scriptListo() ? "Vía script" : "No activada";
  est.className = "estado " + (k ? "ok" : scriptListo() ? "medio" : "no");
  $("iaClaveTxt").textContent = k ? ocultarClave(k) : scriptListo() ? "La del script de Google" : "Sin clave";
  $("iaModelo").textContent = u.modelo ? (NOM_MOD[u.modelo] || u.modelo) : activa ? "Automático" : "—";
  const eb = localStorage.getItem("jarvisIaBusqueda") || "";
  $("iaBusqueda").textContent = !k ? (activa ? "Vía script" : "—") : eb === "ok" ? "Funciona ✓" : eb.startsWith("fallo") ? "Falló la última vez ⚠️" : "Lista (aún sin usar)";
  $("iaUltimo").textContent = hace(u.ultIA);
  const iaHoy = (u.dias[hoy] || {}).ia || 0;
  $("usoIaHoy").textContent = iaHoy;
  $("usoIaMes").textContent = usoSuma("ia", mes);
  $("usoWeb").textContent = usoSuma("web", mes);
  $("usoFotos").textContent = usoSuma("fotos", mes);
  const LIM = 1000;
  $("iaLimiteTxt").textContent = iaHoy + " de ~" + LIM.toLocaleString("es-ES");
  $("iaLimiteBarra").style.width = Math.min(100, (iaHoy / LIM) * 100) + "%";
  $("iaCambiar").textContent = k ? "🔑 Cambiar clave" : "🔑 Poner clave";
  $("iaBorrar").hidden = !k;
  $("iaProbar").disabled = !activa;
  // --- Voz ---
  $("optMayordomo").checked = !!cfg.mayordomo;
  $("optSonidos").checked = cfg.sonidos !== false;
  const v = vozEsp(); $("vozActual").textContent = v ? v.name : "La del sistema";
  // --- Perfil ---
  const mem = memLeer();
  $("optNombre").value = mem.nombre || "";
  $("optCiudad").value = cfg.ciudad || "";
  $("optEquipo").value = mem.equipo ? mem.equipo.nombre : "";
  $("equipoTxt").textContent = mem.equipo ? "Te aviso de sus goles" : "Para «cómo vamos» y los goles";
  $("optRutina").checked = cfg.rutinaAuto !== false;
  const nMem = (mem.datos || []).length;
  $("memTxt").textContent = nMem ? nMem + (nMem === 1 ? " cosa guardada" : " cosas guardadas") : "Nada todavía";
  // --- Conexiones ---
  punto("conIA", k ? "ok" : scriptListo() ? "medio" : "no", k ? "Con tu clave · " + (u.ultIA ? "usada " + hace(u.ultIA).toLowerCase() : "lista") : scriptListo() ? "A través del script de Google" : "Sin conectar: pon tu clave arriba");
  const sync = +localStorage.getItem("jarvisUltSync") || 0;
  punto("conScript", scriptListo() ? (sync ? "ok" : "medio") : "no", scriptListo() ? (sync ? "Conectado · sincronizado " + hace(sync).toLowerCase() : "Configurado, sin respuesta todavía") : "No configurado (opcional: avisos al móvil y compartir datos)");
  const es = localStorage.getItem("jarvisEspn") || "";
  punto("conEspn", es === "ok" ? "ok" : es ? (scriptListo() ? "medio" : "no") : "medio", es === "ok" ? "Funciona: partidos y clasificaciones al instante" : es ? "Bloqueado en este navegador · " + (scriptListo() ? "uso el script" : k ? "lo resuelve la IA (más lento)" : "pon la clave de IA") : "Aún sin usar");
  punto("conTelegram", scriptListo() && sync ? "ok" : "no", scriptListo() && sync ? "Resumen 7:30 · avisos de eventos y goles" : "Necesita el script de Google");
  const perm = async (n) => { try { return (await navigator.permissions.query({ name: n })).state; } catch (e) { return "?"; } };
  const txtPerm = { granted: ["ok", "Permitido"], denied: ["no", "Bloqueado · actívalo en el candado de la barra"], prompt: ["medio", "Te lo pedirá la primera vez"], "?": ["medio", "Desconocido"] };
  const [pm, pg] = await Promise.all([perm("microphone"), perm("geolocation")]);
  punto("conMic", ...txtPerm[pm] || txtPerm["?"]);
  punto("conGeo", ...txtPerm[pg] || txtPerm["?"]);
  const np = "Notification" in window ? Notification.permission : "denied";
  $("conNoti").className = "pt " + (cfg.avisos && np === "granted" ? "ok" : np === "denied" ? "no" : "medio");
  // --- Uso ---
  $("usoHoy").textContent = (u.dias[hoy] || {}).o || 0;
  $("usoSemana").textContent = usoSuma("o", semana);
  $("usoTotal").textContent = u.total;
  $("usoFut").textContent = usoSuma("fut", mes);
  $("usoDesde").textContent = "Desde el " + deISO(u.primer).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  const g = $("usoGraf"); g.innerHTML = "";
  const dias = [...Array(7)].map((_, i) => sumarDias(hoy0(), i - 6));
  const vals = dias.map((d) => (u.dias[fechaISO(d)] || {}).o || 0), max = Math.max(1, ...vals);
  dias.forEach((d, i) => {
    const c = document.createElement("div");
    const b = document.createElement("i"); b.style.height = Math.max(4, (vals[i] / max) * 100) + "%"; b.title = vals[i] + " órdenes";
    const n = document.createElement("em"); n.textContent = vals[i] || "";
    const l = document.createElement("small"); l.textContent = i === 6 ? "Hoy" : DIAS_SEM[d.getDay()].slice(0, 2);
    c.append(n, b, l); g.append(c);
  });
  pintarHistorial();
}
$("ajustesBtn").addEventListener("click", () => { if (!$("sheet").hidden) ajPintar(); });

// ================== ACCIONES ==================
// IA
$("iaCambiar").addEventListener("click", () => { $("iaEditar").hidden = false; $("optGemini").value = ""; $("optGemini").focus(); });
async function iaGuardar() {
  const v = $("optGemini").value.trim();
  if (!v) return;
  localStorage.setItem("jarvisGemini", v);
  $("iaEditar").hidden = true;
  await iaProbar(true);
}
$("iaGuardar").addEventListener("click", iaGuardar);
$("optGemini").addEventListener("keydown", (e) => { if (e.key === "Enter") iaGuardar(); });
async function iaProbar(nueva) {
  const est = $("iaEstado");
  est.textContent = "Probando…"; est.className = "estado medio";
  try {
    if (geminiClave()) await geminiDirecto([{ text: "Responde solo: listo" }], false);
    else if (scriptListo()) { const d = await script({ accion: "ia", q: "Responde solo: listo" }); if (!d.respuesta) throw new Error(d.error || "script"); }
    ajPintar();
    responder("🤖 IA conectada", nueva ? "Clave guardada. Ya puedo responder cualquier cosa, buscar partidos y mirar fotos." : "La IA funciona perfectamente.", { voz: "Inteligencia artificial conectada." });
  } catch (e) {
    ajPintar();
    est.textContent = e.message === "clave" ? "Clave no válida" : "Sin respuesta"; est.className = "estado no";
    responder(e.message === "clave" ? "🤖 Clave no válida" : "🤖 La IA no responde", e.message === "clave" ? "Google dice que esa clave no vale. Cópiala otra vez desde AI Studio." : "Ahora mismo no responde. Prueba en un momento.");
  }
}
$("iaProbar").addEventListener("click", () => iaProbar(false));
$("iaBorrar").addEventListener("click", () => { localStorage.removeItem("jarvisGemini"); ajPintar(); responder("🤖 Clave quitada", "He borrado tu clave de IA de este aparato."); });

// Voz
$("optMayordomo").addEventListener("change", (e) => ejecutar(e.target.checked ? "modo mayordomo" : "voz normal"));
$("optSonidos").addEventListener("change", (e) => { cfg.sonidos = e.target.checked; guardarCfg(); if (cfg.sonidos) SONIDO.listo(); });
$("vozCambiar").addEventListener("click", () => { ejecutar("otra voz"); setTimeout(ajPintar, 200); });

// Perfil
$("optNombre").addEventListener("change", (e) => { const m = memLeer(); m.nombre = e.target.value.trim(); memGuardar(m); saludoInicial(); });
$("optEquipo").addEventListener("change", (e) => { const v = e.target.value.trim(); if (v) favPoner(v).then(ajPintar); else { const m = memLeer(); delete m.equipo; memGuardar(m); ajPintar(); } });
$("optRutina").addEventListener("change", (e) => { cfg.rutinaAuto = e.target.checked; guardarCfg(); });
$("memVer").addEventListener("click", () => { $("sheet").hidden = true; ejecutar("qué recuerdas"); });

// Uso
$("histBorrar").addEventListener("click", () => { localStorage.setItem("jarvisHist", "[]"); pintarHistorial(); });

// Navegación por secciones
document.querySelectorAll(".ajnav a").forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  const sec = document.querySelector(a.getAttribute("href"));
  $("sheet").scrollTo({ top: sec.offsetTop - 56, behavior: "smooth" });
}));
