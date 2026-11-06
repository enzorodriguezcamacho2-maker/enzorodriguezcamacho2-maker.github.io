// Jarvis v12: modo gym, lista de la compra, precios (bitcoin y divisas).

const leerLS = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? def; } catch (e) { return def; } };
function guardarLS(k, v, sync) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} if (sync && typeof syncSubir === "function") syncSubir(sync); }
const numES = (s) => parseFloat(String(s).replace(",", "."));
const N_PAL = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12, quince: 15, veinte: 20 };
const aNum = (s) => s == null ? NaN : N_PAL[s] != null ? N_PAL[s] : numES(s);

// ================== GYM ==================
const GYM_KEY = "jarvisGym";
const gymLeer = () => leerLS(GYM_KEY, []);
const gymGuardar = (l) => guardarLS(GYM_KEY, l.slice(-400), "GYM");
const ejNorm = (s) => quitarTildes(String(s).toLowerCase()).replace(/^(?:de|el|la|en)\s+/, "").replace(/\s+/g, " ").trim();

function gymPintar(titulo) {
  const hoy = fechaISO(new Date());
  const series = gymLeer().filter((x) => x.fecha === hoy);
  $("nodoGymTit").textContent = titulo || "Entreno de hoy";
  const ul = $("nodoGymLista"); ul.innerHTML = "";
  const porEj = {};
  series.forEach((x) => { (porEj[x.ej] = porEj[x.ej] || []).push(x); });
  const ejs = Object.keys(porEj);
  if (!ejs.length) { const li = document.createElement("li"); li.className = "vacio"; li.textContent = "Di «press banca 4x8 con 60 kilos»"; ul.append(li); }
  ejs.slice(-5).forEach((e) => {
    const li = document.createElement("li");
    const b = document.createElement("b"); b.textContent = capital(e);
    const sm = document.createElement("small");
    sm.textContent = porEj[e].map((x) => x.series + "×" + x.reps + (x.kg ? " " + x.kg + "kg" : "")).join(" · ");
    li.append(b, sm); ul.append(li);
  });
  const vol = series.reduce((a, x) => a + x.series * x.reps * (x.kg || 0), 0);
  $("nodoGymPie").textContent = series.length ? series.reduce((a, x) => a + x.series, 0) + " series" + (vol ? " · " + Math.round(vol).toLocaleString("es-ES") + " kg movidos" : "") : "";
  nodoMostrar("nodoGym", 90);
}
$("nodoGym").addEventListener("click", () => ejecutar("descanso"));

function gymRegistrar(ej, series, reps, kg) {
  ej = ejNorm(ej);
  const l = gymLeer();
  const previo = l.filter((x) => x.ej === ej && x.kg).reduce((m, x) => Math.max(m, x.kg), 0);
  l.push({ id: Date.now().toString(36), fecha: fechaISO(new Date()), ej, series, reps, kg: kg || 0 });
  gymGuardar(l);
  gymPintar();
  const record = kg && previo && kg > previo;
  const txt = capital(ej) + ": " + series + " series de " + reps + (kg ? " con " + kg + " kg" : "");
  responder(record ? "🏆 ¡Nuevo récord!" : "💪 Apuntado", txt + (record ? "\nAntes tu máximo era " + previo + " kg." : ""), {
    voz: record ? "¡Nuevo récord en " + ej + "! " + kg + " kilos. Antes eran " + previo + "." : "Apuntado. " + txt + ".",
    botones: [{ texto: "Descanso 90 s", accion: () => ejecutar("descanso de 90 segundos") }, { texto: "Deshacer", accion: () => { gymGuardar(gymLeer().slice(0, -1)); gymPintar(); responder("💪 Quitado", "He borrado la última serie."); } }]
  });
}

