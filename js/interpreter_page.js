// FILE: /js/interpreter_page.js

const $ = (id)=>document.getElementById(id)

const createBtn = $("createRoom")
const joinBtn = $("joinRoom")

createBtn.onclick = () => {

const room = Math.random().toString(36).substring(2,8)

location.href = `/pages/interpreter_room.html?room=${room}`

}

joinBtn.onclick = () => {

alert("QR tarayıcı burada açılacak.")

}
