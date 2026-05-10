-- italkyAI promo code system
-- Apply this file in Supabase SQL editor before using the new promo code flow.

create extension if not exists pgcrypto;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  duration_days integer not null,
  status text not null default 'active',
  assigned_to uuid null,
  assigned_email text null,
  used_by uuid null,
  used_email text null,
  used_at timestamptz null,
  expires_at timestamptz null,
  created_by uuid null,
  created_at timestamptz default now(),
  note text null,
  constraint promo_codes_status_check check (status in ('active','used','expired','cancelled')),
  constraint promo_codes_duration_days_check check (duration_days in (30,90,180,365)),
  constraint promo_codes_format_check check (
    code ~ '^[A-Z0-9]{8}$'
    and length(regexp_replace(code, '[^A-Z]', '', 'g')) = 2
    and length(regexp_replace(code, '[^0-9]', '', 'g')) = 6
    and not regexp_replace(code, '[^A-Z]', '', 'g') in ('AK','FG','FB','GS')
  )
);

create index if not exists promo_codes_status_idx on public.promo_codes(status);
create index if not exists promo_codes_used_by_idx on public.promo_codes(used_by);
create index if not exists promo_codes_created_at_idx on public.promo_codes(created_at desc);

alter table public.promo_codes enable row level security;

-- Keep policies conservative. Adjust admin role checks if your project uses a different role column.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'promo_codes' and policyname = 'promo_codes_user_read_own'
  ) then
    create policy promo_codes_user_read_own on public.promo_codes
      for select
      using (
        auth.uid() = assigned_to
        or auth.uid() = used_by
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and lower(coalesce(p.role, '')) in ('admin','superadmin')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'promo_codes' and policyname = 'promo_codes_admin_all'
  ) then
    create policy promo_codes_admin_all on public.promo_codes
      for all
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and lower(coalesce(p.role, '')) in ('admin','superadmin')
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and lower(coalesce(p.role, '')) in ('admin','superadmin')
        )
      );
  end if;
end $$;

create or replace function public.redeem_promo_code_v1(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Z0-9]', '', 'g'));
  v_row public.promo_codes%rowtype;
  v_now timestamptz := now();
  v_expires_at timestamptz;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'AUTH_REQUIRED');
  end if;

  select email into v_email from auth.users where id = v_user_id;

  select * into v_row
  from public.promo_codes
  where code = v_code
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'PROMO_NOT_FOUND');
  end if;

  if v_row.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'PROMO_NOT_ACTIVE');
  end if;

  if v_row.used_at is not null or v_row.used_by is not null then
    return jsonb_build_object('ok', false, 'reason', 'PROMO_ALREADY_USED');
  end if;

  if v_row.assigned_to is not null and v_row.assigned_to <> v_user_id then
    return jsonb_build_object('ok', false, 'reason', 'PROMO_ASSIGNED_TO_ANOTHER_USER');
  end if;

  if v_row.assigned_email is not null and lower(v_row.assigned_email) <> lower(coalesce(v_email, '')) then
    return jsonb_build_object('ok', false, 'reason', 'PROMO_ASSIGNED_TO_ANOTHER_EMAIL');
  end if;

  if v_row.expires_at is not null and v_row.expires_at < v_now then
    update public.promo_codes set status = 'expired' where id = v_row.id;
    return jsonb_build_object('ok', false, 'reason', 'PROMO_EXPIRED');
  end if;

  v_expires_at := v_now + make_interval(days => v_row.duration_days);

  update public.promo_codes
  set status = 'used',
      used_by = v_user_id,
      used_email = v_email,
      used_at = v_now,
      expires_at = v_expires_at
  where id = v_row.id;

  -- Best-effort bridge to the existing access/profile system. Columns are checked first so older schemas do not fail.
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'package_ends_at') then
      execute 'update public.profiles set package_ends_at = $1 where id = $2' using v_expires_at, v_user_id;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'package_code') then
      execute 'update public.profiles set package_code = $1 where id = $2' using 'promo_code', v_user_id;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'membership_status') then
      execute 'update public.profiles set membership_status = $1 where id = $2' using 'active', v_user_id;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'membership_source') then
      execute 'update public.profiles set membership_source = $1 where id = $2' using 'promo_code', v_user_id;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'membership_product_id') then
      execute 'update public.profiles set membership_product_id = $1 where id = $2' using 'promo_code', v_user_id;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'membership_started_at') then
      execute 'update public.profiles set membership_started_at = $1 where id = $2' using v_now, v_user_id;
    end if;

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'membership_ends_at') then
      execute 'update public.profiles set membership_ends_at = $1 where id = $2' using v_expires_at, v_user_id;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', v_code,
    'duration_days', v_row.duration_days,
    'expires_at', v_expires_at
  );
end;
$$;

grant execute on function public.redeem_promo_code_v1(text) to authenticated;
