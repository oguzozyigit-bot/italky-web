// FILE: /js/live_interpreter_page.js

const log = document.getElementById("log");

function getRoom(){
const p = new URLSearchParams(location.search);
return p.get("room");
}

const room = getRoom();

if(!room){
log.innerHTML="Room yok";
throw new Error("Room missing");
}

const ws = new WebSocket(`wss://italky-api.onrender.com/ws/interpreter/${room}`);

ws.onopen = ()=>{
log.innerHTML="Bağlantı kuruldu";
};

ws.onmessage = (e)=>{
log.innerHTML+="<br>"+e.data;
};

ws.onclose = ()=>{
log.innerHTML+="<br>Bağlantı kapandı";
};
