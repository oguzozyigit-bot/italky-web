import { supabase } from "/js/supabase_client.js";
import { setHeaderTokens } from "/js/ui_shell.js";
import { STORAGE_KEY } from "/js/config.js";

function readCachedUser() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("italky_user") ||
      localStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      localStorage.getItem("italky_auth_user");

    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCachedTokens(tokens) {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("italky_user") ||
      localStorage.getItem("user") ||
      localStorage.getItem("auth_user") ||
      localStorage.getItem("italky_auth_user");

    const data = raw ? JSON.parse(raw) : {};
    data.tokens = Number(tokens || 0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export async function getLiveTokens() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;

    if (!user?.id) {
      const cached = readCachedUser();
      return Number(cached?.tokens || 0);
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile) {
      const cached = readCachedUser();
      return Number(cached?.tokens || 0);
    }

    const tokens = Number(profile.tokens || 0);
    try { setHeaderTokens(tokens); } catch {}
    writeCachedTokens(tokens);
    return tokens;
  } catch {
    const cached = readCachedUser();
    return Number(cached?.tokens || 0);
  }
}

export async function requireTokens({ needed = 1 } = {}) {
  const tokens = await getLiveTokens();
  return {
    ok: tokens >= needed,
    tokens
  };
}
