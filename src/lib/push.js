import { supabase, ownerFromEmail } from './supabase'

// Chiave pubblica per le notifiche (è pubblica per natura).
const VAPID_PUBLIC_KEY = 'BMpM3jWVhDIx-Oc8wbNXRKwqCtMujY_752tiH6-r91TwSPQFdR2P6mv-XwIZOfqbFSDlyIw8pv18vYyWfRpesU8'

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

export async function enablePush(session) {
  if (!pushSupported()) throw new Error('Questo browser non supporta le notifiche.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Permesso notifiche negato.')
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) })
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_email: session.user.email,
    owner: ownerFromEmail(session.user.email),
    endpoint: sub.endpoint,
    subscription: sub.toJSON(),
  }, { onConflict: 'endpoint' })
  if (error) throw error
  return sub
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

// Avvisa l'altro socio. Non blocca mai l'azione principale se fallisce.
export async function notifyOther(title, body, url = '/') {
  try { await supabase.functions.invoke('notify', { body: { title, body, url } }) } catch {}
}
