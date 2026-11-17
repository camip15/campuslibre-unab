/* =====================================================================
   CampusLibre UNAB · app.js
   Lógica del portal en JavaScript vainilla. Cada página tiene en su
   <body> un atributo data-pagina="..." y al final de este archivo se
   llama a la función de esa página (iniciarLogin, iniciarInicio, ...).

   Los datos (usuarios, asistencias, inscripciones, lugares creados y
   solicitudes) se guardan en el navegador con localStorage, así el
   portal funciona sin servidor.

   Índice
   1. Almacenamiento y usuarios
   2. Utilidades
   3. Cálculos (horas libres, notas, ranking)
   4. Validaciones de formulario
   5. Preferencias: modo oscuro y tamaño de letra
   6. Header y navegación
   7. Páginas: login, registro, inicio, perfil, horas libres (CRUD),
      lugares (CRUD + plano), mis lugares, académico, calculadora,
      eventos, ayuda
   8. Arranque
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. ALMACENAMIENTO Y USUARIOS
   --------------------------------------------------------------------- */
const CLAVE_USUARIOS = "campuslibre_v3_usuarios";
const CLAVE_SESION = "campuslibre_v3_sesion";
const CLAVE_PREFERENCIAS = "campuslibre_preferencias";
const memoria = {}; // respaldo si el navegador bloquea localStorage

function leer(clave, porDefecto) {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : porDefecto;
  } catch (e) {
    return clave in memoria ? memoria[clave] : porDefecto;
  }
}

function guardar(clave, valor) {
  memoria[clave] = valor;
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
}

/* Completa campos que pueden faltar (por ejemplo, en cuentas creadas antes) */
function normalizarUsuario(u) {
  u.historial = (u.historial || []).map((h, i) => ({ id: h.id || `a${Date.now()}${i}`, estado: h.estado || "validada", ...h }));
  u.inscripciones = u.inscripciones || [];
  u.lugaresPropios = u.lugaresPropios || [];
  u.solicitudes = u.solicitudes || [];
  return u;
}

/* Lista de usuarios. La primera vez se agrega la usuaria de ejemplo (Paula). */
function obtenerUsuarios() {
  let usuarios = leer(CLAVE_USUARIOS, null);
  if (!usuarios) {
    usuarios = [normalizarUsuario(JSON.parse(JSON.stringify(USUARIO_PRUEBA)))];
    guardar(CLAVE_USUARIOS, usuarios);
  }
  return usuarios.map(normalizarUsuario);
}

function buscarUsuario(correo) {
  return obtenerUsuarios().find(u => u.correo === correo.trim().toLowerCase());
}

function usuarioActual() {
  const correo = leer(CLAVE_SESION, null);
  return correo ? buscarUsuario(correo) : null;
}

function actualizarUsuario(usuario) {
  guardar(CLAVE_USUARIOS, obtenerUsuarios().map(u => (u.correo === usuario.correo ? usuario : u)));
}

/* ---------------------------------------------------------------------
   2. UTILIDADES
   --------------------------------------------------------------------- */
const $ = (selector, padre = document) => padre.querySelector(selector);
const $$ = (selector, padre = document) => Array.from(padre.querySelectorAll(selector));

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/* Escapa el texto que escribe el usuario antes de insertarlo como HTML */
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function aFecha(texto) {             // "2026-10-05" -> Date a medianoche local
  const [a, m, d] = texto.split("-").map(Number);
  return new Date(a, m - 1, d);
}
function aTexto(fecha) {             // Date -> "2026-10-05"
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}
function formatoFecha(fecha) {
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}
function formatoCorto(fecha) {     // "14 nov. 2026" para tablas
  return `${fecha.getDate()} ${MESES[fecha.getMonth()].slice(0, 3)}. ${fecha.getFullYear()}`;
}
function hoy() {
  const f = new Date();
  return new Date(f.getFullYear(), f.getMonth(), f.getDate());
}
const hora = h => `${h}:00`;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function textoSesion(sesion) {
  const dias = sesion.dias.length === 5 ? "Lunes a viernes" : sesion.dias.join(", ");
  return `${dias} · ${hora(sesion.ini)} – ${hora(sesion.fin)}`;
}

const nombreZona = id => (ZONAS.find(z => z.id === id) || { nombre: id }).nombre;
const buscarLugar = id => LUGARES.find(l => l.id === id);

