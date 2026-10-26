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

const Brand = () => (
  <div className="brand"><img src="/icons/logo.webp" alt="" className="brand-logo" /><span>Rest<b>Poke</b></span></div>
)

const Avatar = ({ owner }) => <span className={`avatar ${owner === 'Alessandro' ? 'a' : 'e'}`} aria-hidden="true">{owner?.[0]}</span>

// Riga del menu account: attiva/disattiva le notifiche su questo dispositivo.
function PushRow() {
  const [on, setOn] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  useEffect(() => { currentSubscription().then(s => setOn(!!s)).catch(() => setOn(false)) }, [])
  if (!pushSupported()) return null
  const toggle = async () => {
    setBusy(true); setMsg(null)
    try {
      if (on) { await disablePush(); setOn(false) }
      else if (isIosBrowserNotInstalled()) setMsg('Su iPhone le notifiche funzionano solo dopo aver aggiunto RestPoke alla schermata Home (Condividi → Aggiungi a Home) e averla aperta da lì.')
      else { await enablePush(); setOn(true) }
    } catch (e) { setMsg(e.message) }
    finally { setBusy(false) }
  }
  return (
    <>
      <button className="menu-row" onClick={toggle} disabled={busy || on === null} role="switch" aria-checked={!!on}>
        <Icons.bell width={20} height={20} />
        <span>Notifiche su questo dispositivo</span>
        <i className={`switch ${on ? 'on' : ''}`} />
      </button>
      {msg && <p className="menu-note">{msg}</p>}
    </>
  )
}

function PasswordForm({ onDone }) {
  const [done, setDone] = useState(false)
  const submit = async ({ current, next, confirm }) => {
    if (next !== confirm) throw new Error('Le due password nuove non coincidono.')
    await auth.changePassword(current, next)
    setDone(true)
  }
  if (done) return (
    <>
      <p className="menu-note ok">Password aggiornata. Dal prossimo accesso usa quella nuova.</p>
      <div className="form"><div className="actions"><button className="btn" onClick={onDone}>Fatto</button></div></div>
    </>
  )
  return (
    <Form submitLabel="Aggiorna password" onSubmit={submit} onCancel={onDone} fields={[
      { name: 'current', label: 'Password attuale', type: 'password', required: true, full: true },
      { name: 'next', label: 'Nuova password (almeno 8 caratteri)', type: 'password', required: true, full: true },
      { name: 'confirm', label: 'Ripeti la nuova password', type: 'password', required: true, full: true },
    ]} />
  )
}

// Menu account: unico punto per notifiche, password e uscita (desktop e telefono).
function AccountSheet({ session, onLogout, onClose }) {
  const [pw, setPw] = useState(false)
  return (
    <Modal title={pw ? 'Cambia password' : 'Account'} onClose={onClose}>
      {pw ? <PasswordForm onDone={() => setPw(false)} /> : (
        <>
          <div className="account-head">
            <Avatar owner={session.owner} />
            <div><strong>{session.owner}</strong><div className="muted">{session.email}</div></div>
          </div>
          <div className="menu-list">
            <PushRow />
            <button className="menu-row" onClick={() => setPw(true)}>
              <Icons.key width={20} height={20} /><span>Cambia password</span><Icons.chevronRight width={18} height={18} />
            </button>
            <button className="menu-row danger" onClick={onLogout}>
              <Icons.logout width={20} height={20} /><span>Esci</span>
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

// Su telefono la tab bar mostra le prime 4 pagine; le altre stanno in "Altro".
const TAB_PAGES = 4

function MoreSheet({ page, onPick, onClose }) {
  return (
    <Modal title="Altro" onClose={onClose}>
      <div className="menu-list">
        {PAGES.slice(TAB_PAGES).map(([id, label, Icon]) => (
          <button key={id} className={`menu-row ${page === id ? 'current' : ''}`} onClick={() => onPick(id)}>
            <Icon width={20} height={20} /><span>{label}</span><Icons.chevronRight width={18} height={18} />
          </button>
        ))}
      </div>
    </Modal>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('dashboard')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [sheet, setSheet] = useState(null) // 'account' | 'more'

  useEffect(() => {
    auth.me().then(setSession)
  }, [])
  const logout = () => auth.logout().finally(() => { setSheet(null); setSession(null); setData(null) })
  const go = id => { setPage(id); setSheet(null); window.scrollTo(0, 0) }

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
  const inMore = PAGES.slice(TAB_PAGES).some(([id]) => id === page)

  return (
    <div className="app">
      <nav className="nav">
        <Brand />
        {PAGES.map(([id, label, Icon]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}>
            <Icon width={18} height={18} /> {label}
          </button>
        ))}
        <div className="spacer" />
        <button className="account-btn" onClick={() => setSheet('account')}>
          <Avatar owner={session.owner} />
          <span><strong>{session.owner}</strong><small>Account e notifiche</small></span>
        </button>
      </nav>

      <header className="topbar">
        <Brand />
        <button className="account-btn" onClick={() => setSheet('account')} aria-label="Account, notifiche ed esci">
          <Avatar owner={session.owner} />
        </button>
      </header>

      <main className="main">
        {error && <div className="error">Errore nel caricamento: {error}</div>}
        {!data && !error && <div className="empty">Caricamento…</div>}
        {views[page]}
      </main>

      <nav className="tabbar">
        {PAGES.slice(0, TAB_PAGES).map(([id, label, Icon]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
        <button className={inMore ? 'active' : ''} onClick={() => setSheet('more')}>
          <Icons.more />
          <span>{inMore ? PAGES.find(([id]) => id === page)[1] : 'Altro'}</span>
        </button>
      </nav>

      {sheet === 'account' && <AccountSheet session={session} onLogout={logout} onClose={() => setSheet(null)} />}
      {sheet === 'more' && <MoreSheet page={page} onPick={go} onClose={() => setSheet(null)} />}
    </div>
  )
}

