import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BASE_DOMAIN } from '/js/config.js';
import { LANGUAGE_REGISTRY_129 } from '/js/language_registry_129.js';

const sb=createClient('https://wtzsnywujksshcwvemgz.supabase.co','sb_publishable_85JlITD5FKjDvdf4JHU0Dg_eByJrKVo',{auth:{persistSession:false}});
const $=id=>document.getElementById(id);
const digits=s=>String(s||'').replace(/\D/g,'');
const key=s=>digits(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uuid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const norm=s=>{const d=digits(s);return d?`+${d}`:''};
const fmt=s=>{const n=norm(s);if(n.startsWith('+90')&&digits(n).length===12){const d=digits(n);return `+90 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8,10)} ${d.slice(10,12)}`}return n};
const langName=code=>LANGUAGE_REGISTRY_129.find(x=>x.code===code)?.name||code;
const initials=s=>String(s||'IT').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const status=t=>{$('status').textContent=t};

let itiMe,itiContact;
let myNo=localStorage.getItem('italky_test_phone_v2')||'';
let myLang=localStorage.getItem('italky_test_lang_v2')||'tr';
let pending='';
let contacts=JSON.parse(localStorage.getItem('italky_test_contacts_v2')||'[]');
let active=null,inbox=null,msgChan=null,callChan=null,pc=null,stream=null,callState=null,incoming=null,rec=null;

function fillLanguages(){
  const opts=LANGUAGE_REGISTRY_129.filter(x=>x.online!==false).map(x=>`<option value="${esc(x.code)}">${esc(x.flag||'🌐')} ${esc(x.name)}</option>`).join('');
  $('myLang').innerHTML=opts;$('contactLang').innerHTML=opts;
  $('myLang').value=myLang;
  if(!$('myLang').value)$('myLang').value='tr';
  $('contactLang').value='en';
}
function initPhones(){
  const common={initialCountry:'tr',separateDialCode:true,nationalMode:true,autoPlaceholder:'aggressive',preferredCountries:['tr','us','de','gb','mk'],utilsScript:'https://cdn.jsdelivr.net/npm/intl-tel-input@18.5.6/build/js/utils.js'};
  itiMe=window.intlTelInput($('phone'),common);
  itiContact=window.intlTelInput($('contactPhone'),common);
}
function phoneValue(iti,input){
  try{const n=iti.getNumber();if(/^\+[1-9]\d{7,14}$/.test(n))return n}catch{}
  const c=iti.getSelectedCountryData()?.dialCode||'';return norm(c+digits(input.value).replace(/^0+/,''));
}
function showVerify(){ $('verify').classList.remove('hidden');$('home').classList.add('hidden'); }
function showHome(){ $('verify').classList.add('hidden');$('home').classList.remove('hidden');render();subscribeInbox(); }
function persistContacts(){localStorage.setItem('italky_test_contacts_v2',JSON.stringify(contacts));}

async function subscribeInbox(){
  if(!myNo)return;
  if(inbox)try{await sb.removeChannel(inbox)}catch{}
  inbox=sb.channel('test-phone-v2:'+key(myNo));
  inbox.on('broadcast',{event:'message'},({payload})=>{if(payload?.to!==myNo)return;saveLocalMessage(payload.from,{mine:false,original:payload.original||'',translated:payload.translated||payload.original||'',at:Date.now(),voice:!!payload.voice});if(active?.phone===payload.from)renderMessages();render();});
  inbox.on('broadcast',{event:'ring'},({payload})=>{if(payload?.to===myNo&&!callState){incoming=payload;$('incomingNo').textContent=fmt(payload.from);$('incomingMode').textContent=payload.mode==='video'?'Görüntülü arama':'Sesli arama';$('incoming').classList.remove('hidden')}});
  inbox.on('broadcast',{event:'accept'},async({payload})=>{if(callState&&payload.id===callState.id){await joinCall();await offer();}});
  inbox.on('broadcast',{event:'decline'},({payload})=>{if(callState&&payload.id===callState.id){status('Arama reddedildi');endCall(false)}});
  await inbox.subscribe();status('Hazır · '+fmt(myNo));
}

function msgKey(p){return 'italky_test_msgs_v2_'+key(myNo)+'_'+key(p)}
function getMsgs(p){return JSON.parse(localStorage.getItem(msgKey(p))||'[]')}
function saveLocalMessage(p,m){const a=getMsgs(p);a.push(m);localStorage.setItem(msgKey(p),JSON.stringify(a.slice(-300)))}
async function translate(text,from,to){
  if(!text||from===to)return text;
  const base=String(BASE_DOMAIN||'').replace(/\/+$/,'');
  try{const r=await fetch(base+'/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,source:from,target:to,from_lang:from,to_lang:to})});const j=await r.json();return String(j.text||j.translation||j.translated||j.translatedText||text)}catch{return text}
}
async function sendText(text,voice=false){
  if(!active||!text.trim())return;
  const original=text.trim();status('Çevriliyor…');
  const translated=await translate(original,myLang,active.lang);
  const m={mine:true,original,translated,at:Date.now(),voice};saveLocalMessage(active.phone,m);renderMessages();
  await sb.channel('test-phone-v2:'+key(active.phone)).send({type:'broadcast',event:'message',payload:{from:myNo,to:active.phone,original,translated,voice,fromLang:myLang,toLang:active.lang}});
  status('Gönderildi');render();
}
function renderMessages(){
  if(!active)return;const a=getMsgs(active.phone);
  $('messages').innerHTML=a.map(m=>`<div class="bubble ${m.mine?'mine':'theirs'}"><div class="msgText">${m.voice?'🎙️ ':''}${esc(m.mine?m.original:m.translated)}</div>${m.mine&&m.original!==m.translated?`<div class="translationPreview">→ ${esc(m.translated)}</div>`:''}<div class="msgMeta">${new Date(m.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></div>`).join('');
  $('messages').scrollTop=$('messages').scrollHeight;
}
function openChat(){
  $('chat').classList.remove('hidden');$('chatName').textContent=active.name;$('chatLang').textContent=`${langName(active.lang)} · otomatik çeviri`;$('chatAvatar').textContent=initials(active.name);renderMessages();
}
function render(){
  const rows=contacts.length?contacts.map(c=>{const msgs=getMsgs(c.phone),last=msgs[msgs.length-1];return `<button class="contactRow" data-phone="${esc(c.phone)}"><div class="avatar">${esc(initials(c.name))}</div><div class="contactBody"><div class="contactTop"><strong>${esc(c.name)}</strong><span>${last?new Date(last.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</span></div><div class="contactSub">${last?esc(last.mine?last.original:last.translated):`${esc(fmt(c.phone))} · ${esc(langName(c.lang))}`}</div></div></button>`}).join(''):`<div class="empty"><div class="emptyIcon">💬</div><h3>Henüz sohbet yok</h3><p>Sağ alttaki düğmeden bir kişi ekle.</p></div>`;
  $('chats').innerHTML=rows;$('contacts').innerHTML=contacts.length?contacts.map(c=>`<button class="contactRow" data-phone="${esc(c.phone)}"><div class="avatar">${esc(initials(c.name))}</div><div class="contactBody"><strong>${esc(c.name)}</strong><div class="contactSub">${esc(fmt(c.phone))} · ${esc(langName(c.lang))}</div></div></button>`).join(''):`<div class="empty"><div class="emptyIcon">👤</div><h3>Kişi yok</h3><p>Telefon numarasıyla kişi ekle.</p></div>`;
}

$('sendBtn').onclick=()=>{const n=phoneValue(itiMe,$('phone'));if(!/^\+[1-9]\d{7,14}$/.test(n)){status('Geçerli bir telefon numarası gir');return}pending=n;myLang=$('myLang').value||'tr';$('phoneStep').classList.add('hidden');$('otpStep').classList.remove('hidden');$('otp').focus();status('SMS gönderildi (TEST) · Kod 123456')};
$('verifyBtn').onclick=()=>{if(digits($('otp').value)!=='123456'){status('Kod hatalı · Test kodu 123456');return}myNo=pending;localStorage.setItem('italky_test_phone_v2',myNo);localStorage.setItem('italky_test_lang_v2',myLang);status('Numara doğrulandı');showHome();};
$('editBtn').onclick=()=>{$('otpStep').classList.add('hidden');$('phoneStep').classList.remove('hidden');$('otp').value='';pending='';status('Numaranı düzelt')};
$('otp').oninput=e=>e.target.value=digits(e.target.value).slice(0,6);

$('add').onclick=()=>{$('addSheet').classList.remove('hidden');setTimeout(()=>$('contactName').focus(),100)};
$('closeAdd').onclick=()=>$('addSheet').classList.add('hidden');
$('saveContact').onclick=()=>{const p=phoneValue(itiContact,$('contactPhone'));if(!/^\+[1-9]\d{7,14}$/.test(p)){status('Geçerli kişi numarası gir');return}if(p===myNo){status('Kendi numaranı kişi olarak ekleyemezsin');return}const c={name:$('contactName').value.trim()||fmt(p),phone:p,lang:$('contactLang').value||'en'};contacts=contacts.filter(x=>x.phone!==p);contacts.unshift(c);persistContacts();$('addSheet').classList.add('hidden');$('contactName').value='';$('contactPhone').value='';render();status('Kişi eklendi')};

$('backChat').onclick=()=>{$('chat').classList.add('hidden');active=null};
$('send').onclick=()=>{const v=$('msg').value;$('msg').value='';sendText(v)};
$('msg').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('send').click()}});
$('voice').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status('Bu tarayıcı sesli mesaj yazıya çevirme özelliğini desteklemiyor');return}if(rec){try{rec.stop()}catch{}return}rec=new SR();rec.lang=(LANGUAGE_REGISTRY_129.find(x=>x.code===myLang)?.code||myLang);rec.interimResults=false;rec.continuous=false;$('voice').classList.add('recording');status('Konuş…');rec.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript||'';if(t)sendText(t,true)};rec.onend=()=>{$('voice').classList.remove('recording');rec=null};rec.onerror=()=>{$('voice').classList.remove('recording');rec=null;status('Ses alınamadı')};try{rec.start()}catch{rec=null}};

