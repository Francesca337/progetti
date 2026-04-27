# Progetti — Gestione task per project manager

Webapp leggera per assegnare task ai collaboratori, suddivise per progetto, con scadenze, allegati e notifiche email. Modello mono-direzionale: tu (PM) assegni, loro vedono solo le proprie task e ne aggiornano lo stato.

## Funzionalità

- 📁 **Progetti** — crea progetti con colore, descrizione e collaboratori
- ✅ **Task** — titolo, descrizione, scadenza, priorità, stato (Da fare / In corso / In revisione / Fatte)
- 👥 **Persone** — invita collaboratori via email, ognuno riceve un link di accesso personale (no password)
- 📎 **Allegati** — file fino a 15 MB su Netlify Blobs
- 📧 **Email** — notifica automatica all'assegnazione e al completamento
- 📱 **Responsive** — funziona bene da telefono e desktop
- 🎨 **UI moderna** — Tailwind, animazioni, board kanban con drag & drop

## Stack

- **Next.js 15** (App Router, React 19, Server Components)
- **Prisma + Postgres** per i dati
- **Tailwind CSS** per la UI
- **Netlify Blobs** per i file
- **Resend** (free tier 100/giorno) per le email

## Setup locale

```bash
# 1. Installa le dipendenze
npm install

# 2. Crea il file .env
cp .env.example .env
# Modifica DATABASE_URL e ADMIN_SETUP_TOKEN

# 3. Crea le tabelle nel database
npm run db:push

# 4. Avvia in dev
npm run dev
```

Apri http://localhost:3000 e vai su `/setup` per creare il primo amministratore (usa il valore di `ADMIN_SETUP_TOKEN`).

## Deploy su Netlify

### 1. Database Postgres (gratuito)

Crea un database Postgres su uno di questi provider (free tier):

- **Neon** — https://neon.tech (consigliato, free tier generoso)
- **Supabase** — https://supabase.com
- **Railway** — https://railway.app

Copia la `DATABASE_URL` (formato `postgresql://...`).

### 2. Account Resend per le email (opzionale ma consigliato)

- Registrati su https://resend.com
- Crea una API key
- Per inviare da un dominio personalizzato, verifica un dominio. In alternativa puoi usare il mittente di test `onboarding@resend.dev`.

### 3. Deploy su Netlify

1. Pusha il codice su GitHub
2. Su Netlify → "Add new site" → "Import from Git"
3. Imposta queste **environment variables**:

   | Variabile | Valore |
   |-----------|--------|
   | `DATABASE_URL` | URL Postgres (da Neon/Supabase) |
   | `ADMIN_SETUP_TOKEN` | Stringa casuale lunga (es. `openssl rand -hex 32`) |
   | `RESEND_API_KEY` | (opzionale) API key Resend |
   | `RESEND_FROM_EMAIL` | (opzionale) es. `Progetti <noreply@tuodominio.it>` |
   | `NEXT_PUBLIC_APP_URL` | URL pubblico Netlify, es. `https://progetti.netlify.app` |

4. Build command: `npm run build` · Publish directory: `.next` (già impostati in `netlify.toml`)
5. Dopo il primo deploy, esegui le migration del database. Da locale, con `DATABASE_URL` impostato:

   ```bash
   npm run db:push
   ```

6. Apri `https://tuosito.netlify.app/setup` e crea il tuo account admin con `ADMIN_SETUP_TOKEN`.

### 4. Netlify Blobs

Gli allegati funzionano automaticamente su Netlify grazie ai Blobs (storage gestito). Non serve configurazione aggiuntiva.

## Come si usa

### Per il project manager

1. **Setup iniziale**: vai su `/setup`, inserisci `ADMIN_SETUP_TOKEN`, nome ed email → diventi admin.
2. **Crea progetti**: dalla pagina Progetti.
3. **Invita persone**: dalla pagina Persone, inserisci nome ed email. Riceveranno un link di accesso via email (o lo copi tu manualmente dalla UI).
4. **Crea task**: dentro un progetto, click su "Nuova task", scegli assegnatario, scadenza, priorità.
5. **Monitora**: la dashboard mostra le task in ritardo, in scadenza, in corso, e il carico di ogni collaboratore.

### Per i collaboratori

1. Aprono il link ricevuto via email (es. `https://progetti.netlify.app/?t=ABC123`).
2. Vedono solo le **loro** task, raggruppate per progetto.
3. Cliccano sul cerchio per spostare la task allo stato successivo, o aprono la task per vedere dettagli, scaricare allegati, caricarne di propri.
4. Quando completano una task, ti arriva un'email automatica.

## Sicurezza dei link

Ogni utente ha un token di accesso permanente nell'URL (`?t=...`). Chi possiede il link può accedere come quell'utente. Se un link viene compromesso, dalla pagina Persone puoi rigenerarlo (icona ↻): il vecchio diventa inutile.

## Struttura del codice

```
src/
├── app/                   # Pagine (App Router)
│   ├── page.tsx          # Landing / login
│   ├── setup/            # Creazione primo admin
│   ├── app/              # Area admin
│   │   ├── page.tsx      # Dashboard
│   │   ├── projects/     # Gestione progetti
│   │   ├── people/       # Gestione collaboratori
│   │   └── task/[id]/    # Dettaglio task admin
│   ├── me/               # Area collaboratore
│   │   ├── page.tsx      # Le mie task
│   │   └── task/[id]/    # Dettaglio task
│   └── api/              # API routes
├── components/           # Componenti React
└── lib/                  # Prisma, auth, email, blob, utils
```

## Personalizzazione

- **Colori UI**: edita `src/app/globals.css` (variabili CSS)
- **Email templates**: edita `src/lib/email.ts`
- **Stati delle task**: aggiungi/togli in `prisma/schema.prisma` (enum `TaskStatus`) + `src/lib/utils.ts`

## Licenza

MIT — usa, modifica, condividi liberamente.
