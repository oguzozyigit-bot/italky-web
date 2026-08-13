function applyMinimalLoginUI(){
  if(String(location.pathname||'')!=='/pages/login.html')return;

  const style=document.createElement('style');
  style.id='italkyMinimalLoginStyle';
  style.textContent=`
    body{min-height:100dvh!important;display:grid!important;place-items:center!important;padding:24px!important;background:radial-gradient(circle at 50% 38%,#0b2633 0,#071724 38%,#06111d 74%)!important}
    .card{width:min(92vw,390px)!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;text-align:center!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:34px!important}
    .card::before{content:'';display:block;width:150px;height:86px;background:repeating-linear-gradient(90deg,transparent 0 9px,#53e7e1 9px 16px,transparent 16px 23px);mask:linear-gradient(#000 0 0);-webkit-mask:linear-gradient(#000 0 0);border-radius:18px;filter:drop-shadow(0 0 14px rgba(83,231,225,.22));opacity:.95}
    .brand{font-size:43px!important;font-weight:900!important;letter-spacing:-.055em!important;line-height:.9!important;margin-top:-20px!important}.brand b{color:#53e7e1!important}
    .sub,.note{display:none!important}
    .login-btn{width:100%!important;min-height:62px!important;border:0!important;border-radius:34px!important;background:#fff!important;color:#111827!important;font-size:15px!important;font-weight:900!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:11px!important;padding:0 18px!important;box-shadow:0 12px 32px rgba(0,0,0,.20)!important}
    .status{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
  `;
  if(!document.getElementById(style.id))document.head.appendChild(style);

  const btn=document.getElementById('googleBtn');
  if(btn){
    const label=btn.querySelector('span:last-child');
    if(label)label.textContent='Google Hesabınızla Ücretsiz Giriş Yapın';
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyMinimalLoginUI,{once:true});
else applyMinimalLoginUI();
