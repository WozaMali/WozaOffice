-- Demo data for Green Scholar Fund (safe/idempotent-ish)
-- 1) Insert demo scholars
insert into public.scholars (id, name, school, grade, region)
select gen_random_uuid(), v.name, v.school, v.grade, v.region
from (values
  ('Ayanda M.', 'Langa High', 'Grade 9', 'Cape Town'),
  ('Thabo K.', 'Soweto Primary', 'Grade 6', 'Johannesburg'),
  ('Naledi P.', 'Durban Central School', 'Grade 8', 'Durban')
) as v(name, school, grade, region)
on conflict do nothing;

-- 2) Insert a small direct donation
insert into public.green_scholar_transactions (transaction_type, amount, source_type, description)
values ('donation', 250.00, 'demo', 'Demo direct donation')
on conflict do nothing;

-- 3) Insert a PET contribution (represents approved collection revenue to fund)
insert into public.green_scholar_transactions (transaction_type, amount, source_type, description)
values ('pet_contribution', 150.00, 'demo', 'Demo PET contribution')
on conflict do nothing;

-- 4) Small distribution to first scholar (if exists)
do $$
declare sid uuid;
begin
  select id into sid from public.scholars order by created_at asc limit 1;
  if sid is not null then
    insert into public.green_scholar_transactions (transaction_type, amount, beneficiary_type, beneficiary_id, description)
    values ('distribution', 100.00, 'scholar', sid, 'Demo distribution');
  end if;
end$$;


