import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { summarize, eur, eur2 } from '../lib/finance'
import { DataTable } from '../components/DataTable'

const fmtMonth = m => {
  const [y, mo] = m.split('-')
  return new Date(y, mo - 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
}

export default function Dashboard({ data }) {
  const s = useMemo(() => summarize(data), [data])
  const eShare = s.investedTotal ? s.invested.Enrico / s.investedTotal : 0.5
  const creditor = s.balance.Enrico > 0 ? 'Enrico' : 'Alessandro'
  const debtor = creditor === 'Enrico' ? 'Alessandro' : 'Enrico'
  const owed = Math.abs(s.balance.Enrico)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Come sta andando</h1>
          <p>{s.inStockCount} posizioni in stock · aggiornato ai prezzi di mercato inseriti</p>
        </div>
      </div>

      <section className="split" aria-label="Ripartizione investimento">
        <h2>Chi ha messo cosa</h2>
        <div className="bar">
          <div className="e" style={{ width: `${eShare * 100}%` }}>Enrico {eur(s.invested.Enrico)}</div>
          <div className="a" style={{ width: `${(1 - eShare) * 100}%` }}>{eur(s.invested.Alessandro)} Alessandro</div>
        </div>
        <div className="who-line">
          <span className="e"><i />Enrico <strong>{eur2(s.invested.Enrico)}</strong></span>
          <span className="a"><i />Alessandro <strong>{eur2(s.invested.Alessandro)}</strong></span>
        </div>
        <div className="legend">
          <span>Investito in totale <strong>{eur2(s.investedTotal)}</strong> (articoli, costi extra e raffle)</span>
          <span>Quota equa a testa <strong>{eur2(s.investedTotal / 2)}</strong></span>
        </div>
        <div className="settle">
          {owed < 1
            ? <>Siete pari.</>
            : <>{debtor} deve <b>{eur2(owed)}</b> a {creditor} per pareggiare le quote.</>}
        </div>
      </section>

      <div className="kpis">
        <div>
          <div className="label">Incassato dalle vendite</div>
          <div className="value">{eur(s.revenue)}</div>
          <div className="sub">{data.sales.length} vendite</div>
        </div>
        <div>
          <div className="label">Risultato di cassa</div>
          <div className={`value ${s.realized >= 0 ? 'up' : 'down'}`}>{eur(s.realized)}</div>
          <div className="sub">incassato meno tutto l'investito</div>
        </div>
        <div>
          <div className="label">Valore stock a mercato</div>
          <div className="value">{eur(s.stockValue)}</div>
          <div className="sub">costo {eur(s.stockCost)}</div>
        </div>
        <div>
          <div className="label">Se vendeste tutto oggi</div>
          <div className={`value ${s.equity >= 0 ? 'up' : 'down'}`}>{eur(s.equity)}</div>
          <div className="sub">di cui latente {eur(s.unrealized)}</div>
        </div>
      </div>

      <div className="charts">
        <div className="panel">
          <h2>Investito e incassato per mese</h2>
          <p className="hint">Il "Resoconto pre 17/04/2026" cade su gennaio 2025.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={s.byMonth} barGap={2}>
              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${Math.round(v)}€`} width={52} />
              <Tooltip formatter={v => eur2(v)} labelFormatter={fmtMonth} />
              <Legend />
              <Bar dataKey="investito" name="Investito" fill="#5B6675" radius={[3, 3, 0, 0]} />
              <Bar dataKey="incassato" name="Incassato" fill="#1E9E5A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h2>Stock per categoria</h2>
          <p className="hint">Valore a mercato contro costo sostenuto.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={s.byCategory} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => eur2(v)} />
              <Bar dataKey="cost" name="Costo" fill="#D9DEE6" radius={3} />
              <Bar dataKey="value" name="Valore" radius={3}>
                {s.byCategory.map(c => <Cell key={c.name} fill={c.value >= c.cost ? '#1E9E5A' : '#D64545'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <h2>Posizioni con più margine latente</h2>
        <DataTable
          rowKey={i => i.id}
          rows={s.topGains.slice(0, 8)}
          empty="Nessuna posizione con prezzo di mercato."
          columns={[
            { key: 'name', label: 'Articolo', primary: true, render: i => i.name },
            { key: 'cat', label: 'Categoria', render: i => <span className="muted">{i.category || '—'}</span> },
            { key: 'qty', label: 'Qtà', num: true, render: i => i.quantity },
            { key: 'cost', label: 'Costo', num: true, render: i => eur2(i.total_cost) },
            { key: 'mkt', label: 'Mercato', num: true, render: i => eur2(i.market_price * i.quantity) },
            { key: 'gain', label: 'Margine', num: true, cls: i => (i.gain >= 0 ? 'up' : 'down'), render: i => eur2(i.gain) },
          ]}
        />
      </div>
    </>
  )
}
