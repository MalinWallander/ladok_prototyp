# ladok_prototyp

Prototyp till examinationsuppgift 3 i D0031N (Enterprise Architecture och SOA, LTU).
En lärare väljer kurs, uppgift och modul, ser studenternas omdömen från Canvas
och för över betyg till Ladok genom tre REST-tjänster.

Grupp: Isak Lind, Klara Åström Huss, Malin Reimann Wallander

## Systemen

| System     | Tjänst                 | Anrop                                                         | Tabell               |
| ---------- | ---------------------- | ------------------------------------------------------------- | -------------------- |
| Epok       | get_Modul              | `GET /rest/v1/rpc/get_modul?p_kurskod=D0031N`                 | `modules`            |
| StudentITS | get_Persnummer         | `GET /rest/v1/rpc/get_persnummer?p_username=sveedz-4`         | `students`           |
| Ladok      | reg_Resultat           | `POST /rest/v1/rpc/reg_resultat`                              | `ladok_results`      |
| Ladok      | get_Resultat (tillägg) | `GET /rest/v1/rpc/get_resultat?p_kurskod=D0031N&p_modul=0005` | `ladok_results`      |
| Canvas     | läser sin egen tabell  | `GET /rest/v1/canvas_submissions`                             | `canvas_submissions` |

Tjänsterna är funktioner i databasen (Supabase) och svarar med JSON.
Tabellerna för Epok, StudentITS och Ladok har inga öppna läs- eller skrivregler,
så de går bara att nå genom sin tjänst. `get_Resultat` är ett tillägg som gör att
sidan kan visa befintlig status (utkast, klarmarkerad, attesterad) innan registrering.

### Exempel: reg_Resultat

```json
POST /rest/v1/rpc/reg_resultat
{
  "p_personnummer": "19980412-1234",
  "p_kurskod": "D0031N",
  "p_modul": "0005",
  "p_datum": "2026-11-10",
  "p_betyg": "G",
  "p_status": "Utkast"
}
```

Svaret har alltid ett `status`-fält:

- `registrerad`: resultatet sparades (ett befintligt utkast skrivs över).
- `hinder`: resultatet är redan klarmarkerat eller attesterat och kan inte ändras.
- `fel`: ogiltigt betyg, datum i framtiden eller okänd status.

## Mappar

- `supabase/schema.sql`: tabeller, testdata, behörigheter och tjänster.
- `result_canvas_gui/`: webbsidan (Resultat Canvas GUI).
  - `src/services/`: en fil per system och `orchestrator.ts` som knyter ihop dem.
  - `src/routes/index.tsx`: själva sidan.

## Köra lokalt

Kräver Node 22 (se `result_canvas_gui/.nvmrc`).

1. Gå till webbmappen: `cd result_canvas_gui`
2. Skapa filen `.env` med följande innehåll:

   ```
   VITE_SUPABASE_URL=https://sifyyfikeddchsajbsio.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZnl5ZmlrZWRkY2hzYWpic2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5NzMyMDQsImV4cCI6MjEwOTU0OTIwNH0.hhP66RaAkULuEfNNgZqU1Ke75MLQWeriHqf_AUu1UsY
   ```

   Nyckeln är projektets publika nyckel. Använd aldrig service_role-nyckeln.

3. Installera: `npm install`
4. Starta: `npm run dev` och öppna http://localhost:8080

Har du en annan Node-version går det att köra utan att byta:

```sh
npx -y -p node@22 -- npm install
npx -y -p node@22 -- npm run dev
```

## Egen databas

Om projektet ovan inte svarar (Supabase pausar inaktiva gratisprojekt):
skapa ett eget projekt i Supabase, kör hela `supabase/schema.sql` i SQL Editor
och använd det projektets adress och publika nyckel i `.env`.
Filen går att köra flera gånger.

## Test

```sh
cd result_canvas_gui
npm test
```
