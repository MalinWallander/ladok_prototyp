-- =====================================================================
-- EA-3 Registrera studieresultat – komplett backend i Supabase
-- Kör HELA filen i SQL Editor. Går att köra flera gånger.
--
-- Arkitekturprincip:
--   Canvas      -> läser sin egen tabell (canvas_submissions) direkt
--   Epok        -> nås ENDAST via get_modul
--   StudentITS  -> nås ENDAST via get_persnummer
--   Ladok       -> nås ENDAST via get_resultat och reg_resultat
-- =====================================================================


-- ---------- 1. Tabeller (skapas bara om de saknas) ----------

create table if not exists modules (           -- Epok
  id          bigint generated always as identity primary key,
  course_code text not null,
  module_code text not null,
  module_name text not null
);

create table if not exists students (          -- StudentITS
  id               bigint generated always as identity primary key,
  student_username text not null unique,
  first_name       text not null,
  last_name        text not null,
  personnummer     text not null unique
);

create table if not exists canvas_submissions (  -- Canvas
  id               bigint generated always as identity primary key,
  student_username text not null,
  course_code      text not null,
  assignment_name  text not null,
  grade            text,
  submission_date  date
);

create table if not exists ladok_results (     -- Ladok
  id           bigint generated always as identity primary key,
  personnummer text not null,
  kurskod      text not null,
  modul        text not null,
  datum        date,
  betyg        text,
  status       text
);

alter table modules add column if not exists hp numeric;
alter table modules add column if not exists aktiv boolean not null default true;

-- Ett resultat per student/kurs/modul (gör att utkast kan skrivas över)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ladok_results_unik') then
    delete from ladok_results;   -- rensar ev. dubbletter från tidigare tester
    alter table ladok_results
      add constraint ladok_results_unik unique (personnummer, kurskod, modul);
  end if;
end $$;


-- ---------- 2. Testdata (läggs bara in om tabellen är tom) ----------

insert into modules (course_code, module_code, module_name, hp)
select * from (values
  ('D0031N', '0005', 'Inlämningsuppgifter', 10::numeric),
  ('D0031N', '0006', 'Projektarbete',        5::numeric),
  ('D0031N', '0007', 'Tentamen',           7.5::numeric)
) v
where not exists (select 1 from modules);

update modules set hp = 10  where course_code = 'D0031N' and module_code = '0005' and hp is null;
update modules set hp = 5   where course_code = 'D0031N' and module_code = '0006' and hp is null;
update modules set hp = 7.5 where course_code = 'D0031N' and module_code = '0007' and hp is null;

insert into students (student_username, first_name, last_name, personnummer)
select * from (values
  ('sveedz-4', 'Anna',  'Svensson', '19980412-1234'),
  ('karlss-2', 'Erik',  'Karlsson', '19950823-5678'),
  ('husskl-1', 'Klara', 'Huss',     '20010613-2345')
) v
where not exists (select 1 from students);

insert into canvas_submissions (student_username, course_code, assignment_name, grade, submission_date)
select v.u, v.c, v.a, v.g, v.d::date from (values
  ('sveedz-4', 'D0031N', 'Uppgift 3 - SOA', 'G',  '2026-11-01'),
  ('karlss-2', 'D0031N', 'Uppgift 3 - SOA', 'U',  '2026-11-02'),
  ('husskl-1', 'D0031N', 'Uppgift 3 - SOA', 'VG', '2026-11-03')
) as v(u, c, a, g, d)
where not exists (select 1 from canvas_submissions);


-- ---------- 3. Row Level Security ----------
-- RLS på alla tabeller. Endast Canvas-tabellen får läsas direkt.
-- Övriga system har INGA policies för anon => bara åtkomliga via tjänsterna.

alter table modules            enable row level security;
alter table students           enable row level security;
alter table canvas_submissions enable row level security;
alter table ladok_results      enable row level security;

drop policy if exists "anon read"   on modules;
drop policy if exists "anon read"   on students;
drop policy if exists "anon read"   on ladok_results;
drop policy if exists "anon insert" on ladok_results;
drop policy if exists "anon read"   on canvas_submissions;

create policy "anon read" on canvas_submissions for select to anon using (true);


-- ---------- 4. Tjänster ----------

