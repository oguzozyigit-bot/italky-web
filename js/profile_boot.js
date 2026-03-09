import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

const $ = (id)=>document.getElementById(id);

async function boot(){

  /* UI SHELL */
  try{
    mountShell({scroll:"auto"});
  }catch(e){
    console.warn("ui_shell error",e);
  }

  await loadProfile();
  bindButtons();
}

async function loadProfile(){

  const {data:{user}} = await supabase.auth.getUser();
  if(!user) return;

  $("pEmail").textContent = user.email || "—";

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

  if(data.last_login){
    $("lastLogin").textContent =
      new Date(data.last_login).toLocaleString("tr-TR");
  }

}

function bindButtons(){

  $("logoutBtn")?.addEventListener("click", async ()=>{
    await supabase.auth.signOut();
    location.href="/login.html";
  });

  $("deleteBtn")?.addEventListener("click", async ()=>{
    if(!confirm("Hesabını kalıcı olarak silmek istediğine emin misin?")) return;

    const {data:{session}} = await supabase.auth.getSession();

    await fetch("/api/account/delete",{
      method:"POST",
      headers:{
        Authorization:`Bearer ${session.access_token}`
      }
    });

    await supabase.auth.signOut();
    location.href="/login.html";
  });

  $("copyMemberBtn")?.addEventListener("click",()=>{
    const val=$("memberNo").textContent;
    navigator.clipboard.writeText(val);
  });

}

boot();
