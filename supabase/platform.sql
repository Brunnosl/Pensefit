-- Migração aditiva: não modifica dados da versão anterior.
create schema if not exists pensefit_private;
revoke all on schema pensefit_private from public,anon;
grant usage on schema pensefit_private to authenticated;

create function public.pensefit_stamp_record() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.id:=old.id; new.user_id:=old.user_id; new.created_at:=old.created_at;
 new.revision:=old.revision+1; new.updated_at:=now(); return new;
end;$$;
revoke all on function public.pensefit_stamp_record() from public,anon,authenticated;

create table public.pensefit_preferences (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_preferences_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 , unique(user_id)
);
create index pensefit_preferences_user_date_idx on public.pensefit_preferences(user_id,date desc);
alter table public.pensefit_preferences enable row level security;
revoke all on public.pensefit_preferences from anon;
grant select,insert,update,delete on public.pensefit_preferences to authenticated;
create policy pensefit_preferences_own on public.pensefit_preferences for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_preferences_stamp before update on public.pensefit_preferences for each row execute function public.pensefit_stamp_record();

create table public.pensefit_workout_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_workout_plans_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_workout_plans_user_date_idx on public.pensefit_workout_plans(user_id,date desc);
alter table public.pensefit_workout_plans enable row level security;
revoke all on public.pensefit_workout_plans from anon;
grant select,insert,update,delete on public.pensefit_workout_plans to authenticated;
create policy pensefit_workout_plans_own on public.pensefit_workout_plans for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_workout_plans_stamp before update on public.pensefit_workout_plans for each row execute function public.pensefit_stamp_record();

create table public.pensefit_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_sessions_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_sessions_user_date_idx on public.pensefit_sessions(user_id,date desc);
alter table public.pensefit_sessions enable row level security;
revoke all on public.pensefit_sessions from anon;
grant select,insert,update,delete on public.pensefit_sessions to authenticated;
create policy pensefit_sessions_own on public.pensefit_sessions for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_sessions_stamp before update on public.pensefit_sessions for each row execute function public.pensefit_stamp_record();

create table public.pensefit_sets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_sets_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 and data ?& array['exercise','weight','reps','rir'] and jsonb_typeof(data->'weight')='number' and (data->>'weight')::numeric between 0 and 1000 and (data->>'reps')::numeric between 1 and 1000 and (data->>'rir')::numeric between 0 and 10)
 
);
create index pensefit_sets_user_date_idx on public.pensefit_sets(user_id,date desc);
alter table public.pensefit_sets enable row level security;
revoke all on public.pensefit_sets from anon;
grant select,insert,update,delete on public.pensefit_sets to authenticated;
create policy pensefit_sets_own on public.pensefit_sets for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_sets_stamp before update on public.pensefit_sets for each row execute function public.pensefit_stamp_record();

create table public.pensefit_measurements (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_measurements_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 and jsonb_typeof(data->'weight')='number' and (data->>'weight')::numeric between 30 and 250)
 
);
create index pensefit_measurements_user_date_idx on public.pensefit_measurements(user_id,date desc);
alter table public.pensefit_measurements enable row level security;
revoke all on public.pensefit_measurements from anon;
grant select,insert,update,delete on public.pensefit_measurements to authenticated;
create policy pensefit_measurements_own on public.pensefit_measurements for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_measurements_stamp before update on public.pensefit_measurements for each row execute function public.pensefit_stamp_record();

