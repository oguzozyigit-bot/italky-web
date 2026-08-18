import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SB_URL='https://wtzsnywujksshcwvemgz.supabase.co';
const SB_KEY='sb_publishable_85JlITD5FKjDvdf4JHU0Dg_eByJrKVo';
const sb=createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'italky-call-phone-auth'}});
const $=id=>document.getElementById(id);
const digits=s=>String(s||'').replace(/\D/g,'');
const normalize=s=>{const d=digits(s);return d?`+${d}`:''};
let pending='';
function phone(){let local=digits($('phoneInput')?.value);const sel=$('countrySelect'),opt=sel?.options?.[sel.selectedIndex];if(opt?.dataset?.trunk==='0'&&local.startsWith('0'))local=local.slice(1);return normalize((sel?.value||'')+local)}
function status(t){if($('status'))$('status').textContent=t}
function showOtp(){
  $('otpWrap')?.classList.remove('hidden');$('verifySms')?.classList.remove('hidden');$('editPhone')?.classList.remove('hidden');$('sendSms')?.classList.add('hidden');
  if($('countrySelect'))$('countrySelect').disabled=true;if($('phoneInput'))$('phoneInput').disabled=true;
}
async function ensureSession(){const {data:{session}}=await sb.auth.getSession();if(session)return session;const {data,error}=await sb.auth.signInAnonymously();if(error)throw error;return data.session}
function install(){
 const send=$('sendSms'),verify=$('verifySms'),edit=$('editPhone');if(!send||send.dataset.testOtp==='1')return;
 send.dataset.testOtp='1';
 send.onclick=async e=>{e.preventDefault();e.stopImmediatePropagation();const p=phone();if(!/^\+[1-9]\d{7,14}$/.test(p)){status('Geçerli telefon numarası gir');return}pending=p;status('SMS gönderiliyor…');send.disabled=true;await new Promise(r=>setTimeout(r,650));send.disabled=false;showOtp();status('SMS gönderildi · Test kodu: 123456');$('otpInput')?.focus()};
 verify.onclick=async e=>{e.preventDefault();e.stopImmediatePropagation();const code=digits($('otpInput')?.value).slice(0,6);if(code!=='123456'){status('Kod hatalı · Test kodu 123456');return}if(!pending)pending=phone();verify.disabled=true;status('Numara doğrulanıyor…');try{await ensureSession();const {data,error}=await sb.rpc('claim_test_italky_call_number',{p_phone:pending});if(error)throw error;localStorage.setItem('italky_test_verified_phone',data||pending);status('Numara doğrulandı ✓');setTimeout(()=>location.reload(),450)}catch(err){status('Numara kaydedilemedi: '+(err?.message||err))}finally{verify.disabled=false}};
 edit.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();$('otpWrap')?.classList.add('hidden');verify.classList.add('hidden');edit.classList.add('hidden');send.classList.remove('hidden');if($('countrySelect'))$('countrySelect').disabled=false;if($('phoneInput'))$('phoneInput').disabled=false;if($('otpInput'))$('otpInput').value='';pending='';status('Numaranı düzelt')};
}
setTimeout(install,0);setInterval(install,1200);
