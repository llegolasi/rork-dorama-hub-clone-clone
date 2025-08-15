-- Adjustments for drama reviews UX/logic
-- 1) Ensure rating is 0..10 so UI can map 1..5 stars to double
ALTER TABLE public.drama_reviews
  ALTER COLUMN rating TYPE DECIMAL(3,1);

-- 2) When user removes a drama from completed or watching, optionally cascade delete their reviews via RLS-safe function
CREATE OR REPLACE FUNCTION delete_user_review_if_exists(p_user UUID, p_drama INTEGER)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.drama_reviews
  WHERE user_id = p_user AND drama_id = p_drama;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Optional helper view to quickly fetch a user's review for a drama
CREATE OR REPLACE VIEW public.user_drama_review AS
SELECT id, user_id, drama_id, recommendation_type, review_text, rating, created_at, updated_at
FROM public.drama_reviews;
