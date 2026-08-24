(()=>{
if(window.__italkyCallLiveTranslateV1)return;window.__italkyCallLiveTranslateV1=true;
const d=document,$=id=>d.getElementById(id);
const style=d.createElement('style');
style.textContent=`
#call.itCallLive .stage{background:radial-gradient(circle at 50% 30%,#123b69 0,#081f3d 45%,#051326 100%)!important}
#call.itCallLive.audioMode .stage:before{display:none!important}
#call.itCallLive .peer{top:18px!important;left:18px!important;right:18px!important;background:transparent!important;padding:0!important;text-align:center!important;font-size:20px!important;font-weight:800!important;z-index:5}
#call.itCallLive .itCallStatus{position:absolute;top:52px;left:0;right:0;text-align:center;color:#9fc8ef;font-size:13px;z-index:5}
#call.itCallLive .itCallAvatar{position:absolute;top:105px;left:50%;transform:translateX(-50%);width:112px;height:112px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#173f6d,#0b2748);border:2px solid rgba(95,190,255,.38);box-shadow:0 16px 46px #0005;color:white;font-size:34px;font-weight:800;z-index:4}
#call.itCallLive .itLiveBadge{position:absolute;top:232px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:18px;background:#0d3157cc;border:1px solid #2c6c9c;color:#cfeaff;font-size:12px;font-weight:700;z-index:6}
#call.itCallLive .itLiveDot{width:8px;height:8px;border-radius:50%;background:#38bdf8;box-shadow:0 0 0 5px #38bdf826}
#call.itCallLive .subs{left:12px!important;right:12px!important;bottom:106px!important;z-index:9!important;display:flex!important;flex-direction:column!important;gap:7px!important;max-height:34vh!important;overflow:hidden!important;pointer-events:none}
#call.itCallLive .subline{margin:0!important;padding:10px 13px!important;border-radius:14px!important;background:rgba(3,18,36,.86)!important;border:1px solid rgba(102,190,255,.2)!important;color:#f7fbff!important;font-size:16px!important;line-height:1.35!important;box-shadow:0 5px 18px #0003!important;backdrop-filter:blur(9px)}
#call.itCallLive .subline.itMineCaption{align-self:flex-end!important;background:rgba(20,104,170,.87)!important;max-width:88%}
#call.itCallLive .subline.itPeerCaption{align-self:flex-start!important;max-width:88%}
#call.itCallLive .controls{bottom:24px!important;z-index:12!important;gap:12px!important}
#call.itCallLive .ctl{width:54px!important;height:54px!important;background:#ffffff1f!important;border:1px solid #ffffff20!important;backdrop-filter:blur(8px);font-size:21px}
#call.itCallLive .ctl.itActive{background:#197ac7!important}
#call.itCallLive .hang{background:#d93025!important}
#call.itCallLive .itSpeakerCtl{display:grid;place-items:center}
#call.itCallLive .itCaptionCtl{display:grid;place-items:center}
#call.itCallLive .self{z-index:8!important}
@media(max-height:690px){#call.itCallLive .itCallAvatar{top:86px;width:92px;height:92px}.itCallLive .itLiveBadge{top:190px!important}.itCallLive .subs{max-height:30vh!important}}
`;
d.head.appendChild(style);
function initials(){const t=($('peer')?.textContent||$('chatName')?.textContent||'IT').trim();return t.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'IT'}
function ensureUI(){
 const call=$('call'),stage=call?.querySelector('.stage'),controls=call?.querySelector('.controls');
 if(!call||!stage||!controls)return;
 call.classList.add('itCallLive');
 if(!stage.querySelector('.itCallStatus')){const s=d.createElement('div');s.className='itCallStatus';s.textContent='Bağlanıyor…';stage.appendChild(s)}
 if(!stage.querySelector('.itCallAvatar')){const a=d.createElement('div');a.className='itCallAvatar';a.textContent=initials();stage.appendChild(a)}
 if(!stage.querySelector('.itLiveBadge')){const b=d.createElement('div');b.className='itLiveBadge';b.innerHTML='<span class="itLiveDot"></span><span>Canlı Çeviri</span>';stage.appendChild(b)}
 if(!controls.querySelector('.itSpeakerCtl')){const b=d.createElement('button');b.type='button';b.className='ctl itSpeakerCtl itActive';b.setAttribute('aria-label','Ses çıkışı');b.title='Ses çıkışı';b.innerHTML='🔊';controls.insertBefore(b,controls.firstChild);b.onclick=()=>toggleSpeaker(b)}
 if(!controls.querySelector('.itCaptionCtl')){const b=d.createElement('button');b.type='button';b.className='ctl itCaptionCtl itActive';b.setAttribute('aria-label','Canlı çeviri');b.title='Canlı çeviri';b.textContent='CC';controls.insertBefore(b,controls.querySelector('.hang'));b.onclick=()=>toggleCaptions(b)}
 const remote=$('remote');if(remote){remote.muted=false;remote.volume=1;remote.setAttribute('playsinline','');remote.autoplay=true}
}
async function toggleSpeaker(btn){const remote=$('remote');if(!remote)return;const on=!btn.classList.contains('itActive');btn.classList.toggle('itActive',on);remote.muted=!on;btn.textContent=on?'🔊':'🔇';if(on){remote.volume=1;try{await remote.play()}catch{}}
}
function toggleCaptions(btn){const subs=$('subs');if(!subs)return;const on=!btn.classList.contains('itActive');btn.classList.toggle('itActive',on);subs.style.display=on?'flex':'none';btn.style.opacity=on?'1':'.55'}
function updateState(){const call=$('call');if(!call)return;ensureUI();const hidden=call.classList.contains('hidden');if(!hidden){const s=call.querySelector('.itCallStatus');if(s)s.textContent='Hoparlör açık · canlı çeviri hazır';const a=call.querySelector('.itCallAvatar');if(a)a.textContent=initials();const remote=$('remote');if(remote&&!remote.muted){remote.volume=1;remote.play?.().catch(()=>{})}}}
function decorateSubs(){const box=$('subs');if(!box)return;[...box.children].forEach((el,i)=>{if(el.classList.contains('subline')&&!el.dataset.itRole){el.dataset.itRole='1';el.classList.add(i%2?'itMineCaption':'itPeerCaption')}})}
function bindSubs(){const box=$('subs');if(!box||box.dataset.itCallObserve)return;box.dataset.itCallObserve='1';new MutationObserver(()=>{decorateSubs();box.scrollTop=box.scrollHeight}).observe(box,{childList:true,subtree:true});decorateSubs()}
function init(){ensureUI();bindSubs();const call=$('call');if(call&&!call.dataset.itCallWatch){call.dataset.itCallWatch='1';new MutationObserver(updateState).observe(call,{attributes:true,attributeFilter:['class']})}updateState()}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
setTimeout(init,500);setTimeout(init,1300);
})();