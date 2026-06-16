// ============================================================
// KalcDose — Système d'activation (Firebase + Cookie)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBLG6fbL4gqCFbrzXM65QPF19ZdlyCGwAM",
  authDomain: "kalcdose.firebaseapp.com",
  databaseURL: "https://kalcdose-default-rtdb.firebaseio.com",
  projectId: "kalcdose",
  storageBucket: "kalcdose.firebasestorage.app",
  messagingSenderId: "43097919196",
  appId: "1:43097919196:web:de567ce941ece9b5786e19"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Utilitaires Cookie (persistent même en PWA) ──────────────
function setCookie(name, value, days = 3650) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Strict`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// ── Identifiant unique de l'appareil ────────────────────────
function getDeviceId() {
  let id = getCookie("kalcdose_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).substr(2, 16) + Date.now();
    setCookie("kalcdose_device_id", id);
  }
  // Sync avec localStorage aussi
  try { localStorage.setItem("kalcdose_device_id", id); } catch(e){}
  return id;
}

function getSavedCode() {
  return getCookie("kalcdose_code") || 
         (()=>{ try { return localStorage.getItem("kalcdose_code"); } catch(e){ return null; } })();
}

function saveCode(code) {
  setCookie("kalcdose_code", code);
  try { localStorage.setItem("kalcdose_code", code); } catch(e){}
}

// ── Vérifier si l'appareil est activé ───────────────────────
export async function checkActivation() {
  const deviceId = getDeviceId();
  const savedCode = getSavedCode();
  if (!savedCode) return false;
  try {
    const snap = await get(ref(db, `codes/${savedCode}`));
    if (!snap.exists()) return false;
    const data = snap.val();
    return data.activated && data.deviceId === deviceId && data.active !== false;
  } catch (e) {
    // Si pas de connexion mais code sauvegardé → autoriser (mode hors-ligne)
    return savedCode !== null;
  }
}

// ── Activer un code ──────────────────────────────────────────
export async function activateCode(code) {
  const deviceId = getDeviceId();
  try {
    const snap = await get(ref(db, `codes/${code}`));
    if (!snap.exists()) {
      return { success: false, message: "Code invalide." };
    }
    const data = snap.val();
    if (data.active === false) {
      return { success: false, message: "Ce code est désactivé." };
    }
    if (data.activated && data.deviceId !== deviceId) {
      return { success: false, message: "Ce code est déjà utilisé sur un autre appareil." };
    }
    // Activer
    await update(ref(db, `codes/${code}`), {
      activated: true,
      deviceId: deviceId,
      activatedAt: new Date().toISOString(),
      active: true
    });
    saveCode(code);
    return { success: true, message: "Activation réussie !" };
  } catch (e) {
    return { success: false, message: "Erreur de connexion. Vérifiez votre internet." };
  }
}
