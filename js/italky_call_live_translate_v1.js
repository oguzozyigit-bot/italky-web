(()=>{
if(window.__italkyCallLiveTranslateV3)return;window.__italkyCallLiveTranslateV3=true;
const d=document,$=id=>d.getElementById(id);
let activated=false;
const style=d.createElement('style');
style.textContent=`
#call.itCallLive .stage{background:radial-gradient(circle at 50% 30%,#123b69 0,#081f3d 45%,#051326 100%)!important}
#call.itCallLive.audioMode .stage:before{display:none!important}
#call.itCallLive .peer{top:18px!important;left:18px!important;right:18px!important;background:transparent!important;padding:0!important;text-align:center!important;font-size:20px!important;font-weight:800!important;z-index:5}
#call.itCallLive .itCallStatus{position:absolute;top:52px;left:0;right:0;text-align:center;color:#9fc8ef;font-size:13px;z-index:5;pointer-events:none}
#call.itCallLive .itCallAvatar{position:absolute;top:105px;left:50%;transform:translateX(-50%);width:112px;height:112px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#173f6d,#0b2748);border:2px solid rgba(95,190,255,.38);box-shadow:0 16px 46px #0005;color:white;font-size:34px;font-weight:800;z-index:4;pointer-events:none}
#call.itCallLive .itLiveBadge{position:absolute;top:232px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:18px;background:#0d3157cc;border:1px solid #2c6c9c;color:#cfeaff;font-size:12px;font-weight:700;z-index:6;pointer-events:none}
#call.itCallLive .itLiveDot{width:8px;height:8px;border-radius:50%;background:#38bdf8;box-shadow:0 0 0 5px #38bdf826}
#call.itCallLive .subs{left:12px!important;right:12px!important;bottom:106px!important;z-index:9!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:7px!important;max-height:34vh!important;overflow:hidden!important;pointer-events:none!important}
#call.itCallLive .subline{margin:0!important;padding:9px 13px 10px!important;border-radius:15px!important;background:rgba(3,18,36,.9)!important;border:1px solid rgba(102,190,255,.22)!important;color:#f7fbff!important;font-size:16px!important;line-height:1.35!important;box-shadow:0 5px 18px #0003!important;backdrop-filter:blur(9px);max-width:90%!important}
#call.itCallLive .subline:before{content:'ÇEVİRİ';display:block;color:#67c5ff;font-size:9px;font-weight:900;letter-spacing:.8px;margin-bottom:3px}
#call.itCallLive .controls{bottom:24px!important;z-index:12!important;gap:12px!important;pointer-events:auto!important}
#call.itCallLive .ctl{width:54px!important;height:54px!important;background:#ffffff1f!important;border:1px solid #ffffff20!important;backdrop-filter:blur(8px);font-size:21px;pointer-events:auto!important}
#call.itCallLive .ctl.itActive{background:#197ac7!important}
#call.itCallLive .hang{background:#d93025!important}
@media(max-height:690px){#call.itCallLive .itCallAvatar{top:86px;width:92px;height:92px}.itCallLive .itLiveBadge{top:190px!important}.itCallLive .subs{max-height:30vh!important}}
`;
d.head.appendChild(style);
function initials(){const t=($('peer')?.textContent||$('chatName')?.textContent||'IT').trim();return t.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'IT'}
function callVisible(){const c=$('call');return !!c&&!c.classList.contains('hidden')}
function ensureUI(){
 if(!callVisible())return;
 const call=$('call'),stage=call.querySelector('.stage'),controls=call.querySelector('.controls');
 if(!stage||!controls)return;
 activated=true;call.classList.add('itCallLive');
 if(!stage.querySelector('.itCallStatus')){const s=d.createElement('div');s.className='itCallStatus';s.textContent='Canlı çeviri aktif';stage.appendChild(s)}
 else stage.querySelector('.itCallStatus').textContent='Canlı çeviri aktif';
 if(!stage.querySelector('.itCallAvatar')){const a=d.createElement('div');a.className='itCallAvatar';a.textContent=initials();stage.appendChild(a)}
 else stage.querySelector('.itCallAvatar').textContent=initials();
 if(!stage.querySelector('.itLiveBadge')){const b=d.createElement('div');b.className='itLiveBadge';b.innerHTML='<span class="itLiveDot"></span><span>Canlı Çeviri</span>';stage.appendChild(b)}
 if(!controls.querySelector('.itCaptionCtl')){const b=d.createElement('button');b.type='button';b.className='ctl itCaptionCtl itActive';b.textContent='CC';b.setAttribute('aria-label','Canlı çeviri');b.onclick=()=>{const subs=$('subs'),on=!b.classList.contains('itActive');b.classList.toggle('itActive',on);if(subs)subs.style.display=on?'flex':'none'};controls.insertBefore(b,controls.querySelector('.hang'))}
 const remote=$('remote');if(remote){remote.muted=false;remote.volume=1;remote.autoplay=true;remote.playsInline=true;remote.play?.().catch(()=>{})}
 bindSubs();
}
function bindSubs(){const box=$('subs');if(!box||box.dataset.liveCaptionBound)return;box.dataset.liveCaptionBound='1';new MutationObserver(()=>{box.scrollTop=box.scrollHeight}).observe(box,{childList:true,subtree:true})}
function resetIfClosed(){const call=$('call');if(!call||!call.classList.contains('hidden'))return;if(activated){call.classList.remove('itCallLive');activated=false}}
function init(){
 const call=$('call');if(!call)return;
 if(!call.dataset.liveTranslateWatch){call.dataset.liveTranslateWatch='1';new MutationObserver(()=>{if(callVisible())setTimeout(ensureUI,0);else resetIfClosed()}).observe(call,{attributes:true,attributeFilter:['class']})}
 ['audio','video','accept'].forEach(id=>{const el=$(id);if(el&&!el.dataset.liveTranslateStart){el.dataset.liveTranslateStart='1';el.addEventListener('click',()=>setTimeout(ensureUI,120),{passive:true})}});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
setTimeout(init,700);
})();