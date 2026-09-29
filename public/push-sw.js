/* Pousse — notifications du rappel du soir (chargé par le service worker
   généré par vite-plugin-pwa, voir `workbox.importScripts` dans vite.config.js).
   Le contenu reçu est générique : aucune donnée de santé. */

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* message vide ou illisible */ }
  const title = data.title || 'Un moment pour toi'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'Prends un instant pour écouter ton corps : comment te sens-tu aujourd\u2019hui ?',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'pousse-ecoute',       // remplace un rappel précédent au lieu de s'empiler
    lang: 'fr',
    data: { url: data.url || '/?ecoute=1' },
  }))
})

// Toucher la notification : ouvre Pousse sur le ressenti du jour.
// Si l'app est déjà ouverte, on la ramène au premier plan sans la recharger.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/?ecoute=1', self.location.origin).href
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const win = wins.find((w) => new URL(w.url).origin === self.location.origin)
    if (win) {
      win.postMessage({ type: 'pousse:ecoute' })
      return win.focus()
    }
    return self.clients.openWindow(url)
  })())
})
