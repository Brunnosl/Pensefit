-- Funções internas de autorização não estão no schema exposto pela Data API.
create table public.pensefit_boxes (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 120), join_code text not null unique default encode(extensions.gen_random_bytes(9),'hex'),
 created_at timestamptz not null default now()
);
create index pensefit_boxes_owner_idx on public.pensefit_boxes(owner_id);
create table public.pensefit_box_members (
 box_id uuid not null references public.pensefit_boxes(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 alias text not null check(length(alias) between 2 and 120), role text not null default 'athlete' check(role in('owner','coach','athlete')),
 share_training boolean not null default false, joined_at timestamptz not null default now(), primary key(box_id,user_id)
);
create index pensefit_box_members_user_idx on public.pensefit_box_members(user_id,box_id);
create function pensefit_private.is_box_member(target uuid,allowed_roles text[] default null) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.pensefit_box_members m where m.box_id=target and m.user_id=auth.uid() and (allowed_roles is null or m.role=any(allowed_roles)));
$$;
revoke all on function pensefit_private.is_box_member(uuid,text[]) from public,anon;
grant execute on function pensefit_private.is_box_member(uuid,text[]) to authenticated;
create function pensefit_private.student_consented(target uuid,student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.pensefit_box_members m where m.box_id=target and m.user_id=student and m.share_training);
$$;
revoke all on function pensefit_private.student_consented(uuid,uuid) from public,anon;
grant execute on function pensefit_private.student_consented(uuid,uuid) to authenticated;

alter table public.pensefit_boxes enable row level security;
alter table public.pensefit_box_members enable row level security;
revoke all on public.pensefit_boxes,public.pensefit_box_members from anon;
grant select,insert,delete on public.pensefit_boxes to authenticated;
grant update(name,join_code) on public.pensefit_boxes to authenticated;
grant select,insert,delete on public.pensefit_box_members to authenticated;
grant update(alias,share_training) on public.pensefit_box_members to authenticated;
create policy pensefit_boxes_select on public.pensefit_boxes for select to authenticated using(owner_id=(select auth.uid()) or pensefit_private.is_box_member(id));
create policy pensefit_boxes_insert on public.pensefit_boxes for insert to authenticated with check(owner_id=(select auth.uid()));
create policy pensefit_boxes_update on public.pensefit_boxes for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy pensefit_boxes_delete on public.pensefit_boxes for delete to authenticated using(owner_id=(select auth.uid()));
create policy pensefit_box_members_select on public.pensefit_box_members for select to authenticated using(pensefit_private.is_box_member(box_id));
create policy pensefit_box_members_owner_insert on public.pensefit_box_members for insert to authenticated with check(user_id=(select auth.uid()) and role='owner' and exists(select 1 from public.pensefit_boxes b where b.id=box_id and b.owner_id=(select auth.uid())));
create policy pensefit_box_members_update on public.pensefit_box_members for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy pensefit_box_members_delete on public.pensefit_box_members for delete to authenticated using(user_id=(select auth.uid()) or pensefit_private.is_box_member(box_id,array['owner']));

-- Entrada por código: precisa procurar apenas o código fornecido e inserir somente o próprio usuário.
create function public.pensefit_join_box(code text,display_alias text) returns uuid language plpgsql security definer set search_path='' as $$
declare account uuid:=auth.uid(); target uuid;
begin
 if account is null then raise exception 'Autenticação necessária'; end if;
 if length(display_alias) not between 2 and 120 or length(code)<>18 then raise exception 'Código ou nome inválido'; end if;
 select id into target from public.pensefit_boxes where join_code=lower(trim(code));
 if target is null then raise exception 'Código de convite inválido'; end if;
 insert into public.pensefit_box_members(box_id,user_id,alias,role,share_training) values(target,account,trim(display_alias),'athlete',false) on conflict(box_id,user_id) do nothing;
 return target;
end;$$;
revoke all on function public.pensefit_join_box(text,text) from public,anon;
grant execute on function public.pensefit_join_box(text,text) to authenticated;

create function public.pensefit_box_coach(box uuid,member uuid,enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.pensefit_boxes where id=box and owner_id=auth.uid()) then raise exception 'Somente o dono do box pode atribuir treinadores'; end if;
 update public.pensefit_box_members set role=case when enabled then 'coach' else 'athlete' end where box_id=box and user_id=member and role<>'owner';
 if not found then raise exception 'Membro não encontrado'; end if;
end;$$;
revoke all on function public.pensefit_box_coach(uuid,uuid,boolean) from public,anon;
grant execute on function public.pensefit_box_coach(uuid,uuid,boolean) to authenticated;

