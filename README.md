# ladok_prototyp

Prototyp till examinationsuppgift 3 i D0031N (Enterprise Architecture och SOA, LTU).
En lärare väljer kurs, uppgift och modul, ser studenternas omdömen från Canvas
och för över betyg till Ladok genom tre REST-tjänster.

## Systemen

| System     | Tjänst                 | Anrop                                                         | Tabell               |
| ---------- | ---------------------- | ------------------------------------------------------------- | -------------------- |
| Epok       | get_Modul              | `GET /rest/v1/rpc/get_modul?p_kurskod=D0031N`                 | `modules`            |
| StudentITS | get_Persnummer         | `GET /rest/v1/rpc/get_persnummer?p_username=sveedz-4`         | `students`           |
| Ladok      | reg_Resultat           | `POST /rest/v1/rpc/reg_resultat`                              | `ladok_results`      |
| Ladok      | get_Resultat (tillägg) | `GET /rest/v1/rpc/get_resultat?p_kurskod=D0031N&p_modul=0005` | `ladok_results`      |
| Canvas     | läser sin egen tabell  | `GET /rest/v1/canvas_submissions`                             | `canvas_submissions` |

Tjänsterna är funktioner i databasen (Supabase) och svarar med JSON.
Tabellerna för Epok, StudentITS och Ladok går bara att nå genom sin tjänst.

## Mappar

- `supabase/schema.sql`: tabeller, testdata och tjänster.
- `result_canvas_gui/`: webbsidan (Resultat Canvas GUI).
  - `src/services/`: en fil per system och `orchestrator.ts` som knyter ihop dem.
  - `src/routes/index.tsx`: själva sidan.

## Köra lokalt

Kräver Node 22.12 eller senare.

1. Gå till webbmappen: `cd result_canvas_gui`
2. Kopiera `.env.example` till `.env` och fyll i projektets adress och publika nyckel.
   Båda finns i Supabase under projektets inställningar. Använd aldrig service_role-nyckeln.
3. Installera: `npm install`
4. Starta: `npm run dev` och öppna http://localhost:8080

Har du en äldre Node går det att köra utan att byta version:

```sh
npx -y -p node@22 -- npm install
npx -y -p node@22 -- npm run dev
```

## Egen databas

Skapa ett projekt i Supabase och kör hela `supabase/schema.sql` i SQL Editor.
Filen går att köra flera gånger.

## Test

```sh
npm test
```
