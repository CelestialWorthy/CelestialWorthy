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
const DUR = 10;
const PX = 60;
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
  sh: 0,
  start: 0,
  dur: DUR
};

const COLORS = ["#ff3b30","#ff9500","#ffcc00","#34c759","#00c7be","#007aff","#af52de","#ffffff","#8e8e93","#000000","#10b981","#d7b46a"];
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=300&h=300&fit=crop";

let isAdmin = false;
let D = {
  name: "Eternal Heaven",
  handle: "@veyrath.halgion",
  bio: "Marga Veyrath Halgion membawa beban tradisi ribuan tahun dan keagungan yang dingin...",
  avatar: "",
  banner: "",
  layers: [],
  ui: {},
  ...(getLocalSetting("home_profile", {}) || {}),
  ...(getLocalSetting("editor_studio", {}) || {})
};

let layers = [{ id: "profile", type: "profile", name: "Card Profil", ...B, ...(D.profileFx || {}) }, ...(D.layers || [])];
let sel = "profile";
let t = 0;
let playing = false;
let prev = 0;
let uid = Date.now();
let mode = "kartu";

const ui = {};
const list = () => (mode === "kartu" ? layers : Object.values(ui));
const cur = () => list().find((l) => l.id === sel);
const fmt = (s) => Math.floor(s / 60) + ":" + (s % 60).toFixed(1).padStart(4, "0");

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
// RENDER KANVAS & PROFIL
// =========================================================
function elOf(l) {
  if (l.type === "profile") return $("#profile");
  let e = document.getElementById("L" + l.id);
  if (!e) {
    e = document.createElement("div");
    e.id = "L" + l.id;
    e.className = "lyr";
    e.dataset.id = l.id;
    $("#stage").appendChild(e);
  }
  return e;
}

function paint(l) {
  if (l.sel) return paintUI(l);
  const e = elOf(l);
  const ex = l.type !== "profile";
  const idx = layers.indexOf(l);
  e.style.zIndex = idx >= 0 ? (layers.length - idx) : 1;
  e.style.display = (t >= l.start && t <= l.start + l.dur) ? "" : "none";
  e.style.transform = (ex ? "translate(-50%,-50%) " : "") + `translate(${l.x}px,${l.y}px) rotate(${l.rot}deg) skewX(${l.skew}deg) scale(${l.scale / 100})`;
  e.style.opacity = l.opacity / 100;
  e.style.mixBlendMode = l.blend;
  e.style.border = l.bw ? `${l.bw}px solid ${l.bc}` : "";
  e.style.boxShadow = l.sh ? `0 ${l.sh / 2}px ${l.sh}px rgba(0,0,0,.65)` : "";
  e.classList.toggle("sel", l.id === sel);

  if (l.type === "profile") {
    e.style.background = l.fill || "";
    return;
  }
  e.style.position = "absolute";
  e.style.left = "50%";
  e.style.top = "50%";
  if (l.type === "square" || l.type === "circle") {
    e.style.width = (l.w || 120) + "px";
    e.style.height = (l.h || 120) + "px";
    e.style.background = l.fill || "#27e0a0";
    e.style.borderRadius = l.type === "circle" ? "50%" : "8px";
  }
  if (l.type === "text") {
    e.textContent = l.text;
    e.style.color = l.fill || "#fff";
    e.style.font = "700 28px 'Space Grotesk'";
    e.style.whiteSpace = "nowrap";
  }
  if (l.type === "image") {
    e.style.width = (l.w || 140) + "px";
    e.style.height = (l.h || 140) + "px";
    e.style.background = `center/contain no-repeat url("${l.src}")`;
  }
}

function loadProfile() {
  $("#pName").textContent = D.name || "Eternal Heaven";
  $("#pHandle").textContent = D.handle || "@veyrath.halgion";
  $("#pBio").textContent = D.bio || "Marga Veyrath Halgion membawa beban tradisi ribuan tahun...";
  $("#pAvatar").src = D.avatar || DEFAULT_AVATAR;
  $("#pBanner").style.backgroundImage = D.banner ? `url("${D.banner}")` : "";
}

