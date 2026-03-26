import { supabase } from "/js/supabase_client.js";
import { safeLogout } from "/js/auth.js";
import { mountShell } from "/js/ui_shell.js";

try{
  mountShell({ scroll: "auto" });
}catch(e){
  console.warn("ui_shell admin skip:", e);
}

const $ = (id) => document.getElementById(id);
const API = "https://italky-api.onrender.com/api";

const loginView = $("loginView");
const panelView = $("panelView");
const loginStatus = $("loginStatus");
const meLine = $("meLine");

function setLoginStatus(text, type = ""){
  loginStatus.className = `status-line ${type}`.trim();
  loginStatus.textContent = text || "";
}

function setInfoLine(el, text, ok = true){
  if(!el) return;
  el.className = `info-line ${ok ? "status-ok" : "status-err"}`;
  el.textContent = text || "";
}

function showPanel(){
  loginView.classList.add("hidden");
  panelView.classList.remove("hidden");
}

function showLogin(){
  panelView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

function normalizeUid(uid){
  return String(uid || "")
    .toUpperCase()
    .replace(/:/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function tab(name){
  const names = ["users","nfc","deploy","github"];

  names.forEach((t) => {
    const btn = document.querySelector(`.tab[data-tab="${t}"]`);
    const panel = $(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`);
    btn?.classList.toggle("active", t === name);
    panel?.classList.toggle("hidden", t !== name);
  });
}

document.querySelectorAll(".tab").forEach((el) => {
  el.addEventListener("click", () => tab(el.dataset.tab));
});

$("homeBtn").onclick = () => location.href = "/pages/home.html";
$("logoutBtn").onclick = async () => {
  await safeLogout();
};

async function getAccessToken(){
  const { data:{ session } } = await supabase.auth.getSession();
  return session?.access_token || "";
}

async function api(path, opts = {}){
  const token = await getAccessToken();
  if(!token) throw new Error("NO_SESSION");

  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type":"application/json",
      "Authorization": `Bearer ${token}`,
      ...(opts.headers || {})
    }
  });

  const txt = await r.text();
  let j = null;

  try{
    j = JSON.parse(txt);
  }catch{
    j = { raw: txt };
  }

  if(!r.ok){
    throw new Error(j?.detail || txt || `HTTP_${r.status}`);
  }

  return j;
}

async function login(){
  try{
    setLoginStatus("Giriş yapılıyor...", "status-warn");

    const email = $("email").value.trim();
    const password = $("password").value;

    if(!email || !password){
      setLoginStatus("E-posta ve şifre gerekli.", "status-err");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) throw error;

    await boot();
    showPanel();
    setLoginStatus("", "");
  }catch(e){
    setLoginStatus(e.message || "Giriş başarısız.", "status-err");
  }
}

$("loginBtn").addEventListener("click", login);

async function boot(){
  try{
    const me = await api("/admin/me");
    meLine.textContent = `Yetki: ${me.me.role} • UID: ${me.me.user_id}`;

    renderUsers();
    ();
    renderDeploy();
    renderGithub();
    tab("users");
  }catch(e){
    meLine.textContent = "Admin değil / oturum yok";
    showLogin();
    location.replace("/pages/home.html");
  }
}

async function renderUsers(){
  const box = $("panelUsers");
  box.innerHTML = `
    <div class="admin-card">
      <h3>Kullanıcı Yönetimi</h3>
      <p>Sistemdeki kullanıcıları gör, rollerini değiştir ve yönetimi merkezden yap.</p>
      <div class="muted">Yükleniyor…</div>
    </div>
  `;

  try{
    const r = await api("/admin/users");
    const items = r.items || [];

    box.innerHTML = `
      <div class="admin-card">
        <h3>Kullanıcı Yönetimi</h3>
        <p>Admin ve superadmin yetkileri buradan kontrol edilir.</p>
        <div class="user-grid">
          ${items.map(u => `
            <div class="user-item">
              <div>
                <div class="user-main-name">${u.full_name || "—"}</div>
                <div class="user-meta">
                  <div><b>E-posta:</b> ${u.email || "—"}</div>
                  <div><b>User ID:</b> ${u.id}</div>
                  <div><b>Rol:</b> ${u.role || "user"}</div>
                  <div><b>Jeton:</b> ${u.tokens ?? "—"}</div>
                  <div><b>Oluşturulma:</b> ${u.created_at || "—"}</div>
                  <div><b>Son Giriş:</b> ${u.last_login_at || "—"}</div>
                </div>
              </div>

              <div class="user-actions">
                <select class="sel" data-role="${u.id}">
                  <option value="user" ${u.role === "user" ? "selected" : ""}>user</option>
                  <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
                  <option value="superadmin" ${u.role === "superadmin" ? "selected" : ""}>superadmin</option>
                </select>
                <button class="btn btn-primary" data-save="${u.id}">Rolü Kaydet</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    box.querySelectorAll("[data-save]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = btn.getAttribute("data-save");
        const sel = box.querySelector(`[data-role="${uid}"]`);
        const role = sel?.value || "user";

        btn.textContent = "Kaydediliyor...";
        try{
          await api("/admin/users/role", {
            method:"POST",
            body: JSON.stringify({ user_id: uid, role })
          });
          btn.textContent = "Kaydedildi";
          setTimeout(() => btn.textContent = "Rolü Kaydet", 1000);
          await renderUsers();
        }catch(e){
          alert(e.message || String(e));
          btn.textContent = "Rolü Kaydet";
        }
      });
    });

  }catch(e){
    box.innerHTML = `
      <div class="admin-card">
        <h3>Kullanıcı Yönetimi</h3>
        <div class="info-line status-err">Hata: ${e.message || e}</div>
      </div>
    `;
  }
}

function renderNfc(){
  const box = $("panelNfc");

  box.innerHTML = `
    <div class="grid">
      <div class="admin-card">
        <h3>NFC + QR Kart Tanımlama</h3>
        <p>Aynı UID hem NFC için hem QR için kullanılacak. QR link otomatik üretilir.</p>

        <div class="kv">
          <input class="inp" id="nfcUidInput" placeholder="UID (örn: 04:E6:D4:62:FD:16:90)" />
          <select class="sel" id="nfcPackage">
            <option value="PKG_10DIL_100J_30G">10 Dil + 100 Jeton / 30 Gün</option>
            <option value="PKG_20DIL_200J_395G">20 Dil + 200 Jeton / 395 Gün</option>
            <option value="PREMIUM_1YIL">Premium 1 Yıl</option>
          </select>

          <button class="btn btn-primary" id="saveNfcBtn">Kartı Kaydet</button>
          <div id="nfcStatus" class="info-line"></div>
        </div>
      </div>

      <div class="admin-card">
        <h3>QR Link Üretici</h3>
        <p>Noktalı UID girebilirsin. Sistem temizleyip QR için hazır link üretir.</p>

        <div class="kv">
          <input class="inp" id="uidPreviewInput" placeholder="Örn: 04:E6:D4:62:FD:16:90" />
          <input class="inp" id="uidPreviewOutput" placeholder="Temiz UID burada görünür" readonly />
          <input class="inp" id="qrLinkOutput" placeholder="QR link burada oluşur" readonly />
        </div>
      </div>
    </div>
  `;

  const nfcUidInput = box.querySelector("#nfcUidInput");
  const uidPreviewInput = box.querySelector("#uidPreviewInput");
  const uidPreviewOutput = box.querySelector("#uidPreviewOutput");
  const qrLinkOutput = box.querySelector("#qrLinkOutput");
  const nfcStatus = box.querySelector("#nfcStatus");
  const saveBtn = box.querySelector("#saveNfcBtn");

  function makeQrLink(uid){
    return uid ? `https://italky.ai/open/access?uid=${encodeURIComponent(uid)}` : "";
  }

  function syncPreview(){
    const clean = normalizeUid(uidPreviewInput.value);
    uidPreviewOutput.value = clean;
    qrLinkOutput.value = makeQrLink(clean);
  }

  uidPreviewInput.addEventListener("input", syncPreview);
  syncPreview();

  saveBtn.onclick = async () => {
    const raw = nfcUidInput.value;
    const uid = normalizeUid(raw);
    const pkg = box.querySelector("#nfcPackage").value;

    if(!uid){
      setInfoLine(nfcStatus, "UID boş olamaz.", false);
      return;
    }

    const qrLink = makeQrLink(uid);
    saveBtn.textContent = "Kaydediliyor...";

    try{
      const exists = await supabase
        .from("nfc_cards")
        .select("id,uid")
        .eq("uid", uid)
        .maybeSingle();

      if(exists?.error) throw exists.error;

      if(exists?.data?.id){
        const { error:updateError } = await supabase
          .from("nfc_cards")
          .update({
            package_code: pkg,
            is_active: true,
            status: "new"
          })
          .eq("id", exists.data.id);

        if(updateError) throw updateError;

        setInfoLine(nfcStatus, `Kart güncellendi. QR Link: ${qrLink}`, true);
      } else {
        const { error:insertError } = await supabase
          .from("nfc_cards")
          .insert({
            uid: uid,
            package_code: pkg,
            is_active: true,
            status: "new"
          });

        if(insertError) throw insertError;

        setInfoLine(nfcStatus, `Kart eklendi. QR Link: ${qrLink}`, true);
      }

      uidPreviewInput.value = raw;
      uidPreviewOutput.value = uid;
      qrLinkOutput.value = qrLink;

      nfcUidInput.value = "";
      saveBtn.textContent = "Kartı Kaydet";
    }catch(e){
      setInfoLine(nfcStatus, e.message || "Kart kaydedilemedi.", false);
      saveBtn.textContent = "Kartı Kaydet";
    }
  };
}
function renderGithub(){
  const box = $("panelGithub");
  box.innerHTML = `
    <div class="admin-card">
      <h3>GitHub Dosya Commit</h3>
      <p>Dosya içeriğini direkt repo içine commit atmak için kullanılır.</p>

      <div class="kv">
        <input class="inp" id="ghPath" placeholder="Path (örn: pages/hangman.html)" />
        <input class="inp" id="ghMsg" placeholder="Commit mesajı" value="admin update" />
        <textarea class="txta" id="ghContent" placeholder="Dosya içeriği..."></textarea>
        <div class="row-buttons">
          <button class="btn btn-primary" id="ghCommit">Commit Gönder</button>
        </div>
        <div id="ghStatus" class="info-line"></div>
      </div>
    </div>
  `;

  const btn = box.querySelector("#ghCommit");
  const status = box.querySelector("#ghStatus");

  btn.onclick = async () => {
    const path = box.querySelector("#ghPath").value.trim();
    const message = box.querySelector("#ghMsg").value.trim() || "admin update";
    const content = box.querySelector("#ghContent").value;

    if(!path){
      setInfoLine(status, "Path boş olamaz.", false);
      return;
    }

    btn.textContent = "Gönderiliyor...";

    try{
      await api("/admin/github/commit", {
        method:"POST",
        body: JSON.stringify({ path, message, content, branch:"main" })
      });
      setInfoLine(status, "Commit başarılı.", true);
    }catch(e){
      setInfoLine(status, e.message || "Commit hatası.", false);
    }finally{
      btn.textContent = "Commit Gönder";
    }
  };
}

async function init(){
  try{
    const { data:{ session } } = await supabase.auth.getSession();
    if(session?.access_token){
      await boot();
      showPanel();
    } else {
      showLogin();
    }
  }catch{
    showLogin();
  }
}

init();
