// editor.js
import {
  watchAdminAuth,
  loginAdmin,
  uploadSeparatedFile,
  saveSettingDoc,
  loadSettingDoc,
  getLocalSetting
} from "./store.js";

const $ = (s) => document.querySelector(s);
const B = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  scale: 100,
  rot: 0,
  skew: 0,
  opacity: 100,
  blend: "normal",
  bw: 0,
  bc: "#ffffff",
  sh: 0
};

const COLORS = [
  "#ff3b30", "#ff9500", "#ffcc00", "#34c759",
  "#00c7be", "#007aff", "#af52de", "#ffffff",
  "#8e8e93", "#000000", "#10b981", "#d7b46a"
];
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=300&h=300&fit=crop";

let isAdmin = false;
let D = {
  name: "Eternal Heaven",
  handle: "@veyrath.halgion",
  bio: "Marga Veyrath Halgion membawa beban tradisi ribuan tahun dan keagungan yang dingin...",
  avatar: "",
  banner: "",
  ui: {},
  ...(getLocalSetting("home_profile", {}) || {}),
  ...(getLocalSetting("home_ui", {}) ? { ui: getLocalSetting("home_ui", {}) } : {})
};

const ui = {};
const HAS = typeof window.UI_TARGETS !== "undefined";
let fd = null;

if (HAS) {
  window.UI_TARGETS.forEach(([k, n, s, tc, ed]) => {
    ui[k] = {
      id: k,
      sel: s,
      name: n,
      tc,
      ed,
      ...B,
      fill: "",
      text: "",
      hide: false,
      ...((D.ui && D.ui[k]) || {})
    };
  });
}

let sel = Object.keys(ui)[0] || "card";
const list = () => Object.values(ui);
const cur = () => ui[sel] || list()[0];

// =========================================================
// AUTH GATE EDITOR
// =========================================================
const authGate = $("#editorAuthGate");
let authResolver = null;

function promptEditorLogin() {
  if (isAdmin) return Promise.resolve(true);
  authGate.classList.add("open");
  return new Promise((resolve) => {
    authResolver = resolve;
  });
}

$("#editorAuthForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#edAuthEmail").value.trim();
  const pass = $("#edAuthPass").value;
  try {
    await loginAdmin(email, pass);
    isAdmin = true;
    authGate.classList.remove("open");
    $("#editorAuthForm").reset();
    if (authResolver) {
      authResolver(true);
      authResolver = null;
    }
  } catch (err) {
    alert("Login gagal: " + err.message);
  }
});

watchAdminAuth((admin) => {
  isAdmin = admin;
  if (admin) {
    authGate.classList.remove("open");
    if (authResolver) {
      authResolver(true);
      authResolver = null;
    }
  } else {
    authGate.classList.add("open");
  }
});

// =========================================================
// PREVIEW PROFIL & HALAMAN UTAMA (IFRAME)
// =========================================================
function syncProfileToPreview() {
  if (!fd) return;
  const setTxt = (selector, val) => {
    const el = fd.querySelector(selector);
    if (el) el.textContent = val;
  };
  setTxt("#homeName, .profile-name, [data-profile='name']", D.name || "Eternal Heaven");
  setTxt("#homeHandle, .profile-handle, [data-profile='handle']", D.handle || "@veyrath.halgion");
  setTxt("#homeBio, .profile-bio, [data-profile='bio']", D.bio || "");

  const av = fd.querySelector("#homeAvatar, .profile-avatar img, [data-profile='avatar']");
  if (av) av.src = D.avatar || DEFAULT_AVATAR;

  const bn = fd.querySelector("#homeBanner, .profile-banner, [data-profile='banner']");
  if (bn) bn.style.backgroundImage = D.banner ? `url("${D.banner}")` : "";
}

function paintUI(l) {
  if (!l || !fd || typeof window.applyUI !== "function") return;
  const e = fd.querySelector(l.sel);
  if (!e) return;
  if (l.ed && !l.text && l.orig != null) e.textContent = l.orig;
  window.applyUI(fd, { [l.id]: { ...l, hide: false, opacity: l.hide ? 20 : l.opacity } }, l.id);
  e.classList.toggle("ui-sel", l.id === sel);
}

function paintAllUI() {
  list().forEach(paintUI);
}

function buildChips() {
  $("#chips").innerHTML = list().map((l) =>
    `<button type="button" class="${l.id === sel ? "sel" : ""}" data-chip="${l.id}">${l.hide ? "🚫 " : ""}${l.name}</button>`
  ).join("");
  $("#chips").querySelectorAll("[data-chip]").forEach((btn) => {
    btn.addEventListener("click", () => select(btn.getAttribute("data-chip")));
  });
}