function mostrarToast(mensaje) {
  let toast = $(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.classList.add("visible");
  clearTimeout(toast.temporizador);
  toast.temporizador = setTimeout(() => toast.classList.remove("visible"), 3500);
}

/* Cuadrícula de 96 cuadros (1 cuadro = 1 hora libre).
   Vino = validadas; vino claro punteado = pendientes de validación. */
function dibujarCuadricula(contenedor, horas, pendientes = 0) {
  contenedor.innerHTML = "";
  for (let i = 1; i <= META_HL; i++) {
    const cuadro = document.createElement("span");
    if (i <= horas) cuadro.classList.add("llena");
    else if (i <= horas + pendientes) cuadro.classList.add("pendiente");
    contenedor.appendChild(cuadro);
  }
  contenedor.setAttribute("role", "img");
  contenedor.setAttribute("aria-label", `${Math.min(horas, META_HL)} de ${META_HL} horas libres cumplidas` +
    (pendientes ? `, ${pendientes} pendientes de validación` : ""));
}

/* Foto del lugar (solo si tiene; sin foto no se muestra ningún recuadro) */
const fotoLugar = l => (l.foto ? `<img class="lugar__foto" src="${l.foto}" alt="Foto de ${esc(l.nombre)}" loading="lazy">` : "");

/* ---------------------------------------------------------------------
   3. CÁLCULOS
   --------------------------------------------------------------------- */
/* Solo las asistencias validadas por Bienestar cuentan como horas libres */
const totalHoras = u => u.historial.filter(h => h.estado === "validada").reduce((s, h) => s + h.horas, 0);
const horasPendientes = u => u.historial.filter(h => h.estado === "pendiente").reduce((s, h) => s + h.horas, 0);
const horasFaltantes = u => Math.max(0, META_HL - totalHoras(u));

/* Nota de una materia con los cortes calificados (null si no tiene notas) */
function notaMateria(m) {
  let suma = 0, peso = 0;
  m.notas.forEach((n, i) => { if (n !== null) { suma += n * CORTES[i]; peso += CORTES[i]; } });
  return peso ? suma / peso : null;
}

/* Promedio ponderado por créditos de una lista de materias */
function promedioMaterias(materias) {
  let suma = 0, creditos = 0;
  materias.forEach(m => {
    const n = notaMateria(m);
    if (n !== null) { suma += n * m.creditos; creditos += m.creditos; }
  });
  return creditos ? suma / creditos : 0;
}
const promedioSemestre = sem => promedioMaterias(sem.materias);
const promedioAcumulado = () => promedioMaterias(SEMESTRES.flatMap(s => s.materias));
const creditosSemestre = sem => sem.materias.reduce((s, m) => s + m.creditos, 0);

/* Nota necesaria en los cortes pendientes (cortes fijos 30/30/40) */
function notaNecesaria(notas, meta) {
  return calcularPonderado(notas.map((n, i) => ({ peso: CORTES[i], nota: n })), meta);
}

/* Calculadora ponderada general.
   evaluaciones: [{ peso: 30, nota: 4.2 }, { peso: 40, nota: null }, ...] */
function calcularPonderado(evaluaciones, meta) {
  let acumulado = 0, evaluado = 0, pendiente = 0;
  evaluaciones.forEach(e => {
    if (e.nota === null) pendiente += e.peso;
    else { acumulado += e.nota * e.peso; evaluado += e.peso; }
  });
  return {
    acumulado: acumulado / 100,                          // lo ya ganado sobre 5.0
    promedioEvaluado: evaluado ? acumulado / evaluado : null,
    evaluado,
    pendiente,
    terminado: pendiente === 0,
    necesaria: pendiente ? (meta * 100 - acumulado) / pendiente : null
  };
}

/* Ranking: otros estudiantes + usuarios del portal. Devuelve el puesto propio. */
function dibujarRanking(contenedor, usuario) {
  const lista = RANKING.map(r => ({ ...r, yo: false }));
  obtenerUsuarios().forEach(u => {
    const yo = u.correo === usuario.correo;
    const partes = u.nombre.split(" ");
    lista.push({
      nombre: yo ? `${partes[0]} (tú)` : partes[0] + (partes[1] ? ` ${partes[1].charAt(0)}.` : ""),
      programa: u.programa, horas: totalHoras(u), yo
    });
  });
  lista.sort((a, b) => b.horas - a.horas);
  const posicion = lista.findIndex(r => r.yo) + 1;
  const fila = (r, i) => `<li class="${r.yo ? "ranking__yo" : ""}">
      <span class="ranking__puesto">${i + 1}</span>
      <span><strong>${esc(r.nombre)}</strong><br><small>${esc(r.programa)}</small></span>
      <span class="ranking__horas">${r.horas} h</span></li>`;
  let html = lista.slice(0, 5).map(fila).join("");
  if (posicion > 5) html += `<li class="ranking__separador" aria-hidden="true">···</li>` + fila(lista[posicion - 1], posicion - 1);
  contenedor.innerHTML = html;
  return posicion;
}

/* ---------------------------------------------------------------------
   4. VALIDACIONES DE FORMULARIO
   --------------------------------------------------------------------- */
function mostrarError(input, mensaje) {
  const campo = input.closest(".campo");
  let error = campo.querySelector(".error");
  if (!error) {
    error = document.createElement("p");
    error.className = "error";
    error.id = input.id + "-error";
    campo.appendChild(error);
  }
  error.textContent = mensaje;
  campo.classList.add("invalido");
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", error.id);
}

function limpiarError(input) {
  const campo = input.closest(".campo");
  const error = campo && campo.querySelector(".error");
  if (error) error.remove();
  if (campo) campo.classList.remove("invalido");
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");
}

/* reglas: lista de [input, función que devuelve "" o el mensaje de error] */
function validar(listaReglas) {
  let primeroConError = null;
  listaReglas.forEach(([input, regla]) => {
    const mensaje = regla(input.type === "checkbox" ? input.checked : input.value.trim());
    if (mensaje) {
      mostrarError(input, mensaje);
      if (!primeroConError) primeroConError = input;
    } else {
      limpiarError(input);
    }
  });
  if (primeroConError) primeroConError.focus();
  return !primeroConError;
}

const reglas = {
  /* Validación estricta: el correo debe terminar en @unab.edu.co */
  correoUnab: v => {
    if (!v) return "Escribe tu correo institucional.";
    if (!/^[a-z0-9._-]+@unab\.edu\.co$/i.test(v)) return "Usa tu correo institucional, que termina en @unab.edu.co.";
    return "";
  },
  requerido: nombre => v => (v ? "" : `Escribe ${nombre}.`),
  clave: v => {
    if (v.length < 8) return "La contraseña debe tener mínimo 8 caracteres.";
    if (!/[A-Z]/.test(v)) return "La contraseña debe tener al menos una letra mayúscula.";
    if (!/[0-9]/.test(v)) return "La contraseña debe tener al menos un número.";
    if (!/[^A-Za-z0-9]/.test(v)) return "La contraseña debe tener al menos un símbolo, por ejemplo * o #.";
    return "";
  },
  entre: (min, max, texto) => v => (v !== "" && Number(v) >= min && Number(v) <= max ? "" : texto)
};

function activarVerClave() {
  $$(".ver-clave").forEach(boton => {
    boton.addEventListener("click", () => {
      const input = boton.previousElementSibling;
      const oculto = input.type === "password";
      input.type = oculto ? "text" : "password";
      boton.textContent = oculto ? "Ocultar" : "Mostrar";
      boton.setAttribute("aria-pressed", String(oculto));
    });
  });
}

/* ---------------------------------------------------------------------
   5. PREFERENCIAS: MODO OSCURO Y TAMAÑO DE LETRA (se recuerdan)
   --------------------------------------------------------------------- */
function aplicarPreferencias() {
  const pref = leer(CLAVE_PREFERENCIAS, { tema: "claro", letra: 100 });
  document.documentElement.dataset.tema = pref.tema;
  document.documentElement.style.fontSize = pref.letra + "%";
  const botonTema = $("#boton-tema");
  if (botonTema) {
    botonTema.textContent = pref.tema === "oscuro" ? "Modo claro" : "Modo oscuro";
    botonTema.setAttribute("aria-pressed", String(pref.tema === "oscuro"));
  }
}

function activarPreferencias() {
  const cambiar = cambio => {
    const pref = leer(CLAVE_PREFERENCIAS, { tema: "claro", letra: 100 });
    cambio(pref);
    guardar(CLAVE_PREFERENCIAS, pref);
    aplicarPreferencias();
    return pref;
  };
  const botonTema = $("#boton-tema");
  if (botonTema) botonTema.addEventListener("click", () => cambiar(p => { p.tema = p.tema === "oscuro" ? "claro" : "oscuro"; }));
  const letra = paso => {
    const pref = cambiar(p => { p.letra = Math.min(130, Math.max(90, p.letra + paso)); });
    mostrarToast(`Tamaño de letra: ${pref.letra}%`);
  };
  const mas = $("#letra-mas"), menos = $("#letra-menos");
  if (mas) mas.addEventListener("click", () => letra(10));
  if (menos) menos.addEventListener("click", () => letra(-10));
}

/* ---------------------------------------------------------------------
   6. HEADER Y NAVEGACIÓN
   --------------------------------------------------------------------- */
function activarHeader(usuario) {
  const botonMenu = $(".menu-boton");
  const nav = $(".nav-global");
  if (botonMenu && nav) {
    botonMenu.addEventListener("click", () => {
      const abierto = nav.classList.toggle("abierto");
      botonMenu.setAttribute("aria-expanded", String(abierto));
      botonMenu.textContent = abierto ? "Cerrar" : "Menú";
    });
  }
  const archivo = location.pathname.split("/").pop() || "inicio.html";
  $$(".nav-global a").forEach(a => { if (a.getAttribute("href") === archivo) a.setAttribute("aria-current", "page"); });

  const salir = $("#boton-salir");
  if (salir) salir.addEventListener("click", () => { guardar(CLAVE_SESION, null); location.href = "index.html"; });

  if (usuario) $$("[data-nombre-usuario]").forEach(el => (el.textContent = usuario.nombre.split(" ")[0]));
}

/* Resalta en la navegación local la sección que se está viendo */
function activarNavLocal() {
  const enlaces = $$(".nav-local a");
  if (!enlaces.length || !("IntersectionObserver" in window)) return;
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting) {
        enlaces.forEach(a => a.classList.toggle("activo", a.getAttribute("href") === "#" + entrada.target.id));
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  enlaces.forEach(a => { const s = $(a.getAttribute("href")); if (s) observador.observe(s); });
}

/* ---------------------------------------------------------------------
   7a. INICIO DE SESIÓN (index.html)
   --------------------------------------------------------------------- */
/* "paula" o "paula@unab.edu.co" -> correo completo */
function aCorreo(texto) {
  const limpio = texto.trim().toLowerCase();
  return limpio.includes("@") ? limpio : limpio + "@unab.edu.co";
}

function iniciarLogin() {
  if (usuarioActual()) { location.href = "inicio.html"; return; }
  activarVerClave();
  const form = $("#form-login");
  const usuarioInput = $("#usuario");
  const clave = $("#contrasena");
  const aviso = $("#aviso-login");
  aviso.setAttribute("tabindex", "-1");

  const mostrarAviso = (tipo, html) => {
    aviso.className = "aviso" + (tipo ? " aviso--" + tipo : "");
    aviso.innerHTML = html;
    aviso.hidden = false;
  };

  if (new URLSearchParams(location.search).get("registro") === "ok") {
    mostrarAviso("exito", "<p>Tu cuenta quedó creada. Ya puedes iniciar sesión.</p>");
  }

  $$("[data-ayuda-acceso]").forEach(b => b.addEventListener("click", () => {
    mostrarAviso("", "<p>Para restablecer tu contraseña o resolver problemas de acceso, comunícate con soporte académico de la UNAB: línea gratuita 01 8000 931 170 · PBX (607) 643 6111.</p>");
    aviso.focus();
  }));

  form.addEventListener("submit", evento => {
    evento.preventDefault();
    aviso.hidden = true;
    const ok = validar([
      [usuarioInput, v => {
        if (!v) return "Escribe tu usuario institucional.";
        return reglas.correoUnab(aCorreo(v)) ? "Tu usuario debe ser institucional: si escribes el correo, tiene que terminar en @unab.edu.co." : "";
      }],
      [clave, reglas.requerido("tu contraseña")]
    ]);
    if (!ok) return;
    const usuario = buscarUsuario(aCorreo(usuarioInput.value));
    if (!usuario || usuario.clave !== clave.value) {
      mostrarAviso("error", "<p>El usuario o la contraseña no coinciden. Revisa los datos o crea una cuenta.</p>");
      clave.value = "";
      clave.focus();
      return;
    }
    guardar(CLAVE_SESION, usuario.correo);
    location.href = "inicio.html";
  });
}

/* ---------------------------------------------------------------------
   7b. CREAR CUENTA (registro.html)
   --------------------------------------------------------------------- */
function iniciarRegistro() {
  activarVerClave();
  const c = {
    nombre: $("#nombre"), codigo: $("#codigo"), programa: $("#programa"), semestre: $("#semestre"),
    correo: $("#correo"), clave: $("#clave"), confirmar: $("#confirmar"), acepto: $("#acepto")
  };
  const requisitos = {
    largo: v => v.length >= 8, mayuscula: v => /[A-Z]/.test(v),
    numero: v => /[0-9]/.test(v), simbolo: v => /[^A-Za-z0-9]/.test(v)
  };
  c.clave.addEventListener("input", () => {
    Object.entries(requisitos).forEach(([id, cumple]) => {
      const item = $(`#req-${id}`);
      const ok = cumple(c.clave.value);
      item.textContent = (ok ? "✓ " : "○ ") + item.dataset.texto;
      item.style.color = ok ? "var(--verde)" : "";
    });
  });

  $("#form-registro").addEventListener("submit", evento => {
    evento.preventDefault();
    const ok = validar([
      [c.nombre, v => (/^[A-Za-zÁÉÍÓÚÑáéíóúñü ]{3,}$/.test(v) ? "" : "Escribe tu nombre, solo con letras.")],
      [c.codigo, v => (/^U\d{8}$/i.test(v) ? "" : "El código empieza por U y tiene 8 números, por ejemplo U00123456.")],
      [c.programa, v => (v ? "" : "Elige tu programa.")],
      [c.semestre, v => (v ? "" : "Elige el semestre que cursas.")],
      [c.correo, v => reglas.correoUnab(v) || (buscarUsuario(v) ? "Ya existe una cuenta con este correo. Inicia sesión." : "")],
      [c.clave, reglas.clave],
      [c.confirmar, v => (v && v === c.clave.value ? "" : "Las contraseñas no coinciden.")],
      [c.acepto, v => (v ? "" : "Debes aceptar el tratamiento de datos para crear la cuenta.")]
    ]);
    if (!ok) return;
    const usuarios = obtenerUsuarios();
    usuarios.push(normalizarUsuario({
      nombre: c.nombre.value.trim(), codigo: c.codigo.value.trim().toUpperCase(),
      programa: c.programa.value, semestre: Number(c.semestre.value),
      correo: c.correo.value.trim().toLowerCase(), clave: c.clave.value, telefono: ""
    }));
    guardar(CLAVE_USUARIOS, usuarios);
    location.href = "index.html?registro=ok";
  });
}

/* ---------------------------------------------------------------------
   7c. PÁGINA PRINCIPAL (inicio.html)
   --------------------------------------------------------------------- */
function iniciarInicio(usuario) {
  const horas = totalHoras(usuario);
  const faltan = horasFaltantes(usuario);
  const pend = horasPendientes(usuario);
  $("#hl-cumplidas").textContent = horas;
  $("#hl-faltan").textContent = faltan;
  dibujarCuadricula($("#cuadricula-inicio"), horas, pend);

  // Alertas y recordatorios
  const diasCierre = Math.ceil((aFecha(CIERRE_SEMESTRE) - hoy()) / 86400000);
  const mensajes = [];
  if (faltan === 0) {
    mensajes.push(["exito", "Ya cumpliste las 96 horas libres. Puedes seguir participando en las actividades de Bienestar."]);
  } else if (diasCierre > 0) {
    const semanas = Math.max(1, Math.ceil(diasCierre / 7));
    const ritmo = Math.ceil(faltan / semanas);
    mensajes.push([faltan > 48 ? "error" : "", `Te faltan ${faltan} horas libres. Quedan ${diasCierre} días para el cierre del semestre (${formatoFecha(aFecha(CIERRE_SEMESTRE))}). Si sumas unas ${ritmo} horas por semana, cerrarías el semestre con ${Math.min(META_HL, horas + ritmo * semanas)} horas.`]);
  }
  if (pend) mensajes.push(["", `Tienes ${plural(pend, "hora", "horas")} pendientes de validación por Bienestar. Revísalas en <a href="horas-libres.html#historial">tu historial</a>.`]);
  if (!usuario.inscripciones.length) mensajes.push(["", "Aún no estás inscrito en ningún lugar. Revisa los <a href=\"lugares.html\">lugares disponibles</a> y elige un horario que te sirva."]);
  $("#alertas").innerHTML = mensajes.map(([t, txt]) => `<div class="aviso ${t ? "aviso--" + t : ""}"><p>${txt}</p></div>`).join("");

  dibujarRanking($("#ranking-inicio"), usuario);

  const proximos = EVENTOS.filter(e => aFecha(e.fecha) >= hoy()).slice(0, 4);
  $("#proximos-eventos").innerHTML = proximos.length
    ? proximos.map(e => {
        const f = aFecha(e.fecha);
        return `<li><div class="fecha-mini"><b>${f.getDate()}</b><small>${MESES[f.getMonth()].slice(0, 3)}</small></div>
          <div><strong>${e.titulo}</strong><p>${e.lugar} · ${plural(e.horas, "hora", "horas")}</p></div></li>`;
      }).join("")
    : "<li><p>No hay eventos programados por ahora.</p></li>";
}

/* ---------------------------------------------------------------------
   7d. PERFIL (perfil.html)
   --------------------------------------------------------------------- */
function iniciarPerfil(usuario) {
  const pintar = () => {
    $("#p-nombre").textContent = usuario.nombre;
    $("#p-codigo").textContent = usuario.codigo;
    $("#p-programa").textContent = usuario.programa;
    $("#p-semestre").textContent = usuario.semestre + ".º semestre";
    $("#p-correo").textContent = usuario.correo;
    $("#p-telefono").textContent = usuario.telefono || "Sin registrar";
    $("#p-horas").textContent = `${totalHoras(usuario)} de ${META_HL}`;
    $("#p-lugares").textContent = usuario.inscripciones.length;
    $("#p-iniciales").textContent = usuario.nombre.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
    $$("[data-nombre-usuario]").forEach(el => (el.textContent = usuario.nombre.split(" ")[0]));
  };
  pintar();
  $("#e-telefono").value = usuario.telefono;
  $("#e-semestre").value = usuario.semestre;
  $("#form-perfil").addEventListener("submit", evento => {
    evento.preventDefault();
    const tel = $("#e-telefono");
    if (!validar([[tel, v => (!v || /^3\d{9}$/.test(v) ? "" : "Escribe un celular colombiano de 10 dígitos que empiece por 3.")]])) return;
    usuario.telefono = tel.value.trim();
    usuario.semestre = Number($("#e-semestre").value);
    actualizarUsuario(usuario);
    pintar();
    mostrarToast("Datos guardados.");
  });
}

/* ---------------------------------------------------------------------
   7e. MIS HORAS LIBRES (horas-libres.html)
   CRUD de asistencias: registrar (crear), ver y ordenar (leer),
   validar (actualizar) y eliminar las pendientes (borrar).
   --------------------------------------------------------------------- */
function iniciarHoras(usuario) {
  const cuerpo = $("#tabla-historial tbody");
  let orden = { campo: "fecha", sentido: "desc" };

  const pintarTodo = () => {
    const horas = totalHoras(usuario);
    const faltan = horasFaltantes(usuario);
    const pend = horasPendientes(usuario);
    $("#hl-cumplidas").textContent = horas;
    $("#hl-faltan").textContent = faltan;
    $("#hl-pendientes").textContent = pend;
    $("#hl-porcentaje").textContent = Math.round((Math.min(horas, META_HL) / META_HL) * 100) + "%";
    dibujarCuadricula($("#cuadricula-hl"), horas, pend);

    // Horas validadas por categoría
    const porCategoria = Object.fromEntries(Object.keys(CATEGORIAS).map(c => [c, 0]));
    usuario.historial.filter(h => h.estado === "validada").forEach(h => (porCategoria[h.categoria] += h.horas));
    $("#por-categoria").innerHTML = Object.entries(porCategoria).map(([cat, h]) => `
      <li><div class="barra-titulo"><span>${CATEGORIAS[cat]}</span><strong>${h} h</strong></div>
      <div class="barra"><span style="width:${horas ? (h / horas) * 100 : 0}%"></span></div></li>`).join("");

    // Historial ordenado
    const filas = usuario.historial.slice().sort((a, b) => {
      const va = a[orden.campo], vb = b[orden.campo];
      const r = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "es");
      return orden.sentido === "asc" ? r : -r;
    });
    cuerpo.innerHTML = filas.length
      ? filas.map(h => `<tr class="${h.estado === "pendiente" ? "fila-pendiente" : ""}">
          <td style="white-space:nowrap">${formatoCorto(aFecha(h.fecha))}</td>
          <td>${esc(h.actividad)}</td>
          <td>${esc(h.lugar)}</td>
          <td><span class="etiqueta etiqueta--${h.categoria}">${CATEGORIAS[h.categoria]}</span></td>
          <td class="numero">${h.horas}</td>
          <td><span class="etiqueta etiqueta--${h.estado}">${h.estado === "validada" ? "Validada" : "Pendiente"}</span></td>
          <td class="no-imprimir">${h.estado === "pendiente"
            ? `<div class="grupo-botones">
                 <button type="button" class="boton boton--exito boton--pequeno" data-validar="${h.id}">Validar</button>
                 <button type="button" class="boton boton--peligro boton--pequeno" data-eliminar="${h.id}">Eliminar</button>
               </div>`
            : `<span class="ayuda">Validada por Bienestar</span>`}</td></tr>`).join("")
      : `<tr><td colspan="7">Todavía no tienes asistencias. Registra la primera con el botón «Registrar asistencia».</td></tr>`;

    const puesto = dibujarRanking($("#lista-ranking"), usuario);
    $("#mi-puesto").textContent = puesto;
    $("#mis-horas-ranking").textContent = horas;
  };

  // Ordenar por columna
  $$("#tabla-historial th button").forEach(boton => {
    boton.addEventListener("click", () => {
      orden = { campo: boton.dataset.campo, sentido: boton.dataset.orden === "asc" ? "desc" : "asc" };
      $$("#tabla-historial th button").forEach(b => b.removeAttribute("data-orden"));
      boton.dataset.orden = orden.sentido;
      pintarTodo();
    });
  });

  // Validar (actualizar) o eliminar (borrar) una asistencia pendiente
  cuerpo.addEventListener("click", e => {
    const validarBtn = e.target.closest("[data-validar]");
    const eliminarBtn = e.target.closest("[data-eliminar]");
    if (validarBtn) {
      const a = usuario.historial.find(h => h.id === validarBtn.dataset.validar);
      a.estado = "validada";
      actualizarUsuario(usuario);
      pintarTodo();
      mostrarToast(`Asistencia validada: sumaste ${plural(a.horas, "hora libre", "horas libres")}.`);
    }
    if (eliminarBtn) {
      const a = usuario.historial.find(h => h.id === eliminarBtn.dataset.eliminar);
      if (!confirm(`¿Eliminar la asistencia «${a.actividad}» del ${formatoFecha(aFecha(a.fecha))}?`)) return;
      usuario.historial = usuario.historial.filter(h => h.id !== a.id);
      actualizarUsuario(usuario);
      pintarTodo();
      mostrarToast("Asistencia eliminada.");
    }
  });

  // Registrar asistencia (crear)
  const panel = $("#panel-asistencia");
  const form = $("#form-asistencia");
  const f = { fecha: $("#as-fecha"), lugar: $("#as-lugar"), actividad: $("#as-actividad"), categoria: $("#as-categoria"), horas: $("#as-horas") };
  f.lugar.innerHTML = `<option value="">Elige un lugar</option>` +
    LUGARES.map(l => `<option value="${l.id}">${esc(l.nombre)}</option>`).join("") + `<option value="otro">Otro lugar del campus</option>`;
  f.fecha.max = aTexto(hoy());
  f.lugar.addEventListener("change", () => {             // sugiere la categoría del lugar
    const l = buscarLugar(f.lugar.value);
    if (l) f.categoria.value = l.categoria;
  });
  $("#abrir-asistencia").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { f.fecha.value = aTexto(hoy()); f.fecha.focus(); }
  });
  $("#cancelar-asistencia").addEventListener("click", () => { form.reset(); panel.hidden = true; });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const ok = validar([
      [f.fecha, v => (!v ? "Elige la fecha de la actividad." : aFecha(v) > hoy() ? "La fecha no puede ser futura." : "")],
      [f.lugar, v => (v ? "" : "Elige el lugar.")],
      [f.actividad, v => (v.length >= 3 ? "" : "Escribe el nombre de la actividad (mínimo 3 caracteres).")],
      [f.categoria, v => (v ? "" : "Elige la categoría.")],
      [f.horas, reglas.entre(1, 8, "Escribe entre 1 y 8 horas.")]
    ]);
    if (!ok) return;
    const l = buscarLugar(f.lugar.value);
    usuario.historial.push({
      id: "a" + Date.now(), fecha: f.fecha.value, actividad: f.actividad.value.trim(),
      lugar: l ? l.nombre : "Otro lugar del campus", categoria: f.categoria.value,
      horas: Number(f.horas.value), estado: "pendiente"
    });
    actualizarUsuario(usuario);
    form.reset();
    panel.hidden = true;
    pintarTodo();
    mostrarToast("Asistencia registrada. Queda pendiente hasta que Bienestar la valide.");
  });

  $("#boton-imprimir").addEventListener("click", () => window.print());

  // Simulador
  $("#form-simulador").addEventListener("submit", e => {
    e.preventDefault();
    const input = $("#horas-semana");
    if (!validar([[input, reglas.entre(1, 20, "Escribe un número de horas entre 1 y 20.")]])) return;
    const porSemana = Number(input.value);
    const faltan = horasFaltantes(usuario);
    const resultado = $("#resultado-simulador");
    if (faltan === 0) {
      resultado.innerHTML = "<p>Ya cumpliste las 96 horas. ¡Felicitaciones!</p>";
    } else {
      const semanas = Math.ceil(faltan / porSemana);
      const fin = hoy();
      fin.setDate(fin.getDate() + semanas * 7);
      resultado.innerHTML = `<p>Con <strong>${plural(porSemana, "hora", "horas")} por semana</strong> completarías las ${faltan} horas que te faltan en <strong>${plural(semanas, "semana", "semanas")}</strong>, más o menos el ${formatoFecha(fin)}.</p>`;
    }
    resultado.hidden = false;
  });

  pintarTodo();
}

