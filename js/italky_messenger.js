import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BASE_DOMAIN } from '/js/config.js';

const SB_URL='https://wtzsnywujksshcwvemgz.supabase.co';
const SB_KEY='sb_publishable_85JlITD5FKjDvdf4JHU0Dg_eByJrKVo';
const sb=createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'italky-call-phone-auth'}});
const $=id=>document.getElementById(id);
const digits=s=>String(s||'').replace(/\D/g,'');
const normPhone=s=>{const d=digits(s);return d?`+${d}`:''};
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LANG={tr:'Türkçe',en:'English',de:'Deutsch',fr:'Français',es:'Español'};
let me=null,myNo='',contacts=[],active=null,msgChannel=null,voiceRec=null,voiceText='',voiceOn=false;

function initials(name='IT'){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'IT'}
function setTab(tab){
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  ['chats','contacts','calls'].forEach(x=>$(x+'Panel')?.classList.toggle('hidden',x!==tab));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)setTab(b.dataset.tab)});

async function translateText(text,src,dst){
  if(!text||src===dst)return text;
  const base=String(BASE_DOMAIN||'').replace(/\/+$/,'');
  if(!base)return text;
  try{
    const r=await fetch(base+'/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,source:src,target:dst,from_lang:src,to_lang:dst})});
    const j=await r.json();
    return String(j.text||j.translated||j.translation||j.translatedText||text).trim()||text;
  }catch{return text}
}

async function identity(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session)return false;
  me=session.user;
  const {data}=await sb.from('italky_call_numbers').select('call_number').eq('auth_user_id',me.id).maybeSingle();
  if(!data?.call_number)return false;
  myNo=normPhone(data.call_number);
  return true;
}

async function loadContacts(){
  if(!me)return;
  const {data,error}=await sb.from('italky_contacts').select('*').eq('owner_id',me.id).order('created_at');
  if(error)return;
  contacts=data||[];renderContacts();renderChats();
}
function renderContacts(){
  const root=$('contactList');if(!root)return;
  root.innerHTML=contacts.length?contacts.map(c=>`<div class="row" data-contact="${c.id}"><div class="avatar">${esc(initials(c.display_name||c.contact_phone))}</div><div><div class="rowTitle">${esc(c.display_name||c.contact_phone)}</div><div class="rowSub">${esc(c.contact_phone)} · ${esc(LANG[c.preferred_lang]||c.preferred_lang)}</div></div><div class="rowMeta">›</div></div>`).join(''):'<div class="row"><div class="avatar">＋</div><div><div class="rowTitle">Kişi ekle</div><div class="rowSub">Telefon numarasıyla arkadaşını ekle</div></div></div>';
}
function renderChats(){
  const root=$('chatList');if(!root)return;
  root.innerHTML=contacts.length?contacts.map(c=>`<div class="row" data-contact="${c.id}"><div class="avatar">${esc(initials(c.display_name||c.contact_phone))}</div><div><div class="rowTitle">${esc(c.display_name||c.contact_phone)}</div><div class="rowSub">Mesajlar otomatik ${esc(LANG[c.preferred_lang]||c.preferred_lang)} diline çevrilir</div></div><div class="rowMeta">${esc(LANG[c.preferred_lang]||'')}</div></div>`).join(''):'<div class="row"><div class="avatar">💬</div><div><div class="rowTitle">Henüz sohbet yok</div><div class="rowSub">Sağ alttaki + ile kişi ekle</div></div></div>';
}
document.addEventListener('click',e=>{const r=e.target.closest('[data-contact]');if(r){const c=contacts.find(x=>x.id===r.dataset.contact);if(c)openChat(c)}});

$('addContactBtn')?.addEventListener('click',()=>{$('addContact').classList.remove('hidden')});
$('closeAdd')?.addEventListener('click',()=>{$('addContact').classList.add('hidden')});
$('saveContact')?.addEventListener('click',async()=>{
  const name=$('contactNameInput').value.trim();
  const phone=normPhone($('contactCountry').value+digits($('contactPhoneInput').value));
  const lang=$('contactLangSelect').value;
  if(!/^\+[1-9]\d{7,14}$/.test(phone)){alert('Geçerli telefon numarası gir.');return}
  const {data:target}=await sb.from('italky_call_numbers').select('auth_user_id,call_number').eq('call_number',phone).maybeSingle();
  if(!target?.auth_user_id){alert('Bu numara henüz italkyAI kullanmıyor.');return}
  if(target.auth_user_id===me.id){alert('Kendini kişi olarak ekleyemezsin.');return}
  const {error}=await sb.from('italky_contacts').upsert({owner_id:me.id,contact_user_id:target.auth_user_id,contact_phone:phone,display_name:name||phone,preferred_lang:lang},{onConflict:'owner_id,contact_user_id'});
  if(error){alert(error.message);return}
  $('addContact').classList.add('hidden');$('contactNameInput').value='';$('contactPhoneInput').value='';await loadContacts();setTab('contacts');
});

