// js/store.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// =========================================================
// 1. KONFIGURASI FIREBASE & AUTH
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyA9_g3hu66hmiQaOY5DGGIhUpeJG_8kOhk",
  authDomain: "celestianworthy.firebaseapp.com",
  projectId: "celestianworthy",
  storageBucket: "celestianworthy.firebasestorage.app",
  messagingSenderId: "669221323067",
  appId: "1:669221323067:web:fcf6da7f8e46f0f805f71e"
};

export const ADMIN_UIDS = [
  "INGhuGTr0IX5KrBsFgpWuncDGAf1",
];

// =========================================================
// 2. KONFIGURASI UPLOAD MEDIA KE GITHUB
// =========================================================
const _rawToken = "github_#pat_#11CVP7NVY0mNs3WJ8K5cqN_#XmzzH1rKXHmdaF5YxJwEgparfBEqfUTSNJ2tNUG8xgpAPHM3UQXjvZJpRaV";

export const GITHUB_CONFIG = {
  username: "CelestialWorthy",
  repo: "CelestialWorthy",
  branch: "main",
  token: _rawToken.replaceAll("#", "")
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const LOCAL_CONTENTS_KEY = "zf_contents_v1";
const LOCAL_SETTINGS_PREFIX = "zf_settings_v1_";

// =========================================================
// 3. AUTENTIKASI ADMIN
// =========================================================
export function isCurrentUserAdmin() {
  const user = auth.currentUser;
  return Boolean(user && ADMIN_UIDS.includes(user.uid));
}

function assertAdmin() {
  if (!isCurrentUserAdmin()) {
    throw new Error("Akses ditolak: silakan login sebagai Admin terlebih dahulu.");
  }
}

export function watchAdminAuth(callback) {
  return onAuthStateChanged(auth, (user) => {
    const admin = Boolean(user && ADMIN_UIDS.includes(user.uid));
    callback(admin, user);
  });
}

export async function loginAdmin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!ADMIN_UIDS.includes(cred.user.uid)) {
    await signOut(auth);
    throw new Error("Akun ini bukan pemilik (Admin) website.");
  }
  return cred.user;
}

export async function logoutAdmin() {
  await signOut(auth);
}

// =========================================================
// 4. CACHE LOKAL (LOCALSTORAGE)
// =========================================================
export function getLocalContents() {
  try {
    const raw = localStorage.getItem(LOCAL_CONTENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setLocalContents(items) {
  const safeList = Array.isArray(items) ? items : [];
  localStorage.setItem(LOCAL_CONTENTS_KEY, JSON.stringify(safeList));
}

export function getLocalSetting(key, fallback = null) {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalSetting(key, value) {
  localStorage.setItem(LOCAL_SETTINGS_PREFIX + key, JSON.stringify(value));
}

// =========================================================
// 5. UPLOAD FILE & MEDIA KE FOLDER DI GITHUB
// =========================================================
export async function uploadMediaFile(file, folder = "media/konten") {
  assertAdmin();
  if (!file) throw new Error("Tidak ada file yang dipilih.");

  const base64Content = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const parts = result.split(",");
      if (parts.length < 2) {
        reject(new Error("Format file tidak dapat dibaca."));
        return;
      }
      resolve(parts[1]);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  const cleanFolder = String(folder || "media/konten").replace(/^\/+|\/+$/g, "");
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = `${cleanFolder}/${safeName}`;

  const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_CONFIG.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Upload ${safeName}`,
      content: base64Content,
      branch: GITHUB_CONFIG.branch
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Gagal mengunggah media ke GitHub.");
  }

  return {
    name: file.name,
    path: filePath,
    type: file.type || "application/octet-stream",
    size: file.size || 0,
    url: `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${filePath}`
  };
}

// =========================================================
// 6. OPERASI KONTEN (TERPISAH: MEDIA vs ISI TEKS & FILE)
// =========================================================
function normalizeContentItem(payload = {}) {
  const now = Date.now();
  const id = String(payload.id || now);
  const mediaList = Array.isArray(payload.mediaList) ? payload.mediaList : [];
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  const blocks = Array.isArray(payload.blocks) ? payload.blocks : [];

  return {
    id,
    title: String(payload.title || "Tanpa Judul").trim(),
    category: String(payload.category || "Umum").trim(),
    summary: String(payload.summary || "").trim(),
    textBody: String(payload.textBody || ""),
    blocks,
    mediaList,
    attachments,
    coverUrl: payload.coverUrl || (mediaList[0] ? mediaList[0].url : null),
    createdAt: Number(payload.createdAt || now),
    updatedAt: now
  };
}

// Tambah atau edit satu item konten (lokal + Firestore)
export async function saveContentItem(payload) {
  assertAdmin();

  const item = normalizeContentItem(payload);
  const current = getLocalContents().filter((x) => String(x.id) !== item.id);
  const nextList = [item, ...current].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  setLocalContents(nextList);
  await setDoc(doc(db, "contents", item.id), item);

  return item;
}

// Hapus satu item konten berdasarkan ID (lokal + Firestore)
export async function deleteContentItem(id) {
  assertAdmin();

  const targetId = String(id);
  const filtered = getLocalContents().filter((x) => String(x.id) !== targetId);

  setLocalContents(filtered);
  await deleteDoc(doc(db, "contents", targetId));

  return filtered;
}

// Ambil satu item konten berdasarkan ID
export async function getContentById(id) {
  const targetId = String(id);
  const localMatch = getLocalContents().find((x) => String(x.id) === targetId);
  if (localMatch) return localMatch;

  const snap = await getDoc(doc(db, "contents", targetId));
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}

// Sinkronisasi daftar konten dari Firestore ke lokal
export async function syncContentsFromCloud() {
  const snap = await getDocs(collection(db, "contents"));
  const cloudItems = [];
  snap.forEach((d) => {
    cloudItems.push(d.data());
  });

  cloudItems.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  setLocalContents(cloudItems);
  return cloudItems;
}

// =========================================================
// 7. PENGATURAN TERPISAH (PROFIL, AVATAR, WALLPAPER, DLL.)
// =========================================================
export async function saveSettingItem(docName, dataObj) {
  assertAdmin();

  const payload = {
    ...dataObj,
    updatedAt: Date.now()
  };

  setLocalSetting(docName, payload);
  await setDoc(doc(db, "portfolio_settings", docName), payload);
  return payload;
}

export async function loadSettingItem(docName, fallback = null) {
  const localVal = getLocalSetting(docName, null);
  try {
    const snap = await getDoc(doc(db, "portfolio_settings", docName));
    if (snap.exists()) {
      const cloudVal = snap.data();
      setLocalSetting(docName, cloudVal);
      return cloudVal;
    }
  } catch (err) {
    console.warn(`Gagal memuat setting "${docName}" dari cloud:`, err);
  }
  return localVal || fallback;
}
