// Jarvis v27: agenda de contactos. Pegar muchos de golpe, importar del móvil o de un archivo .vcf.

// Convierte texto pegado en contactos. Vale "Mamá 612 345 678", "Papá: +34 699...", "612345678 Pablo",
// y también el contenido de un archivo de contactos (.vcf).
function leerContactosTexto(txt) {
  const sal = [];
  if (/BEGIN:VCARD/i.test(txt)) {
    txt.split(/END:VCARD/i).forEach((bloque) => {
      const fn = (bloque.match(/^FN[^:]*:(.+)$/im) || bloque.match(/^N[^:]*:(.+)$/im) || [])[1];
      const tels = [...bloque.matchAll(/^TEL[^:]*:(.+)$/gim)].map((m) => m[1].trim());
      const mail = (bloque.match(/^EMAIL[^:]*:(.+)$/im) || [])[1];
      if (fn && (tels.length || mail)) sal.push({ nombre: fn.replace(/;+/g, " ").replace(/\\,/g, ",").trim(), tel: tels[0] || "", email: mail ? mail.trim() : "" });
    });
    return sal;
  }
  txt.split(/\r?\n|;/).forEach((linea) => {
    linea = linea.trim(); if (!linea) return;
    const tel = (linea.match(/\+?\d[\d\s().-]{7,}\d/) || [])[0];
    const mail = (linea.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0];
    let nombre = linea.replace(tel || "", " ").replace(mail || "", " ").replace(/[:=,\-–—|\t]+/g, " ").replace(/\s+/g, " ").trim();
    if (nombre && (tel || mail)) sal.push({ nombre, tel: tel || "", email: mail || "" });
  });
  return sal;
}
function guardarVarios(lista) {
  let n = 0;
  lista.forEach((c) => {
    const datos = {};
    if (c.tel) datos.tel = telLimpio(c.tel);
    if (c.email) datos.email = c.email;
    if (c.nombre && (datos.tel || datos.email)) { guardarContacto(c.nombre, datos); n++; }
  });
  return n;
}

// ---------- Pantalla de contactos ----------
const telBonito = (t) => { const s = String(t); return s.startsWith("34") && s.length === 11 ? s.slice(2).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : "+" + s; };
function pintarContactos() {
  const c = contactos(), ul = $("conLista"), filtro = normC($("conBuscar").value || "");
  const claves = Object.keys(c).sort((a, b) => (c[a].n || a).localeCompare(c[b].n || b, "es")).filter((k) => !filtro || k.includes(filtro));
  $("conCuenta").textContent = Object.keys(c).length + (Object.keys(c).length === 1 ? " contacto" : " contactos");
  ul.innerHTML = "";
  if (!claves.length) { const li = document.createElement("li"); li.className = "vacio"; li.textContent = Object.keys(c).length ? "Nadie con ese nombre." : "Todavía no tienes contactos. Pégalos arriba o impórtalos del móvil."; ul.append(li); return; }
  claves.forEach((k) => {
    const x = c[k], nom = x.n || k;
    const li = document.createElement("li");
    const av = document.createElement("span"); av.className = "conav"; av.textContent = nom.charAt(0).toUpperCase();
    const info = document.createElement("div"); info.className = "coninfo";
    const b = document.createElement("b"); b.textContent = capital(nom);
    const sm = document.createElement("small"); sm.textContent = [x.tel ? telBonito(x.tel) : "", x.email || ""].filter(Boolean).join(" · ");
    info.append(b, sm);
    const acc = document.createElement("div"); acc.className = "conacc";
    const btn = (txt, tit, fn) => { const e = document.createElement("button"); e.textContent = txt; e.title = tit; e.addEventListener("click", fn); acc.append(e); };
    if (x.tel) btn("💬", "WhatsApp", () => window.open("https://wa.me/" + x.tel, "_blank"));
    if (x.tel) btn("📞", "Llamar", () => { location.href = "tel:+" + x.tel; });
    btn("✏️", "Editar", () => { $("conNombre").value = capital(nom); $("conTel").value = x.tel ? telBonito(x.tel) : (x.email || ""); $("conNombre").focus(); });
    btn("🗑", "Borrar", () => { if (!confirmarBorrar(li)) return; const m = memLeer(); delete m.contactos[k]; memGuardar(m); pintarContactos(); });
    li.append(av, info, acc); ul.append(li);
  });
}
// Borrar con doble toque (sin ventanas emergentes)
function confirmarBorrar(li) {
  if (li.classList.contains("seguro")) return true;
  li.classList.add("seguro"); setTimeout(() => li.classList.remove("seguro"), 2500);
  aviso("Toca otra vez 🗑 para borrar");
  return false;
}
function aviso(t) { const a = $("conAviso"); a.textContent = t; a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { a.hidden = true; }, 3500); }
function abrirContactos() { panelAbrir("panelContactos"); $("conImportarMovil").hidden = !("contacts" in navigator && "select" in navigator.contacts); pintarContactos(); }

$("conCerrar").addEventListener("click", panelCerrar);
$("conBuscar").addEventListener("input", pintarContactos);
$("conPegarBtn").addEventListener("click", () => {
  const lista = leerContactosTexto($("conPegar").value);
  if (!lista.length) { aviso("No encuentro números. Pon uno por línea: «Mamá 612345678»"); return; }
  const n = guardarVarios(lista); $("conPegar").value = "";
  aviso("✅ Guardados " + n + (n === 1 ? " contacto" : " contactos")); pintarContactos();
});
$("conForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nom = $("conNombre").value.trim(), dato = $("conTel").value.trim();
  if (!nom || !dato) { aviso("Pon el nombre y el número"); return; }
  guardarVarios([/@/.test(dato) ? { nombre: nom, email: dato } : { nombre: nom, tel: dato }]);
  $("conNombre").value = ""; $("conTel").value = "";
  aviso("✅ " + capital(nom) + " guardado"); pintarContactos();
});
// Importar directamente de la agenda del móvil (Chrome en Android)
$("conImportarMovil").addEventListener("click", async () => {
  try {
    const sel = await navigator.contacts.select(["name", "tel", "email"], { multiple: true });
    const n = guardarVarios(sel.map((c) => ({ nombre: (c.name || [])[0] || "", tel: (c.tel || [])[0] || "", email: (c.email || [])[0] || "" })));
    aviso("✅ Importados " + n + (n === 1 ? " contacto" : " contactos")); pintarContactos();
  } catch (e) { aviso("No se han importado contactos"); }
});
// Importar un archivo .vcf (exportado desde Contactos del móvil)
$("conArchivo").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  const n = guardarVarios(leerContactosTexto(await f.text()));
  e.target.value = ""; aviso("✅ Importados " + n + " del archivo"); pintarContactos();
});
$("conVerAjustes") && $("conVerAjustes").addEventListener("click", () => { $("sheet").hidden = true; abrirContactos(); });

// Por voz: "mis contactos", "abre la agenda", "contactos"
const _masComandosC = masComandos;
masComandos = function (t, n, o) {
  if (/^(?:abre\s+)?(?:mis\s+|la\s+)?(?:contactos|agenda de contactos|agenda telefonica|numeros|mis numeros)$/.test(n)) { abrirContactos(); responder("📇 Tus contactos", "Pega tus números arriba (uno por línea: «Mamá 612345678») o impórtalos del móvil.", { voz: "Aquí tienes tus contactos" }); return true; }
  return _masComandosC(t, n, o);
};