create table public.pensefit_photos (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_photos_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_photos_user_date_idx on public.pensefit_photos(user_id,date desc);
alter table public.pensefit_photos enable row level security;
revoke all on public.pensefit_photos from anon;
grant select,insert,update,delete on public.pensefit_photos to authenticated;
create policy pensefit_photos_own on public.pensefit_photos for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_photos_stamp before update on public.pensefit_photos for each row execute function public.pensefit_stamp_record();

create table public.pensefit_foods (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_foods_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_foods_user_date_idx on public.pensefit_foods(user_id,date desc);
alter table public.pensefit_foods enable row level security;
revoke all on public.pensefit_foods from anon;
grant select,insert,update,delete on public.pensefit_foods to authenticated;
create policy pensefit_foods_own on public.pensefit_foods for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_foods_stamp before update on public.pensefit_foods for each row execute function public.pensefit_stamp_record();

create table public.pensefit_pantry (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_pantry_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 and data ?& array['name','quantity','unit'] and jsonb_typeof(data->'quantity')='number' and (data->>'quantity')::numeric between 0 and 100000 and data->>'unit' in ('g','kg','ml','l','un'))
 
);
create index pensefit_pantry_user_date_idx on public.pensefit_pantry(user_id,date desc);
alter table public.pensefit_pantry enable row level security;
revoke all on public.pensefit_pantry from anon;
grant select,insert,update,delete on public.pensefit_pantry to authenticated;
create policy pensefit_pantry_own on public.pensefit_pantry for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_pantry_stamp before update on public.pensefit_pantry for each row execute function public.pensefit_stamp_record();

create table public.pensefit_recipes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_recipes_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_recipes_user_date_idx on public.pensefit_recipes(user_id,date desc);
alter table public.pensefit_recipes enable row level security;
revoke all on public.pensefit_recipes from anon;
grant select,insert,update,delete on public.pensefit_recipes to authenticated;
create policy pensefit_recipes_own on public.pensefit_recipes for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_recipes_stamp before update on public.pensefit_recipes for each row execute function public.pensefit_stamp_record();

create table public.pensefit_meal_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_meal_plans_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_meal_plans_user_date_idx on public.pensefit_meal_plans(user_id,date desc);
alter table public.pensefit_meal_plans enable row level security;
revoke all on public.pensefit_meal_plans from anon;
grant select,insert,update,delete on public.pensefit_meal_plans to authenticated;
create policy pensefit_meal_plans_own on public.pensefit_meal_plans for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_meal_plans_stamp before update on public.pensefit_meal_plans for each row execute function public.pensefit_stamp_record();

create table public.pensefit_shopping_lists (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_shopping_lists_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_shopping_lists_user_date_idx on public.pensefit_shopping_lists(user_id,date desc);
alter table public.pensefit_shopping_lists enable row level security;
revoke all on public.pensefit_shopping_lists from anon;
grant select,insert,update,delete on public.pensefit_shopping_lists to authenticated;
create policy pensefit_shopping_lists_own on public.pensefit_shopping_lists for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_shopping_lists_stamp before update on public.pensefit_shopping_lists for each row execute function public.pensefit_stamp_record();

create table public.pensefit_nutrition_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_nutrition_plans_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_nutrition_plans_user_date_idx on public.pensefit_nutrition_plans(user_id,date desc);
alter table public.pensefit_nutrition_plans enable row level security;
revoke all on public.pensefit_nutrition_plans from anon;
grant select,insert,update,delete on public.pensefit_nutrition_plans to authenticated;
create policy pensefit_nutrition_plans_own on public.pensefit_nutrition_plans for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_nutrition_plans_stamp before update on public.pensefit_nutrition_plans for each row execute function public.pensefit_stamp_record();

create table public.pensefit_meal_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_meal_logs_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 and data->>'status' in ('conforme','alterada','nao-realizada','pendente') and (data->>'calories')::numeric between 0 and 50000)
 
);
create index pensefit_meal_logs_user_date_idx on public.pensefit_meal_logs(user_id,date desc);
alter table public.pensefit_meal_logs enable row level security;
revoke all on public.pensefit_meal_logs from anon;
grant select,insert,update,delete on public.pensefit_meal_logs to authenticated;
create policy pensefit_meal_logs_own on public.pensefit_meal_logs for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_meal_logs_stamp before update on public.pensefit_meal_logs for each row execute function public.pensefit_stamp_record();

create table public.pensefit_hydration (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_hydration_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 and jsonb_typeof(data->'ml')='number' and (data->>'ml')::numeric between 1 and 10000)
 
);
create index pensefit_hydration_user_date_idx on public.pensefit_hydration(user_id,date desc);
alter table public.pensefit_hydration enable row level security;
revoke all on public.pensefit_hydration from anon;
grant select,insert,update,delete on public.pensefit_hydration to authenticated;
create policy pensefit_hydration_own on public.pensefit_hydration for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_hydration_stamp before update on public.pensefit_hydration for each row execute function public.pensefit_stamp_record();

create table public.pensefit_recovery (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_recovery_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 and (data->>'sleep')::numeric between 0 and 24)
 
);
create index pensefit_recovery_user_date_idx on public.pensefit_recovery(user_id,date desc);
alter table public.pensefit_recovery enable row level security;
revoke all on public.pensefit_recovery from anon;
grant select,insert,update,delete on public.pensefit_recovery to authenticated;
create policy pensefit_recovery_own on public.pensefit_recovery for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_recovery_stamp before update on public.pensefit_recovery for each row execute function public.pensefit_stamp_record();

