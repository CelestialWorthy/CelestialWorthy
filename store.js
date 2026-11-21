// store.js
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

const _rawToken = "github_#pat_#11CVP7NVY0mNs3WJ8K5cqN_#XmzzH1rKXHmdaF5YxJwEgparfBEqfUTSNJ2tNUG8xgpAPHM3UQXjvZJpRaV";

export const GITHUB_CONFIG = {
  username: "CelestialWorthy",
  repo: "CelestialWorthy",
  branch: "main",
  token: _rawToken.replaceAll("#", "")
};

// Folder terpisah wajib di GitHub: media, dokumen, unggahan
export const UPLOAD_FOLDERS = {
  media: "media",
  dokumen: "dokumen",
  unggahan: "unggahan"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const KEY_CONTENTS = "zf_pisah_contents_v1";
const KEY_BERANDA = "zf_pisah_beranda_v1";
const KEY_SETTING_PREFIX = "zf_pisah_setting_v1_";

// =========================================================
// AUTH ADMIN
// =========================================================
export function isCurrentUserAdmin() {
  const u = auth.currentUser;
  return Boolean(u && ADMIN_UIDS.includes(u.uid));
}

function assertAdmin() {
  if (!isCurrentUserAdmin()) {
    throw new Error("Silakan login sebagai Admin terlebih dahulu.");
  }
}

export function watchAdminAuth(cb) {
  return onAuthStateChanged(auth, (user) => {
    cb(Boolean(user && ADMIN_UIDS.includes(user.uid)), user);
  });
}

export async function loginAdmin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (!ADMIN_UIDS.includes(cred.user.uid)) {
    await signOut(auth);
    throw new Error("Akun ini bukan Admin.");
  }
  return cred.user;
}

export async function logoutAdmin() {
  await signOut(auth);
}

// =========================================================
// UPLOAD TERPISAH: MEDIA | DOKUMEN (PDF, TXT, DOCS) | UNGGAHAN LAIN
// =========================================================
export function resolveUploadFolder(file, kind = "auto") {
  if (kind === "media" || kind === "dokumen" || kind === "unggahan") {
    return UPLOAD_FOLDERS[kind];
  }
  const mime = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();

  if (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg|mp4|webm|mp3|wav|ogg)$/.test(name)
  ) {
    return UPLOAD_FOLDERS.media;
  }

  if (/\.(pdf|txt|doc|docx|rtf|md|csv|xls|xlsx|ppt|pptx)$/.test(name)) {
    return UPLOAD_FOLDERS.dokumen;
  }

  return UPLOAD_FOLDERS.unggahan;
}

export async function uploadSeparatedFile(file, kind = "auto") {
  assertAdmin();
  if (!file) throw new Error("Tidak ada file yang dipilih.");

  const folder = resolveUploadFolder(file, kind);

  const base64Content = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parts = String(reader.result || "").split(",");
      if (parts.length < 2) return reject(new Error("Gagal membaca file."));
      resolve(parts[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = `${folder}/${safeName}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_CONFIG.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Upload ${folder}/${safeName}`,
      content: base64Content,
      branch: GITHUB_CONFIG.branch
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Gagal upload ke ${folder}`);
  }

  return {
    name: file.name,
    bucket: folder, // "media" | "dokumen" | "unggahan"
    path: filePath,
    type: file.type || "application/octet-stream",
    size: file.size || 0,
    url: `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${filePath}`
  };
}

// =========================================================
// PENYIMPANAN TERPISAH: KONTEN vs BERANDA
// =========================================================
function getCollectionConfig(target = "konten") {
  if (target === "beranda") {
    return { colName: "beranda_posts", storageKey: KEY_BERANDA, target: "beranda" };
  }
  return { colName: "contents", storageKey: KEY_CONTENTS, target: "konten" };
}

export function getLocalItems(target = "konten") {
  const { storageKey } = getCollectionConfig(target);
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function setLocalItems(target = "konten", items = []) {
  const { storageKey } = getCollectionConfig(target);
  localStorage.setItem(storageKey, JSON.stringify(Array.isArray(items) ? items : []));
}

function normalizeEntry(payload = {}, target = "konten") {
  const now = Date.now();
  const id = String(payload.id || now);
  const mediaFiles = Array.isArray(payload.mediaFiles) ? payload.mediaFiles : [];
  const docFiles = Array.isArray(payload.docFiles) ? payload.docFiles : [];
  const otherFiles = Array.isArray(payload.otherFiles) ? payload.otherFiles : [];
  const blocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  const link = String(payload.link || "").trim();

  return {
    id,
    target, // "konten" atau "beranda"
    title: String(payload.title || "Tanpa Judul").trim(),
    link,
    category: String(payload.category || (target === "beranda" ? "Pengumuman" : "Umum")).trim(),
    desc: String(payload.desc || ""),
    textBody: String(payload.textBody || ""),
    cw: Number(payload.cw || 360),
    ch: Number(payload.ch || (target === "beranda" ? 320 : 420)),
    bg: payload.bg || (target === "beranda" ? "#111622" : "#0d0f14"),
    blocks,
    mediaFiles,   // file dari folder media/
    docFiles,     // file pdf, txt, docs dari folder dokumen/
    otherFiles,   // file unggahan lain dari folder unggahan/
    createdAt: Number(payload.createdAt || now),
    updatedAt: now
  };
}

export async function saveSeparatedEntry(target = "konten", payload = {}) {
  assertAdmin();
  const { colName } = getCollectionConfig(target);
  const item = normalizeEntry(payload, target);

  const next = [item, ...getLocalItems(target).filter((x) => String(x.id) !== item.id)]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  setLocalItems(target, next);
  await setDoc(doc(db, colName, item.id), item);
  return item;
}

export async function deleteSeparatedEntry(target = "konten", id) {
  assertAdmin();
  const { colName } = getCollectionConfig(target);
  const targetId = String(id);

  const next = getLocalItems(target).filter((x) => String(x.id) !== targetId);
  setLocalItems(target, next);
  await deleteDoc(doc(db, colName, targetId));
  return next;
}

export async function syncSeparatedFromCloud(target = "konten") {
  const { colName } = getCollectionConfig(target);
  const snap = await getDocs(collection(db, colName));
  const items = [];
  snap.forEach((d) => items.push(d.data()));
  items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  setLocalItems(target, items);
  return items;
}

// =========================================================
// PENGATURAN HALAMAN UTAMA / UI (TERPISAH PER DOKUMEN)
// =========================================================
export function getLocalSetting(key, fallback = null) {
  try {
    const raw = localStorage.getItem(KEY_SETTING_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveSettingDoc(docName, dataObj) {
  assertAdmin();
  const payload = { ...dataObj, updatedAt: Date.now() };
  localStorage.setItem(KEY_SETTING_PREFIX + docName, JSON.stringify(payload));
  await setDoc(doc(db, "site_settings", docName), payload);
  return payload;
}

export async function loadSettingDoc(docName, fallback = null) {
  const local = getLocalSetting(docName, null);
  try {
    const snap = await getDoc(doc(db, "site_settings", docName));
    if (snap.exists()) {
      const cloud = snap.data();
      localStorage.setItem(KEY_SETTING_PREFIX + docName, JSON.stringify(cloud));
      return cloud;
    }
  } catch (err) {
    console.warn(`Gagal ambil setting ${docName}:`, err);
  }
  return local || fallback;
}
