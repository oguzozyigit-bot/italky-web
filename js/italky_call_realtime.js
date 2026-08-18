import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BASE_DOMAIN } from '/js/config.js';

const SB_URL='https://wtzsnywujksshcwvemgz.supabase.co';
const SB_KEY='sb_publishable_85JlITD5FKjDvdf4JHU0Dg_eByJrKVo';
const sb=createClient(SB_URL,SB_KEY,{auth:{persistSession:false}});
const $=id=>document.getElementById(id);
const digits=s=>String(s||'').replace(/\D/g,'');
const fmt=n=>{const d=digits(n);return d.length===10?`${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7,10)}`:d};
const status=t=>{$('status').textContent=t};
const uuid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;

let myNo=digits(localStorage.getItem('italky_internal_number'));
if(!/^0601\d{6}$/.test(myNo)){myNo='0601'+String(Math.floor(Math.random()*1e6)).padStart(6,'0');localStorage.setItem('italky_internal_number',myNo)}
$('myNumber').textContent=fmt(myNo);

let dial='', inbox=null, session=null, pc=null, localStream=null, incomingData=null;
let micMuted=false, camOff=true, subsOn=true, recognition=null, recRunning=false;
let srcLang=localStorage.getItem('italky_call_src')||'tr';
let dstLang=localStorage.getItem('italky_call_dst')||'en';
const LANG={tr:{name:'Türkçe',sr:'tr-TR'},en:{name:'English',sr:'en-US'},de:{name:'Deutsch',sr:'de-DE'},fr:{name:'Français',sr:'fr-FR'},es:{name:'Español',sr:'es-ES'}};

function paintLang(){ $('srcLang').textContent='Ben: '+(LANG[srcLang]?.name||srcLang); $('dstLang').textContent='Karşı: '+(LANG[dstLang]?.name||dstLang); }
function cycle(which){const ks=Object.keys(LANG),cur=which==='src'?srcLang:dstLang;let i=(ks.indexOf(cur)+1)%ks.length;let n=ks[i];if(which==='src'){srcLang=n;if(srcLang===dstLang)dstLang=ks[(i+1)%ks.length]}else{dstLang=n;if(dstLang===srcLang)srcLang=ks[(i+1)%ks.length]}localStorage.setItem('italky_call_src',srcLang);localStorage.setItem('italky_call_dst',dstLang);paintLang();restartRecognition();}
$('srcLang').onclick=()=>cycle('src'); $('dstLang').onclick=()=>cycle('dst'); paintLang();

function paintDial(){$('number').textContent=dial?fmt(dial):'Numara gir'}
$('keypad').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;const k=b.dataset.k;if(/\d/.test(k)&&dial.length<10){dial+=k;paintDial()}};
$('erase').onclick=()=>{dial=dial.slice(0,-1);paintDial()};

function showHome(){ $('callUi').classList.add('hidden');$('home').classList.remove('hidden'); }
function showCall(mode,peer){ $('home').classList.add('hidden');$('callUi').classList.remove('hidden');$('peerNumber').textContent=fmt(peer);$('stage').classList.toggle('audioOnly',mode==='audio');camOff=mode==='audio'; }
function showIncoming(p){incomingData=p;$('incomingNo').textContent=fmt(p.callerNo);$('incomingMode').textContent=p.mode==='video'?'Görüntülü arama':'Sesli arama';$('incoming').classList.remove('hidden');try{navigator.vibrate?.([300,150,300,150,600])}catch{}}
function hideIncoming(){$('incoming').classList.add('hidden')}

async function startInbox(){
  inbox=sb.channel('call:'+myNo,{config:{broadcast:{self:false}}});
  inbox.on('broadcast',{event:'ring'},({payload})=>{if(payload?.calleeNo===myNo&&!session)showIncoming(payload)});
  inbox.on('broadcast',{event:'declined'},({payload})=>{if(session&&payload?.callId===session.callId){status('Arama reddedildi');cleanup(false)}});
  inbox.on('broadcast',{event:'accepted'},async({payload})=>{if(session?.role==='caller'&&payload?.callId===session.callId){status('Bağlanıyor…');await joinSessionChannel();await makeOffer();}});
  await inbox.subscribe(); status('Hazır');
}

