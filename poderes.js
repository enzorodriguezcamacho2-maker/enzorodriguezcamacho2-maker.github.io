// Jarvis · funciones nuevas para la web (generado a partir del código de la extensión). No editar a mano.
(function () {

// ======== web/puente.js ========
// ============ PUENTE: hace que el código de la extensión funcione dentro de la web de Jarvis ============
const ES_EXT = false;
const SOLO_EXT = "Esto solo funciona en la extensión de Chrome, porque necesita tocar otras webs.";
const MOVIL_W = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const dosCifras = (n) => String(n).padStart(2, "0");
const fechaISO = (d) => d.getFullYear() + "-" + dosCifras(d.getMonth() + 1) + "-" + dosCifras(d.getDate());
const sinTildes = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const datosListos = Promise.resolve();

// ---------- «chrome» de mentira: guarda en el navegador y abre pestañas ----------
const oyentesCambio = [];
const chrome = {
  runtime: { getURL: (p) => new URL(p, location.href).href },
  storage: {
    local: {
      async get(k) {
        const claves = k == null ? Object.keys(localStorage).filter((x) => x.startsWith("jx_")).map((x) => x.slice(3)) : typeof k === "string" ? [k] : k;
        const o = {};
        for (const c of claves) { const v = localStorage.getItem("jx_" + c); if (v != null) try { o[c] = JSON.parse(v); } catch (e) {} }
        return o;
      },
      async set(o) {
        const cambios = {};
        for (const [c, v] of Object.entries(o)) {
          try { localStorage.setItem("jx_" + c, JSON.stringify(v)); } catch (e) {}
          cambios[c] = { newValue: v };
        }
        oyentesCambio.forEach((f) => { try { f(cambios, "local"); } catch (e) {} });
      },
      async remove(k) { (Array.isArray(k) ? k : [k]).forEach((c) => localStorage.removeItem("jx_" + c)); }
    },
    session: { _m: {}, async get(k) { return { [k]: this._m[k] }; }, async set(o) { Object.assign(this._m, o); }, async remove(k) { delete this._m[k]; } },
    onChanged: { addListener: (f) => oyentesCambio.push(f) }
  },
  tabs: {
    async create({ url }) { const w = window.open(url, "_blank"); return { id: 0, abierta: !!w }; },
    async query() { throw new Error(SOLO_EXT); }
  },
  downloads: {
    async download({ url, filename }) {
      const a = document.createElement("a");
      a.href = url; a.download = (filename || "jarvis").split("/").pop();
      document.body.appendChild(a); a.click(); a.remove();
      return 1;
    }
  }
};

// ---------- Lo que en la extensión toca otras pestañas ----------
async function pestanaActual() { throw new Error(SOLO_EXT); }
async function leerPagina() { throw new Error(SOLO_EXT); }
async function enPagina(func, args = []) {
  if (func.name === "matrixEnPagina") return func(...args); // la lluvia de Matrix sí, sobre el propio Jarvis
  throw new Error(SOLO_EXT);
}
async function copiar(texto, que) {
  try { await navigator.clipboard.writeText(texto); $("transcript").textContent = que + " copiado. 📋"; }
  catch (e) { decir("📋 Copiar", "No he podido copiar solo. Mantén pulsado el texto para copiarlo.", { voz: false }); }
}
const insertarEnPagina = (t) => copiar(t, "Texto");
const pedirPermisoMicro = () => (typeof pedirPermiso === "function" ? pedirPermiso() : decir("🎙 Micrófono", "Permite el micrófono en el candado de la barra de direcciones y recarga.", { voz: false }));

// ---------- Estado, respuestas y voz (las de la web) ----------
const estado = (modo) => setEstado(modo);
function hablar(texto) {
  if (typeof liveActivo === "function" && liveActivo()) return;
  window.hablar(texto);
}
function decir(titulo, texto, opciones = {}) {
  const capturando = Array.isArray(window.capturaDecir);
  if (capturando) window.capturaDecir.push(titulo + ": " + texto);
  $("rtitle").textContent = titulo;
  $("rtext").textContent = texto;
  const img = $("rimg"); if (img) { img.hidden = true; img.removeAttribute("src"); }
  const pie = $("rfoot");
  pie.innerHTML = "";
  pie.hidden = false;
  for (const e of opciones.botones || []) {
    const b = document.createElement("button");
    b.textContent = e.t;
    b.addEventListener("click", () => Promise.resolve(e.f()).catch(fallo));
    pie.appendChild(b);
  }
  for (const e of opciones.enlaces || []) {
    const a = document.createElement("a");
    a.textContent = e.t.length > 40 ? e.t.slice(0, 40) + "…" : e.t; a.href = e.u; a.target = "_blank"; a.rel = "noopener";
    pie.appendChild(a);
  }
  if (opciones.nodo) pie.appendChild(opciones.nodo);
  if (opciones.campos) {
    const form = document.createElement("form");
    form.className = "rform";
    for (const c of opciones.campos) {
      const el = document.createElement(c.tipo === "area" ? "textarea" : "input");
      if (c.tipo !== "area") el.type = c.tipo || "text";
      el.placeholder = c.ph || ""; el.value = c.valor || ""; el.autocomplete = "off"; el.dataset.id = c.id;
      form.appendChild(el);
    }
    const ok = document.createElement("button");
    ok.type = "submit"; ok.textContent = opciones.enviar ? opciones.enviar.t : "Aceptar";
    form.appendChild(ok);
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const valores = {};
      form.querySelectorAll("[data-id]").forEach((el) => { valores[el.dataset.id] = el.value; });
      form.querySelectorAll('input[type="password"]').forEach((el) => { el.value = ""; });
      Promise.resolve(opciones.enviar && opciones.enviar.f(valores)).catch(fallo);
    });
    pie.appendChild(form);
  }
  const reply = $("reply");
  reply.classList.toggle("error", !!opciones.error);
  reply.hidden = false;
  reply.scrollTop = 0;
  if (opciones.error) orb.setTinte("#ff5e8a", 2500);
  if (!opciones.error && opciones.voz !== false && !capturando) hablar(typeof opciones.voz === "string" ? opciones.voz : texto);
  else if (!(typeof liveActivo === "function" && liveActivo())) setEstado("idle");
}
function fallo(e) { decir("Algo ha fallado", (e && e.message) || String(e), { error: true, voz: false }); }

