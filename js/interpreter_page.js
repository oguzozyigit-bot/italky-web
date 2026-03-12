// FILE: /js/interpreter_page.js

const API = "https://italky-api.onrender.com/api";

const createBtn = document.getElementById("createRoom");
const qrBox = document.getElementById("qr");

async function createRoom(){

const r = await fetch(`${API}/interpreter/create-room`,{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({ my_lang:"tr" })
});

const j = await r.json();

if(!j.room_id){
alert("Room oluşturulamadı");
return;
}

const roomId = j.room_id;

const url = `${location.origin}/pages/interpreter_join.html?room=${roomId}`;

generateQR(url);

watchRoom(roomId);

}

function generateQR(text){

qrBox.innerHTML="";

const img=document.createElement("img");

img.src=`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(text)}`;

qrBox.appendChild(img);

}

async function watchRoom(room){

setInterval(async()=>{

const r = await fetch(`${API}/interpreter/room/${room}`);

const j = await r.json();

if(j.status==="active"){
location.href=`/pages/live_interpreter.html?room=${room}&role=host`;
}

},1500);

}

createBtn.onclick=createRoom;
