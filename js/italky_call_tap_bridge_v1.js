(()=>{
if(window.__italkyCallTapBridgeV1)return;window.__italkyCallTapBridgeV1=true;
const d=document;
function inRect(x,y,r,pad=10){return x>=r.left-pad&&x<=r.right+pad&&y>=r.top-pad&&y<=r.bottom+pad}
function fire(btn){if(!btn)return;try{if(typeof btn.onclick==='function'){btn.onclick(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return}btn.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))}catch{try{btn.click()}catch{}}}
function handler(e){
  const chat=d.getElementById('chat');if(!chat||chat.classList.contains('hidden'))return;
  const p=e.changedTouches?.[0]||e.touches?.[0]||e;
  const x=p.clientX,y=p.clientY;
  const audio=d.getElementById('audio'),video=d.getElementById('video');
  if(audio&&inRect(x,y,audio.getBoundingClientRect(),12)){e.preventDefault?.();e.stopImmediatePropagation?.();fire(audio);return}
  if(video&&inRect(x,y,video.getBoundingClientRect(),12)){e.preventDefault?.();e.stopImmediatePropagation?.();fire(video)}
}
window.addEventListener('pointerup',handler,true);
window.addEventListener('touchend',handler,true);
})();