// ---------- IA (Gemini con tu clave de la web) ----------
async function getClave() { return localStorage.getItem("jarvisGemini") || ""; }
function contextoPersonal() {
  const p = [];
  p.push("Fecha y hora actual: " + new Date().toLocaleString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + ".");
  try { if (cfg.ciudad) p.push("El usuario vive en " + cfg.ciudad + "."); } catch (e) {}
  try {
    const m = memLeer();
    if (m.nombre) p.push("Llama al usuario \"" + m.nombre + "\".");
    if (m.equipo && m.equipo.nombre) p.push("Su equipo de fútbol es el " + m.equipo.nombre + ".");
    if ((m.datos || []).length) p.push("Cosas que te pidió recordar: " + m.datos.join(" | ") + ".");
  } catch (e) {}
  try {
    const hoy = fechaISO(new Date());
    const prox = calLeer().filter((e) => e.fecha >= hoy).slice(0, 15);
    if (prox.length) p.push("Su calendario próximo: " + prox.map((e) => e.fecha + (e.hora ? " " + e.hora : "") + " " + e.titulo).join("; ") + ".");
  } catch (e) {}
  return p.join(" ");
}
async function gemini(instruccion, contexto = "", opciones = {}) {
  const clave = await getClave();
  if (!clave) throw new Error("Falta tu clave de Gemini: ponla en Ajustes → Clave de IA.");
  const silencioso = !!opciones.silencioso;
  if (!silencioso) setEstado("thinking");
  const base = $("transcript").textContent.replace(/\s·\s\d+\s?s$/, "");
  const inicio = Date.now();
  const reloj = silencioso ? 0 : setInterval(() => { $("transcript").textContent = base + " · " + Math.round((Date.now() - inicio) / 1000) + " s"; }, 1000);
  const INTENTOS = [
    { modelo: "gemini-flash-lite-latest", sinPensar: true },
    { modelo: "gemini-flash-lite-latest", sinPensar: false },
    { modelo: "gemini-flash-latest", sinPensar: false }
  ];
  let ultimoError = "";
  try {
    for (const intento of INTENTOS) {
      const generationConfig = { maxOutputTokens: 2048 };
      if (intento.sinPensar) generationConfig.thinkingConfig = { thinkingBudget: 0 };
      const cuerpo = {
        systemInstruction: { parts: [{ text: (typeof personaTexto === "function" ? personaTexto() : "Eres Jarvis. Respondes en español de España. ") + "Responde claro y breve, en texto plano, sin markdown ni asteriscos. " + contextoPersonal() }] },
        contents: [{ role: "user", parts: [...(opciones.partes || []), { text: (contexto ? "CONTEXTO:\n" + contexto + "\n\n" : "") + instruccion }] }],
        generationConfig
      };
      const corte = new AbortController();
      const t = setTimeout(() => corte.abort(), 30000);
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${intento.modelo}:generateContent`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": clave }, body: JSON.stringify(cuerpo), signal: corte.signal
        });
        const j = await r.json();
        if (!r.ok) { ultimoError = (j.error && j.error.message) || "Error " + r.status; continue; }
        const texto = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map((p) => p.text || "").join("").trim();
        if (texto) { if (!silencioso) $("transcript").textContent = "Hecho en " + Math.round((Date.now() - inicio) / 1000) + " s"; return texto; }
        ultimoError = "La IA no devolvió respuesta.";
      } catch (e) {
        ultimoError = e.name === "AbortError" ? "La IA ha tardado demasiado. Prueba otra vez." : "Sin conexión con la IA.";
      } finally { clearTimeout(t); }
    }
  } finally { clearInterval(reloj); }
  if (!silencioso) setEstado("idle");
  throw new Error(ultimoError);
}

// ---------- Calendario de la web ----------
async function calAnadirEventos(evs) {
  const l = calLeer();
  l.push(...evs.map((e) => Object.assign({ avisado: false }, e)));
  l.sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")));
  calGuardar(l);
}
const scriptConectado = () => (typeof scriptListo === "function" ? scriptListo() : false);
function lineaEscaneoEnPagina() {}


// ======== web/ui.js ========
// ---------- Interfaz nueva (se añade sola a la web) ----------
(function montarInterfaz() {
  const top = document.querySelector(".top");
  const ajustes = $("ajustesBtn");
  const pb = document.createElement("button");
  pb.className = "personaBtn"; pb.id = "personaBtn"; pb.title = "Personalidad"; pb.textContent = "🤵 Jarvis";
  top.insertBefore(pb, ajustes);

  const appEl = $("app");
  const toast = document.createElement("div");
  toast.className = "xpToast"; toast.id = "xpToast";
  appEl.appendChild(toast);

  // Botón oculto que usa el código común
  const oculto = document.createElement("button");
  oculto.id = "estudioBtn"; oculto.hidden = true;
  appEl.appendChild(oculto);

  const caja = document.createElement("div");
  caja.innerHTML = `
  <section class="pxsheet" id="estudio" hidden>
    <div class="shead"><b>📚 Estudio y poderes</b><button class="rclose" id="cerrarEstudio" title="Cerrar">✕</button></div>
    <div class="xp" id="xpCaja" title="Ver logros">
      <div class="xpfila"><b id="xpNivel">Nivel 1</b><span id="xpNum"></span></div>
      <div class="xpbarra"><i id="xpBarra"></i></div>
      <small id="xpReto"></small>
    </div>
    <small id="estMaterial"></small>
    <div class="chips4">
      <button data-est="pagina">🔗 Enlace</button>
      <button data-est="archivo">📁 Archivo</button>
      <button data-est="texto">📝 Pegar</button>
      <button data-est="captura">📸 Foto</button>
    </div>
    <b class="seccion amarillo">Con el material</b>
    <div class="herrs">
      <button data-est="resumen" data-necesita="material"><span>📝</span>Resumen</button>
      <button data-est="esquema" data-necesita="material"><span>🧭</span>Esquema</button>
      <button data-est="conceptos" data-necesita="material"><span>🔑</span>Conceptos</button>
      <button data-est="facil" data-necesita="material"><span>🧒</span>Fácil</button>
      <button data-est="tarjetas" data-necesita="material"><span>🗂️</span>Tarjetas</button>
      <button data-est="test" data-necesita="material"><span>✅</span>Test</button>
      <button data-est="oral" data-necesita="material"><span>🎙️</span>Examen oral</button>
      <button data-est="mapa" data-necesita="material"><span>🧭</span>Mapa mental</button>
      <button data-est="podcast" data-necesita="material"><span>🎧</span>Pódcast</button>
    </div>
    <b class="seccion amarillo">Herramientas</b>
    <div class="herrs">
      <button data-est="repasar"><span>🔁</span>Repasar<small id="estRepasarN"></small></button>
      <button data-est="ejercicio"><span>🧮</span>Ejercicio</button>
      <button data-est="pomodoro"><span>⏱️</span>Pomodoro</button>
      <button data-est="plan"><span>📅</span>Plan examen</button>
      <button data-est="deberes"><span>📋</span>Deberes</button>
      <button data-est="grafica"><span>📈</span>Gráficas</button>
      <button data-est="progreso"><span>📊</span>Progreso</button>
      <button data-est="logros"><span>🏆</span>Logros</button>
      <button data-est="investigar"><span>🔬</span>Investigar</button>
    </div>
    <b class="seccion lila">Textos e IA</b>
    <div class="herrs">
      <button data-est="detector"><span>🕵️</span>Detector IA</button>
      <button data-est="humanizar"><span>✍️</span>Natural</button>
      <button data-px="aprende mi estilo"><span>🖋️</span>Mi estilo</button>
    </div>
    <b class="seccion verde">Hacker</b>
    <div class="herrs">
      <button data-px="cifra un mensaje"><span>🔒</span>Cifrar</button>
      <button data-px="descifra"><span>🔓</span>Descifrar</button>
      <button data-px="genera una contraseña"><span>🔑</span>Clave</button>
      <button data-px="contraseña filtrada"><span>🔐</span>¿Filtrada?</button>
      <button data-px="ficha web"><span>🕵️</span>Ficha web</button>
      <button data-px="máquina del tiempo"><span>🕰️</span>Del pasado</button>
      <button data-px="modo matrix"><span>🟩</span>Matrix</button>
    </div>
    <b class="seccion azul">Voz</b>
    <label class="check"><input type="checkbox" id="live"> Voz natural en tiempo real (Gemini Live)</label>
    <label class="check">Voz:
      <select id="liveVoz">
        <option value="Charon">Charon (grave)</option><option value="Orus">Orus (firme)</option><option value="Fenrir">Fenrir (enérgica)</option>
        <option value="Puck">Puck (alegre)</option><option value="Kore">Kore (femenina, firme)</option><option value="Aoede">Aoede (femenina, suave)</option>
      </select>
    </label>
    <label class="check"><input type="checkbox" id="heyJarvis"> «Hey Jarvis»: llámame sin tocar nada</label>
    <small>Con «Hey Jarvis» la página tiene que estar abierta y en primer plano.</small>
  </section>

  <section class="pxsheet" id="personas" hidden>
    <div class="shead"><b>🎭 Personalidades</b><button class="rclose" id="cerrarPersonas" title="Cerrar">✕</button></div>
    <div class="pgrid" id="personasLista"></div>
    <button class="ajbtn2" id="crearPersona">➕ Crear una personalidad</button>
    <small>Cada una tiene su voz (con la voz natural activada), su color y su forma de ser.</small>
  </section>`;
  while (caja.firstElementChild) appEl.appendChild(caja.firstElementChild);

  // La pieza «Comandos» pasa a ser «Estudio»
  const tile = $("tileMas");
  if (tile) {
    tile.dataset.cmd = "modo estudio";
    tile.style.setProperty("--c", "#ffb547");
    tile.querySelector(".ic").innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l10-4 10 4-10 4z"/><path d="M6 9v5c0 1.7 2.7 3 6 3s6-1.3 6-3V9"/><path d="M22 7v6"/></svg>';
    tile.querySelector("b").textContent = "Estudio";
    const sm = tile.querySelector("small"); if (sm) sm.textContent = "Y mucho más";
  }
})();


// ======== lectores.js ========
// Lectores de archivos: Word (.docx), Excel (.xlsx), texto y base64. Los usan la extensión y la web.

const EXT_TEXTO = /\.(txt|md|csv|json|log|xml|html?|css|js|py|ini|yml|yaml)$/i;

async function leerZip(file, quiere) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error("El archivo está dañado.");
  const total = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  const res = {};
  for (let k = 0; k < total; k++) {
    const metodo = dv.getUint16(p + 10, true), comp = dv.getUint32(p + 20, true);
    const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const nombre = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + ln));
    if (quiere.test(nombre)) {
      const ini = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
      const datos = buf.subarray(ini, ini + comp);
      res[nombre] = metodo === 0 ? new TextDecoder().decode(datos)
        : await new Response(new Blob([datos]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
    }
    p += 46 + ln + le + lc;
  }
  return res;
}
const desXml = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
async function textoDeDocx(f) {
  const z = await leerZip(f, /^word\/document\.xml$/);
  const xml = z["word/document.xml"] || "";
  return desXml(xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, "\t").replace(/<[^>]+>/g, ""));
}
async function textoDeXlsx(f) {
  const z = await leerZip(f, /^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/);
  const comp = [...(z["xl/sharedStrings.xml"] || "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => desXml(m[1].replace(/<[^>]+>/g, "")));
  const hojas = Object.keys(z).filter((k) => /sheet\d+/.test(k)).sort();
  return hojas.map((k, i) => "Hoja " + (i + 1) + ":\n" + [...z[k].matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) =>
    [...r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((c) => {
      const cuerpo = c[2] || "";
      const v = (cuerpo.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || "";
      const tx = [...cuerpo.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join("");
      if (/t="s"/.test(c[1])) return comp[+v] ?? "";
      return desXml(tx || v);
    }).join(" | ")).join("\n")).join("\n\n");
}
const aBase64 = (f) => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = () => mal(r.error); r.readAsDataURL(f); });



// ======== despertar.js ========
// «Hey Jarvis» de verdad: openWakeWord (Apache-2.0) funcionando dentro del navegador con ONNX Runtime Web (MIT).
// Escucha el micro en trozos de 80 ms y calcula la probabilidad de que hayas dicho «hey Jarvis».

class DetectorPalabra {
  constructor(base, modelo) {
    this.base = base;           // carpeta donde están ort/ y modelos/
    this.modelo = modelo;       // archivo del modelo de la palabra
    this.listo = false;
  }

  async cargar() {
    ort.env.wasm.wasmPaths = this.base + "ort/";
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const op = { executionProviders: ["wasm"] };
    const [mel, emb, ww] = await Promise.all([
      ort.InferenceSession.create(this.base + "modelos/melspectrogram.onnx", op),
      ort.InferenceSession.create(this.base + "modelos/embedding_model.onnx", op),
      ort.InferenceSession.create(this.base + "modelos/" + this.modelo, op)
    ]);
    this.mel = mel; this.emb = emb; this.ww = ww;
    this.reiniciar();
    this.listo = true;
  }

  reiniciar() {
    this.crudo = new Float32Array(0);                                  // últimas muestras (con margen)
    this.melBuf = Array.from({ length: 76 }, () => new Float32Array(32).fill(1));
    this.feat = [];                                                      // embeddings de 96 valores
    this.trozos = 0;
  }

  // Recibe 1280 muestras (80 ms a 16 kHz) en escala de int16 y devuelve la puntuación (0 a 1).
  async procesar(trozo) {
    const margen = 160 * 3;
    const juntos = new Float32Array(this.crudo.length + trozo.length);
    juntos.set(this.crudo); juntos.set(trozo, this.crudo.length);
    this.crudo = juntos.slice(-(1280 + margen));
    const x = juntos.slice(-(trozo.length + margen));

    // 1) Espectrograma mel
    const rm = await this.mel.run({ [this.mel.inputNames[0]]: new ort.Tensor("float32", x, [1, x.length]) });
    const spec = rm[this.mel.outputNames[0]];
    const marcos = spec.dims[spec.dims.length - 2];
    for (let f = 0; f < marcos; f++) {
      const fila = new Float32Array(32);
      for (let k = 0; k < 32; k++) fila[k] = spec.data[f * 32 + k] / 10 + 2;
      this.melBuf.push(fila);
    }
    if (this.melBuf.length > 970) this.melBuf.splice(0, this.melBuf.length - 970);

    // 2) Huella de audio (embedding) con los últimos 76 marcos
    const ventana = new Float32Array(76 * 32);
    const ult = this.melBuf.slice(-76);
    ult.forEach((fila, i) => ventana.set(fila, i * 32));
    const re = await this.emb.run({ [this.emb.inputNames[0]]: new ort.Tensor("float32", ventana, [1, 76, 32, 1]) });
    this.feat.push(Float32Array.from(re[this.emb.outputNames[0]].data));
    if (this.feat.length > 120) this.feat.shift();

    // 3) ¿Has dicho la palabra? (necesita 16 huellas seguidas)
    this.trozos++;
    if (this.feat.length < 16 || this.trozos <= 5) return 0;
    const f16 = new Float32Array(16 * 96);
    this.feat.slice(-16).forEach((e, i) => f16.set(e, i * 96));
    const rw = await this.ww.run({ [this.ww.inputNames[0]]: new ort.Tensor("float32", f16, [1, 16, 96]) });
    return rw[this.ww.outputNames[0]].data[0];
  }
}


// ======== live.js ========
// Voz en tiempo real con Gemini Live: hablas normal, te contesta con voz natural y puedes interrumpirle.
// Mientras habla puede usar todas las herramientas de Jarvis.

const LIVE_MODELOS = ["gemini-3.8-live", "gemini-3.1-flash-live-preview", "gemini-2.5-flash-native-audio-preview-12-2025", "gemini-2.5-flash-native-audio-preview-09-2025"];
const LIVE = { ws: null, activo: false, conectando: false, quiere: false, voz: "Charon", ctxSalida: null, siguiente: 0, fuentes: [], ultimaActividad: 0, timer: null, textoYo: "", textoJarvis: "", turnoNuevoYo: true, turnoNuevoJarvis: true, despedida: false };
function liveQuiere() { return LIVE.quiere; }
function liveActivo() { return LIVE.activo || LIVE.conectando; }

chrome.storage.local.get(["live", "liveVoz"]).then(({ live, liveVoz }) => {
  LIVE.quiere = !!live;
  LIVE.voz = liveVoz || "Charon";
  $("live").checked = LIVE.quiere;
  $("liveVoz").value = LIVE.voz;
});
$("live").addEventListener("change", () => { LIVE.quiere = $("live").checked; chrome.storage.local.set({ live: LIVE.quiere }); if (!LIVE.quiere) pararLive(); });
$("liveVoz").addEventListener("change", () => { LIVE.voz = $("liveVoz").value; chrome.storage.local.set({ liveVoz: LIVE.voz, liveCombo: null }); });

const HERRAMIENTAS_LIVE = [
  {
    functionDeclarations: [
      {
        name: "orden_jarvis",
        description: "Ejecuta una acción en el Chrome del usuario con las herramientas de Jarvis: abrir webs o buscar en Google, cambiar o cerrar pestañas, resumir, escanear, rayos X o HUD de la página, bajar, subir, hacer clic en algo, quitar anuncios, modo oscuro, leer la página en voz alta, buscar, abrir o resumir archivos del usuario, ver sus descargas, apuntar en su calendario, recordar datos, guardar la página, modo sigilo, radar, ficha del dominio, generar contraseñas, Matrix, y todo lo de estudio (hazme un test, hazme tarjetas, repasar tarjetas, resumen o esquema para estudiar, pomodoro, modo foco, explícame este ejercicio, tengo examen de X el día Y, mi progreso), investigación profunda («investiga …») o cambiar de personalidad («cambia a profe»), deberes («tengo que entregar X el jueves», «mis deberes»), mapa mental, pódcast del tema, gráficas («dibuja y = x^2 - 4»), detector de IA y reescritura natural, nivel y logros… Pasa la orden en español como la diría el usuario. Ejemplos: 'abre youtube', 'búscame el presupuesto de la cocina', 'apunta el viernes a las 5 dentista', 'escanea esta web'.",
        parameters: { type: "OBJECT", properties: { orden: { type: "STRING", description: "La orden en español" } }, required: ["orden"] }
      },
      ...(!ES_EXT ? [] : [{
        name: "leer_pagina",
        description: "Devuelve el título, la dirección y el texto de la página que el usuario tiene abierta, para responder preguntas sobre ella."
      },
      {
        name: "tarea_web",
        description: "Encarga al modo agente una tarea de varios pasos en el navegador: navegar por webs, buscar, comparar precios, rellenar formularios. Úsala cuando haga falta más de un clic o varias páginas. Tarda un poco; avisa al usuario antes. Devuelve el resultado.",
        parameters: { type: "OBJECT", properties: { tarea: { type: "STRING", description: "La tarea explicada con detalle" } }, required: ["tarea"] }
      }]),
      {
        name: "terminar_conversacion",
        description: "Termina la conversación de voz cuando el usuario se despide o dice que ya no necesita nada."
      }
    ]
  },
  { googleSearch: {} }
];

function instruccionLive() {
  const p = typeof personaTexto === "function" ? personaTexto() : "Eres Jarvis, el asistente personal del usuario. Hablas en español de España. ";
  return p + "Es una conversación de voz: frases cortas y naturales. " +
    "Usa orden_jarvis para cualquier acción (" + (ES_EXT ? "en su navegador, " : "") + "sus archivos, su calendario, su memoria, estudio, deberes…); " +
    (ES_EXT ? "leer_pagina para preguntas sobre la página abierta; tarea_web para tareas de varios pasos en webs; " : "") +
    "y la búsqueda de Google para datos actuales como resultados, noticias o precios. " +
    "Antes de una acción que tarda, di algo breve como «Ahora mismo». Después, resume el resultado en una o dos frases. " +
    "Si se despide, despídete en una frase y llama a terminar_conversacion. " +
    (typeof contextoPersonal === "function" ? contextoPersonal() : "") +
    (LIVE.contextoExtra ? "\n\n" + LIVE.contextoExtra : "");
}

function setupLive(c) {
  const voz = { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE.voz } } };
  const comun = {
    model: "models/" + c.m,
    systemInstruction: { parts: [{ text: instruccionLive() }] },
    tools: HERRAMIENTAS_LIVE,
    inputAudioTranscription: {},
    outputAudioTranscription: {}
  };
  // Dos formatos de configuración: el clásico y el de la documentación nueva
  if (c.f === "clasico") comun.generationConfig = { responseModalities: ["AUDIO"], speechConfig: voz };
  else { comun.responseModalities = ["AUDIO"]; comun.speechConfig = voz; }
  return { setup: comun };
}

async function leerMsg(ev) {
  const d = typeof ev.data === "string" ? ev.data : await ev.data.text();
  try { return JSON.parse(d); } catch (e) { return {}; }
}

function intentarLive(clave, c) {
  return new Promise((ok, mal) => {
    const ws = new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=" + encodeURIComponent(clave));
    const t = setTimeout(() => { try { ws.close(); } catch (e) {} mal(new Error("no responde")); }, 9000);
    ws.onopen = () => ws.send(JSON.stringify(setupLive(c)));
    ws.onmessage = async (ev) => {
      const m = await leerMsg(ev);
      if (m.setupComplete) { clearTimeout(t); ws.onmessage = null; ws.onclose = null; ok(ws); }
    };
    ws.onclose = (ev) => { clearTimeout(t); mal(new Error(ev.reason || "cerrado (" + ev.code + ")")); };
    ws.onerror = () => {};
  });
}

async function conectarLive(clave) {
  const { liveCombo } = await chrome.storage.local.get("liveCombo");
  const combos = [];
  if (liveCombo) combos.push(liveCombo);
  for (const m of LIVE_MODELOS) for (const f of ["clasico", "nuevo"]) combos.push({ m, f });
  let ultimo = "";
  for (const c of combos) {
    try {
      const ws = await intentarLive(clave, c);
      chrome.storage.local.set({ liveCombo: c });
      return ws;
    } catch (e) {
      ultimo = e.message;
      if (/api key|api_key|permission|not valid|invalid.*key/i.test(ultimo)) break;
    }
  }
  throw new Error("No he podido conectar la voz en tiempo real: " + ultimo);
}

async function iniciarLive() {
  if (LIVE.activo || LIVE.conectando) return;
  const clave = await getClave();
  if (!clave) { $("ajustes").hidden = false; fallo(new Error("Falta la clave de Gemini.")); return; }
  LIVE.conectando = true;
  speechSynthesis.cancel();
  estado("thinking");
  $("transcript").textContent = "Conectando la voz…";
  try {
    try { await micEncender(); }
    catch (e) {
      LIVE.conectando = false;
      estado("idle");
      if (e.name === "NotAllowedError" || e.name === "SecurityError") { pedirPermisoMicro(); return; }
      throw e;
    }
    const ws = await conectarLive(clave);
    LIVE.ws = ws;
    LIVE.activo = true;
    LIVE.conectando = false;
    LIVE.despedida = false;
    LIVE.ultimaActividad = Date.now();
    LIVE.turnoNuevoYo = LIVE.turnoNuevoJarvis = true;
    ws.onmessage = (ev) => leerMsg(ev).then(mensajeLive);
    ws.onclose = (ev) => {
      if (!LIVE.activo) return;
      pararLive();
      if (ev.code !== 1000 && ev.reason) $("transcript").textContent = "Voz desconectada: " + ev.reason;
    };
    MIC.oyentes.add(enviarAudioLive);
    estado("listening");
    $("transcript").textContent = "Te escucho… habla con normalidad.";
    clearInterval(LIVE.timer);
    LIVE.timer = setInterval(() => {
      // Si nadie habla en 30 segundos, cuelga para no gastar
      if (Date.now() - LIVE.ultimaActividad > 30000 && !liveHablando()) pararLive();
    }, 2000);
  } catch (e) {
    LIVE.conectando = false;
    LIVE.activo = false;
    estado("idle");
    micApagarSiNadie();
    fallo(e);
  }
}

function pararLive() {
  const ws = LIVE.ws;
  LIVE.activo = false;
  LIVE.conectando = false;
  LIVE.ws = null;
  clearInterval(LIVE.timer);
  MIC.oyentes.delete(enviarAudioLive);
  if (ws) { ws.onclose = null; try { ws.close(1000); } catch (e) {} }
  cortarAudio();
  micApagarSiNadie();
  // Si era un examen oral, vuelve la personalidad de antes
  if (LIVE.contextoExtra || LIVE.personaPrevia) {
    LIVE.contextoExtra = "";
    if (LIVE.personaPrevia && typeof ponerPersona === "function") { const p = LIVE.personaPrevia; LIVE.personaPrevia = null; ponerPersona(p, false); }
  }
  estado("idle");
  if (/^Te escucho/.test($("transcript").textContent)) $("transcript").textContent = "Conversación terminada.";
}

function enviarAudioLive(trozo) {
  if (!LIVE.ws || LIVE.ws.readyState !== 1) return;
  const i16 = new Int16Array(trozo.length);
  for (let i = 0; i < trozo.length; i++) i16[i] = trozo[i];
  const b = new Uint8Array(i16.buffer);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  LIVE.ws.send(JSON.stringify({ realtimeInput: { audio: { data: btoa(s), mimeType: "audio/pcm;rate=16000" } } }));
}

// ---------- Audio de Jarvis (24 kHz) ----------
function liveHablando() { return !!(LIVE.ctxSalida && LIVE.siguiente > LIVE.ctxSalida.currentTime + 0.05); }
function reproducir(b64) {
  if (!LIVE.ctxSalida) LIVE.ctxSalida = new AudioContext({ sampleRate: 24000 });
  const bin = atob(b64);
  const n = bin.length >> 1;
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    if (v >= 32768) v -= 65536;
    f[i] = v / 32768;
  }
  const buf = LIVE.ctxSalida.createBuffer(1, n, 24000);
  buf.copyToChannel(f, 0);
  const src = LIVE.ctxSalida.createBufferSource();
  src.buffer = buf;
  src.connect(LIVE.ctxSalida.destination);
  LIVE.siguiente = Math.max(LIVE.siguiente, LIVE.ctxSalida.currentTime + 0.04);
  src.start(LIVE.siguiente);
  LIVE.siguiente += buf.duration;
  LIVE.fuentes.push(src);
  src.onended = () => {
    LIVE.fuentes = LIVE.fuentes.filter((x) => x !== src);
    if (!LIVE.fuentes.length) {
      if (LIVE.despedida) pararLive();
      else if (LIVE.activo) estado("listening");
    }
  };
  if (!app.classList.contains("speaking")) estado("speaking");
}
function cortarAudio() {
  LIVE.fuentes.forEach((s) => { try { s.onended = null; s.stop(); } catch (e) {} });
  LIVE.fuentes = [];
  if (LIVE.ctxSalida) LIVE.siguiente = LIVE.ctxSalida.currentTime;
}

// ---------- Mensajes del servidor ----------
function mensajeLive(m) {
  if (m.serverContent) {
    const sc = m.serverContent;
    LIVE.ultimaActividad = Date.now();
    if (sc.interrupted) { cortarAudio(); if (LIVE.activo) estado("listening"); }
    for (const p of (sc.modelTurn && sc.modelTurn.parts) || []) {
      if (p.inlineData && p.inlineData.data) reproducir(p.inlineData.data);
    }
    if (sc.inputTranscription && sc.inputTranscription.text) {
      if (LIVE.turnoNuevoYo) { LIVE.textoYo = ""; LIVE.turnoNuevoYo = false; }
      LIVE.textoYo += sc.inputTranscription.text;
      $("transcript").textContent = LIVE.textoYo.trim();
    }
    if (sc.outputTranscription && sc.outputTranscription.text) {
      if (LIVE.turnoNuevoJarvis) { LIVE.textoJarvis = ""; LIVE.turnoNuevoJarvis = false; }
      LIVE.textoJarvis += sc.outputTranscription.text;
      $("rtitle").textContent = "🎙️ Jarvis";
      $("rtext").textContent = LIVE.textoJarvis.trim();
      $("rfoot").hidden = true;
      $("reply").classList.remove("error");
      $("reply").hidden = false;
    }
    if (sc.turnComplete || sc.generationComplete) { LIVE.turnoNuevoYo = true; LIVE.turnoNuevoJarvis = true; }
  }
  if (m.toolCall) atenderHerramientas(m.toolCall);
}

async function ejecutarOrdenCapturada(orden) {
  window.capturaDecir = [];
  try {
    const t = String(orden || "").trim();
    const hecho = await ordenPersona(t) || await ordenNuevas(t) || await ordenAgente(t) || await ordenInvestigar(t) || await ordenEstudio(t) || await ordenArchivos(t) || await ordenLocal(t) ||
      await ordenExtra(t) || await ordenHacker(t) || await ordenDatos(t);
    const salida = window.capturaDecir.join("\n\n");
    if (!hecho) return { hecho: false, nota: "No es una orden de Jarvis. Responde tú directamente o usa otra herramienta." };
    return { hecho: true, resultado: (salida || "Hecho.").slice(0, 4000) };
  } finally {
    window.capturaDecir = null;
  }
}

async function atenderHerramientas(tc) {
  const respuestas = [];
  for (const fc of tc.functionCalls || []) {
    let result;
    try {
      const a = fc.args || {};
      if (fc.name === "orden_jarvis") result = await ejecutarOrdenCapturada(a.orden);
      else if (fc.name === "leer_pagina") { const p = await leerPagina(); result = { titulo: p.titulo, url: p.url, seleccion: p.seleccion, texto: p.texto.slice(0, 6000) }; }
      else if (fc.name === "tarea_web") result = { resultado: await ejecutarAgente(a.tarea || "") };
      else if (fc.name === "terminar_conversacion") { LIVE.despedida = true; result = { ok: true }; if (!liveHablando()) setTimeout(() => { if (!liveHablando()) pararLive(); }, 2500); }
      else result = { error: "Herramienta desconocida" };
    } catch (e) {
      result = { error: e.message };
    }
    respuestas.push({ id: fc.id, name: fc.name, response: { result } });
  }
  LIVE.ultimaActividad = Date.now();
  if (LIVE.ws && LIVE.ws.readyState === 1) LIVE.ws.send(JSON.stringify({ toolResponse: { functionResponses: respuestas } }));
}


// ======== personalidades.js ========
// Personalidades: cada una con su nombre, su voz (Gemini Live), su color de orbe y su forma de ser.

const PERSONAS_BASE = {
  jarvis: { nombre: "Jarvis", emoji: "🤵", voz: "Charon", a: "#5ee7ff", b: "#8b7bff",
    caracter: "Eres Jarvis, el mayordomo digital del usuario al estilo del Jarvis de Iron Man: listo, elegante, rápido y con un humor británico sutil." },
  profe: { nombre: "Profe", emoji: "👩‍🏫", voz: "Kore", a: "#ffd166", b: "#ff9f43",
    caracter: "Eres un profesor particular paciente y muy claro. Explicas paso a paso, con ejemplos de la vida real y comparaciones fáciles. Después de explicar algo importante, haces una pregunta corta para comprobar que se ha entendido. En los ejercicios nunca das la solución de golpe: guías con pistas." },
  examinador: { nombre: "Examinador", emoji: "📝", voz: "Orus", a: "#ff5e8a", b: "#ff9f43",
    caracter: "Eres un examinador exigente pero justo. Haces preguntas de examen de una en una, esperas la respuesta, la corriges con una nota del 0 al 10, explicas qué faltaba y pasas a la siguiente." },
  investigador: { nombre: "Investigador", emoji: "🔬", voz: "Fenrir", a: "#3ddc97", b: "#5ee7ff",
    caracter: "Eres un investigador riguroso. Das datos concretos, dices de dónde salen, distingues hechos de opiniones y avisas cuando algo no está claro." },
  coach: { nombre: "Coach", emoji: "💪", voz: "Fenrir", a: "#ff8a5e", b: "#ffd166",
    caracter: "Eres un entrenador personal motivador y directo. Hablas con energía y frases cortas, ayudas con el gym, la constancia y los hábitos, y no aceptas excusas (con cariño)." },
  colega: { nombre: "Colega", emoji: "😎", voz: "Puck", a: "#a3ff5e", b: "#5ee7ff",
    caracter: "Eres un colega de confianza: hablas de tú, informal y con humor, como un amigo listo, pero siempre das información correcta." },
  teacher: { nombre: "Teacher", emoji: "🇬🇧", voz: "Aoede", a: "#8b7bff", b: "#ff5e8a",
    caracter: "Eres un profesor nativo de inglés. Hablas sobre todo en inglés sencillo para que el alumno practique. Si comete errores, los corriges con amabilidad y explicas la corrección en español. Propones frases y preguntas para seguir practicando.", idiomaLibre: true }
};

const PERS = { actual: "jarvis", propias: {}, voces: {} };

function todasPersonas() { return Object.assign({}, PERSONAS_BASE, PERS.propias); }
function personaActual() {
  const p = todasPersonas()[PERS.actual] || PERSONAS_BASE.jarvis;
  return Object.assign({}, p, { voz: PERS.voces[PERS.actual] || p.voz });
}
// Texto que se pone al principio de cada instrucción a la IA
function personaTexto() {
  const p = personaActual();
  return p.caracter + " Te llamas " + p.nombre + ". " +
    (p.idiomaLibre ? "" : "Respondes siempre en español de España. ");
}

function aplicarPersona() {
  const p = personaActual();
  orb.setBase(p.a, p.b);
  $("personaBtn").textContent = p.emoji + " " + p.nombre;
  $("personaBtn").title = "Personalidad: " + p.nombre;
  if (typeof LIVE !== "undefined") {
    LIVE.voz = p.voz;
    if ($("liveVoz")) $("liveVoz").value = p.voz;
  }
}

async function ponerPersona(id, avisar = true) {
  if (!todasPersonas()[id]) return false;
  const cambia = id !== PERS.actual;
  PERS.actual = id;
  await chrome.storage.local.set({ persona: id, liveCombo: null });
  aplicarPersona();
  pintarPersonas();
  // Si hay una conversación de voz, se reinicia con la nueva personalidad
  if (cambia && typeof liveActivo === "function" && liveActivo()) { pararLive(); setTimeout(iniciarLive, 400); }
  if (avisar) {
    const p = personaActual();
    orb.setTinte(p.a, 1500);
    decir(p.emoji + " " + p.nombre, "Ahora soy " + p.nombre + ".", { voz: "Hola, soy " + p.nombre + "." });
  }
  return true;
}

// ---------- Ventana de personalidades ----------
function pintarPersonas() {
  const caja = $("personasLista");
  caja.innerHTML = "";
  for (const [id, p] of Object.entries(todasPersonas())) {
    const b = document.createElement("button");
    b.className = "pcard" + (id === PERS.actual ? " activa" : "");
    b.style.setProperty("--c1", p.a);
    b.style.setProperty("--c2", p.b);
    b.innerHTML = '<span class="pe"></span><b></b><small></small>';
    b.querySelector(".pe").textContent = p.emoji;
    b.querySelector("b").textContent = p.nombre;
    b.querySelector("small").textContent = (PERS.voces[id] || p.voz);
    b.addEventListener("click", () => { ponerPersona(id); $("personas").hidden = true; });
    if (PERS.propias[id]) {
      const x = document.createElement("span");
      x.className = "pborrar";
      x.textContent = "✕";
      x.title = "Borrar";
      x.addEventListener("click", async (e) => {
        e.stopPropagation();
        delete PERS.propias[id];
        await chrome.storage.local.set({ personasPropias: PERS.propias });
        if (PERS.actual === id) await ponerPersona("jarvis", false);
        pintarPersonas();
      });
      b.appendChild(x);
    }
    caja.appendChild(b);
  }
}

$("personaBtn").addEventListener("click", () => {
  pintarPersonas();
  $("personas").hidden = !$("personas").hidden;
  ["ajustes", "herramientas", "estudio"].forEach((s) => { if ($(s)) $(s).hidden = true; });
});
$("cerrarPersonas").addEventListener("click", () => { $("personas").hidden = true; });
$("crearPersona").addEventListener("click", () => {
  $("personas").hidden = true;
  decir("🎭 Nueva personalidad", "Inventa tu asistente: nombre, emoji, voz y cómo quieres que sea.", {
    voz: false,
    campos: [
      { id: "nombre", ph: "Nombre (ej.: Sargento)" },
      { id: "emoji", ph: "Emoji (ej.: 🪖)" },
      { id: "voz", ph: "Voz: Charon, Orus, Fenrir, Puck, Kore o Aoede" },
      { id: "color", ph: "Color en inglés o #código (ej.: orange, #ff0000)" },
      { id: "caracter", tipo: "area", ph: "Cómo es y cómo habla (ej.: Eres un sargento que me ayuda a estudiar sin excusas…)" }
    ],
    enviar: {
      t: "Crear",
      f: async (v) => {
        if (!v.nombre || !v.caracter) throw new Error("Pon al menos el nombre y cómo es.");
        const voces = ["Charon", "Orus", "Fenrir", "Puck", "Kore", "Aoede"];
        const voz = voces.find((x) => x.toLowerCase() === (v.voz || "").trim().toLowerCase()) || "Charon";
        const c = document.createElement("canvas").getContext("2d");
        c.fillStyle = "#5ee7ff";
        c.fillStyle = (v.color || "").trim() || "#5ee7ff";
        const a = c.fillStyle.startsWith("#") ? c.fillStyle : "#5ee7ff";
        const id = "p" + Date.now().toString(36);
        PERS.propias[id] = {
          nombre: v.nombre.trim().slice(0, 20), emoji: (v.emoji || "🤖").trim().slice(0, 4), voz, a, b: "#8b7bff",
          caracter: "Eres " + v.nombre.trim() + ". " + v.caracter.trim()
        };
        await chrome.storage.local.set({ personasPropias: PERS.propias });
        await ponerPersona(id);
      }
    }
  });
});

// ---------- Órdenes por voz ----------
async function ordenPersona(texto) {
  const t = sinTildes(texto.trim());
  if (/^(personalidades|cambia(r)? de personalidad|mis personalidades)$/.test(t)) { pintarPersonas(); $("personas").hidden = false; return true; }
  const m = t.match(/^(?:cambia(?:te)?(?: a| al)?|pon(?:me)?(?: a| al)?|quiero (?:hablar con|a|al)|personalidad|modo)\s+(?:el |la )?(.+)$/);
  if (!m) return false;
  const buscado = m[1].trim();
  for (const [id, p] of Object.entries(todasPersonas())) {
    if (sinTildes(p.nombre) === buscado || id === buscado) { await ponerPersona(id); return true; }
  }
  return false;
}

// ---------- Inicio ----------
chrome.storage.local.get(["persona", "personasPropias", "vocesPersona"]).then((g) => {
  PERS.propias = g.personasPropias || {};
  PERS.voces = g.vocesPersona || {};
  PERS.actual = todasPersonas()[g.persona] ? g.persona : "jarvis";
  aplicarPersona();
});
// Cambiar la voz en Ajustes cambia la voz de la personalidad actual
$("liveVoz").addEventListener("change", () => {
  PERS.voces[PERS.actual] = $("liveVoz").value;
  chrome.storage.local.set({ vocesPersona: PERS.voces });
});


// ======== estudio.js ========
// 📚 Modo estudio: material (página, archivo, texto o captura) → resumen, esquema, tarjetas, test, examen oral…
// También: ejercicios guiados con pistas, pomodoro con bloqueo de distracciones, plan de exámenes y progreso.

const EST = { material: null, mazos: [], progreso: [], pomodoro: null };
const hoyISO = () => fechaISO(new Date());
const sumarDiasISO = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return fechaISO(d); };
const INTERVALOS = [0, 1, 2, 4, 8, 16, 32]; // días entre repasos según la caja (sistema Leitner)

chrome.storage.local.get(["mazos", "progresoEstudio"]).then((g) => {
  EST.mazos = Array.isArray(g.mazos) ? g.mazos : [];
  EST.progreso = Array.isArray(g.progresoEstudio) ? g.progresoEstudio : [];
  pintarEstudio();
});
const guardarMazos = () => chrome.storage.local.set({ mazos: EST.mazos });
const guardarProgreso = () => chrome.storage.local.set({ progresoEstudio: EST.progreso.slice(-500) });
function apuntarProgreso(tipo, datos) {
  EST.progreso.push(Object.assign({ tipo, fecha: hoyISO(), ts: Date.now(), asignatura: EST.material ? EST.material.asignatura : "" }, datos));
  guardarProgreso();
  if (typeof ganarXP === "function") ganarXP(tipo, datos || {});
}

// ---------- Ventana ----------
function abrirEstudio() {
  pintarEstudio();
  if (typeof pintarXP === "function") pintarXP();
  $("estudio").hidden = false;
  ["ajustes", "herramientas", "personas"].forEach((s) => { if ($(s)) $(s).hidden = true; });
}
function pendientesHoy() {
  const hoy = hoyISO();
  let n = 0;
  EST.mazos.forEach((m) => m.tarjetas.forEach((t) => { if (t.proxima <= hoy) n++; }));
  return n;
}
function pintarEstudio() {
  if (!$("estMaterial")) return;
  $("estMaterial").textContent = EST.material
    ? "📖 " + EST.material.titulo + (EST.material.asignatura ? " · " + EST.material.asignatura : "") + " (" + (EST.material.texto.length >= 1000 ? Math.round(EST.material.texto.length / 1000) + " mil" : EST.material.texto.length) + " letras)"
    : "Aún no hay material. Elige de dónde estudiar 👇";
  const n = pendientesHoy();
  $("estRepasarN").textContent = n ? n + " hoy" : "al día";
  document.querySelectorAll("[data-est]").forEach((b) => { b.disabled = !EST.material && b.dataset.necesita === "material"; });
}
$("cerrarEstudio").addEventListener("click", () => { $("estudio").hidden = true; });

// ---------- Material ----------
async function textoDeContenido(titulo, partes) {
  $("transcript").textContent = "Leyendo " + titulo + "…";
  return gemini("Transcribe todo el contenido de este material de estudio en texto plano, ordenado y completo (títulos, apartados, fórmulas y datos). No resumas.", "", { partes });
}
async function ponerMaterial(titulo, texto, origen) {
  texto = String(texto || "").trim();
  if (texto.length < 40) throw new Error("Ese material tiene muy poco texto para estudiar.");
  // La asignatura la deduce la IA en segundo plano
  EST.material = { titulo: titulo.slice(0, 80), texto: texto.slice(0, 60000), origen, asignatura: "" };
  pintarEstudio();
  gemini("¿De qué asignatura escolar o universitaria es este texto? Responde solo con el nombre de la asignatura en una o dos palabras.", texto.slice(0, 3000), { silencioso: true })
    .then((a) => { if (EST.material) { EST.material.asignatura = a.replace(/[.\n]/g, "").trim().slice(0, 30); pintarEstudio(); } }).catch(() => {});
  orb.setTinte("#ffd166", 1500);
  decir("📚 Material listo", "«" + EST.material.titulo + "»\n\n¿Qué hacemos? Elige abajo o dime «hazme un test», «resúmelo», «hazme tarjetas», «pregúntame»…", {
    voz: "Material listo. ¿Qué hacemos?",
    botones: accionesRapidas()
  });
}
function accionesRapidas() {
  return [
    { t: "📝 Resumen", f: () => estudiar("resumen") },
    { t: "🗂️ Tarjetas", f: () => crearTarjetas() },
    { t: "✅ Test", f: () => crearTest() },
    { t: "🎙️ Examen oral", f: () => examenOral() }
  ];
}

async function materialDePagina() {
  const p = await leerPagina();
  const t = await enPagina(() => ((document.querySelector("article") || document.querySelector("main") || document.body).innerText || "").slice(0, 60000));
  await ponerMaterial(p.titulo || "Esta página", p.seleccion && p.seleccion.length > 200 ? p.seleccion : t, "pagina");
}
async function materialDeCaptura() {
  const tab = await pestanaActual();
  let img;
  try { img = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 85 }); }
  catch (e) { throw new Error("No puedo hacer captura de esta pestaña. Prueba en otra web o en un PDF abierto en Chrome."); }
  const partes = [{ inline_data: { mime_type: "image/jpeg", data: img.split(",")[1] } }];
  await ponerMaterial("Captura de " + (tab.title || "pantalla"), await textoDeContenido("la captura", partes), "captura");
}
function materialDeTexto() {
  decir("📝 Pegar apuntes", "Pega aquí el texto que quieres estudiar.", {
    voz: false,
    campos: [{ id: "titulo", ph: "Título (ej.: Tema 4 – La célula)" }, { id: "texto", tipo: "area", ph: "Pega tus apuntes…" }],
    enviar: { t: "Usar este texto", f: (v) => ponerMaterial(v.titulo || "Mis apuntes", v.texto, "texto") }
  });
}
function materialDeArchivo() {
  decir("📁 Estudiar de un archivo", "¿Qué archivo? Escribe palabras de su nombre (PDF, Word, fotos de apuntes…).", {
    voz: false,
    campos: [{ id: "q", ph: "Ej.: tema 4 biología" }],
    enviar: {
      t: "Buscar",
      f: async (v) => {
        const lista = await buscarArchivos("busca el archivo " + v.q);
        if (!lista || !lista.length) return;
        const archivos = lista.filter((x) => !x.carpeta).slice(0, 6);
        decir("📁 Elige el archivo", archivos.map((x) => "• " + x.nombre).join("\n"), {
          voz: false,
          botones: archivos.map((x) => ({ t: x.nombre.length > 28 ? x.nombre.slice(0, 28) + "…" : x.nombre, f: () => materialDeArchivoElegido(x) }))
        });
      }
    }
  });
}
async function materialDeArchivoElegido(x) {
  const f = await x.h.getFile();
  if (f.size > 18 * 1048576) throw new Error("El archivo es demasiado grande (máximo 18 MB).");
  let texto = "";
  if (/\.pdf$/i.test(x.nombre)) texto = await textoDeContenido(x.nombre, [{ inline_data: { mime_type: "application/pdf", data: await aBase64(f) } }]);
  else if (/\.(jpe?g|png|webp|heic)$/i.test(x.nombre)) texto = await textoDeContenido(x.nombre, [{ inline_data: { mime_type: f.type || "image/jpeg", data: await aBase64(f) } }]);
  else if (/\.docx$/i.test(x.nombre)) texto = await textoDeDocx(f);
  else if (/\.xlsx$/i.test(x.nombre)) texto = await textoDeXlsx(f);
  else if (EXT_TEXTO.test(x.nombre)) texto = await f.text();
  else throw new Error("No sé leer ese tipo de archivo. Usa PDF, Word, fotos o texto.");
  await ponerMaterial(x.nombre.replace(/\.[^.]+$/, ""), texto, "archivo");
}
function necesitoMaterial() {
  if (EST.material) return true;
  abrirEstudio();
  decir("📚 Primero el material", "Elige de dónde estudiar: esta página, un archivo, texto pegado o una captura.", { voz: "Primero dime de dónde estudiamos." });
  return false;
}

// ---------- Resumen, esquema, conceptos, explicación ----------
const PEDIDOS = {
  resumen: ["📝 Resumen", "Haz un resumen para estudiar este material: lo esencial, bien ordenado por apartados, con los datos y definiciones que caen en examen. Texto plano: títulos en MAYÚSCULAS y puntos con «•»."],
  esquema: ["🧭 Esquema", "Haz un esquema jerárquico de este material para estudiar. Texto plano con sangrías: «1.», «   •», «      -». Breve en cada línea."],
  conceptos: ["🔑 Conceptos clave", "Lista los conceptos clave de este material con una definición de una línea cada uno, en formato «• Concepto: definición». Añade al final 3 fechas, fórmulas o datos que haya que memorizar, si los hay."],
  facil: ["🧒 Explicado fácil", "Explícame este material como si tuviera 12 años, con ejemplos de la vida real y comparaciones divertidas. Corto y claro."]
};
async function estudiar(tipo) {
  if (!necesitoMaterial()) return;
  const [titulo, instr] = PEDIDOS[tipo];
  $("estudio").hidden = true;
  $("transcript").textContent = titulo.slice(3) + "…";
  const r = await gemini(instr, "Material «" + EST.material.titulo + "»:\n" + EST.material.texto);
  apuntarProgreso(tipo, {});
  decir(titulo + " · " + EST.material.titulo, r, {
    voz: tipo === "facil" ? r : "Aquí lo tienes.",
    botones: [{ t: "📋 Copiar", f: () => copiar(r, "Texto") }, { t: "🗂️ Tarjetas", f: () => crearTarjetas() }, { t: "✅ Test", f: () => crearTest() }]
  });
}

// ---------- Tarjetas de memoria (repaso espaciado) ----------
function jsonDe(r) {
  const m = r.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!m) throw new Error("La IA no ha devuelto el formato esperado. Prueba otra vez.");
  return JSON.parse(m[0]);
}
async function crearTarjetas() {
  if (!necesitoMaterial()) return;
  $("estudio").hidden = true;
  $("transcript").textContent = "Creando tarjetas…";
  const r = await gemini("Crea entre 10 y 15 tarjetas de memoria de este material para estudiar para el examen. Responde SOLO con JSON: [{\"p\":\"pregunta corta\",\"r\":\"respuesta breve\"}]",
    "Material:\n" + EST.material.texto);
  const lista = jsonDe(r).filter((x) => x.p && x.r).slice(0, 20);
  const mazo = {
    id: Date.now().toString(36), titulo: EST.material.titulo, asignatura: EST.material.asignatura,
    tarjetas: lista.map((x) => ({ p: String(x.p), r: String(x.r), caja: 1, proxima: hoyISO() }))
  };
  EST.mazos.unshift(mazo);
  EST.mazos = EST.mazos.slice(0, 60);
  await guardarMazos();
  pintarEstudio();
  decir("🗂️ " + mazo.tarjetas.length + " tarjetas creadas", mazo.tarjetas.slice(0, 5).map((t) => "• " + t.p).join("\n") + (mazo.tarjetas.length > 5 ? "\n…" : "") +
    "\n\nTe las iré preguntando en los días justos para que no se te olviden.", {
    voz: "He creado " + mazo.tarjetas.length + " tarjetas. ¿Las repasamos?",
    botones: [{ t: "▶️ Repasar ahora", f: () => repasar() }]
  });
}

let sesionRepaso = null;
function repasar() {
  const hoy = hoyISO();
  const cola = [];
  EST.mazos.forEach((m) => m.tarjetas.forEach((t) => { if (t.proxima <= hoy) cola.push({ m, t }); }));
  $("estudio").hidden = true;
  if (!cola.length) {
    decir("🔁 Repaso", "No te toca repasar nada hoy. 😎\nCrea tarjetas de un tema nuevo o haz un test.", { voz: "Hoy no tienes nada que repasar." });
    return;
  }
  cola.sort(() => Math.random() - 0.5);
  sesionRepaso = { cola: cola.slice(0, 30), i: 0, bien: 0 };
  mostrarTarjeta();
}
function mostrarTarjeta() {
  const s = sesionRepaso;
  if (s.i >= s.cola.length) {
    apuntarProgreso("repaso", { aciertos: s.bien, total: s.cola.length });
    guardarMazos();
    pintarEstudio();
    decir("🔁 Repaso terminado", "Te sabías " + s.bien + " de " + s.cola.length + ".\nLas que fallaste volverán mañana.", { voz: "Repaso terminado. " + s.bien + " de " + s.cola.length + "." });
    return;
  }
  const { m, t } = s.cola[s.i];
  decir("🔁 Tarjeta " + (s.i + 1) + "/" + s.cola.length + " · " + (m.asignatura || m.titulo), t.p, {
    voz: t.p,
    botones: [{ t: "👀 Ver respuesta", f: () => respuestaTarjeta() }]
  });
}
function respuestaTarjeta() {
  const s = sesionRepaso;
  const { t } = s.cola[s.i];
  const valorar = (nivel) => {
    if (nivel === 0) { t.caja = 1; t.proxima = sumarDiasISO(1); }
    else if (nivel === 1) { t.proxima = sumarDiasISO(Math.max(1, INTERVALOS[t.caja] >> 1)); }
    else { t.caja = Math.min(6, t.caja + 1); t.proxima = sumarDiasISO(INTERVALOS[t.caja]); s.bien++; }
    s.i++;
    mostrarTarjeta();
  };
  decir("🔁 Respuesta", t.p + "\n\n➜ " + t.r + "\n\n¿Te la sabías?", {
    voz: t.r,
    botones: [{ t: "😕 No", f: () => valorar(0) }, { t: "🙂 Más o menos", f: () => valorar(1) }, { t: "😎 Sí", f: () => valorar(2) }]
  });
}

// ---------- Test interactivo ----------
async function crearTest(soloEstas) {
  if (!soloEstas && !necesitoMaterial()) return;
  $("estudio").hidden = true;
  let preguntas = soloEstas;
  if (!preguntas) {
    $("transcript").textContent = "Preparando el test…";
    const r = await gemini("Crea un test tipo examen de 8 preguntas sobre este material, de dificultad variada. Responde SOLO con JSON: [{\"pregunta\":\"...\",\"opciones\":[\"a\",\"b\",\"c\",\"d\"],\"correcta\":0,\"explicacion\":\"por qué es la correcta\"}]",
      "Material:\n" + EST.material.texto);
    preguntas = jsonDe(r).filter((x) => x.pregunta && Array.isArray(x.opciones) && x.opciones.length >= 2).slice(0, 12);
  }
  const s = { preguntas, i: 0, bien: 0, falladas: [] };
  const siguiente = () => {
    if (s.i >= s.preguntas.length) {
      const nota = Math.round((s.bien / s.preguntas.length) * 100) / 10;
      apuntarProgreso("test", { aciertos: s.bien, total: s.preguntas.length, nota });
      orb.setTinte(nota >= 5 ? "#3ddc97" : "#ff5e8a", 3000);
      decir("✅ Nota: " + String(nota).replace(".", ",") + " / 10", "Has acertado " + s.bien + " de " + s.preguntas.length + "." +
        (s.falladas.length ? "\n\nFalladas:\n" + s.falladas.map((p) => "• " + p.pregunta + "\n   ➜ " + p.opciones[p.correcta]).join("\n") : "\n\n¡Perfecto! 🏆"), {
        voz: "Tu nota es un " + String(nota).replace(".", ",") + ".",
        botones: s.falladas.length ? [{ t: "🔁 Repetir falladas", f: () => crearTest(s.falladas) }, { t: "🆕 Otro test", f: () => crearTest() }] : [{ t: "🆕 Otro test", f: () => crearTest() }]
      });
      return;
    }
    const p = s.preguntas[s.i];
    decir("✅ Pregunta " + (s.i + 1) + "/" + s.preguntas.length, p.pregunta, {
      voz: false,
      botones: p.opciones.map((op, k) => ({
        t: "ABCD"[k] + ") " + op,
        f: () => {
          const ok = k === +p.correcta;
          if (ok) s.bien++; else s.falladas.push(p);
          orb.setTinte(ok ? "#3ddc97" : "#ff5e8a", 900);
          decir(ok ? "✅ ¡Correcto!" : "❌ No era esa", (ok ? "" : "La correcta: " + p.opciones[p.correcta] + "\n\n") + (p.explicacion || ""), {
            voz: false,
            botones: [{ t: s.i + 1 < s.preguntas.length ? "Siguiente ➜" : "Ver nota", f: () => { s.i++; siguiente(); } }]
          });
        }
      }))
    });
  };
  siguiente();
}

// ---------- Examen oral (voz en tiempo real con el Examinador) ----------
async function examenOral() {
  if (!necesitoMaterial()) return;
  $("estudio").hidden = true;
  if (typeof iniciarLive !== "function") throw new Error("La voz en tiempo real no está disponible.");
  LIVE.contextoExtra = "MATERIAL PARA EL EXAMEN ORAL («" + EST.material.titulo + "»):\n" + EST.material.texto.slice(0, 25000) +
    "\n\nHaz un examen oral de este material: una pregunta cada vez, espera la respuesta, corrígela con nota del 0 al 10 y explica lo que faltaba. Empieza saludando y haciendo la primera pregunta.";
  if (PERS.actual !== "examinador") LIVE.personaPrevia = PERS.actual;
  await ponerPersona("examinador", false);
  apuntarProgreso("oral", {});
  await iniciarLive();
  setTimeout(() => { if (LIVE.ws && LIVE.ws.readyState === 1) LIVE.ws.send(JSON.stringify({ realtimeInput: { text: "Empieza el examen." } })); }, 600);
}

// ---------- Ejercicio guiado por captura ----------
async function ejercicioGuiado() {
  $("estudio").hidden = true;
  const tab = await pestanaActual();
  let img;
  try { img = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 85 }); }
  catch (e) { throw new Error("No puedo hacer captura de esta pestaña. Abre el ejercicio en otra web, PDF o foto."); }
  const partes = [{ inline_data: { mime_type: "image/jpeg", data: img.split(",")[1] } }];
  const pistas = [];
  const pedirPista = async (final) => {
    $("transcript").textContent = final ? "Resolviendo paso a paso…" : "Pensando una pista…";
    const instr = final
      ? "Resuelve el ejercicio de la imagen paso a paso, explicando cada paso de forma sencilla, y da la solución final clara."
      : "Hay un ejercicio en la imagen. NO des la solución. Da solo la pista número " + (pistas.length + 1) + " para que el alumno avance él solo, en dos o tres frases." +
        (pistas.length ? " Pistas que ya le has dado:\n" + pistas.join("\n") : " Empieza diciendo qué pide el ejercicio y qué hay que usar.");
    const r = await gemini(instr, "", { partes });
    if (!final) pistas.push(r);
    decir(final ? "🧮 Solución paso a paso" : "💡 Pista " + pistas.length, r, {
      voz: final ? false : r,
      botones: final ? [] : [{ t: "💡 Otra pista", f: () => pedirPista(false) }, { t: "🧮 Ver solución", f: () => pedirPista(true) }]
    });
    if (final) apuntarProgreso("ejercicio", { pistas: pistas.length });
  };
  await pedirPista(false);
}

// ---------- Pomodoro + modo foco ----------
function pomodoro(minutos = 25, descanso = 5) {
  pararPomodoro(true);
  const fase = { nombre: "estudio", fin: Date.now() + minutos * 60000, minutos, descanso, ciclos: 0 };
  EST.pomodoro = fase;
  modoFoco(minutos);
  $("estudio").hidden = true;
  orb.setTinte("#ffd166", 2000);
  decir("⏱️ Pomodoro", minutos + " minutos de estudio." + (ES_EXT ? " Te bloqueo YouTube, TikTok, Instagram y compañía." : " Deja el móvil boca abajo. 😉") + "\nCuando acabe, " + descanso + " minutos de descanso.", {
    voz: "Empezamos. " + minutos + " minutos de concentración.",
    botones: [{ t: "⏹ Parar", f: () => pararPomodoro() }]
  });
  fase.timer = setInterval(() => {
    const quedan = Math.max(0, fase.fin - Date.now());
    const mm = String(Math.floor(quedan / 60000)).padStart(2, "0"), ss = String(Math.floor(quedan / 1000) % 60).padStart(2, "0");
    if (!app.classList.contains("listening")) $("transcript").textContent = (fase.nombre === "estudio" ? "📚 Estudiando " : "☕ Descanso ") + mm + ":" + ss;
    if (quedan > 0) return;
    pitido(); setTimeout(pitido, 300);
    if (fase.nombre === "estudio") {
      fase.ciclos++;
      apuntarProgreso("pomodoro", { minutos: fase.minutos });
      fase.nombre = "descanso";
      fase.fin = Date.now() + fase.descanso * 60000;
      chrome.storage.local.set({ focoHasta: 0 });
      decir("☕ ¡Descanso!", "Has hecho " + fase.ciclos + " pomodoro" + (fase.ciclos > 1 ? "s" : "") + ". " + fase.descanso + " minutos para estirar las piernas.", {
        voz: "Muy bien. Descanso de " + fase.descanso + " minutos.", botones: [{ t: "⏹ Terminar", f: () => pararPomodoro() }]
      });
    } else {
      fase.nombre = "estudio";
      fase.fin = Date.now() + fase.minutos * 60000;
      modoFoco(fase.minutos);
      decir("📚 ¡A estudiar!", "Otros " + fase.minutos + " minutos.", { voz: "Se acabó el descanso. A por otros " + fase.minutos + " minutos.", botones: [{ t: "⏹ Terminar", f: () => pararPomodoro() }] });
    }
  }, 1000);
}
function pararPomodoro(silencio) {
  if (!EST.pomodoro) return;
  clearInterval(EST.pomodoro.timer);
  const c = EST.pomodoro.ciclos;
  EST.pomodoro = null;
  chrome.storage.local.set({ focoHasta: 0 });
  if (!silencio) decir("⏱️ Pomodoro terminado", c ? "Hoy llevas " + c + " pomodoro" + (c > 1 ? "s" : "") + " en esta sesión. 💪" : "Parado.", { voz: false });
}
function modoFoco(minutos) {
  chrome.storage.local.set({ focoHasta: Date.now() + minutos * 60000 });
}

// ---------- Plan de exámenes ----------
function planExamen(prefijo = {}) {
  $("estudio").hidden = true;
  decir("📅 Plan de examen", "Te reparto el temario por días y lo apunto en tu calendario.", {
    voz: false,
    campos: [
      { id: "asig", ph: "Asignatura (ej.: Biología)", valor: prefijo.asig || (EST.material ? EST.material.asignatura : "") },
      { id: "fecha", ph: "Fecha del examen (ej.: 20 de noviembre)", valor: prefijo.fecha || "" },
      { id: "temas", tipo: "area", ph: "Temas que entran (ej.: temas 1 a 4: célula, tejidos…)", valor: prefijo.temas || "" }
    ],
    enviar: { t: "Crear plan", f: (v) => crearPlan(v.asig, v.fecha, v.temas) }
  });
}
async function crearPlan(asig, fecha, temas) {
  if (!asig || !fecha) throw new Error("Pon la asignatura y la fecha del examen.");
  $("transcript").textContent = "Organizando tu estudio…";
  const r = await gemini(
    "Hoy es " + new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " (" + hoyISO() + "). " +
    "El alumno tiene examen de " + asig + " el " + fecha + ". Temas: " + (temas || "(no indicados)") + ". " +
    "Haz un plan de estudio realista desde mañana hasta el día antes del examen: reparte los temas, deja repasos y un día de simulacro. Máximo 14 días. " +
    "Responde SOLO con JSON: {\"examen\":\"AAAA-MM-DD\",\"dias\":[{\"fecha\":\"AAAA-MM-DD\",\"tarea\":\"texto corto\"}]}"
  );
  const plan = jsonDe(r);
  if (!plan.dias || !plan.dias.length) throw new Error("No he podido hacer el plan. Revisa la fecha.");
  const nuevos = plan.dias.map((d) => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fecha: d.fecha, hora: "", titulo: ("📚 " + asig + ": " + d.tarea).slice(0, 60) }));
  if (/^\d{4}-\d{2}-\d{2}$/.test(plan.examen || "")) nuevos.push({ id: Date.now().toString(36) + "ex", fecha: plan.examen, hora: "", titulo: "📝 EXAMEN de " + asig });
  await calAnadirEventos(nuevos);
  decir("📅 Plan de " + asig, plan.dias.map((d) => new Date(d.fecha + "T12:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }) + " · " + d.tarea).join("\n") +
    "\n\nApuntado en tu calendario" + (scriptConectado() ? " (también en el móvil)." : "."), { voz: "Plan creado y apuntado en tu calendario. Mucho ánimo." });
}

// ---------- Progreso ----------
function progreso() {
  $("estudio").hidden = true;
  const P = EST.progreso;
  const tests = P.filter((p) => p.tipo === "test");
  const porAsig = {};
  tests.forEach((t) => { const a = t.asignatura || "Sin asignatura"; (porAsig[a] = porAsig[a] || []).push(t.nota); });
  const dias = new Set(P.map((p) => p.fecha));
  let racha = 0;
  let i = dias.has(hoyISO()) ? 0 : 1; // si hoy aún no has estudiado, la racha cuenta hasta ayer
  while (dias.has(sumarDiasISO(-i)) && i < 400) { racha++; i++; }
  const minutos = P.filter((p) => p.tipo === "pomodoro").reduce((s, p) => s + (p.minutos || 0), 0);
  const semana = P.filter((p) => p.fecha >= sumarDiasISO(-6));
  const totalTarjetas = EST.mazos.reduce((s, m) => s + m.tarjetas.length, 0);
  const dominadas = EST.mazos.reduce((s, m) => s + m.tarjetas.filter((t) => t.caja >= 4).length, 0);
  const l = [
    "🔥 Racha: " + racha + (racha === 1 ? " día seguido" : " días seguidos") + " estudiando",
    "⏱️ Tiempo con pomodoro: " + Math.floor(minutos / 60) + " h " + (minutos % 60) + " min",
    "📅 Esta semana: " + semana.length + (semana.length === 1 ? " sesión" : " sesiones"),
    "🗂️ Tarjetas: " + totalTarjetas + " (" + dominadas + " dominadas) · " + pendientesHoy() + " para hoy",
    "",
    "✅ Notas medias de test:"
  ];
  const asigs = Object.entries(porAsig);
  if (!asigs.length) l.push("   Aún no has hecho tests.");
  asigs.forEach(([a, notas]) => {
    const media = notas.reduce((s, n) => s + n, 0) / notas.length;
    l.push("   " + (media >= 7 ? "🟢" : media >= 5 ? "🟡" : "🔴") + " " + a + ": " + media.toFixed(1).replace(".", ",") + " (" + notas.length + " test" + (notas.length > 1 ? "s" : "") + ")");
  });
  decir("📊 Tu progreso", l.join("\n"), { voz: "Llevas una racha de " + racha + " días." });
}

// ---------- Botones de la ventana ----------
document.querySelectorAll("[data-est]").forEach((b) => b.addEventListener("click", () => {
  const a = b.dataset.est;
  const acciones = {
    pagina: materialDePagina, archivo: materialDeArchivo, texto: materialDeTexto, captura: materialDeCaptura,
    resumen: () => estudiar("resumen"), esquema: () => estudiar("esquema"), conceptos: () => estudiar("conceptos"), facil: () => estudiar("facil"),
    tarjetas: crearTarjetas, test: () => crearTest(), oral: examenOral, repasar: repasar, ejercicio: ejercicioGuiado,
    pomodoro: () => pomodoro(25, 5), plan: () => planExamen(), progreso: progreso, investigar: () => pedirInvestigacion(),
    mapa: () => mapaMental(), podcast: () => podcast(), deberes: () => verDeberes(), grafica: () => pedirGrafica(),
    detector: () => pedirDetector(), humanizar: () => pedirHumanizar(), logros: () => verLogros()
  };
  if (["pagina", "captura"].includes(a)) $("estudio").hidden = true;
  Promise.resolve(acciones[a] && acciones[a]()).catch(fallo);
}));

// ---------- Órdenes por voz ----------
async function ordenEstudio(texto) {
  const t = sinTildes(texto.trim());
  let m;
  if (/^(modo estudio|estudio|vamos a estudiar|quiero estudiar|ponte a estudiar conmigo)$/.test(t)) { abrirEstudio(); return true; }
  if (/^(estudia|estudiemos|aprende|usa) (esta pagina|esto|este articulo|este pdf)/.test(t)) { await materialDePagina(); return true; }
  if (/(hazme|crea|genera|quiero) (un )?test|examiname por escrito/.test(t)) {
    if (!EST.material && /de esta pagina|de esto/.test(t)) await materialDePagina();
    await crearTest(); return true;
  }
  if (/(hazme|crea|genera) (unas |las )?(tarjetas|flashcards|fichas)/.test(t)) {
    if (!EST.material && /de esta pagina|de esto/.test(t)) await materialDePagina();
    await crearTarjetas(); return true;
  }
  if (/^(repasar|repasa|repaso|repasemos)( (las )?tarjetas| hoy)?$/.test(t)) { repasar(); return true; }
  if (/(examen oral|preguntame|hazme preguntas|tomame la leccion)/.test(t)) { await examenOral(); return true; }
  if (/(explicame|ayudame con|resuelve|como se hace) (este|el) (ejercicio|problema)/.test(t)) { await ejercicioGuiado(); return true; }
  if ((m = t.match(/(?:pomodoro|empieza a estudiar)(?: de)?(?: (\d{1,3}) ?min)?/)) && !/plan/.test(t)) {
    pomodoro(m[1] ? Math.min(120, +m[1]) : 25, 5); return true;
  }
  if ((m = t.match(/modo foco(?: (?:de |durante )?(\d{1,3}) ?min)?/)) && !ES_EXT) {
    decir("🔒 Modo foco", "Bloquear otras webs solo se puede con la extensión de Chrome. Aquí te pongo un pomodoro.", { voz: false });
    pomodoro(m[1] ? Math.min(120, +m[1]) : 25, 5);
    return true;
  }
  if ((m = t.match(/modo foco(?: (?:de |durante )?(\d{1,3}) ?min)?/))) {
    const min = m[1] ? Math.min(240, +m[1]) : 25;
    modoFoco(min);
    decir("🔒 Modo foco", "Bloqueados YouTube, TikTok, Instagram y redes durante " + min + " minutos.", { voz: "Modo foco activado " + min + " minutos." });
    return true;
  }
  if (/^(quita|para|desactiva) (el )?(modo foco|pomodoro)/.test(t)) { pararPomodoro(); chrome.storage.local.set({ focoHasta: 0 }); decir("🔓 Modo foco", "Quitado.", { voz: false }); return true; }
  if ((m = texto.match(/tengo (?:un )?examen de (.+?) (?:el|para el|este|el dia) (.+)$/i))) { planExamen({ asig: m[1], fecha: m[2] }); return true; }
  if (/plan de (estudio|examen)/.test(t)) { planExamen(); return true; }
  if (/(mi progreso|como voy estudiando|estadisticas de estudio|mis notas)/.test(t)) { progreso(); return true; }
  if ((m = t.match(/^(resumen|esquema|conceptos clave|explicamelo facil|explicamelo como a un nino)( para estudiar)?$/))) {
    if (!EST.material) await materialDePagina();
    await estudiar(m[1].startsWith("resumen") ? "resumen" : m[1].startsWith("esquema") ? "esquema" : m[1].startsWith("conceptos") ? "conceptos" : "facil");
    return true;
  }
  return false;
}

$("estudioBtn").addEventListener("click", () => { if ($("estudio").hidden) abrirEstudio(); else $("estudio").hidden = true; });


// ======== investigar.js ========
// 🔬 Investigación profunda: divide el tema en preguntas, busca cada una en internet, lee las fuentes
// y escribe un informe con referencias que se abre en una pestaña.

const INV = { activo: false, parar: false, informes: [] };
chrome.storage.local.get("informes").then((g) => { INV.informes = Array.isArray(g.informes) ? g.informes : []; });

// Plan A: Gemini con la búsqueda de Google
async function geminiBusqueda(pregunta) {
  const clave = await getClave();
  if (!clave) return null;
  for (const modelo of ["gemini-flash-latest", "gemini-flash-lite-latest"]) {
    const corte = new AbortController();
    const t = setTimeout(() => corte.abort(), 40000);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Investiga en internet y responde con datos concretos (cifras, fechas, nombres), en español de España: " + pregunta }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 1500 }
        }),
        signal: corte.signal
      });
      const j = await r.json();
      if (!r.ok) continue;
      const c = j.candidates && j.candidates[0];
      const texto = ((c && c.content && c.content.parts) || []).map((p) => p.text || "").join("").trim();
      const fuentes = ((c && c.groundingMetadata && c.groundingMetadata.groundingChunks) || [])
        .map((g) => g.web).filter(Boolean).map((w) => ({ titulo: w.title || w.uri, url: w.uri }));
      if (texto && fuentes.length) return { texto, fuentes };
    } catch (e) {
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}

// Pide una página y devuelve su HTML (la web lo cambia para pasar por un intermediario)
async function traerHTML(url) {
  const corte = new AbortController();
  const t = setTimeout(() => corte.abort(), 9000);
  try {
    const r = await fetch(url, { signal: corte.signal, credentials: "omit" });
    if (!r.ok || !/html|text/.test(r.headers.get("content-type") || "")) return "";
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

// Plan B: buscador DuckDuckGo + leer las páginas
async function buscarDuck(q) {
  try {
    const doc = new DOMParser().parseFromString(await traerHTML("https://html.duckduckgo.com/html/?kl=es-es&q=" + encodeURIComponent(q)), "text/html");
    const res = [];
    doc.querySelectorAll("a.result__a").forEach((a) => {
      let u = a.getAttribute("href") || "";
      const m = u.match(/[?&]uddg=([^&]+)/);
      if (m) u = decodeURIComponent(m[1]);
      if (u.startsWith("//")) u = "https:" + u;
      if (/^https?:/.test(u) && !/duckduckgo\.com\/y\.js|ad_domain|bing\.com\/aclick/.test(u)) res.push({ titulo: a.textContent.trim(), url: u });
    });
    return res.slice(0, 8);
  } catch (e) {
    return [];
  }
}
async function leerWeb(url) {
  try {
    const html = await traerHTML(url);
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, nav, header, footer, aside, form, noscript, iframe, svg").forEach((e) => e.remove());
    const raiz = doc.querySelector("article") || doc.querySelector("main") || doc.body;
    return ((raiz && raiz.textContent) || "").replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch (e) {
    return "";
  }
}
async function investigarPregunta(q) {
  const g = await geminiBusqueda(q);
  if (g) return g;
  const res = await buscarDuck(q);
  const fuentes = [], textos = [];
  for (const x of res) {
    if (fuentes.length >= 3 || INV.parar) break;
    const t = await leerWeb(x.url);
    if (t.length > 300) { fuentes.push(x); textos.push("FUENTE [" + fuentes.length + "] (" + x.titulo + "):\n" + t); }
  }
  if (!fuentes.length) return { texto: "", fuentes: [] };
  const texto = await gemini("Responde a esta pregunta usando SOLO las fuentes, con datos concretos y citando [1], [2]… después de cada dato: " + q, textos.join("\n\n"), { silencioso: true });
  return { texto, fuentes };
}

// ---------- Informe en HTML ----------
const escHTML = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function informeHTML(o) {
  const lineas = o.texto.split("\n");
  let html = "", enLista = false;
  const enlinea = (s) => escHTML(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (m, ns) => ns.split(",").map((n) => '<a class="cita" href="#f' + n.trim() + '">[' + n.trim() + "]</a>").join(""));
  for (const l of lineas) {
    const s = l.trim();
    const esLista = /^[-•*]\s+/.test(s);
    if (!esLista && enLista) { html += "</ul>"; enLista = false; }
    if (!s) continue;
    if (s.startsWith("### ")) html += "<h3>" + enlinea(s.slice(4)) + "</h3>";
    else if (s.startsWith("## ")) html += "<h2>" + enlinea(s.slice(3)) + "</h2>";
    else if (s.startsWith("# ")) html += "<h1>" + enlinea(s.slice(2)) + "</h1>";
    else if (esLista) { if (!enLista) { html += "<ul>"; enLista = true; } html += "<li>" + enlinea(s.replace(/^[-•*]\s+/, "")) + "</li>"; }
    else html += "<p>" + enlinea(s) + "</p>";
  }
  if (enLista) html += "</ul>";
  if (!/<h1>/.test(html)) html = "<h1>" + escHTML(o.titulo) + "</h1>" + html;
  const fuentes = o.fuentes.map((f, i) => '<li id="f' + (i + 1) + '"><a href="' + escHTML(f.url) + '" target="_blank" rel="noopener">' + escHTML(f.titulo) + "</a><br><small>" + escHTML(f.url) + "</small></li>").join("");
  return "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>" + escHTML(o.titulo) + "</title><style>" +
    "body{margin:0;background:#f4f6fb;font:17px/1.65 Georgia,'Times New Roman',serif;color:#1d2433}" +
    ".hoja{max-width:780px;margin:40px auto;background:#fff;padding:56px 64px;border-radius:14px;box-shadow:0 10px 40px rgba(20,30,60,.08)}" +
    ".sello{font:600 12px/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#5b6bff;margin-bottom:18px}" +
    "h1{font:700 34px/1.2 system-ui,sans-serif;margin:0 0 18px}h2{font:700 22px/1.3 system-ui,sans-serif;margin:34px 0 10px;color:#2a3350}" +
    "h3{font:600 18px/1.3 system-ui,sans-serif;margin:24px 0 6px}a.cita{color:#5b6bff;text-decoration:none;font:600 12px system-ui;vertical-align:super;margin-left:1px}" +
    "ul{padding-left:22px}li{margin:4px 0}.fuentes{margin-top:44px;border-top:1px solid #e3e7f2;padding-top:18px;font:14px/1.5 system-ui,sans-serif}" +
    ".fuentes small{color:#8790a8;word-break:break-all}.fuentes a{color:#2a3350}@media print{body{background:#fff}.hoja{box-shadow:none;margin:0;padding:0}}" +
    "</style></head><body><div class=\"hoja\"><div class=\"sello\">🔬 Investigación de Jarvis · " +
    new Date(o.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) + "</div>" + html +
    (fuentes ? "<div class=\"fuentes\"><h3>Fuentes</h3><ol>" + fuentes + "</ol></div>" : "") + "</div></body></html>";
}
function abrirInforme(o) {
  const url = URL.createObjectURL(new Blob([informeHTML(o)], { type: "text/html;charset=utf-8" }));
  chrome.tabs.create({ url });
}
async function descargarInforme(o) {
  const url = URL.createObjectURL(new Blob([informeHTML(o)], { type: "text/html;charset=utf-8" }));
  const nombre = o.titulo.replace(/[^\wáéíóúñü -]/gi, "").trim().slice(0, 60) || "informe";
  await chrome.downloads.download({ url, filename: "Jarvis/Informes/" + nombre + ".html", conflictAction: "uniquify" });
  decir("⬇️ Informe descargado", "Está en Descargas › Jarvis › Informes. Se abre con Chrome y se puede imprimir o guardar como PDF.", { voz: false });
}
function resumenDe(texto) {
  const l = texto.split("\n").map((x) => x.trim()).filter((x) => x && !x.startsWith("#"));
  return (l[0] || "").replace(/\[\d+(?:\s*,\s*\d+)*\]/g, "").replace(/\*\*/g, "").slice(0, 500);
}

// ---------- Investigar ----------
async function investigar(tema) {
  tema = String(tema || "").trim();
  if (!tema) { pedirInvestigacion(); return ""; }
  if (INV.activo) throw new Error("Ya estoy investigando otra cosa.");
  INV.activo = true;
  INV.parar = false;
  const pasos = [];
  const pinta = () => {
    if (window.capturaDecir) return;
    decir("🔬 Investigando…", "Tema: " + tema + "\n\n" + pasos.map((p, i, a) => (i === a.length - 1 ? "▸ " : "✓ ") + p).join("\n"), {
      voz: false, botones: [{ t: "⏹ Parar", f: () => { INV.parar = true; } }]
    });
  };
  const paso = (t) => { pasos.push(t); pinta(); $("transcript").textContent = t; estado("thinking"); };
  try {
    paso("🧭 Planeando la investigación");
    const plan = jsonDe(await gemini(
      "Vas a investigar a fondo este tema para un trabajo de clase: «" + tema + "». Divide la investigación en entre 4 y 6 preguntas concretas que cubran lo importante (contexto, datos, causas, consecuencias, distintos puntos de vista y situación actual, según el tema). " +
      "Responde SOLO con JSON: {\"titulo\":\"título del informe\",\"preguntas\":[\"...\"]}", "", { silencioso: true }));
    const preguntas = (plan.preguntas || []).slice(0, 6);
    if (!preguntas.length) throw new Error("No he sabido plantear la investigación. Reformula el tema.");
    const todas = [], hallazgos = [];
    for (let i = 0; i < preguntas.length; i++) {
      if (INV.parar) break;
      const q = preguntas[i];
      paso("🔎 (" + (i + 1) + "/" + preguntas.length + ") " + q);
      const r = await investigarPregunta(q);
      if (!r.texto) continue;
      // Numeración de fuentes común para todo el informe
      const mapa = r.fuentes.map((f) => {
        let k = todas.findIndex((x) => x.url === f.url);
        if (k < 0) { todas.push(f); k = todas.length - 1; }
        return k + 1;
      });
      const texto = r.texto.replace(/\[(\d+)\]/g, (m, n) => (mapa[+n - 1] ? "[" + mapa[+n - 1] + "]" : m));
      hallazgos.push("PREGUNTA: " + q + "\nRESPUESTA: " + texto + "\nFUENTES DE ESTA RESPUESTA: " + mapa.map((n) => "[" + n + "] " + todas[n - 1].titulo).join("; "));
    }
    if (!hallazgos.length) throw new Error("No he podido sacar información de internet. Revisa la conexión o prueba con otro tema.");
    paso("✍️ Escribiendo el informe (" + todas.length + " fuentes)");
    const texto = await gemini(
      "Escribe un informe completo y bien redactado sobre «" + tema + "» usando SOLO estos hallazgos. Estructura: título con «# », un resumen inicial de 3-4 frases, secciones con «## », listas con «- » cuando ayuden y una conclusión. " +
      "Cita las fuentes con [n] después de cada dato importante (usa los números que aparecen en los hallazgos). Español de España, claro, para un estudiante. No inventes nada.",
      hallazgos.join("\n\n"), { silencioso: true });
    const o = { id: Date.now().toString(36), tema, titulo: plan.titulo || tema, fecha: new Date().toISOString(), texto, fuentes: todas };
    INV.informes.unshift(o);
    INV.informes = INV.informes.slice(0, 20);
    await chrome.storage.local.set({ informes: INV.informes });
    if (typeof apuntarProgreso === "function") apuntarProgreso("investigacion", {});
    abrirInforme(o);
    const resumen = resumenDe(texto);
    decir("🔬 " + o.titulo, resumen + "\n\n" + todas.length + " fuentes consultadas. Te lo he abierto en una pestaña.", {
      voz: "Informe listo. Te lo he abierto en una pestaña.",
      botones: [
        { t: "📄 Abrir", f: () => abrirInforme(o) },
        { t: "⬇️ Descargar", f: () => descargarInforme(o) },
        { t: "📚 Estudiarlo", f: () => ponerMaterial(o.titulo, o.texto, "informe") }
      ]
    });
    return o.titulo + ". " + resumen;
  } finally {
    INV.activo = false;
    if (!(typeof liveActivo === "function" && liveActivo())) estado("idle");
  }
}

function pedirInvestigacion() {
  ["estudio", "herramientas"].forEach((s) => { if ($(s)) $(s).hidden = true; });
  decir("🔬 Investigación profunda", "¿Sobre qué investigo? Busco en varias fuentes y te hago un informe con referencias (tarda 1 o 2 minutos).", {
    voz: false,
    campos: [{ id: "tema", tipo: "area", ph: "Ej.: causas y consecuencias de la Revolución Industrial en España" }],
    enviar: { t: "Investigar", f: (v) => investigar(v.tema) }
  });
}
function misInformes() {
  if (!INV.informes.length) { decir("🔬 Informes", "Aún no has pedido ninguna investigación. Di «investiga…» y el tema.", { voz: false }); return; }
  decir("🔬 Tus informes", INV.informes.slice(0, 8).map((o) => "• " + o.titulo + " (" + new Date(o.fecha).toLocaleDateString("es-ES") + ")").join("\n"), {
    voz: false, botones: INV.informes.slice(0, 6).map((o) => ({ t: o.titulo.length > 30 ? o.titulo.slice(0, 30) + "…" : o.titulo, f: () => abrirInforme(o) }))
  });
}

async function ordenInvestigar(texto) {
  const t = texto.trim();
  if (/^(mis informes|mis investigaciones)$/i.test(t)) { misInformes(); return true; }
  const m = t.match(/^(?:investiga(?:ci[oó]n profunda)?|haz(?:me)? (?:una )?investigaci[oó]n|busca a fondo|informe|hazme un informe|investigaci[oó]n profunda)(?:\s+(?:a fondo|sobre|de|acerca de|del|de la))*\s*:?\s*(.*)$/i);
  if (!m) return false;
  if (!m[1].trim()) { pedirInvestigacion(); return true; }
  await investigar(m[1]);
  return true;
}


// ======== ia.js ========
// 🕵️ Detector de textos de IA y ✍️ reescritura natural («humanizador»).
// Basado en la guía «Signs of AI writing» de Wikipedia (WikiProject AI Cleanup) y en cómo miden los detectores
// (previsibilidad y regularidad de las frases). Combina un análisis local explicable con la opinión de Gemini.

const SENALES_IA = [
  { id: "vocab", cat: "Vocabulario típico de IA", color: "#ffd166", peso: 1,
    re: /\b(crucial(?:es)?|fundamental(?:es)?|esencial(?:es)?|fomenta(?:r|n|ndo)?|potencia(?:r|ndo)|profundiza(?:r|ndo)|adentr(?:arse|arnos|a)|sumerg(?:irse|irnos|e)|panorama|ámbito|abanico|amplia gama|vibrante|fascinante|apasionante|intrincad[oa]s?|meticulos[oa]s?|robust[oa]s?|sinergia|transformador(?:a|es)?|innovador(?:a|es)?|revolucionari[oa]s?|desbloque(?:ar|a)|testimonio|legado|tapiz|crisol|piedra angular|catalizador|holístic[oa]|multifacétic[oa]|optimiza(?:r|ndo)|garantiza(?:r|ndo)|resalta(?:r|ndo)|subraya(?:r|ndo)|navega(?:r|ndo)|delve|tapestry|testament|pivotal|underscores?|intricate|meticulous|showcas(?:e|es|ing)|foster(?:ing)?|landscape|realm|vibrant|robust|leverag(?:e|ing)|multifaceted|enhanc(?:e|ing)|garner|boasts|additionally|interplay|enduring)\b/gi },
  { id: "muleta", cat: "Frases muleta", color: "#ff9f43", peso: 2.5,
    re: /(es importante (?:destacar|señalar|tener en cuenta|recordar|mencionar|subrayar)|cabe (?:destacar|señalar|mencionar|resaltar)|vale la pena (?:mencionar|destacar)|es fundamental (?:tener en cuenta|destacar|comprender|entender)|en resumen|en conclusión|en definitiva|en última instancia|en el mundo (?:actual|de hoy)|en la era (?:digital|moderna|actual)|en un mundo cada vez más|(?:juega|desempeña) un papel (?:crucial|fundamental|clave|vital|importante|esencial|determinante)|se erige como|se posiciona como|un testimonio de|deja(?:ndo)? (?:una|su) huella|marca(?:ndo)? un antes y un después|ampliamente reconocid[oa]|(?:los )?expertos (?:señalan|afirman|coinciden)|a pesar de (?:estos|los|sus) desafíos|desafíos y oportunidades|perspectivas de futuro|en constante (?:evolución|cambio)|a la vanguardia|it'?s important to note|in conclusion|in summary|plays a (?:crucial|pivotal|vital|key) role|stands as a testament|in today'?s (?:fast-paced |digital )?world|serves as a)/gi },
  { id: "chatbot", cat: "Frases de chatbot", color: "#ff5e8a", peso: 6,
    re: /(espero que (?:esto|esta información) te (?:ayude|sea útil)|¡claro!|¡por supuesto!|¡excelente pregunta!|como (?:modelo de lenguaje|inteligencia artificial)|según mi última actualización|hasta la fecha de mi conocimiento|si tienes (?:más|alguna otra) pregunta|no dudes en (?:preguntar|consultar|contactar)|aquí tienes (?:un|una|el|la)|i hope this helps|certainly!|great question|as an ai(?: language model)?|as of my last (?:knowledge )?update|let me know if)/gi },
  { id: "paralelo", cat: "Paralelismo «no solo… sino también»", color: "#8b7bff", peso: 3,
    re: /(no (?:solo|sólo|solamente|únicamente) [^.;:]{2,80}?,? sino (?:también|que)|no se trata (?:solo |sólo )?de [^.]{2,60}?,? se trata de|not only [^.]{2,60}? but(?: also)?|it'?s not (?:just )?[^.]{2,40}, it'?s)/gi },
  { id: "gerundio", cat: "Gerundio de relleno (…, destacando…)", color: "#5ee7ff", peso: 2,
    re: /, (?:destacando|subrayando|resaltando|garantizando|fomentando|contribuyendo|reflejando|consolidando|evidenciando|potenciando|promoviendo|aportando|permitiendo|highlighting|underscoring|ensuring|fostering|showcasing|contributing) /gi },
  { id: "tres", cat: "Listas de tres por costumbre", color: "#3ddc97", peso: 1.5,
    re: /\b[a-záéíóúñ]{5,}, [a-záéíóúñ]{5,} y [a-záéíóúñ]{5,}\b/gi },
  { id: "guion", cat: "Guion largo (—)", color: "#a3acc7", peso: 1.5, re: /—/g },
  { id: "formato", cat: "Formato de chatbot (negritas, títulos, emojis)", color: "#ff8a5e", peso: 4,
    re: /(\*\*[^*\n]{2,60}\*\*|^#{1,4} |^\s*[-•*] \*\*[^*]+:\*\*|^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/gmu },
  { id: "artefacto", cat: "Restos de copiar de una IA", color: "#ff0040", peso: 15,
    re: /(turn0search\d|oaicite|contentReference|utm_source=(?:chatgpt\.com|openai)|\[insertar[^\]]*\]|<\|endoftext\|>)/gi }
];
const MARCAS_PERSONALES = /\b(yo|creo|pienso|me parece|mi opinión|a mí|vale|bueno|o sea|tío|en plan|la verdad|jaja|xd)\b/gi;

function frasesDe(texto) {
  return texto.replace(/\s+/g, " ").split(/(?<=[.!?…])\s+/).map((f) => f.trim()).filter((f) => f.split(" ").length >= 3);
}

// Análisis local: rápido, sin internet y explicable
function analizarLocal(texto) {
  const palabras = (texto.match(/[\wáéíóúñü]+/gi) || []).length || 1;
  const hallazgos = [];
  let puntos = 0;
  for (const s of SENALES_IA) {
    const m = [...texto.matchAll(s.re)].map((x) => x[0]);
    if (m.length) { hallazgos.push({ s, n: m.length, ejemplos: [...new Set(m.map((x) => x.trim().toLowerCase()))].slice(0, 6) }); puntos += m.length * s.peso; }
  }
  // Títulos con Mayúsculas En Cada Palabra (error en español, típico de IA traducida)
  const titulos = texto.split("\n").filter((l) => {
    const w = l.trim().split(/\s+/);
    return l.trim().length < 80 && w.length >= 3 && w.slice(1).filter((x) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(x)).length >= 2;
  });
  if (titulos.length) { hallazgos.push({ s: { id: "titulo", cat: "Títulos En Mayúsculas", color: "#c9a0ff", peso: 2 }, n: titulos.length, ejemplos: titulos.slice(0, 3) }); puntos += titulos.length * 2; }

  // Ritmo: la IA escribe frases de longitud muy parecida (poca «variabilidad»)
  const frases = frasesDe(texto);
  const largos = frases.map((f) => f.split(" ").length);
  let ritmo = null, extraRitmo = 0;
  if (largos.length >= 5) {
    const media = largos.reduce((a, b) => a + b, 0) / largos.length;
    const desv = Math.sqrt(largos.reduce((a, b) => a + (b - media) ** 2, 0) / largos.length);
    const cv = desv / media;
    ritmo = { cv, media };
    if (cv < 0.3) extraRitmo = 14; else if (cv < 0.42) extraRitmo = 6; else if (cv > 0.65) extraRitmo = -8;
  }
  const personales = (texto.match(MARCAS_PERSONALES) || []).length;
  const densidad = (puntos / palabras) * 100;
  let local = densidad * 8 + extraRitmo - Math.min(15, personales * 3);
  if (palabras < 60) local *= 0.7; // en textos cortos todo es menos fiable
  return { local: Math.max(0, Math.min(100, Math.round(local))), hallazgos, ritmo, palabras, personales };
}

async function opinionGemini(texto) {
  try {
    const r = await gemini(
      "Eres un experto en detectar textos escritos por IA usando la guía «Signs of AI writing» de Wikipedia: vocabulario inflado, frases muleta, paralelismos negativos, reglas de tres, gerundios de relleno, énfasis exagerado en la importancia o el legado, atribuciones vagas, tono promocional, conclusiones formulaicas, ritmo uniforme y falta de voz personal. " +
      "Analiza el texto y responde SOLO con JSON: {\"probabilidad\": número de 0 a 100, \"motivos\": [\"motivo breve\", …] (máximo 4)}. Sé prudente: el texto humano bien escrito también puede parecer IA.",
      "TEXTO:\n" + texto.slice(0, 8000), { silencioso: true });
    const j = jsonDe(r);
    return { prob: Math.max(0, Math.min(100, Math.round(+j.probabilidad || 0))), motivos: (j.motivos || []).slice(0, 4) };
  } catch (e) {
    return null;
  }
}

function veredicto(p) {
  return p >= 75 ? "🤖 Muy probablemente escrito con IA" : p >= 50 ? "🟠 Probablemente con ayuda de IA" : p >= 25 ? "🟡 Dudoso: tiene algunas señales" : "🧑 Parece escrito por una persona";
}

// Página con el texto marcado por colores
function textoMarcadoHTML(texto, a, final) {
  let html = escHTML(texto);
  for (const h of a.hallazgos) {
    if (!h.s.re) continue;
    const re = new RegExp(h.s.re.source, h.s.re.flags.includes("g") ? h.s.re.flags : h.s.re.flags + "g");
    html = html.replace(re, (m) => '<mark style="background:' + h.s.color + '55;border-bottom:2px solid ' + h.s.color + '" title="' + h.s.cat + '">' + m + "</mark>");
  }
  const leyenda = a.hallazgos.map((h) => '<li><span style="background:' + h.s.color + '"></span>' + escHTML(h.s.cat) + " · " + h.n + "</li>").join("");
  return "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Detector de IA · Jarvis</title><style>" +
    "body{margin:0;background:#03050b;color:#eef2ff;font:16px/1.7 system-ui,sans-serif}.c{max-width:820px;margin:30px auto;padding:0 20px}" +
    ".nota{display:flex;align-items:center;gap:18px;padding:18px 22px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}" +
    ".nota b{font-size:46px}.barra{height:10px;border-radius:10px;background:linear-gradient(90deg,#3ddc97,#ffd166,#ff5e8a);position:relative;margin-top:8px}" +
    ".barra i{position:absolute;top:-5px;width:4px;height:20px;background:#fff;border-radius:2px}ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px 16px;font-size:13px}" +
    "li span{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}.t{white-space:pre-wrap;background:#0b1020;padding:22px;border-radius:16px;margin-top:18px}" +
    "mark{color:inherit;border-radius:3px;padding:0 1px}small{color:#8a93ad}</style></head><body><div class=\"c\">" +
    "<div class=\"nota\"><b>" + final + "%</b><div style=\"flex:1\"><div>" + veredicto(final) + "</div><div class=\"barra\"><i style=\"left:calc(" + final + "% - 2px)\"></i></div></div></div>" +
    "<ul>" + leyenda + "</ul><div class=\"t\">" + html + "</div><p><small>Orientativo. Ningún detector demuestra quién escribió un texto: las señales también aparecen en textos humanos. Basado en la guía «Signs of AI writing» de Wikipedia.</small></p></div></body></html>";
}

async function detectarIA(texto) {
  texto = String(texto || "").trim();
  if (texto.split(/\s+/).length < 25) throw new Error("Pega un texto más largo (mínimo unas 25 palabras) para poder analizarlo.");
  $("transcript").textContent = "Analizando el texto…";
  estado("thinking");
  orb.setTinte("#8b7bff", 2500);
  const a = analizarLocal(texto);
  const g = await opinionGemini(texto);
  const final = g ? Math.round(a.local * 0.45 + g.prob * 0.55) : a.local;
  const l = [veredicto(final), ""];
  if (a.hallazgos.length) {
    l.push("Señales encontradas:");
    a.hallazgos.forEach((h) => l.push("• " + h.s.cat + " (" + h.n + "): " + h.ejemplos.join(", ")));
  } else l.push("No he encontrado señales típicas de IA.");
  if (a.ritmo) l.push("", "Ritmo: " + (a.ritmo.cv < 0.3 ? "frases muy iguales de largas (típico de IA)" : a.ritmo.cv < 0.42 ? "bastante regular" : "variado (típico de persona)"));
  if (g && g.motivos.length) l.push("", "Opinión de Gemini (" + g.prob + " %):", ...g.motivos.map((m) => "• " + m));
  l.push("", "⚠️ Orientativo: ningún detector es una prueba. Las señales también aparecen en textos humanos.");
  orb.setTinte(final >= 50 ? "#ff5e8a" : "#3ddc97", 3000);
  decir("🕵️ Detector de IA: " + final + " %", l.join("\n"), {
    voz: veredicto(final).replace(/^\S+\s/, "") + ".",
    botones: [
      { t: "🖍️ Ver texto marcado", f: () => chrome.tabs.create({ url: URL.createObjectURL(new Blob([textoMarcadoHTML(texto, a, final)], { type: "text/html;charset=utf-8" })) }) },
      { t: "✍️ Reescribir natural", f: () => humanizar(texto) }
    ]
  });
  if (typeof ganarXP === "function") ganarXP("detector", {});
  return final;
}

// ---------- Reescritura natural ----------
async function humanizar(texto, tono) {
  texto = String(texto || "").trim();
  if (texto.split(/\s+/).length < 8) throw new Error("Pega el texto que quieres reescribir.");
  const { miEstilo } = await chrome.storage.local.get("miEstilo");
  $("transcript").textContent = "Reescribiendo…";
  const antes = analizarLocal(texto).local;
  const r = await gemini(
    "Reescribe este texto en español de España para que suene escrito por una persona real" + (tono ? " con este tono: " + tono : ", natural y claro") + ". " +
    "Mantén el contenido, los datos y la extensión aproximada; no inventes nada. " +
    "Evita las marcas típicas de la IA (guía «Signs of AI writing» de Wikipedia): vocabulario inflado (crucial, fundamental, fomentar, potenciar, panorama, ámbito, vibrante, testimonio, legado, transformador, innovador, navegar en sentido figurado…); " +
    "frases muleta (es importante destacar, cabe señalar, en resumen, en conclusión, en el mundo actual, juega un papel crucial…); paralelismos «no solo… sino también»; listas de tres por costumbre; " +
    "gerundios de relleno al final de frase (…, destacando…); exagerar la importancia o el legado; atribuciones vagas (los expertos señalan); conclusiones tipo «a pesar de los desafíos»; guion largo; negritas, títulos y emojis; tono de anuncio. " +
    "Haz que las frases varíen de longitud (alguna muy corta), usa conectores sencillos, di las cosas directamente (es, tiene, hay, en vez de se erige como o cuenta con) y deja que se note una voz concreta cuando encaje. " +
    (miEstilo ? "Imita el estilo de escritura de este ejemplo del propio autor (vocabulario, longitud de frases, puntuación, forma de expresarse):\n«" + miEstilo.slice(0, 2500) + "»\n" : "") +
    "Devuelve solo el texto reescrito, sin comentarios.",
    "TEXTO ORIGINAL:\n" + texto.slice(0, 12000));
  const despues = analizarLocal(r).local;
  decir("✍️ Reescrito natural", r + "\n\n— Señales de IA (análisis local): " + antes + " % → " + despues + " % —", {
    voz: false,
    botones: [
      { t: "📋 Copiar", f: () => copiar(r, "Texto") },
      { t: "⌨️ Escribir en la página", f: () => insertarEnPagina(r) },
      { t: "🔄 Otra versión", f: () => humanizar(texto, tono) },
      { t: "🕵️ Analizar", f: () => detectarIA(r) }
    ]
  });
  if (typeof ganarXP === "function") ganarXP("humanizar", {});
  return r;
}

// ---------- Formularios ----------
async function textoInicial() {
  try { const p = await leerPagina(); return p.seleccion && p.seleccion.trim().split(/\s+/).length > 8 ? p.seleccion.trim() : ""; } catch (e) { return ""; }
}
async function pedirDetector() {
  ["estudio", "herramientas"].forEach((s) => { if ($(s)) $(s).hidden = true; });
  decir("🕵️ Detector de IA", "Pega el texto (o selecciónalo en la página antes de abrir esto). Uso las señales de la guía de Wikipedia y la opinión de Gemini.", {
    voz: false,
    campos: [{ id: "t", tipo: "area", ph: "Texto a analizar…", valor: await textoInicial() }],
    enviar: { t: "Analizar", f: (v) => detectarIA(v.t) }
  });
}
async function pedirHumanizar() {
  ["estudio", "herramientas"].forEach((s) => { if ($(s)) $(s).hidden = true; });
  decir("✍️ Reescribir natural", "Pega el texto y, si quieres, el tono. Mejor si es un borrador tuyo: así suena a ti.", {
    voz: false,
    campos: [{ id: "t", tipo: "area", ph: "Texto a reescribir…", valor: await textoInicial() }, { id: "tono", ph: "Tono (opcional): natural, estudiante de bachillerato, formal pero cercano…" }],
    enviar: { t: "Reescribir", f: (v) => humanizar(v.t, v.tono) }
  });
}
function pedirMiEstilo() {
  decir("🖋️ Aprender tu estilo", "Pega un texto que hayas escrito tú (una redacción, un trabajo, un mensaje largo). Lo usaré para que las reescrituras suenen a ti.", {
    voz: false,
    campos: [{ id: "t", tipo: "area", ph: "Un texto tuyo de al menos 150 palabras…" }],
    enviar: {
      t: "Guardar mi estilo",
      f: async (v) => {
        if ((v.t || "").split(/\s+/).length < 80) throw new Error("Pega un texto algo más largo (unas 150 palabras) para captar tu estilo.");
        await chrome.storage.local.set({ miEstilo: v.t.trim() });
        decir("🖋️ Estilo guardado", "A partir de ahora las reescrituras imitarán tu forma de escribir.", { voz: false });
      }
    }
  });
}

async function ordenIA(texto) {
  const t = sinTildes(texto.trim());
  if (/(detector de ia|detecta(r)? (si es )?ia|esto (lo )?ha escrito una ia|es (texto de )?ia|analiza si (es|esta hecho con) ia|identificador de ia)/.test(t)) {
    const sel = await textoInicial();
    if (sel) await detectarIA(sel); else await pedirDetector();
    return true;
  }
  if (/(humaniza|reescribe(lo)? (natural|mas natural|como una persona)|que no parezca ia|haz que suene (humano|natural))/.test(t)) {
    const sel = await textoInicial();
    if (sel) await humanizar(sel); else await pedirHumanizar();
    return true;
  }
  if (/(aprende|aprender|guarda) mi estilo/.test(t)) { pedirMiEstilo(); return true; }
  return false;
}


// ======== xp.js ========
// 🏆 Niveles, XP, logros y reto diario: estudiar con Jarvis da puntos.

const XP = { total: 0, logros: {}, retoHecho: "" };
const XP_POR = { material: 5, resumen: 10, esquema: 10, conceptos: 10, facil: 8, test: 20, oral: 30, ejercicio: 15, pomodoro: 25, investigacion: 30, deber: 15, mapa: 12, podcast: 12, grafica: 6, detector: 3, humanizar: 3 };
const xpInicioNivel = (n) => 50 * (n - 1) * n;          // nivel 2 = 100 XP, 3 = 300, 4 = 600…
function nivelDe(xp) { let n = 1; while (xp >= xpInicioNivel(n + 1)) n++; return n; }
const TITULOS_NIVEL = ["Novato", "Aprendiz", "Estudiante", "Empollón", "Cerebrito", "Sabio", "Maestro", "Genio", "Leyenda", "Iron Brain"];
const tituloNivel = (n) => TITULOS_NIVEL[Math.min(TITULOS_NIVEL.length - 1, Math.floor((n - 1) / 2))];

function rachaEstudio() {
  const dias = new Set((EST.progreso || []).map((p) => p.fecha));
  let racha = 0, i = dias.has(hoyISO()) ? 0 : 1;
  while (dias.has(sumarDiasISO(-i)) && i < 400) { racha++; i++; }
  return racha;
}
const cuenta = (tipo, filtro) => (EST.progreso || []).filter((p) => p.tipo === tipo && (!filtro || filtro(p))).length;
const tarjetasDominadas = () => (EST.mazos || []).reduce((s, m) => s + m.tarjetas.filter((t) => t.caja >= 4).length, 0);

const LOGROS = [
  { id: "primer", e: "🌱", t: "Primer paso", d: "Gana tus primeros XP", ok: () => XP.total > 0 },
  { id: "diez", e: "🏆", t: "Matrícula de honor", d: "Saca un 10 en un test", ok: () => cuenta("test", (p) => p.nota === 10) > 0 },
  { id: "tests10", e: "✅", t: "Examinado", d: "Haz 10 tests", ok: () => cuenta("test") >= 10 },
  { id: "pomo10", e: "🍅", t: "Tomatero", d: "Completa 10 pomodoros", ok: () => cuenta("pomodoro") >= 10 },
  { id: "racha3", e: "🔥", t: "En racha", d: "Estudia 3 días seguidos", ok: () => rachaEstudio() >= 3 },
  { id: "racha7", e: "⚡", t: "Imparable", d: "Estudia 7 días seguidos", ok: () => rachaEstudio() >= 7 },
  { id: "racha30", e: "👑", t: "Leyenda", d: "Estudia 30 días seguidos", ok: () => rachaEstudio() >= 30 },
  { id: "tarj50", e: "🧠", t: "Memoria de elefante", d: "Domina 50 tarjetas", ok: () => tarjetasDominadas() >= 50 },
  { id: "oral", e: "🎙️", t: "Sin nervios", d: "Haz un examen oral", ok: () => cuenta("oral") > 0 },
  { id: "inv5", e: "🔬", t: "Investigador", d: "Haz 5 investigaciones", ok: () => cuenta("investigacion") >= 5 },
  { id: "deber10", e: "📋", t: "Responsable", d: "Termina 10 deberes", ok: () => cuenta("deber") >= 10 },
  { id: "mapa", e: "🧭", t: "Cartógrafo", d: "Crea un mapa mental", ok: () => cuenta("mapa") > 0 },
  { id: "nivel5", e: "⭐", t: "Nivel 5", d: "Llega al nivel 5", ok: () => nivelDe(XP.total) >= 5 },
  { id: "nivel10", e: "🚀", t: "Nivel 10", d: "Llega al nivel 10", ok: () => nivelDe(XP.total) >= 10 }
];
const RETOS = [
  { t: "Completa un pomodoro", ok: () => cuenta("pomodoro", (p) => p.fecha === hoyISO()) > 0 },
  { t: "Saca un 7 o más en un test", ok: () => cuenta("test", (p) => p.fecha === hoyISO() && p.nota >= 7) > 0 },
  { t: "Repasa tus tarjetas", ok: () => cuenta("repaso", (p) => p.fecha === hoyISO()) > 0 },
  { t: "Haz un examen oral", ok: () => cuenta("oral", (p) => p.fecha === hoyISO()) > 0 },
  { t: "Termina un deber", ok: () => cuenta("deber", (p) => p.fecha === hoyISO()) > 0 },
  { t: "Haz un mapa mental", ok: () => cuenta("mapa", (p) => p.fecha === hoyISO()) > 0 },
  { t: "Haz un resumen o un esquema", ok: () => cuenta("resumen", (p) => p.fecha === hoyISO()) + cuenta("esquema", (p) => p.fecha === hoyISO()) > 0 }
];
function retoDeHoy() {
  const h = hoyISO().split("-").reduce((s, x) => s * 31 + +x, 7);
  return RETOS[h % RETOS.length];
}

chrome.storage.local.get("xp").then(({ xp }) => { Object.assign(XP, xp || {}); pintarXP(); });
const guardarXP = () => chrome.storage.local.set({ xp: XP });

function toastXP(texto, grande) {
  const t = $("xpToast");
  t.textContent = texto;
  t.classList.toggle("grande", !!grande);
  t.classList.remove("ver");
  void t.offsetWidth;
  t.classList.add("ver");
}

function ganarXP(tipo, datos) {
  let pts = XP_POR[tipo] || 0;
  if (tipo === "test") pts += Math.round((datos.nota || 0) * 5);
  if (tipo === "repaso") pts += (datos.aciertos || 0) * 3 + ((datos.total || 0) - (datos.aciertos || 0));
  if (!pts) return;
  const antes = nivelDe(XP.total);
  XP.total += pts;
  const extras = [];
  // Reto del día
  const reto = retoDeHoy();
  if (XP.retoHecho !== hoyISO() && reto.ok()) { XP.retoHecho = hoyISO(); XP.total += 50; extras.push("🎯 Reto del día +50"); }
  // Logros nuevos
  for (const l of LOGROS) if (!XP.logros[l.id] && l.ok()) { XP.logros[l.id] = hoyISO(); XP.total += 25; extras.push(l.e + " " + l.t); }
  guardarXP();
  const despues = nivelDe(XP.total);
  if (despues > antes) {
    toastXP("⬆️ ¡Nivel " + despues + "! " + tituloNivel(despues), true);
    orb.setTinte("#ffd166", 4000);
    if (typeof pitido === "function") { pitido(); setTimeout(pitido, 180); setTimeout(pitido, 360); }
  } else {
    toastXP("+" + pts + " XP" + (extras.length ? " · " + extras.join(" · ") : ""));
  }
  pintarXP();
}

function pintarXP() {
  if (!$("xpBarra")) return;
  const n = nivelDe(XP.total), ini = xpInicioNivel(n), fin = xpInicioNivel(n + 1);
  $("xpNivel").textContent = "Nivel " + n + " · " + tituloNivel(n);
  $("xpNum").textContent = (XP.total - ini) + " / " + (fin - ini) + " XP";
  $("xpBarra").style.width = Math.round(((XP.total - ini) / (fin - ini)) * 100) + "%";
  const reto = retoDeHoy();
  $("xpReto").textContent = (XP.retoHecho === hoyISO() ? "✅ " : "🎯 ") + "Reto de hoy: " + reto.t + (XP.retoHecho === hoyISO() ? "" : " (+50 XP)");
}

function verLogros() {
  const n = nivelDe(XP.total);
  const l = [
    "Nivel " + n + " · " + tituloNivel(n) + " · " + XP.total + " XP en total",
    "🔥 Racha: " + rachaEstudio() + " días",
    "🎯 Reto de hoy: " + retoDeHoy().t + (XP.retoHecho === hoyISO() ? " ✅" : ""),
    "",
    "Logros (" + Object.keys(XP.logros).length + "/" + LOGROS.length + "):",
    ...LOGROS.map((x) => (XP.logros[x.id] ? x.e + " " : "🔒 ") + x.t + " — " + x.d)
  ];
  decir("🏆 Tus logros", l.join("\n"), { voz: "Estás en el nivel " + n + "." });
}

async function ordenXP(texto) {
  const t = sinTildes(texto.trim());
  if (/^(mi nivel|mis logros|mis puntos|cuantos xp tengo|que nivel tengo|logros)$/.test(t)) { verLogros(); return true; }
  if (/^(reto (del|de) (dia|hoy)|cual es el reto)/.test(t)) { decir("🎯 Reto de hoy", retoDeHoy().t + (XP.retoHecho === hoyISO() ? "\n\n¡Ya lo has hecho! ✅" : "\n\nSi lo consigues: +50 XP."), {}); return true; }
  return false;
}


// ======== deberes.js ========
// 📋 Agenda de deberes: «tengo que entregar el trabajo de historia el jueves». Se apuntan también en el calendario.

const DEB = { lista: [] };
chrome.storage.local.get("deberes").then(({ deberes }) => { DEB.lista = Array.isArray(deberes) ? deberes : []; avisoDeberes(); });
const guardarDeberes = () => chrome.storage.local.set({ deberes: DEB.lista });
const pendientes = () => DEB.lista.filter((d) => !d.hecho).sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999"));

function cuandoEs(fecha) {
  if (!fecha) return "sin fecha";
  const hoy = hoyISO(), man = sumarDiasISO(1);
  if (fecha < hoy) return "⚠️ atrasado (" + new Date(fecha + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + ")";
  if (fecha === hoy) return "🔴 para HOY";
  if (fecha === man) return "🟠 para mañana";
  return new Date(fecha + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
}

async function anadirDeber(frase) {
  const r = await gemini(
    "Hoy es " + new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " (" + hoyISO() + "). " +
    "Saca el deber escolar de esta frase. Responde SOLO con JSON: {\"tarea\":\"texto corto\",\"asignatura\":\"asignatura o vacío\",\"fecha\":\"AAAA-MM-DD de entrega o vacío\"}. Frase: " + frase);
  const d = jsonDe(r);
  if (!d.tarea) throw new Error("No he pillado qué deber es. Prueba: «tengo que entregar el trabajo de historia el jueves».");
  const deber = { id: Date.now().toString(36), tarea: String(d.tarea).slice(0, 80), asignatura: String(d.asignatura || "").slice(0, 30), fecha: /^\d{4}-\d{2}-\d{2}$/.test(d.fecha || "") ? d.fecha : "", hecho: false };
  DEB.lista.push(deber);
  await guardarDeberes();
  if (deber.fecha) await calAnadirEventos([{ id: deber.id, fecha: deber.fecha, hora: "", titulo: ("📌 Entregar" + (deber.asignatura ? " " + deber.asignatura : "") + ": " + deber.tarea).slice(0, 60) }]);
  decir("📋 Deber apuntado", (deber.asignatura ? deber.asignatura + ": " : "") + deber.tarea + "\n" + cuandoEs(deber.fecha) +
    (deber.fecha ? "\n\nTambién está en tu calendario" + (scriptConectado() ? " (y te avisará en el móvil)." : ".") : ""), {
    voz: "Apuntado. " + deber.tarea + ", " + cuandoEs(deber.fecha).replace(/[^\wáéíóúñ ]/gi, ""),
    botones: [{ t: "📋 Ver todos", f: () => verDeberes() }]
  });
}

function verDeberes() {
  $("estudio").hidden = true;
  const p = pendientes();
  if (!p.length) {
    decir("📋 Deberes", "¡No tienes deberes pendientes! 🎉\n\nPara apuntar uno: «tengo que entregar el trabajo de historia el jueves».", {
      voz: "No tienes deberes pendientes.", botones: [{ t: "➕ Añadir", f: () => pedirDeber() }]
    });
    return;
  }
  decir("📋 Deberes pendientes (" + p.length + ")", p.map((d) => "• " + (d.asignatura ? d.asignatura + ": " : "") + d.tarea + " — " + cuandoEs(d.fecha)).join("\n") + "\n\nToca uno cuando lo termines:", {
    voz: p.length === 1 ? "Tienes un deber pendiente." : "Tienes " + p.length + " deberes pendientes.",
    botones: [...p.slice(0, 8).map((d) => ({ t: "✓ " + (d.tarea.length > 26 ? d.tarea.slice(0, 26) + "…" : d.tarea), f: () => marcarHecho(d.id) })), { t: "➕ Añadir", f: () => pedirDeber() }]
  });
}

async function marcarHecho(id) {
  const d = DEB.lista.find((x) => x.id === id);
  if (!d || d.hecho) return;
  d.hecho = true;
  d.hechoEl = hoyISO();
  await guardarDeberes();
  apuntarProgreso("deber", {});
  orb.setTinte("#3ddc97", 1500);
  verDeberes();
}

function pedirDeber() {
  decir("➕ Nuevo deber", "Dímelo como lo dirías: «trabajo de historia para el jueves», «ejercicios 3 y 4 de mates para mañana»…", {
    voz: false, campos: [{ id: "f", ph: "El deber y para cuándo" }], enviar: { t: "Apuntar", f: (v) => anadirDeber(v.f) }
  });
}

// Al abrir Jarvis, aviso de lo que vence hoy o mañana (una vez al día)
async function avisoDeberes() {
  const urgentes = pendientes().filter((d) => d.fecha && d.fecha <= sumarDiasISO(1));
  if (!urgentes.length) return;
  const { avisoDeberesDia } = await chrome.storage.local.get("avisoDeberesDia");
  if (avisoDeberesDia === hoyISO()) return;
  chrome.storage.local.set({ avisoDeberesDia: hoyISO() });
  setTimeout(() => {
    if (!$("reply").hidden) return;
    decir("📋 Ojo con los deberes", urgentes.map((d) => "• " + d.tarea + " — " + cuandoEs(d.fecha)).join("\n"), {
      voz: "Tienes " + (urgentes.length === 1 ? "un deber" : urgentes.length + " deberes") + " para entregar pronto.",
      botones: [{ t: "📋 Ver deberes", f: () => verDeberes() }]
    });
  }, 2500);
}

async function ordenDeberes(texto) {
  const t = sinTildes(texto.trim());
  if (/^(mis deberes|deberes|que (deberes )?tengo que (entregar|hacer)|deberes pendientes|que tengo pendiente)$/.test(t)) { verDeberes(); return true; }
  let m;
  if ((m = t.match(/^(?:ya )?(?:he hecho|he terminado|termine|he entregado|entregue|acabe|he acabado) (?:el |la |los |las )?(.+)$/))) {
    const palabras = m[1].split(/\s+/).filter((w) => w.length > 3);
    const d = pendientes().find((x) => palabras.some((w) => sinTildes(x.tarea + " " + x.asignatura).includes(w)));
    if (d) { await marcarHecho(d.id); return true; }
    return false;
  }
  if (/^(tengo que (entregar|hacer|presentar|terminar)|apunta (el|un|este) deber|deber(es)?:|para (manana|el lunes|el martes|el miercoles|el jueves|el viernes) tengo que)/.test(t) ||
      /(tengo|hay) que entregar/.test(t)) {
    await anadirDeber(texto);
    return true;
  }
  return false;
}


// ======== mapa.js ========
// 🧭 Mapa mental visual del tema: conceptos conectados alrededor de una idea central, en una pestaña.

const COLORES_MAPA = ["#5ee7ff", "#ffd166", "#ff5e8a", "#3ddc97", "#8b7bff", "#ff9f43", "#a3ff5e", "#c9a0ff"];

function partirEtiqueta(t, max = 18) {
  const w = String(t).split(/\s+/), l = [];
  let a = "";
  for (const x of w) { if ((a + " " + x).trim().length > max && a) { l.push(a); a = x; } else a = (a + " " + x).trim(); }
  if (a) l.push(a);
  return l.slice(0, 3);
}

function mapaSVG(m) {
  const W = 1500, H = 1050, cx = W / 2, cy = H / 2;
  const ramas = (m.ramas || []).slice(0, 8);
  let lineas = "", nodos = "";
  const nodo = (x, y, texto, color, tam, fuerte) => {
    const l = partirEtiqueta(texto, tam === 26 ? 16 : 20);
    const ancho = Math.max(...l.map((s) => s.length)) * tam * 0.56 + 28, alto = l.length * tam * 1.25 + 16;
    let s = `<rect x="${x - ancho / 2}" y="${y - alto / 2}" width="${ancho}" height="${alto}" rx="${alto / 2.4}" fill="${fuerte ? color : "#0b1020"}" stroke="${color}" stroke-width="${fuerte ? 0 : 2}"/>`;
    l.forEach((s2, i) => { s += `<text x="${x}" y="${y - (l.length - 1) * tam * 0.62 + i * tam * 1.25 + tam * 0.35}" font-size="${tam}" text-anchor="middle" fill="${fuerte ? "#03050b" : "#eef2ff"}" font-weight="${fuerte ? 700 : 500}">${escHTML(s2)}</text>`; });
    return s;
  };
  ramas.forEach((r, i) => {
    const color = COLORES_MAPA[i % COLORES_MAPA.length];
    const ang = (i / ramas.length) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(ang) * 300, y1 = cy + Math.sin(ang) * 240;
    lineas += `<path d="M${cx},${cy} Q${cx + Math.cos(ang) * 150},${cy + Math.sin(ang) * 60} ${x1},${y1}" stroke="${color}" stroke-width="5" fill="none" opacity=".85"/>`;
    const hijos = (r.h || []).slice(0, 5);
    hijos.forEach((h, k) => {
      const abanico = Math.min(1.05, 0.32 * hijos.length);
      const a2 = ang + (hijos.length === 1 ? 0 : (k / (hijos.length - 1) - 0.5) * abanico);
      const x2 = cx + Math.cos(a2) * 560, y2 = cy + Math.sin(a2) * 420;
      lineas += `<path d="M${x1},${y1} Q${(x1 + x2) / 2 + Math.cos(ang) * 30},${(y1 + y2) / 2 + Math.sin(ang) * 30} ${x2},${y2}" stroke="${color}" stroke-width="2.5" fill="none" opacity=".6"/>`;
      nodos += nodo(x2, y2, h, color, 17, false);
    });
    nodos += nodo(x1, y1, r.t, color, 21, true);
  });
  nodos += `<circle cx="${cx}" cy="${cy}" r="112" fill="url(#g)"/>` + nodo(cx, cy, m.centro || "Tema", "#ffffff", 26, false).replace(/fill="#0b1020"/, 'fill="none"').replace(/stroke="#ffffff" stroke-width="2"/, 'stroke="none"');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui,sans-serif"><defs><radialGradient id="g"><stop offset="0" stop-color="#8b7bff"/><stop offset="1" stop-color="#5ee7ff" stop-opacity=".25"/></radialGradient></defs>${lineas}${nodos}</svg>`;
}

function mapaHTML(m) {
  return "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Mapa mental · " + escHTML(m.centro || "") + "</title><style>" +
    "body{margin:0;background:radial-gradient(900px 600px at 50% 45%,rgba(94,231,255,.08),transparent 70%),#03050b;color:#eef2ff;font-family:system-ui,sans-serif}" +
    "h1{font-size:15px;letter-spacing:.25em;text-transform:uppercase;color:#5ee7ff;text-align:center;margin:18px 0 0}svg{display:block;width:100%;height:calc(100vh - 50px)}" +
    "@media print{body{background:#03050b;-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><h1>🧭 Mapa mental de Jarvis</h1>" + mapaSVG(m) + "</body></html>";
}

async function mapaMental(tema) {
  $("estudio").hidden = true;
  let contexto = "";
  if (!tema) {
    if (!necesitoMaterial()) return;
    contexto = "Material «" + EST.material.titulo + "»:\n" + EST.material.texto;
  }
  $("transcript").textContent = "Dibujando el mapa mental…";
  const r = await gemini(
    "Crea un mapa mental para estudiar " + (tema ? "el tema «" + tema + "»" : "este material") + ". Entre 4 y 7 ramas principales, cada una con 2 a 5 ideas hijas. Etiquetas MUY cortas (máximo 5 palabras). " +
    "Responde SOLO con JSON: {\"centro\":\"tema central\",\"ramas\":[{\"t\":\"rama\",\"h\":[\"idea\",\"idea\"]}]}", contexto);
  const m = jsonDe(r);
  if (!m.ramas || !m.ramas.length) throw new Error("No he podido hacer el mapa. Prueba otra vez.");
  const url = URL.createObjectURL(new Blob([mapaHTML(m)], { type: "text/html;charset=utf-8" }));
  chrome.tabs.create({ url });
  apuntarProgreso("mapa", {});
  decir("🧭 Mapa mental: " + m.centro, m.ramas.map((x) => "• " + x.t + ": " + (x.h || []).join(", ")).join("\n"), {
    voz: "Mapa mental listo. Te lo he abierto en una pestaña.",
    botones: [
      { t: "🧭 Abrir otra vez", f: () => chrome.tabs.create({ url: URL.createObjectURL(new Blob([mapaHTML(m)], { type: "text/html;charset=utf-8" })) }) },
      { t: "⬇️ Descargar", f: () => chrome.downloads.download({ url: URL.createObjectURL(new Blob([mapaHTML(m)], { type: "text/html;charset=utf-8" })), filename: "Jarvis/Mapas/" + (m.centro || "mapa").replace(/[^\wáéíóúñü -]/gi, "").slice(0, 50) + ".html", conflictAction: "uniquify" }) }
    ]
  });
}

async function ordenMapa(texto) {
  const t = texto.trim();
  const m = t.match(/^(?:hazme |haz |crea |dibuja |dibújame )?(?:un )?mapa mental(?: (?:de|sobre|del|de la) (.+))?$/i);
  if (!m) return false;
  const tema = m[1] && !/^(esto|esta p[aá]gina|el material|mis apuntes)$/i.test(m[1].trim()) ? m[1].trim() : "";
  if (!tema && !EST.material && /esta p[aá]gina|esto/i.test(t)) await materialDePagina();
  await mapaMental(tema);
  return true;
}


// ======== podcast.js ========
// 🎧 Pódcast del tema: dos presentadores (Ana y Leo) te explican tus apuntes para repasar escuchando.

const POD = { lineas: [], i: 0, activo: false, pausa: false, titulo: "" };

function vocesPodcast() {
  const v = speechSynthesis.getVoices().filter((x) => /^es/i.test(x.lang));
  const espana = v.filter((x) => /es-ES/i.test(x.lang));
  const lista = espana.length >= 2 ? espana : v;
  return { ana: lista[0] || null, leo: lista[1] || lista[0] || null, distintas: lista.length >= 2 };
}

function pintarPodcast() {
  const l = POD.lineas[POD.i] || { q: "", t: "" };
  decir("🎧 " + POD.titulo + " · " + Math.min(POD.i + 1, POD.lineas.length) + "/" + POD.lineas.length, (l.q === "ANA" ? "🎙️ Ana: " : "🎙️ Leo: ") + l.t, {
    voz: false,
    botones: [
      { t: POD.pausa ? "▶️ Seguir" : "⏸ Pausa", f: () => { POD.pausa ? reanudarPodcast() : pausarPodcast(); } },
      { t: "⏭ Saltar", f: () => { speechSynthesis.cancel(); } },
      { t: "⏹ Parar", f: () => pararPodcast() }
    ]
  });
}

function decirLinea() {
  if (!POD.activo || POD.pausa) return;
  if (POD.i >= POD.lineas.length) {
    POD.activo = false;
    estado("idle");
    apuntarProgreso("podcast", {});
    decir("🎧 Fin del pódcast", "¿Te ha quedado claro? Puedes hacer un test o repasar las tarjetas.", {
      voz: false, botones: [{ t: "✅ Test", f: () => crearTest() }, { t: "🔁 Escuchar otra vez", f: () => { POD.i = 0; POD.activo = true; decirLinea(); } }]
    });
    return;
  }
  const l = POD.lineas[POD.i];
  const v = vocesPodcast();
  const u = new SpeechSynthesisUtterance(l.t);
  u.lang = "es-ES";
  const esAna = l.q === "ANA";
  const voz = esAna ? v.ana : v.leo;
  if (voz) u.voice = voz;
  u.pitch = v.distintas ? 1 : esAna ? 1.25 : 0.8;   // con una sola voz, se distinguen por el tono
  u.rate = 1.03;
  u.onstart = () => estado("speaking");
  pintarPodcast();
  u.onend = () => { if (!POD.activo || POD.pausa) return; POD.i++; setTimeout(decirLinea, 250); };
  u.onerror = () => { if (POD.activo && !POD.pausa) { POD.i++; setTimeout(decirLinea, 250); } };
  speechSynthesis.speak(u);
}
function pausarPodcast() { POD.pausa = true; speechSynthesis.cancel(); estado("idle"); pintarPodcast(); }
function reanudarPodcast() { POD.pausa = false; decirLinea(); }
function pararPodcast() { POD.activo = false; POD.pausa = false; speechSynthesis.cancel(); estado("idle"); $("transcript").textContent = "Pódcast parado."; }

async function podcast(tema) {
  $("estudio").hidden = true;
  let contexto = "";
  if (!tema) {
    if (!necesitoMaterial()) return;
    contexto = "Material «" + EST.material.titulo + "»:\n" + EST.material.texto;
  }
  if (typeof liveActivo === "function" && liveActivo()) pararLive();
  $("transcript").textContent = "Escribiendo el guion del pódcast…";
  const r = await gemini(
    "Escribe el guion de un pódcast educativo en español de España para repasar " + (tema ? "el tema «" + tema + "»" : "este material") + ". " +
    "Dos presentadores: ANA (curiosa, hace preguntas que haría un estudiante) y LEO (experto, explica con ejemplos y trucos para recordar). " +
    "Entre 18 y 26 intervenciones cortas (máximo 2 frases cada una), tono ameno y cercano, con todos los datos clave del tema. Termina con un repaso rápido de las 3 ideas más importantes. " +
    "Responde SOLO con JSON: [{\"q\":\"ANA\",\"t\":\"…\"},{\"q\":\"LEO\",\"t\":\"…\"}]", contexto);
  const lineas = jsonDe(r).filter((x) => x && x.t).map((x) => ({ q: String(x.q).toUpperCase() === "ANA" ? "ANA" : "LEO", t: String(x.t).replace(/\*/g, "") }));
  if (!lineas.length) throw new Error("No he podido escribir el guion. Prueba otra vez.");
  Object.assign(POD, { lineas, i: 0, activo: true, pausa: false, titulo: tema || (EST.material ? EST.material.titulo : "Pódcast") });
  speechSynthesis.cancel();
  decirLinea();
}

async function ordenPodcast(texto) {
  const t = texto.trim();
  if (/^(para|pausa|det[eé]n) (el )?p[oó]dcast$/i.test(t)) { pararPodcast(); return true; }
  const m = t.match(/^(?:hazme |haz |crea |pon(?:me)? )?(?:un )?p[oó]dcast(?: (?:de|sobre|del|de la) (.+))?$/i);
  if (!m) return false;
  const tema = m[1] && !/^(esto|esta p[aá]gina|el material|mis apuntes)$/i.test(m[1].trim()) ? m[1].trim() : "";
  if (!tema && !EST.material && /esta p[aá]gina|esto/i.test(t)) await materialDePagina();
  await podcast(tema);
  return true;
}


// ======== mates.js ========
// 📈 Mates con gráficas: «dibuja y = x² − 4». Intérprete de fórmulas propio (no ejecuta código: solo calcula).

const FUNCS_MATES = {
  sin: Math.sin, sen: Math.sin, cos: Math.cos, tan: Math.tan, tg: Math.tan,
  asin: Math.asin, arcsen: Math.asin, acos: Math.acos, arccos: Math.acos, atan: Math.atan, arctg: Math.atan,
  sqrt: Math.sqrt, raiz: Math.sqrt, abs: Math.abs, log: Math.log10, ln: Math.log, exp: Math.exp
};

function compilarFormula(texto) {
  let s = String(texto).toLowerCase()
    .replace(/\s+/g, "").replace(/·|×/g, "*").replace(/÷/g, "/").replace(/−/g, "-")
    .replace(/²/g, "^2").replace(/³/g, "^3").replace(/π/g, "pi").replace(/√/g, "sqrt").replace(/,/g, ".")
    .replace(/^(y|f\(x\)|g\(x\))=/, "");
  // Separar en piezas
  const piezas = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) { let n = ""; while (i < s.length && /[0-9.]/.test(s[i])) n += s[i++]; piezas.push({ t: "num", v: parseFloat(n) }); continue; }
    if (/[a-z]/.test(c)) {
      let w = ""; while (i < s.length && /[a-z]/.test(s[i])) w += s[i++];
      // Palabras pegadas: «2xsin» → x, sin…
      while (w) {
        const f = Object.keys(FUNCS_MATES).sort((a, b) => b.length - a.length).find((k) => w.startsWith(k));
        if (f) { piezas.push({ t: "fun", v: f }); w = w.slice(f.length); }
        else if (w.startsWith("pi")) { piezas.push({ t: "num", v: Math.PI }); w = w.slice(2); }
        else if (w[0] === "e") { piezas.push({ t: "num", v: Math.E }); w = w.slice(1); }
        else if (w[0] === "x") { piezas.push({ t: "x" }); w = w.slice(1); }
        else throw new Error("No entiendo «" + w + "» en la fórmula.");
      }
      continue;
    }
    if ("+-*/^()".includes(c)) { piezas.push({ t: "op", v: c }); i++; continue; }
    throw new Error("No entiendo el símbolo «" + c + "».");
  }
  // Multiplicación implícita: 2x, x(…), )(…), 3sin…
  const conMult = [];
  piezas.forEach((p, k) => {
    const prev = conMult[conMult.length - 1];
    const finValor = prev && (prev.t === "num" || prev.t === "x" || (prev.t === "op" && prev.v === ")"));
    const iniValor = p.t === "num" || p.t === "x" || p.t === "fun" || (p.t === "op" && p.v === "(");
    if (finValor && iniValor) conMult.push({ t: "op", v: "*" });
    conMult.push(p);
  });
  // Shunting-yard → notación polaca inversa
  const PREC = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, "^": 4 };
  const salida = [], pila = [];
  let anterior = null;
  for (const p of conMult) {
    if (p.t === "num" || p.t === "x") salida.push(p);
    else if (p.t === "fun") pila.push(p);
    else if (p.v === "(") pila.push(p);
    else if (p.v === ")") {
      while (pila.length && pila[pila.length - 1].v !== "(") salida.push(pila.pop());
      if (!pila.length) throw new Error("Paréntesis sin abrir.");
      pila.pop();
      if (pila.length && pila[pila.length - 1].t === "fun") salida.push(pila.pop());
    } else {
      let op = p.v;
      const unario = op === "-" && (!anterior || (anterior.t === "op" && anterior.v !== ")"));
      if (op === "+" && (!anterior || (anterior.t === "op" && anterior.v !== ")"))) { anterior = p; continue; }
      if (unario) op = "neg";
      while (pila.length) {
        const top = pila[pila.length - 1];
        if (top.t !== "op" || top.v === "(") break;
        const pt = PREC[top.v], po = PREC[op];
        if (pt > po || (pt === po && op !== "^" && op !== "neg")) salida.push(pila.pop()); else break;
      }
      pila.push({ t: "op", v: op });
    }
    anterior = p;
  }
  while (pila.length) { const p = pila.pop(); if (p.v === "(") throw new Error("Falta cerrar un paréntesis."); salida.push(p); }
  const evaluar = (x) => {
    const st = [];
    for (const p of salida) {
      if (p.t === "num") st.push(p.v);
      else if (p.t === "x") st.push(x);
      else if (p.t === "fun" || p.v === "neg") {
        if (!st.length) throw new Error("La fórmula está incompleta.");
        st.push(p.t === "fun" ? FUNCS_MATES[p.v](st.pop()) : -st.pop());
      }
      else { if (st.length < 2) throw new Error("La fórmula está incompleta."); const b = st.pop(), a = st.pop(); st.push(p.v === "+" ? a + b : p.v === "-" ? a - b : p.v === "*" ? a * b : p.v === "/" ? a / b : Math.pow(a, b)); }
    }
    if (st.length !== 1) throw new Error("La fórmula está incompleta.");
    return st[0];
  };
  evaluar(1.2345);
  return evaluar;
}

