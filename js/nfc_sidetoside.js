// FILE: /js/nfc_sidetoside.js

const NFC_ERR = {
  unsupported: "Bu cihazda veya tarayıcıda Web NFC desteklenmiyor.",
  secure: "NFC için HTTPS gerekli.",
  denied: "NFC izni verilmedi.",
  aborted: "NFC işlemi iptal edildi.",
  busy: "NFC tarayıcı zaten açık.",
  failed: "NFC işlemi başarısız oldu.",
};

function isSecureOk() {
  return location.protocol === "https:" || location.hostname === "localhost";
}

export function canUseWebNfc() {
  return isSecureOk() && ("NDEFReader" in window);
}

function normError(err) {
  const name = String(err?.name || "").trim();
  if (!isSecureOk()) return NFC_ERR.secure;
  if (!("NDEFReader" in window)) return NFC_ERR.unsupported;
  if (name === "NotAllowedError") return NFC_ERR.denied;
  if (name === "AbortError") return NFC_ERR.aborted;
  if (name === "InvalidStateError") return NFC_ERR.busy;
  return err?.message || NFC_ERR.failed;
}

function decodeRecord(record) {
  try {
    if (!record) return "";
    if (record.recordType === "url") {
      const decoder = new TextDecoder(record.encoding || "utf-8");
      return decoder.decode(record.data);
    }
    if (record.recordType === "text") {
      const decoder = new TextDecoder(record.encoding || "utf-8");
      return decoder.decode(record.data);
    }
    if (record.recordType === "absolute-url") {
      const decoder = new TextDecoder(record.encoding || "utf-8");
      return decoder.decode(record.data);
    }
  } catch {}
  return "";
}

export async function writeJoinUrlToNfc(joinUrl) {
  if (!canUseWebNfc()) {
    throw new Error(normError(new Error("unsupported")));
  }

  const url = String(joinUrl || "").trim();
  if (!url) throw new Error("Yazılacak bağlantı bulunamadı.");

  try {
    const ndef = new NDEFReader();

    await ndef.write({
      records: [
        {
          recordType: "url",
          data: url,
        },
        {
          recordType: "text",
          data: "italkyAI SideToSide bağlantısı",
          lang: "tr",
        },
      ],
    });

    return { ok: true, url };
  } catch (err) {
    throw new Error(normError(err));
  }
}

export async function scanNfcOnce({ timeoutMs = 20000 } = {}) {
  if (!canUseWebNfc()) {
    throw new Error(normError(new Error("unsupported")));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch {}
  }, timeoutMs);

  try {
    const ndef = new NDEFReader();
    await ndef.scan({ signal: controller.signal });

    return await new Promise((resolve, reject) => {
      ndef.addEventListener(
        "reading",
        (event) => {
          try {
            const records = Array.from(event.message?.records || []);
            for (const rec of records) {
              const value = decodeRecord(rec);
              if (value && /^https?:\/\//i.test(value)) {
                clearTimeout(timer);
                try { controller.abort(); } catch {}
                resolve({ ok: true, url: value });
                return;
              }
            }
            clearTimeout(timer);
            try { controller.abort(); } catch {}
            reject(new Error("NFC etiketi içinde geçerli bağlantı bulunamadı."));
          } catch (e) {
            clearTimeout(timer);
            try { controller.abort(); } catch {}
            reject(new Error(normError(e)));
          }
        },
        { once: true }
      );

      ndef.addEventListener(
        "readingerror",
        () => {
          clearTimeout(timer);
          try { controller.abort(); } catch {}
          reject(new Error("NFC etiketi okunamadı."));
        },
        { once: true }
      );
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(normError(err));
  }
}