function buildTimeline() {
  const items = list();
  const w = Math.max(260, $("#tl").clientWidth - 16);
  $("#tlin").style.width = w + "px";
  $("#tracks").style.height = items.length * 34 + 12 + "px";
  $("#tracks").innerHTML = items.map((l, i) => {
    const icon = l.hide ? "🚫 " : "◻ ";
    return `<div class="clip ${l.id === sel ? "sel" : ""}" data-id="${l.id}" style="left:8px;width:calc(100% - 16px);top:${6 + i * 34}px">${icon}${l.name}</div>`;
  }).join("");
}

function select(id) {
  if (!ui[id]) return;
  sel = id;
  paintAllUI();
  buildChips();
  buildTimeline();
}

$("#tracks").addEventListener("click", (e) => {
  const c = e.target.closest(".clip");
  if (!c) return;
  select(c.dataset.id);
});

function moveLayerOrder(id, toIdx) {
  const keys = Object.keys(ui);
  const from = keys.indexOf(id);
  if (from < 0) return;
  const clamped = Math.max(0, Math.min(keys.length - 1, toIdx));
  if (from === clamped) return;

  const [k] = keys.splice(from, 1);
  keys.splice(clamped, 0, k);

  const next = {};
  keys.forEach((key, i) => {
    next[key] = ui[key];
    if (fd) {
      const el = fd.querySelector(ui[key].sel);
      if (el) el.style.zIndex = keys.length - i;
    }
  });
  Object.keys(ui).forEach((key) => delete ui[key]);
  Object.assign(ui, next);
  buildChips();
  buildTimeline();
}

function shiftLayer(dir) {
  const l = cur();
  if (!l) return;
  const arr = list();
  const idx = arr.indexOf(l);
  moveLayerOrder(l.id, idx + dir);
  if ($("#sheet").classList.contains("on")) sheet("edit");
}

function fit() {
  const p = $("#pstage");
  const f = $("#frame");
  if (!p || !f) return;
  const W = Math.max(360, Math.min(innerWidth, 430));
  const s = p.clientWidth / W;
  f.style.width = W + "px";
  let H = p.clientHeight / s;
  try {
    if (fd) H = Math.max(H, fd.documentElement.scrollHeight);
  } catch {}
  f.style.height = H + "px";
  f.style.transform = `scale(${s})`;
  $("#fw").style.height = H * s + "px";
}

$("#frame").onload = () => {
  try {
    fd = $("#frame").contentDocument;
    void fd.body;
  } catch {
    fd = null;
  }
  if (!fd) return;

  const st = fd.createElement("style");
  st.textContent = ".ui-sel{outline:2px solid #27e0a0!important;outline-offset:2px}";
  fd.head.appendChild(st);

  list().forEach((l) => {
    const e = fd.querySelector(l.sel);
    if (e && l.ed) l.orig = e.textContent;
  });

  fd.addEventListener("click", (ev) => {
    if (ev.target.closest("a,button")) ev.preventDefault();
  }, true);

  syncProfileToPreview();
  paintAllUI();
  fit();
  setTimeout(fit, 350);
  buildChips();
  buildTimeline();
};

addEventListener("resize", fit);

// =========================================================
// UPLOAD AVATAR & BANNER KE FOLDER media/
// =========================================================
$("#editAvatarFile").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;
  if (!(await promptEditorLogin())) { this.value = ""; return; }
  try {
    const up = await uploadSeparatedFile(file, "media");
    D.avatar = up.url;
    syncProfileToPreview();
    alert("Avatar diunggah ke folder media/!");
  } catch (err) {
    alert("Gagal upload avatar: " + err.message);
  } finally {
    this.value = "";
  }
});

$("#editBannerFile").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;
  if (!(await promptEditorLogin())) { this.value = ""; return; }
  try {
    const up = await uploadSeparatedFile(file, "media");
    D.banner = up.url;
    syncProfileToPreview();
    alert("Banner diunggah ke folder media/!");
  } catch (err) {
    alert("Gagal upload banner: " + err.message);
  } finally {
    this.value = "";
  }
});

$("#resetAvatarBtn").addEventListener("click", () => {
  D.avatar = "";
  syncProfileToPreview();
});

$("#resetBannerBtn").addEventListener("click", () => {
  D.banner = "";
  syncProfileToPreview();
});

