/* =====================================================================
   CampusLibre UNAB · datos.js
   Todos los datos que usa el portal, separados del código para que sea
   fácil actualizarlos.

   Datos reales (fuentes UNAB):
   - Requisito: 96 horas de actividades libres para estudiantes de
     pregrado (Resolución 300 del 20 de junio de 2006).
   - Oficina de Bienestar: primer piso del Centro de Servicios
     Universitarios (CSU). PBX (607) 643 6111 ext. 107.
   - Campus El Jardín: Avenida 42 No. 48-11, Bucaramanga.
   - Horarios de atención: publicación UNAB "Nueva oferta gastronómica
     en cafeterías de campus Unab" y Bienestar Universitario.

   ⚠ De ejemplo: sesiones de horas libres, cupos, eventos, materias,
   notas y el ranking. Cámbienlos por los datos reales.
   ===================================================================== */

const META_HL = 96;

const CATEGORIAS = {
  deporte: "Deporte",
  cultura: "Cultura",
  salud: "Salud integral",
  social: "Social"
};

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/* Lugares donde se obtienen HL.
   - atencion: horario REAL de atención (null = aún sin confirmar).
   - horarios: sesiones de horas libres para inscribirse (de ejemplo).
     Cada sesión: días, hora de inicio y hora de fin (formato 24 h).
   - foto: imagen en img/lugares/ (null = sin foto: la tarjeta no muestra recuadro). */
