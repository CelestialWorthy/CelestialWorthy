const $ = s => document.querySelector(s);
let D = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=300&h=300&fit=crop";
const B = { x: 0, y: 0, w: 0, h: 0, scale: 100, rot: 0, skew: 0, opacity: 100, blend: "normal", bw: 0, bc: "#ffffff", sh: 0, hide: false, fill: "", text: "" };
const COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be", "#007aff", "#af52de", "#ffffff", "#8e8e93", "#000000", "#10b981", "#d7b46a"];
const SL = {
  move: ["Move & Transform", [["x", "Geser X", -250, 250, "px"], ["y", "Geser Y", -400, 400, "px"], ["w", "Lebar (0=asli)", 0, 420, "px"], ["h", "Tinggi (0=asli)", 0, 500, "px"], ["scale", "Skala", 20, 200, "%"], ["rot", "Rotasi", -180, 180, "°"], ["skew", "Kemiringan", -45, 45, "°"]]],
  border: ["Border & Bayangan", [["bw", "Tebal Border", 0, 12, "px"], ["sh", "Bayangan", 0, 40, "px"]]],
  blend: ["Blending & Opacity", [["opacity", "Opacity", 0, 100, "%"]]]
};

const TARGETS = (typeof UI_TARGETS !== "undefined" && Array.isArray(UI_TARGETS))
  ? UI_TARGETS
  : [
      ["name", "Nama", "#communityName", 1, 1],
      ["handle", "Handle", "#communityHandle", 1, 1],
      ["bio", "Bio", "#communityBio", 1, 1],
      ["btn1", "Tombol Lihat Konten", ".primary-btn", 0, 1],
      ["btn2", "Tombol Bagikan", "#shareButton", 0, 1],
      ["avatar", "Avatar", ".avatar-wrap", 0, 0],
      ["cover", "Banner", "#coverImage", 0, 0],
      ["card", "Card Profil", ".profile-card", 0, 0],
      ["heading", "Kotak Judul", ".profile-heading", 0, 0],
      ["tabs", "Tab Menu", ".tabs", 0, 0],
      ["top", "Topbar", ".topbar", 0, 0],
      ["bottom", "Menu Bawah", ".bottom-nav", 0, 0]
    ];

const ui = {};
TARGETS.forEach(([k, n, s, tc, ed]) => {
  ui[k] = { id: k, sel: s, name: n, tc, ed, ...B, ...((D.ui && D.ui[k]) || {}) };
});
Object.entries(D.ui || {}).forEach(([k, v]) => {
  if (!ui[k] && v && v.sel) ui[k] = { ...B, ...v };
});

let sel = "card";
let fd = null;

const list = () => Object.values(ui);
const cur = () => list().find(l => l.id === sel) || list()[0];

function applyCommunityMediaToFrame() {
  if (!fd) return;
  const avEl = fd.getElementById("avatarImage");
  const covEl = fd.getElementById("coverImage");
  if (avEl) avEl.src = D.avatar || DEFAULT_AVATAR;
  if (covEl) {
    if (D.banner) {
      covEl.style.backgroundImage = `url("${String(D.banner).replace(/"/g, "&quot;")}")`;
      covEl.style.backgroundSize = "cover";
      covEl.style.backgroundPosition = "center";
    } else {
      covEl.style.backgroundImage = "";
    }
  }
}

function paintUI(l) {
  if (!fd || !l || !l.sel) return;
  const e = fd.querySelector(l.sel);
  if (!e) return;
  if (l.ed && !l.text && l.orig != null) e.textContent = l.orig;
  if (typeof applyUI === "function") {
    applyUI(fd, { [l.id]: { ...l, hide: false, opacity: l.hide ? 20 : l.opacity } }, l.id);
  }
  e.classList.toggle("ui-sel", l.id === sel);
}

function paintAllUI() {
  list().forEach(paintUI);
  applyCommunityMediaToFrame();
}

function buildChips() {
  const el = $("#chips");
  if (!el) return;
  el.innerHTML =
    `<button type="button" onclick="selParent()">⬆ Induk</button>` +
    list().map(l => `<button type="button" class="${l.id === sel ? "sel" : ""}" onclick="select('${l.id}')">${l.hide ? "🚫 " : ""}${l.name}</button>`).join("");
}

function buildList() {
  const tracksEl = $("#tracks");
  const tlinEl = $("#tlin");
  if (!tracksEl || !tlinEl) return;
  const items = list();
  tlinEl.style.width = Math.max(260, $("#tl").clientWidth - 16) + "px";
  tracksEl.style.height = items.length * 34 + 12 + "px";
  tracksEl.innerHTML = items.map((l, i) =>
    `<div class="clip ${l.id === sel ? "sel" : ""}" data-id="${l.id}" style="left:8px;width:calc(100% - 16px);top:${6 + i * 34}px">${l.hide ? "🚫 " : "◻ "}${l.name}</div>`
  ).join("");
}

