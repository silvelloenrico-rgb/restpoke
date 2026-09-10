import { useMemo, useState } from 'react'
import { supabase, CATEGORIES, STATUSES, PEOPLE } from '../lib/supabase'
import { eur2, childrenOf } from '../lib/finance'
import { notifyOther } from '../lib/push'
import { Modal, Form, Who, Status } from '../components/ui'

// Modale apertura box: segna il box come aperto e registra le carte estratte (costo 0).
function OpenModal({ box, data, refresh, onClose }) {
  const kids = childrenOf(data.items, box.id)
  const stockValue = kids.filter(k => k.status !== 'Venduto').reduce((s, k) => s + Number(k.market_price || 0) * Number(k.quantity || 0), 0)
  const revenue = kids.reduce((s, k) => s + Number(k.revenue || 0), 0)
  const value = stockValue + revenue
  const gain = value - Number(box.total_cost || 0)

  const addCard = async out => {
    const card = { ...out, cost_enrico: 0, cost_alessandro: 0, opened_from: box.id,
      purchase_date: box.purchase_date, created_by: box.created_by,
      tags: out.tags?.length ? out.tags : ['Carta Sbustata'] }
    const { error } = await supabase.from('items').insert(card)
    if (error) throw error
    if (box.status !== 'Aperto') await markOpened()
    notifyOther('Sbusto', `Da ${box.name}: ${out.name}${out.market_price ? ' · ' + eur2(out.market_price) : ''}`)
    refresh()
  }
  const markOpened = async () => {
    await supabase.from('items').update({ status: 'Aperto', opened_date: new Date().toISOString().slice(0, 10) }).eq('id', box.id)
  }
  const markOpenedOnly = async () => { await markOpened(); refresh() }

  return (
    <Modal title={`Sbusto: ${box.name}`} onClose={onClose}>
      <div className="split" style={{ margin: '0 0 18px', padding: '16px 18px' }}>
        <div className="legend">
          <span>Costo del box <strong>{eur2(box.total_cost)}</strong></span>
          <span>Valore carte estratte <strong>{eur2(value)}</strong></span>
          <span>Resa <strong className={gain >= 0 ? 'up' : 'down'}>{eur2(gain)}</strong></span>
        </div>
        {box.status !== 'Aperto' && <div className="settle" style={{ marginTop: 12 }}>
          Questo box risulta ancora sigillato. Aggiungi una carta estratta qui sotto (lo segna aperto da solo),
          oppure <button className="btn ghost sm" onClick={markOpenedOnly}>segnalo aperto senza carte</button>.
        </div>}
      </div>

      {kids.length > 0 && <div className="table-wrap" style={{ marginBottom: 18 }}>
        <table>
          <thead><tr><th>Carta estratta</th><th>Stato</th><th className="num">Qtà</th><th className="num">Mercato</th></tr></thead>
          <tbody>
            {kids.map(k => (
              <tr key={k.id}>
                <td>{k.name}</td><td><Status value={k.status} /></td>
                <td className="num">{k.quantity}</td>
                <td className="num">{k.status === 'Venduto' ? <span className="muted">venduto {eur2(k.revenue)}</span> : eur2(Number(k.market_price || 0) * Number(k.quantity || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      <h3 style={{ marginBottom: 10 }}>Aggiungi carta estratta</h3>
      <Form
        fields={[
          { name: 'name', label: 'Nome carta', required: true, full: true },
          { name: 'category', label: 'Categoria', type: 'select', options: CATEGORIES, default: 'Carta Raw' },
          { name: 'status', label: 'Stato', type: 'select', options: STATUSES, required: true, default: 'Stock' },
          { name: 'quantity', label: 'Quantità', type: 'number', default: 1 },
          { name: 'market_price', label: 'Prezzo di mercato', type: 'number' },
          { name: 'tags', label: 'Tag', type: 'tags', default: ['Carta Sbustata'] },
        ]}
        onSubmit={addCard} onCancel={onClose} submitLabel="Aggiungi carta"
      />
    </Modal>
  )
}

const ITEM_FIELDS = [
  { name: 'name', label: 'Nome', required: true, full: true },
  { name: 'category', label: 'Categoria', type: 'select', options: CATEGORIES },
  { name: 'status', label: 'Stato', type: 'select', options: STATUSES, required: true, default: 'Stock' },
  { name: 'quantity', label: 'Quantità', type: 'number', default: 1 },
  { name: 'market_price', label: 'Prezzo di mercato (unitario)', type: 'number' },
  { name: 'cost_enrico', label: 'Pagato da Enrico', type: 'number', default: 0, who: 'e' },
  { name: 'cost_alessandro', label: 'Pagato da Alessandro', type: 'number', default: 0, who: 'a' },
  { name: 'purchase_date', label: 'Data acquisto', type: 'date' },
  { name: 'tags', label: 'Tag (separati da virgola)', type: 'tags', placeholder: 'Investimento, Sbusto' },
]

export default function Inventory({ data, refresh }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [st, setSt] = useState('')
  const [modal, setModal] = useState(null) // {type:'new'|'edit'|'sell'|'cost'|'open', item}
  const [openId, setOpenId] = useState(null) // scheda espansa (telefono)

  const rows = useMemo(() => data.items.filter(i =>
    (!q || i.name.toLowerCase().includes(q.toLowerCase())) &&
    (!cat || i.category === cat) && (!st || i.status === st)
  ), [data.items, q, cat, st])

  // box con carte già estratte: il loro valore vive nelle carte, non nel sigillato
  const openedParents = useMemo(() => new Set(data.items.filter(i => i.opened_from).map(i => i.opened_from)), [data.items])
  const nameById = useMemo(() => Object.fromEntries(data.items.map(i => [i.id, i.name])), [data.items])

  const save = async out => {
    const payload = { ...out, created_by: modal.item?.created_by }
    const r = modal.type === 'new'
      ? await supabase.from('items').insert(payload)
      : await supabase.from('items').update(payload).eq('id', modal.item.id)
    if (r.error) throw r.error
    if (modal.type === 'new') notifyOther('Nuovo articolo', `${out.name} · ${eur2(Number(out.cost_enrico || 0) + Number(out.cost_alessandro || 0))}`)
    setModal(null); refresh()
  }
  const remove = async () => {
    if (!confirm(`Eliminare "${modal.item.name}"? Le vendite collegate restano.`)) return
    await supabase.from('items').delete().eq('id', modal.item.id)
    setModal(null); refresh()
  }
  const sell = async out => {
    const it = modal.item
    const { error } = await supabase.from('sales').insert({ item_id: it.id, item_name: it.name, ...out })
    if (error) throw error
    const left = Math.max(0, Number(it.quantity) - Number(out.quantity_sold))
    await supabase.from('items').update({
      quantity: left, status: left === 0 ? 'Venduto' : it.status, sale_date: out.sale_date,
      sale_price: out.sale_price_total / out.quantity_sold,
    }).eq('id', it.id)
    notifyOther('Vendita registrata', `${it.name} · ${eur2(out.sale_price_total)}`)
    setModal(null); refresh()
  }
  const addCost = async out => {
    const { error } = await supabase.from('item_costs').insert({ item_id: modal.item.id, item_name: modal.item.name, ...out })
    if (error) throw error
    setModal(null); refresh()
  }

  const viewRows = rows.map(i => {
    const isOpenedBox = openedParents.has(i.id)
    const mv = !isOpenedBox && i.market_price != null && i.status !== 'Venduto' ? i.market_price * i.quantity : null
    const gain = isOpenedBox ? null : (mv != null ? mv - i.total_cost : (i.status === 'Venduto' ? i.revenue - i.total_cost : null))
    return { i, isOpenedBox, mv, gain }
  })

  const RowActions = ({ i, isOpenedBox }) => (<>
    <button className="btn ghost sm" onClick={() => setModal({ type: 'edit', item: i })}>Modifica</button>
    {i.status !== 'Venduto' && !i.opened_from && <button className="btn ghost sm" onClick={() => setModal({ type: 'open', item: i })}>{i.status === 'Aperto' || isOpenedBox ? 'Sbusto' : 'Apri'}</button>}
    {i.status !== 'Venduto' && !isOpenedBox && <button className="btn ghost sm" onClick={() => setModal({ type: 'sell', item: i })}>Vendi</button>}
    <button className="btn ghost sm" onClick={() => setModal({ type: 'cost', item: i })}>+ costo</button>
  </>)

  return (
    <>
      <div className="page-head">
        <div><h1>Inventario</h1><p>{rows.length} articoli · costo totale include spedizioni e gradazioni</p></div>
        <button className="btn" onClick={() => setModal({ type: 'new' })}>Aggiungi articolo</button>
      </div>
      <div className="toolbar">
        <input type="search" placeholder="Cerca per nome" value={q} onChange={e => setQ(e.target.value)} />
        <select value={cat} onChange={e => setCat(e.target.value)}><option value="">Tutte le categorie</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        <select value={st} onChange={e => setSt(e.target.value)}><option value="">Tutti gli stati</option>{STATUSES.map(c => <option key={c}>{c}</option>)}</select>
      </div>

      {/* Schede (telefono): compatte, tocca per vedere i pulsanti */}
      <div className="card-list">
        {viewRows.map(({ i, isOpenedBox, mv, gain }) => {
          const open = openId === i.id
          return (
            <div className={`item-card ${open ? 'open' : ''}`} key={i.id} onClick={() => setOpenId(open ? null : i.id)}>
              <div className="row1">
                <span className="nm">{i.name}</span>
                <Status value={i.status} />
              </div>
              <div className="row2">
                <span className="meta">
                  {i.category || 'Senza cat.'}
                  {i.quantity > 1 && ` ×${i.quantity}`}
                  {i.opened_from && ` · da ${nameById[i.opened_from] || 'box'}`}
                </span>
                <span className="nums">
                  <span>{eur2(i.total_cost)}</span>
                  <span className="arr">→</span>
                  <span>{isOpenedBox ? 'aperto' : mv != null ? eur2(mv) : i.status === 'Venduto' ? eur2(i.revenue) : '—'}</span>
                  {gain != null && <b className={gain >= 0 ? 'up' : 'down'}>{gain >= 0 ? '+' : ''}{eur2(gain)}</b>}
                </span>
              </div>
              {open && (
                <div className="acts" onClick={e => e.stopPropagation()}>
                  {i.tags?.length > 0 && <div className="tags">{i.tags.map(t => <span className="tag" key={t}>{t}</span>)}</div>}
                  <RowActions i={i} isOpenedBox={isOpenedBox} />
                </div>
              )}
            </div>
          )
        })}
        {viewRows.length === 0 && <div className="empty">Nessun articolo corrisponde ai filtri.</div>}
      </div>

      {/* Tabella (desktop) */}
      <div className="panel table-wrap desktop-only">
        <table>
          <thead><tr>
            <th>Articolo</th><th>Stato</th><th className="num">Qtà</th><th>Chi</th><th className="num">Costo</th><th className="num">Mercato</th><th className="num">Margine</th><th></th>
          </tr></thead>
          <tbody>
            {viewRows.map(({ i, isOpenedBox, mv, gain }) => (
                <tr key={i.id}>
                  <td>
                    <div>{i.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {i.category || 'Senza categoria'}
                      {i.opened_from && <span className="tag" title="Carta estratta da uno sbusto">da: {nameById[i.opened_from] || 'box'}</span>}
                      {i.tags?.map(t => <span className="tag" key={t}>{t}</span>)}
                    </div>
                  </td>
                  <td><Status value={i.status} /></td>
                  <td className="num">{i.quantity}</td>
                  <td><Who enrico={Number(i.cost_enrico) + Number(i.extra_enrico)} alessandro={Number(i.cost_alessandro) + Number(i.extra_alessandro)} /></td>
                  <td className="num">{eur2(i.total_cost)}</td>
                  <td className="num">{isOpenedBox ? <span className="muted">aperto</span> : mv != null ? eur2(mv) : i.status === 'Venduto' ? <span className="muted">venduto {eur2(i.revenue)}</span> : '—'}</td>
                  <td className={`num ${gain == null ? '' : gain >= 0 ? 'up' : 'down'}`}>{gain != null ? eur2(gain) : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><RowActions i={i} isOpenedBox={isOpenedBox} /></td>
                </tr>
            ))}
            {viewRows.length === 0 && <tr><td colSpan={8} className="empty">Nessun articolo corrisponde ai filtri.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (modal.type === 'new' || modal.type === 'edit') && (
        <Modal title={modal.type === 'new' ? 'Nuovo articolo' : 'Modifica articolo'} onClose={() => setModal(null)}>
          <Form fields={ITEM_FIELDS} initial={modal.item || {}} onSubmit={save} onCancel={() => setModal(null)} onDelete={modal.item ? remove : null} />
        </Modal>
      )}
      {modal?.type === 'open' && (
        <OpenModal box={modal.item} data={data} refresh={refresh} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'sell' && (
        <Modal title={`Vendi: ${modal.item.name}`} onClose={() => setModal(null)}>
          <Form fields={[
            { name: 'quantity_sold', label: 'Quantità venduta', type: 'number', default: 1, required: true },
            { name: 'sale_price_total', label: 'Prezzo totale incassato', type: 'number', required: true },
            { name: 'sale_date', label: 'Data vendita', type: 'date', default: new Date().toISOString().slice(0, 10) },
          ]} onSubmit={sell} onCancel={() => setModal(null)} submitLabel="Registra vendita" />
        </Modal>
      )}
      {modal?.type === 'cost' && (
        <Modal title={`Costo extra: ${modal.item.name}`} onClose={() => setModal(null)}>
          <Form fields={[
            { name: 'description', label: 'Descrizione', placeholder: 'Spedizione, gradazione…', full: true },
            { name: 'amount', label: 'Importo', type: 'number', required: true },
            { name: 'paid_by', label: 'Pagato da', type: 'select', options: PEOPLE, required: true, default: 'Enrico' },
            { name: 'date', label: 'Data', type: 'date', default: new Date().toISOString().slice(0, 10) },
          ]} onSubmit={addCost} onCancel={() => setModal(null)} submitLabel="Aggiungi costo" />
        </Modal>
      )}
    </>
  )
}