/* ---------------------------------------------------------------------
   7f. LUGARES (lugares.html)
   Buscador y filtros, inscripción, plano interactivo y CRUD de
   actividades propias: crear, editar y eliminar.
   --------------------------------------------------------------------- */
function cuposDisponibles(lugar, usuario) {
  const inscrito = usuario.inscripciones.some(i => i.lugar === lugar.id);
  return lugar.cupos - lugar.inscritos - (inscrito ? 1 : 0);
}

/* Plano esquemático por sedes con un marcador por lugar */
function dibujarPlano() {
  let n = 0;
  $("#plano").innerHTML = ZONAS.map(z => {
    const lugares = LUGARES.filter(l => l.zona === z.id);
    return `<div class="plano__zona">
      <p class="plano__zona-nombre">${z.nombre}<small>${z.detalle}</small></p>
      ${lugares.map(l => `<button type="button" class="plano__marcador" data-plano="${l.id}" aria-pressed="false">
          <span class="plano__pin" aria-hidden="true">${++n}</span>${esc(l.nombre)}</button>`).join("")}
    </div>`;
  }).join("");
}

/* Muestra la información del lugar elegido y actualiza Google Maps */
function seleccionarEnPlano(id, desplazar = true) {
  const l = buscarLugar(id);
  if (!l) return;
  $$("[data-plano]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.plano === id)));
  $("#plano-info").innerHTML = `
    ${l.foto ? `<img src="${l.foto}" alt="Foto de ${esc(l.nombre)}" class="plano__foto">` : ""}
    <span class="etiqueta etiqueta--${l.categoria}">${CATEGORIAS[l.categoria]}</span>
    ${l.propia ? `<span class="etiqueta etiqueta--propia">Creada por ti</span>` : ""}
    <h3 style="margin:.5rem 0 .25rem">${esc(l.nombre)}</h3>
    <p class="lugar__zona">${nombreZona(l.zona)}</p>
    ${l.atencion ? `<p><strong>Horario de atención:</strong> ${l.atencion}</p>` : ""}
    <p class="lugar__sesiones-titulo">Sesiones de horas libres (${plural(l.horasPorSesion, "hora", "horas")} c/u):</p>
    <ul>${l.horarios.map(s => `<li>${textoSesion(s)}</li>`).join("")}</ul>
    <a class="boton boton--pequeno" href="#disponibles" data-ir-lugar="${l.id}">Ver tarjeta e inscribirme</a>`;
  $("#mapa-iframe").src = "https://www.google.com/maps?q=" + encodeURIComponent(l.mapa) + "&output=embed";
  $("#mapa-titulo").textContent = l.nombre;
  if (desplazar) $("#mapa").scrollIntoView({ behavior: "smooth" });
}

function iniciarLugares(usuario) {
  const lista = $("#lista-lugares");
  const buscador = $("#buscar");
  const filtroCategoria = $("#filtro-categoria");
  const filtroDia = $("#filtro-dia");

  const pintar = () => {
    const texto = buscador.value.trim().toLowerCase();
    const cat = filtroCategoria.value;
    const dia = filtroDia.value;
    const visibles = LUGARES.filter(l =>
      (l.nombre.toLowerCase().includes(texto) || l.descripcion.toLowerCase().includes(texto)) &&
      (!cat || l.categoria === cat) &&
      (!dia || l.horarios.some(s => s.dias.includes(dia))));
    $("#contador-lugares").textContent = visibles.length === 1 ? "1 lugar encontrado" : `${visibles.length} lugares encontrados`;
    if (!visibles.length) {
      lista.innerHTML = `<p class="sin-resultados">Ningún lugar coincide con la búsqueda. Prueba con otra palabra o quita los filtros.</p>`;
      return;
    }
    lista.innerHTML = visibles.map(l => {
      const inscripcion = usuario.inscripciones.find(i => i.lugar === l.id);
      const disponibles = cuposDisponibles(l, usuario);
      let acciones;
      if (inscripcion) {
        acciones = `<p class="cupos"><strong>Ya estás inscrito</strong><br>${textoSesion(l.horarios[inscripcion.sesion])}</p>
          <a class="boton boton--secundario boton--pequeno" href="mis-lugares.html">Ver mis lugares</a>`;
      } else if (disponibles <= 0) {
        acciones = `<p class="cupos cupos--lleno">Sin cupos este semestre</p>`;
      } else {
        acciones = `<p class="cupos">${disponibles} de ${l.cupos} cupos libres</p>
          <label class="solo-lector" for="sesion-${l.id}">Horario para ${esc(l.nombre)}</label>
          <select id="sesion-${l.id}">${l.horarios.map((s, i) => `<option value="${i}">${textoSesion(s)}</option>`).join("")}</select>
          <button type="button" class="boton boton--pequeno" data-inscribir="${l.id}">Inscribirme</button>`;
      }
      if (l.propia) {
        acciones += `<div class="grupo-botones">
            <button type="button" class="boton boton--secundario boton--pequeno" data-editar="${l.id}">Editar</button>
            <button type="button" class="boton boton--peligro boton--pequeno" data-borrar="${l.id}">Eliminar</button></div>`;
      }
      return `<article class="lugar ${l.foto ? "lugar--con-foto" : ""}">
        ${fotoLugar(l)}
        <div>
          <span class="etiqueta etiqueta--${l.categoria}">${CATEGORIAS[l.categoria]}</span>
          ${l.propia ? `<span class="etiqueta etiqueta--propia">Creada por ti</span>` : ""}
          <h3>${esc(l.nombre)}</h3>
          <p class="lugar__zona">${nombreZona(l.zona)} · ${plural(l.horasPorSesion, "hora libre", "horas libres")} por sesión</p>
          <p>${esc(l.descripcion)}</p>
          ${l.atencion ? `<p class="lugar__atencion"><strong>Horario de atención:</strong> ${l.atencion}</p>` : ""}
          <p class="lugar__sesiones-titulo">Sesiones de horas libres:</p>
          <ul>${l.horarios.map(s => `<li>${textoSesion(s)}</li>`).join("")}</ul>
          <button type="button" class="boton boton--secundario boton--pequeno" style="margin-top:.75rem" data-mapa="${l.id}">Ver en el mapa</button>
        </div>
        <div class="lugar__acciones">${acciones}</div>
      </article>`;
    }).join("");
  };

  const repintarTodo = () => { pintar(); dibujarPlano(); };

  buscador.addEventListener("input", pintar);
  filtroCategoria.addEventListener("change", pintar);
  filtroDia.addEventListener("change", pintar);
  $("#limpiar-filtros").addEventListener("click", () => {
    buscador.value = ""; filtroCategoria.value = ""; filtroDia.value = "";
    pintar();
    buscador.focus();
  });

  // Plano interactivo
  dibujarPlano();
  $("#plano").addEventListener("click", e => {
    const b = e.target.closest("[data-plano]");
    if (b) seleccionarEnPlano(b.dataset.plano, false);
  });
  $("#plano-info").addEventListener("click", e => {
    const ir = e.target.closest("[data-ir-lugar]");
    if (!ir) return;
    const l = buscarLugar(ir.dataset.irLugar);
    buscador.value = l.nombre; filtroCategoria.value = ""; filtroDia.value = "";
    pintar();
  });

  // CRUD de actividades propias
  const panel = $("#panel-lugar");
  const form = $("#form-lugar");
  const f = {
    id: $("#lp-id"), nombre: $("#lp-nombre"), categoria: $("#lp-categoria"), zona: $("#lp-zona"),
    dia: $("#lp-dia"), ini: $("#lp-ini"), fin: $("#lp-fin"), horas: $("#lp-horas"), cupos: $("#lp-cupos"), descripcion: $("#lp-descripcion")
  };
  f.zona.innerHTML = ZONAS.map(z => `<option value="${z.id}">${z.nombre}</option>`).join("");
  f.dia.innerHTML = DIAS_SEMANA.map(d => `<option>${d}</option>`).join("");

  const abrirFormulario = (lugar = null) => {
    form.reset();
    $$(".campo.invalido", form).forEach(c => c.classList.remove("invalido"));
    $$(".error", form).forEach(e => e.remove());
    f.id.value = lugar ? lugar.id : "";
    $("#titulo-panel-lugar").textContent = lugar ? `Editar «${lugar.nombre}»` : "Crear una actividad o lugar";
    $("#guardar-lugar").textContent = lugar ? "Guardar cambios" : "Crear actividad";
    if (lugar) {
      f.nombre.value = lugar.nombre; f.categoria.value = lugar.categoria; f.zona.value = lugar.zona;
      f.dia.value = lugar.horarios[0].dias[0]; f.ini.value = lugar.horarios[0].ini; f.fin.value = lugar.horarios[0].fin;
      f.horas.value = lugar.horasPorSesion; f.cupos.value = lugar.cupos; f.descripcion.value = lugar.descripcion;
    }
    panel.hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
    f.nombre.focus({ preventScroll: true });
  };

  $("#abrir-lugar").addEventListener("click", () => abrirFormulario());
  $("#cancelar-lugar").addEventListener("click", () => { panel.hidden = true; });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const editando = f.id.value;
    const ok = validar([
      [f.nombre, v => {
        if (v.length < 3) return "Escribe un nombre de mínimo 3 caracteres.";
        const repetido = LUGARES.some(l => l.nombre.toLowerCase() === v.toLowerCase() && l.id !== editando);
        return repetido ? "Ya existe un lugar con ese nombre." : "";
      }],
      [f.categoria, v => (v ? "" : "Elige la categoría.")],
      [f.ini, reglas.entre(6, 21, "La hora de inicio va de 6 a 21.")],
      [f.fin, v => (Number(v) > Number(f.ini.value) && Number(v) <= 22 ? "" : "La hora de fin debe ser mayor que la de inicio (máximo 22).")],
      [f.horas, v => (Number(v) >= 1 && Number(v) <= Number(f.fin.value) - Number(f.ini.value) ? "" : "Las horas por sesión no pueden superar la duración de la sesión.")],
      [f.cupos, reglas.entre(1, 200, "Escribe entre 1 y 200 cupos.")],
      [f.descripcion, v => (v.length >= 10 ? "" : "Describe la actividad (mínimo 10 caracteres).")]
    ]);
    if (!ok) return;
    const datos = {
      nombre: f.nombre.value.trim(), categoria: f.categoria.value, zona: f.zona.value,
      descripcion: f.descripcion.value.trim(), atencion: null,
      horarios: [{ dias: [f.dia.value], ini: Number(f.ini.value), fin: Number(f.fin.value) }],
      horasPorSesion: Number(f.horas.value), cupos: Number(f.cupos.value), foto: null, propia: true,
      mapa: "Universidad Autónoma de Bucaramanga, Avenida 42 No. 48-11, Bucaramanga"
    };
    if (editando) {
      const propio = usuario.lugaresPropios.find(l => l.id === editando);
      Object.assign(propio, datos);
      Object.assign(buscarLugar(editando), datos);
      // Si cambió el horario, la inscripción vuelve a la única sesión
      usuario.inscripciones.filter(i => i.lugar === editando).forEach(i => (i.sesion = 0));
      mostrarToast(`Guardaste los cambios de «${datos.nombre}».`);
    } else {
      const nuevo = { id: "propio" + Date.now(), inscritos: 0, ...datos };
      usuario.lugaresPropios.push(nuevo);
      LUGARES.push({ ...nuevo });
      mostrarToast(`Creaste la actividad «${datos.nombre}». Ya aparece en la lista y en el plano.`);
    }
    actualizarUsuario(usuario);
    panel.hidden = true;
    repintarTodo();
  });

  // Acciones de la lista: inscribirse, ver en el mapa, editar y eliminar
  lista.addEventListener("click", evento => {
    const inscribir = evento.target.closest("[data-inscribir]");
    const verMapa = evento.target.closest("[data-mapa]");
    const editar = evento.target.closest("[data-editar]");
    const borrar = evento.target.closest("[data-borrar]");
    if (inscribir) {
      const id = inscribir.dataset.inscribir;
      const sesion = Number($(`#sesion-${id}`).value);
      usuario.inscripciones.push({ lugar: id, sesion });
      actualizarUsuario(usuario);
      const l = buscarLugar(id);
      mostrarToast(`Quedaste inscrito en ${l.nombre}: ${textoSesion(l.horarios[sesion])}.`);
      pintar();
    }
    if (verMapa) seleccionarEnPlano(verMapa.dataset.mapa);
    if (editar) abrirFormulario(buscarLugar(editar.dataset.editar));
    if (borrar) {
      const l = buscarLugar(borrar.dataset.borrar);
      if (!confirm(`¿Eliminar la actividad «${l.nombre}»? También se cancelará tu inscripción en ella.`)) return;
      usuario.lugaresPropios = usuario.lugaresPropios.filter(x => x.id !== l.id);
      usuario.inscripciones = usuario.inscripciones.filter(i => i.lugar !== l.id);
      LUGARES.splice(LUGARES.indexOf(l), 1);
      actualizarUsuario(usuario);
      repintarTodo();
      mostrarToast(`Eliminaste «${l.nombre}».`);
    }
  });

  pintar();
  const diaUrl = new URLSearchParams(location.search).get("dia");
  if (diaUrl) { filtroDia.value = diaUrl; pintar(); }
}

