import { mountShell } from "/js/ui_shell.js";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);

const recordBtn = $("recordBtn");
const saveBtn = $("saveBtn");
const retryBtn = $("retryBtn");
const statusText = $("statusText");

let mediaRecorder = null;
let mediaStream = null;
let audioChunks = [];
let audioBlob = null;
let isRecording = false;

async function startRecording(){
  try{
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);

    mediaRecorder.ondataavailable = (e)=>{
      if(e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = ()=>{
      audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      statusText.textContent = "Kayıt tamamlandı";
      recordBtn.classList.remove("listening");
      isRecording = false;

      try{
        mediaStream?.getTracks?.().forEach(t => t.stop());
      }catch{}
    };

    mediaRecorder.start();
    isRecording = true;
    recordBtn.classList.add("listening");
    statusText.textContent = "Kayıt alınıyor...";
  }catch{
    statusText.textContent = "Mikrofon izni alınamadı";
  }
}

function stopRecording(){
  try{
    mediaRecorder?.stop?.();
  }catch{
    statusText.textContent = "Kayıt durdurulamadı";
  }
}

recordBtn?.addEventListener("click", ()=>{
  if(isRecording){
    stopRecording();
    return;
  }
  startRecording();
});

retryBtn?.addEventListener("click", ()=>{
  audioBlob = null;
  audioChunks = [];
  statusText.textContent = "Kayda hazır";
});

saveBtn?.addEventListener("click", async ()=>{
  if(!audioBlob){
    statusText.textContent = "Önce bir kayıt alın";
    return;
  }

  // Şimdilik local test
  try{
    const url = URL.createObjectURL(audioBlob);
    console.log("Voice sample ready:", url, audioBlob.size);
    statusText.textContent = "Ses örneği hazır. Backend bağlantısı sonraki adım.";
  }catch{
    statusText.textContent = "Kayıt işlenemedi";
  }
});
