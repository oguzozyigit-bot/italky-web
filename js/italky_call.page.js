window.__ITALKY_CALL_JS_LOADED = true;
window.__ITALKY_CALL_JS_VERSION = "FINAL_PROFILE_READ_1";
console.warn("[italky_call] JS loaded FINAL_PROFILE_READ_1");

let supabase = null;
let initGlobalAccess = null;
window.__ITALKY_CALL_BOOT_STARTED = false;
window.__ITALKY_CALL_BOOT_DONE = false;

const $ = (id) => document.getElementById(id);
const CALL_DELIVERY_TIMEOUT_MS = 10000;
const CALL_RING_TIMEOUT_MS = 30000;

let currentUser = null;
let activeCallId = null;
let activePeer = null;
let ringTimeout = null;
let deliveryTimeout = null;
let timerInterval = null;
let callStartedAt = null;
let captionsVisible = true;
let realtimeChannel = null;

const els = {
  homeScreen: $("homeScreen"),
  ringingScreen: $("ringingScreen"),
  incomingScreen: $("incomingScreen"),
  activeScreen: $("activeScreen"),
  endedSheet: $("endedSheet"),
  toast: $("toast"),
  myNo: $("myNo"),
  topMyNo: $("topMyNo"),
  copyMyNo: $("copyMyNo"),
  calleeNoInput: $("calleeNoInput"),
  callBtn: $("callBtn"),
  recentBtn: $("recentBtn"),
  contactsList: $("contactsList"),
  recentList: $("recentList"),
  presencePill: $("presencePill"),
  ringAvatar: $("ringAvatar"),
  ringName: $("ringName"),
  ringSub: $("ringSub"),
  ringStatus: $("ringStatus"),
  cancelCallBtn: $("cancelCallBtn"),
  incomingAvatar: $("incomingAvatar"),
  incomingName: $("incomingName"),
  incomingText: $("incomingText"),
  acceptBtn: $("acceptBtn"),
  rejectBtn: $("rejectBtn"),
  activeAvatar: $("activeAvatar"),
  activeName: $("activeName"),
  callTimer: $("callTimer"),
  langLine: $("langLine"),
  captionCard: $("captionCard"),
  captionToggle: $("captionToggle"),
  muteBtn: $("muteBtn"),
  speakerBtn: $("speakerBtn"),
  endCallBtn: $("endCallBtn"),
  endedText: $("endedText"),
  addContactBtn: $("addContactBtn"),
  laterBtn: $("laterBtn"),
  blockBtn: $("blockBtn")
};

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = String(message || "");
  els.toast.classList.add("show");
  clearTimeout(window.__italkyCallToastTimer);
  window.__italkyCallToastTimer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function formatNo(value) {
  const d = onlyDigits(value);
  if (d.length >= 11) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
  return d || "0601 ___ __ __";
}

function initials(name = "") {
  const parts = String(name || "AI").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AI";
  return (parts[0][0] || "A") + (parts[1]?.[0] || "");
}

function showScreen(name) {
  [els.homeScreen, els.ringingScreen, els.incomingScreen, els.activeScreen].forEach((screen) => screen?.classList.remove("show"));
  els[`${name}Screen`]?.classList.add("show");
}

function clearCallTimers() {
  clearTimeout(ringTimeout);
  clearTimeout(deliveryTimeout);
  clearInterval(timerInterval);
  ringTimeout = null;
  deliveryTimeout = null;
  timerInterval = null;
}

