create function public.pensefit_create_box(box_name text,display_alias text) returns uuid language plpgsql security invoker set search_path='' as $$
declare account uuid:=auth.uid(); target uuid;
begin
 if account is null then raise exception 'Autenticação necessária'; end if;
 if length(trim(box_name)) not between 2 and 120 or length(trim(display_alias)) not between 2 and 120 then raise exception 'Nome inválido'; end if;
 insert into public.pensefit_boxes(owner_id,name) values(account,trim(box_name)) returning id into target;
 insert into public.pensefit_box_members(box_id,user_id,alias,role,share_training) values(target,account,trim(display_alias),'owner',false);
 return target;
end;$$;
revoke all on function public.pensefit_create_box(text,text) from public,anon;
grant execute on function public.pensefit_create_box(text,text) to authenticated;

create function public.pensefit_validate_shared_result() returns trigger language plpgsql security invoker set search_path='' as $$
declare original jsonb;
begin
 if new.user_id<>auth.uid() then raise exception 'Resultado não autorizado'; end if;
 select data into original from public.pensefit_wod_results where id=new.source_result_id and user_id=auth.uid();
 if original is null or (original->>'boxWodId') is distinct from new.box_wod_id::text or not coalesce((original->>'completed')::boolean,false) then raise exception 'Use um resultado completo do WOD publicado neste box'; end if;
 new.variant:=original->>'variant'; new.signature:=original->>'signature'; new.score_type:=original->>'scoreType';
 new.score:=case when new.score_type='time' then (original->>'seconds')::numeric+coalesce((original->>'penaltySeconds')::numeric,0) when new.score_type='reps' then (original->>'rounds')::numeric*coalesce((original->>'repsPerRound')::numeric,0)+coalesce((original->>'extraReps')::numeric,0) else coalesce((original->>'weight')::numeric,0) end;
 new.data:=jsonb_build_object('rounds',original->'rounds','extraReps',original->'extraReps','seconds',original->'seconds');
 return new;
end;$$;
revoke all on function public.pensefit_validate_shared_result() from public,anon,authenticated;
create trigger pensefit_shared_result_validate before insert on public.pensefit_box_results for each row execute function public.pensefit_validate_shared_result();

create table pensefit_private.ai_usage(user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create index pensefit_ai_usage_user_time on pensefit_private.ai_usage(user_id,created_at);
alter table pensefit_private.ai_usage enable row level security;
revoke all on pensefit_private.ai_usage from public,anon,authenticated;
create function public.pensefit_claim_ai_request() returns boolean language plpgsql security definer set search_path='' as $$
declare account uuid:=auth.uid();
begin
 if account is null then raise exception 'Autenticação necessária'; end if;
 perform pg_advisory_xact_lock(hashtext(account::text));
 if (select count(*) from pensefit_private.ai_usage where user_id=account and created_at>now()-interval '1 minute')>=10 or (select count(*) from pensefit_private.ai_usage where user_id=account and created_at>now()-interval '1 day')>=100 then return false; end if;
 delete from pensefit_private.ai_usage where user_id=account and created_at<now()-interval '2 days';
 insert into pensefit_private.ai_usage(user_id) values(account); return true;
end;$$;
revoke all on function public.pensefit_claim_ai_request() from public,anon;
grant execute on function public.pensefit_claim_ai_request() to authenticated;
create unique index pensefit_integration_external_once on public.pensefit_integrations(user_id,(data->>'source'),(data->>'externalId'));
