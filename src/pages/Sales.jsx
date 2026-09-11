import { eur2 } from '../lib/finance'
import { DataTable } from '../components/DataTable'

const d = v => (v ? new Date(v).toLocaleDateString('it-IT') : '—')

export default function Sales({ data }) {
  const total = data.sales.reduce((s, x) => s + Number(x.sale_price_total), 0)
  return (
    <>
      <div className="page-head">
        <div><h1>Vendite</h1><p>{data.sales.length} vendite · incassato {eur2(total)}</p></div>
      </div>
      <div className="panel">
        <DataTable
          rowKey={s => s.id}
          rows={data.sales}
          empty="Nessuna vendita registrata."
          columns={[
            { key: 'item', label: 'Articolo', primary: true, render: s => <>{s.item_name}{!s.item_id && <span className="tag" title="L'articolo originale è stato eliminato">articolo rimosso</span>}</> },
            { key: 'date', label: 'Data', render: s => <span className="muted">{d(s.sale_date)}</span> },
            { key: 'qty', label: 'Qtà', num: true, render: s => s.quantity_sold },
            { key: 'tot', label: 'Incassato', num: true, cls: () => 'up', render: s => eur2(s.sale_price_total) },
            { key: 'by', label: 'Registrata da', render: s => <span className="muted">{s.created_by || '—'}</span> },
          ]}
        />
      </div>
      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>Per registrare una vendita usa il pulsante "Vendi" nell'inventario, così quantità e stato si aggiornano da soli.</p>
    </>
  )
}
