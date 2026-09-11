import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function FilterBar({ page, spec, value, onChange, saved = [], refresh }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => onChange({ ...value, [k]: v })
  const clear = () => onChange({})
  const activeCount = Object.entries(value).filter(([, v]) => v && (Array.isArray(v) ? v.length : true)).length
  const mine = saved.filter(f => f.page === page)

  const saveCurrent = async () => {
    const name = prompt('Nome del filtro salvato:')
    if (!name) return
    setSaving(true)
    await supabase.from('saved_filters').insert({ page, name, filters: value })
    setSaving(false); refresh()
  }
  const applySaved = id => { const f = mine.find(x => x.id === id); if (f) { onChange(f.filters || {}); setOpen(true) } }
  const delSaved = async id => { if (confirm('Eliminare questo filtro salvato?')) { await supabase.from('saved_filters').delete().eq('id', id); refresh() } }

  const search = spec.find(f => f.type === 'search')
  const selects = spec.filter(f => f.type === 'select')

  return (
    <div className="filterbar">
      <div className="filter-top">
        {search && (
          <input className="filter-search" type="search" placeholder={search.placeholder || 'Cerca'}
                 value={value[search.key] || ''} onChange={e => set(search.key, e.target.value)} />
        )}
        <button className={`btn ghost filter-toggle ${activeCount ? 'has' : ''}`} onClick={() => setOpen(o => !o)}>
          Filtri{activeCount ? ` · ${activeCount}` : ''} {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div className="filter-panel">
          <div className="filter-grid">
            {selects.map(f => (
              <label className="flt" key={f.key}>
                <span>{f.label}</span>
                <select value={value[f.key] || ''} onChange={e => set(f.key, e.target.value)}>
                  <option value="">Tutte</option>
                  {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="filter-buttons">
            {activeCount > 0 && <button className="btn ghost sm" onClick={clear}>Azzera</button>}
            {activeCount > 0 && <button className="btn sm" onClick={saveCurrent} disabled={saving}>Salva questo filtro</button>}
          </div>
        </div>
      )}

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
