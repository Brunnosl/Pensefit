-- Revoga também privilégios herdados do ALTER DEFAULT PRIVILEGES do projeto Supabase.
do $$
declare kind text;
begin
 foreach kind in array array['preferences','workout_plans','sessions','sets','measurements','photos','foods','pantry','recipes','meal_plans','shopping_lists','nutrition_plans','meal_logs','hydration','recovery','calendar','ai_conversations','reports','integrations','wods','wod_results','skills','pr_records'] loop
 execute format('revoke all on public.%I from authenticated','pensefit_'||kind);
 execute format('grant select,insert,update,delete on public.%I to authenticated','pensefit_'||kind);
 end loop;
end;$$;
revoke all on public.pensefit_catalog from authenticated;
grant select on public.pensefit_catalog to authenticated;
revoke all on public.pensefit_boxes,public.pensefit_box_members,public.pensefit_box_wods,public.pensefit_box_results,public.pensefit_coach_notes from authenticated;
grant select,insert,delete on public.pensefit_boxes to authenticated;
grant update(name,join_code) on public.pensefit_boxes to authenticated;
grant select,insert,delete on public.pensefit_box_members to authenticated;
grant update(alias,share_training) on public.pensefit_box_members to authenticated;
grant select,insert,update,delete on public.pensefit_box_wods to authenticated;
grant select,insert,delete on public.pensefit_box_results to authenticated;
grant select,insert,delete on public.pensefit_coach_notes to authenticated;
