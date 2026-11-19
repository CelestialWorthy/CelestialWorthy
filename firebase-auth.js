import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Ganti nilai di bawah ini dengan konfigurasi Firebase proyekmu
const firebaseConfig = {
  apiKey: "AIzaSyA9_g3hu66hmiQaOY5DGGIhUpeJG_8kOhk",
  authDomain: "celestianworthy.firebaseapp.com",
  projectId: "celestianworthy",
  appId: "1:669221323067:web:fcf6da7f8e46f0f805f71e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let currentAdminUser = null;
let authReadyResolve;
const authReadyPromise = new Promise((res) => {
  authReadyResolve = res;
});

function injectLoginModal() {
  if (document.getElementById("acAdminLoginModal")) return;

  const style = document.createElement("style");
  style.textContent = `
    #acAdminLoginModal{position:fixed;inset:0;background:rgba(9,11,16,.84);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:18px;z-index:99999;font-family:'DM Sans',sans-serif}
    #acAdminLoginModal.open{display:flex}
    .ac-auth-card{width:100%;max-width:380px;background:#11151d;border:1px solid #252b36;border-radius:16px;padding:20px;color:#f3f5f8;box-shadow:0 18px 40px rgba(0,0,0,.6)}
    .ac-auth-card h3{margin:0 0 6px;font:700 18px 'Space Grotesk',sans-serif;color:#27e0a0}
    .ac-auth-card p{margin:0 0 14px;font-size:12px;color:#9299a7;line-height:1.5}
    .ac-auth-field{margin-bottom:11px}
    .ac-auth-field label{display:block;font-size:12px;color:#cbd1dc;margin-bottom:5px}
    .ac-auth-field input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid #2b3242;background:#171c26;color:#f3f5f8;font:13px 'DM Sans',sans-serif;outline:none}
    .ac-auth-field input:focus{border-color:#27e0a0}
    .ac-auth-err{min-height:18px;font-size:12px;color:#ff6b6b;margin-bottom:8px}
    .ac-auth-btns{display:flex;gap:8px}
    .ac-auth-submit{flex:1;padding:10px 14px;border:0;border-radius:10px;background:#27e0a0;color:#04140d;font:700 13px 'DM Sans',sans-serif;cursor:pointer}
    .ac-auth-cancel{padding:10px 14px;border-radius:10px;border:1px solid #2b3242;background:#171c26;color:#f3f5f8;font:600 13px 'DM Sans',sans-serif;cursor:pointer}
  `;
  document.head.appendChild(style);

  const modal = document.createElement("div");
  modal.id = "acAdminLoginModal";
  modal.innerHTML = `
    <div class="ac-auth-card">
      <h3>Login Admin Alcrazhy</h3>
      <p>Masuk dengan akun admin Firebase untuk mengedit tampilan, menambah konten, atau mengubah profil.</p>
      <form id="acAdminLoginForm">
        <div class="ac-auth-field">
          <label for="acAdminEmail">Email Admin</label>
          <input type="email" id="acAdminEmail" required autocomplete="username" placeholder="admin@domain.com">
        </div>
        <div class="ac-auth-field">
          <label for="acAdminPassword">Password</label>
          <input type="password" id="acAdminPassword" required autocomplete="current-password" placeholder="••••••••">
        </div>
        <div class="ac-auth-err" id="acAdminLoginErr"></div>
        <div class="ac-auth-btns">
          <button type="submit" class="ac-auth-submit" id="acAdminSubmitBtn">Masuk</button>
          <button type="button" class="ac-auth-cancel" id="acAdminCancelBtn">Batal</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

let pendingLoginResolver = null;

function openLoginModal() {
  injectLoginModal();
  const modal = document.getElementById("acAdminLoginModal");
  const errEl = document.getElementById("acAdminLoginErr");
  const form = document.getElementById("acAdminLoginForm");
  const cancelBtn = document.getElementById("acAdminCancelBtn");

  errEl.textContent = "";
  modal.classList.add("open");
  document.getElementById("acAdminEmail").focus();

  return new Promise((resolve) => {
    pendingLoginResolver = resolve;

    const cleanup = () => {
      modal.classList.remove("open");
      form.onsubmit = null;
      cancelBtn.onclick = null;
    };

    cancelBtn.onclick = () => {
      cleanup();
      pendingLoginResolver = null;
      resolve(false);
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      errEl.textContent = "";
      const email = document.getElementById("acAdminEmail").value.trim();
      const pass = document.getElementById("acAdminPassword").value;
      const submitBtn = document.getElementById("acAdminSubmitBtn");
      submitBtn.disabled = true;
      submitBtn.textContent = "Memeriksa...";
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        cleanup();
        pendingLoginResolver = null;
        resolve(true);
      } catch (err) {
        errEl.textContent = "Email atau password admin salah.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Masuk";
      }
    };
  });
}

onAuthStateChanged(auth, (user) => {
  currentAdminUser = user || null;
  if (authReadyResolve) {
    authReadyResolve(currentAdminUser);
    authReadyResolve = null;
  }
  window.dispatchEvent(new CustomEvent("alcrazhy:auth-change", { detail: { user: currentAdminUser } }));
});

export async function waitAuthReady() {
  return authReadyPromise;
}

export function getAdminUser() {
  return currentAdminUser;
}

export async function requireAdminLogin() {
  await waitAuthReady();
  if (currentAdminUser) return true;
  return openLoginModal();
}

export async function logoutAdmin() {
  await signOut(auth);
}

function syncAdminVisibility(user) {
  const isLoggedIn = Boolean(user);
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    el.style.display = isLoggedIn ? "" : "none";
  });
}

window.addEventListener("alcrazhy:auth-change", (e) => {
  syncAdminVisibility(e.detail?.user || null);
});

document.addEventListener("DOMContentLoaded", () => {
  syncAdminVisibility(currentAdminUser);
});

window.AlcrazhyAuth = {
  waitAuthReady,
  getAdminUser,
  requireAdminLogin,
  openLoginModal,
  logoutAdmin
};
