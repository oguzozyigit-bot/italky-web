// FILE: /js/game_access_gate.js

export function closeGamesGateModal() {
  // Artık kullanılmıyor
}

export function openGamesGateModal() {
  // Artık kullanılmıyor
}

export async function ensureGamesBundleAccess(gameCode = "") {
  return {
    ok: true,
    access_open: true,
    reason: "all_games_free",
    game_code: String(gameCode || "").trim().toLowerCase()
  };
}
