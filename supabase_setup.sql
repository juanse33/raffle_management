-- =====================================================================
--  Gestor de Rifas · Configuración de la base de datos en Supabase
--  Pega TODO este archivo en: Supabase > SQL Editor > New query > Run
--  Se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- 1) Tabla única de la rifa
create table if not exists public.boletas (
  numero      integer primary key check (numero >= 0),
  estado      text not null default 'disponible'
              check (estado in ('disponible', 'vendida')),
  vendedor    text,
  comprador   text,
  precio      numeric(12, 2) not null default 0 check (precio >= 0),
  vendida_en  timestamptz,
  -- Una boleta vendida siempre debe tener vendedor
  constraint vendedor_obligatorio check (
    estado = 'disponible' or (vendedor is not null and length(trim(vendedor)) > 0)
  )
);

-- 2) Permisos para la clave pública (anon / publishable)
grant select, insert, update, delete on public.boletas to anon, authenticated;

alter table public.boletas enable row level security;

drop policy if exists "boletas_select" on public.boletas;
drop policy if exists "boletas_insert" on public.boletas;
drop policy if exists "boletas_update" on public.boletas;
drop policy if exists "boletas_delete" on public.boletas;

create policy "boletas_select" on public.boletas
  for select to anon, authenticated using (true);
create policy "boletas_insert" on public.boletas
  for insert to anon, authenticated with check (true);
create policy "boletas_update" on public.boletas
  for update to anon, authenticated using (true) with check (true);
create policy "boletas_delete" on public.boletas
  for delete to anon, authenticated using (true);

-- 3) Activar tiempo real (todos los navegadores se actualizan al instante)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'boletas'
  ) then
    alter publication supabase_realtime add table public.boletas;
  end if;
end $$;