const COLORES_GRAF = ["#5ee7ff", "#ff5e8a", "#ffd166", "#3ddc97"];

function graficaSVG(funciones, x0, x1, ancho = 380, alto = 300) {
  const N = 600, puntos = funciones.map((f) => { const p = []; for (let i = 0; i <= N; i++) { const x = x0 + (i / N) * (x1 - x0); let y; try { y = f.fn(x); } catch (e) { y = NaN; } p.push([x, y]); } return p; });
  const ys = puntos.flat().map((p) => p[1]).filter((y) => isFinite(y)).sort((a, b) => a - b);
  let y0 = ys.length ? ys[Math.floor(ys.length * 0.03)] : -10, y1 = ys.length ? ys[Math.floor(ys.length * 0.97)] : 10;
  if (y1 - y0 < 1e-6) { y0 -= 2; y1 += 2; }
  const pad = (y1 - y0) * 0.12; y0 -= pad; y1 += pad;
  if (y0 > 0) y0 = Math.min(y0, -(y1 - y0) * 0.08); if (y1 < 0) y1 = Math.max(y1, (y1 - y0) * 0.08);
  const X = (x) => ((x - x0) / (x1 - x0)) * ancho, Y = (y) => alto - ((y - y0) / (y1 - y0)) * alto;
  const paso = (r) => { const b = Math.pow(10, Math.floor(Math.log10(r / 6))); return [1, 2, 5, 10].map((k) => k * b).find((k) => r / k <= 10); };
  const px = paso(x1 - x0), py = paso(y1 - y0);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" style="width:100%;background:#070b17;border-radius:12px" font-family="system-ui" font-size="9">`;
  for (let x = Math.ceil(x0 / px) * px; x <= x1; x += px) svg += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${alto}" stroke="#ffffff10"/>` + (Math.abs(x) > 1e-9 ? `<text x="${X(x) + 2}" y="${Math.min(alto - 3, Math.max(10, Y(0) + 10))}" fill="#8a93ad">${+x.toFixed(6)}</text>` : "");
  for (let y = Math.ceil(y0 / py) * py; y <= y1; y += py) svg += `<line x1="0" y1="${Y(y)}" x2="${ancho}" y2="${Y(y)}" stroke="#ffffff10"/>` + (Math.abs(y) > 1e-9 ? `<text x="${Math.min(ancho - 22, Math.max(2, X(0) + 3))}" y="${Y(y) - 2}" fill="#8a93ad">${+y.toFixed(6)}</text>` : "");
  svg += `<line x1="0" y1="${Y(0)}" x2="${ancho}" y2="${Y(0)}" stroke="#8a93ad" stroke-width="1.2"/><line x1="${X(0)}" y1="0" x2="${X(0)}" y2="${alto}" stroke="#8a93ad" stroke-width="1.2"/>`;
  const marcas = [];
  puntos.forEach((p, k) => {
    const c = COLORES_GRAF[k % COLORES_GRAF.length];
    let d = "", dentro = false;
    p.forEach(([x, y], i) => {
      const ok = isFinite(y) && Y(y) > -alto && Y(y) < alto * 2;
      const salto = i > 0 && isFinite(p[i - 1][1]) && Math.abs(Y(y) - Y(p[i - 1][1])) > alto * 0.8;
      if (ok && !salto) { d += (dentro ? "L" : "M") + X(x).toFixed(1) + "," + Y(y).toFixed(1); dentro = true; } else dentro = ok ? (d += "M" + X(x).toFixed(1) + "," + Y(y).toFixed(1), true) : false;
      // Cortes con el eje X (cambio de signo)
      if (i > 0 && isFinite(y) && isFinite(p[i - 1][1]) && Math.sign(y) !== Math.sign(p[i - 1][1]) && !salto) {
        let a = p[i - 1][0], b = x;
        for (let r = 0; r < 40; r++) { const m = (a + b) / 2; if (Math.sign(funciones[k].fn(m)) === Math.sign(funciones[k].fn(a))) a = m; else b = m; }
        const raiz = (a + b) / 2;
        const repetida = marcas.some((m) => m.c === c && Math.abs(m.x - raiz) < (x1 - x0) / 150);
        if (!repetida && marcas.length < 12) marcas.push({ x: raiz, y: 0, c, txt: "x=" + +raiz.toFixed(2) });
      }
    });
    svg += `<path d="${d}" fill="none" stroke="${c}" stroke-width="2.2"/>`;
    try { const c0 = funciones[k].fn(0); if (isFinite(c0) && x0 <= 0 && x1 >= 0) marcas.push({ x: 0, y: c0, c, txt: "y=" + +c0.toFixed(2) }); } catch (e) {}
  });
  marcas.forEach((m) => { svg += `<circle cx="${X(m.x)}" cy="${Y(m.y)}" r="3.5" fill="${m.c}" stroke="#03050b"/><text x="${X(m.x) + 5}" y="${Y(m.y) - 5}" fill="${m.c}" font-weight="600">${m.txt}</text>`; });
  funciones.forEach((f, k) => { svg += `<text x="8" y="${14 + k * 13}" fill="${COLORES_GRAF[k % COLORES_GRAF.length]}" font-size="11" font-weight="700">y = ${escHTML(f.texto)}</text>`; });
  return svg + "</svg>";
}

