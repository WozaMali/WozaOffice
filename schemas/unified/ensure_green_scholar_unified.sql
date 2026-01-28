-- Ensure unified Green Scholar tables exist (idempotent)

do $$ begin
  if not exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='green_scholar_fund_balance'
  ) then
    create table public.green_scholar_fund_balance (
      id uuid primary key default gen_random_uuid(),
      total_balance numeric(12,2) not null default 0,
      total_contributions numeric(12,2) not null default 0,
      total_distributions numeric(12,2) not null default 0,
      pet_donations_total numeric(12,2) not null default 0,
      direct_donations_total numeric(12,2) not null default 0,
      expenses_total numeric(12,2) not null default 0,
      last_updated timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
exception when others then perform 1; end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='green_scholar_transactions'
  ) then
    create table public.green_scholar_transactions (
      id uuid primary key default gen_random_uuid(),
      transaction_type text not null check (transaction_type in ('pet_contribution','donation','distribution','adjustment','pet_donation','direct_donation','expense')),
      amount numeric(12,2) not null default 0,
      source_type text,
      source_id uuid,
      beneficiary_type text,
      beneficiary_id uuid,
      description text,
      created_by uuid references public.users(id) on delete set null,
      created_at timestamptz not null default now()
    );
  end if;
exception when others then perform 1; end $$;

-- Scholars registry (optional write table used by Office App UI)
do $$ begin
  if not exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='scholars'
  ) then
    create table public.scholars (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      school text,
      grade text,
      region text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
exception when others then perform 1; end $$;

-- Optional disbursements table (fallback; unified ledger is primary)
do $$ begin
  if not exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='green_scholar_disbursements'
  ) then
    create table public.green_scholar_disbursements (
      id uuid primary key default gen_random_uuid(),
      scholar_id uuid not null,
      amount numeric(12,2) not null check (amount >= 0),
      purpose text,
      created_at timestamptz not null default now()
    );
  end if;
exception when others then perform 1; end $$;


