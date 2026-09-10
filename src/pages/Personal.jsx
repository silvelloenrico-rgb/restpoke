import { useState } from 'react'
import { supabase, STATUSES, PEOPLE } from '../lib/supabase'
import { eur2, summarizePersonal } from '../lib/finance'
import { Modal, Form, Status } from '../components/ui'

const FIELDS = [
  { name: 'name', label: 'Nome', required: true, full: true },
  { name: 'owner', label: 'Proprietario', type: 'select', options: PEOPLE, required: true },
  { name: 'status', label: 'Stato', type: 'select', options: STATUSES, required: true, default: 'Stock' },
  { name: 'quantity', label: 'Quantità', type: 'number', default: 1 },
  { name: 'cost', label: 'Costo totale', type: 'number', default: 0 },
  { name: 'purchase_date', label: 'Data acquisto', type: 'date' },
  { name: 'sale_price_total', label: 'Incassato (se venduto)', type: 'number' },
  { name: 'quantity_sold', label: 'Quantità venduta', type: 'number' },
  { name: 'sale_date', label: 'Data vendita', type: 'date' },
  { name: 'tags', label: 'Tag', type: 'tags', full: true },
]

export default function Personal({ data, refresh, session }) {
  const guess = session.user.email?.toLowerCase().includes('alessandro') ? 'Alessandro' : 'Enrico'
  const [owner, setOwner] = useState(guess)
  const [modal, setModal] = useState(null)
  const rows = data.personal.filter(r => r.owner === owner)
  const s = summarizePersonal(data.personal, owner)

  const save = async out => {
    const r = modal.item ? await supabase.from('personal_items').update(out).eq('id', modal.item.id) : await supabase.from('personal_items').insert(out)
    if (r.error) throw r.error
    setModal(null); refresh()
  }
  const remove = async () => {
    if (!confirm('Eliminare questo articolo?')) return
    await supabase.from('personal_items').delete().eq('id', modal.item.id); setModal(null); refresh()
  }
  return (
    <>
      <div className="page-head">
        <div><h1>Collezione personale</h1><p>Articoli fuori dalla società, separati per proprietario.</p></div>
        <button className="btn" onClick={() => setModal({ item: null })}>Aggiungi</button>
      </div>
      <div className="toolbar">
        {PEOPLE.map(p => <button key={p} className={`btn ${owner === p ? '' : 'ghost'}`} onClick={() => setOwner(p)}>{p}</button>)}
      </div>
      <div className="kpis">
        <div><div className="label">In stock</div><div className="value">{s.count}</div><div className="sub">pezzi</div></div>
        <div><div className="label">Costo stock</div><div className="value">{eur2(s.stockCost)}</div></div>
        <div><div className="label">Incassato</div><div className="value">{eur2(s.revenue)}</div></div>
        <div><div className="label">Profitto sul venduto</div><div className={`value ${s.profit >= 0 ? 'up' : 'down'}`}>{eur2(s.profit)}</div></div>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Articolo</th><th>Stato</th><th className="num">Qtà</th><th className="num">Costo</th><th className="num">Incassato</th><th className="num">Margine</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => {
              const gain = r.status === 'Venduto' && r.sale_price_total != null ? Number(r.sale_price_total) - Number(r.cost) : null
              return (
                <tr key={r.id}>
                  <td>{r.name}</td><td><Status value={r.status} /></td>
                  <td className="num">{r.quantity}</td>
                  <td className="num">{eur2(r.cost)}</td>
                  <td className="num">{r.sale_price_total != null ? eur2(r.sale_price_total) : '—'}</td>
                  <td className={`num ${gain == null ? '' : gain >= 0 ? 'up' : 'down'}`}>{gain != null ? eur2(gain) : '—'}</td>
                  <td><button className="btn ghost sm" onClick={() => setModal({ item: r })}>Modifica</button></td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="empty">Nessun articolo per {owner}.</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal.item ? 'Modifica articolo' : 'Nuovo articolo personale'} onClose={() => setModal(null)}>
          <Form fields={FIELDS} initial={modal.item || { owner }} onSubmit={save} onCancel={() => setModal(null)} onDelete={modal.item ? remove : null} />
        </Modal>
      )}
    </>
  )
}
