-- Green Scholar Fund Balance snapshot with trigger-based maintenance
-- Idempotent: safe to run multiple times

-- 1) Table
create table if not exists public.green_scholar_fund_balance (
  id uuid primary key default gen_random_uuid(),
  total_balance numeric(12,2) not null default 0,
  pet_donations_total numeric(12,2) not null default 0,
  direct_donations_total numeric(12,2) not null default 0,
  expenses_total numeric(12,2) not null default 0,
  last_updated timestamptz not null default now()
);

-- Ensure a single snapshot row exists (deterministic id)
do $$
begin
  if not exists (select 1 from public.green_scholar_fund_balance) then
    insert into public.green_scholar_fund_balance (
      id, total_balance, pet_donations_total, direct_donations_total, expenses_total, last_updated
    ) values (
      '11111111-1111-1111-1111-111111111111', 0, 0, 0, 0, now()
    );
  end if;
end $$;

-- 2) Recompute function (authoritative from transactions)
create or replace function public.refresh_green_scholar_fund_balance()
returns void
language plpgsql
security definer
as $$
declare
  v_pet numeric(12,2) := 0;
  v_direct numeric(12,2) := 0;
  v_expenses numeric(12,2) := 0;
begin
  -- Sum inflows
  select coalesce(sum(amount),0) into v_pet
  from public.green_scholar_transactions
  where transaction_type in ('pet_contribution','pet_donation');

  select coalesce(sum(amount),0) into v_direct
  from public.green_scholar_transactions
  where transaction_type in ('donation','direct_donation');

  -- Sum outflows
  select coalesce(sum(amount),0) into v_expenses
  from public.green_scholar_transactions
  where transaction_type in ('distribution','expense');

  update public.green_scholar_fund_balance
  set pet_donations_total = v_pet,
      direct_donations_total = v_direct,
      expenses_total = v_expenses,
      total_balance = (v_pet + v_direct) - v_expenses,
      last_updated = now()
  where id = '11111111-1111-1111-1111-111111111111';
end;
$$;

-- 3) Trigger function wrapper (must return trigger)
create or replace function public.tg_refresh_green_scholar_fund_balance()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_green_scholar_fund_balance();
  return null; -- statement-level trigger
end;
$$;

-- 4) Trigger to refresh on changes to transactions
drop trigger if exists trg_refresh_green_scholar_fund_balance on public.green_scholar_transactions;
create trigger trg_refresh_green_scholar_fund_balance
after insert or update or delete on public.green_scholar_transactions
for each statement execute function public.tg_refresh_green_scholar_fund_balance();

-- Initial refresh
select public.refresh_green_scholar_fund_balance();


