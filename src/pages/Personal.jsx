import { useState } from 'react'
import { supabase, STATUSES, ownerFromEmail } from '../lib/supabase'
import { eur2, summarizePersonal } from '../lib/finance'
import { Modal, Form, Status } from '../components/ui'
import { DataTable } from '../components/DataTable'

const FIELDS = [
  { name: 'name', label: 'Nome', required: true, full: true },
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
  const owner = ownerFromEmail(session.user.email)
  const [modal, setModal] = useState(null)
  const rows = data.personal.filter(r => r.owner === owner)
  const s = summarizePersonal(data.personal, owner)

  const save = async out => {
    // il proprietario è sempre l'utente connesso, non modificabile
    const payload = { ...out, owner }
    const r = modal.item ? await supabase.from('personal_items').update(payload).eq('id', modal.item.id) : await supabase.from('personal_items').insert(payload)
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
        <div><h1>Collezione di {owner}</h1><p>La tua collezione personale, fuori dalla società.</p></div>
        <button className="btn" onClick={() => setModal({ item: null })}>Aggiungi</button>
      </div>
      <div className="kpis">
        <div><div className="label">In stock</div><div className="value">{s.count}</div><div className="sub">pezzi</div></div>
        <div><div className="label">Costo stock</div><div className="value">{eur2(s.stockCost)}</div></div>
        <div><div className="label">Incassato</div><div className="value">{eur2(s.revenue)}</div></div>
        <div><div className="label">Profitto sul venduto</div><div className={`value ${s.profit >= 0 ? 'up' : 'down'}`}>{eur2(s.profit)}</div></div>
      </div>
      <div className="panel">
        <DataTable
          rowKey={r => r.id}
          rows={rows}
          empty={`Nessun articolo per ${owner}.`}
          columns={[
            { key: 'name', label: 'Articolo', primary: true, render: r => r.name },
            { key: 'st', label: 'Stato', render: r => <Status value={r.status} /> },
            { key: 'qty', label: 'Qtà', num: true, render: r => r.quantity },
            { key: 'cost', label: 'Costo', num: true, render: r => eur2(r.cost) },
            { key: 'rev', label: 'Incassato', num: true, render: r => r.sale_price_total != null ? eur2(r.sale_price_total) : '—' },
            { key: 'gain', label: 'Margine', num: true,
              cls: r => { const g = r.status === 'Venduto' && r.sale_price_total != null ? Number(r.sale_price_total) - Number(r.cost) : null; return g == null ? '' : g >= 0 ? 'up' : 'down' },
              render: r => { const g = r.status === 'Venduto' && r.sale_price_total != null ? Number(r.sale_price_total) - Number(r.cost) : null; return g != null ? eur2(g) : '—' } },
            { key: 'act', label: '', actions: true, render: r => <button className="btn ghost sm" onClick={() => setModal({ item: r })}>Modifica</button> },
          ]}
        />
      </div>
      {modal && (
        <Modal title={modal.item ? 'Modifica articolo' : 'Nuovo articolo personale'} onClose={() => setModal(null)}>
          <Form fields={FIELDS} initial={modal.item || {}} onSubmit={save} onCancel={() => setModal(null)} onDelete={modal.item ? remove : null} />
        </Modal>
      )}
    </>
  )
}
