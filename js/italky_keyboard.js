/* italky ortak klavye modülü
   Düzeltmeler:
   - Klavyeye dokununca sayfanın aşağı kayması engellendi
   - Daktilo tipi tuş sesi
   - Uzun basınca alternatif harfler düzeltildi
   - Space tuşu üstünde italkyAI yazıyor
*/

const DEFAULT_ALT_CHARS = {
  a: ["â", "á", "à"],
  A: ["Â", "Á", "À"],

  c: ["ç"],
  C: ["Ç"],

  g: ["ğ"],
  G: ["Ğ"],

  i: ["ı", "î", "í", "i"],
  I: ["İ", "Î", "Í", "I"],
  ı: ["i", "î", "í", "ı"],
  İ: ["I", "Î", "Í", "İ"],

  o: ["ö", "ô", "ó"],
  O: ["Ö", "Ô", "Ó"],

  s: ["ş"],
  S: ["Ş"],

  u: ["ü", "û", "ú"],
  U: ["Ü", "Û", "Ú"],

  e: ["é", "è", "ê"],
  E: ["É", "È", "Ê"],

  n: ["ñ"],
  N: ["Ñ"]
};

const NUM_ROW = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const KEYBOARD_LAYOUTS = {
  tr: {
    r1: ["q", "w", "e", "r", "t", "y", "u", "ı", "o", "p"],
    r2: ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    r3: ["z", "x", "c", "v", "b", "n", "m"]
  },
  latin: {
    r1: ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    r2: ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    r3: ["z", "x", "c", "v", "b", "n", "m"]
  }
};

const STYLE_ID = "italky-keyboard-style-v3";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .itk-kb-wrap{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      z-index:99999;
      padding:10px 8px calc(12px + env(safe-area-inset-bottom,0px));
      background:#000;
      box-shadow:0 -18px 40px rgba(0,0,0,.45);
      transform:translateY(110%);
      transition:transform .18s ease;
      user-select:none;
      -webkit-user-select:none;
      touch-action:none;
    }

    .itk-kb-wrap.show{
      transform:translateY(0);
    }

    .itk-kb{
      display:flex;
      flex-direction:column;
      gap:10px;
      max-width:980px;
      width:100%;
      margin:0 auto;
    }

    .itk-kb-row{
      display:flex;
      gap:8px;
      justify-content:center;
      width:100%;
      min-width:0;
    }

    .itk-kb-key{
      height:54px;
      min-width:0;
      border:none;
      border-radius:16px;
      background:#2b2d33;
      color:#fff;
      font-family:inherit;
      font-size:22px;
      line-height:1;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:0 8px;
      box-shadow:inset 0 -1px 0 rgba(255,255,255,.04);
      position:relative;
      overflow:visible;
      flex:1 1 0;
      max-width:100%;
    }

    .itk-kb-key.dark{
      background:#13141a;
    }

    .itk-kb-key.wide{
      flex:1.35 1 0;
      font-size:19px;
      font-weight:700;
    }

    .itk-kb-key.xwide{
      flex:3.2 1 0;
      font-size:18px;
      font-weight:700;
      letter-spacing:.2px;
    }

    .itk-kb-key.smalltxt{
      font-size:15px;
      font-weight:800;
    }

    .itk-kb-key.pressing{
      transform:scale(.985);
      filter:brightness(1.08);
    }

    .itk-kb-key svg{
      width:24px;
      height:24px;
      stroke:#fff;
      fill:none;
      stroke-width:2.4;
      stroke-linecap:round;
      stroke-linejoin:round;
    }

    .itk-kb-alt{
      position:absolute;
      bottom:62px;
      left:50%;
      transform:translateX(-50%);
      display:flex;
      gap:6px;
      padding:8px;
      border-radius:14px;
      background:#101117;
      border:1px solid rgba(255,255,255,.10);
      box-shadow:0 18px 36px rgba(0,0,0,.45);
      z-index:100001;
      min-width:max-content;
      white-space:nowrap;
    }

    .itk-kb-alt-btn{
      min-width:44px;
      height:44px;
      border:none;
      border-radius:12px;
      background:#2b2d33;
      color:#fff;
      font-size:22px;
      font-family:inherit;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:0 10px;
    }

    .itk-kb-gap{
      flex:.35 1 0;
      min-width:0;
    }

    @media (max-width:480px){
      .itk-kb-wrap{ padding:8px 6px calc(10px + env(safe-area-inset-bottom,0px)); }
      .itk-kb{ gap:8px; }
      .itk-kb-row{ gap:6px; }
      .itk-kb-key{
        height:50px;
        border-radius:14px;
        min-width:0;
        font-size:19px;
        padding:0 6px;
      }
      .itk-kb-key.wide{ font-size:16px; }
      .itk-kb-key.xwide{ font-size:15px; }
      .itk-kb-key.smalltxt{ font-size:13px; }
      .itk-kb-key svg{ width:22px; height:22px; }
      .itk-kb-alt{
        bottom:58px;
        gap:4px;
        padding:6px;
      }
      .itk-kb-alt-btn{
        min-width:40px;
        height:40px;
        font-size:20px;
      }
    }
  `;
  document.head.appendChild(style);
}

function svgShift() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M12 4l6 7h-4v8H10v-8H6l6-7z"></path>
    </svg>
  `;
}

