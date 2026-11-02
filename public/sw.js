// Service worker van het Ozvolt CRM: toont pushmeldingen en opent de juiste pagina bij een tik.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch { data = { titel: 'Ozvolt CRM', bericht: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(data.titel || 'Ozvolt CRM', {
    body: data.bericht || '',
    icon: '/icon-192.png?v=3',
    badge: '/icon-192.png?v=3',
    data: { link: data.link || '/notificaties' },
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = new URL(e.notification.data?.link || '/notificaties', self.location.origin).href
  e.waitUntil((async () => {
    const vensters = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const v of vensters) {
      if ('focus' in v) { await v.focus(); if ('navigate' in v) await v.navigate(url); return }
    }
    await self.clients.openWindow(url)
  })())
})
