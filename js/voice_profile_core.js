import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const BUCKET = "voice-samples";
const SAMPLE_COUNT = 6;

export const VOICE_SAMPLE_TEXTS = {
  tr: [
    "Merhaba, ben italkyAI kullanıyorum ve ses profilimi oluşturuyorum.",
    "Bugün hava oldukça güzel, dışarıda hafif bir rüzgâr var.",
    "Yeni bir dil öğrenmek sabır, tekrar ve düzenli pratik gerektirir.",
    "Yapay zekâ destekli çeviri, günlük iletişimi daha kolay hale getiriyor.",
    "Seyahat ederken hızlı ve doğru konuşma çevirisi büyük avantaj sağlar.",
    "Şimdi son örneği de tamamlıyorum ve ses profilimi kaydediyorum."
  ],
  en: [
    "Hello, I am using italkyAI and creating my voice profile.",
    "The weather is quite nice today, and there is a light breeze outside.",
    "Learning a new language requires patience, repetition, and regular practice.",
    "AI-powered translation makes daily communication easier and faster.",
    "Accurate speech translation is a great advantage while traveling abroad.",
    "I am finishing the final sample now and saving my voice profile."
  ],
  de: [
    "Hallo, ich benutze italkyAI und erstelle gerade mein Sprachprofil.",
    "Heute ist das Wetter ziemlich schön und draußen weht ein leichter Wind.",
    "Eine neue Sprache zu lernen erfordert Geduld, Wiederholung und regelmäßige Übung.",
    "KI-gestützte Übersetzung erleichtert die tägliche Kommunikation deutlich.",
    "Eine schnelle und genaue Sprachübersetzung ist auf Reisen ein großer Vorteil.",
    "Ich beende jetzt das letzte Beispiel und speichere mein Sprachprofil."
  ],
  fr: [
    "Bonjour, j’utilise italkyAI et je crée mon profil vocal.",
    "Il fait très beau aujourd’hui et il y a une légère brise dehors.",
    "Apprendre une nouvelle langue demande de la patience, de la répétition et une pratique régulière.",
    "La traduction assistée par intelligence artificielle facilite la communication quotidienne.",
    "Une traduction vocale rapide et précise est très utile pendant les voyages.",
    "Je termine maintenant le dernier exemple et j’enregistre mon profil vocal."
  ],
  it: [
    "Ciao, sto usando italkyAI e sto creando il mio profilo vocale.",
    "Oggi il tempo è piuttosto bello e fuori c’è una leggera brezza.",
    "Imparare una nuova lingua richiede pazienza, ripetizione e pratica regolare.",
    "La traduzione supportata dall’intelligenza artificiale rende più facile la comunicazione quotidiana.",
    "Una traduzione vocale rapida e precisa è un grande vantaggio quando si viaggia.",
    "Ora sto completando l’ultimo esempio e salvo il mio profilo vocale."
  ],
  es: [
    "Hola, estoy usando italkyAI y creando mi perfil de voz.",
    "Hoy hace bastante buen tiempo y afuera hay una brisa suave.",
    "Aprender un nuevo idioma requiere paciencia, repetición y práctica constante.",
    "La traducción con inteligencia artificial facilita la comunicación diaria.",
    "Una traducción de voz rápida y precisa es una gran ventaja al viajar.",
    "Ahora termino la última muestra y guardo mi perfil de voz."
  ]
};

export function fmtSec(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function getUserPreferredLang(user) {
  const fromMeta =
    user?.user_metadata?.language ||
    user?.user_metadata?.lang ||
    user?.user_metadata?.site_lang ||
    user?.app_metadata?.language ||
    user?.app_metadata?.lang ||
    user?.app_metadata?.site_lang ||
    "tr";

  const raw = String(fromMeta || "tr").toLowerCase().trim();
  const base = raw.split("-")[0];
  return VOICE_SAMPLE_TEXTS[base] ? base : "tr";
}

export function createEmptyRecordings() {
  return Array.from({ length: SAMPLE_COUNT }, () => ({
    blob: null,
    seconds: 0,
    mime: "",
  }));
}

export function getSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    ""
  ];

  for (const type of candidates) {
    try {
      if (!type) return "";
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
    } catch {}
  }
  return "";
}

export function getExtensionFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4")) return "mp4";
  if (m.includes("mpeg")) return "mp3";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  return "webm";
}

export function parseOldPaths(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);

  const s = String(raw).trim();
  if (!s) return [];

  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
    } catch {
      return [];
    }
  }

  return [s];
}

export async function getUserOrThrow() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data?.user || null;
  if (!user?.id) throw new Error("Oturum bulunamadı");
  return user;
}

export async function loadCurrentProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, voice_sample_path")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function deletePathsIfExist(paths) {
  const list = (Array.isArray(paths) ? paths : []).filter(Boolean);
  if (!list.length) return;

  try {
    await supabase.storage.from(BUCKET).remove(list);
  } catch (e) {
    console.warn("[voice_core delete old samples]", e);
  }
}

