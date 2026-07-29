const ICANY_ENDPOINT = "https://www.icany.ai/api/bridge/personal-wallet";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const authorization = String(req.headers.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ ok: false, error: "Oturum gerekli" });
    return;
  }

  try {
    const upstream = await fetch(ICANY_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(req.body || {}),
      cache: "no-store",
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.send(text);
  } catch (error) {
    console.error("[italky personal-wallet proxy]", error);
    res.status(502).json({ ok: false, error: "Ortak cüzdana ulaşılamadı" });
  }
};