/* ---------------------------------------------------------------------
   7g. MIS LUGARES (mis-lugares.html)
   --------------------------------------------------------------------- */
function iniciarMisLugares(usuario) {
  const contenedor = $("#mis-lugares");
  // Quita inscripciones de lugares que ya no existen
  usuario.inscripciones = usuario.inscripciones.filter(i => buscarLugar(i.lugar));

  const pintar = () => {
    $("#total-inscritos").textContent = plural(usuario.inscripciones.length, "lugar", "lugares");
    if (!usuario.inscripciones.length) {
      contenedor.innerHTML = `<div class="vacio"><h3>No estás inscrito en ningún lugar</h3>
        <p>Elige un lugar del campus y un horario que no se cruce con tus clases.</p>
        <a class="boton" href="lugares.html">Ver lugares disponibles</a></div>`;
      return;
    }
    contenedor.innerHTML = `<div class="lugares">` + usuario.inscripciones.map((ins, i) => {
      const l = buscarLugar(ins.lugar);
      return `<article class="lugar ${l.foto ? "lugar--con-foto" : ""}">
        ${fotoLugar(l)}
        <div>
          <span class="etiqueta etiqueta--${l.categoria}">${CATEGORIAS[l.categoria]}</span>
          ${l.propia ? `<span class="etiqueta etiqueta--propia">Creada por ti</span>` : ""}
          <h3>${esc(l.nombre)}</h3>
          <p class="lugar__zona">${nombreZona(l.zona)}</p>
          <p><strong>Tu horario:</strong> ${textoSesion(l.horarios[ins.sesion] || l.horarios[0])}<br>
          Sumas ${plural(l.horasPorSesion, "hora libre", "horas libres")} por cada sesión a la que asistas.</p>
        </div>
        <div class="lugar__acciones">
          <button type="button" class="boton boton--peligro boton--pequeno" data-cancelar="${i}">Cancelar inscripción</button>
        </div>
      </article>`;
    }).join("") + `</div>`;
  };
  pintar();

  contenedor.addEventListener("click", evento => {
    const boton = evento.target.closest("[data-cancelar]");
    if (!boton) return;
    const ins = usuario.inscripciones[Number(boton.dataset.cancelar)];
    const l = buscarLugar(ins.lugar);
    if (!confirm(`¿Cancelar tu inscripción en ${l.nombre}? Liberarás tu cupo.`)) return;
    usuario.inscripciones.splice(Number(boton.dataset.cancelar), 1);
    actualizarUsuario(usuario);
    mostrarToast(`Cancelaste tu inscripción en ${l.nombre}.`);
    pintar();
  });
}

