// Historial de versiones de Jarvis (lo que se hizo en cada una)
const VERSIONES = [
  { v: 21, fecha: "6 nov · 23:40", titulo: "Tabla de partidos con datos confirmados", cambios: [
    "Pantalla de fútbol como la del mapa: todos los partidos de la jornada y la clasificación completa",
    "Botones para cambiar de liga: LaLiga, Champions, Premier, Serie A, Bundesliga, Ligue 1, LaLiga 2",
    "Solo datos confirmados (ESPN o TheSportsDB): si no los puede confirmar, lo dice y no se inventa nada",
    "La IA ya no responde de fútbol sin datos confirmados",
    "Se guarda en el móvil: al preguntar sale al instante; se actualiza solo y borra lo de hace más de 2 semanas",
    "Nuevo botón «Fútbol» en la pantalla principal (en lugar de «Enfoque», que sigue funcionando por voz)"] },
  { v: 20, fecha: "6 nov · 23:15", titulo: "Datos reales aunque Google no deje buscar", cambios: [
    "Con tu clave, Google no deja que la IA busque en internet: ahora Jarvis lo detecta",
    "Plan B: Jarvis consigue él mismo los datos reales (ESPN y Google Noticias) y se los pasa a la IA",
    "Los partidos y la clasificación salen de ESPN con resultados y horarios de verdad",
    "Debajo de la respuesta pone de dónde salen los datos",
    "Si Google sigue sin dejar buscar, no pierde tiempo reintentándolo durante 6 horas"] },
  { v: 19, fecha: "6 nov · 23:05", titulo: "Arreglo: la IA volvía a no responder", cambios: [
    "La v17 mandaba a la IA un ajuste de velocidad que con tu clave dejaba la respuesta vacía",
    "Ahora, si ese ajuste falla, repite la pregunta exactamente como en la v16 (que funcionaba)",
    "Más margen de tiempo antes de rendirse",
    "Si falla, «Probar» enseña el motivo exacto que da Google"] },
  { v: 18, fecha: "6 nov · 22:55", titulo: "Historial de versiones", cambios: [
    "Nueva sección «Versiones» en Ajustes con todo lo hecho en cada versión",
    "Aviso automático cuando Jarvis se actualiza, con sus novedades",
    "Di «novedades» o «historial de versiones» para verlo"] },
  { v: 17, fecha: "6 nov · 22:49", titulo: "IA más rápida y fútbol al día", cambios: [
    "La IA usa el modelo rápido sin «pensar» para preguntas normales",
    "Solo busca en Google cuando hace falta (fútbol, noticias, precios, hoy…)",
    "Tiempo límite: si un modelo tarda, pasa al siguiente",
    "El fútbol siempre busca datos de hoy y la jornada que viene, no la anterior",
    "Aviso «⚠️ puede estar desactualizado» si no pudo buscar en internet",
    "Si los datos de ESPN fallan, va directo a la IA sin esperar",
    "Ajustes → Conexiones: estado de «Datos de fútbol (ESPN)»"] },
  { v: 16, fecha: "6 nov · 21:47", titulo: "Control de otras apps", cambios: [
    "«Escríbele a Claude que…», «pregúntale a ChatGPT…», Perplexity, Copilot, Grok",
    "Gemini y DeepSeek: los abre y te copia el mensaje para pegarlo",
    "WhatsApp: «escríbele a mamá por WhatsApp que llego tarde»",
    "Correo con Gmail, «llama a mamá» y compartir por Telegram",
    "Contactos: «guarda el número de mamá…», «mis contactos»"] },
  { v: 15, fecha: "6 nov · 21:29", titulo: "Ajustes detallados", cambios: [
    "Tarjeta de IA: activada o no, clave tapada, modelo, búsqueda, último uso",
    "Estadísticas: preguntas hoy y del mes, búsquedas web, fotos y uso del plan gratis",
    "Voz y escucha, perfil (nombre, ciudad, equipo), conexiones y permisos con puntos de color",
    "Uso de Jarvis con gráfico de los últimos 7 días e historial"] },
  { v: 14, fecha: "6 nov · 21:09", titulo: "Tu propia clave de IA", cambios: [
    "Campo en Ajustes para pegar tu clave de Gemini (se guarda solo en tu aparato)",
    "La IA responde directamente, sin necesitar el script de Google",
    "Si fallan los datos de fútbol, lo responde la IA buscando en Google",
    "Las fotos también funcionan con tu clave"] },
  { v: 13, fecha: "6 nov · 19:40", titulo: "13 funciones nuevas", cambios: [
    "Equipo favorito («mi equipo es el Madrid», «cómo vamos») y goles en directo con sonido",
    "Avisos con voz 30 min antes de cada evento y buenos días automático por la mañana",
    "Fotos con IA (botón de cámara), traductor que habla en el otro idioma",
    "Gastos, hábitos (agua, sueño, racha de gym), recordatorios al llegar a un sitio",
    "Música para entrenar/géneros/Spotify, modo mayordomo, otra voz, sonidos",
    "Fondo que cambia con la hora y el tiempo (estrellas, lluvia, nubes)"] },
  { v: 12, fecha: "6 nov · 19:24", titulo: "Gym, compra y precios", cambios: [
    "Modo gym: series, kilos, récords, «descanso» con anillo y último entreno",
    "Lista de la compra con mini pantalla para tachar",
    "Precio del bitcoin y cambio de divisas"] },
  { v: 11, fecha: "6 nov · 19:04", titulo: "Partidos y micrófono en Android", cambios: [
    "«Próximos partidos de la liga», «partidos del finde», «próxima jornada»",
    "Arreglado el micrófono en el móvil (el orbe ya no le quita el micro)"] },
  { v: 10, fecha: "6 nov · 18:56", titulo: "Móvil y Chromebook a la vez", cambios: [
    "Calendario y memoria compartidos entre aparatos a través del script",
    "Mini pantallas adaptadas a pantallas pequeñas"] },
  { v: 9, fecha: "6 nov · 18:51", titulo: "IA, fútbol y rutinas", cambios: [
    "Preguntas a la IA y conversación con contexto («¿y mañana?», «¿y el Atleti?»)",
    "Fútbol: resultados, próximo partido, clasificación, partidos de hoy",
    "«Buenos días» y «buenas noches» con tiempo, calendario y titulares",
    "Mini pantallas de tiempo, temporizador y fútbol; el orbe cambia de color",
    "Avisos del calendario al móvil por Telegram"] },
  { v: 8, fecha: "6 nov · 18:43", titulo: "Memoria", cambios: [
    "«Llámame…», «recuerda que…», «qué recuerdas», «olvida…»"] },
  { v: 7, fecha: "6 nov · 18:39", titulo: "Red de mini pantallas", cambios: [
    "Mini calendario y mini mapa conectados al orbe con líneas de luz",
    "Animación: lo que apuntas vuela del orbe a su día"] },
  { v: 6, fecha: "6 nov · 18:31", titulo: "Minimapa y actualizaciones", cambios: [
    "Minimapa en la pantalla principal",
    "Jarvis descarga siempre la última versión"] },
  { v: 5, fecha: "6 nov · 18:25", titulo: "Mapa sin clave", cambios: [
    "Mapa de OpenStreetMap (adiós al «API KEY REQUIRED») con estilo oscuro"] },
  { v: 4, fecha: "6 nov · 18:16", titulo: "Calendario y mapa", cambios: [
    "Calendario propio: «apunta el 29 examen», «qué tengo mañana»",
    "Mapa tipo Google Maps con minimapa: «búscame en el mapa París»",
    "Nuevos botones con iconos en la pantalla principal"] },
  { v: 3, fecha: "6 nov · 17:54", titulo: "Resumen por tema desde Jarvis", cambios: [
    "«Tema Real Madrid» manda el resumen sin abrir Telegram, con tu clave"] },
  { v: 2, fecha: "5 nov · 22:36", titulo: "Noticias a Telegram", cambios: [
    "Comandos «tema …» y «resumen»",
    "Resumen diario a las 7:30 en tu móvil (script de Google)"] },
  { v: 1, fecha: "5 nov · 20:53", titulo: "Nace Jarvis", cambios: [
    "Asistente de voz con orbe de partículas",
    "Abrir webs, buscar, tiempo, temporizadores, notas, cuentas y chistes"] }
];
const VERSION_ACTUAL = VERSIONES[0].v;

