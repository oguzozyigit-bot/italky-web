import { supabase } from "/js/supabase_client.js";
import { mountShell } from "/js/ui_shell.js";

mountShell({scroll:"auto"});

const $ = (id)=>document.getElementById(id)

const backdrop = $("sheetBackdrop")
const sheet = $("optionSheet")

const trigger = $("ttsVoiceTrigger")
const value = $("ttsVoiceValue")

trigger.onclick=()=>{
backdrop.style.display="block"
sheet.style.display="block"
}

backdrop.onclick=()=>{
backdrop.style.display="none"
sheet.style.display="none"
}

sheet.querySelectorAll(".sheetItem").forEach(i=>{
i.onclick=()=>{
value.innerText=i.innerText
localStorage.setItem("tts_voice",i.dataset.v)

sheet.style.display="none"
backdrop.style.display="none"
}
})

async function loadProfile(){

const {data:{user}}=await supabase.auth.getUser()

if(!user) return

$("pName").innerText=user.user_metadata?.full_name||""
$("pEmail").innerText=user.email||""

const {data}=await supabase
.from("profiles")
.select("*")
.eq("id",user.id)
.single()

if(data){

$("memberNo").innerText=data.member_no||"-"
$("tokenVal").innerText=data.tokens||0

if(data.voice_profile_ready){
$("voiceProfileStatus").innerText="Hazır"
}else{
$("voiceProfileStatus").innerText="Hazır değil"
}

}

}

loadProfile()
