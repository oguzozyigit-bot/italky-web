// FILE: /js/access_gate.js

import { supabase } from "/js/supabase_client.js";

const ACCESS_CACHE_KEY = "italky_access_gate_v1";
const ACCESS_CACHE_TTL_MS = 1000 * 60 * 5;

const DEFAULT_ACCESS = {
  source: "default",
  package_code: "",
  package_name: "",
  has_nfc: false,
  is_active: false,

  can_text_to_text: true,
  can_face_to_face: false,
  can_side_to_side: false,
  can_offline: false,
  can_practice: false,
  can_games: true,
  can_level_test: true,

  language_limit: 0,
  token_balance: 0,
  expires_at: null
};

function $(id) {
  return document.getElementById(id);
}

function toBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  if (typeof v === "string") {
    const x = v.trim().toLowerCase();
    if (["true", "1", "yes", "on", "active"].includes(x)) return true;
    if (["false", "0", "no", "off", "inactive"].includes(x)) return false;
  }
  return fallback;
}

function safeText(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function nowTs() {
  return Date.now();
}

function readCache() {
  try {
    const raw = localStorage.getItem(ACCESS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);

    if (!ts || nowTs() - ts > ACCESS_CACHE_TTL_MS) {
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
      JSON.stringify({
        ts: nowTs(),
        data
      })
    );
  } catch {}
}

function mergeAccess(raw = {}) {
  return {
    ...DEFAULT_ACCESS,
    ...raw,
    source: safeText(raw?.source, DEFAULT_ACCESS.source),
    package_code: safeText(raw?.package_code),
    package_name: safeText(raw?.package_name),
    has_nfc: toBool(raw?.has_nfc),
    is_active: toBool(raw?.is_active),

    can_text_to_text: toBool(raw?.can_text_to_text, true),
    can_face_to_face: toBool(raw?.can_face_to_face),
    can_side_to_side: toBool(raw?.can_side_to_side),
    can_offline: toBool(raw?.can_offline),
    can_practice: toBool(raw?.can_practice),
    can_games: toBool(raw?.can_games, true),
    can_level_test: toBool(raw?.can_level_test, true),

    language_limit: Number(raw?.language_limit || 0),
    token_balance: Number(raw?.token_balance || 0),
    expires_at: raw?.expires_at || null
  };
}

function setVisible(id, visible) {
  const el = $(id);
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

function setHeroMessage(msg) {
  const heroStatus = $("heroStatus");
  if (heroStatus) heroStatus.textContent = String(msg || "");
}

function applyGateToDom(access) {
  const finalAccess = mergeAccess(access);

  setVisible("goTextToText", finalAccess.can_text_to_text);
  setVisible("goFaceToFace", finalAccess.can_face_to_face);
  setVisible("goSideToSide", finalAccess.can_side_to_side);
  setVisible("goSideToSideBtn", finalAccess.can_side_to_side);
  setVisible("goOffline", finalAccess.can_offline);

  const shouldShowUpgrade =
    !finalAccess.can_face_to_face ||
    !finalAccess.can_side_to_side ||
    !finalAccess.can_offline;

  setVisible("nfcUpgradeBox", shouldShowUpgrade);

  if (!finalAccess.is_active && finalAccess.has_nfc) {
    setHeroMessage("NFC paketin pasif görünüyor. Paketini yenileyebilirsin.");
    return finalAccess;
  }

  if (finalAccess.source === "default" && !finalAccess.has_nfc) {
    setHeroMessage("Standart kullanım açık. TextToText kullanılabilir.");
    return finalAccess;
  }

  if (finalAccess.can_side_to_side) {
    setHeroMessage("Yetkiler yüklendi. Bağlantı kodu hazırlanıyor...");
    return finalAccess;
  }

  if (finalAccess.can_text_to_text) {
    setHeroMessage("Paketine göre kullanılabilir modüller hazır.");
    return finalAccess;
  }

  setHeroMessage("Paket bilgisi alındı.");
  return finalAccess;
}

async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  } catch {
    return null;
  }
}