function svgBackspace() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M21 6H9l-6 6 6 6h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"></path>
      <path d="M10 9l5 6"></path>
      <path d="M15 9l-5 6"></path>
    </svg>
  `;
}

function svgEnter() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M4 12h10"></path>
      <path d="M11 7l5 5-5 5"></path>
      <path d="M20 4v8a4 4 0 0 1-4 4H4"></path>
    </svg>
  `;
}

function vibrate(ms = 8) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {}
}

class KeyboardAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  ensure() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      if (!this.ctx) {
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.05;
        this.master.connect(this.ctx.destination);
      }
      return true;
    } catch {
      return false;
    }
  }

  async unlock() {
    if (!this.ensure()) return;
    try {
      if (this.ctx.state === "suspended") await this.ctx.resume();
    } catch {}
  }

  play(kind = "key") {
    if (!this.ensure() || !this.master) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.value =
      kind === "space" ? 2400 :
      kind === "backspace" ? 1800 :
      kind === "enter" ? 2100 :
      kind === "shift" ? 2000 :
      2300;
    filter.Q.value = 1.1;

    osc.type = "square";
    osc.frequency.setValueAtTime(
      kind === "space" ? 1200 :
      kind === "backspace" ? 980 :
      kind === "enter" ? 1080 :
      kind === "shift" ? 1020 :
      1150,
      now
    );
    osc.frequency.exponentialRampToValueAtTime(
      kind === "space" ? 880 : 760,
      now + 0.018
    );

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    try {
      osc.start(now);
      osc.stop(now + 0.024);
    } catch {}
  }
}

class ItalkyKeyboard {
  constructor(options = {}) {
    injectStyles();

    this.options = {
      layout: "tr",
      target: null,
      onEnter: null,
      onChange: null,
      onShow: null,
      onHide: null,
      enableSound: true,
      enableVibration: true,
      showNumberRow: true,
      altChars: DEFAULT_ALT_CHARS,
      bottomOffset: 0,
      keepShiftOnce: false,
      ...options
    };

    this.audio = new KeyboardAudio();
    this.visible = false;
    this.shift = false;
    this.altMenuEl = null;
    this.holdTimer = null;
    this.scrollTicking = false;

    this.root = document.createElement("div");
    this.root.className = "itk-kb-wrap";
    this.root.style.bottom = `${Number(this.options.bottomOffset || 0)}px`;

    this.keyboard = document.createElement("div");
    this.keyboard.className = "itk-kb";
    this.root.appendChild(this.keyboard);

    document.body.appendChild(this.root);

    this.onDocPointer = this.onDocPointer.bind(this);
    this.onVisualViewport = this.onVisualViewport.bind(this);

    document.addEventListener("pointerdown", this.onDocPointer, true);
    window.visualViewport?.addEventListener?.("resize", this.onVisualViewport);
    window.visualViewport?.addEventListener?.("scroll", this.onVisualViewport);

    this.render();
  }

  destroy() {
    document.removeEventListener("pointerdown", this.onDocPointer, true);
    window.visualViewport?.removeEventListener?.("resize", this.onVisualViewport);
    window.visualViewport?.removeEventListener?.("scroll", this.onVisualViewport);
    this.hideAltMenu();
    this.root?.remove();
    this.restoreViewportSpace();
  }

  onDocPointer(e) {
    const t = e.target;
    const insideKb = this.root.contains(t);
    const target = this.options.target;
    const insideInput = target && (t === target || target.contains?.(t));

    if (!insideKb && !insideInput) {
      this.hide();
    }
  }

  onVisualViewport() {
    if (!this.visible) return;
    if (this.scrollTicking) return;
    this.scrollTicking = true;
    requestAnimationFrame(() => {
      this.scrollTicking = false;
      this.bringTargetAboveKeyboard();
    });
  }

  setTarget(target) {
    this.options.target = target;
  }

  setLayout(layout) {
    this.options.layout = layout in KEYBOARD_LAYOUTS ? layout : "latin";
    this.render();
  }

