(()=>{
if(window.__italkyCallClickFallbackV1)return;window.__italkyCallClickFallbackV1=true;
const d=document,$=id=>d.getElementById(id);
function openCall(mode){
 const chat=$('chat'),call=$('call');
 if(!chat||chat.classList.contains('hidden')||!call)return;
 const peer=$('peer'),name=$('chatName')?.textContent?.trim()||'Arama';
 if(peer)peer.textContent=name;
 call.classList.remove('hidden');
 call.classList.toggle('audioMode',mode==='audio');
 const stage=call.querySelector('.stage');
 if(stage&&!stage.querySelector('.itCallPendingLanguage')){
   const s=d.createElement('div');s.className='itCallPendingLanguage';
   s.style.cssText='position:absolute;top:54px;left:12px;right:12px;text-align:center;color:#b9d8f5;font:13px system-ui;z-index:15;pointer-events:none';
   stage.appendChild(s);
 }
 const info=stage?.querySelector('.itCallPendingLanguage');
 const lang=($('chatLang')?.textContent||'').trim();
 if(info)info.textContent=/alınıyor/i.test(lang)?'Dil bilgisi bekleniyor · arama hazırlanıyor':'Arama hazırlanıyor';
 setTimeout(()=>window.dispatchEvent(new CustomEvent('italky-call-ui-open',{detail:{mode}})),0);
}
function bind(){
 const audio=$('audio'),video=$('video');
 if(audio&&!audio.dataset.callFallback){audio.dataset.callFallback='1';audio.addEventListener('click',()=>openCall('audio'),true);audio.addEventListener('pointerup',()=>openCall('audio'),true)}
 if(video&&!video.dataset.callFallback){video.dataset.callFallback='1';video.addEventListener('click',()=>openCall('video'),true);video.addEventListener('pointerup',()=>openCall('video'),true)}
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
new MutationObserver(bind).observe(d.documentElement,{childList:true,subtree:true});
setTimeout(bind,500);setTimeout(bind,1200);
})();