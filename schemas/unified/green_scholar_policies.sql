-- Enable RLS and add policies for Green Scholar unified objects

-- Scholars registry
do $$ begin
  alter table public.scholars enable row level security;
exception when others then perform 1; end $$;

do $$ begin
  create policy scholars_select_authenticated on public.scholars
    for select using (auth.uid() is not null);
exception when duplicate_object then perform 1; end $$;

-- Disbursements (add FK for embed and enable RLS)
do $$ begin
  alter table public.green_scholar_disbursements add constraint green_scholar_disbursements_scholar_id_fkey
    foreign key (scholar_id) references public.scholars(id) on delete restrict;
exception when duplicate_object then perform 1; end $$;

do $$ begin
  alter table public.green_scholar_disbursements enable row level security;
exception when others then perform 1; end $$;

do $$ begin
  create policy gs_disbursements_select_authenticated on public.green_scholar_disbursements
    for select using (auth.uid() is not null);
exception when duplicate_object then perform 1; end $$;

-- Transactions and fund balance
do $$ begin
  alter table public.green_scholar_transactions enable row level security;
exception when others then perform 1; end $$;

do $$ begin
  create policy gs_tx_select_authenticated on public.green_scholar_transactions
    for select using (auth.uid() is not null);
exception when duplicate_object then perform 1; end $$;

do $$ begin
  alter table public.green_scholar_fund_balance enable row level security;
exception when others then perform 1; end $$;

do $$ begin
  create policy gs_balance_select_authenticated on public.green_scholar_fund_balance
    for select using (auth.uid() is not null);
exception when duplicate_object then perform 1; end $$;

-- Note: green_scholar_monthly_breakdown is a view. RLS is enforced on its base tables
-- (green_scholar_transactions), which we permitted above for authenticated users.


