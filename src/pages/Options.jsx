import { useState } from 'react'
import { supabase, OPTION_KINDS } from '../lib/supabase'

export default function Options({ data, refresh }) {
  const [kind, setKind] = useState('category')
  const [nuovo, setNuovo] = useState('')
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState(null) // {id, value}

  const rows = data.options.filter(o => o.kind === kind)
  const current = OPTION_KINDS.find(k => k.kind === kind)

  const add = async e => {
    e.preventDefault()
    const value = nuovo.trim(); if (!value) return
    setBusy(true)
    const { error } = await supabase.from('options').insert({ kind, value, sort: rows.length + 1 })
    setBusy(false)
    if (error) { alert(error.message.includes('duplicate') ? 'Esiste già.' : error.message); return }
    setNuovo(''); refresh()
  }
  const saveEdit = async () => {
    const value = edit.value.trim(); if (!value) return
    const { error } = await supabase.from('options').update({ value }).eq('id', edit.id)
    if (error) { alert(error.message); return }
    setEdit(null); refresh()
  }
  const del = async o => {
    if (!confirm(`Eliminare "${o.value}" da ${current.label.toLowerCase()}? Gli articoli che lo usano non cambiano.`)) return
    await supabase.from('options').delete().eq('id', o.id); refresh()
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Opzioni</h1><p>Gestisci le liste usate nei menu: aggiungi, rinomina o elimina le voci.</p></div>
      </div>

      <div className="opt-tabs">
        {OPTION_KINDS.map(k => (
          <button key={k.kind} className={`btn ${kind === k.kind ? '' : 'ghost'} sm`} onClick={() => { setKind(k.kind); setEdit(null) }}>{k.label}</button>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <form className="opt-add" onSubmit={add}>
          <input placeholder={`Nuova voce in ${current.label.toLowerCase()}`} value={nuovo} onChange={e => setNuovo(e.target.value)} />
          <button className="btn" disabled={busy}>Aggiungi</button>
        </form>

        <ul className="opt-list">
          {rows.map(o => (
            <li key={o.id}>
              {edit?.id === o.id ? (
                <>
                  <input value={edit.value} onChange={e => setEdit({ ...edit, value: e.target.value })} autoFocus
                         onKeyDown={e => e.key === 'Enter' && saveEdit()} />
                  <span className="opt-actions">
                    <button className="btn sm" onClick={saveEdit}>Salva</button>
                    <button className="btn ghost sm" onClick={() => setEdit(null)}>Annulla</button>
                  </span>
                </>
              ) : (
                <>
                  <span className="opt-val">{o.value}</span>
                  <span className="opt-actions">
                    <button className="btn ghost sm" onClick={() => setEdit({ id: o.id, value: o.value })}>Rinomina</button>
                    <button className="btn ghost sm danger" onClick={() => del(o)}>Elimina</button>
                  </span>
                </>
              )}
            </li>
          ))}
          {rows.length === 0 && <li className="empty">Nessuna voce. Aggiungine una qui sopra.</li>}
        </ul>
      </div>
    </>
  )
}
