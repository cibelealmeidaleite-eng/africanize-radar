-- Rode isso no SQL Editor do Supabase (projeto que você já criou).
-- Adiciona a coluna usada para "lembrar" quem já foi checado, evitando que
-- o radar sempre repita as mesmas pessoas quando há muita gente cadastrada.

alter table public.people
  add column if not exists last_checked_at timestamptz;