/* ---------------------------------------------------------------------
   7h. ACADÉMICO (academico.html): notas de dos semestres, cursos y horario
   --------------------------------------------------------------------- */
function iniciarAcademico() {
  const pestanas = $("#pestanas-semestre");
  pestanas.innerHTML = SEMESTRES.map((sem, i) =>
    `<button type="button" role="tab" aria-selected="${i === 0}" data-semestre="${i}">${sem.nombre}${sem.actual ? " (actual)" : ""}</button>`).join("");

  const pintarNotas = indice => {
    const sem = SEMESTRES[indice];
    $("#tabla-notas tbody").innerHTML = sem.materias.map(m => {
      const def = notaMateria(m);
      const celdas = m.notas.map(n => `<td class="numero ${n !== null && n < NOTA_APROBATORIA ? "nota-baja" : ""}">${n === null ? "—" : n.toFixed(1)}</td>`).join("");
      return `<tr><td>${m.nombre}</td><td class="numero">${m.creditos}</td>${celdas}
        <td class="numero ${def !== null && def < NOTA_APROBATORIA ? "nota-baja" : ""}"><strong>${def === null ? "—" : def.toFixed(2)}</strong></td></tr>`;
    }).join("");
    $("#promedio-semestre").textContent = promedioSemestre(sem).toFixed(2);
    $("#creditos-semestre").textContent = creditosSemestre(sem);
    $("#texto-promedio").textContent = sem.actual ? "Promedio parcial del semestre" : "Promedio final del semestre";
    $$("button", pestanas).forEach(b => b.setAttribute("aria-selected", String(Number(b.dataset.semestre) === indice)));
  };
  pestanas.addEventListener("click", e => {
    const b = e.target.closest("[data-semestre]");
    if (b) pintarNotas(Number(b.dataset.semestre));
  });
  pintarNotas(0);
  $("#promedio-acumulado").textContent = promedioAcumulado().toFixed(2);

  // Cursos del semestre actual
  $("#lista-cursos").innerHTML = MATERIAS.map(m => {
    const dias = Object.entries(HORARIO)
      .filter(([, clases]) => clases.some(c => c.materia === m.nombre))
      .map(([dia, clases]) => { const c = clases.find(x => x.materia === m.nombre); return `${dia} ${hora(c.ini)} – ${hora(c.fin)}`; });
    return `<li><strong>${m.nombre}</strong> · ${m.creditos} créditos<br><span style="color:var(--gris)">${dias.join(" · ")}</span></li>`;
  }).join("");
  $("#total-creditos").textContent = creditosSemestre(SEMESTRES[0]);

  // Horario + sugerencias de horas libres en los espacios sin clase
  const celda = {};
  DIAS_SEMANA.forEach(dia => (HORARIO[dia] || []).forEach(c => {
    for (let h = c.ini; h < c.fin; h++) celda[`${dia}-${h}`] = { tipo: "clase", texto: c.materia };
  }));
  const sugerencias = [];
  LUGARES.forEach(l => l.horarios.forEach(s => s.dias.forEach(dia => {
    let libre = true;
    for (let h = s.ini; h < s.fin; h++) if (celda[`${dia}-${h}`]) libre = false;
    if (libre) {
      for (let h = s.ini; h < s.fin; h++) celda[`${dia}-${h}`] = { tipo: "sugerida", texto: l.nombre };
      sugerencias.push({ dia, lugar: l, sesion: s });
    }
  })));
  let html = `<thead><tr><th scope="col"><span class="solo-lector">Hora</span></th>${DIAS_SEMANA.map(d => `<th scope="col">${d}</th>`).join("")}</tr></thead><tbody>`;
  for (let h = 6; h < 19; h++) {
    html += `<tr><th scope="row">${hora(h)}</th>` + DIAS_SEMANA.map(d => {
      const c = celda[`${d}-${h}`];
      return c ? `<td class="${c.tipo}">${esc(c.texto)}</td>` : "<td></td>";
    }).join("") + "</tr>";
  }
  $("#tabla-horario").innerHTML = html + "</tbody>";

  sugerencias.sort((a, b) => DIAS_SEMANA.indexOf(a.dia) - DIAS_SEMANA.indexOf(b.dia) || a.sesion.ini - b.sesion.ini);
  $("#lista-sugerencias").innerHTML = sugerencias.slice(0, 8).map(s =>
    `<li><strong>${s.dia} ${hora(s.sesion.ini)} – ${hora(s.sesion.fin)}</strong>: ${esc(s.lugar.nombre)}
     (${plural(s.lugar.horasPorSesion, "hora", "horas")}). <a href="lugares.html?dia=${encodeURIComponent(s.dia)}">Ver lugares del ${s.dia.toLowerCase()}</a></li>`).join("");
}

