// Client verso le API del Worker (/api/*). La sessione è un cookie HttpOnly gestito dal server.

export async function api(path, method = 'GET', body) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Errore ${res.status}`)
  return data
}

// Stessa forma delle chiamate Supabase usate nelle pagine: restituisce { data, error }.
const wrap = p => p.then(data => ({ data, error: null }), error => ({ data: null, error }))
export const db = {
  from: table => ({
    insert: row => wrap(api(table, 'POST', row)),
    update: patch => ({ eq: (_col, id) => wrap(api(`${table}/${id}`, 'PATCH', patch)) }),
    delete: () => ({ eq: (_col, id) => wrap(api(`${table}/${id}`, 'DELETE')) }),
  }),
}

export const auth = {
  me: () => api('me').catch(() => null),
  login: (email, password) => api('login', 'POST', { email, password }),
  logout: () => api('logout', 'POST'),
  changePassword: (current, next) => api('password', 'POST', { current, next }),
}

export const PEOPLE = ['Enrico', 'Alessandro']

// tipi di opzione gestibili nella sezione Opzioni
export const OPTION_KINDS = [
  { kind: 'category', label: 'Categorie' },
  { kind: 'status', label: 'Stati' },
  { kind: 'language', label: 'Lingue' },
  { kind: 'set', label: 'Set / Espansioni' },
  { kind: 'grader', label: 'Case di gradazione' },
  { kind: 'tag', label: 'Tag' },
]

// raggruppa le opzioni per tipo: { category: ['ETB',...], language: [...] }
export function groupOptions(rows) {
  const g = {}
  for (const o of rows) (g[o.kind] ??= []).push(o.value)
  return g
}

export async function loadAll() {
  const d = await api('data')
  return { ...d, opt: groupOptions(d.options) }
}
