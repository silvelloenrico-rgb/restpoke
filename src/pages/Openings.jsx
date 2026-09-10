import { useMemo } from 'react'
import { summarizeOpenings, eur2 } from '../lib/finance'
import { Status } from '../components/ui'
import { DataTable } from '../components/DataTable'

const d = v => (v ? new Date(v).toLocaleDateString('it-IT') : null)

export default function Openings({ data }) {
  const boxes = useMemo(() => summarizeOpenings(data.items), [data.items])
  const totCost = boxes.reduce((s, b) => s + b.cost, 0)
  const totValue = boxes.reduce((s, b) => s + b.value, 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sbusti</h1>
          <p>{boxes.length} box aperti · costo {eur2(totCost)} → valore estratto {eur2(totValue)}</p>
        </div>
      </div>

      {boxes.length === 0 && (
        <div className="panel empty">
          Nessuno sbusto registrato. Nell'inventario premi <strong>Apri</strong> su un box per segnarlo aperto e registrare le carte estratte.
        </div>
      )}

      {boxes.map(({ box, kids, cost, value, gain }) => (
        <section className="opening" key={box.id}>
          <div className="opening-head">
            <div>
              <h2>{box.name}</h2>
              {d(box.opened_date) && <div className="muted" style={{ fontSize: 13 }}>aperto il {d(box.opened_date)}</div>}
            </div>
            <div className="opening-figs">
              <div>costo<b>{eur2(cost)}</b></div>
              <div>estratto<b>{eur2(value)}</b></div>
              <div>{gain >= 0 ? 'resa' : 'perdita'}<b className={gain >= 0 ? 'up' : 'down'}>{eur2(gain)}</b></div>
            </div>
          </div>
          {kids.length === 0
            ? <p className="muted" style={{ margin: '8px 0 0' }}>Ancora nessuna carta registrata. Aprilo dall'inventario (pulsante "Sbusto") per aggiungerle.</p>
            : <DataTable
                rowKey={k => k.id}
                rows={kids}
                columns={[
                  { key: 'name', label: 'Carta', primary: true, render: k => k.name },
                  { key: 'st', label: 'Stato', render: k => <Status value={k.status} /> },
                  { key: 'qty', label: 'Qtà', num: true, render: k => k.quantity },
                  { key: 'val', label: 'Valore / incasso', num: true, render: k => k.status === 'Venduto' ? <span className="up">incassato {eur2(k.revenue)}</span> : eur2(Number(k.market_price || 0) * Number(k.quantity || 0)) },
                ]}
              />}
        </section>
      ))}
    </>
  )
}
