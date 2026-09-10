import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { eur2 } from '../lib/finance'
import { Modal, Form, Who } from '../components/ui'
import { DataTable } from '../components/DataTable'

const FIELDS = [
  { name: 'name', label: 'Nome raffle', required: true, full: true },
  { name: 'cost_enrico', label: 'Pagato da Enrico', type: 'number', default: 0, who: 'e' },
  { name: 'cost_alessandro', label: 'Pagato da Alessandro', type: 'number', default: 0, who: 'a' },
  { name: 'date', label: 'Data', type: 'date', default: new Date().toISOString().slice(0, 10) },
]
const d = v => (v ? new Date(v).toLocaleDateString('it-IT') : '—')

export default function Raffles({ data, refresh }) {
  const [modal, setModal] = useState(null)
  const tE = data.raffles.reduce((s, r) => s + Number(r.cost_enrico), 0)
  const tA = data.raffles.reduce((s, r) => s + Number(r.cost_alessandro), 0)
  const save = async out => {
    const r = modal.item ? await supabase.from('raffles').update(out).eq('id', modal.item.id) : await supabase.from('raffles').insert(out)
    if (r.error) throw r.error
    setModal(null); refresh()
  }
  const remove = async () => {
    if (!confirm('Eliminare questo raffle?')) return
    await supabase.from('raffles').delete().eq('id', modal.item.id); setModal(null); refresh()
  }
  return (
    <>
      <div className="page-head">
        <div><h1>Raffle</h1><p>Spesa totale {eur2(tE + tA)} — Enrico {eur2(tE)}, Alessandro {eur2(tA)}. Le carte vinte stanno in inventario col tag "Raffle Vinta".</p></div>
        <button className="btn" onClick={() => setModal({})}>Aggiungi raffle</button>
      </div>
      <div className="panel">
        <DataTable
          rowKey={r => r.id}
          rows={data.raffles}
          empty="Nessun raffle registrato."
          columns={[
            { key: 'name', label: 'Raffle', primary: true, render: r => r.name },
            { key: 'date', label: 'Data', render: r => <span className="muted">{d(r.date)}</span> },
            { key: 'who', label: 'Chi', render: r => <Who enrico={r.cost_enrico} alessandro={r.cost_alessandro} /> },
            { key: 'e', label: 'Enrico', num: true, render: r => eur2(r.cost_enrico) },
            { key: 'a', label: 'Alessandro', num: true, render: r => eur2(r.cost_alessandro) },
            { key: 'tot', label: 'Totale', num: true, render: r => eur2(Number(r.cost_enrico) + Number(r.cost_alessandro)) },
            { key: 'act', label: '', actions: true, render: r => <button className="btn ghost sm" onClick={() => setModal({ item: r })}>Modifica</button> },
          ]}
        />
      </div>
      {modal && (
        <Modal title={modal.item ? 'Modifica raffle' : 'Nuovo raffle'} onClose={() => setModal(null)}>
          <Form fields={FIELDS} initial={modal.item || {}} onSubmit={save} onCancel={() => setModal(null)} onDelete={modal.item ? remove : null} />
        </Modal>
      )}
    </>
  )
}
