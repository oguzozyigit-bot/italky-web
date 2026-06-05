-- Keep auth profile trigger functions SECURITY DEFINER.
--
-- These functions run during auth.users insert. If they are changed to
-- SECURITY INVOKER, new Google signups can fail with:
-- "Database error saving new user".
--
-- Supabase Security Advisor warnings for these functions are accepted as a
-- deliberate exception because the trigger flow needs definer privileges.

do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'ensure_profile',
        'ensure_profile_for_auth_user',
        'ensure_chat_persona_profile'
      )
  loop
    execute format(
      'alter function %I.%I(%s) security definer',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );

    execute format(
      'comment on function %I.%I(%s) is %L',
      fn.schema_name,
      fn.function_name,
      fn.identity_args,
      'Intentional SECURITY DEFINER: required by auth.users insert triggers for Google signup profile creation. Do not change to SECURITY INVOKER.'
    );
  end loop;
end $$;
