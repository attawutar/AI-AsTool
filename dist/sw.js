const CACHE = 'ai-ascend-v1'

// On install: cache all pre-fetched assets
self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png',
      ])
    )
  )
})

// On activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch strategy:
// - Same-origin JS/CSS/HTML → cache-first, fall back to network
// - CDN / external → network-first, fall back to cache
// - API / socket.io → network only
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Never intercept socket.io or /health
  if (url.pathname.startsWith('/socket.io') || url.pathname === '/health') return

  // External CDN — network first, cache fallback
  if (url.origin !== self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
          return res
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  // Same-origin assets — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        // Only cache successful responses
        if (!res || res.status !== 200 || res.type === 'opaque') return res
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
    })
  )
})