async function fetchProfileAccess(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        nfc_uid,
        nfc_active,
        package_code,
        package_name,
        can_text_to_text,
        can_face_to_face,
        can_side_to_side,
        can_offline,
        can_practice,
        can_games,
        can_level_test,
        language_limit,
        token_balance,
        access_expires_at
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mergeAccess({
      source: "profiles",
      package_code: data.package_code,
      package_name: data.package_name,
      has_nfc: !!safeText(data.nfc_uid),
      is_active: toBool(data.nfc_active, !!safeText(data.nfc_uid)),

      can_text_to_text: data.can_text_to_text ?? true,
      can_face_to_face: data.can_face_to_face ?? false,
      can_side_to_side: data.can_side_to_side ?? false,
      can_offline: data.can_offline ?? false,
      can_practice: data.can_practice ?? false,
      can_games: data.can_games ?? true,
      can_level_test: data.can_level_test ?? true,

      language_limit: Number(data.language_limit || 0),
      token_balance: Number(data.token_balance || 0),
      expires_at: data.access_expires_at || null
    });
  } catch (e) {
    console.warn("[access_gate profiles]", e);
    return null;
  }
}

async function fetchEntitlementAccess(userId) {
  try {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("nfc_entitlements")
      .select(`
        id,
        is_active,
        expires_at,
        remaining_tokens,
        package_id,
        nfc_packages (
          code,
          title,
          language_limit,
          token_amount,
          can_use_text_to_text,
          can_use_face_to_face,
          can_use_side_to_side,
          can_use_offline,
          can_use_practice,
          can_use_games,
          can_use_level_test
        )
      `)
      .eq("user_id", userId)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const pack = Array.isArray(data.nfc_packages)
      ? data.nfc_packages[0]
      : data.nfc_packages || {};

    return mergeAccess({
      source: "entitlements",
      package_code: pack?.code,
      package_name: pack?.title,
      has_nfc: true,
      is_active: toBool(data?.is_active, true),

      can_text_to_text: pack?.can_use_text_to_text ?? true,
      can_face_to_face: pack?.can_use_face_to_face ?? false,
      can_side_to_side: pack?.can_use_side_to_side ?? false,
      can_offline: pack?.can_use_offline ?? false,
      can_practice: pack?.can_use_practice ?? false,
      can_games: pack?.can_use_games ?? true,
      can_level_test: pack?.can_use_level_test ?? true,

      language_limit: Number(pack?.language_limit || 0),
      token_balance: Number(data?.remaining_tokens ?? pack?.token_amount ?? 0),
      expires_at: data?.expires_at || null
    });
  } catch (e) {
    console.warn("[access_gate entitlements]", e);
    return null;
  }
}

async function resolveAccess() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return mergeAccess(DEFAULT_ACCESS);
  }

  const fromProfile = await fetchProfileAccess(user.id);
  if (fromProfile) return fromProfile;

  const fromEntitlement = await fetchEntitlementAccess(user.id);
  if (fromEntitlement) return fromEntitlement;

  return mergeAccess(DEFAULT_ACCESS);
}

export async function bootAccessGate(options = {}) {
  const useCache = options?.useCache !== false;

  try {
    if (useCache) {
      const cached = readCache();
      if (cached) {
        const applied = applyGateToDom(cached);
        window.__ITALKY_ACCESS__ = applied;
        return applied;
      }
    }

    const access = await resolveAccess();
    const applied = applyGateToDom(access);

    writeCache(applied);
    window.__ITALKY_ACCESS__ = applied;

    return applied;
  } catch (e) {
    console.warn("[access_gate boot]", e);
    const fallback = mergeAccess(DEFAULT_ACCESS);
    const applied = applyGateToDom(fallback);
    window.__ITALKY_ACCESS__ = applied;
    return applied;
  }
}

export function clearAccessGateCache() {
  try {
    localStorage.removeItem(ACCESS_CACHE_KEY);
  } catch {}
}
