import { Modal, Status, Who } from './ui'
import { eur2 } from '../lib/finance'

// Pannello dettaglio: mostra tutti i campi di un articolo e tutte le azioni possibili.
// onAction(type) apre i vari modali (edit/sell/cost/open). actions = lista di {type,label}.
export function ItemDetail({ item, extra = {}, actions = [], onAction, onClose, title = 'Dettaglio articolo' }) {
  const rows = [
    ['Categoria', item.category],
    ['Stato', <Status value={item.status} key="s" />],
    ['Quantità', item.quantity],
    ['Lingua', item.language],
    ['Set / Espansione', item.card_set],
    ['Anno', item.year],
    ['Casa di gradazione', item.grader],
    ['Prezzo di mercato', item.market_price != null ? eur2(item.market_price) : null],
    ['Data acquisto', item.purchase_date],
    ['Data vendita', item.sale_date],
    ...(extra.rows || []),
  ].filter(([, v]) => v !== null && v !== undefined && v !== '')

  return (
    <Modal title={title} onClose={onClose}>
      <div className="detail-head">
        <h2 style={{ marginBottom: 4 }}>{item.name}</h2>
        {extra.subtitle}
      </div>

      <dl className="detail-grid">
        {rows.map(([k, v], idx) => (
          <div key={idx}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>

      {item.tags?.length > 0 && <div style={{ margin: '6px 0 14px' }}>{item.tags.map(t => <span className="tag" key={t}>{t}</span>)}</div>}

      {extra.body}

      {actions.length > 0 && (
        <div className="detail-actions">
          {actions.map(a => (
            <button key={a.type} className={`btn ${a.primary ? '' : 'ghost'} ${a.danger ? 'danger' : ''}`} onClick={() => onAction(a.type)}>{a.label}</button>
          ))}
        </div>
      )}
    </Modal>
  )
}
