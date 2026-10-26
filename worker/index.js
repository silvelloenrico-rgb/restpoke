// API di RestPoke: login, lettura/scrittura dati su D1, notifiche push.
// Tutto ciò che non è /api/* viene servito dagli asset statici (dist/).
import { buildPushHTTPRequest } from '@pushforge/builder'

// Colonne scrivibili dal client per ogni tabella: tutto il resto viene ignorato.
const TABLES = {
  items: ['legacy_id', 'name', 'category', 'quantity', 'cost_enrico', 'cost_alessandro', 'market_price', 'status', 'tags', 'sale_price', 'purchase_date', 'sale_date', 'created_by', 'opened_from', 'opened_date', 'language', 'card_set', 'year', 'grader'],
  sales: ['item_id', 'item_legacy_id', 'item_name', 'quantity_sold', 'sale_price_total', 'sale_date', 'created_by'],
  item_costs: ['item_id', 'item_name', 'description', 'amount', 'paid_by', 'date', 'created_by'],
  raffles: ['name', 'cost_enrico', 'cost_alessandro', 'date', 'created_by'],
  personal_items: ['owner', 'name', 'quantity', 'cost', 'status', 'tags', 'sale_price', 'sale_price_total', 'quantity_sold', 'purchase_date', 'sale_date', 'created_by', 'language', 'card_set', 'year', 'grader', 'market_price', 'category'],
  options: ['kind', 'value', 'sort'],
  saved_filters: ['page', 'name', 'filters', 'created_by'],
}
const JSON_COLS = ['tags', 'filters', 'subscription']
const SESSION_DAYS = 60
const PBKDF2_ITER = 100000 // massimo consentito da Workers

const enc = new TextEncoder()
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers })

export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16)), iterations = PBKDF2_ITER) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return `pbkdf2$${iterations}$${b64u(salt)}$${b64u(bits)}`
}

async function verifyPassword(password, stored) {
  const [, iter, salt] = stored.split('$')
  const again = await hashPassword(password, unb64u(salt), Number(iter))
  return again.length === stored.length && crypto.subtle.timingSafeEqual(enc.encode(again), enc.encode(stored))
}

// Sessione = cookie firmato con HMAC: niente tabella sessioni.
// ponytail: non revocabile singolarmente; per buttare fuori tutti si cambia SESSION_SECRET.
const hmacKey = secret => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

async function signSession(user, secret) {
  const body = b64u(enc.encode(JSON.stringify({ email: user.email, owner: user.owner, exp: Date.now() + SESSION_DAYS * 864e5 })))
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body))
  return `${body}.${b64u(sig)}`
}

async function readSession(req, secret) {
  const token = req.headers.get('Cookie')?.match(/(?:^|;\s*)session=([^;]+)/)?.[1]
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64u(sig), enc.encode(body))
  if (!ok) return null
  const s = JSON.parse(new TextDecoder().decode(unb64u(body)))
  return s.exp > Date.now() ? s : null
}

const cookie = (value, maxAge) => `session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`

const parseRow = row => {
  for (const c of JSON_COLS) if (typeof row[c] === 'string') row[c] = JSON.parse(row[c])
  return row
}

// Tiene solo le colonne ammesse e serializza array/oggetti in JSON.
function clean(table, data) {
  const out = {}
  for (const c of TABLES[table]) {
    if (!(c in data)) continue
    const v = data[c]
    out[c] = v !== null && typeof v === 'object' ? JSON.stringify(v) : v === '' ? null : v ?? null
  }
  return out
}

async function loadAll(db) {
  const q = sql => db.prepare(sql)
  const res = await db.batch([
    q('SELECT * FROM item_summary ORDER BY purchase_date DESC NULLS FIRST'),
    q('SELECT * FROM sales ORDER BY sale_date DESC NULLS FIRST'),
    q('SELECT * FROM item_costs ORDER BY date DESC NULLS FIRST'),
    q('SELECT * FROM raffles ORDER BY date DESC NULLS FIRST'),
    q('SELECT * FROM personal_items ORDER BY purchase_date DESC NULLS FIRST'),
    q('SELECT * FROM options ORDER BY kind, sort, value'),
    q('SELECT * FROM saved_filters ORDER BY created_at'),
  ])
  const [items, sales, costs, raffles, personal, options, filters] = res.map(r => r.results.map(parseRow))
  return { items, sales, costs, raffles, personal, options, filters }
}