const LUGARES = [
  {
    id: "banu",
    nombre: "Cafetería Banú",
    categoria: "social",
    zona: "jardin",
    descripcion: "Cafetería de la Plazoleta Banú, junto a la Biblioteca. Ofrece almuerzos, hamburguesas, perros calientes y comida para llevar.",
    atencion: "Lunes a viernes, 7:30 a. m. – 6:00 p. m. (jornada continua)",
    horarios: [{ dias: ["Lunes"], ini: 10, fin: 12 }, { dias: ["Miércoles"], ini: 14, fin: 16 }, { dias: ["Viernes"], ini: 10, fin: 12 }],
    horasPorSesion: 2, cupos: 25, inscritos: 18,
    foto: "img/lugares/banu.jpg",
    mapa: "Universidad Autónoma de Bucaramanga, Avenida 42 No. 48-11, Bucaramanga"
  },
  {
    id: "biblioteca",
    nombre: "Biblioteca (SIBU)",
    categoria: "cultura",
    zona: "jardin",
    descripcion: "Sede Central Luis Carlos Galán Sarmiento del Sistema de Bibliotecas UNAB. En época de exámenes finales el horario puede extenderse.",
    atencion: "Lunes a viernes 7:00 a. m. – 9:00 p. m. · Sábados 8:00 a. m. – 12:00 p. m.",
    horarios: [{ dias: ["Miércoles"], ini: 16, fin: 18 }, { dias: ["Sábado"], ini: 9, fin: 11 }],
    horasPorSesion: 2, cupos: 30, inscritos: 9,
    foto: "img/lugares/biblioteca.jpg",
    mapa: "Biblioteca Luis Carlos Galán Sarmiento UNAB, Bucaramanga"
  },
  {
    id: "bloqueb",
    nombre: "Bloque B",
    categoria: "cultura",
    zona: "jardin",
    descripcion: "Espacio del campus El Jardín donde se realizan actividades de Bienestar que otorgan horas libres.",
    atencion: null,
    horarios: [{ dias: ["Lunes"], ini: 16, fin: 18 }, { dias: ["Jueves"], ini: 12, fin: 14 }],
    horasPorSesion: 2, cupos: 40, inscritos: 22,
    foto: "img/lugares/bloque-b.jpg",
    mapa: "Universidad Autónoma de Bucaramanga, Avenida 42 No. 48-11, Bucaramanga"
  },
  {
    id: "gimnasio",
    nombre: "Gimnasio UNAB",
    categoria: "deporte",
    zona: "csu",
    descripcion: "Sala de máquinas y entrenamiento. Se ingresa con carné estudiantil, guantes y toalla personal.",
    atencion: "Lunes a viernes 6:00 a. m. – 8:00 p. m. · Sábados 8:00 a. m. – 2:00 p. m. · Domingos y festivos 9:00 a. m. – 1:00 p. m.",
    horarios: [{ dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"], ini: 6, fin: 8 }, { dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"], ini: 16, fin: 18 }, { dias: ["Sábado"], ini: 8, fin: 10 }],
    horasPorSesion: 2, cupos: 40, inscritos: 37,
    foto: "img/lugares/gimnasio.jpg",
    mapa: "Centro de Servicios Universitarios UNAB, Bucaramanga"
  },
  {
    id: "csu",
    nombre: "Cafetería CSU",
    categoria: "cultura",
    zona: "csu",
    descripcion: "Queda en el mismo edificio de la oficina de Bienestar Universitario y del gimnasio.",
    atencion: "Lunes a sábado, 6:00 a. m. – 8:00 p. m. (horario del CSU) · Domingos cerrado",
    horarios: [{ dias: ["Martes"], ini: 16, fin: 18 }, { dias: ["Jueves"], ini: 16, fin: 18 }],
    horasPorSesion: 2, cupos: 35, inscritos: 21,
    foto: null,
    mapa: "Centro de Servicios Universitarios UNAB, Bucaramanga"
  },
  {
    id: "casona",
    nombre: "Cafetería Casona",
    categoria: "social",
    zona: "casona",
    descripcion: "La sede tiene cafetería, zonas verdes, salón de exposiciones y un parqueadero cercano.",
    atencion: null,
    horarios: [{ dias: ["Martes"], ini: 12, fin: 13 }, { dias: ["Jueves"], ini: 12, fin: 13 }],
    horasPorSesion: 1, cupos: 30, inscritos: 12,
    foto: "img/lugares/casona-cafeteria.jpg",
    mapa: "La Casona UNAB, Bucaramanga"
  },
  {
    id: "bosque",
    nombre: "Cafetería Bosque",
    categoria: "salud",
    zona: "bosque",
    descripcion: "Cafetería del campus El Bosque.",
    atencion: null,
    horarios: [{ dias: ["Lunes"], ini: 12, fin: 13 }, { dias: ["Miércoles"], ini: 12, fin: 13 }, { dias: ["Viernes"], ini: 12, fin: 13 }],
    horasPorSesion: 1, cupos: 30, inscritos: 30,
    foto: null,
    mapa: "Universidad Autónoma de Bucaramanga Campus El Bosque, Bucaramanga"
  }
];

/* Sedes del plano esquemático (mapa interactivo) */
const ZONAS = [
  { id: "jardin", nombre: "Campus El Jardín", detalle: "Avenida 42 No. 48-11" },
  { id: "csu", nombre: "Centro de Servicios Universitarios (CSU)", detalle: "Bienestar Universitario, primer piso" },
  { id: "casona", nombre: "Sede La Casona", detalle: "Zonas verdes y salón de exposiciones" },
  { id: "bosque", nombre: "Campus El Bosque", detalle: "Bibliotecas y cafetería" }
];

