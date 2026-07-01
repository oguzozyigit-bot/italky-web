#!/usr/bin/env python3
"""Generate exactly 129 offline/online language entries (dialect clone model)."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# parent=self means ONNX zip uses this ISO code
BASE = [
    ("af", "af", "Afrikanca", "🇿🇦"),
    ("am", "am", "Amharca", "🇪🇹"),
    ("ar", "ar", "Arapça", "🇸🇦"),
    ("az", "az", "Azerbaycanca", "🇦🇿"),
    ("bg", "bg", "Bulgarca", "🇧🇬"),
    ("bn", "bn", "Bengalce", "🇧🇩"),
    ("bs", "bs", "Boşnakça", "🇧🇦"),
    ("ca", "ca", "Katalanca", "🇪🇸"),
    ("cs", "cs", "Çekçe", "🇨🇿"),
    ("cy", "cy", "Galce", "🏴"),
    ("da", "da", "Danca", "🇩🇰"),
    ("de", "de", "Almanca", "🇩🇪"),
    ("el", "el", "Yunanca", "🇬🇷"),
    ("en", "en", "İngilizce", "🇬🇧"),
    ("es", "es", "İspanyolca", "🇪🇸"),
    ("et", "et", "Estonca", "🇪🇪"),
    ("eu", "eu", "Baskça", "🇪🇸"),
    ("fi", "fi", "Fince", "🇫🇮"),
    ("fr", "fr", "Fransızca", "🇫🇷"),
    ("ga", "ga", "İrlandaca", "🇮🇪"),
    ("gl", "gl", "Galiçyaca", "🇪🇸"),
    ("he", "he", "İbranice", "🇮🇱"),
    ("hi", "hi", "Hintçe", "🇮🇳"),
    ("hr", "hr", "Hırvatça", "🇭🇷"),
    ("hy", "hy", "Ermenice", "🇦🇲"),
    ("id", "id", "Endonezce", "🇮🇩"),
    ("is", "is", "İzlandaca", "🇮🇸"),
    ("it", "it", "İtalyanca", "🇮🇹"),
    ("ja", "ja", "Japonca", "🇯🇵"),
    ("ka", "ka", "Gürcüce", "🇬🇪"),
    ("kk", "kk", "Kazakça", "🇰🇿"),
    ("km", "km", "Khmerce", "🇰🇭"),
    ("ko", "ko", "Korece", "🇰🇷"),
    ("lt", "lt", "Litvanca", "🇱🇹"),
    ("lv", "lv", "Letonca", "🇱🇻"),
    ("mk", "mk", "Makedonca", "🇲🇰"),
    ("mn", "mn", "Moğolca", "🇲🇳"),
    ("ms", "ms", "Malayca", "🇲🇾"),
    ("mt", "mt", "Maltaca", "🇲🇹"),
    ("my", "my", "Burmaca", "🇲🇲"),
    ("nl", "nl", "Hollandaca", "🇳🇱"),
    ("no", "no", "Norveççe", "🇳🇴"),
    ("pl", "pl", "Lehçe", "🇵🇱"),
    ("pt", "pt", "Portekizce", "🇵🇹"),
    ("ro", "ro", "Romence", "🇷🇴"),
    ("ru", "ru", "Rusça", "🇷🇺"),
    ("sk", "sk", "Slovakça", "🇸🇰"),
    ("sl", "sl", "Slovence", "🇸🇮"),
    ("sq", "sq", "Arnavutça", "🇦🇱"),
    ("sr", "sr", "Sırpça", "🇷🇸"),
    ("sv", "sv", "İsveççe", "🇸🇪"),
    ("sw", "sw", "Svahili", "🇹🇿"),
    ("th", "th", "Tayca", "🇹🇭"),
    ("tr", "tr", "Türkçe", "🇹🇷"),
    ("uk", "uk", "Ukraynaca", "🇺🇦"),
    ("ur", "ur", "Urduca", "🇵🇰"),
    ("vi", "vi", "Vietnamca", "🇻🇳"),
    ("yo", "yo", "Yorubaca", "🇳🇬"),
    ("zh", "zh", "Çince", "🇨🇳"),
]

DIALECTS = [
    # English (8)
    ("en-us", "en", "İngilizce (ABD)", "🇺🇸"),
    ("en-gb", "en", "İngilizce (İngiltere)", "🇬🇧"),
    ("en-au", "en", "İngilizce (Avustralya)", "🇦🇺"),
    ("en-ca", "en", "İngilizce (Kanada)", "🇨🇦"),
    ("en-in", "en", "İngilizce (Hindistan)", "🇮🇳"),
    ("en-za", "en", "İngilizce (G. Afrika)", "🇿🇦"),
    ("en-ie", "en", "İngilizce (İrlanda)", "🇮🇪"),
    ("en-nz", "en", "İngilizce (Y. Zelanda)", "🇳🇿"),
    # Spanish (10)
    ("es-mx", "es", "İspanyolca (Meksika)", "🇲🇽"),
    ("es-ar", "es", "İspanyolca (Arjantin)", "🇦🇷"),
    ("es-co", "es", "İspanyolca (Kolombiya)", "🇨🇴"),
    ("es-cl", "es", "İspanyolca (Şili)", "🇨🇱"),
    ("es-pe", "es", "İspanyolca (Peru)", "🇨🇱"),
    ("es-ve", "es", "İspanyolca (Venezuela)", "🇻🇪"),
    ("es-ec", "es", "İspanyolca (Ekvador)", "🇪🇨"),
    ("es-gt", "es", "İspanyolca (Guatemala)", "🇬🇹"),
    ("es-do", "es", "İspanyolca (Dominik)", "🇩🇴"),
    ("es-pr", "es", "İspanyolca (Porto Riko)", "🇵🇷"),
    # Portuguese (2)
    ("pt-br", "pt", "Portekizce (Brezilya)", "🇧🇷"),
    ("pt-pt", "pt", "Portekizce (Portekiz)", "🇵🇹"),
    # French (6)
    ("fr-ca", "fr", "Fransızca (Kanada)", "🇨🇦"),
    ("fr-be", "fr", "Fransızca (Belçika)", "🇧🇪"),
    ("fr-ch", "fr", "Fransızca (İsviçre)", "🇨🇭"),
    ("fr-dz", "fr", "Fransızca (Cezayir)", "🇩🇿"),
    ("fr-ma", "fr", "Fransızca (Fas)", "🇲🇦"),
    ("fr-sn", "fr", "Fransızca (Senegal)", "🇸🇳"),
    # Arabic (12)
    ("ar-eg", "ar", "Arapça (Mısır)", "🇪🇬"),
    ("ar-ae", "ar", "Arapça (BAE)", "🇦🇪"),
    ("ar-kw", "ar", "Arapça (Kuveyt)", "🇰🇼"),
    ("ar-qa", "ar", "Arapça (Katar)", "🇶🇦"),
    ("ar-bh", "ar", "Arapça (Bahreyn)", "🇧🇭"),
    ("ar-om", "ar", "Arapça (Umman)", "🇴🇲"),
    ("ar-ye", "ar", "Arapça (Yemen)", "🇾🇪"),
    ("ar-jo", "ar", "Arapça (Ürdün)", "🇯🇴"),
    ("ar-sy", "ar", "Arapça (Suriye)", "🇸🇾"),
    ("ar-tn", "ar", "Arapça (Tunus)", "🇹🇳"),
    ("ar-ly", "ar", "Arapça (Libya)", "🇱🇾"),
    ("ar-sd", "ar", "Arapça (Sudan)", "🇸🇩"),
    # Chinese (3)
    ("zh-cn", "zh", "Çince (Basitleştirilmiş)", "🇨🇳"),
    ("zh-tw", "zh", "Çince (Geleneksel)", "🇹🇼"),
    ("zh-hk", "zh", "Çince (Hong Kong)", "🇭🇰"),
    # German (2)
    ("de-at", "de", "Almanca (Avusturya)", "🇦🇹"),
    ("de-ch", "de", "Almanca (İsviçre)", "🇨🇭"),
    # Other European (2)
    ("it-ch", "it", "İtalyanca (İsviçre)", "🇨🇭"),
    ("nl-be", "nl", "Flamanca (Belçika)", "🇧🇪"),
    # Mapped / clone without own ONNX (16)
    ("be", "ru", "Belarusça", "🇧🇾"),
    ("fa", "ar", "Farsça", "🇮🇷"),
    ("eo", "en", "Esperanto", "🌍"),
    ("ht", "fr", "Haiti Kreyolu", "🇭🇹"),
    ("gu", "hi", "Guceratça", "🇮🇳"),
    ("kn", "hi", "Kannada", "🇮🇳"),
    ("mr", "hi", "Marathi", "🇮🇳"),
    ("ta", "hi", "Tamilce", "🇮🇳"),
    ("te", "hi", "Telugu", "🇮🇳"),
    ("tl", "en", "Tagalog", "🇵🇭"),
    ("fil", "en", "Filipince", "🇵🇭"),
    ("ne", "hi", "Nepalce", "🇳🇵"),
    ("si", "hi", "Sinhala", "🇱🇰"),
    ("ps", "ur", "Peştuca", "🇦🇫"),
    ("sd", "ur", "Sindhi", "🇵🇰"),
    ("tk", "tr", "Türkmence", "🇹🇲"),
    ("hu", "en", "Macarca", "🇭🇺"),
    ("uz", "tr", "Özbekçe", "🇺🇿"),
    ("ky", "tr", "Kırgızca", "🇰🇬"),
    # Indonesian variants (3)
    ("jv", "id", "Cava Dili", "🇮🇩"),
    ("su", "id", "Sundaca", "🇮🇩"),
    ("min", "id", "Minangkabau", "🇮🇩"),
    # More regional (3)
    ("bn-in", "bn", "Bengalce (Hindistan)", "🇮🇳"),
    ("ur-in", "ur", "Urduca (Hindistan)", "🇮🇳"),
    ("pa", "hi", "Pencapça", "🇮🇳"),
]

def main():
    entries = []
    seen = set()
    for code, parent, name, flag in BASE + DIALECTS:
        c = code.lower().strip()
        if c in seen:
            raise SystemExit(f"duplicate code: {c}")
        seen.add(c)
        entries.append({
            "code": c,
            "parent": parent,
            "name": name,
            "flag": flag,
            "offline": True,
            "online": True,
        })

    if len(entries) != 129:
        raise SystemExit(f"expected 129 entries, got {len(entries)} (base={len(BASE)} dialects={len(DIALECTS)})")

    out_json = ROOT / "data" / "languages_129.json"
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(
        json.dumps({"version": 1, "count": 129, "languages": entries}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # JS module
    lines = [
        "// Auto-generated by _model_export/gen_languages_129.py — do not edit by hand",
        "export const OFFLINE_ONLINE_LANG_TARGET = 129;",
        "export const LANGUAGE_REGISTRY_129 = " + json.dumps(entries, ensure_ascii=False, indent=2) + ";",
        "",
        "const _byCode = new Map(LANGUAGE_REGISTRY_129.map((e) => [e.code, e]));",
        "const _parentMap = new Map(LANGUAGE_REGISTRY_129.map((e) => [e.code, e.parent]));",
        "",
        "export function normalizeLangCode(code = '') {",
        "  return String(code || '').trim().toLowerCase().replace(/_/g, '-');",
        "}",
        "",
        "export function getLangEntry(code) {",
        "  const key = normalizeLangCode(code);",
        "  return _byCode.get(key) || _byCode.get(key.split('-')[0]) || null;",
        "}",
        "",
        "export function modelParent(code) {",
        "  const key = normalizeLangCode(code);",
        "  if (_parentMap.has(key)) return _parentMap.get(key);",
        "  const base = key.split('-')[0];",
        "  if (_parentMap.has(base)) return _parentMap.get(base);",
        "  return base;",
        "}",
        "",
        "export function displayLangCode(code) {",
        "  const entry = getLangEntry(code);",
        "  return entry ? entry.code : normalizeLangCode(code).split('-')[0];",
        "}",
        "",
        "export function listOfflineLanguages() {",
        "  return LANGUAGE_REGISTRY_129.filter((e) => e.offline);",
        "}",
        "",
        "export function listOnlineLanguages() {",
        "  return LANGUAGE_REGISTRY_129.filter((e) => e.online);",
        "}",
    ]
    out_js = ROOT / "js" / "language_registry_129.js"
    js_body = "\n".join(lines) + "\n"
    js_body += """
if (typeof window !== \"undefined\") {
  window.ItalkyLanguageRegistry = {
    OFFLINE_ONLINE_LANG_TARGET,
    LANGUAGE_REGISTRY_129,
    normalizeLangCode,
    getLangEntry,
    modelParent,
    displayLangCode,
    listOfflineLanguages,
    listOnlineLanguages,
  };
}
"""
    out_js.write_text(js_body, encoding="utf-8")

    android_asset = Path(r"C:\Users\Lenovo\AndroidStudioProjects\ItalkyAI\app\src\main\assets\data\languages_129.json")
    if android_asset.parent.parent.exists():
        android_asset.parent.mkdir(parents=True, exist_ok=True)
        android_asset.write_text(out_json.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"Synced Android asset: {android_asset}")

    print(f"OK: {len(entries)} languages -> {out_json.name}, {out_js.name}")
    parents = len({e['parent'] for e in entries})
    print(f"Unique ONNX parents: {parents}")


if __name__ == "__main__":
    main()