function paintAll() {
  layers.forEach(paint);
  $("#cnt").textContent = layers.length + " layer";
}

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
    loadProfile();
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
    loadProfile();
    alert("Banner diunggah ke folder media/!");
  } catch (err) {
    alert("Gagal upload banner: " + err.message);
  } finally {
    this.value = "";
  }
});

$("#resetAvatarBtn").addEventListener("click", () => {
  D.avatar = "";
  loadProfile();
});

$("#resetBannerBtn").addEventListener("click", () => {
  D.banner = "";
  loadProfile();
});

// =========================================================
// URUTAN LAYER & TIMELINE
// =========================================================
function applyOrderData(id, toIdx, rebuild) {
  if (mode === "kartu") {
    const from = layers.findIndex((x) => x.id === id);
    if (from < 0) return false;
    const clamped = Math.max(0, Math.min(layers.length - 1, toIdx));
    if (from === clamped) return false;
    const [item] = layers.splice(from, 1);
    layers.splice(clamped, 0, item);
    paintAll();
    if (rebuild) buildTimeline();
    return true;
  }
  const keys = Object.keys(ui);
  const from = keys.indexOf(id);
  if (from < 0) return false;
  const clamped = Math.max(0, Math.min(keys.length - 1, toIdx));
  if (from === clamped) return false;
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
  if (rebuild) buildTimeline();
  return true;
}

function moveLayerOrder(id, toIdx) {
  applyOrderData(id, toIdx, true);
}

function shiftLayer(dir) {
  const l = cur();
  if (!l) return;
  const arr = mode === "kartu" ? layers : Object.values(ui);
  const idx = arr.indexOf(l);
  moveLayerOrder(l.id, idx + dir);
  if ($("#sheet").classList.contains("on")) sheet("edit");
}

function clipRowHtml(l, i, isCard) {
  const icon = isCard ? ({ profile: "👁", square: "⬛", circle: "⚫", text: "Aa", image: "🖼" }[l.type]) : (l.hide ? "🚫 " : "◻ ");
  const posStyle = isCard ? `left:${l.start * PX}px;width:${l.dur * PX}px;top:${6 + i * 34}px` : `left:8px;width:calc(100% - 16px);top:${6 + i * 34}px`;
  return `<div class="clip ${l.id === sel ? "sel" : ""}" data-id="${l.id}" style="${posStyle};touch-action:pan-y;transition:top .12s ease">${icon} ${l.name}</div>`;
}

function buildTimeline() {
  if (mode === "kartu") {
    const w = DUR * PX;
    $("#tlin").style.width = w + 60 + "px";
    $("#ruler").style.display = "";
    $("#head").style.display = "";
    let h = "";
    for (let i = 0; i <= DUR * 2; i++) {
      const h2 = i % 2;
      h += `<div class="tick ${h2 ? "h" : ""}" style="left:${i * PX / 2}px">${h2 ? "" : fmt(i / 2).replace(".0", "")}</div>`;
    }
    $("#ruler").innerHTML = h;
    $("#tracks").style.height = layers.length * 34 + 12 + "px";
    $("#tracks").innerHTML = layers.map((l, i) => clipRowHtml(l, i, true)).join("");
    moveHead();
  } else {
    const items = Object.values(ui);
    const w = Math.max(260, $("#tl").clientWidth - 16);
    $("#tlin").style.width = w + "px";
    $("#ruler").style.display = "none";
    $("#head").style.display = "none";
    $("#tracks").style.height = items.length * 34 + 12 + "px";
    $("#tracks").innerHTML = items.map((l, i) => clipRowHtml(l, i, false)).join("");
  }
}

function moveHead() {
  $("#head").style.left = t * PX + "px";
  $("#tNow").textContent = fmt(t);
}

function seek(x) {
  const r = $("#ruler").getBoundingClientRect();
  t = Math.max(0, Math.min(DUR, (x - r.left) / PX));
  moveHead();
  layers.forEach(paint);
}

