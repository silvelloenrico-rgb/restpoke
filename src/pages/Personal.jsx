import { useMemo, useState } from 'react'
import { db } from '../lib/db'
import { eur2, tone, summarizePersonal } from '../lib/finance'
import { Modal, Form, Status } from '../components/ui'
import { Icons } from '../components/icons'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { ItemDetail } from '../components/ItemDetail'

function fields(opt, values = {}) {
  const f = [
    { name: 'name', label: 'Nome', required: true, full: true },
    { name: 'category', label: 'Categoria', type: 'select', options: opt.category || [] },
    { name: 'status', label: 'Stato', type: 'select', options: opt.status || [], required: true, default: 'Stock' },
    { name: 'quantity', label: 'Quantità', type: 'number', default: 1 },
    { name: 'cost', label: 'Costo totale', type: 'number', default: 0 },
    { name: 'market_price', label: 'Prezzo di mercato', type: 'number' },
    { name: 'language', label: 'Lingua', type: 'select', options: opt.language || [] },
    { name: 'card_set', label: 'Set / Espansione', type: 'select', options: opt.set || [] },
    { name: 'year', label: 'Anno', type: 'number' },
  ]
  if ((values.category || '').toLowerCase().includes('gradata'))
    f.push({ name: 'grader', label: 'Casa di gradazione', type: 'select', options: opt.grader || [] })
  f.push(
    { name: 'purchase_date', label: 'Data acquisto', type: 'date' },
    { name: 'sale_price_total', label: 'Incassato (se venduto)', type: 'number' },
    { name: 'sale_date', label: 'Data vendita', type: 'date' },
    { name: 'tags', label: 'Tag', type: 'tags', full: true },
  )
  return f
}

const gainOf = r => (r.status === 'Venduto' && r.sale_price_total != null ? Number(r.sale_price_total) - Number(r.cost) : null)

export default function Personal({ data, refresh, session }) {
  const owner = session.owner
  const opt = data.opt
  const [modal, setModal] = useState(null)
  const [formCat, setFormCat] = useState('')
  const [f, setF] = useState({})

  const mine = data.personal.filter(r => r.owner === owner)
  const rows = useMemo(() => mine.filter(i =>
    (!f.q || i.name.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.category || i.category === f.category) &&
    (!f.status || i.status === f.status) &&
    (!f.language || i.language === f.language) &&
    (!f.card_set || i.card_set === f.card_set)
  ), [data.personal, f, owner])
  const s = summarizePersonal(data.personal, owner)

  const save = async out => {
    const payload = { ...out, owner }
    const r = modal.item ? await db.from('personal_items').update(payload).eq('id', modal.item.id) : await db.from('personal_items').insert(payload)
    if (r.error) throw r.error
    setModal(null); refresh()
  }
  const remove = async item => {
    if (!confirm('Eliminare questo articolo?')) return
    await db.from('personal_items').delete().eq('id', item.id); setModal(null); refresh()
  }
  const openDetail = i => { setFormCat(i.category || ''); setModal({ type: 'detail', item: i }) }

  return (
    <>
      <div className="page-head">
        <div><h1>Collezione di {owner}</h1><p>La tua collezione personale · tocca un articolo per i dettagli.</p></div>
        <button className="btn fab" onClick={() => { setFormCat(''); setModal({ type: 'new' }) }}><Icons.plus width={18} height={18} />Aggiungi</button>
      </div>

      <div className="kpis">
        <div><div className="label">In stock</div><div className="value">{s.count}</div><div className="sub">pezzi</div></div>
        <div><div className="label">Costo stock</div><div className="value">{eur2(s.stockCost)}</div></div>
        <div><div className="label">Incassato</div><div className="value">{eur2(s.revenue)}</div></div>
        <div><div className="label">Profitto sul venduto</div><div className={`value ${tone(s.profit)}`}>{eur2(s.profit)}</div></div>
      </div>

      <FilterBar
        page="personal" saved={data.filters} refresh={refresh}
        value={f} onChange={setF}
        spec={[
          { key: 'q', type: 'search', placeholder: 'Cerca per nome' },
          { key: 'category', type: 'select', label: 'Categoria', options: opt.category },
          { key: 'status', type: 'select', label: 'Stato', options: opt.status },
          { key: 'language', type: 'select', label: 'Lingua', options: opt.language },
          { key: 'card_set', type: 'select', label: 'Set', options: opt.set },
        ]}
      />

      <div className="panel">
        <DataTable
          rowKey={r => r.id}
          rows={rows}
          empty={`Nessun articolo per ${owner}.`}
          onRowClick={openDetail}
          columns={[
            { key: 'name', label: 'Articolo', primary: true, render: r => r.name },
            { key: 'st', label: 'Stato', render: r => <Status value={r.status} /> },
            { key: 'qty', label: 'Qtà', num: true, render: r => r.quantity },
            { key: 'cost', label: 'Costo', num: true, render: r => eur2(r.cost) },
            { key: 'rev', label: 'Incassato', num: true, render: r => r.sale_price_total != null ? eur2(r.sale_price_total) : '—' },
            { key: 'gain', label: 'Margine', num: true, cls: r => tone(gainOf(r)), render: r => gainOf(r) != null ? eur2(gainOf(r)) : '—' },
          ]}
        />
      </div>

      {modal?.type === 'detail' && (() => {
        const i = modal.item
        const g = gainOf(i)
        return (
          <ItemDetail
            item={{ ...i, market_price: i.market_price }} onClose={() => setModal(null)}
            extra={{
              subtitle: <div className="muted">Costo {eur2(i.cost)}</div>,
              rows: [
                ['Incassato', i.sale_price_total != null ? eur2(i.sale_price_total) : null],
                ['Margine', g != null ? eur2(g) : null],
              ],
            }}
            actions={[{ type: 'edit', label: 'Modifica', primary: true }, { type: 'delete', label: 'Elimina', danger: true }]}
            onAction={t => { if (t === 'delete') remove(i); else setModal({ type: 'edit', item: i }) }}
          />
        )
      })()}

      {modal && (modal.type === 'new' || modal.type === 'edit') && (
        <Modal title={modal.item ? 'Modifica articolo' : 'Nuovo articolo personale'} onClose={() => setModal(null)}>
          <Form
            fields={fields(opt, { category: formCat })}
            initial={modal.item || {}}
            onChange={v => setFormCat(v.category)}
            onSubmit={save} onCancel={() => setModal(null)} onDelete={modal.item ? () => remove(modal.item) : null}
          />
        </Modal>
      )}
    </>
  )
}
