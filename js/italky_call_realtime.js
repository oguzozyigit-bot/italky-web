import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BASE_DOMAIN } from '/js/config.js';

const SB_URL='https://wtzsnywujksshcwvemgz.supabase.co';
const SB_KEY='sb_publishable_85JlITD5FKjDvdf4JHU0Dg_eByJrKVo';
const sb=createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'italky-call-phone-auth'}});
const $=id=>document.getElementById(id);
const digits=s=>String(s||'').replace(/\D/g,'');
const status=t=>{$('status').textContent=t};
const uuid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;

function normalizeE164(raw){
  const s=String(raw||'').trim();
  if(!s)return '';
  const d=digits(s);
  return d?`+${d}`:'';
}
function phoneFrom(countryEl,inputEl){
  let local=digits(inputEl.value);
  const opt=countryEl.options[countryEl.selectedIndex];
  if(opt?.dataset?.trunk==='0'&&local.startsWith('0')) local=local.slice(1);
  return normalizeE164(countryEl.value+local);
}
function fmtPhone(v){
  const e=normalizeE164(v),d=digits(e);
  if(d.startsWith('90')&&d.length===12)return `+90 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8,10)} ${d.slice(10,12)}`;
  if(d.startsWith('389'))return `+389 ${d.slice(3).replace(/(\d{3})(?=\d)/g,'$1 ').trim()}`;
  return e.replace(/^(\+\d{1,3})(\d+)/,(_,a,b)=>a+' '+b.replace(/(\d{3})(?=\d)/g,'$1 ').trim());
}
const channelKey=n=>digits(n);

let myNo='';
let pendingPhone='';
let dial='',inbox=null,session=null,pc=null,localStream=null,incomingData=null;
let micMuted=false,camOff=true,subsOn=true,recognition=null,recRunning=false;
let srcLang=localStorage.getItem('italky_call_src')||'tr';
let dstLang=localStorage.getItem('italky_call_dst')||'en';
const LANG={tr:{name:'Türkçe',sr:'tr-TR'},en:{name:'English',sr:'en-US'},de:{name:'Deutsch',sr:'de-DE'},fr:{name:'Français',sr:'fr-FR'},es:{name:'Español',sr:'es-ES'}};

function showVerify(){ $('verify').classList.remove('hidden');$('home').classList.add('hidden');$('callUi').classList.add('hidden'); }
function showHome(){ $('verify').classList.add('hidden');$('callUi').classList.add('hidden');$('home').classList.remove('hidden'); }
function setLockedNumber(n){myNo=normalizeE164(n);$('myNumber').textContent=fmtPhone(myNo);showHome();startInbox().catch(()=>status('Çağrı servisine bağlanamadı'));}

async function claimVerifiedNumber(){
  const {data,error}=await sb.rpc('claim_verified_italky_call_number');
  if(error)throw error;
  if(!data)throw new Error('Doğrulanmış numara alınamadı');
  setLockedNumber(data);
}

async function bootIdentity(){
  const {data:{session:s}}=await sb.auth.getSession();
  if(!s){showVerify();status('Numaranı SMS ile doğrula');return;}
  try{await claimVerifiedNumber();status('Hazır')}catch(e){showVerify();status(e?.message?.includes('number_already_locked')?'Bu hesapta başka numara sabit':'Telefon doğrulaması gerekli')}
}

