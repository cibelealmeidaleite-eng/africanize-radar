-- ============================================================
-- AFRICANIZE RADAR — schema Supabase
-- Execute este arquivo inteiro no SQL Editor do Supabase
-- (Project > SQL Editor > New query > cole e rode).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- people: banco de pessoas monitoradas
-- ------------------------------------------------------------
create table if not exists public.people (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  aliases      text[] not null default '{}',
  category     text not null default 'Outro'
               check (category in (
                 'Música','Cinema','TV','Streaming','Esportes','Moda','Beleza',
                 'Creator','Influenciador','Cultura','Política','Direitos Humanos',
                 'Negócios','Outro'
               )),
  country      text,
  priority     text not null default 'Média'
               check (priority in ('Alta','Média','Baixa')),
  topics       text[] not null default '{}',
  active       boolean not null default true,
  last_news_at timestamptz,
  last_checked_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_people_active on public.people (active);
create index if not exists idx_people_name on public.people (lower(name));

-- ------------------------------------------------------------
-- news_items: banco de notícias curadas
-- ------------------------------------------------------------
create table if not exists public.news_items (
  id                 uuid primary key default gen_random_uuid(),
  person_id          uuid not null references public.people (id) on delete cascade,
  title              text not null,
  summary            text not null default '',
  source_name        text not null default '',
  source_url         text not null,
  -- fontes adicionais que cobriram o mesmo acontecimento (além de source_url)
  sources            jsonb,
  published_at       timestamptz,
  found_at           timestamptz not null default now(),
  category           text not null default 'Outro',
  relevance_score    numeric not null default 0 check (relevance_score >= 0 and relevance_score <= 10),
  classification     text not null default 'DISCARD'
                     check (classification in ('HOT','WATCH','DISCARD')),
  status             text not null default 'Nova'
                     check (status in ('Nova','Lida','Salva','Descartada')),
  why_it_matters     text not null default '',
  recommended_format text[] not null default '{}',
  is_duplicate       boolean not null default false,
  duplicate_of       uuid references public.news_items (id) on delete set null,
  is_alert           boolean not null default false,
  alert_reason       text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_news_person on public.news_items (person_id);
create index if not exists idx_news_found_at on public.news_items (found_at desc);
create index if not exists idx_news_classification on public.news_items (classification);
create index if not exists idx_news_status on public.news_items (status);
create index if not exists idx_news_is_duplicate on public.news_items (is_duplicate);

-- ------------------------------------------------------------
-- radar_runs: log de execuções do robô diário
-- ------------------------------------------------------------
create table if not exists public.radar_runs (
  id             uuid primary key default gen_random_uuid(),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running'
                 check (status in ('running','success','error','partial')),
  people_checked int not null default 0,
  news_found     int not null default 0,
  hot_count      int not null default 0,
  watch_count    int not null default 0,
  error_message  text
);

create index if not exists idx_radar_runs_started_at on public.radar_runs (started_at desc);

-- ------------------------------------------------------------
-- Row Level Security
--
-- Este é um MVP de ferramenta interna sem autenticação de usuários própria.
-- A anon key do Supabase é usada pelo frontend, então mantemos leitura aberta
-- e liberamos apenas as escritas que o painel realmente precisa fazer no
-- navegador (cadastrar/editar/remover pessoas, marcar status de notícia).
-- A curadoria em si (INSERT em news_items e radar_runs) só acontece via
-- Netlify Functions usando a service_role key, que ignora RLS.
--
-- Se o Radar for exposto além da equipe interna, troque isso por Supabase
-- Auth + policies por usuário/role antes de ampliar o acesso.
-- ------------------------------------------------------------

alter table public.people enable row level security;
alter table public.news_items enable row level security;
alter table public.radar_runs enable row level security;

-- people: leitura e escrita liberadas para a chave anon (painel "Pessoas monitoradas")
create policy "people_select_all" on public.people
  for select using (true);
create policy "people_insert_anon" on public.people
  for insert with check (true);
create policy "people_update_anon" on public.people
  for update using (true) with check (true);
create policy "people_delete_anon" on public.people
  for delete using (true);

-- news_items: leitura liberada; só permite UPDATE (status/leitura/favoritar),
-- nunca INSERT/DELETE pela chave anon — isso é reservado à pipeline (service_role).
create policy "news_select_all" on public.news_items
  for select using (true);
create policy "news_update_status_anon" on public.news_items
  for update using (true) with check (true);

-- radar_runs: somente leitura pela chave anon; escrita reservada à service_role.
create policy "radar_runs_select_all" on public.radar_runs
  for select using (true);