-- Epok: get_Modul
-- GET /rest/v1/rpc/get_modul?p_kurskod=D0031N
create or replace function public.get_modul(p_kurskod text)
returns table (modulkod text, benamning text, hp numeric)
language sql stable security definer set search_path = public
as $$
  select m.module_code, m.module_name, m.hp
  from modules m
  where m.course_code = p_kurskod and m.aktiv
  order by m.module_code;
$$;

-- StudentITS: get_Persnummer
-- GET /rest/v1/rpc/get_persnummer?p_username=sveedz-4
drop function if exists public.get_persnummer(text);
create function public.get_persnummer(p_username text)
returns table (student_username text, personnummer text, fornamn text, efternamn text)
language sql stable security definer set search_path = public
as $$
  select s.student_username, s.personnummer, s.first_name, s.last_name
  from students s
  where s.student_username = p_username;
$$;

-- Ladok: get_Resultat (utökning – visar befintlig status innan registrering)
-- GET /rest/v1/rpc/get_resultat?p_kurskod=D0031N&p_modul=0005
drop function if exists public.get_resultat(text, text);
create function public.get_resultat(p_kurskod text, p_modul text)
returns table (personnummer text, datum date, betyg text, status text)
language sql stable security definer set search_path = public
as $$
  select lr.personnummer, lr.datum, lr.betyg, lr.status
  from ladok_results lr
  where lr.kurskod = p_kurskod and lr.modul = p_modul;
$$;

-- Ladok: reg_Resultat
-- POST /rest/v1/rpc/reg_resultat
-- Body: { "p_personnummer", "p_kurskod", "p_modul", "p_datum", "p_betyg", "p_status" }
-- Svar: { "status": "registrerad" | "hinder" | "fel", ... }
create or replace function public.reg_resultat(
  p_personnummer text,
  p_kurskod      text,
  p_modul        text,
  p_datum        date,
  p_betyg        text,
  p_status       text default 'Utkast'
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_befintlig text;
begin
  if p_betyg is null or p_betyg not in ('U', 'G', 'VG') then
    return json_build_object('status', 'fel', 'meddelande', 'Ogiltigt betyg för betygsskalan');
  end if;

  if p_datum is null or p_datum > current_date then
    return json_build_object('status', 'fel', 'meddelande', 'Examinationsdatum saknas eller ligger i framtiden');
  end if;

  if p_status not in ('Utkast', 'Klarmarkerad') then
    return json_build_object('status', 'fel', 'meddelande', 'Status måste vara Utkast eller Klarmarkerad');
  end if;

  select lr.status into v_befintlig
  from ladok_results lr
  where lr.personnummer = p_personnummer
    and lr.kurskod      = p_kurskod
    and lr.modul        = p_modul;

  if v_befintlig in ('Klarmarkerad', 'Attesterad') then
    return json_build_object(
      'status', 'hinder',
      'meddelande', 'Resultatet är redan ' || lower(v_befintlig) || ' och kan inte ändras',
      'personnummer', p_personnummer
    );
  end if;

  insert into ladok_results (personnummer, kurskod, modul, datum, betyg, status)
  values (p_personnummer, p_kurskod, p_modul, p_datum, p_betyg, p_status)
  on conflict (personnummer, kurskod, modul)
  do update set datum = excluded.datum, betyg = excluded.betyg, status = excluded.status;

  return json_build_object(
    'status', 'registrerad',
    'personnummer', p_personnummer,
    'kurskod', p_kurskod,
    'modul', p_modul,
    'ladokstatus', p_status
  );
end;
$$;


-- ---------- 5. Behörigheter ----------
grant execute on function public.get_modul(text)                                   to anon;
grant execute on function public.get_persnummer(text)                              to anon;
grant execute on function public.get_resultat(text, text)                          to anon;
grant execute on function public.reg_resultat(text, text, text, date, text, text) to anon;


-- ---------- 6. Test (kör en rad i taget efteråt, markera raden och tryck Run) ----------
-- select * from get_modul('D0031N');
-- select * from get_persnummer('sveedz-4');
-- select reg_resultat('19980412-1234', 'D0031N', '0005', current_date, 'G',  'Utkast');        -- registrerad
-- select reg_resultat('19980412-1234', 'D0031N', '0005', current_date, 'VG', 'Klarmarkerad');  -- registrerad
-- select reg_resultat('19980412-1234', 'D0031N', '0005', current_date, 'U',  'Utkast');        -- hinder
-- select * from get_resultat('D0031N', '0005');
-- delete from ladok_results;   -- nollställ inför nästa test/demo