/* Eventos de Bienestar del semestre (fecha AAAA-MM-DD) */
const EVENTOS = [
  { fecha: "2026-10-05", titulo: "Torneo relámpago de fútbol sala", lugar: "Gimnasio UNAB", categoria: "deporte", horas: 3 },
  { fecha: "2026-10-07", titulo: "Taller de dibujo libre", lugar: "Bloque B", categoria: "cultura", horas: 2 },
  { fecha: "2026-10-14", titulo: "Cine foro", lugar: "Cafetería CSU", categoria: "cultura", horas: 2 },
  { fecha: "2026-10-21", titulo: "Encuentro de estudiantes nuevos", lugar: "Cafetería Casona", categoria: "social", horas: 1 },
  { fecha: "2026-10-28", titulo: "Música en vivo", lugar: "Cafetería CSU", categoria: "cultura", horas: 2 },
  { fecha: "2026-11-04", titulo: "Taller de manejo del estrés", lugar: "Cafetería Bosque", categoria: "salud", horas: 2 },
  { fecha: "2026-11-11", titulo: "Muestra de talleres culturales", lugar: "Bloque B", categoria: "cultura", horas: 3 },
  { fecha: "2026-11-18", titulo: "Carrera atlética interna", lugar: "Gimnasio UNAB", categoria: "deporte", horas: 3 },
  { fecha: "2026-11-20", titulo: "Tarde de juegos de mesa", lugar: "Cafetería Casona", categoria: "social", horas: 1 },
  { fecha: "2026-11-24", titulo: "Club de lectura", lugar: "Biblioteca (SIBU)", categoria: "cultura", horas: 2 },
  { fecha: "2026-11-26", titulo: "Pausa activa de cierre de semestre", lugar: "Cafetería Banú", categoria: "salud", horas: 1 },
  { fecha: "2026-12-02", titulo: "Clase abierta de rumba", lugar: "Gimnasio UNAB", categoria: "deporte", horas: 2 }
];

/* Cierre del semestre (para la alerta de horas pendientes) */
const CIERRE_SEMESTRE = "2026-11-27";

/* Usuaria de ejemplo: sirve para que el profesor entre sin registrarse.
   Usuario: paula   ·   Contraseña: Unab2026*
   estado de cada asistencia: "validada" (cuenta en las HL) o "pendiente". */
const USUARIO_PRUEBA = {
  nombre: "Paula",
  codigo: "U00000000",
  programa: "Derecho",
  semestre: 2,
  correo: "paula@unab.edu.co",
  clave: "Unab2026*",
  telefono: "",
  historial: [
    { fecha: "2026-02-18", actividad: "Entrenamiento dirigido", lugar: "Gimnasio UNAB", categoria: "deporte", horas: 2, estado: "validada" },
    { fecha: "2026-03-04", actividad: "Taller de dibujo libre", lugar: "Bloque B", categoria: "cultura", horas: 2, estado: "validada" },
    { fecha: "2026-03-11", actividad: "Cine foro", lugar: "Cafetería CSU", categoria: "cultura", horas: 2, estado: "validada" },
    { fecha: "2026-03-25", actividad: "Jornada de salud visual", lugar: "Cafetería Bosque", categoria: "salud", horas: 1, estado: "validada" },
    { fecha: "2026-04-08", actividad: "Torneo de fútbol sala", lugar: "Gimnasio UNAB", categoria: "deporte", horas: 3, estado: "validada" },
    { fecha: "2026-04-22", actividad: "Encuentro de estudiantes", lugar: "Cafetería Casona", categoria: "social", horas: 1, estado: "validada" },
    { fecha: "2026-05-06", actividad: "Entrenamiento dirigido", lugar: "Gimnasio UNAB", categoria: "deporte", horas: 4, estado: "validada" },
    { fecha: "2026-05-13", actividad: "Música en vivo", lugar: "Cafetería CSU", categoria: "cultura", horas: 2, estado: "validada" },
    { fecha: "2026-08-19", actividad: "Pausa activa colectiva", lugar: "Cafetería Banú", categoria: "salud", horas: 2, estado: "validada" },
    { fecha: "2026-09-02", actividad: "Muestra de talleres culturales", lugar: "Bloque B", categoria: "cultura", horas: 3, estado: "validada" },
    { fecha: "2026-09-16", actividad: "Entrenamiento dirigido", lugar: "Gimnasio UNAB", categoria: "deporte", horas: 4, estado: "validada" },
    { fecha: "2026-09-30", actividad: "Club de lectura", lugar: "Biblioteca (SIBU)", categoria: "cultura", horas: 2, estado: "validada" },
    { fecha: "2026-11-11", actividad: "Muestra de talleres culturales", lugar: "Bloque B", categoria: "cultura", horas: 3, estado: "pendiente" }
  ],
  inscripciones: [{ lugar: "gimnasio", sesion: 1 }],
  lugaresPropios: [],
  solicitudes: []
};