$("#tracks").addEventListener("click", e => {
  const row = e.target.closest(".clip");
  if (!row) return;
  select(row.dataset.id);
});

function select(id) {
  if (!ui[id]) return;
  sel = id;
  buildChips();
  buildList();
  paintAllUI();
}

function cssPath(el) {
  const p = [];
  let anchored = false;
  while (el && el.nodeType === 1 && el !== fd.body) {
    if (el.id) { p.unshift("#" + CSS.escape(el.id)); anchored = true; break; }
    let i = 1, s = el;
    while ((s = s.previousElementSibling)) i++;
    p.unshift(el.tagName.toLowerCase() + ":nth-child(" + i + ")");
    el = el.parentElement;
  }
  return (anchored ? "" : "body>") + p.join(">");
}

function mkDyn(el) {
  const path = cssPath(el);
  const id = "d" + Math.abs([...path].reduce((a, c) => ((a * 31) + c.charCodeAt(0)) | 0, 7));
  if (ui[id]) return ui[id];
  const leaf = !el.children.length && el.textContent.trim().length > 0;
  const nm = el.tagName.toLowerCase() + (el.classList[0] ? "." + el.classList[0] : "");
  return ui[id] = { id, sel: path, name: nm, tc: leaf ? 1 : 0, ed: leaf ? 1 : 0, dyn: 1, orig: leaf ? el.textContent : null, ...B };
}

function selParent() {
  const l = cur();
  if (!l || !fd) return;
  const e = fd.querySelector(l.sel);
  const p = e && e.parentElement;
  if (!p || p === fd.body) return;
  const found = list().find(u => fd.querySelector(u.sel) === p) || mkDyn(p);
  select(found.id);
}

function orderControls(l) {
  const items = list();
  const idx = items.indexOf(l);
  return `<label>Urutan Layer<span>#${idx + 1} dari ${items.length}</span></label>`;
}

function sheet(k) {
  const s = $("#sheet");
  const l = cur();
  if (!s || !l) return;
  const head = t => `<div class="sh-h"><span>${t}</span><button type="button" onclick="closeSheet()">✕</button></div>`;
  let h = "";
  if (SL[k]) {
    h = head(SL[k][0]) + SL[k][1].map(([p, n, a, b, u]) =>
      `<label>${n}<span id="v_${p}">${l[p] || 0}${u}</span></label><input type="range" min="${a}" max="${b}" value="${l[p] || 0}" oninput="setP('${p}',this.value,'${u}')">`
    ).join("");
    if (k === "border") h += `<label>Warna Border</label><input type="color" value="${l.bc}" oninput="setP('bc',this.value,'',1)" style="width:100%;height:40px;background:none;border:0">`;
    if (k === "blend") h += `<label>Mode Blending</label><select onchange="setP('blend',this.value,'',1)">${["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference"].map(m => `<option ${l.blend === m ? "selected" : ""}>${m}</option>`).join("")}</select>`;
  } else if (k === "fill") {
    h = head("Color & Fill") +
      `<div class="sw">${COLORS.map(c => `<div style="background:${c}" onclick="setP('fill','${c}','',1)"></div>`).join("")}<div style="display:grid;place-items:center;color:#8f97a6" onclick="setP('fill','','',1)">✕</div></div>` +
      `<label>Warna kustom</label><input type="color" oninput="setP('fill',this.value,'',1)" style="width:100%;height:40px;background:none;border:0">`;
  } else if (k === "edit") {
    h = head("Edit " + l.name) + orderControls(l) +
      (l.ed
        ? `<label>Teks</label><input type="text" value="${(l.text || l.orig || "").replace(/"/g, "&quot;")}" oninput="cur().text=this.value;paintUI(cur())">`
        : `<p style="color:var(--mu);font-size:13px">Elemen ini tidak punya teks. Pakai Move & Transform, Fill, atau Border.</p>`);
  }
  s.innerHTML = h;
  s.classList.add("on");
}

function closeSheet() { $("#sheet").classList.remove("on"); }
function setP(p, v, u, raw) {
  const l = cur();
  if (!l) return;
  l[p] = raw ? v : +v;
  const o = $("#v_" + p);
  if (o) o.textContent = v + u;
  paintUI(l);
}

function resetSelectedUI() {
  const l = cur();
  if (!l) return;
  Object.assign(l, { ...B });
  paintUI(l);
  buildChips();
  buildList();
}

function toggleHideUI() {
  const l = cur();
  if (!l) return;
  l.hide = !l.hide;
  paintUI(l);
  buildChips();
  buildList();
}