function gymComandos(t, n, o) {
  let m;
  // "press banca 4x8 con 60 kilos", "he hecho sentadilla 3 series de 10 con 80", "apunta dominadas 4 por 10"
  m = n.match(/^(?:apunta(?:me)?|anota|registra|he hecho|hice|acabo de hacer|gym|gimnasio)?\s*(.+?)\s*,?\s+(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*(?:x|por|series?\s+de|×)\s*(\d+|diez|doce|quince|veinte|cinco|seis|siete|ocho|nueve)(?:\s*(?:repeticiones|reps|rep))?(?:\s*,?\s*(?:con|a|de)?\s*(\d+(?:[.,]\d+)?)\s*(?:kg|kilos|kilogramos)?)?$/);
  if (m && /[a-z]{3}/.test(m[1]) && !/calendario|temporizador|minuto|hora|^(?:cuant|calcul|multiplica|y\b)/.test(m[1])) { gymRegistrar(m[1], aNum(m[2]), aNum(m[3]), m[4] ? numES(m[4]) : 0); return true; }
  m = n.match(/^(?:apunta(?:me)?|anota|he hecho|hice)\s+(\d+)\s+(?:repeticiones|reps)\s+de\s+(.+?)(?:\s+con\s+(\d+(?:[.,]\d+)?)\s*(?:kg|kilos)?)?$/);
  if (m) { gymRegistrar(m[2], 1, +m[1], m[3] ? numES(m[3]) : 0); return true; }

  // Descanso entre series
  m = n.match(/^(?:pon(?:me)?\s+(?:un\s+)?)?descanso(?:\s+de)?(?:\s+(\d+(?:[.,]\d+)?|un|una|dos|tres|medio)\s*(segundos?|minutos?|min|seg|s)?)?$/);
  if (m) {
    let seg = 90;
    if (m[1]) { const v = m[1] === "medio" ? 0.5 : aNum(m[1]); seg = Math.round(v * (/^m/.test(m[2] || (v <= 5 ? "min" : "s")) ? 60 : 1)); }
    iniciarTimer(seg, "Descanso");
    responder("⏱ Descanso", "Te aviso en " + fmt(seg) + ". ¡Respira!", { voz: "Descanso de " + (seg >= 60 ? (seg / 60).toString().replace(".", ",") + " minutos" : seg + " segundos") });
    return true;
  }

  // Ver entreno
  if (/^(?:modo gym|modo gimnasio|entreno de hoy|mi entreno|que he hecho hoy|que llevo hoy|entrenamiento de hoy|gym)$/.test(n)) {
    gymPintar();
    const hoy = gymLeer().filter((x) => x.fecha === fechaISO(new Date()));
    responder("💪 Modo gym", hoy.length ? hoy.map((x) => "• " + capital(x.ej) + ": " + x.series + "×" + x.reps + (x.kg ? " · " + x.kg + " kg" : "")).join("\n")
      : "Dime cada ejercicio así:\n• «press banca 4x8 con 60 kilos»\n• «sentadilla 3 series de 10 con 80»\n• «descanso» (90 s) o «descanso de 2 minutos»\n• «mi récord en press banca»\n• «qué hice el último día»", { voz: hoy.length ? "Llevas " + hoy.length + (hoy.length === 1 ? " ejercicio" : " ejercicios") + " hoy." : "Modo gym activado. Dime cada ejercicio y lo apunto." });
    return true;
  }
  m = n.match(/^(?:cual es\s+)?(?:mi\s+)?(?:record|maximo|mejor marca|rm)\s+(?:en|de)\s+(.+)$/);
  if (m) {
    const ej = ejNorm(m[1]), l = gymLeer().filter((x) => x.ej.includes(ej) || ej.includes(x.ej));
    if (!l.length) { responder("🏆 Sin datos", "Aún no tengo nada apuntado de " + ej + ".", { voz: "No tengo nada apuntado de " + ej }); return true; }
    const mx = l.reduce((a, x) => (x.kg > a.kg ? x : a), l[0]);
    responder("🏆 Récord en " + mx.ej, mx.kg + " kg · " + mx.series + "×" + mx.reps + " (" + fechaLarga(deISO(mx.fecha)) + ")", { voz: "Tu récord en " + mx.ej + " es de " + mx.kg + " kilos." });
    return true;
  }
  m = n.match(/^que hice (?:el ultimo dia|el ultimo entreno|la ultima vez|ayer)(?:\s+de\s+(.+))?$/) || n.match(/^(?:ultimo entreno|ultimo entrenamiento)(?:\s+de\s+(.+))?$/);
  if (m) {
    let l = gymLeer();
    if (m[1]) { const ej = ejNorm(m[1]); l = l.filter((x) => x.ej.includes(ej) || ej.includes(x.ej)); }
    const hoy = fechaISO(new Date()), pas = l.filter((x) => x.fecha < hoy);
    const base = pas.length ? pas : l;
    if (!base.length) { responder("💪 Sin datos", "Aún no hay entrenos apuntados.", { voz: "Aún no hay entrenos apuntados" }); return true; }
    const f = base[base.length - 1].fecha, dia = base.filter((x) => x.fecha === f);
    responder("💪 " + capital(fechaLarga(deISO(f))), dia.map((x) => "• " + capital(x.ej) + ": " + x.series + "×" + x.reps + (x.kg ? " · " + x.kg + " kg" : "")).join("\n"), { voz: "El " + fechaLarga(deISO(f)) + " hiciste " + dia.map((x) => x.ej).join(", ") });
    return true;
  }
  if (/^(?:borra|olvida)\s+(?:el\s+)?(?:entreno|entrenamiento)\s+de\s+hoy$/.test(n)) {
    const hoy = fechaISO(new Date()); gymGuardar(gymLeer().filter((x) => x.fecha !== hoy)); gymPintar();
    responder("💪 Borrado", "He borrado el entreno de hoy."); return true;
  }
  return false;
}

// ================== LISTA DE LA COMPRA ==================
const COMPRA_KEY = "jarvisCompra";
const compraLeer = () => leerLS(COMPRA_KEY, []);
const compraGuardar = (l) => guardarLS(COMPRA_KEY, l, "COMPRA");
const trocear = (s) => s.split(/\s*,\s*|\s+y\s+|\s+e\s+/i).map((x) => x.replace(/^(?:un|una|unos|unas|el|la|los|las|de)\s+/i, "").trim()).filter(Boolean);

function compraPintar() {
  const l = compraLeer(), ul = $("nodoCompraLista"); ul.innerHTML = "";
  if (!l.length) { const li = document.createElement("li"); li.className = "vacio"; li.textContent = "Vacía. Di «añade leche a la lista»"; ul.append(li); }
  l.slice(0, 7).forEach((x, i) => {
    const li = document.createElement("li"); li.textContent = x.t; if (x.hecho) li.className = "hecho";
    li.addEventListener("click", (e) => { e.stopPropagation(); const k = compraLeer(); if (k[i]) { k[i].hecho = !k[i].hecho; compraGuardar(k); compraPintar(); } });
    ul.append(li);
  });
  const quedan = l.filter((x) => !x.hecho).length;
  $("nodoCompraPie").textContent = l.length > 7 ? "y " + (l.length - 7) + " más" : quedan ? quedan + " por comprar" : l.length ? "¡Todo comprado!" : "";
  nodoMostrar("nodoCompra", 60);
}

function compraComandos(t, n, o) {
  let m;
  const LISTA = "(?:la\\s+)?(?:lista(?:\\s+de\\s+la\\s+compra)?|compra)";
  m = o.match(new RegExp("^(?:a[ñn]ade|apunta|pon|mete|agrega|anota)\\s+(.+?)\\s+(?:a|en)\\s+" + LISTA + "$", "i"))
    || o.match(new RegExp("^(?:a[ñn]ade|apunta|pon|mete|agrega)\\s+(?:a|en)\\s+" + LISTA + "\\s+(.+)$", "i"))
    || o.match(/^(?:tengo que comprar|hay que comprar|necesito comprar|compra)\s+(.+)$/i);
  if (m) {
    const nuevos = trocear(m[1]), l = compraLeer();
    nuevos.forEach((x) => { if (!l.some((y) => ejNorm(y.t) === ejNorm(x))) l.push({ t: capital(x), hecho: false }); });
    compraGuardar(l); compraPintar();
    responder("🛒 Añadido", nuevos.map(capital).join(", "), { voz: "Añadido a la lista: " + nuevos.join(", ") });
    return true;
  }
  m = o.match(new RegExp("^(?:quita|borra|elimina|tacha|ya (?:he comprado|tengo))\\s+(.+?)(?:\\s+de\\s+" + LISTA + ")?$", "i"));
  if (m && (new RegExp(LISTA, "i").test(o) || /^ya /i.test(o))) {
    const fuera = trocear(m[1]).map(ejNorm), l = compraLeer();
    const queda = l.filter((x) => !fuera.some((f) => ejNorm(x.t).includes(f) || f.includes(ejNorm(x.t))));
    compraGuardar(queda); compraPintar();
    responder("🛒 Quitado", (l.length - queda.length) ? "Listo, lo he quitado." : "No estaba en la lista.", { voz: (l.length - queda.length) ? "Quitado" : "Eso no estaba en la lista" });
    return true;
  }
  if (new RegExp("^(?:borra|vacia|limpia)\\s+" + LISTA + "$").test(n)) { compraGuardar([]); compraPintar(); responder("🛒 Lista vacía", "He borrado la lista de la compra."); return true; }
  if (new RegExp("^(?:que\\s+(?:tengo|hay)\\s+(?:en|apuntado en)\\s+|lee(?:me)?\\s+|ver\\s+|ensename\\s+|abre\\s+|mi\\s+)?" + LISTA + "$").test(n) || /^que (?:tengo que|hay que) comprar$/.test(n)) {
    const l = compraLeer().filter((x) => !x.hecho);
    compraPintar();
    responder("🛒 Lista de la compra", l.length ? l.map((x) => "• " + x.t).join("\n") : "Está vacía.", { voz: l.length ? "Tienes que comprar: " + l.map((x) => x.t).join(", ") : "La lista está vacía." });
    return true;
  }
  return false;
}

// ================== PRECIOS: CRIPTO Y DIVISAS ==================
const CRIPTO = { bitcoin: "bitcoin", btc: "bitcoin", ethereum: "ethereum", eth: "ethereum", ether: "ethereum", solana: "solana", dogecoin: "dogecoin", doge: "dogecoin", xrp: "ripple", ripple: "ripple", cardano: "cardano" };
const DIVISAS = { euro: "EUR", euros: "EUR", dolar: "USD", dolares: "USD", libra: "GBP", libras: "GBP", yen: "JPY", yenes: "JPY", franco: "CHF", francos: "CHF", peso: "MXN", "pesos mexicanos": "MXN", yuan: "CNY", yuanes: "CNY", "dolar canadiense": "CAD", "dolares canadienses": "CAD", real: "BRL", reales: "BRL" };
const eur = (x) => x.toLocaleString("es-ES", { maximumFractionDigits: x < 10 ? 4 : 2 });

function preciosComandos(t, n, o) {
  let m = n.match(/^(?:a\s+cuanto\s+esta|cuanto\s+(?:vale|cuesta|esta)|precio\s+del?|como\s+esta)\s+(?:el\s+|la\s+)?(bitcoin|btc|ethereum|eth|ether|solana|dogecoin|doge|xrp|ripple|cardano)$/)
    || n.match(/^(bitcoin|btc|ethereum|eth|solana|dogecoin|doge|xrp|cardano)$/);
  if (m) {
    const id = CRIPTO[m[1]];
    setEstado("thinking");
    json("https://api.coingecko.com/api/v3/simple/price?ids=" + id + "&vs_currencies=eur,usd&include_24hr_change=true").then((d) => {
      const p = d[id], cambio = p.eur_24h_change || 0;
      responder("₿ " + capital(id), eur(p.eur) + " €  ·  " + eur(p.usd) + " $\n" + (cambio >= 0 ? "▲ +" : "▼ ") + cambio.toFixed(2).replace(".", ",") + " % en 24 h", { voz: capital(id) + " está a " + Math.round(p.eur).toLocaleString("es-ES") + " euros, " + (cambio >= 0 ? "sube" : "baja") + " un " + Math.abs(cambio).toFixed(1).replace(".", ",") + " por ciento hoy." });
    }).catch(() => responder("₿ Sin datos", "No he podido consultar el precio ahora."));
    return true;
  }
  const RE_M = "(euros?|dolar(?:es)?(?: canadienses?)?|libras?|yen(?:es)?|francos?|pesos(?: mexicanos)?|peso|yuan(?:es)?|real(?:es)?)";
  m = n.match(new RegExp("^(?:cuanto\\s+(?:es|son)|convierte|pasa|cambia)\\s+(\\d+(?:[.,]\\d+)?)\\s+" + RE_M + "\\s+(?:a|en)\\s+" + RE_M + "$"))
    || n.match(new RegExp("^(?:a\\s+cuanto\\s+esta|como\\s+esta|cambio\\s+del?)\\s+(?:el\\s+)?()" + RE_M + "(?:\\s+(?:a|en)\\s+" + RE_M + ")?$"));
  if (m) {
    const cant = m[1] ? numES(m[1]) : 1, de = DIVISAS[m[2]], a = DIVISAS[m[3] || (m[2].startsWith("euro") ? "dolares" : "euros")];
    if (!de || !a || de === a) return false;
    setEstado("thinking");
    json("https://api.frankfurter.app/latest?amount=" + cant + "&from=" + de + "&to=" + a).then((d) => {
      const r = d.rates[a];
      responder("💱 " + eur(r) + " " + a, cant.toLocaleString("es-ES") + " " + de + " = " + eur(r) + " " + a + "\nCambio del " + d.date, { voz: cant.toLocaleString("es-ES") + " " + m[2] + " son " + eur(r) + " " + (m[3] || a) });
    }).catch(() => responder("💱 Sin datos", "No he podido consultar el cambio ahora."));
    return true;
  }
  return false;
}

// Se engancha a la cadena de comandos de Jarvis (antes que el resto)
const _masComandos = masComandos;
masComandos = function (t, n, o) {
  return gymComandos(t, n, o) || compraComandos(t, n, o) || preciosComandos(t, n, o) || _masComandos(t, n, o);
};

// Mini pantallas nuevas en la red
NODOS.nodoGym = ["#ff8a5e", "tr"];
NODOS.nodoCompra = ["#3ee6a8", "bl"];
$("nodoCompra").addEventListener("click", () => ejecutar("qué tengo en la lista de la compra"));

// Sincronizar gym y compra entre el móvil y el Chromebook
if (typeof SYNC !== "undefined") {
  SYNC.GYM = { clave: GYM_KEY, leer: () => gymLeer().slice(-80) };
  SYNC.COMPRA = { clave: COMPRA_KEY, leer: () => compraLeer() };
  ["GYM", "COMPRA"].forEach((k) => { if (!syncTs(k) && localStorage.getItem(SYNC[k].clave)) localStorage.setItem("jarvisTs_" + k, 1); });
}
