// Jarvis v16: escribir en otras apps (Claude, ChatGPT, Gemini…), WhatsApp, correo y Telegram.

// ================== ASISTENTES DE IA ==================
// "pre": la web acepta el texto en el enlace. Si no, se copia al portapapeles para pegarlo.
const ASISTENTES = {
  claude: { nombre: "Claude", url: (t) => "https://claude.ai/new?q=" + encodeURIComponent(t), pre: true },
  chatgpt: { nombre: "ChatGPT", url: (t) => "https://chatgpt.com/?q=" + encodeURIComponent(t), pre: true },
  perplexity: { nombre: "Perplexity", url: (t) => "https://www.perplexity.ai/search?q=" + encodeURIComponent(t), pre: true },
  copilot: { nombre: "Copilot", url: (t) => "https://copilot.microsoft.com/?q=" + encodeURIComponent(t), pre: true },
  grok: { nombre: "Grok", url: (t) => "https://grok.com/?q=" + encodeURIComponent(t), pre: true },
  gemini: { nombre: "Gemini", url: () => "https://gemini.google.com/app", pre: false },
  deepseek: { nombre: "DeepSeek", url: () => "https://chat.deepseek.com/", pre: false },
  google: { nombre: "Google", url: (t) => "https://www.google.com/search?q=" + encodeURIComponent(t), pre: true },
  youtube: { nombre: "YouTube", url: (t) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(t), pre: true }
};
const ALIAS_ASIS = { "claude": "claude", "clod": "claude", "cloud": "claude", "clau": "claude", "chatgpt": "chatgpt", "chat gpt": "chatgpt", "chat gepete": "chatgpt", "gpt": "chatgpt", "chatgtp": "chatgpt", "chat": "chatgpt", "openai": "chatgpt", "perplexity": "perplexity", "copilot": "copilot", "grok": "grok", "gemini": "gemini", "geminis": "gemini", "deepseek": "deepseek", "deep seek": "deepseek", "google": "google", "youtube": "youtube" };
const RE_ASIS = "(claude|clod|cloud|clau|chat ?gpt|chat gepete|chatgtp|gpt|openai|perplexity|copilot|grok|geminis?|deep ?seek|google|youtube)";

async function copiar(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } }

