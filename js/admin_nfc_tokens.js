// FILE: /js/admin_nfc_tokens.js

import { supabase } from "/js/supabase_client.js";

function randomPart(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

export function generateLongUid() {
  const part1 = randomPart(8);
  const part2 = randomPart(8);
  const part3 = Date.now().toString(36).toUpperCase();
  return `ITALKY-${part1}-${part2}-${part3}`;
}

export function generateManualCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * QR sabit olacak.
 * UID ve kısa kod QR içine gömülmez.
 */
export function buildQrInstallUrl() {
  return "https://italky.ai/pages/install.html";
}

export async function createNfcTokenCard({
  uid,
  tokenAmount,
  note = "",
  expireAt = null
}) {
  const cleanUid = String(uid || "").trim() || generateLongUid();
  const amount = Number(tokenAmount || 0);
  const manualCode = generateManualCode();
  const qrUrl = buildQrInstallUrl();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Geçerli jeton miktarı gerekli");
  }

  const payload = {
    uid: cleanUid,
    manual_code: manualCode,
    token_amount: amount,
    qr_url: qrUrl,
    status: "active",
    expire_at: expireAt || null,
    note: String(note || "").trim() || null
  };

  const { data, error } = await supabase
    .from("nfc_cards")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listNfcTokenCards(search = "") {
  let query = supabase
    .from("nfc_cards")
    .select("*")
    .order("created_at", { ascending: false });

  const q = String(search || "").trim();
  if (q) {
    query = query.or(`uid.ilike.%${q}%,manual_code.ilike.%${q}%,note.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function updateNfcCardStatus(uid, status) {
  const cleanUid = String(uid || "").trim();
  const cleanStatus = String(status || "").trim().toLowerCase();

  if (!cleanUid) throw new Error("UID gerekli");
  if (!["active", "used", "blocked"].includes(cleanStatus)) {
    throw new Error("Geçersiz kart durumu");
  }

  const { data, error } = await supabase
    .from("nfc_cards")
    .update({ status: cleanStatus })
    .eq("uid", cleanUid)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
