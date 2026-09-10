import { useEffect, useState, useCallback } from 'react'
import { supabase, loadAll } from './lib/supabase'
import { Icons } from './components/icons'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Raffles from './pages/Raffles'
import Openings from './pages/Openings'
import Personal from './pages/Personal'

const PAGES = [
  ['dashboard', 'Dashboard', Icons.dashboard],
  ['inventory', 'Inventario', Icons.inventory],
  ['sales', 'Vendite', Icons.sales],
  ['openings', 'Sbusti', Icons.openings],
  ['raffles', 'Raffle', Icons.raffles],
  ['personal', 'Personale', Icons.personal],
]

function Auth() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) setErr('Email o password non corrette.')
    setBusy(false)
  }
  return (
    <div className="auth">
      <div className="box">
        <h1>Rest<span>Poke</span></h1>
        <p>Gestionale collezione Enrico &amp; Alessandro</p>
        <form onSubmit={submit}>
          <input type="email" inputMode="email" autoComplete="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" autoComplete="current-password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} required />
          {err && <div className="error">{err}</div>}
          <button className="btn" disabled={busy}>{busy ? 'Accesso…' : 'Accedi'}</button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('dashboard')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const refresh = useCallback(async () => {
    try { setData(await loadAll()); setError(null) }
    catch (e) { setError(e.message) }
  }, [])

  useEffect(() => { if (session) refresh() }, [session, refresh])

  if (session === undefined) return null
  if (!session) return <Auth />

  const props = { data, refresh }
  const views = data ? {
    dashboard: <Dashboard {...props} />,
    inventory: <Inventory {...props} />,
    sales: <Sales {...props} />,
    openings: <Openings {...props} />,
    raffles: <Raffles {...props} />,
    personal: <Personal {...props} session={session} />,
  } : {}

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand">Rest<span>Poke</span></div>
        {PAGES.map(([id, label, Icon]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
            <Icon width={18} height={18} /> {label}
          </button>
        ))}
        <div className="spacer" />
        <div className="user">{session.user.email}</div>
        <button onClick={() => supabase.auth.signOut()}>Esci</button>
      </nav>

      <header className="topbar">
        <div className="brand">Rest<span>Poke</span></div>
        <button className="logout" onClick={() => supabase.auth.signOut()}>Esci</button>
      </header>

      <main className="main">
        {error && <div className="error">Errore nel caricamento: {error}</div>}
        {!data && !error && <div className="empty">Caricamento…</div>}
        {views[page]}
      </main>

      <nav className="tabbar">
        {PAGES.map(([id, label, Icon]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
