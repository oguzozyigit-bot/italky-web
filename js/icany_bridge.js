// Minimal italky → icany SSO URL helper. Does not touch DOM/UI.
const ICANY_ORIGIN = "https://icany.ai";
const FROM_ITALKY_PATH = "/api/bridge/from-italky";

/** Build GET URL: https://icany.ai/api/bridge/from-italky?next=...&access_token=... */
export function buildFromItalkyUrl(nextPath, accessToken) {
  const next = String(nextPath || "/hosgeldiniz").startsWith("/")
    ? String(nextPath || "/hosgeldiniz")
    : `/${nextPath}`;
  const url = new URL(`${ICANY_ORIGIN}${FROM_ITALKY_PATH}`);
  url.searchParams.set("next", next);
  const token = String(accessToken || "").trim();
  if (token) url.searchParams.set("access_token", token);
  return url.toString();
}
