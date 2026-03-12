// FILE: /js/interpreter_join.js

const API = "https://italky-api.onrender.com/api";

function getRoom(){
const p = new URLSearchParams(location.search);
return p.get("room");
}

async function join(){

const room = getRoom();

if(!room){
document.body.innerHTML="Room bulunamadı";
return;
}

await fetch(`${API}/interpreter/join-room`,{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
room_id:room,
my_lang:"en"
})
});

location.href=`/pages/live_interpreter.html?room=${room}&role=guest`;

}

join();