/* ---------------------------------------------------------------------
   7i. CALCULADORA DE NOTAS (calculadora.html)
   --------------------------------------------------------------------- */
function iniciarCalculadora() {
  const select = $("#calc-materia");
  const lista = $("#lista-evaluaciones");
  const total = $("#total-porcentaje");
  const meta = $("#calc-meta");
  const resultado = $("#calc-resultado");
  let contador = 0;

  // Materias de los dos semestres, agrupadas
  select.innerHTML = SEMESTRES.map((sem, s) =>
    `<optgroup label="${sem.nombre}">${sem.materias.map((m, i) => `<option value="${s}-${i}">${m.nombre}</option>`).join("")}</optgroup>`).join("") +
    `<option value="otra">Otra materia (escribir mis evaluaciones)</option>`;

  const filaEvaluacion = (nombre = "", peso = "", nota = "") => {
    contador++;
    const fila = document.createElement("div");
    fila.className = "evaluacion";
    fila.innerHTML = `
      <div class="campo"><label class="solo-lector" for="ev-nombre-${contador}">Nombre de la evaluación</label>
        <input type="text" id="ev-nombre-${contador}" data-nombre value="${esc(nombre)}" placeholder="Ej.: parcial, taller, exposición"></div>
      <div class="campo"><label class="solo-lector" for="ev-peso-${contador}">Porcentaje</label>
        <input type="number" id="ev-peso-${contador}" data-peso min="1" max="100" step="1" value="${peso}" placeholder="%"></div>
      <div class="campo"><label class="solo-lector" for="ev-nota-${contador}">Nota</label>
        <input type="number" id="ev-nota-${contador}" data-nota min="0" max="5" step="0.1" value="${nota}" placeholder="Pendiente"></div>
      <button type="button" class="boton boton--peligro boton--pequeno" data-quitar aria-label="Quitar evaluación">Quitar</button>`;
    lista.appendChild(fila);
  };

  const actualizarTotal = () => {
    const suma = $$("[data-peso]", lista).reduce((s, i) => s + (Number(i.value) || 0), 0);
    total.textContent = `Total: ${suma}%` + (suma === 100 ? " ✓" : " · debe sumar 100%");
    total.classList.toggle("total-porcentaje--error", suma !== 100);
    return suma;
  };

  const cargarMateria = () => {
    lista.innerHTML = "";
    if (select.value === "otra") {
      filaEvaluacion("Parcial 1", 30); filaEvaluacion("Parcial 2", 30); filaEvaluacion("Examen final", 40);
    } else {
      const [s, i] = select.value.split("-").map(Number);
      SEMESTRES[s].materias[i].notas.forEach((n, k) => filaEvaluacion(`Corte ${k + 1}`, CORTES[k], n === null ? "" : n));
    }
    actualizarTotal();
    resultado.hidden = true;
  };
  select.addEventListener("change", cargarMateria);
  cargarMateria();

  $("#agregar-evaluacion").addEventListener("click", () => {
    filaEvaluacion();
    actualizarTotal();
    $("[data-nombre]", lista.lastElementChild).focus();
  });
  lista.addEventListener("click", e => {
    const quitar = e.target.closest("[data-quitar]");
    if (!quitar) return;
    if ($$(".evaluacion", lista).length === 1) { mostrarToast("Debe quedar al menos una evaluación."); return; }
    quitar.closest(".evaluacion").remove();
    actualizarTotal();
  });
  lista.addEventListener("input", e => { if (e.target.matches("[data-peso]")) actualizarTotal(); });

  $("#form-calculadora").addEventListener("submit", e => {
    e.preventDefault();
    const filas = $$(".evaluacion", lista);
    const ok = validar([
      ...filas.map(f => [$("[data-peso]", f), reglas.entre(1, 100, "Porcentaje entre 1 y 100.")]),
      ...filas.map(f => [$("[data-nota]", f), v => (v === "" || (Number(v) >= 0 && Number(v) <= 5) ? "" : "Nota entre 0.0 y 5.0.")]),
      [meta, reglas.entre(3, 5, "La meta debe estar entre 3.0 y 5.0.")]
    ]);
    if (!ok) return;
    if (actualizarTotal() !== 100) {
      resultado.className = "aviso aviso--error";
      resultado.innerHTML = "<p>Los porcentajes deben sumar exactamente 100%. Ajusta los valores antes de calcular.</p>";
      resultado.hidden = false;
      return;
    }
    const evaluaciones = filas.map(f => ({
      peso: Number($("[data-peso]", f).value),
      nota: $("[data-nota]", f).value === "" ? null : Number($("[data-nota]", f).value)
    }));
    const objetivo = Number(meta.value);
    const r = calcularPonderado(evaluaciones, objetivo);
    const lineas = [];
    if (r.promedioEvaluado !== null) {
      lineas.push(`Promedio ponderado de lo evaluado (${r.evaluado}%): <strong>${r.promedioEvaluado.toFixed(2)}</strong>.`);
      lineas.push(`Llevas acumulado <strong>${r.acumulado.toFixed(2)}</strong> de 5.0.`);
    }
    let tipo;
    if (r.terminado) {
      lineas.push(`Tu definitiva es <strong>${r.acumulado.toFixed(2)}</strong>. ${r.acumulado >= objetivo ? "Lograste la meta." : "No alcanza la meta de " + objetivo.toFixed(1) + "."}`);
      tipo = r.acumulado >= objetivo ? "exito" : "error";
    } else if (r.necesaria <= 0) {
      lineas.push(`Ya tienes asegurado el ${objetivo.toFixed(1)}: aunque saques 0.0 en el ${r.pendiente}% que falta, llegas a la meta.`);
      tipo = "exito";
    } else if (r.necesaria > 5) {
      lineas.push(`Para llegar a ${objetivo.toFixed(1)} necesitarías <strong>${r.necesaria.toFixed(2)}</strong> en el ${r.pendiente}% que falta, y eso supera el 5.0. Prueba con una meta más baja o habla con tu profesor.`);
      tipo = "error";
    } else {
      lineas.push(`Necesitas mínimo <strong>${r.necesaria.toFixed(2)}</strong> en el ${r.pendiente}% que falta para terminar con ${objetivo.toFixed(1)}.`);
      tipo = r.necesaria >= 4 ? "" : "exito";
    }
    resultado.className = "aviso" + (tipo ? " aviso--" + tipo : "");
    resultado.innerHTML = lineas.map(l => `<p>${l}</p>`).join("");
    resultado.hidden = false;
  });

  // Resumen de los dos semestres
  $("#tabla-semestres tbody").innerHTML = SEMESTRES.map(sem => `<tr>
      <td>${sem.nombre}</td><td class="numero">${creditosSemestre(sem)}</td>
      <td class="numero"><strong>${promedioSemestre(sem).toFixed(2)}</strong></td>
      <td>${sem.actual ? "En curso (cortes calificados)" : "Terminado"}</td></tr>`).join("") +
    `<tr><td><strong>Acumulado</strong></td><td class="numero">${SEMESTRES.reduce((s, x) => s + creditosSemestre(x), 0)}</td>
      <td class="numero"><strong>${promedioAcumulado().toFixed(2)}</strong></td><td>Ponderado por créditos</td></tr>`;

  // Tabla: cuánto necesito en el corte 3 (semestre actual)
  const semestre = SEMESTRES.find(s => s.actual);
  $("#tabla-necesito tbody").innerHTML = semestre.materias.map(m => {
    const actual = notaMateria(m);
    const celda = v => {
      const r = notaNecesaria(m.notas, v);
      if (r.terminado) return `<td class="numero">${r.acumulado.toFixed(2)}</td>`;
      if (r.necesaria <= 0) return `<td class="numero nota-ok">Asegurado</td>`;
      if (r.necesaria > 5) return `<td class="numero nota-baja">No alcanza</td>`;
      return `<td class="numero ${r.necesaria >= 4 ? "nota-alerta" : ""}">${r.necesaria.toFixed(2)}</td>`;
    };
    return `<tr><td>${m.nombre}</td><td class="numero">${actual === null ? "—" : actual.toFixed(2)}</td>${celda(NOTA_APROBATORIA)}${celda(4)}</tr>`;
  }).join("");

  // Meta de promedio del semestre actual
  $("#prom-actual").textContent = promedioSemestre(semestre).toFixed(2);
  $("#form-promedio").addEventListener("submit", e => {
    e.preventDefault();
    const input = $("#prom-meta");
    if (!validar([[input, reglas.entre(3, 5, "Escribe un promedio entre 3.0 y 5.0.")]])) return;
    const objetivo = Number(input.value);
    let acumulado = 0, pendiente = 0, total2 = 0;
    semestre.materias.forEach(m => m.notas.forEach((n, i) => {
      const peso = CORTES[i] * m.creditos;
      total2 += peso;
      if (n === null) pendiente += peso; else acumulado += n * peso;
    }));
    const necesaria = (objetivo * total2 - acumulado) / pendiente;
    const salida = $("#prom-resultado");
    if (necesaria <= 0) salida.innerHTML = `<p>Ya tienes asegurado un promedio de ${objetivo.toFixed(1)}.</p>`;
    else if (necesaria > 5) salida.innerHTML = `<p>Para un promedio de ${objetivo.toFixed(1)} necesitarías ${necesaria.toFixed(2)} en todos los cortes que faltan, y eso supera el 5.0.</p>`;
    else salida.innerHTML = `<p>Para cerrar el semestre con <strong>${objetivo.toFixed(1)}</strong> necesitas, en promedio, <strong>${necesaria.toFixed(2)}</strong> en el último corte de todas tus materias.</p>`;
    salida.className = "aviso " + (necesaria > 5 ? "aviso--error" : "aviso--exito");
    salida.hidden = false;
  });
}