$("#ruler").addEventListener("pointerdown", (e) => {
  $("#ruler").setPointerCapture(e.pointerId);
  seek(e.clientX);
  playing = false;
  $("#playBtn").textContent = "▶";
});

$("#ruler").addEventListener("pointermove", (e) => {
  if (e.buttons) seek(e.clientX);
});

$("#tracks").addEventListener("click", (e) => {
  const c = e.target.closest(".clip");
  if (!c) return;
  select(c.dataset.id);
});

function togglePlay() {
  playing = !playing;
  $("#playBtn").textContent = playing ? "⏸" : "▶";
  if (playing) {
    if (t >= DUR) t = 0;
    prev = performance.now();
    requestAnimationFrame(tick);
  }
}

function tick(n) {
  if (!playing) return;
  t = Math.min(DUR, t + (n - prev) / 1000);
  prev = n;
  moveHead();
  layers.forEach(paint);
  if (t >= DUR) {
    playing = false;
    $("#playBtn").textContent = "▶";
  } else {
    requestAnimationFrame(tick);
  }
}

$("#playBtn").addEventListener("click", togglePlay);

// =========================================================
// PILIH, GESER & SHEET PROPERTI
// =========================================================
function select(id) {
  if (sel === id) return;
  sel = id;
  list().forEach(paint);
  buildTimeline();
  if (mode !== "kartu") buildChips();
}

$("#stage").addEventListener("pointerdown", (e) => {
  const n = e.target.closest(".lyr");
  if (!n) return;
  select(n.dataset.id);
  const l = cur();
  const sx = e.clientX;
  const sy = e.clientY;
  const x0 = l.x;
  const y0 = l.y;
  n.setPointerCapture(e.pointerId);
  const mv = (ev) => {
    l.x = Math.round(x0 + ev.clientX - sx);
    l.y = Math.round(y0 + ev.clientY - sy);
    paint(l);
  };
  n.addEventListener("pointermove", mv);
  n.addEventListener("pointerup", () => n.removeEventListener("pointermove", mv), { once: true });
});

const SL = {
  move: ["Move & Transform", [["x","Geser X",-250,250,"px"],["y","Geser Y",-400,400,"px"],["w","Lebar (0=asli)",0,420,"px"],["h","Tinggi (0=asli)",0,500,"px"],["scale","Skala",20,200,"%"],["rot","Rotasi",-180,180,"°"],["skew","Kemiringan",-45,45,"°"]]],
  border: ["Border & Bayangan", [["bw","Tebal Border",0,12,"px"],["sh","Bayangan",0,40,"px"]]],
  blend: ["Blending & Opacity", [["opacity","Opacity",0,100,"%"]]]
};

