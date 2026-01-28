-- Unified monthly breakdown for Green Scholar Fund
-- PET revenue from collections + direct donations – distributions

create or replace view public.green_scholar_monthly_breakdown as
with base as (
  select date_trunc('month', created_at) as month,
         transaction_type,
         amount
  from public.green_scholar_transactions
), agg as (
  select month,
         sum(case when transaction_type in ('pet_contribution','pet_donation') then amount else 0 end) as pet_revenue,
         sum(case when transaction_type in ('donation','direct_donation') then amount else 0 end) as donations,
         sum(case when transaction_type in ('distribution','expense') then amount else 0 end) as distributions
  from base
  group by 1
)
select month,
       pet_revenue,
       donations,
       distributions,
       (pet_revenue + donations - distributions) as net_change
from agg
order by month desc;


