import { createClient } from '@supabase/supabase-js'

// La chiave "publishable" è pensata per stare nel client: i dati restano protetti
// dalle regole di accesso (RLS) di Supabase. Si può quindi usare come valore di
// default, così l'app funziona anche quando compilata da GitHub senza file .env.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://ewgbpgdgwsjteytrhfut.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_57oMZ980yYpefxO765jG3g_EoS-127B'

export const supabase = createClient(URL, KEY)

export const PEOPLE = ['Enrico', 'Alessandro']

// Mappa email di accesso -> persona (per la collezione personale).
export const OWNER_BY_EMAIL = {
  'silvello.enrico@gmail.com': 'Enrico',
  'alessandro.donaudi@gmail.com': 'Alessandro',
}
export function ownerFromEmail(email) {
  const e = (email || '').toLowerCase()
  if (OWNER_BY_EMAIL[e]) return OWNER_BY_EMAIL[e]
  return e.includes('alessandro') ? 'Alessandro' : 'Enrico' // fallback
}
export const CATEGORIES = ['ETB', 'BOX', 'UPC/SPC', 'Carta Raw', 'Carta Gradata', 'Collezione']
export const STATUSES = ['Stock', 'Venduto', 'A Gradare', 'Aperto']

export async function loadAll() {
  const [items, sales, costs, raffles, personal] = await Promise.all([
    supabase.from('item_summary').select('*').order('purchase_date', { ascending: false }),
    supabase.from('sales').select('*').order('sale_date', { ascending: false }),
    supabase.from('item_costs').select('*').order('date', { ascending: false }),
    supabase.from('raffles').select('*').order('date', { ascending: false }),
    supabase.from('personal_items').select('*').order('purchase_date', { ascending: false }),
  ])
  const err = [items, sales, costs, raffles, personal].find(r => r.error)
  if (err) throw err.error
  return {
    items: items.data,
    sales: sales.data,
    costs: costs.data,
    raffles: raffles.data,
    personal: personal.data,
  }
}