// =========================================================
// SHEET PROPERTI HALAMAN UTAMA
// =========================================================
const SL = {
  move: ["Move & Transform", [
    ["x", "Geser X", -250, 250, "px"],
    ["y", "Geser Y", -400, 400, "px"],
    ["w", "Lebar (0=asli)", 0, 420, "px"],
    ["h", "Tinggi (0=asli)", 0, 500, "px"],
    ["scale", "Skala", 20, 200, "%"],
    ["rot", "Rotasi", -180, 180, "°"],
    ["skew", "Kemiringan", -45, 45, "°"]
  ]],
  border: ["Border & Bayangan", [
    ["bw", "Tebal Border", 0, 12, "px"],
    ["sh", "Bayangan", 0, 40, "px"]
  ]],
  blend: ["Blending & Opacity", [
    ["opacity", "Opacity", 0, 100, "%"]
  ]]
};

function orderControls(l) {
  const arr = list();
  const idx = arr.indexOf(l);
  return `<label>Urutan Layer<span>#${idx + 1} dari ${arr.length}</span></label>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button type="button" class="up" style="margin-top:0;flex:1" id="shiftUpBtn">↑ Naikkan</button>
      <button type="button" class="up" style="margin-top:0;flex:1" id="shiftDownBtn">↓ Turunkan</button>
    </div>`;
}

function sheet(k) {
  const s = $("#sheet");
  const l = cur();
  if (!l) return;
  let h = "";
  const head = (tTitle) => `<div class="sh-h"><span>${tTitle}</span><button type="button" id="closeSheetBtn">✕</button></div>`;

  if (SL[k]) {
    h = head(SL[k][0]) + SL[k][1].map(([p, n, a, b, u]) => `
      <label>${n}<span id="v_${p}">${l[p] || 0}${u}</span></label>
      <input type="range" min="${a}" max="${b}" value="${l[p] || 0}" data-prop="${p}" data-unit="${u}">
    `).join("");
    if (k === "border") {
      h += `<label>Warna Border</label><input type="color" value="${l.bc || "#ffffff"}" id="edBcPick" style="width:100%;height:40px;background:none;border:0">`;
    }
    if (k === "blend") {
      h += `<label>Mode Blending</label><select id="edBlendSel">${["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference"].map((m) => `<option ${l.blend === m ? "selected" : ""}>${m}</option>`).join("")}</select>`;
    }
  } else if (k === "fill") {
    h = head("Color & Fill") + `<div class="sw">${COLORS.map((c) => `<div style="background:${c}" data-fill="${c}"></div>`).join("")}<div style="display:grid;place-items:center;color:#8f97a6" data-fill="">✕</div></div><label>Warna kustom</label><input type="color" id="edCustomFill" style="width:100%;height:40px;background:none;border:0">`;
  } else if (k === "edit") {
    h = head("Edit " + l.name) +
      orderControls(l) +
      (l.ed
        ? `<label>Teks Elemen</label><input type="text" id="edUiText" value="${String(l.text || l.orig || "").replace(/"/g, "&quot;")}">`
        : `<p style="color:var(--mu);font-size:13px">Elemen ini tidak punya teks khusus.</p>`) +
      `<hr style="border:0;border-top:1px solid var(--ln);margin:14px 0">` +
      `<label>Nama Komunitas</label><input type="text" id="edProfName" value="${String(D.name || "").replace(/"/g, "&quot;")}">` +
      `<label>Handle</label><input type="text" id="edProfHandle" value="${String(D.handle || "").replace(/"/g, "&quot;")}">` +
      `<label>Bio</label><textarea rows="3" id="edProfBio">${D.bio || ""}</textarea>` +
      `<button type="button" class="up" id="edPickBannerBtn">📁 Ganti Banner (media/)</button>` +
      `<button type="button" class="up" id="edPickAvatarBtn">📁 Ganti Avatar (media/)</button>`;
  }

  s.innerHTML = h;
  s.classList.add("on");
  bindSheetActions();
}

function closeSheet() {
  $("#sheet").classList.remove("on");
}

