import { supabase } from "/js/supabase_client.js";

const $ = (id)=>document.getElementById(id);

const BUCKET = "offline";

const LANGS = [
  {code:"tr", name:"Türkçe"},
  {code:"en", name:"English"},
  {code:"de", name:"Deutsch"},
  {code:"fr", name:"Français"},
  {code:"it", name:"Italiano"},
  {code:"es", name:"Español"}
];

function norm(v){
  return String(v||"").toLowerCase();
}

function pairPath(pair){
  return `langpacks/${pair}/model.zip`;
}

function publicUrl(path){
  const {data} = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl;
}

function install(pair){
  const url = publicUrl(pairPath(pair));
  window.Offline.installFromUrl(pair, url);
}

function populate(){
  $("langSelect").innerHTML = LANGS.map(l=>{
    return `<option value="${l.code}">${l.name}</option>`;
  }).join("");
}

populate();

$("btnStart").onclick = async ()=>{

  const userLang = norm($("langSelect").value);

  localStorage.setItem("italky_user_lang_v1", userLang);

  $("step1").style.display="none";
  $("step2").style.display="block";

  $("status").innerText = "İngilizce altyapı indiriliyor...";

  // 🔥 ZORUNLU PAKETLER
  const pairs = [
    `${userLang}-en`,
    `en-${userLang}`
  ];

  for(let i=0;i<pairs.length;i++){
    install(pairs[i]);
    await wait(1500);
  }

  $("status").innerText = "Kurulum tamamlandı";

  await wait(1000);

  $("step2").style.display="none";
  $("step3").style.display="block";
};

function wait(ms){
  return new Promise(r=>setTimeout(r,ms));
}

window.goNext = ()=>{
  localStorage.setItem("offline_boot_done","1");
  location.href = "/pages/offline_languages.html";
};