function orderControls(l) {
  const arr = mode === "kartu" ? layers : Object.values(ui);
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
  let h = "";
  const head = (tTitle) => `<div class="sh-h"><span>${tTitle}</span><button type="button" id="closeSheetBtn">✕</button></div>`;

  if (k === "add") {
    h = head("Tambah Elemen") + `<div class="grid">
      <button type="button" data-add="square"><span>⬛</span>Persegi</button>
      <button type="button" data-add="circle"><span>⚫</span>Lingkaran</button>
      <button type="button" data-add="text"><span>Aa</span>Teks</button>
      <button type="button" id="pickAddImgBtn"><span>🖼</span>Gambar</button>
    </div>`;
  } else if (SL[k]) {
    h = head(SL[k][0]) + SL[k][1].map(([p, n, a, b, u]) => `
      <label>${n}<span id="v_${p}">${l[p] || 0}${u}</span></label>
      <input type="range" min="${a}" max="${b}" value="${l[p] || 0}" data-prop="${p}" data-unit="${u}">
    `).join("");
    if (k === "border") h += `<label>Warna Border</label><input type="color" value="${l.bc}" id="edBcPick" style="width:100%;height:40px;background:none;border:0">`;
    if (k === "blend") h += `<label>Mode Blending</label><select id="edBlendSel">${["normal","multiply","screen","overlay","darken","lighten","difference"].map((m) => `<option ${l.blend === m ? "selected" : ""}>${m}</option>`).join("")}</select>`;
  } else if (k === "fill") {
    h = head("Color & Fill") + `<div class="sw">${COLORS.map((c) => `<div style="background:${c}" data-fill="${c}"></div>`).join("")}<div style="display:grid;place-items:center;color:#8f97a6" data-fill="">✕</div></div><label>Warna kustom</label><input type="color" id="edCustomFill" style="width:100%;height:40px;background:none;border:0">`;
  } else if (k === "edit") {
    if (l.sel) h = head("Edit " + l.name) + orderControls(l) + (l.ed ? `<label>Teks</label><input type="text" id="edUiText" value="${String(l.text || l.orig || "").replace(/"/g, "&quot;")}">` : `<p style="color:var(--mu);font-size:13px">Elemen ini tidak punya teks.</p>`);
    else if (l.type === "profile") h = head("Edit Card Profil") + orderControls(l) + `<label>Nama</label><input type="text" id="edProfName" value="${String(D.name || "").replace(/"/g, "&quot;")}"><label>Handle</label><input type="text" id="edProfHandle" value="${String(D.handle || "").replace(/"/g, "&quot;")}"><label>Bio</label><textarea rows="3" id="edProfBio">${D.bio || ""}</textarea><button type="button" class="up" id="edPickBannerBtn">📁 Ganti Banner (media/)</button><button type="button" class="up" id="edPickAvatarBtn">📁 Ganti Avatar (media/)</button>`;
    else if (l.type === "text") h = head("Edit Teks") + orderControls(l) + `<input type="text" id="edLayerText" value="${String(l.text || "").replace(/"/g, "&quot;")}">`;
    else if (l.type === "image") h = head("Edit Gambar") + orderControls(l) + `<button type="button" class="up" id="edReplaceImgBtn">📁 Ganti Gambar (media/)</button>`;
    else h = head("Edit Bentuk") + orderControls(l) + `<p style="color:var(--mu);font-size:13px">Ubah warna lewat Color &amp; Fill.</p>`;
  }

  s.innerHTML = h;
  s.classList.add("on");
  bindSheetActions();
}

function bindSheetActions() {
  const s = $("#sheet");
  $("#closeSheetBtn")?.addEventListener("click", closeSheet);
  $("#shiftUpBtn")?.addEventListener("click", () => shiftLayer(-1));
  $("#shiftDownBtn")?.addEventListener("click", () => shiftLayer(1));

  s.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addLayer(btn.getAttribute("data-add")));
  });

  $("#pickAddImgBtn")?.addEventListener("click", () => pickUploadToMedia((url) => addImage(url)));

  s.querySelectorAll("input[type=range][data-prop]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const l = cur();
      if (!l) return;
      const p = inp.getAttribute("data-prop");
      const u = inp.getAttribute("data-unit") || "";
      l[p] = +inp.value;
      const vEl = $("#v_" + p);
      if (vEl) vEl.textContent = inp.value + u;
      paint(l);
    });
  });

  $("#edBcPick")?.addEventListener("input", (e) => {
    const l = cur();
    if (!l) return;
    l.bc = e.target.value;
    paint(l);
  });

  $("#edBlendSel")?.addEventListener("change", (e) => {
    const l = cur();
    if (!l) return;
    l.blend = e.target.value;
    paint(l);
  });

  s.querySelectorAll("[data-fill]").forEach((sw) => {
    sw.addEventListener("click", () => {
      const l = cur();
      if (!l) return;
      l.fill = sw.getAttribute("data-fill");
      paint(l);
    });
  });

  $("#edCustomFill")?.addEventListener("input", (e) => {
    const l = cur();
    if (!l) return;
    l.fill = e.target.value;
    paint(l);
  });

  $("#edUiText")?.addEventListener("input", (e) => {
    const l = cur();
    if (!l) return;
    l.text = e.target.value;
    paint(l);
  });

  $("#edProfName")?.addEventListener("input", (e) => {
    D.name = e.target.value;
    loadProfile();
  });

  $("#edProfHandle")?.addEventListener("input", (e) => {
    D.handle = e.target.value;
    loadProfile();
  });

  $("#edProfBio")?.addEventListener("input", (e) => {
    D.bio = e.target.value;
    loadProfile();
  });

  $("#edPickBannerBtn")?.addEventListener("click", () => pickUploadToMedia((url) => {
    D.banner = url;
    loadProfile();
  }));

  $("#edPickAvatarBtn")?.addEventListener("click", () => pickUploadToMedia((url) => {
    D.avatar = url;
    loadProfile();
  }));

  $("#edLayerText")?.addEventListener("input", (e) => {
    const l = cur();
    if (!l) return;
    l.text = e.target.value;
    l.name = e.target.value;
    paint(l);
  });

  $("#edReplaceImgBtn")?.addEventListener("click", () => pickUploadToMedia((url) => {
    const l = cur();
    if (!l) return;
    l.src = url;
    paint(l);
  }));
}

