-- Green Scholar Applications table (learner/applicant submissions)
-- Idempotent

create table if not exists public.green_scholar_applications (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),

  full_name text not null,
  date_of_birth date,
  phone_number text,
  email text,
  id_number text,

  school_name text,
  grade text,
  student_number text,
  academic_performance text,

  household_income text,
  household_size text,
  employment_status text,
  other_income_sources text,

  support_type text[],
  urgent_needs text,
  previous_support text,

  has_id_document boolean default false,
  has_school_report boolean default false,
  has_income_proof boolean default false,
  has_bank_statement boolean default false,

  special_circumstances text,
  community_involvement text,
  references_info text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gsa_status on public.green_scholar_applications(status);
create index if not exists idx_gsa_created_at on public.green_scholar_applications(created_at desc);

-- RLS
alter table public.green_scholar_applications enable row level security;

do $$
begin
  -- Authenticated users can insert their own applications
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'green_scholar_applications' and policyname = 'gsa_insert_own'
  ) then
    create policy gsa_insert_own on public.green_scholar_applications
      for insert to authenticated
      with check (created_by = auth.uid());
  end if;

  -- Authenticated users can read their own applications
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'green_scholar_applications' and policyname = 'gsa_select_own'
  ) then
    create policy gsa_select_own on public.green_scholar_applications
      for select to authenticated
      using (created_by = auth.uid());
  end if;

  -- Admins (service role) read all; handled by service key in Office App
end $$;

-- Updated_at trigger
create or replace function public.tg_set_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists set_timestamp on public.green_scholar_applications;
create trigger set_timestamp before update on public.green_scholar_applications
for each row execute function public.tg_set_timestamp();


