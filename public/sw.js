// Service worker minimale: rende l'app installabile e apribile offline,
// senza mai mettere in cache le chiamate a Supabase (i dati restano sempre freschi).
const CACHE = 'restpoke-v1'

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/index.html'])))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const req = e.request
  const url = new URL(req.url)

  // Solo GET e solo stessa origine: le API Supabase passano sempre dalla rete.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  // Navigazioni (apertura pagina): rete prima, con fallback all'app in cache offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }

  // Asset statici (js/css/icone): cache prima, aggiornata in background.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()))
        return res
      }).catch(() => hit)
      return hit || net
    })
  )
})
