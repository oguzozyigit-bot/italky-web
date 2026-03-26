import { checkAccess, canUse, getAccessMode } from "/js/nfc_access.js";

export async function bootAccessGate() {
  try {
    await checkAccess();
  } catch (e) {
    console.warn("[access gate]", e);
  }

  const mode = getAccessMode();

  const faceBtn = document.getElementById("goFaceToFace");
  const sideBtn = document.getElementById("goSideToSide");
  const offlineBtn = document.getElementById("goOffline");
  const textBtn = document.getElementById("goTextToText");
  const upgradeBox = document.getElementById("nfcUpgradeBox");

  if (textBtn) {
    textBtn.style.display = "flex";
  }

  if (faceBtn) faceBtn.style.display = canUse("face_to_face") ? "flex" : "none";
  if (sideBtn) sideBtn.style.display = canUse("side_to_side") ? "flex" : "none";
  if (offlineBtn) offlineBtn.style.display = canUse("offline") ? "flex" : "none";

  if (upgradeBox) {
    upgradeBox.style.display = mode === "basic" ? "block" : "none";
  }
}