document.addEventListener('click',e=>{const b=e.target.closest('[data-phone]');if(b){active=contacts.find(x=>x.phone===b.dataset.phone);if(active)openChat()}const t=e.target.closest('[data-tab]');if(t){document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===t.dataset.tab));['chats','contacts','calls'].forEach(id=>$(id).classList.toggle('hidden',id!==t.dataset.tab));}});

async function ring(mode){if(!active)return;callState={id:uuid(),role:'caller',peer:active.phone,mode};showCall(mode);status('Çalıyor…');await sb.channel('test-phone-v2:'+key(active.phone)).send({type:'broadcast',event:'ring',payload:{id:callState.id,from:myNo,to:active.phone,mode,fromLang:myLang,toLang:active.lang}})}
$('audio').onclick=()=>ring('audio');$('video').onclick=()=>ring('video');
function showCall(mode){$('call').classList.remove('hidden');$('peer').textContent=active?.name||fmt(callState?.peer);$('call').classList.toggle('audioMode',mode==='audio')}
async function media(){if(stream)return;stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:callState.mode==='video'?{facingMode:'user'}:false});$('local').srcObject=stream}
async function peer(){await media();pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});stream.getTracks().forEach(t=>pc.addTrack(t,stream));pc.ontrack=e=>$('remote').srcObject=e.streams[0];pc.onicecandidate=e=>{if(e.candidate&&callChan)callChan.send({type:'broadcast',event:'ice',payload:{id:callState.id,from:myNo,candidate:e.candidate.toJSON()}})};}
async function joinCall(){if(callChan)return;callChan=sb.channel('test-call-v2:'+callState.id);callChan.on('broadcast',{event:'offer'},async({payload})=>{if(callState.role!=='callee')return;await peer();await pc.setRemoteDescription(payload.offer);const a=await pc.createAnswer();await pc.setLocalDescription(a);await callChan.send({type:'broadcast',event:'answer',payload:{id:callState.id,answer:pc.localDescription.toJSON()}})});callChan.on('broadcast',{event:'answer'},async({payload})=>{if(callState.role==='caller'&&pc)await pc.setRemoteDescription(payload.answer)});callChan.on('broadcast',{event:'ice'},async({payload})=>{if(payload.from!==myNo&&pc)try{await pc.addIceCandidate(payload.candidate)}catch{}});callChan.on('broadcast',{event:'hangup'},()=>endCall(false));callChan.on('broadcast',{event:'caption'},({payload})=>{if(payload.from!==myNo)addSub(payload.translated||payload.original)});await callChan.subscribe();}
async function offer(){await peer();const o=await pc.createOffer();await pc.setLocalDescription(o);await callChan.send({type:'broadcast',event:'offer',payload:{id:callState.id,offer:pc.localDescription.toJSON()}});startCaptions();}
$('accept').onclick=async()=>{if(!incoming)return;const c=contacts.find(x=>x.phone===incoming.from);active=c||{name:fmt(incoming.from),phone:incoming.from,lang:incoming.fromLang||'en'};callState={id:incoming.id,role:'callee',peer:incoming.from,mode:incoming.mode};$('incoming').classList.add('hidden');showCall(incoming.mode);await media();await joinCall();await sb.channel('test-phone-v2:'+key(incoming.from)).send({type:'broadcast',event:'accept',payload:{id:incoming.id}});incoming=null;startCaptions()};
$('decline').onclick=async()=>{if(!incoming)return;await sb.channel('test-phone-v2:'+key(incoming.from)).send({type:'broadcast',event:'decline',payload:{id:incoming.id}});$('incoming').classList.add('hidden');incoming=null};
$('hang').onclick=async()=>{if(callChan)await callChan.send({type:'broadcast',event:'hangup',payload:{id:callState?.id}});endCall(true)};
function endCall(){try{pc?.close()}catch{}pc=null;stream?.getTracks().forEach(t=>t.stop());stream=null;$('remote').srcObject=null;$('local').srcObject=null;if(callChan)sb.removeChannel(callChan);callChan=null;callState=null;$('call').classList.add('hidden');stopCaptions();status('Hazır · '+fmt(myNo))}
$('mic').onclick=()=>{const t=stream?.getAudioTracks()?.[0];if(t){t.enabled=!t.enabled;$('mic').classList.toggle('off',!t.enabled)}};
$('cam').onclick=()=>{const t=stream?.getVideoTracks()?.[0];if(t){t.enabled=!t.enabled;$('cam').classList.toggle('off',!t.enabled)}};
function addSub(text){const d=document.createElement('div');d.className='subline';d.textContent=text;$('subs').appendChild(d);while($('subs').children.length>2)$('subs').firstElementChild.remove()}
function startCaptions(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR||rec)return;rec=new SR();rec.continuous=true;rec.interimResults=false;rec.lang=myLang;rec.onresult=async e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(!e.results[i].isFinal)continue;const original=e.results[i][0].transcript.trim();const to=active?.lang||'en';const translated=await translate(original,myLang,to);addSub(original);callChan?.send({type:'broadcast',event:'caption',payload:{from:myNo,original,translated}})}};rec.onend=()=>{if(callState)try{rec.start()}catch{}};try{rec.start()}catch{rec=null}}
function stopCaptions(){try{rec?.stop()}catch{}rec=null}

fillLanguages();initPhones();
if(myNo)showHome();else showVerify();
window.addEventListener('beforeunload',()=>{try{callChan?.send({type:'broadcast',event:'hangup',payload:{id:callState?.id}})}catch{}});