  applyViewportSpace() {
    const h = Math.ceil(this.root.getBoundingClientRect().height || 0);
    document.documentElement.style.setProperty("--itkKeyboardH", `${h}px`);
    document.body.style.paddingBottom = `${h + 10}px`;
  }

  restoreViewportSpace() {
    document.documentElement.style.removeProperty("--itkKeyboardH");
    document.body.style.paddingBottom = "";
  }

  bringTargetAboveKeyboard() {
    const input = this.options.target;
    if (!input) return;

    const keyboardHeight = Math.ceil(this.root.getBoundingClientRect().height || 0);
    input.style.scrollMarginBottom = `${keyboardHeight + 48}px`;

    const rect = input.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewportHeight = vv ? vv.height : window.innerHeight;
    const safeBottom = keyboardHeight + 18;
    const visibleBottom = viewportHeight - safeBottom;

    if (rect.bottom > visibleBottom || rect.top < 12) {
      const delta = rect.bottom - visibleBottom + 24;
      window.scrollBy({ top: Math.max(delta, 0), behavior: "smooth" });
    }
  }

  show(target = null) {
    if (target) this.setTarget(target);
    this.visible = true;
    this.root.classList.add("show");

    requestAnimationFrame(() => {
      this.applyViewportSpace();
      this.bringTargetAboveKeyboard();
    });

    this.options.onShow?.();
  }

  hide() {
    this.visible = false;
    this.root.classList.remove("show");
    this.hideAltMenu();
    this.restoreViewportSpace();
    this.options.onHide?.();
  }

  toggle(target = null) {
    if (this.visible) this.hide();
    else this.show(target);
  }

  getLayoutRows() {
    const base = KEYBOARD_LAYOUTS[this.options.layout] || KEYBOARD_LAYOUTS.latin;
    const make = (row) => this.shift ? row.map((x) => x.toUpperCase()) : row.slice();

    return {
      nums: NUM_ROW.slice(),
      r1: make(base.r1),
      r2: make(base.r2),
      r3: make(base.r3)
    };
  }

  insertText(text) {
    const input = this.options.target;
    if (!input) return;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);

    input.value = `${before}${text}${after}`;

    const caret = start + text.length;
    try {
      input.setSelectionRange(caret, caret);
    } catch {}

    input.dispatchEvent(new Event("input", { bubbles: true }));
    this.options.onChange?.(input.value, input);

    requestAnimationFrame(() => this.bringTargetAboveKeyboard());

