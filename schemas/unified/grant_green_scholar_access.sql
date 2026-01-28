-- Ensure authenticated/anon can SELECT these objects through PostgREST

-- Schema usage
grant usage on schema public to authenticated;
grant usage on schema public to anon;

-- Tables
grant select on public.scholars to authenticated;
grant select on public.green_scholar_disbursements to authenticated;
grant select on public.green_scholar_transactions to authenticated;
grant select on public.green_scholar_fund_balance to authenticated;

-- Views
grant select on public.green_scholar_monthly_breakdown to authenticated;

-- Optionally allow anon (if you read without a session)
-- grant select on public.scholars to anon;
-- grant select on public.green_scholar_disbursements to anon;
-- grant select on public.green_scholar_transactions to anon;
-- grant select on public.green_scholar_fund_balance to anon;
-- grant select on public.green_scholar_monthly_breakdown to anon;