async function graficar(peticion) {
  let rango = [-10, 10];
  const r = peticion.match(/(?:de|desde|entre)\s*(-?\d+(?:[.,]\d+)?)\s*(?:a|hasta|y)\s*(-?\d+(?:[.,]\d+)?)/i);
  if (r) { rango = [parseFloat(r[1].replace(",", ".")), parseFloat(r[2].replace(",", "."))]; peticion = peticion.replace(r[0], ""); }
  const textos = peticion.replace(/^(?:dibuja(?:me)?|grafica|representa|pinta|haz(?:me)? la gr[aá]fica de|gr[aá]fica de)\s*/i, "")
    .split(/\s+y\s+(?=[yf]\s*(?:\(x\))?\s*=)|;|\s+e\s+(?=y\s*=)/i).map((x) => x.trim().replace(/\.$/, "")).filter(Boolean).slice(0, 4);
  const funciones = textos.map((t) => ({ texto: t.replace(/^(y|f\(x\)|g\(x\))\s*=\s*/i, ""), fn: compilarFormula(t) }));
  if (!funciones.length) throw new Error("Dime la función, por ejemplo: «dibuja y = x^2 - 4».");
  const caja = document.createElement("div");
  caja.innerHTML = graficaSVG(funciones, Math.min(...rango), Math.max(...rango));
  decir("📈 " + funciones.map((f) => "y = " + f.texto).join("  ·  "), "Analizando la función…", { voz: false, nodo: caja });
  apuntarProgreso("grafica", {});
  const g = await gemini("Analiza para un estudiante, paso a paso y breve, " + (funciones.length > 1 ? "estas funciones" : "esta función") + ": " +
    funciones.map((f) => "y = " + f.texto).join("; ") + ". Incluye tipo de función, dominio, cortes con los ejes, vértice o extremos, crecimiento y asíntotas si las hay" +
    (funciones.length > 1 ? ", y dónde se cortan entre sí" : "") + ". Texto plano, sin LaTeX.");
  const grande = document.createElement("div");
  grande.innerHTML = graficaSVG(funciones, Math.min(...rango), Math.max(...rango));
  decir("📈 " + funciones.map((f) => "y = " + f.texto).join("  ·  "), g, {
    voz: false, nodo: grande,
    botones: [{ t: "🔍 Ver grande", f: () => chrome.tabs.create({ url: URL.createObjectURL(new Blob(["<!doctype html><meta charset='utf-8'><title>Gráfica</title><body style='margin:0;background:#03050b;display:grid;place-items:center;height:100vh'><div style='width:min(96vw,150vh)'>" + graficaSVG(funciones, Math.min(...rango), Math.max(...rango), 900, 600) + "</div></body>"], { type: "text/html;charset=utf-8" })) }) }]
  });
}