async function ring(mode){
  const peer=digits(dial); if(!/^0601\d{6}$/.test(peer)){status('0601 ile başlayan 10 haneli numara gir');return} if(peer===myNo){status('Kendi numaranı arayamazsın');return}
  session={callId:uuid(),role:'caller',peerNo:peer,mode,chan:null};
  showCall(mode,peer);status('Çalıyor…');
  await sb.channel('call:'+peer).send({type:'broadcast',event:'ring',payload:{callId:session.callId,callerNo:myNo,calleeNo:peer,mode,srcLang,dstLang}});
}
$('audioCall').onclick=()=>ring('audio'); $('videoCall').onclick=()=>ring('video');

$('decline').onclick=async()=>{if(!incomingData)return;await sb.channel('call:'+incomingData.callerNo).send({type:'broadcast',event:'declined',payload:{callId:incomingData.callId}});hideIncoming();incomingData=null;status('Arama reddedildi')};
$('accept').onclick=async()=>{if(!incomingData)return;const p=incomingData;hideIncoming();session={callId:p.callId,role:'callee',peerNo:p.callerNo,mode:p.mode,chan:null};srcLang=p.dstLang||srcLang;dstLang=p.srcLang||dstLang;paintLang();showCall(p.mode,p.callerNo);status('Bağlanıyor…');await prepareMedia();await joinSessionChannel();await sb.channel('call:'+p.callerNo).send({type:'broadcast',event:'accepted',payload:{callId:p.callId,calleeNo:myNo}});incomingData=null};

async function prepareMedia(){
  if(localStream)return;
  const wantsVideo=session?.mode==='video';
  localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:wantsVideo?{facingMode:'user',width:{ideal:640},height:{ideal:480}}:false});
  $('localVideo').srcObject=localStream;
  camOff=!wantsVideo;
}

async function createPeer(){
  await prepareMedia();
  pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
  localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
  pc.ontrack=e=>{$('remoteVideo').srcObject=e.streams[0];};
  pc.onicecandidate=e=>{if(e.candidate&&session?.chan)session.chan.send({type:'broadcast',event:'ice',payload:{callId:session.callId,from:myNo,candidate:e.candidate.toJSON()}})};
  pc.onconnectionstatechange=()=>{if(!pc)return;const s=pc.connectionState;status(s==='connected'?'Görüşme bağlı':s==='failed'?'Bağlantı kurulamadı':s==='disconnected'?'Bağlantı koptu':'Bağlanıyor…');if(s==='connected')startRecognition();};
}

async function joinSessionChannel(){
  if(session.chan)return;
  const ch=sb.channel('session:'+session.callId,{config:{broadcast:{self:false}}});session.chan=ch;
  ch.on('broadcast',{event:'offer'},async({payload})=>{if(session.role!=='callee'||payload?.callId!==session.callId)return;await createPeer();await pc.setRemoteDescription(payload.offer);const a=await pc.createAnswer();await pc.setLocalDescription(a);await ch.send({type:'broadcast',event:'answer',payload:{callId:session.callId,answer:pc.localDescription.toJSON()}})});
  ch.on('broadcast',{event:'answer'},async({payload})=>{if(session.role==='caller'&&payload?.callId===session.callId&&pc&&!pc.currentRemoteDescription)await pc.setRemoteDescription(payload.answer)});
  ch.on('broadcast',{event:'ice'},async({payload})=>{if(payload?.callId===session.callId&&payload?.from!==myNo&&pc){try{await pc.addIceCandidate(payload.candidate)}catch{}}});
  ch.on('broadcast',{event:'hangup'},({payload})=>{if(payload?.callId===session.callId){status('Karşı taraf kapattı');cleanup(false)}});
  ch.on('broadcast',{event:'caption'},({payload})=>{if(payload?.callId===session.callId&&payload?.from!==myNo)addCaption('Karşı taraf',payload.original,payload.translated,true)});
  await ch.subscribe();
}
async function makeOffer(){await createPeer();const o=await pc.createOffer();await pc.setLocalDescription(o);await session.chan.send({type:'broadcast',event:'offer',payload:{callId:session.callId,offer:pc.localDescription.toJSON()}})}