$('sendSms').onclick=async()=>{
  const phone=phoneFrom($('countrySelect'),$('phoneInput'));
  if(!/^\+[1-9]\d{7,14}$/.test(phone)){status('Geçerli telefon numarası gir');return;}
  pendingPhone=phone;status('SMS gönderiliyor…');$('sendSms').disabled=true;
  const {error}=await sb.auth.signInWithOtp({phone,options:{shouldCreateUser:true}});
  $('sendSms').disabled=false;
  if(error){status('SMS gönderilemedi: '+error.message);return;}
  $('otpWrap').classList.remove('hidden');$('verifySms').classList.remove('hidden');$('editPhone').classList.remove('hidden');$('sendSms').classList.add('hidden');$('countrySelect').disabled=true;$('phoneInput').disabled=true;
  status('Kod gönderildi: '+fmtPhone(phone));$('otpInput').focus();
};
$('verifySms').onclick=async()=>{
  const token=digits($('otpInput').value).slice(0,6);
  if(token.length!==6){status('6 haneli SMS kodunu gir');return;}
  status('Numara doğrulanıyor…');$('verifySms').disabled=true;
  const {data,error}=await sb.auth.verifyOtp({phone:pendingPhone,token,type:'sms'});
  $('verifySms').disabled=false;
  if(error||!data?.session){status('Kod doğrulanamadı: '+(error?.message||'Hatalı kod'));return;}
  try{await claimVerifiedNumber();status('Numara doğrulandı')}catch(e){status('Numara sabitlenemedi: '+e.message)}
};
$('editPhone').onclick=()=>{$('otpWrap').classList.add('hidden');$('verifySms').classList.add('hidden');$('editPhone').classList.add('hidden');$('sendSms').classList.remove('hidden');$('countrySelect').disabled=false;$('phoneInput').disabled=false;$('otpInput').value='';pendingPhone='';status('Numaranı düzelt')};
$('otpInput').oninput=e=>e.target.value=digits(e.target.value).slice(0,6);

function paintLang(){$('srcLang').textContent='Ben: '+(LANG[srcLang]?.name||srcLang);$('dstLang').textContent='Karşı: '+(LANG[dstLang]?.name||dstLang)}
function cycle(which){const ks=Object.keys(LANG),cur=which==='src'?srcLang:dstLang;let i=(ks.indexOf(cur)+1)%ks.length,n=ks[i];if(which==='src'){srcLang=n;if(srcLang===dstLang)dstLang=ks[(i+1)%ks.length]}else{dstLang=n;if(dstLang===srcLang)srcLang=ks[(i+1)%ks.length]}localStorage.setItem('italky_call_src',srcLang);localStorage.setItem('italky_call_dst',dstLang);paintLang();restartRecognition()}
$('srcLang').onclick=()=>cycle('src');$('dstLang').onclick=()=>cycle('dst');paintLang();

function dialE164(){let local=dial;const sel=$('dialCountrySelect'),opt=sel.options[sel.selectedIndex];if(opt?.dataset?.trunk==='0'&&local.startsWith('0'))local=local.slice(1);return normalizeE164(sel.value+local)}
function paintDial(){$('number').textContent=dial?fmtPhone(dialE164()):'Numara gir'}
$('dialCountrySelect').onchange=paintDial;
$('keypad').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;const k=b.dataset.k;if(/\d/.test(k)&&dial.length<13){dial+=k;paintDial()}};
$('erase').onclick=()=>{dial=dial.slice(0,-1);paintDial()};

function showCall(mode,peer){$('home').classList.add('hidden');$('callUi').classList.remove('hidden');$('peerNumber').textContent=fmtPhone(peer);$('stage').classList.toggle('audioOnly',mode==='audio');camOff=mode==='audio'}
function showIncoming(p){incomingData=p;$('incomingNo').textContent=fmtPhone(p.callerNo);$('incomingMode').textContent=p.mode==='video'?'Görüntülü arama':'Sesli arama';$('incoming').classList.remove('hidden');try{navigator.vibrate?.([300,150,300,150,600])}catch{}}
function hideIncoming(){$('incoming').classList.add('hidden')}

async function startInbox(){
  if(!myNo)return;if(inbox)try{await sb.removeChannel(inbox)}catch{}
  inbox=sb.channel('call:'+channelKey(myNo),{config:{broadcast:{self:false}}});
  inbox.on('broadcast',{event:'ring'},({payload})=>{if(normalizeE164(payload?.calleeNo)===myNo&&!session)showIncoming(payload)});
  inbox.on('broadcast',{event:'declined'},({payload})=>{if(session&&payload?.callId===session.callId){status('Arama reddedildi');cleanup(false)}});
  inbox.on('broadcast',{event:'accepted'},async({payload})=>{if(session?.role==='caller'&&payload?.callId===session.callId){status('Bağlanıyor…');await joinSessionChannel();await makeOffer()}});
  await inbox.subscribe();status('Hazır');
}

