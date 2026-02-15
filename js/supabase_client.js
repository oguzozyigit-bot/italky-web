const SUPABASE_URL = "https://rkbwcmeqdwuewqeokfas.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Xh1B9xUhmHCV6A3ffgeIrg_yO6uTX0t";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