async function ordenMates(texto) {
  const t = texto.trim();
  if (/^(?:dibuja(?:me)?|grafica|representa|pinta|haz(?:me)? la gr[aá]fica de|gr[aá]fica de)\s+.*(?:x|=)/i.test(t)) { await graficar(t); return true; }
  return false;
}
function pedirGrafica() {
  $("estudio").hidden = true;
  decir("📈 Gráficas", "Escribe la función. Ejemplos: «y = x^2 - 4», «y = 2sin(x)», «y = 1/x de -5 a 5». Puedes poner varias separadas por «;».", {
    voz: false, campos: [{ id: "f", ph: "y = x^2 - 4" }], enviar: { t: "Dibujar", f: (v) => graficar("dibuja " + v.f) }
  });
}


// ======== hacker.js ========
// Funciones «hacker» de seguridad: todo sobre tu propio navegador o con información pública.

const RASTREADORES = [
  [/google-analytics|googletagmanager|analytics\.google/, "Google Analytics"],
  [/doubleclick|googlesyndication|googleadservices|adservice\.google/, "Google Ads"],
  [/facebook\.net|connect\.facebook|facebook\.com/, "Meta (Facebook/Instagram)"],
  [/tiktok/, "TikTok"],
  [/hotjar/, "Hotjar (graba lo que haces)"],
  [/clarity\.ms/, "Microsoft Clarity (graba lo que haces)"],
  [/bat\.bing/, "Microsoft Ads"],
  [/criteo/, "Criteo"], [/taboola/, "Taboola"], [/outbrain/, "Outbrain"],
  [/amazon-adsystem/, "Amazon Ads"], [/adnxs/, "Xandr"],
  [/scorecardresearch/, "Comscore"], [/quantserve|quantcount/, "Quantcast"],
  [/ads-twitter|analytics\.twitter/, "X (Twitter) Ads"],
  [/licdn|linkedin/, "LinkedIn"], [/pinimg|ct\.pinterest/, "Pinterest"], [/sc-static|snapchat/, "Snapchat"],
  [/yandex/, "Yandex"], [/segment\.(io|com)/, "Segment"], [/mixpanel/, "Mixpanel"], [/amplitude/, "Amplitude"],
  [/hs-scripts|hs-analytics|hubspot/, "HubSpot"], [/rubiconproject/, "Rubicon"], [/pubmatic/, "PubMatic"],
  [/smartadserver/, "Smart AdServer"], [/teads/, "Teads"], [/chartbeat/, "Chartbeat"]
];
const TLD_RAROS = /\.(xyz|top|click|buzz|icu|cyou|rest|monster|sbs|cfd|lol|quest|zip|mov|gq|tk|ml|cf|ga)$/i;
const MARCAS = /(amazon|paypal|santander|bbva|caixa|correos|apple|microsoft|netflix|dgt|agenciatributaria|seg-social|ing|revolut|bizum|whatsapp|instagram)/i;


