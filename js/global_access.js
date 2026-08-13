// FILE: /js/global_access.js
// italkyAI free-access compatibility layer.
// Authentication identifies the user; membership no longer blocks product access.

import { waitForSupabaseSession } from '/js/supabase_client.js';

const API_ACCESS='https://italky-api.onrender.com/api/session/access-state';
const CACHE_KEY='italky_access_state';
const PUBLIC_PAGES=new Set([
  '/',
  '/index.html',
  '/pages/login.html',
  '/pages/auth_callback.html',
  '/pages/about.html',
  '/pages/faq.html',
  '/pages/privacy.html',
  '/pages/contact.html',
  '/pages/text_translate_public.html',
  '/pages/game_menu_public.html',
  '/pages/level_test_public.html',
  '/pages/level_test_hub.html',
  '/pages/level_test.html'
]);

function normalizePath(value=''){
  try{return String(value||'').split('?')[0].split('#')[0].replace(/\/+$/,'')||'/';}
  catch{return '/';}
}

function truthy(value){
  return value===true||value===1||value==='1'||String(value||'').toLowerCase()==='true'||String(value||'').toLowerCase()==='active';
}

function number(value,fallback=0){
  const n=Number(value);
  return Number.isFinite(n)?n:fallback;
}

async function getSession(){
  try{
    return await waitForSupabaseSession({timeoutMs:4500,intervalMs:180,restoreFromBackup:true});
  }catch{return null;}
}

async function fetchBackendState(session){
  try{
    if(!session?.access_token)return {};
    const response=await fetch(API_ACCESS,{method:'GET',headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    if(!response.ok)return {};
    return await response.json().catch(()=>({}));
  }catch{return {};}
}

function buildAccess(raw={},session=null){
  const user=session?.user||null;
  const metadata=user?.user_metadata||{};
  const role=String(raw?.role||metadata?.role||'').trim().toLowerCase();
  const isAdmin=role==='admin'||role==='superadmin';
  const isSuperadmin=role==='superadmin';
  const member=truthy(raw?.has_active_membership)||truthy(raw?.is_member)||truthy(raw?.package_active)||truthy(raw?.subscription_active);
  const noAds=isAdmin||isSuperadmin||truthy(raw?.ads_disabled)||truthy(raw?.no_ads)||truthy(raw?.is_no_ads_member);
  const loggedIn=Boolean(user?.id);
  const avatar=raw?.avatar_url||raw?.picture||metadata?.avatar_url||metadata?.picture||'';
  const name=raw?.display_name||raw?.full_name||metadata?.full_name||metadata?.name||'';
  return {
    ok:loggedIn,
    is_logged_in:loggedIn,
    user_id:user?.id||'',
    email:user?.email||raw?.email||'',
    display_name:name,
    full_name:raw?.full_name||name,
    avatar_url:avatar,
    picture:avatar,

    // Free model: every authenticated account can use italkyAI.
    access_open:loggedIn,
    app_access_mode:loggedIn?'free_account':'guest',
    access_mode:loggedIn?'free_account':'guest',

    role,
    is_admin:isAdmin,
    is_superadmin:isSuperadmin,
    tokens:number(raw?.tokens??raw?.wallet?.tokens,0),

    // Membership remains informational/benefit state only; it is not an access gate.
    has_active_membership:member,
    is_member:member,
    package_active:truthy(raw?.package_active),
    subscription_active:truthy(raw?.subscription_active),
    membership_status:member?'active':String(raw?.membership_status||'free'),
    membership_source:raw?.membership_source||'',
    membership_product_id:raw?.membership_product_id||raw?.subscription_product_id||raw?.package_code||raw?.selected_package_code||'',
    membership_started_at:raw?.membership_started_at||raw?.subscription_started_at||raw?.package_started_at||null,
    membership_ends_at:raw?.membership_ends_at||raw?.subscription_ends_at||raw?.package_ends_at||null,

    no_ads:noAds,
    ads_disabled:noAds,
    is_no_ads_member:noAds,
    remaining_seconds:number(raw?.remaining_seconds,0),
    remaining_label:'',
    server_time:raw?.server_time||null,
    raw
  };
}

function cacheAccess(access){
  try{
    window.__ITALKY_ACCESS__=access;
    localStorage.setItem(CACHE_KEY,JSON.stringify(access));
    window.dispatchEvent(new CustomEvent('italkyAccessReady',{detail:access}));
  }catch{}
}

function goLogin(){
  try{
    const here=location.pathname+location.search+location.hash;
    location.replace(`/pages/login.html?next=${encodeURIComponent(here)}`);
  }catch{
    location.href='/pages/login.html';
  }
}

export async function initGlobalAccess(options={}){
  const currentPath=normalizePath(location.pathname);
  const publicPage=PUBLIC_PAGES.has(currentPath);
  const allowPublicPageBypass=options?.allowPublicPageBypass!==false;
  const session=await getSession();

  if(session?.user?.id){
    const raw=await fetchBackendState(session);
    const access=buildAccess(raw,session);
    cacheAccess(access);
    return {ok:true,session,access,free_access:true};
  }

  const guest=buildAccess({},null);
  cacheAccess(guest);
  if(allowPublicPageBypass&&publicPage){
    return {ok:true,bypass:true,public_page:true,session:null,access:guest};
  }

  goLogin();
  return {ok:false,redirected:'login',session:null,access:guest};
}

export function getCachedAccessState(){
  try{
    return window.__ITALKY_ACCESS__||JSON.parse(localStorage.getItem(CACHE_KEY)||'null')||buildAccess({},null);
  }catch{return buildAccess({},null);}
}

export function isCurrentUserAdsDisabled(){
  const access=getCachedAccessState();
  return Boolean(truthy(access?.ads_disabled)||truthy(access?.no_ads)||truthy(access?.is_no_ads_member)||truthy(access?.is_admin)||truthy(access?.is_superadmin));
}

// Kept for old callers. Membership is no longer a navigation lock in the free model.
export function lockMembershipPageBack(){
  return false;
}
