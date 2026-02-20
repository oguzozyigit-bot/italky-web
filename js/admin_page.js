// FILE: /js/admin_page.js
import { supabase } from "/js/supabase_client.js";
import { safeLogout } from "/js/auth.js";
import { mountShell } from "/js/ui_shell.js";

mountShell({ scroll: "auto" });

const $ = (id)=>document.getElementById(id);

const API = "https://italky-api.onrender.com/api";

function tab(name){
  ["users","deploy","github"].forEach(t=>{
    document.querySelector(`.tab[data-tab="${t}"]`)?.classList.toggle("active", t===name);
    $(`panel${t.charAt(0).toUpperCase()+t.slice(1)}`).style.display = (t===name) ? "block":"none";
  });
}

document.querySelectorAll(".tab").forEach(el=>{
  el.addEventListener("click", ()=> tab(el.dataset.tab));
});

$("homeBtn").onclick = ()=> location.href="/pages/home.html";
$("logoutBtn").onclick = ()=> safeLogout();

async function getAccessToken(){
  const { data:{ session } } = await supabase.auth.getSession();
  return session?.access_token || "";
}

async function api(path, opts={}){
  const token = await getAccessToken();
  if(!token) throw new Error("NO_SESSION");
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type":"application/json",
      "Authorization": `Bearer ${token}`,
      ...(opts.headers||{})
    }
  });
  const txt = await r.text();
  let j = null; try{ j = JSON.parse(txt); }catch{ j = { raw: txt }; }
  if(!r.ok) throw new Error(j?.detail || txt || `HTTP_${r.status}`);
  return j;
}

async function boot(){
  // admin mi?
  try{
    const me = await api("/admin/me");
    $("meLine").textContent = `Yetki: ${me.me.role} • UID: ${me.me.user_id}`;
  }catch(e){
    $("meLine").textContent = "Admin değil / oturum yok";
    location.replace("/pages/home.html");
    return;
  }
  await renderUsers();
  renderDeploy();
  renderGithub();
}

async function renderUsers(){
  const box = $("panelUsers");
  box.innerHTML = `<div class="muted">Yükleniyor…</div>`;
  try{
    const r = await api("/admin/users");
    const items = r.items || [];
    box.innerHTML = `
      <div class="grid">
        ${items.map(u=>`
          <div class="card">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <div>
                <div style="font-weight:1000">${u.full_name || "—"}</div>
                <div class="muted">${u.email || "—"} • ${u.id}</div>
                <div class="muted">Jeton: ${u.tokens ?? "—"} • Role: <b>${u.role || "user"}</b></div>
              </div>
              <div style="min-width:180px">
                <select class="inp" data-role="${u.id}">
                  <option value="user" ${u.role==="user"?"selected":""}>user</option>
                  <option value="admin" ${u.role==="admin"?"selected":""}>admin</option>
                  <option value="superadmin" ${u.role==="superadmin"?"selected":""}>superadmin</option>
                </select>
                <button class="btn primary" data-save="${u.id}" style="margin-top:8px;width:100%">Kaydet</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    box.querySelectorAll("[data-save]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const uid = btn.getAttribute("data-save");
        const sel = box.querySelector(`[data-role="${uid}"]`);
        const role = sel?.value || "user";
        btn.textContent = "…";
        try{
          await api("/admin/users/role", { method:"POST", body: JSON.stringify({ user_id: uid, role }) });
          btn.textContent = "Kaydedildi";
          setTimeout(()=>btn.textContent="Kaydet", 900);
          await renderUsers();
        }catch(e){
          alert(e.message || String(e));
          btn.textContent = "Kaydet";
        }
      });
    });

  }catch(e){
    box.innerHTML = `<div class="card">Hata: ${e.message || e}</div>`;
  }
}

function renderDeploy(){
  const box = $("panelDeploy");
  box.innerHTML = `
    <div class="card">
      <div style="font-weight:1000;margin-bottom:8px">Deploy</div>
      <div class="muted">Vercel/Render deploy hook ile tetikler.</div>
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <button class="btn primary" id="depVercel">Vercel Deploy</button>
        <button class="btn primary" id="depRender">Render Deploy</button>
      </div>
    </div>
  `;

  box.querySelector("#depVercel").onclick = async ()=>{
    try{ await api("/admin/deploy/vercel", { method:"POST" }); alert("Vercel deploy tetiklendi"); }
    catch(e){ alert(e.message || e); }
  };
  box.querySelector("#depRender").onclick = async ()=>{
    try{ await api("/admin/deploy/render", { method:"POST" }); alert("Render deploy tetiklendi"); }
    catch(e){ alert(e.message || e); }
  };
}

function renderGithub(){
  const box = $("panelGithub");
  box.innerHTML = `
    <div class="card">
      <div style="font-weight:1000;margin-bottom:8px">GitHub Dosya Commit</div>
      <div class="muted">Örn: pages/hangman.html veya js/hangman_page.js</div>

      <div style="display:grid;gap:10px;margin-top:10px">
        <input class="inp" id="ghPath" placeholder="path (örn: pages/hangman.html)" />
        <input class="inp" id="ghMsg" placeholder="commit message" value="admin update" />
        <textarea id="ghContent" placeholder="dosya içeriği..."></textarea>
        <button class="btn primary" id="ghCommit">Commit</button>
      </div>
    </div>
  `;

  box.querySelector("#ghCommit").onclick = async ()=>{
    const path = box.querySelector("#ghPath").value.trim();
    const message = box.querySelector("#ghMsg").value.trim() || "admin update";
    const content = box.querySelector("#ghContent").value;

    if(!path){ alert("path boş"); return; }

    const btn = box.querySelector("#ghCommit");
    btn.textContent = "Gönderiliyor…";
    try{
      await api("/admin/github/commit", {
        method:"POST",
        body: JSON.stringify({ path, message, content, branch:"main" })
      });
      alert("Commit OK");
    }catch(e){
      alert(e.message || e);
    }finally{
      btn.textContent = "Commit";
    }
  };
}

boot();