const dominioBase = (h) => {
  const p = h.replace(/^www\./, "").split(".");
  if (p.length > 2 && /^(com|co|org|net|gob|edu|ac|gov|nom)$/.test(p[p.length - 2]) && p[p.length - 1].length === 2) return p.slice(-3).join(".");
  return p.slice(-2).join(".");
};
const fechaCorta = (d) => d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

// Señales de peligro de un dominio (las mismas que usa el escáner)
function riesgos(dominio, https) {
  const avisos = [];
  if (!https) avisos.push("La conexión NO está cifrada (sin https).");
  if (TLD_RAROS.test(dominio)) avisos.push("Usa un dominio raro (." + dominio.split(".").pop() + "), típico de webs falsas.");
  if ((dominio.match(/-/g) || []).length >= 3 || /\d{3,}/.test(dominio)) avisos.push("El nombre del dominio es sospechoso.");
  const marca = dominio.match(MARCAS);
  if (marca && !new RegExp("(^|\\.)" + marca[1] + "\\.(com|es|org|net|gob\\.es|gov|de|fr|it|co\\.uk)$", "i").test(dominio)) {
    avisos.push("Usa el nombre de «" + marca[1] + "» pero no es su web oficial.");
  }
  const nivel = avisos.length >= 2 ? "🚨 Peligroso" : avisos.length === 1 ? "⚠️ Cuidado" : "✅ Parece seguro";
  return { avisos, nivel };
}

