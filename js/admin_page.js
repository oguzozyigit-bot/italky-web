import { supabase } from "/js/supabase_client.js";
import { safeLogout } from "/js/auth.js";
import { mountShell } from "/js/ui_shell.js";

const API_BASE = "https://italky-api.onrender.com"; // italky-api servisiniz
const $ = (id)=>document.getElementById(id);

function toast(msg){
  const el = $("toast");
  if(!el) return;
  el.textContent = String(msg||"");
  el.classList.add("show");
  clearTimeout(window.__tto);
  window.__tto = setTimeout(()=>el.classList.remove("show"), 2200);
}

async function getAccessToken(){
  const { data:{ session } } = await supabase.auth.getSession();
  return session?.access_token || "";
}

async function api(path, opts={}){
  const token = await getAccessToken();
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers||{}),
      "Authorization": `Bearer ${token}`,
    }
  });
  const txt = await r.text().catch(()=> "");
  let data = null;
  try{ data = txt ? JSON.parse(txt) : null; }catch{ data = { raw: txt }; }
  if(!r.ok){
    const msg = data?.detail || data?.error || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

let onlyAdmins = false;

function roleTag(role){
  const r = String(role||"user").toLowerCase();
  if(r === "superadmin") return `<span class="tag ok">SUPERADMIN</span>`;
  if(r === "admin") return `<span class="tag ok">ADMIN</span>`;
  if(r === "moderator") return `<span class="tag warn">MOD</span>`;
  return `<span class="tag">USER</span>`;
}

function statusTag(u){
  // basit: jeton 0 ise warn, yoksa ok
  const t = Number(u?.tokens ?? 0);
  if(t <= 0) return `<span class="tag warn">JETON: 0</span>`;
  return `<span class="tag ok">AKTİF</span>`;
}

function rowHtml(u){
  const id = u.id;
  const name = u.name || "Kullanıcı";
  const email = u.email || "";
  const role = (u.role || "user").toLowerCase();
  const tokens = Number(u.tokens ?? 0);

  return `
  <tr data-id="${id}">
    <td>
      <div style="display:flex; flex-direction:column; gap:4px;">
        <div style="font-weight:1000;">${escapeHtml(name)}</div>
        <div class="mini">${roleTag(role)}</div>
      </div>
    </td>
    <td>
      <div style="display:flex; flex-direction:column; gap:4px;">
        <div style="font-weight:900;">${escapeHtml(email)}</div>
        <div class="mini">${escapeHtml(u.last_login_at || "")}</div>
      </div>
    </td>
    <td class="mini">${escapeHtml(id)}</td>
    <td>
      <select class="role" data-role>
        ${["user","moderator","admin","superadmin"].map(r=>(
          `<option value="${r}" ${r===role?"selected":""}>${r.toUpperCase()}</option>`
        )).join("")}
      </select>
      <button class="btn ok" data-save-role style="height:34px; margin-left:8px;">Kaydet</button>
    </td>
    <td>
      <div class="tokenBox">
        <span class="num" data-tokens>${tokens}</span>
        <button class="tinyBtn" data-tminus title="-1">−</button>
        <button class="tinyBtn" data-tplus title="+1">+</button>
      </div>
    </td>
    <td>${statusTag(u)}</td>
  </tr>`;
}

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function boot(){
  // ui shell (admin sayfasında da üst-alt bar olsun istiyorsan)
  try{ mountShell({ scroll: "auto" }); }catch{}

  // login kontrol
  const { data:{ session } } = await supabase.auth.getSession();
  if(!session){
    location.replace("/pages/login.html");
    return;
  }

  // yetki kontrolü
  try{
    const me = await api("/api/admin/me");
    $("meRole").textContent = String(me?.role||"—").toUpperCase();
    $("meEmail").textContent = me?.email || "—";
  }catch(e){
    toast("Yetkisiz: admin değil");
    location.replace("/pages/home.html");
    return;
  }

  bind();
  await refresh();
}

function bind(){
  $("logoutBtn")?.addEventListener("click", async ()=>{
    await safeLogout();
  });

  $("refreshBtn")?.addEventListener("click", refresh);

  $("onlyAdminsBtn")?.addEventListener("click", async ()=>{
    onlyAdmins = !onlyAdmins;
    $("onlyAdminsBtn").classList.toggle("ok", onlyAdmins);
    $("onlyAdminsBtn").textContent = onlyAdmins ? "Admin Filtre: Açık" : "Sadece Admin";
    await refresh();
  });

  $("q")?.addEventListener("input", ()=>{
    // client-side filtre
    const q = String($("q").value||"").toLowerCase().trim();
    const rows = document.querySelectorAll("#rows tr");
    rows.forEach(tr=>{
      const t = tr.textContent.toLowerCase();
      tr.style.display = (!q || t.includes(q)) ? "" : "none";
    });
  });

  $("rows")?.addEventListener("click", async (e)=>{
    const tr = e.target.closest("tr[data-id]");
    if(!tr) return;
    const userId = tr.getAttribute("data-id");

    // token + / -
    if(e.target.closest("[data-tplus]")){
      await changeTokens(userId, +1, tr);
      return;
    }
    if(e.target.closest("[data-tminus]")){
      await changeTokens(userId, -1, tr);
      return;
    }

    // role save
    if(e.target.closest("[data-save-role]")){
      const sel = tr.querySelector("[data-role]");
      const role = sel?.value || "user";
      await changeRole(userId, role, tr);
      return;
    }
  });
}

async function refresh(){
  try{
    toast("Yükleniyor…");
    const list = await api(`/api/admin/users?only_admins=${onlyAdmins ? "1":"0"}`);
    const rowsEl = $("rows");
    rowsEl.innerHTML = (list||[]).map(rowHtml).join("");

    // filtre tekrar uygula
    $("q")?.dispatchEvent(new Event("input"));

    toast(`Yüklendi: ${list?.length||0}`);
  }catch(e){
    console.error(e);
    toast(e?.message || "Hata");
  }
}

async function changeRole(userId, role, tr){
  try{
    toast("Rol güncelleniyor…");
    const out = await api(`/api/admin/user/${encodeURIComponent(userId)}/role`, {
      method:"POST",
      body: JSON.stringify({ role })
    });
    toast("Rol güncellendi");
    // satırdaki role tag’i güncellemek için hızlı refresh:
    await refresh();
  }catch(e){
    console.error(e);
    toast(e?.message || "Rol güncellenemedi");
  }
}

async function changeTokens(userId, delta, tr){
  try{
    toast("Jeton güncelleniyor…");
    const out = await api(`/api/admin/user/${encodeURIComponent(userId)}/tokens`, {
      method:"POST",
      body: JSON.stringify({ delta })
    });
    // UI update
    const n = tr.querySelector("[data-tokens]");
    if(n) n.textContent = String(out?.tokens ?? n.textContent);
    toast("Jeton güncellendi");
  }catch(e){
    console.error(e);
    toast(e?.message || "Jeton güncellenemedi");
  }
}

document.addEventListener("DOMContentLoaded", boot);
