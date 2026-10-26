# RestPoke 3.0

Gestionale collezione carte Enrico & Alessandro. React + Vite, tutto su Cloudflare:
un Worker serve il sito (dist/) e le API (`/api/*`), i dati stanno su D1.

## Struttura
- `worker/index.js` — API: login (cookie firmato), CRUD sulle tabelle, notifiche push
- `migrations/` — schema D1 (tabelle, trigger `updated_at`, vista `item_summary`)
- `seed/data.sql` — dati esportati da Supabase (non in git)
- `src/lib/db.js` — client delle API usato dalle pagine
- `scripts/add-user.mjs` — crea/aggiorna un utente
- `scripts/smoke.sh` — verifica rapida delle API

## Sviluppo in locale
    npm install
    npm run db:migrate -- --local
    npx wrangler d1 execute restpoke --local --file=seed/data.sql
    npm run user -- <email> Enrico <password>
    npm run build
    npm run dev:api      # Worker su http://localhost:8787 (sito + API)
    npm run dev          # opzionale: Vite con hot reload, /api inoltrato al Worker

I secret locali stanno in `.dev.vars` (VAPID_PRIVATE_JWK, SESSION_SECRET).

## Primo deploy
    npx wrangler login
    npx wrangler d1 create restpoke          # copia il database_id in wrangler.toml
    npm run db:migrate -- --remote
    npx wrangler d1 execute restpoke --remote --file=seed/data.sql
    npm run user -- silvello.enrico@gmail.com Enrico <password> --remote
    npm run user -- alessandro.donaudi@gmail.com Alessandro <password> --remote
    npx wrangler secret put VAPID_PRIVATE_JWK   # valore da .dev.vars
    npx wrangler secret put SESSION_SECRET      # valore nuovo e casuale
    npm run deploy

## Note
- Per disconnettere tutti i dispositivi: cambia `SESSION_SECRET`.
- Login limitato a 5 tentativi al minuto per IP.
- Gli ID originali di Base44 sono conservati in `legacy_id`.
