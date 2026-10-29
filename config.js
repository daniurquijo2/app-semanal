// Configuración de la conexión con Google.
// - googleClientId: el «ID de cliente» de tipo «Aplicación web» de Google Cloud (es público, no es secreto).
// - authWorker: la dirección de tu Cloudflare Worker (el intermediario que guarda la conexión).
// El «secreto del cliente» NUNCA va aquí: solo en Cloudflare.
window.APP_CONFIG = {
  googleClientId: "692362797827-d296i6p14uk5h5t2ce4fn1j9m8lr7etc.apps.googleusercontent.com",
  authWorker: "https://app-semanal-auth.daniurquijo2.workers.dev"
};
