import { useEffect, useState, useCallback } from 'react'
import { auth, loadAll } from './lib/db'
import { Icons } from './components/icons'
import { Modal, Form } from './components/ui'
import { pushSupported, currentSubscription, enablePush, disablePush, isIosBrowserNotInstalled } from './lib/push'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Raffles from './pages/Raffles'
import Openings from './pages/Openings'
import Personal from './pages/Personal'
import Options from './pages/Options'

const PAGES = [
  ['dashboard', 'Dashboard', Icons.dashboard],
  ['inventory', 'Inventario', Icons.inventory],
  ['sales', 'Vendite', Icons.sales],
  ['openings', 'Sbusti', Icons.openings],
  ['raffles', 'Raffle', Icons.raffles],
  ['personal', 'Personale', Icons.personal],
  ['options', 'Opzioni', Icons.options],
]

function Auth({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr(null)
    try { onLogin(await auth.login(email, pw)) }
    catch (e) { setErr(e.message) }
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

// Pulsante notifiche: attiva/disattiva le push su questo dispositivo.
function PushBell({ compact }) {
  const [on, setOn] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { currentSubscription().then(s => setOn(!!s)).catch(() => setOn(false)) }, [])
  if (!pushSupported()) return null
  const toggle = async () => {
    setBusy(true)
    try {
      if (on) { await disablePush(); setOn(false) }
      else {
        if (isIosBrowserNotInstalled()) { alert("Su iPhone le notifiche funzionano solo dopo aver aggiunto RestPoke alla schermata Home (Condividi → Aggiungi a Home) e averla aperta da lì."); return }
        await enablePush(); setOn(true)
      }
    } catch (e) { alert(e.message) }
    finally { setBusy(false) }
  }
  const label = on ? 'Notifiche attive' : 'Attiva notifiche'
  return (
    <button className={compact ? 'bell' : ''} onClick={toggle} disabled={busy || on === null} title={label} aria-label={label}>
      <Icons.bell width={18} height={18} /> {!compact && label}
      {compact && on && <i className="dot" />}
    </button>
  )
}

function PasswordModal({ onClose }) {
  const submit = async ({ current, next, confirm }) => {
    if (next !== confirm) throw new Error('Le due password nuove non coincidono.')
    await auth.changePassword(current, next)
    alert('Password aggiornata.'); onClose()
  }
  return (
    <Modal title="Cambia password" onClose={onClose}>
      <Form submitLabel="Aggiorna" onSubmit={submit} onCancel={onClose} fields={[
        { name: 'current', label: 'Password attuale', type: 'password', required: true, full: true },
        { name: 'next', label: 'Nuova password (min. 8 caratteri)', type: 'password', required: true, full: true },
        { name: 'confirm', label: 'Ripeti la nuova password', type: 'password', required: true, full: true },
      ]} />
    </Modal>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('dashboard')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [pwOpen, setPwOpen] = useState(false)

  useEffect(() => {
    auth.me().then(setSession)
  }, [])
  const logout = () => auth.logout().finally(() => { setSession(null); setData(null) })

  const refresh = useCallback(async () => {
    try { setData(await loadAll()); setError(null) }
    catch (e) { setError(e.message); if (e.message === 'non autenticato') setSession(null) }
  }, [])

  useEffect(() => { if (session) refresh() }, [session, refresh])

  if (session === undefined) return null
  if (!session) return <Auth onLogin={setSession} />

  const props = { data, refresh }
  const views = data ? {
    dashboard: <Dashboard {...props} />,
    inventory: <Inventory {...props} />,
    sales: <Sales {...props} />,
    openings: <Openings {...props} />,
    raffles: <Raffles {...props} />,
    personal: <Personal {...props} session={session} />,
    options: <Options {...props} />,
  } : {}

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand"><img src="/icons/logo.webp" alt="" className="brand-logo" />Rest<span>Poke</span></div>
        {PAGES.map(([id, label, Icon]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
            <Icon width={18} height={18} /> {label}
          </button>
        ))}
        <div className="spacer" />
        <div className="user">{session.email}</div>
        <PushBell />
        <button onClick={() => setPwOpen(true)}>Cambia password</button>
        <button onClick={logout}>Esci</button>
      </nav>

      <header className="topbar">
        <div className="brand"><img src="/icons/logo.webp" alt="" className="brand-logo" />Rest<span>Poke</span></div>
        <div className="topbar-actions">
          <PushBell compact />
          <button className="logout" onClick={() => setPwOpen(true)}>Password</button>
          <button className="logout" onClick={logout}>Esci</button>
        </div>
      </header>
      {pwOpen && <PasswordModal onClose={() => setPwOpen(false)} />}

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
