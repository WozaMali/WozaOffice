-- ============================================================================
-- UPDATE MATERIALS - ALUMINIUM CANS
-- ============================================================================
-- This script updates the materials table to change metal to Aluminium Cans
-- with the rate per kg set to R18.55

-- First, add the missing columns if they don't exist
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'kg';

-- Update the existing metal material to Aluminium Cans with new rate
UPDATE public.materials 
SET 
    name = 'Aluminium Cans',
    category = 'Metal',
    rate_per_kg = 18.55,
    description = 'Clean aluminium beverage cans and containers',
    updated_at = NOW()
WHERE name = 'Aluminum Cans' OR name = 'Aluminium Cans' OR (category IS NOT NULL AND category = 'Metal');

-- If no metal material exists, insert the new Aluminium Cans material
INSERT INTO public.materials (
    name,
    category,
    unit,
    rate_per_kg,
    description,
    is_active
) 
SELECT 
    'Aluminium Cans',
    'Metal',
    'kg',
    18.55,
    'Clean aluminium beverage cans and containers',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.materials 
    WHERE name = 'Aluminium Cans' OR (category IS NOT NULL AND category = 'Metal')
);

-- Verify the update
SELECT 
    'Materials Update Verification' as test_type,
    id,
    name,
    COALESCE(category, 'N/A') as category,
    COALESCE(unit, 'kg') as unit,
    rate_per_kg,
    description,
    is_active,
    created_at,
    updated_at
FROM public.materials 
WHERE name = 'Aluminium Cans' OR (category IS NOT NULL AND category = 'Metal')
ORDER BY updated_at DESC;

-- Show all materials for reference
SELECT 
    'All Materials' as test_type,
    id,
    name,
    COALESCE(category, 'N/A') as category,
    COALESCE(unit, 'kg') as unit,
    rate_per_kg,
    description,
    is_active
FROM public.materials 
ORDER BY COALESCE(category, 'N/A'), name;
