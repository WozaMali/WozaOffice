-- Admin session events for superadmin reporting
create table if not exists public.admin_session_events (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	event_type text not null check (event_type in ('login','logout','soft_logout','unlock')),
	reason text,
	created_at timestamptz not null default now()
);

-- Default user_id from current auth context so clients can omit it
alter table public.admin_session_events
	alter column user_id set default auth.uid();

alter table public.admin_session_events enable row level security;

-- Admins can insert their own events
drop policy if exists "admins insert own session events" on public.admin_session_events;
create policy "admins insert own session events"
	on public.admin_session_events for insert
	with check (auth.uid() = user_id);

-- Superadmin can read all; users can read own
drop policy if exists "users view own session events" on public.admin_session_events;
create policy "users view own session events"
	on public.admin_session_events for select
	using (auth.uid() = user_id);

-- Optional: grant select to a superadmin role via DB role if used
-- Otherwise, build a PostgREST RPC or Supabase function for superadmin dashboard that bypasses RLS

-- Secure RPC to allow superadmins to read all events (bypasses RLS)
create or replace function public.get_admin_session_events(p_limit integer default 200)
returns setof public.admin_session_events
language sql
security definer
set search_path = public
as $$
  with caller as (
    select u.id as user_id,
           coalesce(r.name, p.role) as role_name
    from auth.users u
    left join public.users uu on uu.id = u.id
    left join public.roles r on r.id = uu.role_id
    left join public.profiles p on p.id = u.id
    where u.id = auth.uid()
  )
  select e.*
  from public.admin_session_events e
  where (select role_name from caller) in ('superadmin','super_admin','ADMIN','admin')
  order by e.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_admin_session_events(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Helper RPCs to log session events (logout, soft_logout, etc.) using auth.uid()
-- ---------------------------------------------------------------------------

create or replace function public.log_admin_session_event(
	p_event_type text,
	p_reason text default null
)
returns public.admin_session_events
language plpgsql
security definer
set search_path = public
as $$
declare
	v_row public.admin_session_events;
begin
	-- Ensure caller is authenticated
	if auth.uid() is null then
		raise exception 'Not authenticated';
	end if;

	-- Enforce allowed event types
	if p_event_type not in ('login','logout','soft_logout','unlock') then
		raise exception 'Invalid event_type: %', p_event_type;
	end if;

	insert into public.admin_session_events(user_id, event_type, reason)
	values (auth.uid(), p_event_type, p_reason)
	returning * into v_row;

	return v_row;
end;
$$;

grant execute on function public.log_admin_session_event(text, text) to authenticated;

-- Convenience wrappers
create or replace function public.log_signout(p_reason text default null)
returns public.admin_session_events
language sql
security definer
set search_path = public
as $$
  select * from public.log_admin_session_event('logout', p_reason);
$$;

grant execute on function public.log_signout(text) to authenticated;

create or replace function public.log_soft_signout(p_reason text default null)
returns public.admin_session_events
language sql
security definer
set search_path = public
as $$
  select * from public.log_admin_session_event('soft_logout', p_reason);
$$;

grant execute on function public.log_soft_signout(text) to authenticated;
