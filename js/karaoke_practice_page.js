import { mountShell } from "/js/ui_shell.js";

mountShell({ scroll: "auto" });

const DB = {
  en: [
    {
      id: "en-1",
      title: "Perfect",
      artist: "Ed Sheeran",
      level: "A2-B1",
      mode: "romantic",
      lyrics: [
        { t: 0, text: "I found a love for me" },
        { t: 4, text: "Darling just dive right in" },
        { t: 8, text: "And follow my lead" },
        { t: 12, text: "Well I found a girl beautiful and sweet" },
        { t: 18, text: "I never knew you were the someone waiting for me" },
        { t: 24, text: "Cause we were just kids when we fell in love" }
      ]
    },

    {
      id: "en-2",
      title: "Believer",
      artist: "Imagine Dragons",
      level: "B1",
      mode: "energetic",
      lyrics: [
        { t: 0, text: "First things first" },
        { t: 3, text: "I am gonna say all the words inside my head" },
        { t: 8, text: "I am fired up and tired of the way that things have been" },
        { t: 14, text: "Pain you made me a believer" }
      ]
    }
  ],

  de: [
    {
      id: "de-1",
      title: "99 Luftballons",
      artist: "Nena",
      level: "A2-B1",
      mode: "classic",
      lyrics: [
        { t: 0, text: "Hast du etwas Zeit für mich" },
        { t: 4, text: "Dann singe ich ein Lied für dich" },
        { t: 8, text: "Von neunundneunzig Luftballons" }
      ]
    }
  ],

  fr: [
    {
      id: "fr-1",
      title: "Dernière danse",
      artist: "Indila",
      level: "A2-B1",
      mode: "dramatic",
      lyrics: [
        { t: 0, text: "Oh ma douce souffrance" },
        { t: 4, text: "Pourquoi sacharner tu recommences" }
      ]
    }
  ],

  it: [
    {
      id: "it-1",
      title: "Volare",
      artist: "Domenico Modugno",
      level: "A1-A2",
      mode: "classic",
      lyrics: [
        { t: 0, text: "Penso che un sogno così non ritorni mai più" },
        { t: 6, text: "Mi dipingevo le mani e la faccia di blu" }
      ]
    }
  ],

  es: [
    {
      id: "es-1",
      title: "La Bamba",
      artist: "Traditional",
      level: "A1",
      mode: "festive",
      lyrics: [
        { t: 0, text: "Para bailar la bamba" },
        { t: 3, text: "Para bailar la bamba se necesita una poca de gracia" }
      ]
    }
  ]
};

const LANGS = [
  { key: "en", label: "🇬🇧 English" },
  { key: "de", label: "🇩🇪 German" },
  { key: "fr", label: "🇫🇷 French" },
  { key: "it", label: "🇮🇹 Italian" },
  { key: "es", label: "🇪🇸 Spanish" }
];

const state = {
  lang: "en",
  song: null,
  currentIndex: 0,
  timer: null,
  elapsed: 0,
  startedAt: 0
};

const $ = (id) => document.getElementById(id);

const langTabs = $("langTabs");
const songList = $("songList");

const songTitle = $("songTitle");
const songMeta = $("songMeta");

const currentLine = $("currentLine");
const nextLine = $("nextLine");

const progressBar = $("progressBar");
const timeNow = $("timeNow");

const playBtn = $("playBtn");
const pauseBtn = $("pauseBtn");
const resetBtn = $("resetBtn");

const karaokePanel = document.querySelector(".player");

function init() {

  renderLangTabs();
  renderSongList();

  playBtn.onclick = start;
  pauseBtn.onclick = pause;
  resetBtn.onclick = reset;

}

function renderLangTabs(){

  langTabs.innerHTML="";

  LANGS.forEach(l=>{

    const btn=document.createElement("button");

    btn.className="chip"+(state.lang===l.key?" active":"");

    btn.textContent=l.label;

    btn.onclick=()=>{

      state.lang=l.key;

      renderLangTabs();

      renderSongList();

    };

    langTabs.appendChild(btn);

  });

}

function renderSongList(){

  songList.innerHTML="";

  const songs=DB[state.lang];

  songs.forEach(song=>{

    const div=document.createElement("div");

    div.className="song";

    div.innerHTML=`
      <div class="song-title">${song.title}</div>
      <div class="song-meta">${song.artist}</div>
    `;

    div.onclick=()=>selectSong(song,div);

    songList.appendChild(div);

  });

}

function selectSong(song,el){

  document.querySelectorAll(".song").forEach(s=>s.classList.remove("active"));

  el.classList.add("active");

  state.song=song;

  state.currentIndex=0;

  songTitle.textContent=song.title;

  songMeta.textContent=song.artist;

  currentLine.textContent=song.lyrics[0].text;

  nextLine.textContent=song.lyrics[1]?.text||"";

  scrollToKaraoke();

}

function scrollToKaraoke(){

  karaokePanel.scrollIntoView({
    behavior:"smooth",
    block:"center"
  });

}

function start(){

  if(!state.song) return;

  if(state.timer) return;

  state.startedAt=Date.now();

  state.timer=setInterval(tick,100);

}

function pause(){

  clearInterval(state.timer);

  state.timer=null;

}

function reset(){

  pause();

  state.currentIndex=0;

  state.elapsed=0;

  if(state.song){

    currentLine.textContent=state.song.lyrics[0].text;

    nextLine.textContent=state.song.lyrics[1]?.text||"";

  }

}

function tick(){

  state.elapsed=(Date.now()-state.startedAt)/1000;

  updateLyrics();

}

function updateLyrics(){

  const lyrics=state.song.lyrics;

  let idx=0;

  for(let i=0;i<lyrics.length;i++){

    if(state.elapsed>=lyrics[i].t) idx=i;

  }

  if(idx!==state.currentIndex){

    state.currentIndex=idx;

    currentLine.textContent=lyrics[idx].text;

    nextLine.textContent=lyrics[idx+1]?.text||"";

  }

  timeNow.textContent=format(state.elapsed);

}

function format(sec){

  sec=Math.floor(sec);

  const m=Math.floor(sec/60).toString().padStart(2,"0");

  const s=(sec%60).toString().padStart(2,"0");

  return `${m}:${s}`;

}

init();
