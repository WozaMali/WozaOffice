-- Check user_wallets table structure
SELECT 'User wallets table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_wallets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what data exists in user_wallets
SELECT 'Sample user_wallets data:' as info;
SELECT * FROM public.user_wallets LIMIT 5;
