import { useMemo } from 'react'
import { summarizeOpenings, eur2, tone } from '../lib/finance'
import { Status } from '../components/ui'
import { DataTable } from '../components/DataTable'

const d = v => (v ? new Date(v).toLocaleDateString('it-IT') : null)

export default function Openings({ data }) {
  const boxes = useMemo(() => summarizeOpenings(data.items), [data.items])
  const totCost = boxes.reduce((s, b) => s + b.cost, 0)
  const totValue = boxes.reduce((s, b) => s + b.value, 0)
  const withCards = boxes.filter(b => b.kids.length > 0)
  const empty = boxes.filter(b => b.kids.length === 0)

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

      {withCards.map(({ box, kids, cost, value, gain }) => (
        <section className="opening" key={box.id}>
          <div className="opening-head">
            <div>
              <h2>{box.name}</h2>
              {d(box.opened_date) && <div className="muted" style={{ fontSize: 13 }}>aperto il {d(box.opened_date)}</div>}
            </div>
            <div className="opening-figs">
              <div>costo<b>{eur2(cost)}</b></div>
              <div>estratto<b>{eur2(value)}</b></div>
              <div>resa<b className={tone(gain)}>{eur2(gain)}</b></div>
            </div>
          </div>
          <DataTable
            rowKey={k => k.id}
            rows={kids}
            columns={[
              { key: 'name', label: 'Carta', primary: true, render: k => k.name },
              { key: 'st', label: 'Stato', render: k => <Status value={k.status} /> },
              { key: 'qty', label: 'Qtà', num: true, render: k => k.quantity },
              { key: 'val', label: 'Valore / incasso', num: true, render: k => k.status === 'Venduto' ? <span className="up">incassato {eur2(k.revenue)}</span> : eur2(Number(k.market_price || 0) * Number(k.quantity || 0)) },
            ]}
          />
        </section>
      ))}

      {empty.length > 0 && (
        <section className="opening">
          <div className="opening-head">
            <div>
              <h2>Senza carte registrate</h2>
              <div className="muted" style={{ fontSize: 13 }}>Per aggiungere le carte: Inventario → tocca il box → Gestisci sbusto.</div>
            </div>
          </div>
          <DataTable
            rowKey={b => b.box.id}
            rows={empty}
            columns={[
              { key: 'name', label: 'Box', primary: true, render: b => b.box.name },
              { key: 'date', label: 'Aperto il', render: b => <span className="muted">{d(b.box.opened_date) || '—'}</span> },
              { key: 'cost', label: 'Costo', num: true, render: b => eur2(b.cost) },
            ]}
          />
        </section>
      )}
    </>
  )
}
