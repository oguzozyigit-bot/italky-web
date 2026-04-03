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

export function buildQrInstallUrl(uid) {
  const base = "https://italky.ai/pages/install.html";
  return `${base}?uid=${encodeURIComponent(uid)}`;
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
  const qrUrl = buildQrInstallUrl(cleanUid);

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
