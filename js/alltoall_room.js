const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api";

const $ = (id) => document.getElementById(id);

const chat = $("chat");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");
const peopleScroll = $("peopleScroll");
const peopleCount = $("peopleCount");
const langSelect = $("langSelect");

const params = new URLSearchParams(location.search);
const roomId = (params.get("room") || "").trim().toUpperCase();

let ws = null;
let myLang = "tr";
let recognizing = false;
let recognizer = null;

/* ==============================
   LANGUAGES
================================*/
const LANGS = [
  "tr","en","de","fr","it","es","ru","el","az","ka"
];

function buildLangSelect(){
  if(!langSelect) return;

  LANGS.forEach(code=>{
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code.toUpperCase();
    langSelect.appendChild(opt);
  });

  langSelect.value = myLang;

  langSelect.onchange = ()=>{
    myLang = langSelect.value;
  };
}

/* ==============================
   MESSAGE UI
================================*/
function addMessage(text, side="left", sender=""){
  if(!chat) return;

  const row = document.createElement("div");
  row.className = "msg-row " + side;

  const name = document.createElement("div");
  name.className = "sender-name";
  name.textContent = sender;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  row.appendChild(name);
  row.appendChild(bubble);

  chat.appendChild(row);

  chat.scrollTop = chat.scrollHeight;
}

/* ==============================
   PEOPLE BAR
================================*/
function addUser(name){
  const wrap = document.createElement("div");
  wrap.className = "pItem";

  const avatar = document.createElement("div");
  avatar.className = "pAvatar";
  avatar.textContent = name.charAt(0).toUpperCase();

  const label = document.createElement("div");
  label.className = "pName";
  label.textContent = name;

  wrap.appendChild(avatar);
  wrap.appendChild(label);

  peopleScroll.appendChild(wrap);

  updatePeopleCount();
}

function updatePeopleCount(){
  peopleCount.textContent = peopleScroll.children.length;
}

/* ==============================
   WEBSOCKET
================================*/
function connectSocket(){

  if(!roomId){
    alert("Room bulunamadı");
    return;
  }

  ws = new WebSocket(`${WS_BASE}/ws/walkie/${roomId}?lang=${myLang}`);

  ws.onopen = ()=>{
    console.log("connected");
  };

  ws.onmessage = (e)=>{
    try{
      const data = JSON.parse(e.data);

      if(data.type === "message"){
        addMessage(data.text,"left",data.sender || "user");
      }

      if(data.type === "join"){
        addUser(data.name || "user");
      }

    }catch(err){
      console.warn(err);
    }
  };

  ws.onclose = ()=>{
    console.log("socket closed");
  };
}

/* ==============================
   SEND
================================*/
function sendMessage(){

  const text = msgInput.value.trim();
  if(!text) return;

  addMessage(text,"right","Ben");

  if(ws && ws.readyState === 1){
    ws.send(JSON.stringify({
      type:"message",
      text,
      lang:myLang
    }));
  }

  msgInput.value = "";
}

/* ==============================
   SPEECH RECOGNITION
================================*/
function initSpeech(){

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if(!SR){
    micBtn.style.display="none";
    return;
  }

  recognizer = new SR();
  recognizer.lang = myLang;
  recognizer.interimResults = false;

  recognizer.onresult = (e)=>{
    const text = e.results[0][0].transcript;
    msgInput.value = text;
    sendMessage();
  };

  recognizer.onend = ()=>{
    recognizing=false;
    micBtn.classList.remove("listening");
  };
}

function toggleMic(){

  if(!recognizer) return;

  if(recognizing){
    recognizer.stop();
    recognizing=false;
    micBtn.classList.remove("listening");
    return;
  }

  recognizing=true;
  micBtn.classList.add("listening");
  recognizer.lang = myLang;
  recognizer.start();
}

/* ==============================
   EVENTS
================================*/
sendBtn.onclick = sendMessage;

msgInput.addEventListener("keydown",(e)=>{
  if(e.key==="Enter" && !e.shiftKey){
    e.preventDefault();
    sendMessage();
  }
});

micBtn.onclick = toggleMic;

/* ==============================
   INIT
================================*/
buildLangSelect();
initSpeech();
connectSocket();
