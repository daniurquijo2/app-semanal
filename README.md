# App Semanal

Planificador semanal en un **lienzo infinito**: tus semanas en filas, tareas por días, prioridades por tamaño y tu Google Calendar en los dos sentidos.

Publicada con GitHub Pages: https://daniurquijo2.github.io/app-semanal/

## Archivos

- `index.html`: estructura, estilos (tema oscuro, tokens del diseño) y los diálogos de eventos de Google.
- `app.js`: la interfaz (lienzo, vista de día/semana, menús, atajos, deshacer). Usa [htm](https://github.com/developit/htm) + Preact desde `vendor/htm-preact.js`, sin compilación.
- `core.js`: datos y conexiones. Conexión con Google, sincronización con Google Calendar (cada 10 s), sincronización de tareas por Google Drive (`appDataFolder`), lector de `.ics`, repeticiones (RRULE) y fichas/edición de eventos.
- `config.js`: ID de cliente web de Google y dirección del intermediario.
- `worker/worker.js`: intermediario en Cloudflare Workers. Renueva el acceso a Google para no reconectar cada hora. No guarda datos.
- `privacidad.html`: política de privacidad (la pide Google).
- `sw.js`, `manifest.webmanifest`, `logo*.png`, `logo.svg`: app instalable (PWA).

El secreto del cliente de Google **no** está en este repositorio: solo en las variables del Worker (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_ORIGIN`).

## Modelo de datos (sincronizado por Drive)

```
task:   { id, title, date|null, week, done, notes, color|null, cal, groups[], w, h, hidden, imp 0..5, time }
groups: [{ id, name, color }]
layouts:{ 'd:YYYY-MM-DD' | 'w:YYYY-Www': { [taskId]: {x, y} } }
notes:  [{ id, x, y, text, color, rot }]
goals:  { 'YYYY-Www': string }
```

## Atajos

Ctrl/⌘+Z deshacer · Ctrl/⌘+Mayús+Z rehacer · E ocultar completadas · ⌘K o / buscar · T hoy · A vista de hoy · S vista de semana · 0/1 ver todo/ajustar · +/− zoom · ↑/↓ semana · N nota · Q ordenar · G o Enter crear grupo · W ocultar/ver ocultas · Ctrl/⌘+A seleccionar todo · Esc cerrar por capas.
