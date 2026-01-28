SELECT collection_id, material_name, quantity, unit_price, total_price FROM public.collection_materials WHERE collection_id IN (SELECT id FROM public.unified_collections WHERE status = 'pending');
