const SUPABASE_URL = "https://rkbwcmeqdwuewqeokfas.supabase.co";
const SUPABASE_ANON_KEY = "seldenhumaozan198320142015";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
