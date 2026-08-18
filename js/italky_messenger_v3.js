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
const fmt=s=>{const n=norm(s),d=digits(n);if(d.startsWith('90')&&d.length===12)return `+90 ${d.slice(2,5)} ${d.slice(5,8)} ${d.slice(8,10)} ${d.slice(10,12)}`;return n};
const langName=code=>LANGUAGE_REGISTRY_129.find(x=>x.code===code)?.name||code;
const initials=s=>String(s||'IT').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const status=t=>{$('status').textContent=t};
const flag=iso=>iso.toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt()));
const regionNames=(()=>{try{return new Intl.DisplayNames(['tr'],{type:'region'})}catch{return null}})();

let myNo=localStorage.getItem('italky_test_phone_v3')||'';
let myLang=localStorage.getItem('italky_test_lang_v3')||'tr';
let myProfile=JSON.parse(localStorage.getItem('italky_test_profile_v3')||'null');
let pending='';
let pendingPhoto='';
let contacts=JSON.parse(localStorage.getItem('italky_test_contacts_v3')||'[]');
let active=null,inbox=null,callChan=null,pc=null,stream=null,callState=null,incoming=null,rec=null,captionRec=null;

function getCountries(){
  const raw=window.intlTelInputGlobals?.getCountryData?.()||[];
  return raw.map(x=>({iso:x.iso2,dial:x.dialCode,name:regionNames?.of(x.iso2.toUpperCase())||x.name})).filter(x=>x.dial).sort((a,b)=>a.name.localeCompare(b.name,'tr'));
}
const countries=getCountries();
function countryOptions(){return countries.map(c=>`<option value="${esc(c.iso)}" data-dial="${esc(c.dial)}">${flag(c.iso)} ${esc(c.name)} · +${esc(c.dial)}</option>`).join('')}
function fillCountries(){
  const opts=countryOptions();$('country').innerHTML=opts;$('contactCountry').innerHTML=opts;
  $('country').value='tr';$('contactCountry').value='tr';paintCountry('country','dialCode','phone');paintCountry('contactCountry','contactDialCode','contactPhone');
}
function fillLanguages(){
  const opts=LANGUAGE_REGISTRY_129.filter(x=>x.online!==false).map(x=>`<option value="${esc(x.code)}">${esc(x.flag||'🌐')} ${esc(x.name)}</option>`).join('');
  $('myLang').innerHTML=opts;$('contactLang').innerHTML=opts;$('myLang').value=myLang||'tr';if(!$('myLang').value)$('myLang').value='tr';$('contactLang').value='en';
}
function selectedCountry(id){const s=$(id),o=s.options[s.selectedIndex];return countries.find(c=>c.iso===s.value)||{dial:o?.dataset?.dial||'',iso:s.value}}
function paintCountry(selectId,dialId,inputId){const c=selectedCountry(selectId);$(dialId).textContent='+'+(c.dial||'');const input=$(inputId);if(c.iso==='tr')input.placeholder='532 123 45 67';else if(c.iso==='us'||c.iso==='ca')input.placeholder='555 123 4567';else input.placeholder='Telefon numarası'}
function phoneValue(selectId,inputId){const c=selectedCountry(selectId);let local=digits($(inputId).value);if(local.startsWith('00'))return norm(local.slice(2));if(local.startsWith(c.dial)&&local.length>10)return norm(local);if(local.startsWith('0'))local=local.replace(/^0+/,'');return norm(c.dial+local)}
$('country').addEventListener('change',()=>paintCountry('country','dialCode','phone'));
$('contactCountry').addEventListener('change',()=>paintCountry('contactCountry','contactDialCode','contactPhone'));