function closeSheet() {
  $("#sheet").classList.remove("on");
}

function addLayer(type) {
  const l = { id: "n" + (++uid), type, name: { square: "Persegi", circle: "Lingkaran", text: "Teks Baru" }[type], ...B, text: "Teks Baru" };
  layers.unshift(l);
  sel = l.id;
  closeSheet();
  paintAll();
  buildTimeline();
}

function addImage(src) {
  const l = { id: "n" + (++uid), type: "image", name: "Gambar", ...B, src };
  layers.unshift(l);
  sel = l.id;
  closeSheet();
  paintAll();
  buildTimeline();
}

function dupLayer() {
  const l = cur();
  if (!l) return;
  if (l.sel) {
    Object.assign(l, { ...B, fill: "", text: "", hide: false });
    paint(l);
    return;
  }
  if (l.type === "profile") return;
  const idx = layers.indexOf(l);
  const c = { ...l, id: "n" + (++uid), x: l.x + 20, y: l.y + 20 };
  layers.splice(idx, 0, c);
  sel = c.id;
  paintAll();
  buildTimeline();
}

function delLayer() {
  const l = cur();
  if (!l) return;
  if (l.sel) {
    l.hide = !l.hide;
    paint(l);
    buildChips();
    buildTimeline();
    return;
  }
  if (l.type === "profile") {
    alert("Card Profil tidak bisa dihapus.");
    return;
  }
  elOf(l).remove();
  layers = layers.filter((x) => x !== l);
  sel = "profile";
  paintAll();
  buildTimeline();
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

document.querySelectorAll("[data-sheet]").forEach((btn) => {
  btn.addEventListener("click", () => sheet(btn.getAttribute("data-sheet")));
});
$("#bDup").addEventListener("click", dupLayer);
$("#bDel").addEventListener("click", delLayer);
$("#fabAdd").addEventListener("click", () => sheet("add"));
$("#stage").addEventListener("click", (e) => {
  if (e.target.id === "stage") closeSheet();
});

// =========================================================
// MODE HALAMAN UTAMA & SIMPAN TERPISAH KE store.js
// =========================================================
const HAS = typeof window.UI_TARGETS !== "undefined";
let fd = null;

if (HAS) {
  window.UI_TARGETS.forEach(([k, n, s, tc, ed]) => {
    ui[k] = { id: k, sel: s, name: n, tc, ed, ...B, fill: "", text: "", hide: false, ...((D.ui && D.ui[k]) || {}) };
  });
}

function paintUI(l) {
  if (!fd || typeof window.applyUI !== "function") return;
  const e = fd.querySelector(l.sel);
  if (!e) return;
  if (l.ed && !l.text && l.orig != null) e.textContent = l.orig;
  window.applyUI(fd, { [l.id]: { ...l, hide: false, opacity: l.hide ? 20 : l.opacity } }, l.id);
  e.classList.toggle("ui-sel", l.id === sel);
}

function buildChips() {
  $("#chips").innerHTML = Object.values(ui).map((l) =>
    `<button type="button" class="${l.id === sel ? "sel" : ""}" data-chip="${l.id}">${l.hide ? "🚫 " : ""}${l.name}</button>`
  ).join("");
  $("#chips").querySelectorAll("[data-chip]").forEach((btn) => {
    btn.addEventListener("click", () => select(btn.getAttribute("data-chip")));
  });
}

function fit() {
  const p = $("#pstage");
  const f = $("#frame");
  const W = Math.max(360, Math.min(innerWidth, 430));
  const s = p.clientWidth / W;
  f.style.width = W + "px";
  f.style.height = p.clientHeight / s + "px";
  let H = p.clientHeight / s;
  try {
    H = Math.max(H, fd.documentElement.scrollHeight);
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
  Object.values(ui).forEach((l) => {
    const e = fd.querySelector(l.sel);
    if (e && l.ed) l.orig = e.textContent;
  });
  fit();
  setTimeout(fit, 350);
  fd.addEventListener("click", (ev) => {
    if (ev.target.closest("a,button")) ev.preventDefault();
  }, true);
  Object.values(ui).forEach(paint);
  if (mode !== "kartu") buildTimeline();
};

function setMode(m) {
  if (!HAS && m === "halaman") return;
  mode = m;
  sel = m === "kartu" ? "profile" : "card";
  closeSheet();
  const k = m === "kartu";
  $("#stage").style.display = k ? "" : "none";
  $("#pstage").style.display = k ? "none" : "block";
  $(".play").style.display = k ? "" : "none";
  $("#tl").style.display = "";
  $("#chips").style.display = k ? "none" : "flex";
  $("#fabAdd").style.display = k ? "" : "none";
  $("#mK").classList.toggle("on", k);
  $("#mH").classList.toggle("on", !k);
  $("#bDup").innerHTML = k ? "<i>⧉</i>Duplikat" : "<i>↺</i>Reset";
  $("#bDel").innerHTML = k ? "<i>🗑</i>Hapus" : "<i>🚫</i>Sembunyikan";
  if (k) {
    paintAll();
    buildTimeline();
  } else {
    fit();
    buildChips();
    buildTimeline();
    list().forEach(paint);
  }
}

$("#mK").addEventListener("click", () => setMode("kartu"));
$("#mH").addEventListener("click", () => setMode("halaman"));
addEventListener("resize", () => mode !== "kartu" && fit());

$("#saveEditorBtn").addEventListener("click", async () => {
  if (!(await promptEditorLogin())) return;

  const p = layers.find((x) => x.type === "profile") || layers[0];
  const fx = {};
  Object.keys(B).forEach((k) => { fx[k] = p[k]; });
  fx.fill = p.fill;

  const savedUi = {};
  Object.values(ui).forEach((l) => {
    if (typeof window.uiDirty === "function" && window.uiDirty(l)) {
      const { orig, ...rest } = l;
      savedUi[l.id] = rest;
    }
  });

  try {
    await saveSettingDoc("home_profile", {
      name: D.name || "Eternal Heaven",
      handle: D.handle || "@veyrath.halgion",
      bio: D.bio || "",
      avatar: D.avatar || "",
      banner: D.banner || ""
    });
    await saveSettingDoc("home_ui", savedUi);
    await saveSettingDoc("editor_studio", {
      profileFx: fx,
      layers: layers.filter((x) => x.id !== p.id)
    });
    alert("Perubahan berhasil disimpan!");
    location.href = "index.html";
  } catch (err) {
    alert("Gagal menyimpan: " + err.message);
  }
});

loadProfile();
paintAll();
buildTimeline();
setMode("halaman");

Promise.all([
  loadSettingDoc("home_profile", null),
  loadSettingDoc("editor_studio", null)
]).then(([prof, studio]) => {
  if (prof) {
    D = { ...D, ...prof };
    loadProfile();
  }
  if (studio) {
    if (studio.profileFx) {
      const pIdx = layers.findIndex((x) => x.type === "profile");
      if (pIdx >= 0) layers[pIdx] = { ...layers[pIdx], ...studio.profileFx };
    }
    if (Array.isArray(studio.layers)) {
      const profLayer = layers.find((x) => x.type === "profile");
      layers = [profLayer, ...studio.layers].filter(Boolean);
    }
    paintAll();
    buildTimeline();
  }
});