async function pestanaWeb() {
  const tab = await pestanaActual();
  if (!/^https?:/.test(tab.url || "")) throw new Error("Abre una web normal para usar esto.");
  return tab;
}

// ================== FICHA DEL DOMINIO ==================
// Saca una dirección web escrita en la orden («ficha de marca.com»)
function urlEnTexto(t) {
  const m = String(t || "").match(/(https?:\/\/[^\s]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i);
  if (!m) return "";
  return /^https?:/i.test(m[1]) ? m[1] : "https://" + m[1];
}
async function urlObjetivo(texto) {
  const u = urlEnTexto(texto);
  if (u) return u;
  return (await pestanaWeb()).url;
}

async function fichaDominio(texto) {
  const host = new URL(await urlObjetivo(texto)).hostname;
  const base = dominioBase(host);
  $("transcript").textContent = "Investigando " + base + "…";
  estado("thinking");
  orb.setTinte("#5ee7ff", 3000);
  const json = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const dns = await json("https://dns.google/resolve?name=" + encodeURIComponent(host) + "&type=A");
  const ip = ((dns && dns.Answer) || []).filter((a) => a.type === 1).map((a) => a.data)[0] || "";
  const [geo, rdap] = await Promise.all([ip ? json("https://ipwho.is/" + ip) : null, json("https://rdap.org/domain/" + base)]);

  const l = [];
  l.push("🌐 Dominio: " + base);
  l.push("📍 IP: " + (ip || "no la encuentro"));
  if (geo && geo.success) {
    l.push("🗺️ Servidor en: " + [(geo.flag && geo.flag.emoji) || "", geo.city, geo.country].filter(Boolean).join(" "));
    if (geo.connection) l.push("🏢 Hosting: " + (geo.connection.org || geo.connection.isp || "desconocido"));
  }
  let aviso = "";
  if (rdap && rdap.events) {
    const creado = rdap.events.find((e) => e.eventAction === "registration");
    const caduca = rdap.events.find((e) => e.eventAction === "expiration");
    if (creado) {
      const f = new Date(creado.eventDate);
      const meses = Math.floor((Date.now() - f) / (30.4 * 864e5));
      l.push("📅 Creado: " + fechaCorta(f) + " (" + (meses >= 24 ? Math.floor(meses / 12) + " años" : meses + " meses") + ")");
      if (meses < 6) aviso = "⚠️ Es una web muy nueva: muchas estafas tienen dominios de pocos meses.";
    }
    if (caduca) l.push("⏳ Caduca: " + fechaCorta(new Date(caduca.eventDate)));
    const reg = (rdap.entities || []).find((e) => (e.roles || []).includes("registrar"));
    const nom = reg && reg.vcardArray && (reg.vcardArray[1] || []).find((x) => x[0] === "fn");
    if (nom) l.push("🧾 Registrado con: " + nom[3]);
  } else {
    l.push("📅 Fecha de creación: no disponible para este tipo de dominio" + (base.endsWith(".es") ? " (.es no la publica)" : "") + ".");
  }
  if (aviso) { l.push("", aviso); orb.setTinte("#ff5e8a", 4000); }
  decir("🕵️ Ficha de " + host, l.join("\n"), { voz: "Ficha del dominio lista." + (aviso ? " Ojo, es una web muy nueva." : "") });
}

// ================== LO QUE OCULTA LA WEB ==================
function ocultoEnPagina() {
  const ocultos = [...document.querySelectorAll('input[type="hidden"]')].slice(0, 25)
    .map((i) => (i.name || i.id || "(sin nombre)") + " = " + ((i.value || "").length > 40 ? i.value.slice(0, 40) + "…" : i.value || "(vacío)"));
  const coms = [];
  const tw = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
  let n;
  while ((n = tw.nextNode()) && coms.length < 20) {
    const t = n.nodeValue.trim().replace(/\s+/g, " ");
    if (t.length > 3) coms.push(t.length > 140 ? t.slice(0, 140) + "…" : t);
  }
  const metas = [...document.querySelectorAll("meta[name], meta[property]")].slice(0, 20)
    .map((m) => (m.getAttribute("name") || m.getAttribute("property")) + ": " + (m.content || "").slice(0, 90));
  let invisibles = 0;
  document.querySelectorAll("body *").forEach((el) => {
    if (el.children.length === 0 && el.textContent.trim().length > 20) {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") invisibles++;
    }
  });
  return { origen: location.origin, ocultos, coms, metas, invisibles };
}

async function loQueOculta() {
  $("transcript").textContent = "Buscando lo que esconde la web…";
  estado("thinking");
  orb.setTinte("#8b7bff", 3000);
  enPagina(lineaEscaneoEnPagina, ["#8b7bff"]).catch(() => {});
  const d = await enPagina(ocultoEnPagina);
  const texto = (u) => fetch(u).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  const [robots, sitemap] = await Promise.all([texto(d.origen + "/robots.txt"), texto(d.origen + "/sitemap.xml")]);
  const prohibidas = robots.split("\n").filter((x) => /^disallow:\s*\S/i.test(x)).map((x) => x.replace(/^disallow:\s*/i, "").trim());
  const paginas = (sitemap.match(/<loc>/g) || []).length;
  const l = [];
  l.push("🙈 Textos escondidos en la página: " + d.invisibles);
  l.push("", "🔒 Campos ocultos (" + d.ocultos.length + "):", ...(d.ocultos.length ? d.ocultos.map((x) => "  • " + x) : ["  ninguno"]));
  l.push("", "💬 Comentarios en el código (" + d.coms.length + "):", ...(d.coms.length ? d.coms.map((x) => "  • " + x) : ["  ninguno"]));
  l.push("", "🚫 Zonas que pide no mirar a Google (robots.txt): " + prohibidas.length, ...prohibidas.slice(0, 15).map((x) => "  • " + x));
  l.push("", "🗺️ Mapa del sitio: " + (paginas ? paginas + " páginas listadas" : "no tiene o no es público"));
  l.push("", "🏷️ Metadatos (" + d.metas.length + "):", ...d.metas.map((x) => "  • " + x));
  const botones = [];
  if (robots) botones.push({ t: "Ver robots.txt", f: () => chrome.tabs.create({ url: d.origen + "/robots.txt" }) });
  if (paginas) botones.push({ t: "Ver mapa del sitio", f: () => chrome.tabs.create({ url: d.origen + "/sitemap.xml" }) });
  decir("🔦 Lo que oculta la web", l.join("\n"), { botones, voz: `He encontrado ${d.ocultos.length} campos ocultos, ${d.coms.length} comentarios y ${prohibidas.length} zonas prohibidas.` });
}

// ================== RADAR DE CONEXIONES ==================
let radar = null;
function radarPintar() {
  if (!radar) return;
  clearTimeout(radar.pintarT);
  radar.pintarT = setTimeout(() => {
    if (!radar) return;
    const filas = [...radar.hosts.entries()].sort((a, b) => b[1].ult - a[1].ult).slice(0, 22);
    const rastreos = [...radar.hosts.values()].filter((x) => x.rastreador).length;
    $("rtitle").textContent = `📡 Radar · ${radar.total} conexiones · ${radar.hosts.size} servidores`;
    $("rtext").textContent =
      (rastreos ? `⚠️ ${rastreos} rastreadores detectados\n\n` : "") +
      (filas.length ? filas.map(([h, x]) => (Date.now() - x.ult < 1500 ? "● " : "○ ") + h + "  ×" + x.n + (x.rastreador ? "  ⚠️ " + x.rastreador : "")).join("\n")
        : "Esperando conexiones… navega o recarga la página.");
  }, 250);
}
async function radarIniciar() {
  if (radar) return radarParar();
  const tab = await pestanaWeb();
  if (!chrome.webRequest) throw new Error("El radar necesita el permiso de conexiones. Revisa que manifest.json sea el nuevo (versión 2.2.0) y pulsa ↻ en Jarvis.");
  const nuevo = { tabId: tab.id, hosts: new Map(), total: 0 };
  radar = nuevo;
  radar.oyente = (d) => {
    if (!radar || d.tabId !== radar.tabId) return;
    let h;
    try { h = new URL(d.url).hostname; } catch (e) { return; }
    const x = radar.hosts.get(h) || { n: 0, rastreador: (RASTREADORES.find(([re]) => re.test(h)) || [])[1] || "" };
    x.n++; x.ult = Date.now();
    radar.hosts.set(h, x);
    radar.total++;
    orb.setTinte(x.rastreador ? "#ff5e8a" : "#3ddc97", 350);
    radarPintar();
  };
  try {
    chrome.webRequest.onCompleted.addListener(nuevo.oyente, { urls: ["<all_urls>"], tabId: tab.id });
  } catch (e) {
    radar = null;
    throw new Error("No he podido arrancar el radar: " + e.message);
  }
  decir("📡 Radar activado", "Esperando conexiones… navega o recarga la página.", {
    botones: [
      { t: "🔄 Recargar y vigilar", f: () => chrome.tabs.reload(tab.id) },
      { t: "⏹ Parar radar", f: () => radarParar() }
    ],
    voz: "Radar activado."
  });
}
function radarParar() {
  if (!radar) return;
  try { chrome.webRequest.onCompleted.removeListener(radar.oyente); } catch (e) {}
  const r = radar;
  radar = null;
  $("transcript").textContent = `Radar parado: ${r.total} conexiones a ${r.hosts.size} servidores.`;
}
$("rclose").addEventListener("click", radarParar);

// ================== MÁQUINA DEL TIEMPO ==================
async function maquinaTiempo(texto) {
  const url = await urlObjetivo(texto);
  estado("thinking");
  $("transcript").textContent = "Viajando en el tiempo…";
  orb.setTinte("#ffb547", 3000);
  const pedir = async (ts) => {
    try {
      const r = await fetch("https://archive.org/wayback/available?url=" + encodeURIComponent(url) + (ts ? "&timestamp=" + ts : ""));
      const j = await r.json();
      return j.archived_snapshots && j.archived_snapshots.closest && j.archived_snapshots.closest.available ? j.archived_snapshots.closest : null;
    } catch (e) { return null; }
  };
  const fecha = (ts) => ts.slice(6, 8) + "/" + ts.slice(4, 6) + "/" + ts.slice(0, 4);
  const anio = (texto.match(/\b(199\d|20[0-2]\d)\b/) || [])[1];
  if (anio) {
    const s = await pedir(anio + "0101");
    if (!s) throw new Error("No hay copias guardadas de esta web.");
    chrome.tabs.create({ url: s.url });
    decir("🕰️ Máquina del tiempo", "Abriendo la copia más cercana a " + anio + ": " + fecha(s.timestamp) + ".");
    return;
  }
  const ahora = new Date().getFullYear();
  const tiempos = [["La más antigua", "19960101"], ["Hace 10 años", ahora - 10 + "0101"], ["Hace 5 años", ahora - 5 + "0101"], ["Hace 1 año", ahora - 1 + "0101"]];
  const copias = await Promise.all(tiempos.map(([, ts]) => pedir(ts)));
  const vistas = new Set();
  const botones = [];
  copias.forEach((s, i) => {
    if (!s || vistas.has(s.timestamp)) return;
    vistas.add(s.timestamp);
    botones.push({ t: "🕰️ " + tiempos[i][0] + " (" + fecha(s.timestamp) + ")", f: () => chrome.tabs.create({ url: s.url }) });
  });
  if (!botones.length) throw new Error("Internet Archive no tiene copias guardadas de esta página.");
  decir("🕰️ Máquina del tiempo", "Copias guardadas de esta página en Internet Archive. Elige a qué época viajar.\nTambién puedes decir «cómo era esta web en 2015».", { botones, voz: "Elige a qué época quieres viajar." });
}

// ================== CONTRASEÑAS ==================
async function comprobarFiltrada(clave) {
  if (!clave) return;
  estado("thinking");
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(clave));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  // Solo se envían los 5 primeros caracteres del código: la contraseña nunca sale del ordenador.
  const r = await fetch("https://api.pwnedpasswords.com/range/" + hex.slice(0, 5));
  if (!r.ok) throw new Error("No he podido consultar la base de filtraciones.");
  const linea = (await r.text()).split("\n").find((l) => l.startsWith(hex.slice(5)));
  const veces = linea ? +linea.split(":")[1] : 0;
  if (veces) {
    orb.setTinte("#ff5e8a", 5000);
    decir("🚨 Contraseña filtrada", `Esta contraseña aparece ${veces.toLocaleString("es-ES")} veces en filtraciones de datos.\n\nCámbiala en todas las webs donde la uses. Pulsa abajo para generar una segura.`,
      { botones: [{ t: "🔑 Generar una segura", f: () => mostrarClaveNueva(20) }], voz: "Cuidado. Esa contraseña está filtrada." });
  } else {
    orb.setTinte("#3ddc97", 3000);
    decir("✅ No filtrada", "Esta contraseña no aparece en ninguna filtración conocida.\n\nAun así, no la repitas en varias webs.", { voz: "Esa contraseña no aparece en ninguna filtración." });
  }
}
function pedirContrasenaFiltrada() {
  decir("🔐 ¿Contraseña filtrada?", "Escríbela aquí (no la digas en voz alta). No se guarda, y no se envía: solo un trozo cifrado de 5 letras.", {
    voz: false,
    campos: [{ id: "pwFiltrada", tipo: "password", ph: "Contraseña a comprobar" }],
    enviar: { t: "Comprobar", f: (v) => comprobarFiltrada(v.pwFiltrada) }
  });
}

function generarClave(n) {
  const C = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?-_=+";
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return [...a].map((x) => C[x % C.length]).join("");
}
function mostrarClaveNueva(n) {
  const clave = generarClave(n);
  decir("🔑 Contraseña nueva", clave + "\n\n" + n + " caracteres. Se tardarían millones de años en adivinarla.", {
    voz: false,
    botones: [
      { t: "📋 Copiar", f: () => copiar(clave, "Contraseña") },
      { t: "🔄 Otra", f: () => mostrarClaveNueva(n) },
      { t: n < 32 ? "Más larga" : "Más corta", f: () => mostrarClaveNueva(n < 32 ? 32 : 16) }
    ]
  });
}

function contrasenasEnPagina() {
  const campos = [...document.querySelectorAll('input[type="password"], input[data-jarvis-pw]')];
  if (!campos.length) return -1;
  const mostrar = campos.some((c) => c.type === "password");
  campos.forEach((c) => {
    if (mostrar) { c.dataset.jarvisPw = "1"; c.type = "text"; c.style.outline = "2px solid #ff5e8a"; }
    else { c.type = "password"; c.style.outline = ""; delete c.dataset.jarvisPw; }
  });
  return mostrar ? campos.length : 0;
}
async function verContrasena() {
  const n = await enPagina(contrasenasEnPagina);
  if (n === -1) throw new Error("No hay campos de contraseña en esta página.");
  $("transcript").textContent = n ? "Contraseña visible 👁️ (vuelve a pedirlo para ocultarla)" : "Contraseña oculta otra vez";
  estado("idle");
}

// ================== DESENMASCARAR ENLACES ==================
async function desenmascarar(url) {
  if (!ES_EXT) throw new Error("Desenmascarar enlaces solo funciona en la extensión de Chrome (la web no puede seguir enlaces de otras webs).");
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  $("transcript").textContent = "Siguiendo el enlace…";
  estado("thinking");
  let final = url;
  try {
    let r = await fetch(url, { method: "HEAD", redirect: "follow", credentials: "omit" });
    if (r.status === 405 || r.status === 403) r = await fetch(url, { redirect: "follow", credentials: "omit" });
    final = r.url || url;
  } catch (e) {
    try { final = (await fetch(url, { redirect: "follow", credentials: "omit" })).url || url; }
    catch (e2) { throw new Error("No he podido seguir ese enlace: puede que la web no exista."); }
  }
  const u = new URL(final);
  const { avisos, nivel } = riesgos(u.hostname, u.protocol === "https:");
  if (avisos.length) orb.setTinte("#ff5e8a", 4000);
  const cambia = new URL(url).hostname !== u.hostname;
  decir("🔎 Enlace desenmascarado",
    `Pone: ${url}\nLleva a: ${final}\n\n${nivel}${cambia ? "\nTe redirige a otra web distinta." : ""}${avisos.length ? "\n" + avisos.map((a) => "• " + a).join("\n") : ""}`,
    { botones: [{ t: avisos.length ? "Abrir de todas formas" : "Abrir", f: () => chrome.tabs.create({ url: final }) }], voz: "Lleva a " + u.hostname + ". " + nivel.replace(/^\S+\s/, "") + "." });
}
function pedirEnlace() {
  decir("🔎 Desenmascarar enlace", "Pega el enlace sospechoso. También puedes pulsar el botón derecho sobre cualquier enlace y elegir «¿Adónde lleva este enlace?».", {
    voz: false,
    campos: [{ id: "enlaceRaro", tipo: "text", ph: "https://bit.ly/…" }],
    enviar: { t: "Desenmascarar", f: (v) => desenmascarar(v.enlaceRaro) }
  });
}

