import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

mountShell({scroll:"auto"});

const $ = (id)=>document.getElementById(id);

const sheet = $("optionSheet");
const backdrop = $("sheetBackdrop");
const list = $("sheetList");
const title = $("sheetTitle");

const ttsTrigger = $("ttsVoiceTrigger");
const ttsValue = $("ttsVoiceValue");

const toast = (msg)=>{
 const el = $("toast");
 el.textContent = msg;
 el.classList.add("show");
 setTimeout(()=>el.classList.remove("show"),2000);
};

function openSheet(){
 backdrop.classList.add("show");
 sheet.classList.add("show");
}

function closeSheet(){
 backdrop.classList.remove("show");
 sheet.classList.remove("show");
}

backdrop.onclick = closeSheet;

function buildVoiceOptions(hasVoice){

 list.innerHTML = "";

 const options = [
  {key:"auto",label:"Otomatik"},
  {key:"female",label:"Kadın"},
  {key:"male",label:"Erkek"},
  {key:"my",label:"Benim Sesim"}
 ];

 const current = localStorage.getItem("tts_voice") || "auto";

 options.forEach(o=>{

   const item = document.createElement("div");
   item.className="sheetItem";

   if(o.key==="my" && !hasVoice){
     item.classList.add("disabled");
   }

   if(current===o.key){
     item.classList.add("active");
   }

   item.innerHTML = `
     <div class="sheetItemLabel">${o.label}</div>
     <div class="sheetItemCheck"></div>
   `;

   item.onclick = ()=>{

     if(o.key==="my" && !hasVoice){
       toast("Önce Ses Profilini Oluştur");
       return;
     }

     localStorage.setItem("tts_voice",o.key);
     ttsValue.textContent = o.label;

     closeSheet();
   };

   list.appendChild(item);

 });

}

ttsTrigger.onclick = async ()=>{

 const {data:{user}} = await supabase.auth.getUser();

 const {data} = await supabase
 .from("profiles")
 .select("voice_ready")
 .eq("id",user.id)
 .single();

 buildVoiceOptions(data?.voice_ready);

 title.textContent="Çeviri Sesi";

 openSheet();

};

async function loadProfile(){

 const {data:{user}} = await supabase.auth.getUser();
 if(!user) return;

 $("pEmail").textContent = user.email;

 const {data} = await supabase
 .from("profiles")
 .select("*")
 .eq("id",user.id)
 .single();

 if(!data) return;

 $("pName").textContent = data.name || "—";
 $("memberNo").textContent = data.member_no || "—";
 $("tokenVal").textContent = data.tokens || 0;

 if(data.created_at){
   $("createdAt").textContent =
   new Date(data.created_at).toLocaleString("tr-TR");
 }

 if(data.voice_ready){
   $("voiceProfileStatus").textContent="Ses profili hazır";
 }else{
   $("voiceProfileStatus").textContent="Hazır değil";
 }

}

$("logoutBtn").onclick = async ()=>{
 await supabase.auth.signOut();
 location.href="/login.html";
};

loadProfile();
