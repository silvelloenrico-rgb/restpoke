import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Barra filtri riutilizzabile con salvataggio.
// spec: [{ key, label, type:'search'|'select'|'multi', options?, placeholder? }]
// value: oggetto { key: valore }  · onChange(nuovoValore)
// page: nome pagina per i filtri salvati · saved: righe di saved_filters · refresh
export function FilterBar({ page, spec, value, onChange, saved = [], refresh }) {
  const [saving, setSaving] = useState(false)
  const set = (k, v) => onChange({ ...value, [k]: v })
  const clear = () => onChange({})
  const active = Object.values(value).some(v => v && (Array.isArray(v) ? v.length : true))
  const mine = saved.filter(f => f.page === page)

  const saveCurrent = async () => {
    const name = prompt('Nome del filtro salvato:')
    if (!name) return
    setSaving(true)
    await supabase.from('saved_filters').insert({ page, name, filters: value })
    setSaving(false); refresh()
  }
  const applySaved = id => { const f = mine.find(x => x.id === id); if (f) onChange(f.filters || {}) }
  const delSaved = async id => { if (confirm('Eliminare questo filtro salvato?')) { await supabase.from('saved_filters').delete().eq('id', id); refresh() } }

  return (
    <div className="filterbar">
      <div className="toolbar">
        {spec.map(f => {
          if (f.type === 'search') return <input key={f.key} type="search" placeholder={f.placeholder || 'Cerca'} value={value[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
          if (f.type === 'select') return (
            <select key={f.key} value={value[f.key] || ''} onChange={e => set(f.key, e.target.value)}>
              <option value="">{f.label}: tutti</option>
              {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )
          return null
        })}
        {active && <button className="btn ghost sm" onClick={clear}>Azzera</button>}
        {active && <button className="btn ghost sm" onClick={saveCurrent} disabled={saving}>Salva filtro</button>}
      </div>
      {mine.length > 0 && (
        <div className="saved-chips">
          {mine.map(f => (
            <span className="chip" key={f.id}>
              <button onClick={() => applySaved(f.id)}>{f.name}</button>
              <button className="x" onClick={() => delSaved(f.id)} aria-label="Elimina filtro">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