    if (this.shift && !this.options.keepShiftOnce) {
      this.shift = false;
      this.render();
    }
  }

  backspace() {
    const input = this.options.target;
    if (!input) return;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    if (start !== end) {
      input.value = input.value.slice(0, start) + input.value.slice(end);
      try { input.setSelectionRange(start, start); } catch {}
    } else if (start > 0) {
      input.value = input.value.slice(0, start - 1) + input.value.slice(end);
      try { input.setSelectionRange(start - 1, start - 1); } catch {}
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    this.options.onChange?.(input.value, input);
    requestAnimationFrame(() => this.bringTargetAboveKeyboard());
  }

  doEnter() {
    if (typeof this.options.onEnter === "function") {
      this.options.onEnter(this.options.target);
    } else {
      this.insertText("\n");
    }
  }

  playFeedback(kind = "key", strongVibrate = false) {
    if (this.options.enableVibration) vibrate(strongVibrate ? 12 : 8);
    if (this.options.enableSound) this.audio.play(kind);
  }

  createAltMenu(hostBtn, chars = []) {
    this.hideAltMenu();
    if (!hostBtn || !chars.length) return;

    const wrap = document.createElement("div");
    wrap.className = "itk-kb-alt";

    chars.forEach((ch) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "itk-kb-alt-btn";
      b.textContent = ch;

      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.playFeedback("key");
        this.insertText(ch);
        this.hideAltMenu();
      });

      wrap.appendChild(b);
    });

    hostBtn.appendChild(wrap);
    this.altMenuEl = wrap;

    const altRect = wrap.getBoundingClientRect();
    const pad = 8;

    if (altRect.left < pad) {
      wrap.style.left = "0";
      wrap.style.transform = "translateX(0)";
    } else if (altRect.right > window.innerWidth - pad) {
      wrap.style.left = "auto";
      wrap.style.right = "0";
      wrap.style.transform = "translateX(0)";
    }
  }

  hideAltMenu() {
    if (this.altMenuEl) this.altMenuEl.remove();
    this.altMenuEl = null;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
  }

  createKey({
    label = "",
    html = "",
    className = "",
    sound = "key",
    onTap = null,
    onLongPress = null
  }) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `itk-kb-key ${className}`.trim();
    if (html) btn.innerHTML = html;
    else btn.textContent = label;

    let longTriggered = false;

    btn.addEventListener("pointerdown", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      longTriggered = false;
      btn.classList.add("pressing");
      await this.audio.unlock();

      if (onLongPress) {
        this.holdTimer = setTimeout(() => {
          longTriggered = true;
          this.playFeedback(sound, true);
          onLongPress(btn);
        }, 320);
      }
    });

    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
      btn.classList.remove("pressing");

      if (!longTriggered && onTap) {
        this.playFeedback(sound);
        onTap();
      }
    });

    btn.addEventListener("pointerleave", () => {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
      btn.classList.remove("pressing");
    });

    btn.addEventListener("contextmenu", (e) => e.preventDefault());
    return btn;
  }

  renderCharKeys(rowEl, chars = []) {
    chars.forEach((ch) => {
      const alts =
        this.options.altChars[ch] ||
        this.options.altChars[String(ch).toLowerCase()] ||
        [];

      rowEl.appendChild(this.createKey({
        label: ch,
        sound: "key",
        onTap: () => {
          this.hideAltMenu();
          this.insertText(ch);
        },
        onLongPress: alts.length
          ? (btn) => this.createAltMenu(btn, alts)
          : null
      }));
    });
  }

  render() {
    const rows = this.getLayoutRows();
    this.keyboard.innerHTML = "";

    if (this.options.showNumberRow) {
      const rowNums = document.createElement("div");
      rowNums.className = "itk-kb-row";
      this.renderCharKeys(rowNums, rows.nums);
      this.keyboard.appendChild(rowNums);
    }

    const row1 = document.createElement("div");
    row1.className = "itk-kb-row";
    this.renderCharKeys(row1, rows.r1);
    this.keyboard.appendChild(row1);

    const row2 = document.createElement("div");
    row2.className = "itk-kb-row";
    const padL = document.createElement("div");
    padL.className = "itk-kb-gap";
    row2.appendChild(padL);
    this.renderCharKeys(row2, rows.r2);
    const padR = document.createElement("div");
    padR.className = "itk-kb-gap";
    row2.appendChild(padR);
    this.keyboard.appendChild(row2);

    const row3 = document.createElement("div");
    row3.className = "itk-kb-row";

    row3.appendChild(this.createKey({
      html: svgShift(),
      className: "wide dark",
      sound: "shift",
      onTap: () => {
        this.hideAltMenu();
        this.shift = !this.shift;
        this.render();
      }
    }));

    this.renderCharKeys(row3, rows.r3);

    row3.appendChild(this.createKey({
      html: svgBackspace(),
      className: "wide dark",
      sound: "backspace",
      onTap: () => {
        this.hideAltMenu();
        this.backspace();
      }
    }));

    this.keyboard.appendChild(row3);

    const row4 = document.createElement("div");
    row4.className = "itk-kb-row";

    row4.appendChild(this.createKey({
      label: ",",
      sound: "key",
      onTap: () => {
        this.hideAltMenu();
        this.insertText(",");
      }
    }));

    row4.appendChild(this.createKey({
      label: ".",
      sound: "key",
      onTap: () => {
        this.hideAltMenu();
        this.insertText(".");
      }
    }));

    row4.appendChild(this.createKey({
      label: "italkyAI",
      className: "xwide smalltxt",
      sound: "space",
      onTap: () => {
        this.hideAltMenu();
        this.insertText(" ");
      }
    }));

    row4.appendChild(this.createKey({
      label: "?",
      sound: "key",
      onTap: () => {
        this.hideAltMenu();
        this.insertText("?");
      }
    }));

    row4.appendChild(this.createKey({
      html: svgEnter(),
      className: "wide dark",
      sound: "enter",
      onTap: () => {
        this.hideAltMenu();
        this.doEnter();
      }
    }));

    this.keyboard.appendChild(row4);
  }
}

function attach(options = {}) {
  const kb = new ItalkyKeyboard(options);
  const target = options.target;

  if (target) {
    try {
      target.readOnly = true;
      target.setAttribute("inputmode", "none");
      target.setAttribute("autocomplete", "off");
      target.setAttribute("autocorrect", "off");
      target.setAttribute("autocapitalize", "off");
      target.setAttribute("spellcheck", "false");

      const open = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await kb.audio.unlock();
        kb.show(target);
      };

      target.addEventListener("pointerdown", open);
      target.addEventListener("click", open);
      target.addEventListener("focus", () => {
        try { target.blur(); } catch {}
      });
    } catch {}
  }

  return kb;
}

window.italkyKeyboard = {
  attach,
  ItalkyKeyboard
};

export { attach, ItalkyKeyboard };
