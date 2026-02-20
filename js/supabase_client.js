// FILE: /js/supabase_client.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://rkbwcmeqdwuewqeokfas.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Xh1B9xUhmHCV6A3ffgeIrg_yO6uTX0t";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// DEBUG: Console’dan erişmek için
if (typeof window !== "undefined") {
  window.supabase = supabase;
}
