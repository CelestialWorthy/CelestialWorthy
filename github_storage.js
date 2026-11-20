const GH_CFG_KEY = "alcrazhy_gh_config";
const GH_TOKEN_KEY = "alcrazhy_gh_token";

const DEFAULT_GH_CONFIG = {
  owner: "CelestialWorthy",
  repo: "CelestialWorthy",
  branch: "main",
  communityPath: "data/community.json",
  profilePath: "data/profile.json"
};

function getGhConfig() {
  try {
    return { ...DEFAULT_GH_CONFIG, ...JSON.parse(localStorage.getItem(GH_CFG_KEY) || "{}") };
  } catch (e) {
    return { ...DEFAULT_GH_CONFIG };
  }
}

function saveGhConfig(nextCfg) {
  const merged = { ...getGhConfig(), ...nextCfg };
  localStorage.setItem(GH_CFG_KEY, JSON.stringify(merged));
  return merged;
}

function getGhToken() {
  return sessionStorage.getItem(GH_TOKEN_KEY) || localStorage.getItem(GH_TOKEN_KEY) || "";
}

function setGhToken(token, persist = false) {
  const clean = String(token || "").trim();
  sessionStorage.removeItem(GH_TOKEN_KEY);
  localStorage.removeItem(GH_TOKEN_KEY);
  if (!clean) return;
  if (persist) {
    localStorage.setItem(GH_TOKEN_KEY, clean);
  } else {
    sessionStorage.setItem(GH_TOKEN_KEY, clean);
  }
}

function encodeBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function decodeBase64Utf8(b64) {
  const bin = atob(String(b64 || "").replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function injectGhConfigModal() {
  if (document.getElementById("acGhConfigModal")) return;

  const style = document.createElement("style");
  style.textContent = `
    #acGhConfigModal{position:fixed;inset:0;background:rgba(9,11,16,.84);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:18px;z-index:99999;font-family:'DM Sans',sans-serif}
    #acGhConfigModal.open{display:flex}
    .ac-gh-card{width:100%;max-width:410px;background:#11151d;border:1px solid #252b36;border-radius:16px;padding:20px;color:#f3f5f8;box-shadow:0 18px 40px rgba(0,0,0,.6)}
    .ac-gh-card h3{margin:0 0 6px;font:700 18px 'Space Grotesk',sans-serif;color:#27e0a0}
    .ac-gh-card p{margin:0 0 14px;font-size:12px;color:#9299a7;line-height:1.5}
    .ac-gh-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .ac-gh-field{margin-bottom:11px}
    .ac-gh-field label{display:block;font-size:12px;color:#cbd1dc;margin-bottom:5px}
    .ac-gh-field input{width:100%;padding:9px 11px;border-radius:10px;border:1px solid #2b3242;background:#171c26;color:#f3f5f8;font:13px 'DM Sans',sans-serif;outline:none}
    .ac-gh-field input:focus{border-color:#27e0a0}
    .ac-gh-chk{display:flex;align-items:center;gap:8px;font-size:12px;color:#9299a7;margin-bottom:14px}
    .ac-gh-btns{display:flex;gap:8px}
    .ac-gh-save{flex:1;padding:10px 14px;border:0;border-radius:10px;background:#27e0a0;color:#04140d;font:700 13px 'DM Sans',sans-serif;cursor:pointer}
    .ac-gh-cancel{padding:10px 14px;border-radius:10px;border:1px solid #2b3242;background:#171c26;color:#f3f5f8;font:600 13px 'DM Sans',sans-serif;cursor:pointer}
  `;
  document.head.appendChild(style);

  const modal = document.createElement("div");
  modal.id = "acGhConfigModal";
  modal.innerHTML = `
    <div class="ac-gh-card">
      <h3>Konfigurasi GitHub Storage</h3>
      <p>Atur repository tujuan dan Fine-grained PAT (izin Contents: Read &amp; Write) untuk menyimpan data secara permanen ke GitHub.</p>
      <form id="acGhConfigForm">
        <div class="ac-gh-row">
          <div class="ac-gh-field">
            <label for="acGhOwner">Owner / Username</label>
            <input type="text" id="acGhOwner" required>
          </div>
          <div class="ac-gh-field">
            <label for="acGhRepo">Nama Repository</label>
            <input type="text" id="acGhRepo" required>
          </div>
        </div>
        <div class="ac-gh-row">
          <div class="ac-gh-field">
            <label for="acGhBranch">Branch</label>
            <input type="text" id="acGhBranch" required>
          </div>
          <div class="ac-gh-field">
            <label for="acGhCommunityPath">Path Data Komunitas</label>
            <input type="text" id="acGhCommunityPath" required>
          </div>
        </div>
        <div class="ac-gh-field">
          <label for="acGhProfilePath">Path Data Profil</label>
          <input type="text" id="acGhProfilePath" required>
        </div>
        <div class="ac-gh-field">
          <label for="acGhToken">GitHub Token (PAT)</label>
          <input type="password" id="acGhToken" placeholder="github_pat_... atau ghp_...">
        </div>
        <label class="ac-gh-chk">
          <input type="checkbox" id="acGhPersist">
          <span>Simpan token di browser ini (jika tidak dicentang, hanya aktif selama sesi tab)</span>
        </label>
        <div class="ac-gh-btns">
          <button type="submit" class="ac-gh-save">Simpan Konfigurasi</button>
          <button type="button" class="ac-gh-cancel" id="acGhCancelBtn">Batal</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function openGhConfigModal() {
  injectGhConfigModal();
  const cfg = getGhConfig();
  const modal = document.getElementById("acGhConfigModal");
  const form = document.getElementById("acGhConfigForm");
  const cancelBtn = document.getElementById("acGhCancelBtn");

  document.getElementById("acGhOwner").value = cfg.owner;
  document.getElementById("acGhRepo").value = cfg.repo;
  document.getElementById("acGhBranch").value = cfg.branch;
  document.getElementById("acGhCommunityPath").value = cfg.communityPath;
  document.getElementById("acGhProfilePath").value = cfg.profilePath;
  document.getElementById("acGhToken").value = getGhToken();
  document.getElementById("acGhPersist").checked = Boolean(localStorage.getItem(GH_TOKEN_KEY));

  modal.classList.add("open");

  return new Promise((resolve) => {
    const cleanup = () => {
      modal.classList.remove("open");
      form.onsubmit = null;
      cancelBtn.onclick = null;
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      saveGhConfig({
        owner: document.getElementById("acGhOwner").value.trim(),
        repo: document.getElementById("acGhRepo").value.trim(),
        branch: document.getElementById("acGhBranch").value.trim() || "main",
        communityPath: document.getElementById("acGhCommunityPath").value.trim() || "data/community.json",
        profilePath: document.getElementById("acGhProfilePath").value.trim() || "data/profile.json"
      });
      setGhToken(document.getElementById("acGhToken").value, document.getElementById("acGhPersist").checked);
      cleanup();
      resolve(true);
    };
  });
}

async function ensureGhReady() {
  const cfg = getGhConfig();
  const token = getGhToken();
  const placeholder =
    !cfg.owner ||
    !cfg.repo ||
    cfg.owner.startsWith("ISI_") ||
    cfg.repo.startsWith("ISI_") ||
    !token;

  if (!placeholder) return true;
  return openGhConfigModal();
}

async function getFileSha(path, cfg, token) {
  const cleanPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cleanPath}?ref=${encodeURIComponent(cfg.branch)}&_=${Date.now()}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal membaca file di GitHub (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.sha || null;
}

async function commitJsonToGitHub(path, payload, message, attempt = 0) {
  const ok = await ensureGhReady();
  if (!ok) {
    throw new Error("Konfigurasi GitHub dibatalkan.");
  }

  const cfg = getGhConfig();
  const token = getGhToken();
  const sha = await getFileSha(path, cfg, token);

  const cleanPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cleanPath}`;
  const body = {
    message: message || `Update ${path} via Alcrazhy Admin`,
    content: encodeBase64Utf8(JSON.stringify(payload, null, 2)),
    branch: cfg.branch
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (res.status === 409 && attempt < 2) {
    return commitJsonToGitHub(path, payload, message, attempt + 1);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal menyimpan ke GitHub (${res.status}): ${errText}`);
  }
  return res.json();
}

async function fetchJsonFromGitHub(path) {
  const cfg = getGhConfig();
  if (!cfg.owner || !cfg.repo || cfg.owner.startsWith("ISI_") || cfg.repo.startsWith("ISI_")) {
    return null;
  }
  const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/${encodeURIComponent(cfg.branch)}/${encodeURIComponent(path).replace(/%2F/g, "/")}?t=${Date.now()}`;
  const res = await fetch(rawUrl);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

async function saveCommunityData(dataObj, commitMessage) {
  localStorage.setItem("alcrazhyCommunity", JSON.stringify(dataObj));
  const cfg = getGhConfig();
  return commitJsonToGitHub(cfg.communityPath, dataObj, commitMessage || "Update community data");
}

async function saveProfileData(profileObj, commitMessage) {
  localStorage.setItem("alcrazhyUserProfile", JSON.stringify(profileObj));

  const cfg = getGhConfig();
  const targetPath = cfg.communityPath || "data/community.json";

  let existingCommunity = {};
  try {
    if (typeof fetchJsonFromGitHub === "function") {
      const remote = await fetchJsonFromGitHub(targetPath);
      if (remote && typeof remote === "object") {
        existingCommunity = remote;
      }
    }
  } catch (_) {}

  if (!Object.keys(existingCommunity).length) {
    try {
      const localComm = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
      if (localComm && typeof localComm === "object") {
        existingCommunity = localComm;
      }
    } catch (_) {}
  }

  const nextCommunityPayload = {
    ...existingCommunity,
    profile: profileObj
  };

  localStorage.setItem("alcrazhyCommunity", JSON.stringify(nextCommunityPayload));

  return commitJsonToGitHub(
    targetPath,
    nextCommunityPayload,
    commitMessage || "Update user profile"
  );
}

async function syncFromGitHub() {
  const cfg = getGhConfig();
  const ghComm = await fetchJsonFromGitHub(cfg.communityPath);

  let ghProf = null;
  if (ghComm && typeof ghComm === "object") {
    localStorage.setItem("alcrazhyCommunity", JSON.stringify(ghComm));
    if (ghComm.profile && typeof ghComm.profile === "object") {
      ghProf = ghComm.profile;
    }
  }

  if (!ghProf && cfg.profilePath) {
    try {
      const fetchedProf = await fetchJsonFromGitHub(cfg.profilePath);
      if (fetchedProf && typeof fetchedProf === "object") {
        ghProf = fetchedProf;
      }
    } catch (_) {}
  }

  if (ghProf && typeof ghProf === "object") {
    localStorage.setItem("alcrazhyUserProfile", JSON.stringify(ghProf));
  }

  return { community: ghComm, profile: ghProf };
}

window.AlcrazhyGitHub = {
  getGhConfig,
  saveGhConfig,
  getGhToken,
  setGhToken,
  openGhConfigModal,
  commitJsonToGitHub,
  fetchJsonFromGitHub,
  saveCommunityData,
  saveProfileData,
  syncFromGitHub,
  decodeBase64Utf8
};