/* Notas de los dos semestres de la usuaria de ejemplo (Derecho).
   Cada nota es de 0.0 a 5.0; null = corte sin calificar.
   ⚠ Reemplácenlas por las materias y notas reales. */
const SEMESTRES = [
  {
    id: "2026-2",
    nombre: "Segundo semestre · 2026-2",
    actual: true,
    materias: [
      { nombre: "Derecho Constitucional General", creditos: 4, notas: [4.2, 4.5, null] },
      { nombre: "Personas y Familia", creditos: 4, notas: [3.8, 4.0, null] },
      { nombre: "Teoría del Estado", creditos: 3, notas: [2.6, 3.1, null] },
      { nombre: "Argumentación Jurídica", creditos: 3, notas: [4.0, 3.6, null] },
      { nombre: "Sociología Jurídica", creditos: 2, notas: [3.5, 2.8, null] }
    ]
  },
  {
    id: "2026-1",
    nombre: "Primer semestre · 2026-1",
    actual: false,
    materias: [
      { nombre: "Introducción al Derecho", creditos: 4, notas: [4.5, 4.3, 4.6] },
      { nombre: "Derecho Romano", creditos: 3, notas: [3.9, 4.1, 4.4] },
      { nombre: "Historia del Derecho", creditos: 3, notas: [3.2, 3.5, 3.8] },
      { nombre: "Lectura y Escritura Jurídica", creditos: 2, notas: [3.7, 3.4, 4.0] },
      { nombre: "Teoría Política", creditos: 3, notas: [4.4, 4.6, 4.5] }
    ]
  }
];
/* Materias del semestre actual (las usan el horario y los cursos) */
const MATERIAS = SEMESTRES[0].materias;
/* Porcentaje de cada corte y nota mínima para aprobar */
const CORTES = [30, 30, 40];
const NOTA_APROBATORIA = 3.0;

/* Ranking de horas libres: otros estudiantes (nombre corto y programa).
   ⚠ De ejemplo: un ranking real debe usar datos autorizados por Bienestar. */
const RANKING = [
  { nombre: "Valentina R.", programa: "Derecho", horas: 94 },
  { nombre: "Santiago M.", programa: "Ingeniería de Sistemas", horas: 88 },
  { nombre: "Daniela C.", programa: "Psicología", horas: 81 },
  { nombre: "Andrés F.", programa: "Medicina", horas: 77 },
  { nombre: "Isabella G.", programa: "Comunicación Social", horas: 70 },
  { nombre: "Sebastián P.", programa: "Ingeniería Mecatrónica", horas: 55 },
  { nombre: "Camila T.", programa: "Música", horas: 41 }
];

/* Horario semanal del semestre actual (horas enteras, formato 24 h) */
const HORARIO = {
  Lunes:     [{ ini: 7, fin: 9, materia: "Derecho Constitucional General" }, { ini: 14, fin: 16, materia: "Personas y Familia" }],
  Martes:    [{ ini: 9, fin: 11, materia: "Teoría del Estado" }, { ini: 14, fin: 16, materia: "Argumentación Jurídica" }],
  Miércoles: [{ ini: 7, fin: 9, materia: "Derecho Constitucional General" }, { ini: 10, fin: 12, materia: "Sociología Jurídica" }],
  Jueves:    [{ ini: 9, fin: 11, materia: "Teoría del Estado" }, { ini: 16, fin: 18, materia: "Argumentación Jurídica" }],
  Viernes:   [{ ini: 8, fin: 10, materia: "Personas y Familia" }]
};
