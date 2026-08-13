import {
  supabase,
  persistSupabaseSessionBackup,
  removeSupabaseSessionBackup,
  waitForSupabaseSession
} from '/js/supabase_client.js';
import { STORAGE_KEY } from '/js/config.js';

const HOME_PAGE='/hosgeldiniz';
let oauthRedirectStarted=false;

function safeRedirectPath(value){
  const raw=String(value||'').trim();
  if(!raw||raw.startsWith('http://')||raw.startsWith('https://')||raw.startsWith('//')||!raw.startsWith('/'))return '';
  return raw;
}

function nativeGoogleBridge(){
  try{
    const candidates=[window.Native,window.AndroidBridge,window.CorporateNative];
    for(const bridge of candidates){
      if(bridge&&typeof bridge.startGoogleLogin==='function')return bridge;
    }
  }catch{}
  return null;
}

function readIdToken(payload){
  try{
    if(typeof payload==='string'){
      const raw=payload.trim();
      if(!raw)return '';
      try{
        const data=JSON.parse(raw);
        return String(data?.id_token||data?.idToken||data?.token||data?.credential||'').trim();
      }catch{return raw;}
    }
    return String(payload?.id_token||payload?.idToken||payload?.token||payload?.credential||'').trim();
  }catch{return '';}
}

function bindNativeUser(userId){
  if(!userId)return;
  try{
    const candidates=[window.Native,window.AndroidBridge,window.CorporateNative];
    for(const bridge of candidates){
      if(bridge&&typeof bridge.setUserId==='function'){
        bridge.setUserId(userId);
        break;
      }
    }
  }catch{}
}

function buildCache(user,profile){
  return {
    id:profile?.id||user?.id||null,
    email:profile?.email||user?.email||'',
    name:profile?.full_name||user?.user_metadata?.full_name||user?.user_metadata?.name||'Kullanıcı',
    picture:profile?.avatar_url||user?.user_metadata?.picture||user?.user_metadata?.avatar_url||'',
    tokens:Number(profile?.tokens??0),
    member_no:profile?.member_no||null,
    italky_no:profile?.italky_no||null,
    offline_langs:Array.isArray(profile?.offline_langs)?profile.offline_langs:[]
  };
}

async function readProfile(userId){
  const {data,error}=await supabase.from('profiles').select('*').eq('id',userId).maybeSingle();
  if(error)throw error;
  return data||null;
}

async function ensureProfileFallback(user){
  let profile=null;
  try{
    const {data,error}=await supabase.rpc('ensure_profile_and_welcome');
    if(!error&&data)profile=data;
  }catch{}
  if(profile)return profile;

  try{
    const {data,error}=await supabase.rpc('ensure_profile');
    if(!error&&data)profile=data;
  }catch{}
  if(profile)return profile;

  profile=await readProfile(user.id);
  if(profile)return profile;

  const fallback={
    id:user.id,
    email:user.email||'',
    full_name:user?.user_metadata?.full_name||user?.user_metadata?.name||'',
    avatar_url:user?.user_metadata?.avatar_url||user?.user_metadata?.picture||'',
    tokens:0
  };
  const {error}=await supabase.from('profiles').upsert(fallback,{onConflict:'id'});
  if(error)throw error;
  return await readProfile(user.id);
}

export async function ensureAuthAndCacheUser(){
  const session=await waitForSupabaseSession({timeoutMs:5000,intervalMs:250,restoreFromBackup:true});
  if(!session?.user)return null;
  persistSupabaseSessionBackup(session);
  const profile=await ensureProfileFallback(session.user);
  const cached=buildCache(session.user,profile||{});
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(cached));}catch{}
  return cached;
}

async function completeNativeLogin(payload,next=HOME_PAGE){
  const token=readIdToken(payload);
  if(!token)throw new Error('Google giriş bilgisi alınamadı.');
  const {data,error}=await supabase.auth.signInWithIdToken({provider:'google',token});
  if(error)throw error;
  if(!data?.session?.user?.id)throw new Error('Oturum oluşturulamadı.');
  persistSupabaseSessionBackup(data.session);
  try{await ensureAuthAndCacheUser();}catch(error){console.warn('[auth] profile cache',error);}
  bindNativeUser(data.session.user.id);
  location.replace(safeRedirectPath(next)||HOME_PAGE);
  return data;
}

export async function loginWithGoogle(next=''){
  const target=safeRedirectPath(next)||HOME_PAGE;
  const bridge=nativeGoogleBridge();
  if(bridge){
    window.onNativeLoginSuccess=(payload)=>{void completeNativeLogin(payload,target);};
    window.onNativeLoginError=(payload)=>{
      window.dispatchEvent(new CustomEvent('italky-native-login-error',{detail:{message:typeof payload==='string'?payload:payload?.message||'native_google_error'}}));
    };
    bridge.startGoogleLogin();
    return {native:true,next:target};
  }

  const callbackUrl=new URL('/pages/auth_callback.html',location.origin);
  callbackUrl.searchParams.set('next',target);
  const {data,error}=await supabase.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:callbackUrl.toString(),skipBrowserRedirect:true,queryParams:{access_type:'offline',prompt:'select_account'}}
  });
  if(error)throw error;
  if(!data?.url)throw new Error('Google OAuth adresi alınamadı.');
  if(!oauthRedirectStarted){
    oauthRedirectStarted=true;
    location.assign(data.url);
  }
  return data;
}

export async function loginWithApple(next=''){
  const target=safeRedirectPath(next)||HOME_PAGE;
  const callbackUrl=new URL('/pages/auth_callback.html',location.origin);
  callbackUrl.searchParams.set('next',target);
  const {data,error}=await supabase.auth.signInWithOAuth({
    provider:'apple',
    options:{redirectTo:callbackUrl.toString(),skipBrowserRedirect:true}
  });
  if(error)throw error;
  if(!data?.url)throw new Error('Apple OAuth adresi alınamadı.');
  if(!oauthRedirectStarted){
    oauthRedirectStarted=true;
    location.assign(data.url);
  }
  return data;
}

export function readCachedUser(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    return raw?JSON.parse(raw):null;
  }catch{return null;}
}

export function clearCachedUser(){
  try{localStorage.removeItem(STORAGE_KEY);}catch{}
}

export async function safeLogout(){
  try{await supabase.auth.signOut({scope:'global'});}catch{}
  removeSupabaseSessionBackup();
  clearCachedUser();
  try{sessionStorage.clear();}catch{}
  try{
    const bridges=[window.Native,window.AndroidBridge,window.CorporateNative];
    for(const bridge of bridges){
      if(bridge&&typeof bridge.logoutNativeGoogle==='function'){
        bridge.logoutNativeGoogle();
        break;
      }
    }
  }catch{}
  location.replace('/pages/login.html?logged_out=1&next='+encodeURIComponent(HOME_PAGE));
}
