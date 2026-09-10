import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { eur2 } from '../lib/finance'
import { Modal, Form, Who } from '../components/ui'

const FIELDS = [
  { name: 'name', label: 'Nome raffle', required: true, full: true },
  { name: 'cost_enrico', label: 'Pagato da Enrico', type: 'number', default: 0, who: 'e' },
  { name: 'cost_alessandro', label: 'Pagato da Alessandro', type: 'number', default: 0, who: 'a' },
  { name: 'date', label: 'Data', type: 'date', default: new Date().toISOString().slice(0, 10) },
]

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
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Raffle</th><th>Chi</th><th className="num">Enrico</th><th className="num">Alessandro</th><th className="num">Totale</th><th></th></tr></thead>
          <tbody>
            {data.raffles.map(r => (
              <tr key={r.id}>
                <td className="muted">{r.date ? new Date(r.date).toLocaleDateString('it-IT') : '—'}</td>
                <td>{r.name}</td>
                <td><Who enrico={r.cost_enrico} alessandro={r.cost_alessandro} /></td>
                <td className="num">{eur2(r.cost_enrico)}</td>
                <td className="num">{eur2(r.cost_alessandro)}</td>
                <td className="num">{eur2(Number(r.cost_enrico) + Number(r.cost_alessandro))}</td>
                <td><button className="btn ghost sm" onClick={() => setModal({ item: r })}>Modifica</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal.item ? 'Modifica raffle' : 'Nuovo raffle'} onClose={() => setModal(null)}>
          <Form fields={FIELDS} initial={modal.item || {}} onSubmit={save} onCancel={() => setModal(null)} onDelete={modal.item ? remove : null} />
        </Modal>
      )}
    </>
  )
}