function avatarHTML(person,cls='avatar'){
  const photo=person?.photo||'';const name=person?.name||person?.phone||'IT';
  return photo?`<div class="${cls}"><img src="${esc(photo)}" alt=""></div>`:`<div class="${cls}">${esc(initials(name))}</div>`;
}
function setAvatar(el,person){el.innerHTML=person?.photo?`<img src="${esc(person.photo)}" alt="">`:esc(initials(person?.name||person?.phone||'IT'))}
function persistContacts(){localStorage.setItem('italky_test_contacts_v3',JSON.stringify(contacts))}
function upsertRemoteProfile(p){if(!p?.from)return;const i=contacts.findIndex(c=>c.phone===p.from);if(i<0)return;contacts[i]={...contacts[i],photo:p.photo||contacts[i].photo||'',remoteName:p.name||contacts[i].remoteName||'',remoteLang:p.lang||contacts[i].remoteLang||contacts[i].lang};persistContacts();if(active?.phone===p.from)active=contacts[i];render()}
async function requestProfile(phone){if(!phone||!myNo)return;await sb.channel('test-phone-v3:'+key(phone)).send({type:'broadcast',event:'profile-request',payload:{from:myNo,to:phone}})}
async function replyProfile(to){if(!myProfile)return;await sb.channel('test-phone-v3:'+key(to)).send({type:'broadcast',event:'profile-response',payload:{from:myNo,to,name:myProfile.name,photo:myProfile.photo||'',lang:myLang}})}

function showPhoneStep(){$('verify').classList.remove('hidden');$('home').classList.add('hidden');$('phoneStep').classList.remove('hidden');$('otpStep').classList.add('hidden');$('profileStep').classList.add('hidden')}
function showProfileStep(){$('phoneStep').classList.add('hidden');$('otpStep').classList.add('hidden');$('profileStep').classList.remove('hidden');$('profileName').focus();status('Profilini tamamla')}
function showHome(){
  $('verify').classList.add('hidden');$('home').classList.remove('hidden');$('meName').textContent=myProfile?.name||fmt(myNo);$('meSub').textContent=`${fmt(myNo)} · ${langName(myLang)}`;setAvatar($('meAvatar'),myProfile||{name:fmt(myNo)});render();subscribeInbox();
}

async function subscribeInbox(){
  if(!myNo)return;if(inbox)try{await sb.removeChannel(inbox)}catch{}
  inbox=sb.channel('test-phone-v3:'+key(myNo));
  inbox.on('broadcast',{event:'profile-request'},({payload})=>{if(payload?.to===myNo&&payload?.from)replyProfile(payload.from)});
  inbox.on('broadcast',{event:'profile-response'},({payload})=>{if(payload?.to===myNo)upsertRemoteProfile(payload)});
  inbox.on('broadcast',{event:'message'},({payload})=>{if(payload?.to!==myNo)return;upsertRemoteProfile({from:payload.from,name:payload.senderName,photo:payload.senderPhoto,lang:payload.fromLang});saveLocalMessage(payload.from,{mine:false,original:payload.original||'',translated:payload.translated||payload.original||'',at:Date.now(),voice:!!payload.voice});if(active?.phone===payload.from)renderMessages();render()});
  inbox.on('broadcast',{event:'ring'},({payload})=>{if(payload?.to!==myNo||callState)return;incoming=payload;const known=contacts.find(c=>c.phone===payload.from);const person={name:known?.name||payload.senderName||fmt(payload.from),photo:known?.photo||payload.senderPhoto||'',phone:payload.from};$('incomingName').textContent=person.name;$('incomingNo').textContent=fmt(payload.from);$('incomingMode').textContent=payload.mode==='video'?'Görüntülü arama':'Sesli arama';setAvatar($('incomingAvatar'),person);$('incoming').classList.remove('hidden')});
  inbox.on('broadcast',{event:'accept'},async({payload})=>{if(callState&&payload.id===callState.id){await joinCall();await offer()}});
  inbox.on('broadcast',{event:'decline'},({payload})=>{if(callState&&payload.id===callState.id){status('Arama reddedildi');endCall()}});
  await inbox.subscribe();status('Hazır · '+fmt(myNo));
}