create table public.pensefit_calendar (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_calendar_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_calendar_user_date_idx on public.pensefit_calendar(user_id,date desc);
alter table public.pensefit_calendar enable row level security;
revoke all on public.pensefit_calendar from anon;
grant select,insert,update,delete on public.pensefit_calendar to authenticated;
create policy pensefit_calendar_own on public.pensefit_calendar for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_calendar_stamp before update on public.pensefit_calendar for each row execute function public.pensefit_stamp_record();

create table public.pensefit_ai_conversations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_ai_conversations_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_ai_conversations_user_date_idx on public.pensefit_ai_conversations(user_id,date desc);
alter table public.pensefit_ai_conversations enable row level security;
revoke all on public.pensefit_ai_conversations from anon;
grant select,insert,update,delete on public.pensefit_ai_conversations to authenticated;
create policy pensefit_ai_conversations_own on public.pensefit_ai_conversations for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_ai_conversations_stamp before update on public.pensefit_ai_conversations for each row execute function public.pensefit_stamp_record();

create table public.pensefit_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_reports_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_reports_user_date_idx on public.pensefit_reports(user_id,date desc);
alter table public.pensefit_reports enable row level security;
revoke all on public.pensefit_reports from anon;
grant select,insert,update,delete on public.pensefit_reports to authenticated;
create policy pensefit_reports_own on public.pensefit_reports for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_reports_stamp before update on public.pensefit_reports for each row execute function public.pensefit_stamp_record();

create table public.pensefit_integrations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_integrations_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_integrations_user_date_idx on public.pensefit_integrations(user_id,date desc);
alter table public.pensefit_integrations enable row level security;
revoke all on public.pensefit_integrations from anon;
grant select,insert,update,delete on public.pensefit_integrations to authenticated;
create policy pensefit_integrations_own on public.pensefit_integrations for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_integrations_stamp before update on public.pensefit_integrations for each row execute function public.pensefit_stamp_record();

create table public.pensefit_wods (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_wods_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_wods_user_date_idx on public.pensefit_wods(user_id,date desc);
alter table public.pensefit_wods enable row level security;
revoke all on public.pensefit_wods from anon;
grant select,insert,update,delete on public.pensefit_wods to authenticated;
create policy pensefit_wods_own on public.pensefit_wods for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_wods_stamp before update on public.pensefit_wods for each row execute function public.pensefit_stamp_record();

create table public.pensefit_wod_results (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_wod_results_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 and data->>'variant' in ('RX','Scaled','Beginner') and (data->>'seconds')::numeric between 0 and 86400)
 
);
create index pensefit_wod_results_user_date_idx on public.pensefit_wod_results(user_id,date desc);
alter table public.pensefit_wod_results enable row level security;
revoke all on public.pensefit_wod_results from anon;
grant select,insert,update,delete on public.pensefit_wod_results to authenticated;
create policy pensefit_wod_results_own on public.pensefit_wod_results for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_wod_results_stamp before update on public.pensefit_wod_results for each row execute function public.pensefit_stamp_record();

create table public.pensefit_skills (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_skills_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 )
 
);
create index pensefit_skills_user_date_idx on public.pensefit_skills(user_id,date desc);
alter table public.pensefit_skills enable row level security;
revoke all on public.pensefit_skills from anon;
grant select,insert,update,delete on public.pensefit_skills to authenticated;
create policy pensefit_skills_own on public.pensefit_skills for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_skills_stamp before update on public.pensefit_skills for each row execute function public.pensefit_stamp_record();

create table public.pensefit_pr_records (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 date date not null default current_date, data jsonb not null,
 revision bigint not null default 0 check(revision>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint pensefit_pr_records_data_valid check(jsonb_typeof(data)='object' and octet_length(data::text)<=1048576 and (data->>'weight')::numeric between 0 and 1000 and (data->>'reps')::numeric between 1 and 20)
 
);
create index pensefit_pr_records_user_date_idx on public.pensefit_pr_records(user_id,date desc);
alter table public.pensefit_pr_records enable row level security;
revoke all on public.pensefit_pr_records from anon;
grant select,insert,update,delete on public.pensefit_pr_records to authenticated;
create policy pensefit_pr_records_own on public.pensefit_pr_records for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create trigger pensefit_pr_records_stamp before update on public.pensefit_pr_records for each row execute function public.pensefit_stamp_record();

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
