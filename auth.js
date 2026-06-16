// ============================================================
// KalcDose — Système d'activation (Firebase + Cookie + Offline)
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

// ── Cookies (persistent PWA iPhone + Android) ───────────────
function setCookie(name, value, days = 3650) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Strict`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// ── Sauvegarde multi-support ─────────────────────────────────
function saveData(key, value) {
  setCookie(key, value);
  try { localStorage.setItem(key, value); } catch(e){}
  try { sessionStorage.setItem(key, value); } catch(e){}
}

function loadData(key) {
  return getCookie(key) ||
    (()=>{ try { return localStorage.getItem(key); } catch(e){ return null; } })() ||
    (()=>{ try { return sessionStorage.getItem(key); } catch(e){ return null; } })();
}

// ── Device ID ────────────────────────────────────────────────
function getDeviceId() {
  let id = loadData("kalcdose_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).substr(2, 16) + Date.now();
    saveData("kalcdose_device_id", id);
  }
  return id;
}

// ── Vérifier activation ──────────────────────────────────────
export async function checkActivation() {
  const deviceId = getDeviceId();
  const savedCode = loadData("kalcdose_code");
  const isActivated = loadData("kalcdose_activated");

  // Si activation locale confirmée → accès direct (hors-ligne)
  if (savedCode && isActivated === "true") {
    return true;
  }

  if (!savedCode) return false;

  // Vérifier en ligne
  try {
    const snap = await get(ref(db, `codes/${savedCode}`));
    if (!snap.exists()) return false;
    const data = snap.val();
    const ok = data.activated && data.deviceId === deviceId && data.active !== false;
    if (ok) saveData("kalcdose_activated", "true");
    return ok;
  } catch (e) {
    // Hors-ligne : si code sauvegardé → autoriser
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
    await update(ref(db, `codes/${code}`), {
      activated: true,
      deviceId: deviceId,
      activatedAt: new Date().toISOString(),
      active: true
    });
    // Sauvegarder localement
    saveData("kalcdose_code", code);
    saveData("kalcdose_activated", "true");
    return { success: true, message: "Activation réussie !" };
  } catch (e) {
    return { success: false, message: "Erreur de connexion. Vérifiez votre internet." };
  }
}