async function rpc(name, args = {}) {
  if (!supabase) throw new Error("supabase_not_ready");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

async function loadCallDeps() {
  if (supabase) return true;

  try {
    const supaMod = await import("/js/supabase_client.js?v=call-final-profile-read-1");
    supabase = supaMod?.supabase || null;
  } catch (e) {
    console.error("[italky_call] supabase import failed", e);
    setMyNoDisplay("Supabase yüklenemedi");
    showToast("Supabase bağlantısı yüklenemedi.");
    return false;
  }

  try {
    const accessMod = await import("/js/global_access.js?v=call-final-profile-read-1");
    initGlobalAccess = accessMod?.initGlobalAccess || null;
  } catch (e) {
    console.warn("[italky_call] global_access import skipped", e);
    initGlobalAccess = null;
  }

  return !!supabase;
}

async function requireAuth() {
  if (!(await loadCallDeps())) return null;

  // Call ekranında numara gösterimini global access beklemesine kilitlemiyoruz.
  // Access kontrolü varsa arka planda çalışır; takılırsa italkyAI No okumasını durdurmaz.
  try {
    if (typeof initGlobalAccess === "function") {
      void withTimeout(
        initGlobalAccess({ allowPublicPageBypass: false }),
        2500,
        "global_access_timeout"
      ).catch((e) => console.warn("[italky_call] global access skipped", e));
    }
  } catch (e) {
    console.warn("[italky_call] global access skipped", e);
  }

  const { data: { session } = {} } = await withTimeout(
    supabase.auth.getSession(),
    6500,
    "session_timeout"
  );
  if (!session?.user) {
    location.replace("/pages/login.html");
    return null;
  }

  currentUser = session.user;
  return currentUser;
}


function isValidItalkyNoRaw(value) {
  return /^0601[2-9]\d{6}$/.test(onlyDigits(value));
}

function clearBadMyNoCache() {
  try {
    const raw = onlyDigits(localStorage.getItem("italky_my_no") || localStorage.getItem("italky_my_no_formatted") || "");
    if (!isValidItalkyNoRaw(raw)) {
      localStorage.removeItem("italky_my_no");
      localStorage.removeItem("italky_my_no_formatted");
    }
  } catch {}
}

function cacheMyNo(rawNo) {
  const raw = onlyDigits(rawNo);
  if (!isValidItalkyNoRaw(raw)) {
    clearBadMyNoCache();
    return "";
  }
  const formatted = formatNo(raw);
  try {
    localStorage.setItem("italky_my_no", raw);
    localStorage.setItem("italky_my_no_formatted", formatted);
  } catch {}
  return formatted;
}

function setMyNoDisplay(value) {
  const text = String(value || "").trim() || "Numara alınamadı";
  if (els.myNo) els.myNo.textContent = text;
  if (els.topMyNo) els.topMyNo.textContent = text;
}

function withTimeout(promise, ms = 4500, label = "timeout") {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms))
  ]);
}

async function readMyNoFromProfileById() {
  if (!currentUser?.id) return "";
  const { data, error } = await withTimeout(
    supabase.from("profiles").select("italky_no").eq("id", String(currentUser.id)).maybeSingle(),
    4500,
    "profile_id_timeout"
  );
  if (error) throw error;
  return data?.italky_no || "";
}

async function readMyNoFromProfileByEmail() {
  if (!currentUser?.email) return "";
  const { data, error } = await withTimeout(
    supabase.from("profiles").select("italky_no").eq("email", String(currentUser.email)).maybeSingle(),
    4500,
    "profile_email_timeout"
  );
  if (error) throw error;
  return data?.italky_no || "";
}

async function ensureMyNo() {
  clearBadMyNoCache();

  const cachedRaw = onlyDigits(localStorage.getItem("italky_my_no") || "");
  if (isValidItalkyNoRaw(cachedRaw)) {
    setMyNoDisplay(formatNo(cachedRaw));
  } else {
    setMyNoDisplay("No okunuyor...");
  }

  if (!supabase || !currentUser?.id) {
    setMyNoDisplay(cachedRaw ? formatNo(cachedRaw) : "Oturum bulunamadı");
    return cachedRaw ? formatNo(cachedRaw) : "";
  }

  // Profil sayfasındaki çalışan mantıkla aynı: doğrudan profiles.id üzerinden oku.
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("profiles")
        .select("id,email,italky_no")
        .eq("id", String(currentUser.id))
        .maybeSingle(),
      6500,
      "profile_id_timeout"
    );

    if (error) throw error;

    const raw = onlyDigits(data?.italky_no || "");
    console.warn("[italky_call] profile id no", { raw, email: data?.email });

    if (isValidItalkyNoRaw(raw)) {
      const formatted = cacheMyNo(raw);
      setMyNoDisplay(formatted);
      return formatted;
    }
  } catch (e) {
    console.warn("[italky_call] profile id no failed", e);
  }

  // E-posta ile yedek oku.
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("profiles")
        .select("id,email,italky_no")
        .eq("email", String(currentUser.email || ""))
        .maybeSingle(),
      6500,
      "profile_email_timeout"
    );

    if (error) throw error;

    const raw = onlyDigits(data?.italky_no || "");
    console.warn("[italky_call] profile email no", { raw, email: data?.email });

    if (isValidItalkyNoRaw(raw)) {
      const formatted = cacheMyNo(raw);
      setMyNoDisplay(formatted);
      return formatted;
    }
  } catch (e) {
    console.warn("[italky_call] profile email no failed", e);
  }

  // Son çare: RPC ile üret/oku. RPC hatası ekrandaki gösterimi kilitlemesin.
  const rpcAttempts = ["ensure_my_italky_no", "get_my_italky_call_profile"];
  for (const fn of rpcAttempts) {
    try {
      const rows = await withTimeout(rpc(fn), 6500, `${fn}_timeout`);
      const row = Array.isArray(rows) ? rows[0] : rows;
      const raw = onlyDigits(row?.italky_no || row?.formatted_italky_no || "");
      console.warn("[italky_call] rpc no", { fn, raw });
      if (isValidItalkyNoRaw(raw)) {
        const formatted = cacheMyNo(raw);
        setMyNoDisplay(formatted);
        return formatted;
      }
    } catch (e) {
      console.warn(`[italky_call] ${fn} failed`, e);
    }
  }

  setMyNoDisplay("Numara alınamadı");
  return "";
}


