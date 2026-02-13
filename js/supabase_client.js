// FILE: /js/supabase_client.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://dzeemgfwzwkalryjthps.supabase.co",
  "sb_publishable_ZEtcwHtn_P2wB_cRX9OrKg_Z5R6PyXl",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // ✅ OAuth dönüş hash’ini session’a çevirir
    },
  }
);
