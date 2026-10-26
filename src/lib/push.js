import { api } from './db'

// Chiave pubblica per le notifiche (è pubblica per natura; la privata è un secret del Worker).
const VAPID_PUBLIC_KEY = 'BAPnEveNAUQidUTvwLy4ysCExIwIrTh6wahMEV0AXOKUKXvenfSmJheqBEv0mHrcs_I2QpNvtmgMUbW7ytqDZR4'

function toKey(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// Su iPhone le notifiche funzionano solo se l'app è aggiunta alla schermata Home.
export const isIosBrowserNotInstalled = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches

export async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('Questo browser non supporta le notifiche.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Permesso notifiche negato.')
  const reg = await navigator.serviceWorker.ready
  // un'iscrizione fatta con la vecchia chiave VAPID impedirebbe la nuova
  await (await reg.pushManager.getSubscription())?.unsubscribe()
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) })
  await api('push', 'POST', sub.toJSON())
  return sub
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  await api('push', 'DELETE', { endpoint: sub.endpoint })
  await sub.unsubscribe()
}

// Avvisa l'altro socio. Non blocca mai l'azione principale se fallisce.
export async function notifyOther(title, body, url = '/') {
  try { await api('notify', 'POST', { title, body, url }) } catch {}
}
