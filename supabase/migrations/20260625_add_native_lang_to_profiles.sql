-- Add native_lang column to profiles table
-- Stores the user's selected native/mother tongue language code (e.g. 'tr', 'en', 'de')
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS native_lang TEXT DEFAULT NULL;

-- Index for potential queries filtering by native_lang
CREATE INDEX IF NOT EXISTS idx_profiles_native_lang ON profiles(native_lang);
