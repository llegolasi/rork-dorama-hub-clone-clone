-- ================================================================
-- SCRIPT TO BACKFILL DRAMA CATEGORIES FOR EXISTING RECORDS
-- ================================================================

-- This script will help identify records that need category updates
-- Since we can't directly call TMDB API from SQL, this provides the structure
-- for a manual or application-level backfill process

BEGIN;

-- First, let's see how many records are missing drama_category
SELECT 
    COUNT(*) as total_records,
    COUNT(drama_category) as records_with_category,
    COUNT(*) - COUNT(drama_category) as records_missing_category
FROM public.user_drama_lists;

-- Show some examples of records missing categories
SELECT 
    id,
    user_id,
    drama_id,
    drama_name,
    drama_category,
    list_type,
    created_at
FROM public.user_drama_lists 
WHERE drama_category IS NULL 
ORDER BY created_at DESC 
LIMIT 10;

-- Create a temporary function to help with manual updates
-- (This would typically be done by the application, not SQL)
CREATE OR REPLACE FUNCTION update_drama_category(
    p_drama_id INTEGER,
    p_category TEXT
) RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.user_drama_lists 
    SET 
        drama_category = p_category,
        updated_at = NOW()
    WHERE drama_id = p_drama_id 
    AND drama_category IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Updated % records for drama_id % with category %', updated_count, p_drama_id, p_category;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Example usage (uncomment and modify as needed):
-- SELECT update_drama_category(1, 'Drama');
-- SELECT update_drama_category(2, 'Romance');
-- SELECT update_drama_category(3, 'Thriller');

-- Get unique drama IDs that need category updates
SELECT DISTINCT 
    drama_id,
    drama_name,
    COUNT(*) as user_count
FROM public.user_drama_lists 
WHERE drama_category IS NULL 
GROUP BY drama_id, drama_name
ORDER BY user_count DESC, drama_id;

-- After running the application-level backfill, verify the results
-- SELECT 
--     COUNT(*) as total_records,
--     COUNT(drama_category) as records_with_category,
--     COUNT(*) - COUNT(drama_category) as records_missing_category
-- FROM public.user_drama_lists;

COMMIT;

-- Instructions for manual backfill:
-- 1. Run this script to see which drama IDs need categories
-- 2. Use the application to fetch genre information from TMDB for each drama_id
-- 3. Use the update_drama_category function to update records
-- 4. Or better yet, let the application handle this automatically when users interact with their lists

SELECT 'Drama category backfill script completed. Check the output above for records that need updates.' as status;