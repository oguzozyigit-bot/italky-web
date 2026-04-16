from __future__ import annotations

import os
from fastapi import HTTPException
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Yeni sabit kural
CHARS_PER_JETON = 1000

MODULE_COUNTER_MAP = {
    "usage_text": "char_text_remaining",
    "usage_voice": "char_voice_remaining",
}

VOICE_MODULE_KEYS = {
    "usage_voice",
}

TEXT_MODULE_KEYS = {
    "usage_text",
}


def _get_profile_or_404(user_id: str):
    prof = (
        supabase.table("profiles")
        .select(
            "id,tokens,"
            "char_text_remaining,"
            "char_voice_remaining"
        )
        .eq("id", user_id)
        .limit(1)
        .execute()
    )

    rows = getattr(prof, "data", None) or []
    if not rows:
        raise HTTPException(status_code=404, detail="profile not found")

    return rows[0] or {}


def _wallet_type_for(module_key: str) -> str:
    if module_key in VOICE_MODULE_KEYS:
        return "usage_voice"
    return "usage_text"


def _reason_for(module_key: str) -> str:
    if module_key in VOICE_MODULE_KEYS:
        return f"Ses kullanımı {CHARS_PER_JETON} karakter kesintisi"
    return f"Metin kullanımı {CHARS_PER_JETON} karakter kesintisi"


def _insert_wallet_tx(user_id: str, tx_type: str, amount: int, reason: str, meta: dict):
    return supabase.table("wallet_tx").insert(
        {
            "user_id": user_id,
            "type": tx_type,
            "amount": amount,
            "reason": reason,
            "meta": meta,
        }
    ).execute()


def spend_chars(user_id: str, module_key: str, used_chars: int, extra_meta: dict | None = None):
    if not user_id:
        raise HTTPException(status_code=422, detail="user_id required")

    if module_key not in MODULE_COUNTER_MAP:
        raise HTTPException(status_code=400, detail="invalid module_key")

    if used_chars <= 0:
        return {
            "ok": True,
            "charged_tokens": 0,
            "used_chars_total": 0,
            "module": module_key,
            "chars_per_jeton": CHARS_PER_JETON,
        }

    field_name = MODULE_COUNTER_MAP[module_key]
    row = _get_profile_or_404(user_id)

    tokens_before = int(row.get("tokens") or 0)
    used_before = int(row.get(field_name) or 0)
    used_now = int(used_chars)
    used_total = used_before + used_now

    old_step = used_before // CHARS_PER_JETON
    new_step = used_total // CHARS_PER_JETON

    charged_tokens = max(0, new_step - old_step)
    tokens_after = tokens_before - charged_tokens

    if tokens_after < 0:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "INSUFFICIENT_TOKENS",
                "tokens_before": tokens_before,
                "tokens_needed": charged_tokens,
                "tokens_after": tokens_after,
            },
        )

    (
        supabase.table("profiles")
        .update({
            "tokens": tokens_after,
            field_name: used_total
        })
        .eq("id", user_id)
        .execute()
    )

    if charged_tokens > 0:
        tx_type = _wallet_type_for(module_key)
        temp_balance = tokens_before

        for idx in range(charged_tokens):
            temp_balance -= 1
            _insert_wallet_tx(
                user_id=user_id,
                tx_type=tx_type,
                amount=-1,
                reason=_reason_for(module_key),
                meta={
                    "module": module_key,
                    "used_chars": used_now,
                    "used_before": used_before,
                    "used_total": used_total,
                    "charge_type": "step_1000",
                    "step_index": idx + 1,
                    "chars_per_jeton": CHARS_PER_JETON,
                    "balance_after": temp_balance,
                    **(extra_meta or {}),
                },
            )

    return {
        "ok": True,
        "charged_tokens": charged_tokens,
        "used_chars_total": used_total,
        "module": module_key,
        "tokens_before": tokens_before,
        "tokens_after": tokens_after,
        "chars_per_jeton": CHARS_PER_JETON,
    }
