# CampusLibre UNAB

Portal web para consultar y gestionar las **horas libres** y los servicios del campus de la Universidad Autónoma de Bucaramanga (UNAB). Es un rediseño de la experiencia de MiPortalU.

Proyecto de la materia **Diseño de Interfaces de Usuario** (Ingeniería de Sistemas, UNAB), tercer entregable, noviembre de 2026.

**Integrantes:** María Camila Pinzón Ardila, María Paula Gómez, Juan Esteban Becerra.

## Cómo probarlo

1. Descarga o clona el repositorio.
2. Abre `index.html` en el navegador. No necesita servidor ni instalación.
3. Inicia sesión con la cuenta de ejemplo: usuario `paula`, contraseña `Unab2026*`.
   También puedes crear un usuario nuevo en **Registro**. Solo se aceptan correos `@unab.edu.co`.

## Tecnologías

- HTML5 semántico: 11 páginas.
- CSS3 con variables, diseño responsive, modo oscuro y estilos de impresión.
- JavaScript sin librerías.
- localStorage para guardar usuarios, asistencias, inscripciones y preferencias en el navegador.

PHP era opcional y no lo usamos.

## Estructura

```
index.html        Inicio de sesión
registro.html     Crear usuario
inicio.html       Resumen de horas libres
perfil.html       Datos del estudiante
horas-libres.html Historial, CRUD de asistencias, simulador y ranking Top 5
lugares.html      Lugares, horarios, plano interactivo y CRUD de actividades propias
mis-lugares.html  Inscripciones y horario semanal
academico.html    Notas de dos semestres
calculadora.html  Calculadora de notas ponderada
eventos.html      Calendario con filtros
ayuda.html        Preguntas frecuentes y formulario de PQRS
css/estilos.css   Estilos
js/datos.js       Datos (reales y de ejemplo)
js/app.js         Lógica del portal
img/              Logos y fotos del campus
```

## Datos

**Reales:**
- Requisito de 96 horas libres (Resolución 300 de 2006).
- Horarios de atención de Banú, Biblioteca, Gimnasio y CSU.
- Fotos tomadas por el equipo.

**De ejemplo:** la usuaria Paula, las sesiones, los eventos, las notas y el ranking. Todos están en `js/datos.js` para reemplazarlos por datos oficiales.

## Uso de inteligencia artificial

Usamos Claude (Anthropic) como asistente para generar y corregir el código, los wireframes y los documentos, y para hacer pruebas automáticas. El equipo:
- definió los requisitos;
- hizo la página de inicio de sesión;
- tomó las decisiones de diseño y las fotos;
- buscó los horarios reales;
- revisó cada versión.

El detalle está en la presentación.
