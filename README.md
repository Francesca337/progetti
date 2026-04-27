# Project Management App

Web app di project management con due ruoli (admin/PM e collaboratori), gestione progetti, task con allegati, backlog personale e notifiche email automatiche.

## Stack

- **Next.js 15** (App Router, React 19, Server Actions)
- **Prisma** + **PostgreSQL** (Neon free tier)
- **Tailwind CSS**
- **Resend** per le notifiche email
- **Netlify Blobs** per gli allegati (JPEG / PDF, max 15 MB)
- Deploy su **Netlify**

## Architettura in breve

- **Admin** (PM): autenticato con email + password (env), sessione cookie firmata HMAC.
- **Collaboratori**: nessuna password. Ogni collaboratore ha un `accessToken` univoco e un link personale `/c/<token>`. Il token è la sessione: viene riconvalidato a ogni richiesta e passato come campo nascosto nelle server action. Può essere rigenerato dall'admin.
- **Progetti**: ogni task appartiene a un progetto. I "Backlog personale" sono progetti speciali (`isPersonalBacklog=true`) visibili solo all'admin; le loro task non sono assegnate a nessun collaboratore.
- **Allegati**: salvati in Netlify Blobs; metadata in DB. Solo l'admin (o l'assegnatario) può scaricare.
- **Email**: alla creazione di una task con un assegnatario (o quando si cambia assegnatario), Resend invia un'email con il link personale del collaboratore.

## Struttura del codice

```
src/
├─ app/
│  ├─ page.tsx                  # landing → /admin o /login
│  ├─ login/                    # login admin (email+password)
│  ├─ logout/                   # logout admin
│  ├─ c/[token]/                # vista collaboratore (token nell'URL)
│  ├─ admin/
│  │  ├─ layout.tsx             # sidebar + auth guard
│  │  ├─ page.tsx               # dashboard (in ritardo / scadenza / in corso)
│  │  ├─ actions.ts             # server actions admin (collaboratori/progetti/task)
│  │  ├─ _components/           # TaskForm, TaskRow, NewTaskButton
│  │  ├─ collaborators/         # gestione collaboratori + pagine per-utente
│  │  ├─ projects/              # gestione progetti + dettaglio
│  │  └─ backlog/               # backlog personale del PM
│  └─ api/attachments/[id]/     # download allegati (auth admin o token collab)
├─ lib/
│  ├─ db.ts                     # Prisma client (singleton)
│  ├─ auth.ts                   # admin cookie + token validation collab
│  ├─ email.ts                  # Resend wrapper
│  ├─ storage.ts                # Netlify Blobs wrapper
│  └─ format.ts                 # helper UI (status, priority, date)
└─ prisma/schema.prisma
```

## Setup locale

1. **Clona** e installa:
   ```bash
   npm install
   ```

2. **Crea un DB** su [Neon](https://neon.tech) (free tier) e copia la connection string.

3. **Configura** `.env` (copia da `.env.example`):
   ```env
   DATABASE_URL="postgresql://..."
   ADMIN_EMAIL="tu@example.com"
   ADMIN_PASSWORD="una-password-robusta"
   SESSION_SECRET="$(openssl rand -hex 32)"
   RESEND_API_KEY="re_..."
   RESEND_FROM_EMAIL="PM <noreply@tuodominio.com>"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Sincronizza lo schema**:
   ```bash
   npm run db:push
   ```

5. **Avvia**:
   ```bash
   npm run dev
   ```
   Apri `http://localhost:3000` e accedi con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

> Per far funzionare gli allegati **in locale**, esegui l'app con la Netlify CLI (`netlify dev`) — Netlify Blobs richiede il contesto del sito.

## Deploy su Netlify

1. Crea un nuovo sito Netlify collegato al repo.
2. Build command: `npm run build` — publish dir: `.next`.
3. Aggiungi le variabili d'ambiente in **Site settings → Environment variables**:
   - `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
   - `NEXT_PUBLIC_APP_URL` (es. `https://miosito.netlify.app`)
4. Resend: verifica il dominio mittente in [resend.com/domains](https://resend.com/domains).
5. Deploy: il plugin `@netlify/plugin-nextjs` (configurato in `netlify.toml`) fa il resto.

## Funzionalità implementate

### Admin
- ✅ Dashboard con sezioni "in ritardo", "in scadenza nei prossimi 7 giorni", "in corso" + contatori per stato.
- ✅ Gestione collaboratori: aggiungi/rimuovi (nome + email), copia link personale, rigenera token.
- ✅ Pagina dedicata per ogni collaboratore con le sue task raggruppate per progetto.
- ✅ Progetti: crea, modifica, archivia, elimina.
- ✅ Task: titolo, descrizione/output atteso, deadline, priorità (Bassa/Media/Alta), stato (Da fare / In corso / In revisione / Completata).
- ✅ Allegati JPEG/PDF max 15 MB su Netlify Blobs.
- ✅ Backlog personale con sottosezioni custom (es. "Operativo", "Idee").
- ✅ Notifica email Resend al collaboratore quando gli viene assegnata una nuova task (o cambia assegnatario).

### Collaboratori
- ✅ Accesso via link personale `/c/<token>` (no password).
- ✅ Vista delle sole proprie task, raggruppate per progetto, ordinate per deadline e priorità.
- ✅ Aggiornamento dello stato direttamente dalla card.
- ✅ Caricamento di allegati con gli stessi vincoli (JPEG/PDF, 15 MB).

## Note di sicurezza

- Le password admin sono confrontate in tempo costante (`crypto.timingSafeEqual`).
- I cookie di sessione admin sono firmati HMAC-SHA256 con `SESSION_SECRET`.
- Il token collaboratore è validato server-side a ogni request; nessun cookie persistito.
- Ogni server action verifica che la risorsa appartenga all'utente prima di permettere modifiche.
- Gli allegati passano sempre dalla route protetta `/api/attachments/[id]` — nessun URL pubblico ai blob.

## Comandi utili

```bash
npm run dev          # dev server
npm run build        # prisma generate + next build
npm run start        # prod server
npm run db:push      # applica lo schema al DB
npm run db:studio    # apri Prisma Studio
```