async function registeredNumber(peer){
  const {data,error}=await sb.from('italky_call_numbers').select('call_number').eq('call_number',peer).maybeSingle();
  if(error)return false;return !!data?.call_number;
}
async function ring(mode){
  if(!myNo){status('Önce kendi numaranı doğrula');return;}
  const peer=dialE164();if(!/^\+[1-9]\d{7,14}$/.test(peer)){status('Geçerli numara gir');return}if(peer===myNo){status('Kendi numaranı arayamazsın');return}
  status('Numara kontrol ediliyor…');if(!(await registeredNumber(peer))){status('Bu numara italkyAI Call kullanmıyor');return}
  session={callId:uuid(),role:'caller',peerNo:peer,mode,chan:null};showCall(mode,peer);status('Çalıyor…');
  await sb.channel('call:'+channelKey(peer)).send({type:'broadcast',event:'ring',payload:{callId:session.callId,callerNo:myNo,calleeNo:peer,mode,srcLang,dstLang}});
}
$('audioCall').onclick=()=>ring('audio');$('videoCall').onclick=()=>ring('video');

$('decline').onclick=async()=>{if(!incomingData)return;await sb.channel('call:'+channelKey(incomingData.callerNo)).send({type:'broadcast',event:'declined',payload:{callId:incomingData.callId}});hideIncoming();incomingData=null;status('Arama reddedildi')};
$('accept').onclick=async()=>{if(!incomingData)return;const p=incomingData;hideIncoming();session={callId:p.callId,role:'callee',peerNo:normalizeE164(p.callerNo),mode:p.mode,chan:null};srcLang=p.dstLang||srcLang;dstLang=p.srcLang||dstLang;paintLang();showCall(p.mode,p.callerNo);status('Bağlanıyor…');try{await prepareMedia();await joinSessionChannel();await sb.channel('call:'+channelKey(p.callerNo)).send({type:'broadcast',event:'accepted',payload:{callId:p.callId,calleeNo:myNo}})}catch(e){status('Mikrofon/kamera açılamadı');cleanup(false)}incomingData=null};

async function prepareMedia(){if(localStream)return;const wantsVideo=session?.mode==='video';localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:wantsVideo?{facingMode:'user',width:{ideal:640},height:{ideal:480}}:false});$('localVideo').srcObject=localStream;camOff=!wantsVideo}
async function createPeer(){await prepareMedia();pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));pc.ontrack=e=>{$('remoteVideo').srcObject=e.streams[0]};pc.onicecandidate=e=>{if(e.candidate&&session?.chan)session.chan.send({type:'broadcast',event:'ice',payload:{callId:session.callId,from:myNo,candidate:e.candidate.toJSON()}})};pc.onconnectionstatechange=()=>{if(!pc)return;const s=pc.connectionState;status(s==='connected'?'Görüşme bağlı':s==='failed'?'Bağlantı kurulamadı':s==='disconnected'?'Bağlantı koptu':'Bağlanıyor…');if(s==='connected')startRecognition()}}
async function joinSessionChannel(){if(session.chan)return;const ch=sb.channel('session:'+session.callId,{config:{broadcast:{self:false}}});session.chan=ch;ch.on('broadcast',{event:'offer'},async({payload})=>{if(session.role!=='callee'||payload?.callId!==session.callId)return;await createPeer();await pc.setRemoteDescription(payload.offer);const a=await pc.createAnswer();await pc.setLocalDescription(a);await ch.send({type:'broadcast',event:'answer',payload:{callId:session.callId,answer:pc.localDescription.toJSON()}})});ch.on('broadcast',{event:'answer'},async({payload})=>{if(session.role==='caller'&&payload?.callId===session.callId&&pc&&!pc.currentRemoteDescription)await pc.setRemoteDescription(payload.answer)});ch.on('broadcast',{event:'ice'},async({payload})=>{if(payload?.callId===session.callId&&normalizeE164(payload?.from)!==myNo&&pc){try{await pc.addIceCandidate(payload.candidate)}catch{}}});ch.on('broadcast',{event:'hangup'},({payload})=>{if(payload?.callId===session.callId){status('Karşı taraf kapattı');cleanup(false)}});ch.on('broadcast',{event:'caption'},({payload})=>{if(payload?.callId===session.callId&&normalizeE164(payload?.from)!==myNo)addCaption('Karşı taraf',payload.original,payload.translated)});await ch.subscribe()}
async function makeOffer(){await createPeer();const o=await pc.createOffer();await pc.setLocalDescription(o);await session.chan.send({type:'broadcast',event:'offer',payload:{callId:session.callId,offer:pc.localDescription.toJSON()}})}

