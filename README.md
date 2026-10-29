# App Semanal

Planificador semanal: tareas por días, clasificadas por semanas, junto a tu Google Calendar (en los dos sentidos).

Publicada con GitHub Pages: https://daniurquijo2.github.io/app-semanal/

## Cómo funciona

- `index.html`: toda la app (HTML, CSS y JavaScript en un solo archivo).
- `config.js`: el ID de cliente web de Google y la dirección del intermediario.
- `worker/worker.js`: el intermediario en Cloudflare Workers. Renueva el acceso a Google para no tener que reconectar cada hora. No guarda datos: el permiso de Google viaja cifrado y se guarda en el navegador.
- Las tareas se sincronizan entre dispositivos en la carpeta privada de la app en Google Drive (`appDataFolder`).
- `privacidad.html`: política de privacidad (la pide Google).

El secreto del cliente de Google **no** está en este repositorio: solo en las variables del Worker de Cloudflare (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_ORIGIN`).
