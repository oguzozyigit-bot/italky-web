// Tek gerçek cüzdan: icany business_members.personal_token_balance
const ENDPOINT = "/api/personal-wallet";
const TOKEN_IDS = [
  "drawerTokens","officialMenuTokens","menuTokens","currentTokens","headerTokens",
  "tokenVal","currentBalance","summaryBalance","italkyMenuTokenCount","topTokens",
  "balanceTokens","walletBalance","profileTokens"
];

function fmt(value){
  const n=Number(value)||0;
  try{return Math.trunc(n).toLocaleString("tr-TR");}
  catch{return String(Math.trunc(n));}
}

function setBalance(value){
  const n=Math.max(0,Math.floor(Number(value)||0));
  const text=fmt(n);
  window.__ITALKY_SHARED_PERSONAL_BALANCE__=n;
  TOKEN_IDS.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.dataset.walletSource="icany-personal";
    if(el.textContent!==text)el.textContent=text;
  });
  document.querySelectorAll("[data-personal-token-balance],[data-token-balance],[data-wallet-balance]").forEach(el=>{
    el.dataset.walletSource="icany-personal";
    if(el.textContent!==text)el.textContent=text;
  });
}

function normalizeStoredSession(value){
  try{
    const parsed=typeof value==="string"?JSON.parse(value):value;
    const session=parsed?.currentSession||parsed?.session||parsed;
    const accessToken=String(session?.access_token||"").trim();
    const user=session?.user||null;
    if(accessToken&&user?.id&&user?.email)return{...session,access_token:accessToken,user};
  }catch{}
  return null;
}

function readStoredSupabaseSession(){
  try{
    const preferred=["italky_supabase_session_backup"];
    for(const key of preferred){
      const session=normalizeStoredSession(localStorage.getItem(key));
      if(session)return session;
    }
    for(let i=0;i<localStorage.length;i++){
      const key=String(localStorage.key(i)||"");
      if(!/^sb-.*-auth-token$/i.test(key))continue;
      const session=normalizeStoredSession(localStorage.getItem(key));
      if(session)return session;
    }
  }catch{}
  return null;
}

async function getSession(){
  for(let i=0;i<100;i++){
    const sb=window.supabase;
    if(sb?.auth?.getSession){
      try{const {data}=await sb.auth.getSession();if(data?.session)return data.session;}catch{}
    }
    const stored=readStoredSupabaseSession();
    if(stored)return stored;
    await new Promise(r=>setTimeout(r,100));
  }
  return null;
}

async function loadWallet(includeHistory=false){
  const session=await getSession();
  if(!session?.access_token||!session?.user)return null;
  const r=await fetch(`${ENDPOINT}?t=${Date.now()}`,{
    method:"POST",
    headers:{
      "Authorization":`Bearer ${session.access_token}`,
      "Content-Type":"application/json",
      "Cache-Control":"no-cache, no-store, must-revalidate",
      "Pragma":"no-cache"
    },
    cache:"no-store",
    credentials:"same-origin",
    body:JSON.stringify({
      userId:session.user.id,
      email:session.user.email,
      includeHistory,
      historyLimit:300,
      cacheBust:Date.now()
    })
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d?.ok)throw new Error(d?.error||`wallet_${r.status}`);
  setBalance(d.personalTokenBalance??d.tokenBalance??0);
  return d;
}

function renderPersonalHistory(items,balance){
  const list=document.getElementById("listWrap");
  const result=document.getElementById("resultInfo");
  const loaded=document.getElementById("totalLoaded");
  const spent=document.getElementById("totalSpent");
  if(!list)return;
  const rows=Array.isArray(items)?items:[];
  let totalIn=0,totalOut=0;
  rows.forEach(x=>{const a=Number(x.amount||0);if(a>0)totalIn+=a;if(a<0)totalOut+=Math.abs(a);});
  if(loaded)loaded.textContent=fmt(totalIn);
  if(spent)spent.textContent=fmt(totalOut);
  if(result)result.textContent=`${rows.length} hareket`;
  if(!rows.length){list.innerHTML='<div class="empty">Henüz kişisel jeton hareketi yok.</div>';return;}
  const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const date=v=>{try{return new Date(v).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}catch{return String(v||"");}};
  const current=Number(balance)||0;
  list.innerHTML=rows.map((row,index)=>{
    const amount=Number(row.amount||0);
    const group=amount>0?"plus":amount<0?"minus":"neutral";
    const title=String(row.moduleName||"Kişisel jeton işlemi");
    return `<div class="row"><div class="icon ${group}">${amount<0?"−":amount>0?"+":"•"}</div><div class="mid"><div class="mid-top"><div class="type-pill">KİŞİSEL CÜZDAN</div></div><div class="title">${esc(title)}</div><div class="date">${esc(date(row.createdAt))}</div></div><div class="right"><div class="delta ${group}">${amount>0?"+":""}${esc(fmt(amount))}</div><div class="after">${index===0?"Bakiye: "+esc(fmt(current)):""}</div></div></div>`;
  }).join("");
}

async function refresh(){
  try{
    const isHistory=location.pathname.toLowerCase().endsWith("/wallet_history.html");
    const d=await loadWallet(isHistory);
    if(isHistory&&d)renderPersonalHistory(d.items,d.personalTokenBalance??d.tokenBalance??0);
    window.dispatchEvent(new CustomEvent("italkySharedWalletForced",{detail:d||{}}));
  }catch(e){console.warn("[wallet_force_fix]",e);}
}

function protect(){
  let locked=false;
  const observer=new MutationObserver(()=>{
    if(locked)return;
    const n=window.__ITALKY_SHARED_PERSONAL_BALANCE__;
    if(!Number.isFinite(n))return;
    locked=true;
    try{setBalance(n);}finally{queueMicrotask(()=>{locked=false;});}
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
}

window.refreshItalkySharedWallet=refresh;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{protect();refresh();},{once:true});
else{protect();refresh();}
[0,250,700,1400,2800,5000,9000].forEach(ms=>setTimeout(refresh,ms));
window.addEventListener("focus",refresh);
window.addEventListener("pageshow",refresh);
window.addEventListener("italkyAccessReady",refresh);
window.addEventListener("italky-billing-success",()=>setTimeout(refresh,350));
window.addEventListener("italky-token-purchase-success",()=>setTimeout(refresh,350));