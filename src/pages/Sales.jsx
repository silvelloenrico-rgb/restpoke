import { supabase } from '../lib/supabase'
import { eur2 } from '../lib/finance'

export default function Sales({ data, refresh }) {
  const total = data.sales.reduce((s, x) => s + Number(x.sale_price_total), 0)
  const remove = async s => {
    if (!confirm(`Eliminare la vendita di "${s.item_name}"? La quantità dell'articolo non viene ripristinata automaticamente.`)) return
    await supabase.from('sales').delete().eq('id', s.id); refresh()
  }
  return (
    <>
      <div className="page-head">
        <div><h1>Vendite</h1><p>{data.sales.length} vendite · incassato {eur2(total)}</p></div>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Articolo</th><th className="num">Qtà</th><th className="num">Incassato</th><th>Registrata da</th><th></th></tr></thead>
          <tbody>
            {data.sales.map(s => (
              <tr key={s.id}>
                <td className="muted">{s.sale_date ? new Date(s.sale_date).toLocaleDateString('it-IT') : '—'}</td>
                <td>{s.item_name}{!s.item_id && <span className="tag" title="L'articolo originale è stato eliminato">articolo rimosso</span>}</td>
                <td className="num">{s.quantity_sold}</td>
                <td className="num up">{eur2(s.sale_price_total)}</td>
                <td className="muted">{s.created_by || '—'}</td>
                <td><button className="btn ghost sm danger" onClick={() => remove(s)}>Elimina</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>Per registrare una vendita usa il pulsante "Vendi" nell'inventario, così quantità e stato si aggiornano da soli.</p>
    </>
  )
}
