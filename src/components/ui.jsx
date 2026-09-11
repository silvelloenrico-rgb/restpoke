import { useState } from 'react'

export function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

// Pallini blu/ambra: chi ha pagato.
export function Who({ enrico, alessandro }) {
  return (
    <span className="who" title={`Enrico ${enrico || 0} · Alessandro ${alessandro || 0}`}>
      {Number(enrico) > 0 && <i className="e" />}
      {Number(alessandro) > 0 && <i className="a" />}
    </span>
  )
}

export function Status({ value }) {
  return <span className={`status ${value.replace(' ', '.')}`}>{value}</span>
}

// Form generico: fields = [{name,label,type,options,full,who}]
export function Form({ fields, initial = {}, onSubmit, onCancel, submitLabel = 'Salva', onDelete, onChange }) {
  const [v, setV] = useState(() => {
    const o = {}
    for (const f of fields) o[f.name] = initial[f.name] ?? f.default ?? ''
    return o
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, val) => setV(s => { const next = { ...s, [k]: val }; onChange?.(next); return next })
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr(null)
    const out = {}
    for (const f of fields) {
      let val = v[f.name]
      if (f.type === 'number') val = val === '' ? null : Number(val)
      if (f.type === 'date' && val === '') val = null
      if (f.type === 'tags') val = String(val).split(',').map(t => t.trim()).filter(Boolean)
      if (f.type === 'select' && val === '') val = null
      out[f.name] = val
    }
    try { await onSubmit(out) } catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <form className="form" onSubmit={submit}>
      {fields.map(f => (
        <label key={f.name} className={`${f.full ? 'full' : ''} ${f.who ? 'who-input ' + f.who : ''}`}>
          {f.label}
          {f.type === 'select'
            ? <select value={v[f.name] ?? ''} onChange={e => set(f.name, e.target.value)} required={f.required}>
                {!f.required && <option value="">—</option>}
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            : <input type={f.type === 'tags' ? 'text' : f.type || 'text'} step={f.type === 'number' ? 'any' : undefined}
                value={Array.isArray(v[f.name]) ? v[f.name].join(', ') : v[f.name] ?? ''}
                onChange={e => set(f.name, e.target.value)} required={f.required} placeholder={f.placeholder} />}
        </label>
      ))}
      {err && <div className="error full">{err}</div>}
      <div className="actions">
        {onDelete && <button type="button" className="btn ghost danger" onClick={onDelete}>Elimina</button>}
        <button type="button" className="btn ghost" onClick={onCancel}>Annulla</button>
        <button className="btn" disabled={busy}>{submitLabel}</button>
      </div>
    </form>
  )
}
