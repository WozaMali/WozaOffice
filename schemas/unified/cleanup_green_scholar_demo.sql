-- CLEAN UP DEMO GREEN SCHOLAR DATA (safe and idempotent)
-- Run this to remove rows created by seed_green_scholar_demo.sql

begin;

-- 1) Remove demo Green Scholar transactions
-- Matches rows inserted by the demo seed (source_type = 'demo' or description contains 'Demo')
delete from public.green_scholar_transactions
where source_type = 'demo'
   or description ilike '%demo%';

-- 2) Remove demo disbursements (if any were created referencing demo scholars)
delete from public.green_scholar_disbursements d
using public.scholars s
where d.scholar_id = s.id
  and s.name in ('Ayanda M.', 'Thabo K.', 'Naledi P.');

-- 3) Remove demo scholars inserted by the seed
delete from public.scholars
where name in ('Ayanda M.', 'Thabo K.', 'Naledi P.');

-- 4) Optional: Verify remaining rows (uncomment to view)
-- select 'Transactions remaining' as section, count(*) from public.green_scholar_transactions;
-- select 'Scholars remaining' as section, count(*) from public.scholars;
-- select * from public.green_scholar_transactions order by created_at desc limit 10;

commit;


