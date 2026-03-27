import { supabase } from "/js/supabase_client.js";

/* CACHE */
const ACCESS_CACHE_KEY = "italky_access_gate_v1";
const ACCESS_CACHE_TTL_MS = 1000 * 60 * 5;

/* DEFAULT (BASIC USER) */
const DEFAULT_ACCESS = {
  source: "default",
  has_nfc: false,
  is_active: false,

  can_text_to_text: true,
  can_face_to_face: false,
  can_side_to_side: false,
  can_offline: false,
  can_practice: false,
  can_games: false,
  can_level_test: false
};

/* HELPERS */
function nowTs() {
  return Date.now();
}

function readCache() {
  try {
    const raw = localStorage.getItem(ACCESS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const ts = parsed?.ts || 0;

    if (nowTs() - ts > ACCESS_CACHE_TTL_MS) {
      localStorage.removeItem(ACCESS_CACHE_KEY);
      return null;
    }

    return parsed?.data || null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      ACCESS_CACHE_KEY,
      JSON.stringify({ ts: nowTs(), data })
    );
  } catch {}
}

/* 🔥 ANA SİLAH */
function removeIfNoAccess(id, allowed) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!allowed) el.remove();
}

/* DOM UYGULAMA */
function applyGateToDom(access) {
  const a = { ...DEFAULT_ACCESS, ...access };

  /* 🔥 TÜM MODÜLLERİ SİL */
  removeIfNoAccess("faceCard", a.can_face_to_face);
  removeIfNoAccess("offlineCard", a.can_offline);
  removeIfNoAccess("funCard", a.can_games);
  removeIfNoAccess("levelCard", a.can_level_test);
  removeIfNoAccess("practiceCard", a.can_practice);
  removeIfNoAccess("goSideToSide", a.can_side_to_side);

  /* TEXT HER ZAMAN AÇIK */
  // dokunmuyoruz

  /* PREMIUM BUTON */
  const box = document.getElementById("nfcUpgradeBox");
  if (box) {
    const showPremium =
      !a.can_face_to_face ||
      !a.can_side_to_side ||
      !a.can_offline;

    box.style.display = showPremium ? "" : "none";
  }

  return a;
}

/* USER */
async function getUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

/* PROFILE */
async function fetchProfile(userId) {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!data) return null;

    return {
      has_nfc: !!data.nfc_uid,
      is_active: data.nfc_active,

      can_text_to_text: data.can_text_to_text ?? true,
      can_face_to_face: data.can_face_to_face,
      can_side_to_side: data.can_side_to_side,
      can_offline: data.can_offline,
      can_practice: data.can_practice,
      can_games: data.can_games,
      can_level_test: data.can_level_test
    };
  } catch {
    return null;
  }
}

/* MAIN */
async function resolveAccess() {
  const user = await getUser();

  if (!user?.id) return DEFAULT_ACCESS;

  const profile = await fetchProfile(user.id);
  if (profile) return profile;

  return DEFAULT_ACCESS;
}

/* 🚀 BOOT */
export async function bootAccessGate() {
  try {
    const cached = readCache();
    if (cached) {
      return applyGateToDom(cached);
    }

    const access = await resolveAccess();
    writeCache(access);

    return applyGateToDom(access);
  } catch (e) {
    console.warn("access gate error", e);
    return applyGateToDom(DEFAULT_ACCESS);
  }
}