export function buildFilePath(userId, idx, ext = "webm") {
  return `${userId}/voice-sample-${idx + 1}-${Date.now()}.${ext}`;
}

export async function uploadAllSamples(user, recordings) {
  const uploaded = [];

  for (let i = 0; i < recordings.length; i++) {
    const item = recordings[i];
    if (!item?.blob) throw new Error(`Cümle ${i + 1} eksik`);

    const mime = item.mime || item.blob.type || "audio/webm";
    const ext = getExtensionFromMime(mime);
    const path = buildFilePath(user.id, i, ext);

    const { error: uploadErr } = await supabase
      .storage
      .from(BUCKET)
      .upload(path, item.blob, {
        contentType: mime,
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    uploaded.push({
      index: i,
      path,
      mime,
      seconds: item.seconds || 0
    });
  }

  return uploaded;
}

export async function createFirstSignedUrl(path) {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (error) throw error;
  return data?.signedUrl || "";
}

export async function finishVoiceProfile(uiLang, recordings) {
  const user = await getUserOrThrow();
  const profile = await loadCurrentProfile(user.id);

  const oldPaths = parseOldPaths(profile?.voice_sample_path);
  const uploaded = await uploadAllSamples(user, recordings);
  const previewUrl = uploaded[0]?.path ? await createFirstSignedUrl(uploaded[0].path) : "";
  const totalSec = uploaded.reduce((sum, x) => sum + Number(x.seconds || 0), 0);

  const payload = {
    voice_sample_url: previewUrl,
    voice_sample_path: JSON.stringify(uploaded.map((x) => x.path)),
    voice_sample_mime: "multi",
    voice_sample_seconds: totalSec,
    voice_profile_ready: true,
    voice_profile_updated_at: new Date().toISOString(),
    voice_profile_lang: uiLang || "tr",
    tts_voice_preference: "clone",
    tts_voice: "clone"
  };

  const { error: updateErr } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (updateErr) {
    await deletePathsIfExist(uploaded.map((x) => x.path));
    throw updateErr;
  }

  await deletePathsIfExist(oldPaths);
  return uploaded;
}

export async function enrollTTSVoice() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Oturum bulunamadı");

  const r = await fetch(`${API_BASE}/api/voice/enroll`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(j.detail || j.error || "Voice enroll başarısız");
  }

  return j || {};
}

export async function markCloneAsSelected(enrollResp = {}) {
  const user = await getUserOrThrow();

  const provider = String(
    enrollResp?.provider ||
    enrollResp?.tts_voice_provider ||
    enrollResp?.voice_provider ||
    "cartesia"
  ).trim();

  const voiceId = String(
    enrollResp?.voice_id ||
    enrollResp?.tts_voice_id ||
    enrollResp?.model_voice_id ||
    ""
  ).trim();

  const payload = {
    tts_voice_preference: "clone",
    tts_voice: "clone",
    tts_voice_provider: provider,
    updated_at: new Date().toISOString()
  };

  if (voiceId) {
    payload.tts_voice_id = voiceId;
    payload.tts_voice_ready = true;
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error) throw error;

  try {
    localStorage.setItem("tts_voice", "clone");
    localStorage.setItem("live_interpreter_voice", "clone");
    localStorage.setItem("facetoface_voice_mode", "clone");
  } catch {}
}

export class VoiceProfileRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.startedAt = 0;
    this.currentSeconds = 0;
    this.currentMime = "";
  }

  stopTracks() {
    try {
      this.mediaStream?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    this.mediaStream = null;
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Bu cihaz mikrofon kaydını desteklemiyor");
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.audioChunks = [];
    this.currentSeconds = 0;
    this.currentMime = "";

    const mimeType = getSupportedMimeType();
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.mediaStream, { mimeType })
      : new MediaRecorder(this.mediaStream);

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        this.startedAt = Date.now();
        resolve(true);
      };

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onerror = (e) => {
        this.isRecording = false;
        this.stopTracks();
        reject(e);
      };

      try {
        this.mediaRecorder.start(250);
      } catch (e) {
        this.stopTracks();
        reject(e);
      }
    });
  }

  async stop() {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
      throw new Error("Aktif kayıt bulunamadı");
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        try {
          const finalType = this.mediaRecorder?.mimeType || "audio/webm";
          const blob = new Blob(this.audioChunks, { type: finalType });
          this.currentMime = finalType;
          this.currentSeconds = Math.max(1, Math.floor((Date.now() - this.startedAt) / 1000));
          this.isRecording = false;
          this.stopTracks();

          resolve({
            blob,
            seconds: this.currentSeconds,
            mime: this.currentMime
          });
        } catch (e) {
          reject(e);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        this.stopTracks();
        reject(e);
      }
    });
  }

  destroy() {
    try {
      if (this.isRecording && this.mediaRecorder?.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    } catch {}
    this.stopTracks();
    this.isRecording = false;
  }
}