function addCaption(who,original,translated){if(!subsOn)return;const d=document.createElement('div');d.className='line';d.dataset.tts=translated||original;d.innerHTML=`<div><div class="who">${who}</div><div class="original"></div><div class="translated"></div></div><button class="speaker">🔊</button>`;d.querySelector('.original').textContent=original||'';d.querySelector('.translated').textContent=translated||'';$('subs').appendChild(d);while($('subs').children.length>3)$('subs').firstElementChild.remove()}
async function translate(text){const base=String(BASE_DOMAIN||'').replace(/\/+$/,'');if(!base)return text;try{const r=await fetch(base+'/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,source:srcLang,target:dstLang,from_lang:srcLang,to_lang:dstLang})});const j=await r.json();return String(j.text||j.translated||j.translation||j.translatedText||text)}catch{return text}}
function startRecognition(){if(recRunning)return;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status('Görüşme bağlı · Bu tarayıcı canlı altyazıyı desteklemiyor');return}recognition=new SR();recognition.lang=LANG[srcLang]?.sr||srcLang;recognition.continuous=true;recognition.interimResults=false;recognition.onresult=async e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(!e.results[i].isFinal)continue;const original=e.results[i][0].transcript.trim();if(!original)continue;const translated=await translate(original);addCaption('Sen',original,translated);session?.chan?.send({type:'broadcast',event:'caption',payload:{callId:session.callId,from:myNo,original,translated}})}};recognition.onend=()=>{if(recRunning)try{recognition.start()}catch{}};recognition.onerror=e=>{if(['not-allowed','service-not-allowed'].includes(e.error)){recRunning=false;status('Görüşme bağlı · Altyazı için konuşma tanıma izni yok')}};recRunning=true;try{recognition.start()}catch{}}
function stopRecognition(){recRunning=false;try{recognition?.stop()}catch{}recognition=null}function restartRecognition(){if(recRunning){stopRecognition();setTimeout(startRecognition,150)}}

$('mic').onclick=e=>{micMuted=!micMuted;localStream?.getAudioTracks().forEach(t=>t.enabled=!micMuted);e.currentTarget.classList.toggle('active',micMuted);status(micMuted?'Mikrofon kapalı':'Mikrofon açık')};
$('cam').onclick=e=>{const vt=localStream?.getVideoTracks()?.[0];if(!vt){status('Sesli aramayı görüntülüye yükseltme sonraki aşamada');return}camOff=!camOff;vt.enabled=!camOff;e.currentTarget.classList.toggle('active',camOff);$('stage').classList.toggle('audioOnly',camOff);status(camOff?'Kamera kapalı':'Kamera açık')};
$('sub').onclick=e=>{subsOn=!subsOn;e.currentTarget.classList.toggle('active',subsOn);$('subs').classList.toggle('hidden',!subsOn);$('liveBadge').textContent=subsOn?'Canlı altyazı açık':'Canlı altyazı kapalı'};
$('hang').onclick=async()=>{if(session?.chan)await session.chan.send({type:'broadcast',event:'hangup',payload:{callId:session.callId}});cleanup(true)};
function cleanup(goHome=true){stopRecognition();try{pc?.close()}catch{}pc=null;localStream?.getTracks().forEach(t=>t.stop());localStream=null;$('localVideo').srcObject=null;$('remoteVideo').srcObject=null;if(session?.chan)sb.removeChannel(session.chan);session=null;if(goHome)showHome();else setTimeout(showHome,700)}
document.addEventListener('click',e=>{const b=e.target.closest('.speaker');if(!b||!('speechSynthesis'in window))return;const u=new SpeechSynthesisUtterance(b.closest('.line')?.dataset.tts||'');speechSynthesis.cancel();speechSynthesis.speak(u)});
window.addEventListener('beforeunload',()=>{try{session?.chan?.send({type:'broadcast',event:'hangup',payload:{callId:session.callId}})}catch{}});

bootIdentity().catch(()=>{showVerify();status('Numaranı SMS ile doğrula')});