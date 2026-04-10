const CACHE = 'idea-garden-v1'

const STATIC = [
  '/',
  '/dump',
  '/garden',
  '/done',
]

// Install — cache shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch — network first for API/auth, cache first for assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Always network for API, Supabase, auth
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.pathname === '/auth'
  ) {
    return
  }

  // Cache first for static assets (_next/static)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached ?? fetch(e.request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
          return res
        })
      )
    )
    return
  }

  // Network first, fallback to cache for pages
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
