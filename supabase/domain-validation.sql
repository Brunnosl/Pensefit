create function pensefit_private.valid_number(value jsonb,minimum numeric,maximum numeric,whole boolean default false) returns boolean language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(value)='number' then (value::text)::numeric between minimum and maximum and (not whole or trunc((value::text)::numeric)=(value::text)::numeric) else false end;
$$;
create function pensefit_private.valid_text(value jsonb,minimum integer,maximum integer) returns boolean language sql immutable security invoker set search_path='' as $$
 select case when jsonb_typeof(value)='string' then length(value#>>'{}') between minimum and maximum else false end;
$$;
revoke all on function pensefit_private.valid_number(jsonb,numeric,numeric,boolean),pensefit_private.valid_text(jsonb,integer,integer) from public,anon;
grant execute on function pensefit_private.valid_number(jsonb,numeric,numeric,boolean),pensefit_private.valid_text(jsonb,integer,integer) to authenticated;
create function pensefit_private.valid_record(kind text,payload jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb; key text;
begin
 if jsonb_typeof(payload)<>'object' then return false; end if;
 if kind='pantry' then return pensefit_private.valid_text(payload->'name',1,120) and pensefit_private.valid_number(payload->'quantity',0,100000) and payload->>'unit' in('g','kg','ml','l','un');
 elsif kind='hydration' then return pensefit_private.valid_number(payload->'ml',1,10000,true);
 elsif kind='sets' then return pensefit_private.valid_text(payload->'exercise',1,150) and pensefit_private.valid_number(payload->'weight',0,1000) and pensefit_private.valid_number(payload->'reps',1,1000,true) and pensefit_private.valid_number(payload->'rir',0,10) and pensefit_private.valid_number(payload->'exerciseIndex',0,100,true) and pensefit_private.valid_number(payload->'setIndex',0,9,true);
 elsif kind='measurements' then
  if not pensefit_private.valid_number(payload->'weight',30,250) then return false; end if;
  foreach key in array array['height','arm','chest','waist','abdomen','hip','thigh','calf'] loop if payload ? key and payload->key<>'null'::jsonb and not pensefit_private.valid_number(payload->key,1,250) then return false; end if; end loop; return true;
 elsif kind='recovery' then
  if not pensefit_private.valid_number(payload->'sleep',0,24) then return false; end if;
  foreach key in array array['quality','energy','fatigue','soreness','readiness'] loop if not pensefit_private.valid_number(payload->key,1,5,true) then return false; end if; end loop; return true;
 elsif kind='meal_logs' then
  if not pensefit_private.valid_text(payload->'name',1,120) or coalesce(payload->>'status','') not in('conforme','alterada','nao-realizada','pendente') then return false; end if;
  foreach key in array array['calories','protein','carbs','fat','fiber'] loop if not pensefit_private.valid_number(payload->key,0,50000) then return false; end if; end loop; return true;
 elsif kind='foods' then
  if not pensefit_private.valid_text(payload->'name',1,180) or not pensefit_private.valid_text(payload->'source',1,300) then return false; end if;
  foreach key in array array['calories','protein','carbs','fat'] loop if not pensefit_private.valid_number(payload->key,0,2000) then return false; end if; end loop; return true;
 elsif kind='workout_plans' or kind='sessions' then
  if not pensefit_private.valid_text(payload->'name',1,120) or jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 20 then return false; end if;
  for item in select value from jsonb_array_elements(payload->'items') loop if not pensefit_private.valid_text(item->'exercise',1,150) or not pensefit_private.valid_number(item->'sets',1,10,true) or not pensefit_private.valid_text(item->'reps',1,30) or not pensefit_private.valid_number(item->'rest',10,600,true) then return false; end if; end loop;
  if kind='sessions' and coalesce(payload->>'status','') not in('active','completed') then return false; end if; return true;
 elsif kind='nutrition_plans' then
  return pensefit_private.valid_text(payload->'name',1,120) and jsonb_typeof(payload->'meals')='array' and jsonb_array_length(payload->'meals')<=12;
 elsif kind='shopping_lists' then
  if not pensefit_private.valid_text(payload->'name',1,120) or jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items')>500 then return false; end if;
  for item in select value from jsonb_array_elements(payload->'items') loop if not pensefit_private.valid_text(item->'name',1,120) or not pensefit_private.valid_number(item->'quantity',.1,100000) or coalesce(item->>'unit','') not in('g','kg','ml','l','un') then return false; end if; end loop; return true;
 elsif kind='recipes' then return pensefit_private.valid_text(payload->'name',1,120) and pensefit_private.valid_number(payload->'minutes',1,360,true) and pensefit_private.valid_number(payload->'servings',1,20,true) and jsonb_typeof(payload->'ingredients')='array' and jsonb_array_length(payload->'ingredients') between 1 and 50 and jsonb_typeof(payload->'steps')='array';
 elsif kind='wods' then return pensefit_private.valid_text(payload->'name',1,120) and payload->>'mode' in('AMRAP','EMOM','For Time','Tabata','Intervalos','Stopwatch','Countdown') and pensefit_private.valid_number(payload->'duration',10,14400,true) and payload->>'variant' in('RX','Scaled','Beginner') and jsonb_typeof(payload->'movements')='array';
 elsif kind='wod_results' then return pensefit_private.valid_text(payload->'name',1,120) and payload->>'variant' in('RX','Scaled','Beginner') and pensefit_private.valid_number(payload->'seconds',0,86400) and pensefit_private.valid_number(payload->'rounds',0,10000,true) and pensefit_private.valid_number(payload->'extraReps',0,100000,true) and pensefit_private.valid_number(payload->'penaltySeconds',0,3600);
 elsif kind='pr_records' then return pensefit_private.valid_text(payload->'exercise',1,150) and pensefit_private.valid_number(payload->'weight',0,1000) and pensefit_private.valid_number(payload->'reps',1,20,true);
 elsif kind='skills' then return pensefit_private.valid_text(payload->'name',1,120) and pensefit_private.valid_number(payload->'level',0,4,true);
 elsif kind='calendar' then return pensefit_private.valid_text(payload->'title',1,120) and payload->>'modality' in('Musculação','CrossFit','Calistenia','Treinos em casa','Treinamento híbrido','Descanso','Recuperação');
 elsif kind='integrations' then return pensefit_private.valid_text(payload->'externalId',1,180) and pensefit_private.valid_text(payload->'source',1,120) and pensefit_private.valid_number(payload->'distanceMeters',0,10000000) and pensefit_private.valid_number(payload->'durationSeconds',0,864000);
 elsif kind='ai_conversations' then return pensefit_private.valid_text(payload->'title',1,120) and jsonb_typeof(payload->'messages')='array';
 elsif kind='photos' then return pensefit_private.valid_text(payload->'path',1,500) and payload->>'angle' in('front','side','back');
 else return true;
 end if;
end;$$;
revoke all on function pensefit_private.valid_record(text,jsonb) from public,anon;
grant execute on function pensefit_private.valid_record(text,jsonb) to authenticated;
do $$
declare kind text;
begin
 foreach kind in array array['preferences','workout_plans','sessions','sets','measurements','photos','foods','pantry','recipes','meal_plans','shopping_lists','nutrition_plans','meal_logs','hydration','recovery','calendar','ai_conversations','reports','integrations','wods','wod_results','skills','pr_records'] loop
 execute format('alter table public.%I add constraint %I check(coalesce(pensefit_private.valid_record(%L,data),false)) not valid','pensefit_'||kind,'pensefit_'||kind||'_domain_check',kind);
 end loop;
end;$$;
alter table public.pensefit_sets add constraint pensefit_set_needs_session check(session_id is not null) not valid;
alter table public.pensefit_photos add constraint pensefit_photo_own_path check(data->>'path' like user_id::text||'/photos/%') not valid;
