import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com";

const $ = (id)=>document.getElementById(id);

/* =========================
   LANG
========================= */

const BCP={
tr:"tr-TR",
en:"en-US",
de:"de-DE",
fr:"fr-FR",
it:"it-IT",
es:"es-ES",
ru:"ru-RU",
el:"el-GR",
az:"az-AZ",
ka:"ka-GE"
};

function canonical(code){
return String(code||"").toLowerCase().split("-")[0].trim();
}

const LANGS=(Array.isArray(LANG_POOL)?LANG_POOL:[])
.map(l=>{
const code=canonical(l.code);
if(!code)return null;
return{
code,
flag:l.flag||"🌐",
name:l.name||code.toUpperCase(),
bcp:BCP[code]||"en-US"
};
})
.filter(Boolean);

function langObj(code){
const c=canonical(code);
return LANGS.find(x=>x.code===c)||
{code:c,flag:"🌐",name:c.toUpperCase(),bcp:BCP[c]||"en-US"};
}

/* =========================
   DOM
========================= */

const botMic=$("botMic");
const botBody=$("botBody");

/* =========================
   STATE
========================= */

let audioCtx=null;
let recognizer=null;
let recording=false;
let currentAudio=null;
let voicesReady=false;
let ttsDebounceAt=0;

/* =========================
   USER
========================= */

async function getCurrentUser(){
try{
const {data}=await supabase.auth.getUser();
return data?.user||null;
}catch{
return null;
}
}

async function getCurrentUserId(){
const u=await getCurrentUser();
return u?.id||null;
}

/* =========================
   VOICE PREF
========================= */

function getVoicePreference(){

const v=
localStorage.getItem("tts_voice")||
localStorage.getItem("live_interpreter_voice")||
"auto";

const norm=String(v||"auto").toLowerCase().trim();

if(norm==="female"||norm==="male"||norm==="clone") return norm;

return "auto";
}

/* =========================
   CLONE CHECK
========================= */

async function hasReadyVoiceProfile(){

try{

const user=await getCurrentUser();
if(!user?.id)return false;

const {data}=await supabase
.from("profiles")
.select("tts_voice_ready,tts_voice_id")
.eq("id",user.id)
.maybeSingle();

return !!data?.tts_voice_ready&&!!data?.tts_voice_id;

}catch(e){

console.warn("voice profile check",e);
return false;

}

}

/* =========================
   AUDIO UNLOCK
========================= */

async function warmAudio(){

try{

const Ctx=window.AudioContext||window.webkitAudioContext;

if(Ctx){

if(!audioCtx)audioCtx=new Ctx();

if(audioCtx.state==="suspended")
await audioCtx.resume();

}

}catch(e){

console.warn("audio warm",e);

}

try{

if(window.speechSynthesis){

window.speechSynthesis.getVoices();
voicesReady=true;

}

}catch(e){}

}

/* =========================
   STOP AUDIO
========================= */

function stopAudio(){

try{
currentAudio?.pause?.();
currentAudio=null;
}catch{}

try{
window.speechSynthesis?.cancel?.();
}catch{}

}

/* =========================
   WEB VOICE
========================= */

function chooseWebVoice(lang){

const voices=window.speechSynthesis?.getVoices?.()||[];

const base=canonical(lang);

let pool=voices.filter(v=>
String(v.lang||"").toLowerCase().startsWith(base)
);

if(!pool.length)pool=voices;

const pref=getVoicePreference();

if(pref==="female"){
return pool.find(v=>/female|zira|aria|jenny|eva|emma/i.test(v.name))||pool[0];
}

if(pref==="male"){
return pool.find(v=>/male|david|mark|alex|tom/i.test(v.name))||pool[0];
}

return pool[0];

}

/* =========================
   TTS API
========================= */

async function speakViaApi(text,lang){

const userId=await getCurrentUserId();
const voice=getVoicePreference();

const r=await fetch(`${API_BASE}/tts`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
text,
lang:canonical(lang),
user_id:userId,
module:"interpreter",
voice
})
});

const j=await r.json().catch(()=>null);

if(!j?.ok||!j?.audio_base64)
throw new Error("TTS");

const audio=new Audio(`data:audio/mp3;base64,${j.audio_base64}`);
audio.preload="auto";

currentAudio=audio;

await warmAudio();

await audio.play();

}

/* =========================
   FALLBACK
========================= */

function speakFallback(text,lang){

const value=String(text||"").trim();
if(!value)return;

if(!window.speechSynthesis)return;

const u=new SpeechSynthesisUtterance(value);

u.lang=langObj(lang).bcp;

const voice=chooseWebVoice(lang);
if(voice)u.voice=voice;

setTimeout(()=>{

try{
window.speechSynthesis.cancel();
window.speechSynthesis.speak(u);
}catch{}

},80);

}

/* =========================
   SPEAK
========================= */

async function speak(text,lang){

const value=String(text||"").trim();
if(!value)return;

const now=Date.now();

if(now-ttsDebounceAt<250)
stopAudio();

ttsDebounceAt=now;

stopAudio();

const pref=getVoicePreference();

/* AUTO */

if(pref==="auto"){
speakFallback(value,lang);
return;
}

/* CLONE */

if(pref==="clone"){

try{

const ready=await hasReadyVoiceProfile();

if(!ready){
speakFallback(value,lang);
return;
}

await speakViaApi(value,lang);
return;

}catch(e){

console.warn("clone fail",e);
speakFallback(value,lang);
return;

}

}

/* MALE FEMALE */

try{

await speakViaApi(value,lang);

}catch(e){

console.warn("tts api fail",e);
speakFallback(value,lang);

}

}

/* =========================
   RECORD
========================= */

function buildRecognizer(lang){

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;

if(!SR)return null;

const rec=new SR();

rec.lang=langObj(lang).bcp;

rec.interimResults=false;
rec.continuous=false;
rec.maxAlternatives=1;

return rec;

}

function stopRecognizer(){

if(recognizer){

try{recognizer.stop();}catch{}

recognizer=null;

}

}

/* =========================
   RECORD START
========================= */

function startRecording(){

const rec=buildRecognizer("tr");

if(!rec)return;

recognizer=rec;

rec.onresult=async(e)=>{

const text=e.results?.[0]?.[0]?.transcript||"";

await speak(text,"en");

};

rec.start();

}

/* =========================
   UI
========================= */

botMic?.addEventListener("click",()=>{

if(recording){

stopRecognizer();
recording=false;

}else{

startRecording();
recording=true;

}

});

/* =========================
   UNLOCK
========================= */

function unlock(){

const once=async()=>{

await warmAudio();

window.removeEventListener("touchstart",once);
window.removeEventListener("click",once);

};

window.addEventListener("touchstart",once,{passive:true});
window.addEventListener("click",once,{passive:true});

}

unlock();

/* =========================
   VOICE CACHE
========================= */

try{

if(window.speechSynthesis){

window.speechSynthesis.onvoiceschanged=()=>{
voicesReady=true;
};

window.speechSynthesis.getVoices();

}

}catch{}
