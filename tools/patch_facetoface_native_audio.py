from pathlib import Path

p = Path('js/facetoface_page.js')
s = p.read_text(encoding='utf-8')

old = '''function buildOfflineRecognizer(langCode, side) {
  const lang = canonical(langCode);
  const bcp = langObj(lang).bcp;
  const nativeStart = window.Native?.startSpeechRecognition || window.Native?.startNativeSpeechRecognition;
  const nativeStop = window.Native?.stopSpeechRecognition || window.Native?.stopNativeSpeechRecognition;
  const offline = window.OfflineSpeech;
'''
new = '''function buildOfflineRecognizer(langCode, side) {
  const lang = canonical(langCode);
  const bcp = langObj(lang).bcp;
  const nativeBridge =
    (window.Native?.startSpeechRecognition || window.Native?.startNativeSpeechRecognition)
      ? window.Native
      : ((window.AndroidBridge?.startSpeechRecognition || window.AndroidBridge?.startNativeSpeechRecognition)
          ? window.AndroidBridge
          : null);
  const nativeStart = nativeBridge?.startSpeechRecognition || nativeBridge?.startNativeSpeechRecognition;
  const nativeStop = nativeBridge?.stopSpeechRecognition || nativeBridge?.stopNativeSpeechRecognition;
  const offline = window.OfflineSpeech;
'''
if old not in s:
    raise SystemExit('buildOfflineRecognizer header not found')
s = s.replace(old, new, 1)

s = s.replace('nativeStart.call(window.Native, bcp, side);', 'nativeStart.call(nativeBridge, bcp, side);', 1)
s = s.replace('nativeStop?.call(window.Native);', 'nativeStop?.call(nativeBridge);', 1)

old = '''  const prevNativeResult = window.onNativeSpeechResult;
  window.onNativeSpeechResult = (side, text, isFinal = true) => {
    try { prevNativeResult?.(side, text, isFinal); } catch {}
    const rec = activeOfflineSpeechRecognizer;
    if (rec && rec.side === side) rec.emitResult(text, isFinal !== false);
  };
'''
new = '''  const prevNativeResult = window.onNativeSpeechResult;
  window.onNativeSpeechResult = (arg1, arg2, arg3 = true) => {
    let side = arg1;
    let text = arg2;
    let isFinal = arg3;

    if (arg1 && typeof arg1 === "object") {
      side = arg1.side;
      text = arg1.text;
      isFinal = arg1.final !== false;
    }

    side = side === "top" ? "top" : "bot";
    text = String(text || "");

    try { prevNativeResult?.(arg1, arg2, arg3); } catch {}
    const rec = activeOfflineSpeechRecognizer;
    if (rec && rec.side === side && text) rec.emitResult(text, isFinal !== false);
  };
'''
if old not in s:
    raise SystemExit('native result handler not found')
s = s.replace(old, new, 1)

old = '''function buildRecognizer(langCode, side = "") {
  if (currentRuntimeMode === "offline") return buildOfflineRecognizer(langCode, side);

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
'''
new = '''function buildRecognizer(langCode, side = "") {
  const hasNativeSpeech = !!(
    window.Native?.startSpeechRecognition ||
    window.Native?.startNativeSpeechRecognition ||
    window.AndroidBridge?.startSpeechRecognition ||
    window.AndroidBridge?.startNativeSpeechRecognition
  );

  // Android uygulamada native SpeechRecognizer kullan. Böylece FaceToFace ses rotası
  // gerçekten seçilen tarafa göre kulaklık/telefon arasında değiştirilebilir.
  if (hasNativeSpeech || currentRuntimeMode === "offline") {
    return buildOfflineRecognizer(langCode, side);
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
'''
if old not in s:
    raise SystemExit('buildRecognizer header not found')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('patched facetoface native audio bridge')