function bindSheetActions() {
  const s = $("#sheet");
  $("#closeSheetBtn")?.addEventListener("click", closeSheet);
  $("#shiftUpBtn")?.addEventListener("click", () => shiftLayer(-1));
  $("#shiftDownBtn")?.addEventListener("click", () => shiftLayer(1));

  s.querySelectorAll("input[type=range][data-prop]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const l = cur();
      if (!l) return;
      const p = inp.getAttribute("data-prop");
      const u = inp.getAttribute("data-unit") || "";
      l[p] = +inp.value;
      const vEl = $("#v_" + p);
      if (vEl) vEl.textContent = inp.value + u;
      paintUI(l);
    });
  });

  $("#edBcPick")?.addEventListener("input", (e) => {
    const l = cur();
    if (!l) return;
    l.bc = e.target.value;
    paintUI(l);
  });

  $("#edBlendSel")?.addEventListener("change", (e) => {
    const l = cur();
    if (!l) return;
    l.blend = e.target.value;
    paintUI(l);
  });

  s.querySelectorAll("[data-fill]").forEach((sw) => {
    sw.addEventListener("click", () => {
      const l = cur();
      if (!l) return;
      l.fill = sw.getAttribute("data-fill");
      paintUI(l);
    });
  });

  $("#edCustomFill")?.addEventListener("input", (e) => {
    const l = cur();
    if (!l) return;
    l.fill = e.target.value;
    paintUI(l);
  });

  $("#edUiText")?.addEventListener("input", (e) => {
    const l = cur();
    if (!l) return;
    l.text = e.target.value;
    paintUI(l);
  });

  $("#edProfName")?.addEventListener("input", (e) => {
    D.name = e.target.value;
    syncProfileToPreview();
  });

  $("#edProfHandle")?.addEventListener("input", (e) => {
    D.handle = e.target.value;
    syncProfileToPreview();
  });

  $("#edProfBio")?.addEventListener("input", (e) => {
    D.bio = e.target.value;
    syncProfileToPreview();
  });

  $("#edPickBannerBtn")?.addEventListener("click", () => pickUploadToMedia((url) => {
    D.banner = url;
    syncProfileToPreview();
  }));

  $("#edPickAvatarBtn")?.addEventListener("click", () => pickUploadToMedia((url) => {
    D.avatar = url;
    syncProfileToPreview();
  }));
}

function pickUploadToMedia(cb) {
  const f = $("#file");
  f.value = "";
  f.onchange = async () => {
    const file = f.files[0];
    if (!file) return;
    if (!(await promptEditorLogin())) { f.value = ""; return; }
    try {
      const up = await uploadSeparatedFile(file, "media");
      cb(up.url);
    } catch (err) {
      alert("Gagal upload media: " + err.message);
    } finally {
      f.value = "";
    }
  };
  f.click();
}

function resetSelectedLayer() {
  const l = cur();
  if (!l) return;
  Object.assign(l, { ...B, fill: "", text: "", hide: false });
  paintUI(l);
  buildChips();
  buildTimeline();
}

function toggleHideSelectedLayer() {
  const l = cur();
  if (!l) return;
  l.hide = !l.hide;
  paintUI(l);
  buildChips();
  buildTimeline();
}

document.querySelectorAll("[data-sheet]").forEach((btn) => {
  btn.addEventListener("click", () => sheet(btn.getAttribute("data-sheet")));
});
$("#bReset")?.addEventListener("click", resetSelectedLayer);
$("#bHide")?.addEventListener("click", toggleHideSelectedLayer);

// =========================================================
// SIMPAN PERUBAHAN KE FIRESTORE (store.js)
// =========================================================
function cleanUndefined(val) {
  if (Array.isArray(val)) {
    return val.map(cleanUndefined);
  }
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) out[k] = cleanUndefined(v);
    }
    return out;
  }
  return val === undefined ? null : val;
}

$("#saveEditorBtn")?.addEventListener("click", async () => {
  if (!(await promptEditorLogin())) return;

  const savedUi = {};
  list().forEach((l) => {
    if (typeof window.uiDirty === "function" && window.uiDirty(l)) {
      const { orig, ...rest } = l;
      savedUi[l.id] = cleanUndefined({
        ...rest,
        fill: rest.fill || "",
        text: rest.text || "",
        hide: Boolean(rest.hide)
      });
    }
  });

  try {
    await saveSettingDoc("home_profile", cleanUndefined({
      name: D.name || "Eternal Heaven",
      handle: D.handle || "@veyrath.halgion",
      bio: D.bio || "",
      avatar: D.avatar || "",
      banner: D.banner || ""
    }));
    await saveSettingDoc("home_ui", cleanUndefined(savedUi));
    alert("Perubahan berhasil disimpan!");
    location.href = "index.html";
  } catch (err) {
    alert("Gagal menyimpan: " + err.message);
  }
});

// =========================================================
// INISIALISASI AWAL
// =========================================================
buildChips();
buildTimeline();

Promise.all([
  loadSettingDoc("home_profile", null),
  loadSettingDoc("home_ui", null)
]).then(([prof, remoteUi]) => {
  if (prof) {
    D = { ...D, ...prof };
    syncProfileToPreview();
  }
  if (remoteUi && typeof remoteUi === "object") {
    Object.keys(remoteUi).forEach((k) => {
      if (ui[k]) Object.assign(ui[k], remoteUi[k]);
    });
    paintAllUI();
    buildChips();
    buildTimeline();
  }
});