// "que me haga un resumen" -> "Hazme un resumen" (para que el mensaje suene bien)
const IMPERATIVOS = [[/^me\s+hagas?\b/i, "Hazme"], [/^me\s+digas?\b/i, "Dime"], [/^me\s+expliques?\b/i, "Explícame"], [/^me\s+busques?\b/i, "Búscame"], [/^me\s+escribas?\b/i, "Escríbeme"], [/^me\s+ayudes?\b/i, "Ayúdame"], [/^me\s+recomiendes?\b/i, "Recomiéndame"], [/^me\s+cuentes?\b/i, "Cuéntame"], [/^me\s+resumas?\b/i, "Resúmeme"], [/^me\s+traduzcas?\b/i, "Tradúceme"], [/^me\s+des\b|^me\s+de\b/i, "Dame"], [/^me\s+generes?\b/i, "Genérame"], [/^me\s+crees?\b/i, "Créame"], [/^me\s+corrijas?\b/i, "Corrígeme"], [/^hagas?\b/i, "Haz"], [/^escribas?\b/i, "Escribe"], [/^busques?\b/i, "Busca"], [/^expliques?\b/i, "Explica"], [/^resumas?\b/i, "Resume"]];
function aImperativo(t) {
  for (const [re, imp] of IMPERATIVOS) if (re.test(t)) return t.replace(re, imp);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function abrirAsistente(clave, texto) {
  const a = ASISTENTES[clave];
  if (!texto) {
    responder("🚀 " + a.nombre, "Abriendo " + a.nombre + ".", { voz: "Abriendo " + a.nombre });
    const u = new URL(a.url("x")); abrir(u.origin + (clave === "claude" ? "/new" : clave === "gemini" ? "/app" : "/"));
    return;
  }
  texto = aImperativo(texto.trim());
  if (a.pre) {
    responder("🚀 " + a.nombre, "Le escribo a " + a.nombre + ":\n«" + texto + "»", { voz: "Se lo pregunto a " + a.nombre });
    abrir(a.url(texto));
  } else {
    responder("🚀 " + a.nombre, "He copiado tu mensaje. Cuando se abra, mantén pulsado en el cuadro de texto y dale a «Pegar»:\n«" + texto + "»", {
      voz: "Abro " + a.nombre + ". Tu mensaje está copiado, solo pégalo.",
      botones: [{ texto: "📋 Copiar otra vez", accion: () => copiar(texto) }]
    });
    abrir(a.url(texto));
    copiar(texto);
  }
}

// ================== CONTACTOS ==================
const contactos = () => memLeer().contactos || {};
const normC = (s) => quitarTildes(String(s).toLowerCase()).replace(/^(?:a|al|la|el|mi)\s+/, "").trim();
// Busca el contacto sin importar mayúsculas, tildes ni si dices "mi madre" o "mamá"
const SINONIMOS = [["mama", "madre", "mami", "ma"], ["papa", "padre", "papi", "pa"], ["abuela", "yaya", "abu", "abuelita"], ["abuelo", "yayo", "abuelito"], ["hermano", "hermanito", "tete"], ["hermana", "hermanita", "tata"], ["novia", "mi amor", "cari"], ["novio"]];
function contacto(nombre) {
  const c = contactos(), k = normC(nombre).replace(/^mi\s+/, "");
  const dar = (kk) => Object.assign({ nombre: c[kk].n || kk }, c[kk]);
  if (c[k]) return dar(k);
  const grupo = SINONIMOS.find((g) => g.includes(k));
  if (grupo) { const kk = Object.keys(c).find((x) => grupo.includes(x)); if (kk) return dar(kk); }
  const parcial = Object.keys(c).filter((x) => x.split(" ")[0] === k.split(" ")[0] || x.startsWith(k) || k.startsWith(x));
  if (parcial.length === 1) return dar(parcial[0]);
  return null;
}
function guardarContacto(nombre, datos) {
  const m = memLeer(); m.contactos = m.contactos || {};
  const k = normC(nombre), visible = nombre.replace(/^(?:a|al|la|el|mi)\s+/i, "").trim();
  m.contactos[k] = Object.assign(m.contactos[k] || {}, datos, { n: visible }); memGuardar(m);
  return visible;
}
const telLimpio = (t) => { let n = String(t).replace(/[^\d+]/g, ""); if (/^[6789]\d{8}$/.test(n)) n = "34" + n; return n.replace(/^\+/, ""); };

// ================== COMANDOS ==================
function controlComandos(n, o) {
  let m;
  const oo = o.replace(/[¿?¡!]/g, "").trim();

  // "escríbele a Claude que me haga un resumen de…", "pregúntale a ChatGPT cómo…", "dile a Gemini…"
  m = oo.match(new RegExp("^(?:escr[ií]be(?:le)?|preg[uú]nta(?:le)?|dile|p[ií]dele|m[aá]nda(?:le)?|consulta(?:le)?|habla\\s+con)\\s+(?:a\\s+|en\\s+)?" + RE_ASIS + "\\s*(?:que\\s+|:|,)?\\s*(.*)$", "i"))
    || oo.match(new RegExp("^(?:abre|abrir|[aá]breme|entra\\s+en)\\s+" + RE_ASIS + "(?:\\s+y\\s+(?:escr[ií]be(?:le)?|preg[uú]nta(?:le)?|dile|p[ií]dele|pon|busca)\\s*(?:que\\s+|:)?\\s*(.*))?$", "i"))
    || oo.match(new RegExp("^(?:busca|investiga)\\s+(.+?)\\s+(?:en|con)\\s+" + RE_ASIS + "$", "i"));
  if (m) {
    let quien = m[1], texto = m[2];
    if (!ALIAS_ASIS[normC(quien).replace(/\s+/g, " ")] && m[2] && ALIAS_ASIS[normC(m[2])]) { quien = m[2]; texto = m[1]; } // "busca X en Claude"
    const clave = ALIAS_ASIS[normC(quien)] || ALIAS_ASIS[normC(quien).replace(/\s/g, "")];
    if (clave) { abrirAsistente(clave, (texto || "").trim()); return true; }
  }

  // Contactos: "guarda el número de mamá 612345678", "el correo de Pablo es pablo@gmail.com"
  m = oo.match(/^(?:guarda|apunta)\s+el\s+(?:n[uú]mero|tel[eé]fono|m[oó]vil)\s+de\s+(.+?)\s*(?:,|:|es|que es)?\s*(\+?[\d\s]{9,15})$/i)
    || oo.match(/^el\s+(?:n[uú]mero|tel[eé]fono|m[oó]vil)\s+de\s+(.+?)\s+es\s+(\+?[\d\s]{9,15})$/i);
  if (m) { const k = guardarContacto(m[1], { tel: telLimpio(m[2]) }); responder("📇 Contacto guardado", k + ": " + m[2].trim(), { voz: "Guardado el número de " + k }); return true; }
  m = oo.match(/^(?:guarda\s+)?el\s+(?:correo|email|mail|e-mail)\s+de\s+(.+?)\s*(?:,|:|es)?\s+([\w.+-]+@[\w-]+\.[\w.]+)$/i);
  if (m) { const k = guardarContacto(m[1], { email: m[2] }); responder("📇 Contacto guardado", k + ": " + m[2], { voz: "Guardado el correo de " + k }); return true; }
  if (/^(?:mis\s+)?contactos$/.test(n)) {
    const c = contactos(), l = Object.keys(c);
    responder("📇 Tus contactos", l.length ? l.map((k) => "• " + (c[k].n || k) + (c[k].tel ? " · " + c[k].tel : "") + (c[k].email ? " · " + c[k].email : "")).join("\n") : "Ninguno todavía. Di «guarda el número de mamá 612345678».");
    return true;
  }

  // WhatsApp: "escríbele a mamá por WhatsApp que llego tarde", "manda un whatsapp a Pablo diciendo…", "whatsapp a Pablo: …"
  m = oo.match(/^(?:escr[ií]be(?:le)?|m[aá]nda(?:le)?|env[ií]a(?:le)?|dile)\s+(?:un\s+)?(?:whatsapp|wasap|guasap|mensaje)\s+a\s+(.+?)\s+(?:que|diciendo(?:le)?(?:\s+que)?|:)\s*(.+)$/i)
    || oo.match(/^(?:escr[ií]be(?:le)?|dile|m[aá]ndale)\s+a\s+(.+?)\s+(?:por|en)\s+(?:whatsapp|wasap|guasap)\s+(?:que\s+|:\s*)?(.+)$/i)
    || oo.match(/^(?:whatsapp|wasap|guasap)\s+a\s+(.+?)\s*[:,]\s*(.+)$/i);
  if (m) {
    const c = contacto(m[1]), txt = m[2].trim();
    const url = c && c.tel ? "https://wa.me/" + c.tel + "?text=" + encodeURIComponent(txt) : "https://wa.me/?text=" + encodeURIComponent(txt);
    responder("💬 WhatsApp" + (c ? " a " + c.nombre : ""), "«" + txt + "»" + (c && c.tel ? "\nSolo tienes que darle a enviar." : "\nElige a quién mandarlo. (Di «guarda el número de " + normC(m[1]) + " …» para ir directo la próxima vez.)"), { voz: c ? "Preparado el mensaje para " + c.nombre + ". Dale a enviar." : "Elige a quién mandarlo" });
    abrir(url);
    return true;
  }

  // Telegram: "manda por telegram a … que …" (abre compartir)
  m = oo.match(/^(?:m[aá]nda(?:le)?|escr[ií]be(?:le)?|comparte)\s+(?:por|en)\s+telegram\s+(?:que\s+|:\s*)?(.+)$/i);
  if (m) { responder("✈️ Telegram", "«" + m[1] + "»\nElige el chat y envía.", { voz: "Elige el chat de Telegram" }); abrir("https://t.me/share/url?url=%20&text=" + encodeURIComponent(m[1])); return true; }

  // Correo: "manda un correo a Pablo diciendo que…", "escribe un email a pablo@gmail.com asunto X que …"
  m = oo.match(/^(?:m[aá]nda(?:le)?|escr[ií]be(?:le)?|env[ií]a(?:le)?)\s+(?:un\s+)?(?:correo|email|mail|e-mail)\s+a\s+(.+?)(?:\s+(?:con\s+)?asunto\s+(.+?))?\s+(?:que|diciendo(?:le)?(?:\s+que)?|:)\s*(.+)$/i);
  if (m) {
    const c = /@/.test(m[1]) ? { email: m[1].trim(), nombre: m[1].trim() } : contacto(m[1]);
    const asunto = m[2] || capital(m[3].split(/[.,]/)[0]).slice(0, 60);
    const url = "https://mail.google.com/mail/?view=cm&fs=1" + (c && c.email ? "&to=" + encodeURIComponent(c.email) : "") + "&su=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(capital(m[3].trim()));
    responder("📧 Correo" + (c && c.email ? " a " + c.email : ""), "Asunto: " + asunto + "\n" + capital(m[3].trim()) + (c && c.email ? "" : "\n(No tengo su correo: escríbelo tú. O di «el correo de " + normC(m[1]) + " es …».)"), { voz: "Correo preparado. Revísalo y dale a enviar." });
    abrir(url);
    return true;
  }

  // Llamar: "llama a mamá"
  m = n.match(/^(?:llama|llamar|marca)\s+a\s+(.+)$/);
  if (m) {
    const c = contacto(m[1]);
    if (c && c.tel) { responder("📞 Llamando a " + c.nombre, "+" + c.tel, { voz: "Llamando a " + c.nombre }); location.href = "tel:+" + c.tel; return true; }
    responder("📞 No tengo su número", "Di «guarda el número de " + normC(m[1]) + " 612345678».", { voz: "No tengo su número. Dímelo y lo guardo." });
    return true;
  }
  return false;
}

// Se engancha antes que el resto de comandos
const _masComandos3 = masComandos;
masComandos = function (t, n, o) { return controlComandos(n, o) || _masComandos3(t, n, o); };
