-- Mantém operações elevadas fora dos schemas expostos. Wrappers públicos são invoker.
create or replace function pensefit_private.join_box(code text,display_alias text) returns uuid language plpgsql security definer set search_path='' as $$
declare account uuid:=auth.uid(); target uuid;
begin
 if account is null then raise exception 'Autenticação necessária'; end if;
 if length(display_alias) not between 2 and 120 or length(code)<>18 then raise exception 'Código ou nome inválido'; end if;
 select id into target from public.pensefit_boxes where join_code=lower(trim(code));
 if target is null then raise exception 'Código de convite inválido'; end if;
 insert into public.pensefit_box_members(box_id,user_id,alias,role,share_training) values(target,account,trim(display_alias),'athlete',false) on conflict(box_id,user_id) do nothing;
 return target;
end;$$;
revoke all on function pensefit_private.join_box(text,text) from public,anon;
grant execute on function pensefit_private.join_box(text,text) to authenticated;
create or replace function public.pensefit_join_box(code text,display_alias text) returns uuid language sql security invoker set search_path='' as $$ select pensefit_private.join_box($1,$2); $$;
revoke all on function public.pensefit_join_box(text,text) from public,anon;
grant execute on function public.pensefit_join_box(text,text) to authenticated;
create or replace function pensefit_private.box_coach(box uuid,member uuid,enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.pensefit_boxes where id=box and owner_id=auth.uid()) then raise exception 'Somente o dono do box pode atribuir treinadores'; end if;
 update public.pensefit_box_members set role=case when enabled then 'coach' else 'athlete' end where box_id=box and user_id=member and role<>'owner';
 if not found then raise exception 'Membro não encontrado'; end if;
end;$$;
revoke all on function pensefit_private.box_coach(uuid,uuid,boolean) from public,anon;
grant execute on function pensefit_private.box_coach(uuid,uuid,boolean) to authenticated;
create or replace function public.pensefit_box_coach(box uuid,member uuid,enabled boolean) returns void language sql security invoker set search_path='' as $$ select pensefit_private.box_coach($1,$2,$3); $$;
revoke all on function public.pensefit_box_coach(uuid,uuid,boolean) from public,anon;
grant execute on function public.pensefit_box_coach(uuid,uuid,boolean) to authenticated;
create or replace function pensefit_private.claim_ai_request() returns boolean language plpgsql security definer set search_path='' as $$
declare account uuid:=auth.uid();
begin
 if account is null then raise exception 'Autenticação necessária'; end if;
 perform pg_advisory_xact_lock(hashtext(account::text));
 if (select count(*) from pensefit_private.ai_usage where user_id=account and created_at>now()-interval '1 minute')>=10 or (select count(*) from pensefit_private.ai_usage where user_id=account and created_at>now()-interval '1 day')>=100 then return false; end if;
 delete from pensefit_private.ai_usage where user_id=account and created_at<now()-interval '2 days';
 insert into pensefit_private.ai_usage(user_id) values(account); return true;
end;$$;
revoke all on function pensefit_private.claim_ai_request() from public,anon;
grant execute on function pensefit_private.claim_ai_request() to authenticated;
create or replace function public.pensefit_claim_ai_request() returns boolean language sql security invoker set search_path='' as $$ select pensefit_private.claim_ai_request(); $$;
revoke all on function public.pensefit_claim_ai_request() from public,anon;
grant execute on function public.pensefit_claim_ai_request() to authenticated;
alter table pensefit_private.ai_usage add column id bigint generated always as identity primary key;
create policy pensefit_ai_usage_no_direct_access on pensefit_private.ai_usage for all to authenticated using(false) with check(false);
