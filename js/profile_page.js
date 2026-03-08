// FILE: /js/voice_profile_page.js

import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

mountShell({ scroll: "auto" });

const BUCKET = "voice-samples";

const $ = (id) => document.getElementById(id);

const recordBtn = $("recordBtn");
const saveBtn = $("saveBtn");
const retryBtn = $("retryBtn");
const backBtn = $("backBtn");
const statusText = $("statusText");
const timerText = $("timerText");
const audioBox = $("audioBox");
const audioPreview = $("audioPreview");
const toastEl = $("toast");

let mediaRecorder = null;
let mediaStream = null;
let audioChunks = [];
let audioBlob = null;
let isRecording = false;
let timerInt = null;
let startedAt = 0;
let recordedSeconds = 0;
let currentObjectUrl = "";

function toast(msg){
  if(!toastEl) return;
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__voiceToast);
  window.__voiceToast = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function fmtSec(sec){
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function resetTimer(){
  clearInterval(timerInt);
  timerInt = null;
  startedAt = 0;
  recordedSeconds = 0;
  timerText.textContent = "00:00";
}

function startTimer(){
  startedAt = Date.now();
  timerText.textContent = "00:00";
  clearInterval(timerInt);
  timerInt = setInterval(() => {
    const sec = (Date.now() - startedAt) / 1000;
    recordedSeconds = Math.max(1, Math.floor(sec));
    timerText.textContent = fmtSec(sec);
  }, 200);
}

function stopTracks(){
  try{
    mediaStream?.getTracks?.().forEach(t => t.stop());
  }catch{}
  mediaStream = null;
}

function revokePreviewUrl(){
  try{
    if(currentObjectUrl){
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = "";
    }
  }catch{}
}

function clearAudio(){
  audioBlob = null;
  audioChunks = [];
  revokePreviewUrl();

  if(audioPreview){
    try{ audioPreview.pause(); }catch{}
    audioPreview.removeAttribute("src");
    audioPreview.load();
  }

  audioBox?.classList.remove("show");
}

function detectMimeType(recorder){
  const mt = String(recorder?.mimeType || "").toLowerCase();
  if(mt) return mt;

  if(window.MediaRecorder?.isTypeSupported?.("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if(window.MediaRecorder?.isTypeSupported?.("audio/webm")) return "audio/webm";
  if(window.MediaRecorder?.isTypeSupported?.("audio/mp4")) return "audio/mp4";
  return "";
}

async function startRecording(){
  try{
    if(!navigator.mediaDevices?.getUserMedia){
      throw new Error("Bu cihaz mikrofon kaydını desteklemiyor");
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    audioChunks = [];
    clearAudio();
    resetTimer();

    const mimeType = detectMimeType(window.MediaRecorder);
    mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream);

    mediaRecorder.onstart = () => {
      isRecording = true;
      recordBtn.classList.add("listening");
      statusText.textContent = "Kayıt alınıyor...";
      startTimer();
    };

    mediaRecorder.ondataavailable = (e) => {
      if(e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onerror = (e) => {
      console.warn("[voice recorder error]", e);
      statusText.textContent = "Kayıt başlatılamadı";
      toast("Kayıt başlatılamadı");
      isRecording = false;
      recordBtn.classList.remove("listening");
      stopTracks();
      resetTimer();
    };

    mediaRecorder.onstop = () => {
      const finalType = mediaRecorder?.mimeType || "audio/webm";
      audioBlob = new Blob(audioChunks, { type: finalType });

      revokePreviewUrl();
      currentObjectUrl = URL.createObjectURL(audioBlob);
      audioPreview.src = currentObjectUrl;
      audioBox?.classList.add("show");

      recordBtn.classList.remove("listening");
      isRecording = false;
      statusText.textContent = "Kayıt tamamlandı";
      stopTracks();
      clearInterval(timerInt);

      if(!recordedSeconds || recordedSeconds < 1){
        recordedSeconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
      }
    };

    mediaRecorder.start(250);
  }catch(e){
    console.warn("[voice startRecording]", e);
    statusText.textContent = "Mikrofon izni alınamadı";
    toast(e?.message || "Mikrofon izni gerekli");
    isRecording = false;
    recordBtn.classList.remove("listening");
    stopTracks();
    resetTimer();
  }
}

function stopRecording(){
  try{
    if(mediaRecorder && mediaRecorder.state !== "inactive"){
      mediaRecorder.stop();
    }
  }catch(e){
    console.warn("[voice stopRecording]", e);
    statusText.textContent = "Kayıt durdurulamadı";
    toast("Kayıt durdurulamadı");
  }
}

async function getUserOrThrow(){
  const { data:{ session } } = await supabase.auth.getSession();
  const user = session?.user || null;
  if(!user?.id) throw new Error("Oturum bulunamadı");
  return user;
}

function getExtensionFromMime(mime){
  const m = String(mime || "").toLowerCase();
  if(m.includes("webm")) return "webm";
  if(m.includes("mp4")) return "mp4";
  if(m.includes("mpeg")) return "mp3";
  if(m.includes("ogg")) return "ogg";
  if(m.includes("wav")) return "wav";
  return "webm";
}

function buildFilePath(userId, ext = "webm"){
  return `${userId}/voice-sample-${Date.now()}.${ext}`;
}

async function deleteOldVoiceIfExists(oldPath){
  const path = String(oldPath || "").trim();
  if(!path) return;
  try{
    await supabase.storage.from(BUCKET).remove([path]);
  }catch(e){
    console.warn("[voice delete old]", e);
  }
}

async function loadCurrentProfile(userId){
  const { data, error } = await supabase
    .from("profiles")
    .select("id, voice_sample_path")
    .eq("id", userId)
    .maybeSingle();

  if(error) throw error;
  return data || null;
}

async function uploadVoiceSample(user, blob){
  const mime = blob.type || "audio/webm";
  const ext = getExtensionFromMime(mime);
  const path = buildFilePath(user.id, ext);

  const { error: uploadErr } = await supabase
    .storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: mime,
      upsert: true
    });

  if(uploadErr) throw uploadErr;

  const { data: signedData, error: signedErr } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if(signedErr) throw signedErr;

  return {
    path,
    url: signedData?.signedUrl || "",
    mime
  };
}

async function saveVoiceProfile(){
  if(!audioBlob) throw new Error("Önce kayıt alın");
  if(recordedSeconds < 2) throw new Error("Kayıt çok kısa");

  const user = await getUserOrThrow();
  const profile = await loadCurrentProfile(user.id);
  const uploaded = await uploadVoiceSample(user, audioBlob);

  const payload = {
    voice_sample_url: uploaded.url,
    voice_sample_path: uploaded.path,
    voice_sample_mime: uploaded.mime,
    voice_sample_seconds: recordedSeconds,
    voice_profile_ready: true,
    voice_profile_updated_at: new Date().toISOString()
  };

  const { error: updateErr } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if(updateErr){
    await deleteOldVoiceIfExists(uploaded.path);
    throw updateErr;
  }

  if(profile?.voice_sample_path && profile.voice_sample_path !== uploaded.path){
    await deleteOldVoiceIfExists(profile.voice_sample_path);
  }

  return uploaded;
}

recordBtn?.addEventListener("click", async () => {
  if(isRecording){
    stopRecording();
    return;
  }
  await startRecording();
});

retryBtn?.addEventListener("click", () => {
  if(isRecording){
    stopRecording();
  }
  clearAudio();
  resetTimer();
  statusText.textContent = "Kayda hazır";
  toast("Kayıt temizlendi");
});

saveBtn?.addEventListener("click", async () => {
  if(!audioBlob){
    statusText.textContent = "Önce kayıt alın";
    toast("Önce kayıt alın");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.style.opacity = "0.7";
  statusText.textContent = "Ses profili kaydediliyor...";

  try{
    await saveVoiceProfile();
    statusText.textContent = "Ses profili kaydedildi";
    toast("Ses profili kaydedildi");
  }catch(e){
    console.warn("[voice save]", e);
    statusText.textContent = e?.message || "Kayıt kaydedilemedi";
    toast(e?.message || "Kayıt kaydedilemedi");
  }finally{
    saveBtn.disabled = false;
    saveBtn.style.opacity = "1";
  }
});

backBtn?.addEventListener("click", () => {
  history.back();
});

window.addEventListener("beforeunload", () => {
  try{
    if(isRecording && mediaRecorder?.state !== "inactive"){
      mediaRecorder.stop();
    }
  }catch{}
  stopTracks();
  clearInterval(timerInt);
  revokePreviewUrl();
});
