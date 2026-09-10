// Tutti i calcoli della dashboard in un unico posto.
const n = v => Number(v) || 0

export const eur = v =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n(v))
export const eur2 = v =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n(v))
export const pct = v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`

export function summarize({ items, sales, costs, raffles }) {
  // Investito per persona: costo articoli + costi extra + raffle
  const invested = { Enrico: 0, Alessandro: 0 }
  for (const i of items) {
    invested.Enrico += n(i.cost_enrico)
    invested.Alessandro += n(i.cost_alessandro)
  }
  for (const c of costs) invested[c.paid_by] += n(c.amount)
  for (const r of raffles) {
    invested.Enrico += n(r.cost_enrico)
    invested.Alessandro += n(r.cost_alessandro)
  }
  const investedTotal = invested.Enrico + invested.Alessandro

  const revenue = sales.reduce((s, x) => s + n(x.sale_price_total), 0)

  // Box già aperti: il loro valore vive nelle carte estratte, non nel sigillato.
  // Contribuiscono 0 al valore di mercato (ma il loro costo resta in stockCost e invested).
  const openedParents = new Set(items.filter(i => i.opened_from).map(i => i.opened_from))
  const mktValue = i => (openedParents.has(i.id) ? 0 : n(i.market_price) * n(i.quantity))

  // Valore stock: prezzo di mercato × quantità per articoli non venduti
  const inStock = items.filter(i => i.status !== 'Venduto')
  const stockValue = inStock.reduce((s, i) => s + mktValue(i), 0)
  const stockCost = inStock.reduce((s, i) => s + n(i.total_cost), 0)

  const realized = revenue - investedTotal          // cassa netta
  const unrealized = stockValue - stockCost         // plusvalenza latente
  const equity = revenue + stockValue - investedTotal

  // Quota equa: ciascuno dovrebbe aver messo metà. Chi ha messo di più è a credito.
  const balance = { Enrico: invested.Enrico - investedTotal / 2, Alessandro: invested.Alessandro - investedTotal / 2 }

  // Per categoria
  const byCategory = {}
  for (const i of inStock) {
    const k = i.category || 'Senza categoria'
    byCategory[k] ??= { name: k, value: 0, cost: 0, qty: 0 }
    byCategory[k].value += mktValue(i)
    byCategory[k].cost += n(i.total_cost)
    byCategory[k].qty += n(i.quantity)
  }

  // Per mese: investito vs incassato
  const months = {}
  const key = d => (d ? d.slice(0, 7) : null)
  for (const i of items) {
    const k = key(i.purchase_date); if (!k) continue
    months[k] ??= { month: k, investito: 0, incassato: 0 }
    months[k].investito += n(i.cost_enrico) + n(i.cost_alessandro)
  }
  for (const c of costs) { const k = key(c.date); if (!k) continue; months[k] ??= { month: k, investito: 0, incassato: 0 }; months[k].investito += n(c.amount) }
  for (const r of raffles) { const k = key(r.date); if (!k) continue; months[k] ??= { month: k, investito: 0, incassato: 0 }; months[k].investito += n(r.cost_enrico) + n(r.cost_alessandro) }
  for (const s of sales) { const k = key(s.sale_date); if (!k) continue; months[k] ??= { month: k, investito: 0, incassato: 0 }; months[k].incassato += n(s.sale_price_total) }
  const byMonth = Object.values(months).sort((a, b) => a.month.localeCompare(b.month))

  // Top posizioni per plusvalenza latente
  const topGains = inStock
    .filter(i => !openedParents.has(i.id))
    .map(i => ({ ...i, gain: n(i.market_price) * n(i.quantity) - n(i.total_cost) }))
    .filter(i => i.market_price != null)
    .sort((a, b) => b.gain - a.gain)

  return { invested, investedTotal, revenue, stockValue, stockCost, realized, unrealized, equity, balance,
    byCategory: Object.values(byCategory).sort((a, b) => b.value - a.value), byMonth, topGains, inStockCount: inStock.length }
}

// Resa degli sbusti: per ogni box aperto, costo del box vs valore/incasso delle carte estratte.
export function summarizeOpenings(items) {
  const childrenByBox = {}
  for (const c of items) if (c.opened_from) (childrenByBox[c.opened_from] ??= []).push(c)
  const boxes = items.filter(b => b.status === 'Aperto' || childrenByBox[b.id])
  return boxes.map(b => {
    const kids = childrenByBox[b.id] || []
    const stockValue = kids.filter(k => k.status !== 'Venduto').reduce((s, k) => s + n(k.market_price) * n(k.quantity), 0)
    const revenue = kids.reduce((s, k) => s + n(k.revenue), 0)
    const value = stockValue + revenue
    const cost = n(b.total_cost)
    return { box: b, kids, cost, stockValue, revenue, value, gain: value - cost }
  }).sort((a, b) => b.gain - a.gain)
}

// Carte estratte da un box specifico (per il modale di apertura)
export function childrenOf(items, boxId) {
  return items.filter(i => i.opened_from === boxId)
}

export function summarizePersonal(rows, owner) {
  const mine = rows.filter(r => r.owner === owner)
  const invested = mine.reduce((s, r) => s + n(r.cost), 0)
  const revenue = mine.reduce((s, r) => s + n(r.sale_price_total), 0)
  const stock = mine.filter(r => r.status !== 'Venduto')
  const stockCost = stock.reduce((s, r) => s + n(r.cost), 0)
  return { invested, revenue, stockCost, count: stock.length, profit: revenue - (invested - stockCost) }
}