// ================== ARMADURA DE LA WEB ==================
async function armadura() {
  const tab = await pestanaWeb();
  $("transcript").textContent = "Revisando la armadura…";
  estado("thinking");
  let r;
  try { r = await fetch(tab.url, { redirect: "follow", credentials: "omit", cache: "no-store" }); }
  catch (e) { throw new Error("La web no me deja revisarla."); }
  const h = (k) => r.headers.get(k) || "";
  const csp = h("content-security-policy");
  const puntos = [
    ["Conexión cifrada (https)", new URL(r.url).protocol === "https:", 2, "Sin https, cualquiera en tu wifi puede ver lo que envías."],
    ["Obliga a usar https (HSTS)", !!h("strict-transport-security"), 2, "Podrían colarte la versión sin cifrar."],
    ["Escudo contra código inyectado (CSP)", !!csp, 2, "Más expuesta a que le metan código malicioso."],
    ["Escudo contra clics trampa", !!h("x-frame-options") || /frame-ancestors/.test(csp), 1.5, "Otra web podría meterla dentro y engañarte para hacer clic."],
    ["Bloqueo de archivos disfrazados", /nosniff/i.test(h("x-content-type-options")), 1, ""],
    ["Controla qué comparte al salir (Referrer)", !!h("referrer-policy"), 0.75, ""],
    ["Controla cámara y micro (Permissions)", !!h("permissions-policy"), 0.75, ""]
  ];
  const nota = Math.round(puntos.reduce((s, p) => s + (p[1] ? p[2] : 0), 0) * 10) / 10;
  const color = nota >= 7 ? "#3ddc97" : nota >= 4 ? "#ffb547" : "#ff5e8a";
  orb.setTinte(color, 4000);
  const l = [`Nota: ${nota} / 10 ${nota >= 7 ? "🛡️ Bien protegida" : nota >= 4 ? "⚠️ Protección media" : "🚨 Poco protegida"}`, ""];
  puntos.forEach(([n, ok, , por]) => l.push((ok ? "✅ " : "❌ ") + n + (!ok && por ? "\n     " + por : "")));
  if (h("server")) l.push("", "Servidor: " + h("server"));
  decir("🛡️ Armadura · " + new URL(r.url).hostname, l.join("\n"), { voz: "La armadura de esta web tiene un " + String(nota).replace(".", ",") + " sobre 10." });
}

// ================== MENSAJES CIFRADOS ==================
const aB64 = (u8) => { let s = ""; u8.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function claveDe(pass, sal) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: sal, iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function cifrar(texto, pass) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await claveDe(pass, sal), new TextEncoder().encode(texto)));
  const todo = new Uint8Array(28 + c.length);
  todo.set(sal); todo.set(iv, 16); todo.set(c, 28);
  return "🔒JARVIS:" + aB64(todo);
}
async function descifrar(paquete, pass) {
  const todo = deB64(paquete.replace(/^[\s\S]*?JARVIS:/, "").replace(/\s+/g, ""));
  const p = await crypto.subtle.decrypt({ name: "AES-GCM", iv: todo.slice(16, 28) }, await claveDe(pass, todo.slice(0, 16)), todo.slice(28));
  return new TextDecoder().decode(p);
}
function pedirCifrar(texto = "") {
  decir("🔒 Mensaje cifrado", "Escribe el mensaje y una clave. Solo quien tenga la clave podrá leerlo con Jarvis.", {
    voz: false,
    campos: [{ id: "msgCifrar", tipo: "area", ph: "Mensaje secreto", valor: texto }, { id: "claveCifrar", tipo: "password", ph: "Clave" }],
    enviar: {
      t: "Cifrar", f: async (v) => {
        if (!v.msgCifrar || !v.claveCifrar) throw new Error("Pon el mensaje y la clave.");
        const c = await cifrar(v.msgCifrar, v.claveCifrar);
        decir("🔒 Mensaje cifrado", c + "\n\nCópialo y mándalo. Para leerlo: «Jarvis, descifra» y la misma clave.", {
          voz: false, botones: [{ t: "📋 Copiar", f: () => copiar(c, "Mensaje cifrado") }]
        });
      }
    }
  });
}
function pedirDescifrar(texto = "") {
  decir("🔓 Descifrar mensaje", "Pega el mensaje que empieza por 🔒JARVIS: y escribe la clave.", {
    voz: false,
    campos: [{ id: "msgDescifrar", tipo: "area", ph: "🔒JARVIS:…", valor: texto }, { id: "claveDescifrar", tipo: "password", ph: "Clave" }],
    enviar: {
      t: "Descifrar", f: async (v) => {
        try { decir("🔓 Mensaje secreto", await descifrar(v.msgDescifrar, v.claveDescifrar), { voz: false }); }
        catch (e) { throw new Error("Clave incorrecta o mensaje dañado."); }
      }
    }
  });
}

// ================== DESBLOQUEAR LA WEB ==================
function desbloquearEnPagina() {
  const s = document.createElement("style");
  s.textContent = "*{user-select:text!important;-webkit-user-select:text!important}";
  document.documentElement.appendChild(s);
  const EV = ["copy", "cut", "paste", "contextmenu", "selectstart", "dragstart"];
  EV.forEach((ev) => {
    window.addEventListener(ev, (e) => e.stopImmediatePropagation(), true);
    document["on" + ev] = null;
    if (document.body) document.body["on" + ev] = null;
  });
  document.querySelectorAll(EV.map((e) => "[on" + e + "]").join(",")).forEach((el) => EV.forEach((e) => el.removeAttribute("on" + e)));
  return true;
}
async function desbloquear() {
  await enPagina(desbloquearEnPagina, [], "MAIN");
  orb.setTinte("#3ddc97", 2500);
  decir("🔓 Web desbloqueada", "Ya puedes seleccionar, copiar y usar el botón derecho en esta página.", { voz: "Web desbloqueada." });
}

// ================== MODO MATRIX ==================
function matrixEnPagina() {
  const ID = "jarvis-matrix";
  const ya = document.getElementById(ID);
  if (ya) { ya.remove(); return false; }
  const c = document.createElement("canvas");
  c.id = ID;
  c.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483646;pointer-events:none;opacity:.9;transition:opacity 1.2s";
  document.documentElement.appendChild(c);
  const ctx = c.getContext("2d");
  const fs = 16;
  let cols = 0, gotas = [];
  const tam = () => { c.width = innerWidth; c.height = innerHeight; cols = Math.floor(c.width / fs); gotas = Array.from({ length: cols }, () => Math.random() * (c.height / fs) - c.height / fs / 2); ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, c.width, c.height); };
  tam();
  addEventListener("resize", tam);
  const letras = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789JARVIS<>{}[]#$%&*+=";
  const fin = Date.now() + 15000;
  let vivo = true;
  const cerrar = () => { vivo = false; c.style.opacity = "0"; setTimeout(() => c.remove(), 1200); };
  addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); }, { once: true });
  (function paso() {
    if (!vivo || !c.isConnected) return;
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.font = fs + "px monospace";
    for (let i = 0; i < cols; i++) {
      const y = gotas[i] * fs;
      ctx.fillStyle = Math.random() < 0.05 ? "#e6ffee" : "#00ff66";
      ctx.fillText(letras[(Math.random() * letras.length) | 0], i * fs, y);
      if (y > c.height && Math.random() > 0.975) gotas[i] = 0;
      gotas[i]++;
    }
    if (Date.now() > fin) return cerrar();
    requestAnimationFrame(paso);
  })();
  return true;
}
async function matrix() {
  const on = await enPagina(matrixEnPagina);
  if (on) {
    orb.setTinte("#00ff66", 15000);
    $("transcript").textContent = "Accediendo al sistema… 😎";
    hablar("Accediendo al sistema.");
  } else {
    $("transcript").textContent = "Saliendo de Matrix.";
    estado("idle");
  }
}

// ================== ÓRDENES ==================
async function ordenHacker(texto) {
  const t = texto.trim();
  let m;
  if (/ficha (del|de la|de este|de) (dominio|web)|^ficha de |whois|de qui[eé]n es (esta web|la web)|qui[eé]n est[aá] detr[aá]s|info(rmaci[oó]n)? del dominio|investiga (esta|la) web/i.test(t)) { await fichaDominio(t); return true; }
  if (/(qu[eé]|lo que) (oculta|esconde)|c[oó]digo oculto|secretos de (la|esta) web/i.test(t)) { await loQueOculta(); return true; }
  if (/radar/i.test(t)) { if (/para|quita|apaga|det[eé]n/i.test(t)) radarParar(); else await radarIniciar(); return true; }
  if (/m[aá]quina del tiempo|c[oó]mo era esta (web|p[aá]gina)|versi[oó]n antigua|wayback/i.test(t)) { await maquinaTiempo(t); return true; }
  if (/contrase[ñn]a filtrada|filtrad[ao]s?|me han hackeado|pwned/i.test(t)) { pedirContrasenaFiltrada(); return true; }
  if ((m = t.match(/(?:genera|crea|hazme|dame)(?:me)?\s+(?:una\s+)?(?:contrase[ñn]a|clave)(?:\s+(?:segura|nueva))?(?:\s+de\s+(\d{1,2}))?/i))) {
    mostrarClaveNueva(Math.min(64, Math.max(8, +(m[1] || 20))));
    return true;
  }
  if (/(mu[eé]strame|ens[eé][ñn]ame|ver|revela|mostrar|muestra|oculta) (la |las )?contrase[ñn]as?/i.test(t)) { await verContrasena(); return true; }
  if (/desenmascara|ad[oó]nde lleva|enlace (raro|sospechoso)|expande (el|este) enlace/i.test(t)) {
    const u = t.match(/(https?:\/\/\S+|\b[\w-]+\.[a-z]{2,}\/\S+)/i);
    if (u) await desenmascarar(u[1]); else pedirEnlace();
    return true;
  }
  if (/armadura|cabeceras de seguridad|nota de seguridad|qu[eé] tan segura|c[oó]mo de protegida/i.test(t)) { await armadura(); return true; }
  if (/JARVIS:/.test(t) || /^(descifra|desencripta)/i.test(t)) { pedirDescifrar(/JARVIS:/.test(t) ? t : ""); return true; }
  if ((m = t.match(/^(?:cifra|encripta)(?:\s+(?:un|el|este)\s+mensaje)?\s*:?\s*(.*)$/i)) || /mensaje (secreto|cifrado)/i.test(t)) {
    pedirCifrar(m ? m[1] : "");
    return true;
  }
  if (/desbloquea|deja(me)? copiar|quita el bloqueo/i.test(t)) { await desbloquear(); return true; }
  if (/matrix/i.test(t)) { await matrix(); return true; }
  return false;
}


// ======== rutas.js ========
// Órdenes de las funciones nuevas (deberes, IA, mapa, pódcast, gráficas, logros), en un solo sitio.
async function ordenNuevas(texto) {
  return (await ordenDeberes(texto)) || (await ordenIA(texto)) || (await ordenMapa(texto)) ||
    (await ordenPodcast(texto)) || (await ordenMates(texto)) || (await ordenXP(texto));
}
$("xpCaja").addEventListener("click", () => { $("estudio").hidden = true; verLogros(); });


// ======== web/final.js ========
// ============ VERSIÓN WEB: cambios sobre el código común ============

// ---------- Investigar: las páginas se piden por el intermediario de la web ----------
async function traerHTML(url) {
  try { return await leerPorProxy(url); } catch (e) { return ""; }
}

// ---------- Material de estudio en la web ----------
function elegirArchivo(accept, captura) {
  return new Promise((ok) => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = accept;
    if (captura) i.capture = "environment";
    i.onchange = () => ok(i.files && i.files[0]);
    i.click();
  });
}
async function textoDeArchivo(f) {
  if (f.size > 18 * 1048576) throw new Error("El archivo es demasiado grande (máximo 18 MB).");
  const n = f.name || "archivo";
  if (/\.pdf$/i.test(n)) return textoDeContenido(n, [{ inline_data: { mime_type: "application/pdf", data: await aBase64(f) } }]);
  if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(n)) return textoDeContenido(n, [{ inline_data: { mime_type: f.type || "image/jpeg", data: await aBase64(f) } }]);
  if (/\.docx$/i.test(n)) return textoDeDocx(f);
  if (/\.xlsx$/i.test(n)) return textoDeXlsx(f);
  if (EXT_TEXTO.test(n)) return f.text();
  throw new Error("No sé leer ese tipo de archivo. Usa PDF, Word, Excel, fotos o texto.");
}
function materialDePagina() {
  decir("🔗 Estudiar de una web", "Pega el enlace de la página (Wikipedia, apuntes, un artículo…).", {
    voz: false,
    campos: [{ id: "u", ph: "https://es.wikipedia.org/wiki/…" }],
    enviar: {
      t: "Usar esta web",
      f: async (v) => {
        const u = urlEnTexto(v.u);
        if (!u) throw new Error("Eso no parece un enlace.");
        $("transcript").textContent = "Leyendo la web…";
        const html = await traerHTML(u);
        const doc = new DOMParser().parseFromString(html || "", "text/html");
        doc.querySelectorAll("script, style, nav, header, footer, aside, form, noscript, iframe, svg, sup.reference").forEach((e) => e.remove());
        const raiz = doc.querySelector("article") || doc.querySelector("main") || doc.querySelector("#mw-content-text") || doc.body;
        const texto = ((raiz && raiz.innerText) || (raiz && raiz.textContent) || "").replace(/\n{3,}/g, "\n\n").trim();
        if (texto.length < 200) throw new Error("No he podido leer esa web. Prueba a copiar el texto y usar «Pegar».");
        await ponerMaterial((doc.title || u).slice(0, 80), texto, "pagina");
      }
    }
  });
}
async function materialDeArchivo() {
  $("estudio").hidden = true;
  const f = await elegirArchivo(".pdf,.docx,.xlsx,.txt,.md,.csv,image/*");
  if (!f) return;
  await ponerMaterial(f.name.replace(/\.[^.]+$/, ""), await textoDeArchivo(f), "archivo");
}
async function materialDeCaptura() {
  $("estudio").hidden = true;
  const f = await elegirArchivo("image/*", true);
  if (!f) return;
  await ponerMaterial("Foto de apuntes", await textoDeArchivo(f), "foto");
}
async function ejercicioGuiado() {
  $("estudio").hidden = true;
  decir("🧮 Ejercicio", "Haz una foto al ejercicio (o elige una imagen o PDF) y te ayudo con pistas, sin chafarte la solución.", {
    voz: false,
    botones: [{
      t: "📸 Elegir foto del ejercicio",
      f: async () => {
        const f = await elegirArchivo("image/*,.pdf", true);
        if (!f) return;
        const mime = /\.pdf$/i.test(f.name) ? "application/pdf" : f.type || "image/jpeg";
        await ejercicioConPartes([{ inline_data: { mime_type: mime, data: await aBase64(f) } }]);
      }
    }]
  });
}
async function ejercicioConPartes(partes) {
  const pistas = [];
  const pedirPista = async (final) => {
    $("transcript").textContent = final ? "Resolviendo paso a paso…" : "Pensando una pista…";
    const instr = final
      ? "Resuelve el ejercicio de la imagen paso a paso, explicando cada paso de forma sencilla, y da la solución final clara."
      : "Hay un ejercicio en la imagen. NO des la solución. Da solo la pista número " + (pistas.length + 1) + " para que el alumno avance él solo, en dos o tres frases." +
        (pistas.length ? " Pistas que ya le has dado:\n" + pistas.join("\n") : " Empieza diciendo qué pide el ejercicio y qué hay que usar.");
    const r = await gemini(instr, "", { partes });
    if (!final) pistas.push(r);
    decir(final ? "🧮 Solución paso a paso" : "💡 Pista " + pistas.length, r, {
      voz: final ? false : r,
      botones: final ? [] : [{ t: "💡 Otra pista", f: () => pedirPista(false) }, { t: "🧮 Ver solución", f: () => pedirPista(true) }]
    });
    if (final) apuntarProgreso("ejercicio", { pistas: pistas.length });
  };
  await pedirPista(false);
}

// ---------- Hacker en la web: pide la dirección si no la dices ----------
async function urlObjetivo(texto) {
  const u = urlEnTexto(texto);
  if (u) return u;
  throw new Error("Dime qué web: por ejemplo «ficha de marca.com» o «cómo era youtube.com en 2010».");
}

// ---------- Micro compartido + «Hey Jarvis» ----------
const MIC = { flujo: null, ctx: null, nodo: null, oyentes: new Set() };
async function micEncender() {
  if (MIC.ctx) return;
  MIC.flujo = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  MIC.ctx = new AudioContext({ sampleRate: 16000 });
  await MIC.ctx.audioWorklet.addModule("captura.js");
  const fuente = MIC.ctx.createMediaStreamSource(MIC.flujo);
  MIC.nodo = new AudioWorkletNode(MIC.ctx, "captura-jarvis");
  MIC.nodo.port.onmessage = (e) => MIC.oyentes.forEach((f) => { try { f(e.data); } catch (err) {} });
  fuente.connect(MIC.nodo);
}
function micApagarSiNadie() {
  if (MIC.oyentes.size || !MIC.ctx) return;
  MIC.flujo.getTracks().forEach((t) => t.stop());
  MIC.ctx.close().catch(() => {});
  MIC.flujo = MIC.ctx = MIC.nodo = null;
}
function pitido() {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.2);
    setTimeout(() => c.close(), 400);
  } catch (e) {}
}

const HEY = { activo: false, detector: null, ultimo: 0, cola: Promise.resolve(), esperandoSR: false };
const ocupadoWeb = () => hablando || escuchando || app.classList.contains("thinking") || liveActivo() || (typeof POD !== "undefined" && POD.activo && !POD.pausa);
function oyenteHey(trozo) {
  HEY.cola = HEY.cola.then(async () => {
    if (!HEY.activo || !HEY.detector) return;
    if (ocupadoWeb()) { HEY.detector.reiniciar(); return; }
    const p = await HEY.detector.procesar(trozo);
    if (p > 0.5 && Date.now() - HEY.ultimo > 2500) { HEY.ultimo = Date.now(); HEY.detector.reiniciar(); despertado(); }
  }).catch(() => {});
}
async function cargarORT() {
  if (window.ort) return;
  await new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "ort/ort.wasm.min.js"; s.onload = ok; s.onerror = () => mal(new Error("No se ha podido cargar el detector de «Hey Jarvis»."));
    document.head.appendChild(s);
  });
}
async function heyEncender() {
  $("transcript").textContent = "Preparando «Hey Jarvis»…";
  await cargarORT();
  if (!HEY.detector) { HEY.detector = new DetectorPalabra(new URL("./", location.href).href, "hey_jarvis_v0.1.onnx"); await HEY.detector.cargar(); }
  await micEncender();
  MIC.oyentes.add(oyenteHey);
  HEY.activo = true;
  $("transcript").textContent = "Di «Hey Jarvis» cuando me necesites.";
}
function heyApagar() {
  HEY.activo = false;
  MIC.oyentes.delete(oyenteHey);
  micApagarSiNadie();
}
function despertado() {
  pitido();
  orb.setTinte("#5ee7ff", 1500);
  if (LIVE.quiere) { iniciarLive(); return; }
  // En el móvil el micro no se puede compartir: se suelta mientras escucha la orden
  if (MOVIL_W) { MIC.oyentes.delete(oyenteHey); micApagarSiNadie(); }
  window.escuchar();
  if (MOVIL_W) {
    const vuelta = setInterval(async () => {
      if (escuchando || hablando || app.classList.contains("thinking")) return;
      clearInterval(vuelta);
      if (HEY.activo) { try { await micEncender(); MIC.oyentes.add(oyenteHey); } catch (e) {} }
    }, 700);
  }
}
$("heyJarvis").addEventListener("change", async (e) => {
  if (e.target.checked) {
    try {
      if (cfg.atento) { cfg.atento = false; guardarCfg(); if (typeof aplicarAtento === "function") aplicarAtento(); if ($("optAtento")) $("optAtento").checked = false; }
      await heyEncender();
      chrome.storage.local.set({ hey: true });
    } catch (err) {
      e.target.checked = false;
      if (err.name === "NotAllowedError") pedirPermisoMicro(); else fallo(err);
    }
  } else { heyApagar(); chrome.storage.local.set({ hey: false }); }
});
chrome.storage.local.get("hey").then(({ hey }) => { if (hey) { $("heyJarvis").checked = true; heyEncender().catch(() => { $("heyJarvis").checked = false; }); } });

// ---------- Gemini Live: órdenes de la web incluidas ----------
async function ejecutarOrdenCapturada(orden) {
  window.capturaDecir = [];
  const respOrig = window.responder;
  window.responder = function (t, x, o) { if (window.capturaDecir) window.capturaDecir.push(t + ": " + x); return respOrig(t, x, Object.assign({}, o || {}, { voz: "" })); };
  try {
    let hecho = await poderesOrden(String(orden || "").trim());
    if (!hecho) {
      ejecutarWebOriginal(String(orden || ""));
      for (let i = 0; i < 25 && !window.capturaDecir.length; i++) await dormir(200);
      hecho = window.capturaDecir.length > 0;
    }
    const salida = window.capturaDecir.join("\n\n");
    return hecho ? { hecho: true, resultado: (salida || "Hecho.").slice(0, 4000) } : { hecho: false, nota: "No es una orden de Jarvis. Responde tú directamente." };
  } finally {
    window.responder = respOrig;
    window.capturaDecir = null;
  }
}

// ---------- Órdenes nuevas en la web ----------
async function poderesOrden(texto) {
  const t = String(texto || "").trim().replace(/^jarvis[\s,.:]*/i, "");
  if (!t) return false;
  try {
    if (/^(modo conversaci[oó]n|hablemos|habla conmigo|conversaci[oó]n)$/i.test(t)) { await iniciarLive(); return true; }
    if (/^ficha web$/i.test(t)) {
      decir("🕵️ Ficha web", "¿De qué web? Escribe el dominio.", { voz: false, campos: [{ id: "u", ph: "marca.com" }], enviar: { t: "Investigar", f: (v) => fichaDominio(v.u) } });
      return true;
    }
    if (/^m[aá]quina del tiempo$/i.test(t)) {
      decir("🕰️ Máquina del tiempo", "¿Qué web quieres ver en el pasado?", { voz: false, campos: [{ id: "u", ph: "youtube.com" }, { id: "a", ph: "Año (opcional): 2010" }], enviar: { t: "Viajar", f: (v) => maquinaTiempo(v.u + " " + (v.a || "")) } });
      return true;
    }
    return !!((await ordenPersona(t)) || (await ordenNuevas(t)) || (await ordenInvestigar(t)) || (await ordenEstudio(t)) || (await ordenHacker(t)));
  } catch (e) {
    fallo(e);
    return true;
  }
}

const ejecutarWebOriginal = window.ejecutar;
window.ejecutar = function (ordenOriginal) {
  const orden = String(ordenOriginal || "").trim().replace(/^jarvis[\s,.:]*/i, "");
  if (!orden) return ejecutarWebOriginal(ordenOriginal);
  $("transcript").textContent = "«" + orden + "»";
  poderesOrden(orden).then((h) => {
    if (!h) ejecutarWebOriginal(ordenOriginal);
    else if (typeof guardarHistorial === "function") guardarHistorial(orden);
  }).catch(() => ejecutarWebOriginal(ordenOriginal));
};

// El micro y el orbe: con la voz natural activada, abren la conversación en tiempo real
const _escucharWeb = window.escuchar;
window.escuchar = function () {
  if (liveActivo()) { pararLive(); return; }
  if (LIVE.quiere) { iniciarLive(); return; }
  _escucharWeb();
};
["orb", "micBtn"].forEach((id) => $(id).addEventListener("click", (e) => {
  if (LIVE.quiere || liveActivo()) { e.stopImmediatePropagation(); window.escuchar(); }
}, true));

// Botones de la ventana de estudio que lanzan órdenes
document.querySelectorAll("[data-px]").forEach((b) => b.addEventListener("click", () => { $("estudio").hidden = true; poderesOrden(b.dataset.px); }));

// La IA normal de la web también usa la personalidad elegida
if (typeof sistemaIA === "function") {
  const _sistema = sistemaIA;
  sistemaIA = function () { return personaTexto() + " " + _sistema().replace(/^Eres Jarvis[^.]*\.\s*/, ""); };
}
// Las respuestas de la web siempre enseñan sus botones
const _responderWeb = window.responder;
window.responder = function () { $("rfoot").hidden = false; return _responderWeb.apply(this, arguments); };
// Al cerrar la tarjeta, parar el pódcast
$("rclose").addEventListener("click", () => { if (typeof POD !== "undefined" && POD.activo) pararPodcast(); });

})();