/* ---------------------------------------------------------------------
   7j. EVENTOS (eventos.html): calendario con filtros
   --------------------------------------------------------------------- */
function iniciarEventos() {
  const calendario = $("#calendario");
  const actual = new Date(hoy().getFullYear(), hoy().getMonth(), 1);
  const activas = () => $$(".filtro-categorias input:checked").map(i => i.value);

  const pintar = () => {
    const anio = actual.getFullYear(), mes = actual.getMonth();
    $("#mes-titulo").textContent = `${MESES[mes]} ${anio}`;
    const delMes = EVENTOS.filter(e => {
      const f = aFecha(e.fecha);
      return f.getMonth() === mes && f.getFullYear() === anio && activas().includes(e.categoria);
    });
    let html = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => `<div class="dia-semana">${d}</div>`).join("");
    const primerDia = (new Date(anio, mes, 1).getDay() + 6) % 7;   // lunes = 0
    for (let i = 0; i < primerDia; i++) html += `<div class="fuera" aria-hidden="true"></div>`;
    for (let d = 1; d <= new Date(anio, mes + 1, 0).getDate(); d++) {
      const esHoy = new Date(anio, mes, d).getTime() === hoy().getTime();
      const eventos = delMes.filter(e => aFecha(e.fecha).getDate() === d);
      html += `<div class="${esHoy ? "hoy" : ""}"><span class="num">${d}</span>
        ${eventos.map(e => `<span class="evento etiqueta--${e.categoria}" title="${e.titulo}">${e.titulo}</span>`).join("")}</div>`;
    }
    calendario.innerHTML = html;
    $("#lista-mes").innerHTML = delMes.length
      ? delMes.map(e => {
          const f = aFecha(e.fecha);
          return `<li><div class="fecha-mini"><b>${f.getDate()}</b><small>${DIAS[f.getDay()].slice(0, 3)}</small></div>
            <div><strong>${e.titulo}</strong> <span class="etiqueta etiqueta--${e.categoria}">${CATEGORIAS[e.categoria]}</span>
            <p>${e.lugar} · ${plural(e.horas, "hora libre", "horas libres")}</p></div></li>`;
        }).join("")
      : "<li><p>No hay eventos este mes con los filtros elegidos.</p></li>";
  };
  $("#mes-anterior").addEventListener("click", () => { actual.setMonth(actual.getMonth() - 1); pintar(); });
  $("#mes-siguiente").addEventListener("click", () => { actual.setMonth(actual.getMonth() + 1); pintar(); });
  $$(".filtro-categorias input").forEach(i => i.addEventListener("change", pintar));
  pintar();
}

