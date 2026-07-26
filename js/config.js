// FILE: italky-web/js/config.js
import "/js/site_language_boot.js";
import "/js/activation_session_guard.js";
import "/js/game_logo_patch.js";
import "/js/official_italky_ui_patch.js";
import "/js/logo_hotfix.js";
import "/js/profile_avatar_patch.js";

export const GOOGLE_CLIENT_ID =
  "300866462204-c76rl1eia9a4cuogehsuf2cm1uc08iov.apps.googleusercontent.com";

// ✅ ITALKY ayrı storage (Caynana ile karışmasın)
export const STORAGE_KEY = "italky_user_v1";

// ✅ BACKEND (Vercel)
export const BASE_DOMAIN = "https://italky-api.vercel.app";

// ✅ ORTAK DİL HAVUZU (Supabase Storage - Public Bucket: lang)
// Dosyalar: en.json, de.json, fr.json, es.json, it.json
export const LANGPOOL_BASE =
  "https://dzeemgfwzwkalrvjthps.supabase.co/storage/v1/object/public/lang";