function addCaption(who,original,translated,remote=false){if(!subsOn)return;const d=document.createElement('div');d.className='line';d.dataset.tts=translated||original;d.innerHTML=`<div><div class="who">${who}</div><div class="original"></div><div class="translated"></div></div><button class="speaker">🔊</button>`;d.querySelector('.original').textContent=original||'';d.querySelector('.translated').textContent=translated||'';$('subs').appendChild(d);while($('subs').children.length>3)$('subs').firstElementChild.remove();}
async function translate(text){const base=String(BASE_DOMAIN||'').replace(/\/+$/,'');if(!base)return text;try{const r=await fetch(base+'/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,source:srcLang,target:dstLang,from_lang:srcLang,to_lang:dstLang})});const j=await r.json();return String(j.text||j.translated||j.translation||j.translatedText||text)}catch{return text}}
function startRecognition(){if(recRunning)return;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status('Görüşme bağlı · Bu tarayıcı canlı altyazıyı desteklemiyor');return}recognition=new SR();recognition.lang=LANG[srcLang]?.sr||srcLang;recognition.continuous=true;recognition.interimResults=false;recognition.onresult=async e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(!e.results[i].isFinal)continue;const original=e.results[i][0].transcript.trim();if(!original)continue;const translated=await translate(original);addCaption('Sen',original,translated);session?.chan?.send({type:'broadcast',event:'caption',payload:{callId:session.callId,from:myNo,original,translated}})}};recognition.onend=()=>{if(recRunning)try{recognition.start()}catch{}};recognition.onerror=e=>{if(['not-allowed','service-not-allowed'].includes(e.error)){recRunning=false;status('Görüşme bağlı · Altyazı için mikrofon tanıma izni yok')}};recRunning=true;try{recognition.start()}catch{}}
function stopRecognition(){recRunning=false;try{recognition?.stop()}catch{}recognition=null}
function restartRecognition(){if(recRunning){stopRecognition();setTimeout(startRecognition,150)}}

$('mic').onclick=e=>{micMuted=!micMuted;localStream?.getAudioTracks().forEach(t=>t.enabled=!micMuted);e.currentTarget.classList.toggle('active',micMuted);status(micMuted?'Mikrofon kapalı':'Mikrofon açık')};
$('cam').onclick=e=>{const vt=localStream?.getVideoTracks()?.[0];if(!vt){status('Sesli aramayı görüntülüye yükseltme sonraki aşamada');return}camOff=!camOff;vt.enabled=!camOff;e.currentTarget.classList.toggle('active',camOff);$('stage').classList.toggle('audioOnly',camOff);status(camOff?'Kamera kapalı':'Kamera açık')};
$('sub').onclick=e=>{subsOn=!subsOn;e.currentTarget.classList.toggle('active',subsOn);$('subs').classList.toggle('hidden',!subsOn);$('liveBadge').textContent=subsOn?'Canlı altyazı açık':'Canlı altyazı kapalı'};
$('hang').onclick=async()=>{if(session?.chan)await session.chan.send({type:'broadcast',event:'hangup',payload:{callId:session.callId}});cleanup(true)};
function cleanup(goHome=true){stopRecognition();try{pc?.close()}catch{}pc=null;localStream?.getTracks().forEach(t=>t.stop());localStream=null;$('localVideo').srcObject=null;$('remoteVideo').srcObject=null;if(session?.chan)sb.removeChannel(session.chan);session=null;if(goHome)showHome();else setTimeout(showHome,700)}

document.addEventListener('click',e=>{const b=e.target.closest('.speaker');if(!b||!('speechSynthesis'in window))return;const u=new SpeechSynthesisUtterance(b.closest('.line')?.dataset.tts||'');speechSynthesis.cancel();speechSynthesis.speak(u)});

window.addEventListener('beforeunload',()=>{try{session?.chan?.send({type:'broadcast',event:'hangup',payload:{callId:session.callId}})}catch{}});
startInbox().catch(()=>status('Çağrı servisine bağlanamadı'));