async function setPresence(value = "online") {
  try {
    await rpc("set_my_italky_call_presence", { p_presence: value });
    els.presencePill?.classList.toggle("offline", value !== "online");
    els.presencePill?.classList.toggle("busy", value === "busy");
    if (els.presencePill) els.presencePill.textContent = value === "online" ? "Çevrimiçi" : value === "busy" ? "Meşgul" : "Çevrimdışı";
  } catch (e) {
    console.warn("[italky_call] presence failed", e);
  }
}

async function lookupNo(rawNo) {
  const rows = await rpc("find_italky_user_by_no", { p_italky_no: rawNo });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function startCall() {
  const no = onlyDigits(els.calleeNoInput?.value || "");
  if (!isValidItalkyNoRaw(no)) {
    showToast("0601 XXX XX XX formatında italkyAI No gir.");
    return;
  }

  els.callBtn?.classList.add("disabled");
  try {
    let peer = null;
    try { peer = await lookupNo(no); } catch {}

    const resultRows = await rpc("start_italky_call", {
      p_callee_italky_no: no,
      p_caller_lang: localStorage.getItem("f2f_bot_lang") || "tr",
      p_callee_lang: localStorage.getItem("f2f_top_lang") || "en"
    });
    const result = Array.isArray(resultRows) ? resultRows[0] : resultRows;

    if (!result?.call_id) {
      showToast(result?.message || "Arama başlatılamadı.");
      return;
    }

    activeCallId = result.call_id;
    activePeer = {
      id: result.callee_user_id,
      name: result.callee_display_name || peer?.display_name || "italkyAI kullanıcısı",
      no: result.callee_italky_no || no,
      presence: result.callee_presence || peer?.presence || "offline"
    };

    if (result.status === "busy") {
      showToast("Karşı taraf şu anda meşgul.");
      renderRecentPlaceholder();
      return;
    }

    if (result.status === "unreachable") {
      showToast("Karşı taraf şu anda çevrimiçi değil.");
      renderRecentPlaceholder();
      return;
    }

    renderRinging(activePeer, "Arama gönderiliyor...");
    showScreen("ringing");
    startDeliveryWatch();
    startRingWatch();
  } catch (e) {
    console.error("[italky_call] start failed", e);
    showToast(e?.message || "Arama başlatılamadı.");
  } finally {
    els.callBtn?.classList.remove("disabled");
  }
}

function renderRinging(peer, statusText) {
  if (els.ringAvatar) els.ringAvatar.textContent = initials(peer?.name);
  if (els.ringName) els.ringName.textContent = peer?.name || "Aranıyor...";
  if (els.ringSub) els.ringSub.textContent = `${formatNo(peer?.no || "")} • italkyAI Call`;
  if (els.ringStatus) els.ringStatus.textContent = statusText || "Karşı tarafa ulaşılıyor...";
}

function startDeliveryWatch() {
  clearTimeout(deliveryTimeout);
  deliveryTimeout = setTimeout(async () => {
    if (!activeCallId || !els.ringingScreen?.classList.contains("show")) return;
    try { await rpc("mark_italky_call_unreachable", { p_call_id: activeCallId }); } catch {}
    if (els.ringStatus) els.ringStatus.textContent = "Karşı tarafa şu an ulaşılamıyor.";
    showToast("Karşı tarafa şu an ulaşılamıyor.");
  }, CALL_DELIVERY_TIMEOUT_MS);
}

function startRingWatch() {
  clearTimeout(ringTimeout);
  ringTimeout = setTimeout(async () => {
    if (!activeCallId || !els.ringingScreen?.classList.contains("show")) return;
    try { await rpc("cancel_italky_call", { p_call_id: activeCallId }); } catch {}
    showToast("Arama zaman aşımına uğradı.");
    resetToHome();
  }, CALL_RING_TIMEOUT_MS);
}

async function cancelCall() {
  try {
    if (activeCallId) await rpc("cancel_italky_call", { p_call_id: activeCallId });
  } catch (e) {
    console.warn("[italky_call] cancel failed", e);
  }
  resetToHome();
}

async function handleIncoming(payload) {
  const row = payload?.new || payload;
  if (!row?.call_id) return;

  activeCallId = row.call_id;
  activePeer = { id: row.from_user_id, name: String(row.title || "Bir kullanıcı").replace(/ seninle görüşmek istiyor\.?$/i, ""), no: "", presence: "online" };

  try { await rpc("ack_italky_call", { p_call_id: activeCallId }); } catch (e) { console.warn("[italky_call] ack failed", e); }

  if (els.incomingAvatar) els.incomingAvatar.textContent = initials(activePeer.name);
  if (els.incomingName) els.incomingName.textContent = activePeer.name || "italkyAI kullanıcısı";
  if (els.incomingText) els.incomingText.textContent = "seninle görüşmek istiyor.";
  showScreen("incoming");
}

async function acceptCall() {
  try {
    if (!activeCallId) return;
    await rpc("respond_italky_call", { p_call_id: activeCallId, p_accept: true });
    enterActiveCall(activePeer);
  } catch (e) {
    console.error("[italky_call] accept failed", e);
    showToast("Görüşme kabul edilemedi.");
  }
}

async function rejectCall() {
  try {
    if (activeCallId) await rpc("respond_italky_call", { p_call_id: activeCallId, p_accept: false });
  } catch (e) {
    console.warn("[italky_call] reject failed", e);
  }
  resetToHome();
}

function enterActiveCall(peer) {
  clearCallTimers();
  callStartedAt = Date.now();
  if (els.activeAvatar) els.activeAvatar.textContent = initials(peer?.name);
  if (els.activeName) els.activeName.textContent = peer?.name || "Bağlandı";
  if (els.langLine) els.langLine.textContent = `${localStorage.getItem("f2f_bot_lang") || "tr"} ⇄ ${localStorage.getItem("f2f_top_lang") || "en"}`.toUpperCase();
  showScreen("active");
  timerInterval = setInterval(renderTimer, 1000);
  renderTimer();
}

function renderTimer() {
  if (!els.callTimer || !callStartedAt) return;
  const seconds = Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  els.callTimer.textContent = `${mm}:${ss}`;
}

async function endCall() {
  try {
    if (activeCallId) await rpc("end_italky_call", { p_call_id: activeCallId, p_reason: "ended_by_user" });
  } catch (e) {
    console.warn("[italky_call] end failed", e);
  }
  clearCallTimers();
  showEndedSheet();
}

function showEndedSheet() {
  if (els.endedText) els.endedText.textContent = `${activePeer?.name || "Bu kişiyi"} italkyAI Rehberine eklemek ister misin?`;
  els.endedSheet?.classList.add("show");
}

function hideEndedSheet() {
  els.endedSheet?.classList.remove("show");
}

async function addContact() {
  try {
    if (!activeCallId) return;
    const result = await rpc("add_contact_from_call", { p_call_id: activeCallId });
    showToast(result === "added" ? "Rehbere eklendi." : "Rehbere ekleme tamamlandı.");
  } catch (e) {
    console.warn("[italky_call] add contact failed", e);
    showToast("Rehbere eklenemedi.");
  }
  hideEndedSheet();
  resetToHome();
}

async function blockFromCall() {
  try {
    if (!activeCallId) return;
    await rpc("block_user_from_call", { p_call_id: activeCallId });
    showToast("Kullanıcı engellendi.");
  } catch (e) {
    console.warn("[italky_call] block failed", e);
    showToast("Engelleme tamamlanamadı.");
  }
  hideEndedSheet();
  resetToHome();
}

function resetToHome() {
  clearCallTimers();
  activeCallId = null;
  activePeer = null;
  callStartedAt = null;
  showScreen("home");
}

function toggleCaptions() {
  captionsVisible = !captionsVisible;
  els.captionCard?.classList.toggle("hidden-caption", !captionsVisible);
  showToast(captionsVisible ? "Çeviri yazısı açık." : "Çeviri yazısı kapalı. Sesli çeviri devam eder.");
}

function renderRecentPlaceholder() {
  // Gerçek listeyi sonraki adımda DB'den çekeceğiz. Bu sayfa V1 starter ekranıdır.
}

function bindEvents() {
  els.callBtn?.addEventListener("click", startCall);
  els.cancelCallBtn?.addEventListener("click", cancelCall);
  els.acceptBtn?.addEventListener("click", acceptCall);
  els.rejectBtn?.addEventListener("click", rejectCall);
  els.endCallBtn?.addEventListener("click", endCall);
  els.captionToggle?.addEventListener("click", toggleCaptions);
  els.laterBtn?.addEventListener("click", () => { hideEndedSheet(); resetToHome(); });
  els.addContactBtn?.addEventListener("click", addContact);
  els.blockBtn?.addEventListener("click", blockFromCall);
  els.copyMyNo?.addEventListener("click", async () => {
    const no = els.myNo?.textContent || "";
    try { await navigator.clipboard?.writeText(no); } catch {}
    showToast("italkyAI No kopyalandı.");
  });
  els.calleeNoInput?.addEventListener("input", (event) => {
    const value = onlyDigits(event.target.value).slice(0, 11);
    event.target.value = formatNo(value);
  });
  els.calleeNoInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") startCall();
  });
  window.addEventListener("beforeunload", () => {
    try { if (activeCallId) rpc("cancel_italky_call", { p_call_id: activeCallId }); } catch {}
    try { rpc("set_my_italky_call_presence", { p_presence: "offline" }); } catch {}
  });
}