function msgKey(p){return 'italky_test_msgs_v3_'+key(myNo)+'_'+key(p)}
function getMsgs(p){return JSON.parse(localStorage.getItem(msgKey(p))||'[]')}
function saveLocalMessage(p,m){const a=getMsgs(p);a.push(m);localStorage.setItem(msgKey(p),JSON.stringify(a.slice(-300)))}
async function translate(text,from,to){if(!text||from===to)return text;const base=String(BASE_DOMAIN||'').replace(/\/+$/,'');try{const r=await fetch(base+'/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,source:from,target:to,from_lang:from,to_lang:to})});const j=await r.json();return String(j.text||j.translation||j.translated||j.translatedText||text)}catch{return text}}
async function sendText(text,voice=false){
  if(!active||!text.trim())return;const original=text.trim();status('Çevriliyor…');const translated=await translate(original,myLang,active.lang);saveLocalMessage(active.phone,{mine:true,original,translated,at:Date.now(),voice});renderMessages();
  await sb.channel('test-phone-v3:'+key(active.phone)).send({type:'broadcast',event:'message',payload:{from:myNo,to:active.phone,original,translated,voice,fromLang:myLang,toLang:active.lang,senderName:myProfile?.name||'',senderPhoto:myProfile?.photo||''}});status('Gönderildi');render();
}
function renderMessages(){if(!active)return;const a=getMsgs(active.phone);$('messages').innerHTML=a.map(m=>`<div class="bubble ${m.mine?'mine':'theirs'}"><div>${m.voice?'🎙️ ':''}${esc(m.mine?m.original:m.translated)}</div>${m.mine&&m.original!==m.translated?`<div class="translationPreview">Karşı tarafta: ${esc(m.translated)}</div>`:''}<div class="msgMeta">${new Date(m.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></div>`).join('');$('messages').scrollTop=$('messages').scrollHeight}
function openChat(){if(!active)return;$('chat').classList.remove('hidden');$('chatName').textContent=active.name;$('chatLang').textContent=`${langName(active.lang)} · otomatik çeviri`;setAvatar($('chatAvatar'),active);renderMessages();requestProfile(active.phone)}
function render(){
  const makeRow=c=>{const msgs=getMsgs(c.phone),last=msgs[msgs.length-1];return `<button class="contactRow" data-phone="${esc(c.phone)}">${avatarHTML(c)}<div class="contactBody"><div class="contactTop"><strong>${esc(c.name)}</strong><span>${last?new Date(last.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</span></div><div class="contactSub">${last?esc(last.mine?last.original:last.translated):`${esc(fmt(c.phone))} · ${esc(langName(c.lang))}`}</div></div></button>`};
  $('chats').innerHTML=contacts.length?contacts.map(makeRow).join(''):`<div class="empty"><div class="emptyIcon">💬</div><h3>Henüz sohbet yok</h3><p>Sağ alttaki düğmeden kişi ekle.</p></div>`;
  $('contacts').innerHTML=contacts.length?contacts.map(makeRow).join(''):`<div class="empty"><div class="emptyIcon">👤</div><h3>Kişi yok</h3><p>Telefon numarasıyla kişi ekle.</p></div>`;
}

$('sendBtn').onclick=()=>{const n=phoneValue('country','phone');if(!/^\+[1-9]\d{7,14}$/.test(n)){status('Geçerli bir telefon numarası gir');return}pending=n;myLang=$('myLang').value||'tr';$('phoneStep').classList.add('hidden');$('otpStep').classList.remove('hidden');$('verifyNumber').textContent=fmt(n);$('otp').focus();status('SMS gönderildi (TEST) · Kod 123456')};
$('verifyBtn').onclick=()=>{if(digits($('otp').value)!=='123456'){status('Kod hatalı · Test kodu 123456');return}status('Numara doğrulandı');showProfileStep()};
$('editBtn').onclick=()=>{pending='';$('otp').value='';showPhoneStep();status('Numaranı düzelt')};
$('otp').oninput=e=>e.target.value=digits(e.target.value).slice(0,6);

$('photoPick').onclick=()=>$('profilePhotoInput').click();
$('profilePhotoInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;pendingPhoto=await resizePhoto(f);$('profilePhoto').src=pendingPhoto;$('profilePhoto').classList.remove('hidden');$('photoPlaceholder').classList.add('hidden')};
async function resizePhoto(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onerror=reject;fr.onload=()=>{const im=new Image();im.onerror=reject;im.onload=()=>{const size=180,c=document.createElement('canvas');c.width=size;c.height=size;const x=c.getContext('2d');const s=Math.min(im.width,im.height),sx=(im.width-s)/2,sy=(im.height-s)/2;x.drawImage(im,sx,sy,s,s,0,0,size,size);resolve(c.toDataURL('image/jpeg',.72))};im.src=fr.result};fr.readAsDataURL(file)})}
$('saveProfile').onclick=()=>{const name=$('profileName').value.trim();if(!name){status('Görünen adını yaz');$('profileName').focus();return}myNo=pending;myProfile={name,photo:pendingPhoto||'',phone:myNo,lang:myLang};localStorage.setItem('italky_test_phone_v3',myNo);localStorage.setItem('italky_test_lang_v3',myLang);localStorage.setItem('italky_test_profile_v3',JSON.stringify(myProfile));status('Profil kaydedildi');showHome()};

$('add').onclick=()=>{$('addSheet').classList.remove('hidden');setTimeout(()=>$('contactName').focus(),100)};$('closeAdd').onclick=()=>$('addSheet').classList.add('hidden');
$('saveContact').onclick=async()=>{const p=phoneValue('contactCountry','contactPhone');if(!/^\+[1-9]\d{7,14}$/.test(p)){status('Geçerli kişi numarası gir');return}if(p===myNo){status('Kendi numaranı ekleyemezsin');return}const c={name:$('contactName').value.trim()||fmt(p),phone:p,lang:$('contactLang').value||'en',photo:''};contacts=contacts.filter(x=>x.phone!==p);contacts.unshift(c);persistContacts();$('addSheet').classList.add('hidden');$('contactName').value='';$('contactPhone').value='';render();status('Kişi eklendi');await requestProfile(p)};
$('backChat').onclick=()=>{$('chat').classList.add('hidden');active=null};
$('send').onclick=()=>{const v=$('msg').value;$('msg').value='';sendText(v)};$('msg').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('send').click()}});
$('voice').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status('Bu tarayıcı sesli mesajı yazıya çevirmeyi desteklemiyor');return}if(rec){try{rec.stop()}catch{}return}rec=new SR();rec.lang=myLang;rec.interimResults=false;rec.continuous=false;$('voice').classList.add('recording');status('Konuş…');rec.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript||'';if(t)sendText(t,true)};rec.onend=()=>{$('voice').classList.remove('recording');rec=null};rec.onerror=()=>{$('voice').classList.remove('recording');rec=null;status('Ses alınamadı')};try{rec.start()}catch{rec=null}};

