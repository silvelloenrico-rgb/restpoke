import { useMemo } from 'react'
import { summarizeOpenings, eur2 } from '../lib/finance'
import { Status } from '../components/ui'

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
        <div className="panel" key={box.id} style={{ marginBottom: 20 }}>
          <div className="legend" style={{ marginBottom: 6 }}>
            <span><strong style={{ fontSize: 17, fontFamily: 'var(--display)' }}>{box.name}</strong>{box.opened_date && <span className="muted"> · aperto il {new Date(box.opened_date).toLocaleDateString('it-IT')}</span>}</span>
            <span>Costo {eur2(cost)} → estratto {eur2(value)} · <strong className={gain >= 0 ? 'up' : 'down'} style={{ fontSize: 17 }}>{gain >= 0 ? 'resa ' : 'perdita '}{eur2(gain)}</strong></span>
          </div>
          {kids.length === 0
            ? <p className="muted" style={{ margin: '8px 0 0' }}>Ancora nessuna carta registrata per questo box. Aprilo dall'inventario (pulsante "Sbusto") per aggiungerle.</p>
            : <div className="table-wrap"><table>
                <thead><tr><th>Carta</th><th>Stato</th><th className="num">Qtà</th><th className="num">Valore / incasso</th></tr></thead>
                <tbody>
                  {kids.map(k => (
                    <tr key={k.id}>
                      <td>{k.name}</td>
                      <td><Status value={k.status} /></td>
                      <td className="num">{k.quantity}</td>
                      <td className="num">{k.status === 'Venduto' ? <span className="up">incassato {eur2(k.revenue)}</span> : eur2(Number(k.market_price || 0) * Number(k.quantity || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>}
        </div>
      ))}
    </>
  )
}
