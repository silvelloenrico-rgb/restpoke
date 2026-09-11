import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL || 'https://ewgbpgdgwsjteytrhfut.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_57oMZ980yYpefxO765jG3g_EoS-127B'

export const supabase = createClient(URL, KEY)

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

export const OWNER_BY_EMAIL = {
  'silvello.enrico@gmail.com': 'Enrico',
  'alessandro.donaudi@gmail.com': 'Alessandro',
}
export function ownerFromEmail(email) {
  const e = (email || '').toLowerCase()
  if (OWNER_BY_EMAIL[e]) return OWNER_BY_EMAIL[e]
  return e.includes('alessandro') ? 'Alessandro' : 'Enrico'
}

// raggruppa le opzioni per tipo: { category: ['ETB',...], language: [...] }
export function groupOptions(rows) {
  const g = {}
  for (const o of rows) (g[o.kind] ??= []).push(o.value)
  return g
}

export async function loadAll() {
  const [items, sales, costs, raffles, personal, options, filters] = await Promise.all([
    supabase.from('item_summary').select('*').order('purchase_date', { ascending: false }),
    supabase.from('sales').select('*').order('sale_date', { ascending: false }),
    supabase.from('item_costs').select('*').order('date', { ascending: false }),
    supabase.from('raffles').select('*').order('date', { ascending: false }),
    supabase.from('personal_items').select('*').order('purchase_date', { ascending: false }),
    supabase.from('options').select('*').order('kind').order('sort').order('value'),
    supabase.from('saved_filters').select('*').order('created_at'),
  ])
  const err = [items, sales, costs, raffles, personal, options, filters].find(r => r.error)
  if (err) throw err.error
  return {
    items: items.data, sales: sales.data, costs: costs.data,
    raffles: raffles.data, personal: personal.data,
    options: options.data, opt: groupOptions(options.data),
    filters: filters.data,
  }
}
