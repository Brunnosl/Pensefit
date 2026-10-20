-- Schema aplicado ao projeto Pense fit 2.0 pelo conector Supabase.
-- O snapshot mantém o formato do app original para permitir importar registros locais.
create table public.pensefit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pensefit_state_shape check (
    jsonb_typeof(state) = 'object'
    and state ?& array['profile', 'done', 'meals', 'loads', 'progress']
    and jsonb_typeof(state->'profile') = 'object'
    and jsonb_typeof(state->'done') = 'object'
    and jsonb_typeof(state->'meals') = 'object'
    and jsonb_typeof(state->'loads') = 'array'
    and jsonb_typeof(state->'progress') = 'object'
    and octet_length(state::text) <= 2097152
  )
);

alter table public.pensefit_accounts enable row level security;
revoke all on public.pensefit_accounts from anon;
revoke all on public.pensefit_accounts from authenticated;
grant select, insert, update on public.pensefit_accounts to authenticated;

create policy pensefit_select_own on public.pensefit_accounts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy pensefit_insert_own on public.pensefit_accounts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy pensefit_update_own on public.pensefit_accounts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.pensefit_stamp_account()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.pensefit_stamp_account() from public, anon, authenticated;
create trigger pensefit_account_updated before update on public.pensefit_accounts
  for each row execute function public.pensefit_stamp_account();

comment on table public.pensefit_accounts is
  'Perfil e registros privados de treino de cada usuário do Pense Fit; acesso isolado por auth.uid().';