function fit() {
  const p = $("#pstage"), f = $("#frame");
  if (!p || !f) return;
  const W = Math.max(360, Math.min(innerWidth, 430));
  const s = p.clientWidth / W;
  f.style.width = W + "px";
  let H = p.clientHeight / s;
  try { if (fd) H = Math.max(H, fd.documentElement.scrollHeight); } catch (e) {}
  f.style.height = H + "px";
  f.style.transform = `scale(${s})`;
  $("#fw").style.height = H * s + "px";
}

$("#frame").onload = () => {
  try { fd = $("#frame").contentDocument; fd.body; } catch (e) { fd = null; }
  if (!fd) return;
  const st = fd.createElement("style");
  st.textContent = ".ui-sel{outline:2px solid #27e0a0!important;outline-offset:2px}";
  fd.head.appendChild(st);
  list().forEach(l => { const e = fd.querySelector(l.sel); if (e && l.ed) l.orig = e.textContent; });
  fit();
  setTimeout(fit, 350);
  fd.addEventListener("click", ev => { if (ev.target.closest("a,button")) ev.preventDefault(); }, true);
  paintAllUI();
};

addEventListener("resize", fit);

function compressImageFile(file, maxSize, quality, cb) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(img.width * scale));
    cv.height = Math.max(1, Math.round(img.height * scale));
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    cb(cv.toDataURL(mime, quality));
  };
  img.src = url;
}

function updateCommunityMedia(field, value, msg) {
  D[field] = value;
  const saved = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
  saved[field] = value;
  localStorage.setItem("alcrazhyCommunity", JSON.stringify(saved));
  applyCommunityMediaToFrame();
  alert(msg);
}

const avInput = document.getElementById("editAvatarFile");
if (avInput) {
  avInput.addEventListener("change", () => {
    const file = avInput.files[0];
    if (!file) return;
    compressImageFile(file, 360, 0.82, (dataUrl) => {
      updateCommunityMedia("avatar", dataUrl, "Avatar komunitas diperbarui! Klik Simpan untuk commit ke GitHub.");
      avInput.value = "";
    });
  });
}

const bnInput = document.getElementById("editBannerFile");
if (bnInput) {
  bnInput.addEventListener("change", () => {
    const file = bnInput.files[0];
    if (!file) return;
    compressImageFile(file, 900, 0.8, (dataUrl) => {
      updateCommunityMedia("banner", dataUrl, "Banner komunitas diperbarui! Klik Simpan untuk commit ke GitHub.");
      bnInput.value = "";
    });
  });
}

const resetAv = document.getElementById("resetAvatarBtn");
if (resetAv) {
  resetAv.addEventListener("click", () => {
    updateCommunityMedia("avatar", "", "Avatar komunitas dihapus.");
  });
}

const resetBn = document.getElementById("resetBannerBtn");
if (resetBn) {
  resetBn.addEventListener("click", () => {
    updateCommunityMedia("banner", "", "Banner komunitas dihapus.");
  });
}

async function adminCommit(saveFn) {
  if (!window.AlcrazhyAuth) {
    alert("Modul firebase-auth.js belum dimuat.");
    return false;
  }
  const loggedIn = await window.AlcrazhyAuth.requireAdminLogin();
  if (!loggedIn) {
    alert("Aksi dibatalkan: harus login admin terlebih dahulu.");
    return false;
  }
  try {
    await saveFn();
    return true;
  } catch (err) {
    alert(err.message || "Gagal menyimpan ke GitHub.");
    return false;
  }
}

async function saveProject() {
  await adminCommit(async () => {
    const dirtyFn = typeof uiDirty === "function"
      ? uiDirty
      : l => !!(l.x || l.y || l.w || l.h || l.rot || l.skew || l.scale != 100 || l.opacity != 100 || l.blend != "normal" || l.bw || l.sh || l.fill || l.text || l.hide);

    const nextUi = {};
    list().forEach(l => {
      if (dirtyFn(l)) {
        const { orig, ...o } = l;
        nextUi[l.id] = o;
      }
    });

    const saved = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
    const payload = {
      ...saved,
      ...D,
      ui: nextUi
    };

    try {
      localStorage.setItem("alcrazhyCommunity", JSON.stringify(payload));
    } catch (e) {
      alert("Penyimpanan lokal penuh, coba gambar yang lebih kecil.");
      return;
    }

    if (window.AlcrazhyGitHub && typeof window.AlcrazhyGitHub.saveCommunityData === "function") {
      await window.AlcrazhyGitHub.saveCommunityData(payload, "Update halaman utama komunitas");
    }

    alert("Perubahan berhasil disimpan!");
    location.href = "index.html";
  });
}

fit();
buildChips();
buildList();