// Invia una notifica a tutti i dispositivi dell'altro socio; elimina le iscrizioni scadute.
async function notifyOther(env, sender, { title, body, url }) {
  const { results } = await env.DB.prepare('SELECT id, subscription FROM push_subscriptions WHERE owner != ?').bind(sender).all()
  const privateJWK = JSON.parse(env.VAPID_PRIVATE_JWK)
  const payload = { title: title || 'RestPoke', body: body || '', url: url || '/' }
  const dead = []
  let sent = 0
  await Promise.all(results.map(async s => {
    const req = await buildPushHTTPRequest({
      privateJWK,
      subscription: JSON.parse(s.subscription),
      message: { payload, adminContact: 'mailto:silvello.enrico@gmail.com' },
    })
    const res = await fetch(req.endpoint, { method: 'POST', headers: req.headers, body: req.body })
    if (res.ok) sent++
    else if (res.status === 404 || res.status === 410) dead.push(s.id)
  }))
  if (dead.length) await env.DB.prepare(`DELETE FROM push_subscriptions WHERE id IN (${dead.map(() => '?').join(',')})`).bind(...dead).run()
  return { sent, removed: dead.length }
}

async function handleApi(req, env, path) {
  const method = req.method

  if (path === 'login' && method === 'POST') {
    const ip = req.headers.get('CF-Connecting-IP') ?? 'local'
    if (env.LOGIN_LIMITER && !(await env.LOGIN_LIMITER.limit({ key: ip })).success)
      return json({ error: 'Troppi tentativi, riprova tra un minuto.' }, 429)
    const { email, password } = await req.json()
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(String(email || '').toLowerCase().trim()).first()
    if (!user || !(await verifyPassword(String(password || ''), user.password_hash)))
      return json({ error: 'Email o password non corrette.' }, 401)
    const token = await signSession(user, env.SESSION_SECRET)
    return json({ email: user.email, owner: user.owner }, 200, { 'Set-Cookie': cookie(token, SESSION_DAYS * 86400) })
  }

  if (path === 'logout' && method === 'POST')
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) })

  const me = await readSession(req, env.SESSION_SECRET)
  if (path === 'me') return json(me)
  if (!me) return json({ error: 'non autenticato' }, 401)

  if (path === 'data') return json(await loadAll(env.DB))
  if (path === 'notify' && method === 'POST') return json(await notifyOther(env, me.owner, await req.json()))

  if (path === 'password' && method === 'POST') {
    const { current, next } = await req.json()
    if (String(next || '').length < 8) return json({ error: 'La nuova password deve avere almeno 8 caratteri.' }, 400)
    const user = await env.DB.prepare('SELECT password_hash FROM users WHERE email = ?').bind(me.email).first()
    if (!user || !(await verifyPassword(String(current || ''), user.password_hash)))
      return json({ error: 'Password attuale non corretta.' }, 400)
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE email = ?').bind(await hashPassword(next), me.email).run()
    return json({ ok: true })
  }

  if (path === 'push' && method === 'POST') {
    const sub = await req.json()
    await env.DB.prepare(`INSERT INTO push_subscriptions (id, user_email, owner, endpoint, subscription) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET user_email = excluded.user_email, owner = excluded.owner, subscription = excluded.subscription`)
      .bind(crypto.randomUUID(), me.email, me.owner, sub.endpoint, JSON.stringify(sub)).run()
    return json({ ok: true })
  }
  if (path === 'push' && method === 'DELETE') {
    const { endpoint } = await req.json()
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_email = ?').bind(endpoint, me.email).run()
    return json({ ok: true })
  }

  // CRUD generico: /api/<tabella> (POST) e /api/<tabella>/<id> (PATCH, DELETE)
  const [table, id] = path.split('/')
  if (!TABLES[table]) return json({ error: 'non trovato' }, 404)

  if (method === 'POST' && !id) {
    const row = clean(table, await req.json())
    if (TABLES[table].includes('created_by')) row.created_by ??= me.owner
    row.id = crypto.randomUUID()
    const cols = Object.keys(row)
    await env.DB.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...Object.values(row)).run()
    return json({ id: row.id }, 201)
  }
  if (method === 'PATCH' && id) {
    const row = clean(table, await req.json())
    const cols = Object.keys(row)
    if (!cols.length) return json({ ok: true })
    await env.DB.prepare(`UPDATE ${table} SET ${cols.map(c => `${c} = ?`).join(',')} WHERE id = ?`).bind(...Object.values(row), id).run()
    return json({ ok: true })
  }
  if (method === 'DELETE' && id) {
    await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()
    return json({ ok: true })
  }
  return json({ error: 'metodo non ammesso' }, 405)
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req)
    try {
      return await handleApi(req, env, url.pathname.slice(5))
    } catch (e) {
      return json({ error: String(e?.message ?? e) }, 500)
    }
  },
}
