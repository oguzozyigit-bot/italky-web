// FILE: /js/admin_nfc_tokens.js

import { supabase } from "/js/supabase_client.js";

export async function createNfcTokenCard({ uid, tokenAmount, expireAt = null, note = "" }) {
  const cleanUid = String(uid || "").trim();
  const amount = Number(tokenAmount || 0);

  if (!cleanUid) throw new Error("UID gerekli");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Geçerli jeton miktarı gerekli");

  const payload = {
    uid: cleanUid,
    token_amount: amount,
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
