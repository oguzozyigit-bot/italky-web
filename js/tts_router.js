// FILE: /js/tts_router.js

import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";

export async function speakText(text, mode = "translate") {

  if(!text) return;

  const voiceSetting =
    mode === "chat"
      ? localStorage.getItem("chat_ai_voice") || "auto"
      : localStorage.getItem("tts_voice") || "auto";

  try {

    // 1️⃣ BENİM SESİM
    if(voiceSetting === "own") {

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if(!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("voice_sample_url, voice_profile_ready")
        .eq("id", user.id)
        .single();

      if(!profile?.voice_profile_ready) {
        console.warn("Voice profile not ready");
        return;
      }

      await fetch(`${API_BASE}/api/tts/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_sample: profile.voice_sample_url
        })
      });

      return;
    }

    // 2️⃣ AI ÖZEL SES
    if(voiceSetting === "ai_custom") {

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if(!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("ai_voice_sample_url, ai_voice_profile_ready")
        .eq("id", user.id)
        .single();

      if(!profile?.ai_voice_profile_ready) {
        console.warn("AI custom voice not ready");
        return;
      }

      await fetch(`${API_BASE}/api/tts/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_sample: profile.ai_voice_sample_url
        })
      });

      return;
    }

    // 3️⃣ KADIN SESİ
    if(voiceSetting === "female") {

      await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          gender: "female"
        })
      });

      return;
    }

    // 4️⃣ ERKEK SESİ
    if(voiceSetting === "male") {

      await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          gender: "male"
        })
      });

      return;
    }

    // 5️⃣ OTOMATİK
    await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        gender: "female"
      })
    });

  } catch(e) {

    console.error("TTS error", e);

  }

}
