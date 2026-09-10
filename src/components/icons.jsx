// Icone minime per la navigazione (nessuna dipendenza esterna).
const s = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const Icons = {
  dashboard: p => <svg {...s} {...p}><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="13" y="10" width="8" height="11" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /></svg>,
  inventory: p => <svg {...s} {...p}><path d="M3 7l9-4 9 4-9 4-9-4Z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></svg>,
  sales: p => <svg {...s} {...p}><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg>,
  openings: p => <svg {...s} {...p}><path d="M3 7h18l-1 5H4L3 7Z" /><path d="M5 12v8h14v-8" /><path d="M12 3v4" /></svg>,
  raffles: p => <svg {...s} {...p}><path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 8v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-8Z" /><path d="M12 5v14" strokeDasharray="2 3" /></svg>,
  personal: p => <svg {...s} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
}
