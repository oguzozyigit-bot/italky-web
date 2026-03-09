import { supabase } from "/js/supabase_client.js";

const qrBox = document.getElementById("homeQR");

async function loadQR(){

  const { data:{user} } = await supabase.auth.getUser();

  if(!user) return;

  const uid = user.id;

  const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://italky.ai/interpreter_join?u=${uid}`;

  qrBox.innerHTML = `<img src="${qrURL}" />`;
}

loadQR();