async function openChat(c){
  active=c;$('chatName').textContent=c.display_name||c.contact_phone;$('chatAvatar').textContent=initials(c.display_name||c.contact_phone);$('chatLang').textContent=`Çeviri: ${LANG[c.preferred_lang]||c.preferred_lang}`;$('chatView').classList.remove('hidden');
  await loadMessages();subscribeMessages();
}
$('backChat')?.addEventListener('click',()=>{$('chatView').classList.add('hidden');active=null;if(msgChannel){sb.removeChannel(msgChannel);msgChannel=null}});

async function loadMessages(){
  if(!active)return;
  const {data}=await sb.from('italky_messages').select('*').or(`and(sender_id.eq.${me.id},recipient_id.eq.${active.contact_user_id}),and(sender_id.eq.${active.contact_user_id},recipient_id.eq.${me.id})`).order('created_at',{ascending:true}).limit(200);
  renderMessages(data||[]);
}
function renderMessages(items){
  const root=$('messages');if(!root)return;
  root.innerHTML=items.map(m=>{
    const mine=m.sender_id===me.id;
    // sender sees original first; recipient sees translated first
    const primary=mine?m.original_text:m.translated_text;
    const secondary=mine?m.translated_text:m.original_text;
    return `<div class="bubble ${mine?'mine':'theirs'}" data-msg="${m.id}"><div class="msgText">${m.kind==='voice_text'?'🎙️ ':''}${esc(primary)}</div><div class="msgOriginal">${esc(secondary)}</div><div class="msgFoot"><button class="origBtn">${mine?'Çeviriyi göster':'Orijinali göster'}</button><span>${new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div></div>`
  }).join('');root.scrollTop=root.scrollHeight;
}
document.addEventListener('click',e=>{const b=e.target.closest('.origBtn');if(b)b.closest('.bubble')?.classList.toggle('showOriginal')});

async function send(kind='text',forced=''){
  if(!active||!me)return;
  const input=$('messageInput');const text=(forced||input.value).trim();if(!text)return;
  if(!forced)input.value='';
  const src=localStorage.getItem('italky_call_src')||'tr',dst=active.preferred_lang||'en';
  const translated=await translateText(text,src,dst);
  const {error}=await sb.from('italky_messages').insert({sender_id:me.id,recipient_id:active.contact_user_id,sender_phone:myNo,recipient_phone:active.contact_phone,kind,original_text:text,translated_text:translated,source_lang:src,target_lang:dst});
  if(error)alert(error.message);else await loadMessages();
}
$('sendMessage')?.addEventListener('click',()=>send('text'));
$('messageInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();send('text')}});

function subscribeMessages(){
  if(msgChannel){sb.removeChannel(msgChannel);msgChannel=null}if(!active)return;
  msgChannel=sb.channel('msg:'+me.id+':'+active.contact_user_id).on('postgres_changes',{event:'INSERT',schema:'public',table:'italky_messages'},p=>{const m=p.new;if((m.sender_id===me.id&&m.recipient_id===active.contact_user_id)||(m.sender_id===active.contact_user_id&&m.recipient_id===me.id))loadMessages()}).subscribe();
}

$('voiceMessage')?.addEventListener('click',()=>voiceOn?stopVoice():startVoice());
function startVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('Bu cihaz sesli mesajı yazıya çevirmeyi desteklemiyor.');return}
  voiceText='';voiceRec=new SR();voiceRec.lang=(localStorage.getItem('italky_call_src')||'tr')==='tr'?'tr-TR':'en-US';voiceRec.continuous=true;voiceRec.interimResults=true;voiceRec.onresult=e=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript+' ';voiceText=t.trim();$('messageInput').placeholder=voiceText||'Dinliyorum…'};voiceRec.onend=()=>{if(voiceOn)stopVoice()};voiceOn=true;$('voiceMessage').classList.add('recording');$('messageInput').placeholder='Dinliyorum…';try{voiceRec.start()}catch{voiceOn=false}
}
function stopVoice(){
  voiceOn=false;$('voiceMessage').classList.remove('recording');try{voiceRec?.stop()}catch{}voiceRec=null;$('messageInput').placeholder='Mesaj';const text=voiceText.trim();voiceText='';if(text)send('voice_text',text)
}

function startCallFromChat(mode){
  if(!active)return;
  const phone=normPhone(active.contact_phone);const d=digits(phone);
  // choose longest matching known country code in the hidden selector
  const sel=$('dialCountrySelect');let best=null;[...sel.options].forEach(o=>{const cd=digits(o.value);if(d.startsWith(cd)&&(!best||cd.length>best.cd.length))best={o,cd}});
  if(!best){sel.innerHTML=`<option value="+${d.slice(0,2)}">+${d.slice(0,2)}</option>`;best={o:sel.options[0],cd:d.slice(0,2)}}
  sel.value=best.o.value;const local=d.slice(best.cd.length);const pad=$('keypad');pad.innerHTML='';
  for(const k of local){const b=document.createElement('button');b.dataset.k=k;pad.appendChild(b);b.click()}
  $(mode==='video'?'videoCall':'audioCall').click();
}
$('chatAudioCall')?.addEventListener('click',()=>startCallFromChat('audio'));
$('chatVideoCall')?.addEventListener('click',()=>startCallFromChat('video'));

async function boot(){if(!(await identity()))return;await loadContacts();}
setInterval(()=>{if(!me)boot()},1800);boot();
