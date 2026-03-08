// FILE: /js/voice_profile_page.js

import { mountShell } from "/js/ui_shell.js";

mountShell({ scroll: "auto" });

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
  timerText.textContent = "00:00";
}

function startTimer(){
  startedAt = Date.now();
  timerText.textContent = "00:00";
  clearInterval(timerInt);
  timerInt = setInterval(() => {
    const sec = (Date.now() - startedAt) / 1000;
    timerText.textContent = fmtSec(sec);
  }, 200);
}

function stopTracks(){
  try{
    mediaStream?.getTracks?.().forEach(t => t.stop());
  }catch{}
  mediaStream = null;
}

function clearAudio(){
  audioBlob = null;
  audioChunks = [];
  if(audioPreview){
    audioPreview.pause();
    audioPreview.removeAttribute("src");
    audioPreview.load();
  }
  audioBox?.classList.remove("show");
}

async function startRecording(){
  try{
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);

    mediaRecorder.ondataavailable = (e) => {
      if(e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: "audio/webm" });

      try{
        const url = URL.createObjectURL(audioBlob);
        audioPreview.src = url;
        audioBox?.classList.add("show");
      }catch{}

      recordBtn.classList.remove("listening");
      isRecording = false;
      statusText.textContent = "Kayıt tamamlandı";
      stopTracks();
      clearInterval(timerInt);
    };

    mediaRecorder.start();
    isRecording = true;
    clearAudio();
    recordBtn.classList.add("listening");
    statusText.textContent = "Kayıt alınıyor...";
    startTimer();
  }catch{
    statusText.textContent = "Mikrofon izni alınamadı";
    toast("Mikrofon izni gerekli");
  }
}

function stopRecording(){
  try{
    mediaRecorder?.stop?.();
  }catch{
    statusText.textContent = "Kayıt durdurulamadı";
  }
}

recordBtn?.addEventListener("click", () => {
  if(isRecording){
    stopRecording();
    return;
  }
  startRecording();
});

retryBtn?.addEventListener("click", () => {
  if(isRecording){
    stopRecording();
  }
  clearAudio();
  resetTimer();
  statusText.textContent = "Kayda hazır";
});

saveBtn?.addEventListener("click", async () => {
  if(!audioBlob){
    statusText.textContent = "Önce kayıt alın";
    toast("Önce kayıt alın");
    return;
  }

  try{
    // Şimdilik local hazır
    console.log("Voice sample ready:", audioBlob, audioBlob.size);
    statusText.textContent = "Ses örneği hazır";
    toast("Ses örneği hazır");
  }catch{
    statusText.textContent = "Kayıt işlenemedi";
    toast("Kayıt işlenemedi");
  }
});

backBtn?.addEventListener("click", () => {
  history.back();
});

window.addEventListener("beforeunload", () => {
  try{
    if(isRecording) mediaRecorder?.stop?.();
  }catch{}
  stopTracks();
  clearInterval(timerInt);
});
