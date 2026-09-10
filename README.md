# RestPoke 2.0

Gestionale collezione carte Enrico & Alessandro. React + Vite, dati su Supabase, hosting su Cloudflare Pages.

## 1. Utenti (una volta sola)
Supabase → progetto "RestPoke" → Authentication → Users → "Add user" → crea i due account
(email + password) per Enrico e Alessandro. Le tabelle sono accessibili solo da utenti autenticati.

## 2. Avvio in locale
    npm install
    npm run dev

Il file `.env` contiene già URL e chiave pubblica di Supabase.

## 3. Deploy su Cloudflare Pages

### Opzione A — da riga di comando (rapida)
    npm install -g wrangler
    wrangler login
    npm run deploy
La prima volta wrangler chiede di creare il progetto "restpoke": conferma.
L'app sarà su https://restpoke.pages.dev

### Opzione B — collegando GitHub (deploy automatico a ogni push)
1. Carica questa cartella su un repo GitHub.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Seleziona il repo e imposta:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
4. In "Environment variables" aggiungi le due variabili del file `.env`
   (VITE_SUPABASE_URL e VITE_SUPABASE_KEY). Servono al momento del build.
5. Save and Deploy.

## Struttura dati (Supabase, progetto "RestPoke")
- items — articoli della società (costi divisi Enrico/Alessandro, prezzo di mercato, stato, tag)
- item_costs — costi extra per articolo (spedizioni, gradazioni) con chi ha pagato
- sales — vendite (collegate all'articolo)
- raffles — raffle
- personal_items — collezioni personali, campo `owner`
- item_summary — vista con costo totale (base + extra) e incasso per articolo, usata dalla dashboard

Gli ID originali di Base44 sono conservati in `legacy_id`.