create table public.pensefit_box_wods (
 id uuid primary key default gen_random_uuid(), box_id uuid not null references public.pensefit_boxes(id) on delete cascade,
 coach_id uuid not null references auth.users(id) on delete cascade, date date not null, data jsonb not null check(jsonb_typeof(data)='object'),
 created_at timestamptz not null default now(), unique(box_id,id)
);
create index pensefit_box_wods_box_date_idx on public.pensefit_box_wods(box_id,date desc);
create index pensefit_box_wods_coach_idx on public.pensefit_box_wods(coach_id);
alter table public.pensefit_box_wods enable row level security;
revoke all on public.pensefit_box_wods from anon;
grant select,insert,update,delete on public.pensefit_box_wods to authenticated;
create policy pensefit_box_wods_select on public.pensefit_box_wods for select to authenticated using(pensefit_private.is_box_member(box_id));
create policy pensefit_box_wods_write on public.pensefit_box_wods for insert to authenticated with check(coach_id=(select auth.uid()) and pensefit_private.is_box_member(box_id,array['owner','coach']));
create policy pensefit_box_wods_update on public.pensefit_box_wods for update to authenticated using(coach_id=(select auth.uid()) and pensefit_private.is_box_member(box_id,array['owner','coach'])) with check(coach_id=(select auth.uid()) and pensefit_private.is_box_member(box_id,array['owner','coach']));
create policy pensefit_box_wods_delete on public.pensefit_box_wods for delete to authenticated using(coach_id=(select auth.uid()) or pensefit_private.is_box_member(box_id,array['owner']));

alter table public.pensefit_wod_results add constraint pensefit_wod_results_owner_id unique(user_id,id);
create table public.pensefit_box_results (
 id uuid primary key default gen_random_uuid(), box_id uuid not null, box_wod_id uuid not null, user_id uuid not null references auth.users(id) on delete cascade,
 source_result_id uuid not null, alias text not null check(length(alias) between 2 and 120), date date not null,
 variant text not null check(variant in('RX','Scaled','Beginner')), signature text not null check(length(signature)<=12000),
 score_type text not null check(score_type in('time','reps','weight')), score numeric not null check(score>=0), data jsonb not null check(jsonb_typeof(data)='object'),
 foreign key(box_id,box_wod_id) references public.pensefit_box_wods(box_id,id) on delete cascade,
 foreign key(user_id,source_result_id) references public.pensefit_wod_results(user_id,id) on delete cascade,
 unique(box_id,source_result_id)
);
create index pensefit_box_results_box_wod_idx on public.pensefit_box_results(box_id,box_wod_id,variant,score);
create index pensefit_box_results_user_idx on public.pensefit_box_results(user_id,source_result_id);
alter table public.pensefit_box_results enable row level security;
revoke all on public.pensefit_box_results from anon;
grant select,insert,delete on public.pensefit_box_results to authenticated;
create policy pensefit_box_results_select on public.pensefit_box_results for select to authenticated using(pensefit_private.is_box_member(box_id) and pensefit_private.student_consented(box_id,user_id));
create policy pensefit_box_results_insert on public.pensefit_box_results for insert to authenticated with check(user_id=(select auth.uid()) and pensefit_private.is_box_member(box_id) and pensefit_private.student_consented(box_id,user_id));
create policy pensefit_box_results_delete on public.pensefit_box_results for delete to authenticated using(user_id=(select auth.uid()));

create table public.pensefit_coach_notes (
 id uuid primary key default gen_random_uuid(), box_id uuid not null references public.pensefit_boxes(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade, coach_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, note text not null check(length(note) between 1 and 4000)
);
create index pensefit_coach_notes_box_student_idx on public.pensefit_coach_notes(box_id,student_id,date desc);
create index pensefit_coach_notes_coach_idx on public.pensefit_coach_notes(coach_id);
create index pensefit_coach_notes_student_idx on public.pensefit_coach_notes(student_id);
alter table public.pensefit_coach_notes enable row level security;
revoke all on public.pensefit_coach_notes from anon;
grant select,insert,delete on public.pensefit_coach_notes to authenticated;
create policy pensefit_coach_notes_select on public.pensefit_coach_notes for select to authenticated using(student_id=(select auth.uid()) or (pensefit_private.is_box_member(box_id,array['owner','coach']) and pensefit_private.student_consented(box_id,student_id)));
create policy pensefit_coach_notes_insert on public.pensefit_coach_notes for insert to authenticated with check(coach_id=(select auth.uid()) and pensefit_private.is_box_member(box_id,array['owner','coach']) and pensefit_private.student_consented(box_id,student_id));
create policy pensefit_coach_notes_delete on public.pensefit_coach_notes for delete to authenticated using(student_id=(select auth.uid()) or coach_id=(select auth.uid()));

create function public.pensefit_activate_nutrition_plan(plan_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare account uuid:=auth.uid();
begin
 if account is null then raise exception 'Autenticação necessária'; end if;
 perform id from public.pensefit_nutrition_plans where user_id=account order by id for update;
 if not exists(select 1 from public.pensefit_nutrition_plans where id=plan_id and user_id=account and coalesce((data->>'reviewed')::boolean,false)) then raise exception 'Revise o plano antes de ativar'; end if;
 update public.pensefit_nutrition_plans set data=jsonb_set(data,'{active}','false'::jsonb) where user_id=account and coalesce((data->>'active')::boolean,false);
 update public.pensefit_nutrition_plans set data=jsonb_set(data,'{active}','true'::jsonb) where id=plan_id and user_id=account;
end;$$;
revoke all on function public.pensefit_activate_nutrition_plan(uuid) from public,anon;
grant execute on function public.pensefit_activate_nutrition_plan(uuid) to authenticated;
create unique index pensefit_one_active_nutrition_plan on public.pensefit_nutrition_plans(user_id) where data->>'active'='true';
create unique index pensefit_set_once on public.pensefit_sets(user_id,session_id,(data->>'exerciseIndex'),(data->>'setIndex'));
create unique index pensefit_meal_once on public.pensefit_meal_logs(user_id,date,(data->>'planId'),(data->>'mealId')) where data->>'planId' is not null;