function pintarVersiones() {
  const ul = $("listaVersiones"); if (!ul) return;
  ul.innerHTML = "";
  VERSIONES.forEach((x, i) => {
    const li = document.createElement("li"); if (i === 0) li.className = "actual";
    const cab = document.createElement("div"); cab.className = "vcab";
    const num = document.createElement("span"); num.className = "vnum"; num.textContent = "v" + x.v;
    const t = document.createElement("b"); t.textContent = x.titulo;
    const f = document.createElement("small"); f.textContent = x.fecha + (i === 0 ? " · actual" : "");
    cab.append(num, t, f);
    const lista = document.createElement("ul");
    x.cambios.forEach((c) => { const l = document.createElement("li"); l.textContent = c; lista.append(l); });
    li.append(cab, lista);
    if (i > 2) { li.classList.add("plegada"); cab.addEventListener("click", () => li.classList.toggle("plegada")); }
    ul.append(li);
  });
}
pintarVersiones();

// Aviso de novedades cuando Jarvis se actualiza
setTimeout(() => {
  const vista = +(localStorage.getItem("jarvisVersionVista") || (localStorage.getItem("jarvisHist") ? 17 : 0));
  localStorage.setItem("jarvisVersionVista", VERSION_ACTUAL);
  if (!vista || vista >= VERSION_ACTUAL) return;
  const nuevas = VERSIONES.filter((x) => x.v > vista);
  responder("🆕 Jarvis actualizado a v" + VERSION_ACTUAL, nuevas.slice(0, 3).map((x) => "v" + x.v + " · " + x.titulo).join("\n") + (nuevas.length > 3 ? "\n…y " + (nuevas.length - 3) + " versiones más" : ""), {
    voz: "",
    botones: [{ texto: "Ver novedades", accion: abrirVersiones }]
  });
}, 4500);

function abrirVersiones() {
  $("sheet").hidden = false;
  if (typeof ajPintar === "function") ajPintar();
  setTimeout(() => { const s = $("ajVersiones"); $("sheet").scrollTo({ top: s.offsetTop - 56, behavior: "smooth" }); }, 60);
}

// Comandos: "novedades", "historial de versiones", "qué hay de nuevo"
const _masComandosV = masComandos;
masComandos = function (t, n, o) {
  if (/^(?:novedades|historial de versiones|versiones|que hay de nuevo|que has cambiado|changelog|que version eres|en que version estas)$/.test(n)) {
    const x = VERSIONES[0];
    responder("🆕 Jarvis v" + x.v + " · " + x.titulo, x.cambios.map((c) => "• " + c).join("\n"), { voz: "Estoy en la versión " + x.v + ". Te abro el historial completo.", botones: [{ texto: "Ver todas las versiones", accion: abrirVersiones }] });
    return true;
  }
  return _masComandosV(t, n, o);
};