/* ---------------------------------------------------------------------
   7k. AYUDA (ayuda.html): preguntas frecuentes y PQRS
   --------------------------------------------------------------------- */
function iniciarAyuda(usuario) {
  const form = $("#form-pqrs");
  const tipo = $("#tipo"), asunto = $("#asunto"), mensaje = $("#mensaje");
  const lista = $("#mis-solicitudes");
  const contadores = () => {
    $("#contador-asunto").textContent = `${asunto.value.length} / 80 caracteres`;
    $("#contador-mensaje").textContent = `${mensaje.value.length} / 500 caracteres`;
  };
  asunto.addEventListener("input", contadores);
  mensaje.addEventListener("input", contadores);

  const pintar = () => {
    lista.innerHTML = usuario.solicitudes.length
      ? usuario.solicitudes.map(s => `<li><strong>${s.radicado}</strong> · ${s.tipo}: ${esc(s.asunto)}<br>
          <span style="color:var(--gris)">Enviada el ${s.fecha}. Estado: en revisión.</span></li>`).join("")
      : "<li>Todavía no has enviado solicitudes.</li>";
  };
  pintar();

  form.addEventListener("submit", evento => {
    evento.preventDefault();
    const ok = validar([
      [tipo, v => (v ? "" : "Elige el tipo de solicitud.")],
      [asunto, v => (v.length >= 5 ? "" : "Escribe un asunto de mínimo 5 caracteres.")],
      [mensaje, v => (v.length >= 20 ? "" : "Cuéntanos un poco más: mínimo 20 caracteres.")]
    ]);
    if (!ok) return;
    const radicado = "PQRS-" + Date.now().toString().slice(-6);
    usuario.solicitudes.unshift({ radicado, tipo: tipo.value, asunto: asunto.value.trim(), fecha: formatoFecha(hoy()) });
    actualizarUsuario(usuario);
    form.reset();
    contadores();
    pintar();
    mostrarToast(`Solicitud enviada. Tu número de radicado es ${radicado}.`);
  });
}

/* ---------------------------------------------------------------------
   8. ARRANQUE
   --------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  aplicarPreferencias();
  activarPreferencias();

  const pagina = document.body.dataset.pagina;
  const usuario = usuarioActual();

  // Las páginas internas solo se ven con la sesión iniciada
  if (!["login", "registro"].includes(pagina) && !usuario) {
    location.href = "index.html";
    return;
  }
  // Las actividades que creó el usuario se suman a la lista de lugares
  if (usuario) usuario.lugaresPropios.forEach(l => { if (!buscarLugar(l.id)) LUGARES.push({ ...l }); });

  activarHeader(usuario);
  activarNavLocal();

  const paginas = {
    login: iniciarLogin, registro: iniciarRegistro, inicio: iniciarInicio, perfil: iniciarPerfil,
    horas: iniciarHoras, lugares: iniciarLugares, "mis-lugares": iniciarMisLugares,
    academico: iniciarAcademico, calculadora: iniciarCalculadora, eventos: iniciarEventos, ayuda: iniciarAyuda
  };
  if (paginas[pagina]) paginas[pagina](usuario);
});
