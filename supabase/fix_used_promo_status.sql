-- Cleanup: mark already-exhausted web_promo_codes rows as 'used'
-- Run once in Supabase SQL editor.

-- 1. Codes where used_count has reached max_uses but status is still 'active'
UPDATE public.web_promo_codes
SET status = 'used'
WHERE status = 'active'
  AND max_uses > 0
  AND used_count >= max_uses;

-- 2. Codes marked is_used = true but status still 'active'
UPDATE public.web_promo_codes
SET status = 'used'
WHERE status = 'active'
  AND is_used = true;

-- 3. Single-use codes (max_uses = 1) with at least one use
UPDATE public.web_promo_codes
SET status = 'used'
WHERE status = 'active'
  AND max_uses = 1
  AND used_count >= 1;