document.addEventListener('click',e=>{const b=e.target.closest('[data-phone]');if(b){active=contacts.find(x=>x.phone===b.dataset.phone);if(active)openChat()}const t=e.target.closest('[data-tab]');if(t){document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===t.dataset.tab));['chats','contacts','calls'].forEach(id=>$(id).classList.toggle('hidden',id!==t.dataset.tab))}});

async function ring(mode){if(!active)return;callState={id:uuid(),role:'caller',peer:active.phone,mode};showCall(mode);status('Çalıyor…');await sb.channel('test-phone-v3:'+key(active.phone)).send({type:'broadcast',event:'ring',payload:{id:callState.id,from:myNo,to:active.phone,mode,fromLang:myLang,toLang:active.lang,senderName:myProfile?.name||'',senderPhoto:myProfile?.photo||''}})}
$('audio').onclick=()=>ring('audio');$('video').onclick=()=>ring('video');
function showCall(mode){$('call').classList.remove('hidden');$('peer').textContent=active?.name||fmt(callState?.peer);$('call').classList.toggle('audioMode',mode==='audio')}
async function media(){if(stream)return;stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:callState.mode==='video'?{facingMode:'user'}:false});$('local').srcObject=stream}
async function makePeer(){await media();pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});stream.getTracks().forEach(t=>pc.addTrack(t,stream));pc.ontrack=e=>$('remote').srcObject=e.streams[0];pc.onicecandidate=e=>{if(e.candidate&&callChan)callChan.send({type:'broadcast',event:'ice',payload:{id:callState.id,from:myNo,candidate:e.candidate.toJSON()}})}}
async function joinCall(){if(callChan)return;callChan=sb.channel('test-call-v3:'+callState.id);callChan.on('broadcast',{event:'offer'},async({payload})=>{if(callState.role!=='callee')return;await makePeer();await pc.setRemoteDescription(payload.offer);const a=await pc.createAnswer();await pc.setLocalDescription(a);await callChan.send({type:'broadcast',event:'answer',payload:{id:callState.id,answer:pc.localDescription.toJSON()}})});callChan.on('broadcast',{event:'answer'},async({payload})=>{if(callState.role==='caller'&&pc)await pc.setRemoteDescription(payload.answer)});callChan.on('broadcast',{event:'ice'},async({payload})=>{if(payload.from!==myNo&&pc)try{await pc.addIceCandidate(payload.candidate)}catch{}});callChan.on('broadcast',{event:'hangup'},()=>endCall());callChan.on('broadcast',{event:'caption'},({payload})=>{if(payload.from!==myNo)addSub(payload.translated||payload.original)});await callChan.subscribe()}
async function offer(){await makePeer();const o=await pc.createOffer();await pc.setLocalDescription(o);await callChan.send({type:'broadcast',event:'offer',payload:{id:callState.id,offer:pc.localDescription.toJSON()}});startCaptions()}
$('accept').onclick=async()=>{if(!incoming)return;const c=contacts.find(x=>x.phone===incoming.from);active=c||{name:incoming.senderName||fmt(incoming.from),phone:incoming.from,lang:incoming.fromLang||'en',photo:incoming.senderPhoto||''};callState={id:incoming.id,role:'callee',peer:incoming.from,mode:incoming.mode};$('incoming').classList.add('hidden');showCall(incoming.mode);await media();await joinCall();await sb.channel('test-phone-v3:'+key(incoming.from)).send({type:'broadcast',event:'accept',payload:{id:incoming.id}});incoming=null;startCaptions()};
$('decline').onclick=async()=>{if(!incoming)return;await sb.channel('test-phone-v3:'+key(incoming.from)).send({type:'broadcast',event:'decline',payload:{id:incoming.id}});$('incoming').classList.add('hidden');incoming=null};
$('hang').onclick=async()=>{if(callChan)await callChan.send({type:'broadcast',event:'hangup',payload:{id:callState?.id}});endCall()};
function endCall(){try{pc?.close()}catch{}pc=null;stream?.getTracks().forEach(t=>t.stop());stream=null;$('remote').srcObject=null;$('local').srcObject=null;if(callChan)sb.removeChannel(callChan);callChan=null;callState=null;$('call').classList.add('hidden');stopCaptions();status('Hazır · '+fmt(myNo))}
$('mic').onclick=()=>{const t=stream?.getAudioTracks()?.[0];if(t){t.enabled=!t.enabled;$('mic').style.opacity=t.enabled?'1':'.45'}};
$('cam').onclick=()=>{const t=stream?.getVideoTracks()?.[0];if(t){t.enabled=!t.enabled;$('cam').style.opacity=t.enabled?'1':'.45'}else status('Bu görüşme sesli başladı')};
function addSub(text){const d=document.createElement('div');d.className='subline';d.textContent=text;$('subs').appendChild(d);while($('subs').children.length>3)$('subs').firstElementChild.remove()}
function startCaptions(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR||captionRec)return;captionRec=new SR();captionRec.lang=myLang;captionRec.continuous=true;captionRec.interimResults=false;captionRec.onresult=async e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(!e.results[i].isFinal)continue;const original=e.results[i][0].transcript.trim();if(!original)continue;const translated=await translate(original,myLang,active?.lang||'en');addSub(original);callChan?.send({type:'broadcast',event:'caption',payload:{from:myNo,original,translated}})}};captionRec.onend=()=>{if(captionRec)try{captionRec.start()}catch{}};try{captionRec.start()}catch{captionRec=null}}
function stopCaptions(){const r=captionRec;captionRec=null;try{r?.stop()}catch{}}

fillCountries();fillLanguages();
if(myNo&&myProfile?.name){showHome()}else if(myNo&&!myProfile?.name){pending=myNo;showProfileStep()}else showPhoneStep();
