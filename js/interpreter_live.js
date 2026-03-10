import { supabase } from "/js/supabase_client.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";

const $ = (id)=>document.getElementById(id);

const topChat = $("topChat");
const botChat = $("botChat");

const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");

const muteBtn = $("muteBtn");
const clearBtn = $("clearBtn");
const homeBtn = $("homeBtn");

const myLangSel = $("myLang");
const voiceSel = $("myVoice");

const peerDot = $("peerDot");
const statusText = $("statusText");

const toastEl = $("toast");

let roomId="";
let hostCode="";
let myUserId="";

let myLang="tr";
let peerLang="";

let isMuted=false;
let recognition=null;

let channel=null;


/* --------------------- */
function toast(msg){
  if(!toastEl) return
  toastEl.textContent=msg
  toastEl.classList.add("show")
  setTimeout(()=>toastEl.classList.remove("show"),1500)
}

/* --------------------- */
function getParams(){
  const p=new URLSearchParams(location.search)
  return{
    room:String(p.get("room")||""),
    host:String(p.get("host")||""),
    my:String(p.get("my")||"tr")
  }
}

/* --------------------- */
function renderLangs(){

  myLangSel.innerHTML = LANG_POOL.map(l=>{
    return `<option value="${l.code}">
      ${l.flag||"🌐"} ${l.name}
    </option>`
  }).join("")

  myLangSel.value=myLang

}

/* --------------------- */
function addBubble(where,text,side){

  const el=document.createElement("div")
  el.className="bubble "+side

  const row=document.createElement("div")
  row.className="bubbleRow"

  const txt=document.createElement("div")
  txt.className="bubbleText"
  txt.textContent=text

  row.appendChild(txt)

  if(side==="them"){
    const btn=document.createElement("button")
    btn.className="spkBtn"
    btn.innerHTML=`
      <svg viewBox="0 0 24 24">
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      </svg>`

    btn.onclick=()=> speak(text,myLang)

    row.appendChild(btn)
  }

  el.appendChild(row)

  where.appendChild(el)
  where.scrollTop=where.scrollHeight
}

/* --------------------- */
async function translate(text,from,to){

  const r=await fetch(`${API_BASE}/api/translate_ai`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      text:text,
      from_lang:from,
      to_lang:to
    })
  })

  const j=await r.json().catch(()=>null)

  return j?.translated||text
}

/* --------------------- */
function base64ToBlob(base64){

  const bin=atob(base64)
  const arr=new Uint8Array(bin.length)

  for(let i=0;i<bin.length;i++){
    arr[i]=bin.charCodeAt(i)
  }

  return new Blob([arr],{type:"audio/mpeg"})
}

/* --------------------- */
async function speak(text,lang){

  if(isMuted) return

  try{

    const voice=voiceSel.value

    const r=await fetch(`${API_BASE}/api/tts`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        text:text,
        lang:lang,
        user_id:myUserId,
        module:"interpreter",
        voice
      })
    })

    const j=await r.json().catch(()=>null)

    if(!j?.audio_base64) return

    const blob=base64ToBlob(j.audio_base64)

    const url=URL.createObjectURL(blob)

    const audio=new Audio(url)

    audio.onended=()=>URL.revokeObjectURL(url)

    await audio.play().catch(()=>{})

  }catch(e){
    console.warn("tts",e)
  }

}

/* --------------------- */
async function sendMessage(){

  const text=msgInput.value.trim()

  if(!text) return

  addBubble(botChat,text,"me")

  msgInput.value=""

  await channel.send({
    type:"broadcast",
    event:"message",
    payload:{
      text,
      lang:myLang,
      user:myUserId
    }
  })

}

/* --------------------- */
async function handleIncoming(payload){

  if(payload.user===myUserId) return

  const srcText=payload.text
  const srcLang=payload.lang

  const translated=await translate(srcText,srcLang,myLang)

  addBubble(topChat,translated,"them")

  speak(translated,myLang)

}

/* --------------------- */
function initSTT(){

  const SR=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!SR) return

  recognition=new SR()

  recognition.lang="tr-TR"
  recognition.interimResults=false
  recognition.continuous=false

  recognition.onresult=(e)=>{
    msgInput.value=e.results[0][0].transcript
  }

}

/* --------------------- */
async function joinRoom(){

  channel=supabase.channel("interpreter-"+roomId,{
    config:{broadcast:{self:false}}
  })

  channel.on("broadcast",{event:"message"},({payload})=>{
    handleIncoming(payload)
  })

  channel.subscribe(async(status)=>{
    if(status==="SUBSCRIBED"){
      peerDot.classList.add("ok")
      statusText.textContent="Bağlandı"
    }
  })

}

/* --------------------- */
async function init(){

  const params=getParams()

  roomId=params.room
  hostCode=params.host
  myLang=params.my

  const {data}=await supabase.auth.getUser()
  myUserId=data?.user?.id||("guest_"+Math.random())

  renderLangs()

  initSTT()

  await joinRoom()

}

/* --------------------- */
/* UI */

sendBtn.onclick=sendMessage

msgInput.onkeydown=(e)=>{
  if(e.key==="Enter" && !e.shiftKey){
    e.preventDefault()
    sendMessage()
  }
}

micBtn.onclick=()=>{
  recognition?.start()
}

muteBtn.onclick=()=>{
  isMuted=!isMuted
  muteBtn.classList.toggle("muted-on",isMuted)
}

clearBtn.onclick=()=>{
  topChat.innerHTML=""
  botChat.innerHTML=""
}

homeBtn.onclick=()=>{
  location.href="/pages/home.html"
}

myLangSel.onchange=()=>{
  myLang=myLangSel.value
}

/* --------------------- */

init()
