const fs=require('node:fs');
const tables=['preferences','workout_plans','sessions','sets','measurements','photos','foods','pantry','recipes','meal_plans','shopping_lists','nutrition_plans','meal_logs','hydration','recovery','calendar','ai_conversations','reports','integrations','wods','wod_results','skills','pr_records'];
const checks={pantry:"and data ?& array['name','quantity','unit'] and jsonb_typeof(data->'quantity')='number' and (data->>'quantity')::numeric between 0 and 100000 and data->>'unit' in ('g','kg','ml','l','un')",hydration:"and jsonb_typeof(data->'ml')='number' and (data->>'ml')::numeric between 1 and 10000",sets:"and data ?& array['exercise','weight','reps','rir'] and jsonb_typeof(data->'weight')='number' and (data->>'weight')::numeric between 0 and 1000 and (data->>'reps')::numeric between 1 and 1000 and (data->>'rir')::numeric between 0 and 10",measurements:"and jsonb_typeof(data->'weight')='number' and (data->>'weight')::numeric between 30 and 250",meal_logs:"and data->>'status' in ('conforme','alterada','nao-realizada','pendente') and (data->>'calories')::numeric between 0 and 50000",recovery:"and (data->>'sleep')::numeric between 0 and 24",wod_results:"and data->>'variant' in ('RX','Scaled','Beginner') and (data->>'seconds')::numeric between 0 and 86400",pr_records:"and (data->>'weight')::numeric between 0 and 1000 and (data->>'reps')::numeric between 1 and 20"};
let sql=`-- Migração aditiva: não modifica dados da versão anterior.
create schema if not exists pensefit_private;
revoke all on schema pensefit_private from public,anon;
grant usage on schema pensefit_private to authenticated;

create function public.pensefit_stamp_record() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.id:=old.id; new.user_id:=old.user_id; new.created_at:=old.created_at;
 new.revision:=old.revision+1; new.updated_at:=now(); return new;
end;$$;
revoke all on function public.pensefit_stamp_record() from public,anon,authenticated;
`;
for(const kind of tables){const name='pensefit_'+kind;sql+=`
create table public.${name} (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint ${name}_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 ${checks[kind]||''})
 ${kind==='preferences'?', unique(user_id)':''}
);
create index ${name}_user_date_idx on public.${name}(user_id,date desc);
alter table public.${name} enable row level security;
revoke all on public.${name} from anon;
grant select,insert,update,delete on public.${name} to authenticated;
create policy ${name}_own on public.${name} for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger ${name}_stamp before update on public.${name} for each row execute function public.pensefit_stamp_record();
`;}
sql+=`
alter table public.pensefit_sets add column session_id uuid;
alter table public.pensefit_sessions add constraint pensefit_sessions_owner_id unique(user_id,id);
alter table public.pensefit_sets add constraint pensefit_sets_owner_session foreign key(user_id,session_id) references public.pensefit_sessions(user_id,id) on delete cascade;
create index pensefit_sets_session_idx on public.pensefit_sets(user_id,session_id);
alter table public.pensefit_photos add column measurement_id uuid;
alter table public.pensefit_measurements add constraint pensefit_measurements_owner_id unique(user_id,id);
alter table public.pensefit_photos add constraint pensefit_photos_owner_measurement foreign key(user_id,measurement_id) references public.pensefit_measurements(user_id,id) on delete cascade;
create index pensefit_photos_measurement_idx on public.pensefit_photos(user_id,measurement_id);

create table public.pensefit_catalog(id text primary key,kind text not null check(kind in('exercise','movement','food','benchmark','recipe')),data jsonb not null check(jsonb_typeof(data)='object'));
alter table public.pensefit_catalog enable row level security;
revoke all on public.pensefit_catalog from anon;
grant select on public.pensefit_catalog to authenticated;
create policy pensefit_catalog_read on public.pensefit_catalog for select to authenticated using(true);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pensefit-private','pensefit-private',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy pensefit_storage_read on storage.objects for select to authenticated using(bucket_id='pensefit-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy pensefit_storage_insert on storage.objects for insert to authenticated with check(bucket_id='pensefit-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy pensefit_storage_update on storage.objects for update to authenticated using(bucket_id='pensefit-private' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='pensefit-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy pensefit_storage_delete on storage.objects for delete to authenticated using(bucket_id='pensefit-private' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- RPC invoker: a compra e o estoque são alterados na mesma transação, sob RLS.
create function public.pensefit_transfer_shopping(list_id uuid,item_id text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare account uuid:=auth.uid(); rec public.pensefit_shopping_lists%rowtype; item jsonb; items jsonb;
begin
 if account is null then raise exception 'Autenticação necessária'; end if;
 select * into rec from public.pensefit_shopping_lists where id=list_id and user_id=account for update;
 if not found then raise exception 'Lista não encontrada'; end if;
 select value into item from jsonb_array_elements(rec.data->'items') where value->>'id'=item_id;
 if item is null then raise exception 'Item não encontrado'; end if;
 if coalesce((item->>'transferred')::boolean,false) then return rec.data; end if;
 if not coalesce((item->>'bought')::boolean,false) then raise exception 'Marque a compra antes de transferir'; end if;
 insert into public.pensefit_pantry(user_id,data) values(account,jsonb_build_object('name',item->>'name','quantity',(item->>'quantity')::numeric,'unit',item->>'unit','category',coalesce(item->>'category','Outros'),'expires',null));
 select jsonb_agg(case when value->>'id'=item_id then value||'{"transferred":true}'::jsonb else value end) into items from jsonb_array_elements(rec.data->'items');
 update public.pensefit_shopping_lists set data=jsonb_set(data,'{items}',items) where id=list_id and user_id=account;
 return jsonb_set(rec.data,'{items}',items);
end;$$;
revoke all on function public.pensefit_transfer_shopping(uuid,text) from public,anon;
grant execute on function public.pensefit_transfer_shopping(uuid,text) to authenticated;

create function public.pensefit_consume_ingredients(ingredients jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare account uuid:=auth.uid(); item jsonb; stock record; required numeric; take numeric; factor numeric; target_unit text; normalized text;
begin
 if account is null then raise exception 'Autenticação necessária'; end if;
 if jsonb_typeof(ingredients)<>'array' or jsonb_array_length(ingredients)>50 then raise exception 'Ingredientes inválidos'; end if;
 -- Bloqueia o estoque do usuário para impedir consumo concorrente acima do disponível.
 perform id from public.pensefit_pantry where user_id=account order by id for update;
 for item in select value from jsonb_array_elements(ingredients) loop
  if item->>'quantity' is null or (item->>'quantity')::numeric<=0 then raise exception 'Informe quantidades para consumir'; end if;
  required:=(item->>'quantity')::numeric * case when item->>'unit' in('kg','l') then 1000 else 1 end;
  target_unit:=case when item->>'unit'='kg' then 'g' when item->>'unit'='l' then 'ml' else item->>'unit' end;
  normalized:=translate(lower(trim(item->>'name')),'áàãâéêíóôõúç','aaaaeeiooouc');
  for stock in select id,data from public.pensefit_pantry where user_id=account and translate(lower(trim(data->>'name')),'áàãâéêíóôõúç','aaaaeeiooouc')=normalized and (data->>'expires' is null or data->>'expires'='' or (data->>'expires')::date>=current_date) and (case when data->>'unit'='kg' then 'g' when data->>'unit'='l' then 'ml' else data->>'unit' end)=target_unit order by data->>'expires' nulls last,created_at loop
   factor:=case when stock.data->>'unit' in('kg','l') then 1000 else 1 end;
   take:=least(required,(stock.data->>'quantity')::numeric*factor);
   update public.pensefit_pantry set data=jsonb_set(data,'{quantity}',to_jsonb(((data->>'quantity')::numeric*factor-take)/factor)) where id=stock.id;
   required:=required-take; exit when required<=0;
  end loop;
  if required>0 then raise exception 'Quantidade insuficiente de %',item->>'name'; end if;
 end loop;
end;$$;
revoke all on function public.pensefit_consume_ingredients(jsonb) from public,anon;
grant execute on function public.pensefit_consume_ingredients(jsonb) to authenticated;
`;
fs.mkdirSync('supabase',{recursive:true});fs.writeFileSync('supabase/platform.sql',sql);
console.log('Schema aditivo gerado: '+tables.length+' tabelas privadas, catálogo, Storage e RPCs.');
