import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

const $ = (id)=>document.getElementById(id);

async function boot(){

  /* UI SHELL ÖNCE */
  try{
    mountShell({scroll:"auto"});
  }catch(e){
    console.warn("ui_shell error",e);
  }

  /* SONRA PROFİL VERİSİ */
  await loadProfile();

}

async function loadProfile(){

  const {data:{user}} = await supabase.auth.getUser();
  if(!user) return;

  const {data} = await supabase
    .from("profiles")
    .select("*")
    .eq("id",user.id)
    .single();

  if(!data) return;

  $("pName").textContent = data.name || "—";
  $("pEmail").textContent = user.email || "—";
  $("memberNo").textContent = data.member_no || "—";
  $("tokenVal").textContent = data.tokens || 0;

}

boot();