function setupRealtime() {
  if (!currentUser?.id) return;
  try {
    realtimeChannel = supabase
      .channel(`italky_call_user_${currentUser.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "italky_call_inbox",
        filter: `to_user_id=eq.${currentUser.id}`
      }, handleIncoming)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "italky_call_sessions"
      }, (payload) => {
        const row = payload?.new;
        if (!row || row.id !== activeCallId) return;
        if (row.status === "ringing" && els.ringingScreen?.classList.contains("show")) {
          clearTimeout(deliveryTimeout);
          if (els.ringStatus) els.ringStatus.textContent = "Karşı taraf çalıyor...";
        }
        if (row.status === "accepted" && els.ringingScreen?.classList.contains("show")) {
          enterActiveCall(activePeer);
        }
        if (["rejected", "cancelled", "unreachable", "busy", "ended"].includes(row.status) && !els.homeScreen?.classList.contains("show")) {
          const map = {
            rejected: "Arama reddedildi.",
            cancelled: "Arama iptal edildi.",
            unreachable: "Karşı tarafa ulaşılamadı.",
            busy: "Karşı taraf meşgul.",
            ended: "Görüşme sona erdi."
          };
          showToast(map[row.status] || "Arama sona erdi.");
          if (row.status === "ended") showEndedSheet();
          else resetToHome();
        }
      })
      .subscribe((status) => console.warn("[italky_call] realtime", status));
  } catch (e) {
    console.warn("[italky_call] realtime failed", e);
  }
}

async function boot() {
  window.__ITALKY_CALL_BOOT_STARTED = true;
  try {
    if (!(await requireAuth())) return;
    bindEvents();
    await ensureMyNo();
    await setPresence("online");
    setupRealtime();
  } catch (e) {
    console.error("[italky_call] boot failed", e);
    setMyNoDisplay("Numara alınamadı");
    showToast("Call ekranı başlatılamadı.");
  } finally {
    window.__ITALKY_CALL_BOOT_DONE = true;
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
