import { Icons } from './icons'

// Tabella responsive: su desktop è una tabella normale, su telefono ogni riga
// diventa una scheda con "etichetta: valore" (le etichette arrivano dagli header).
// columns: [{ key, label, render(row), num, primary, actions }]
//  - primary: colonna principale, mostrata come titolo della scheda
//  - actions: colonna di pulsanti, mostrata in fondo alla scheda
// onRowClick: rende la riga cliccabile (con freccia ›), come nell'inventario.
export function DataTable({ columns, rows, rowKey, empty = 'Nessun elemento.', onRowClick }) {
  if (onRowClick) columns = [...columns, { key: '_go', label: '', cls: () => 'go', render: () => <Icons.chevronRight width={16} height={16} /> }]
  return (
    <div className="table-wrap">
      <table className={`stack ${onRowClick ? 'clickable' : ''}`}>
        <thead>
          <tr>{columns.map(c => <th key={c.key} className={c.num ? 'num' : ''}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={rowKey(r)} onClick={onRowClick && (() => onRowClick(r))}>
              {columns.map(c => (
                <td
                  key={c.key}
                  data-label={c.label}
                  className={[c.num ? 'num' : '', c.primary ? 'primary' : '', c.actions ? 'actions' : '', c.cls ? c.cls(r) : ''].filter(Boolean).join(' ')}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr className="empty-row"><td colSpan={columns.length} className="empty">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
