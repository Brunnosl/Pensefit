-- Somente o backend com service_role pode obter esta credencial do Vault.
-- O valor da chave nunca é incluído neste arquivo ou nas migrações.
create or replace function pensefit_private.gemini_api_secret() returns text
language sql security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='pensefit_gemini_api_key' limit 1;
$$;
revoke all on function pensefit_private.gemini_api_secret() from public,anon,authenticated;
grant usage on schema pensefit_private to service_role;
grant execute on function pensefit_private.gemini_api_secret() to service_role;
create or replace function public.pensefit_backend_gemini_secret() returns text
language sql security invoker set search_path='' as $$
 select pensefit_private.gemini_api_secret();
$$;
revoke all on function public.pensefit_backend_gemini_secret() from public,anon,authenticated;
grant execute on function public.pensefit_backend_gemini_secret() to service_role;
notify pgrst,'reload schema';
