// tambah-konten.js
import {
  watchAdminAuth,
  loginAdmin,
  uploadSeparatedFile,
  saveSeparatedEntry
} from "./store.js";

const $ = (s) => document.querySelector(s);

const RATIO_PRESETS = {
  "1:1": { cw: 360, ch: 360 },
  "16:9": { cw: 480, ch: 270 },
  "9:16": { cw: 270, ch: 480 },
  "4:3": { cw: 400, ch: 300 },
  "3:4": { cw: 300, ch: 400 }
};

const drafts = {
  konten: {
    cw: 360,
    ch: 420,
    bg: "#0d0f14",
    blocks: [],
    mediaFiles: [],
    docFiles: [],
    otherFiles: [],
    title: "",
    link: "",
    cat: "",
    desc: ""
  },
  beranda: {
    cw: 360,
    ch: 202,
    bg: "#111622",
    blocks: [],
    mediaFiles: [],
    docFiles: [],
    otherFiles: [],
    title: "",
    link: "",
    cat: "Pengumuman",
    desc: ""
  }
};

let destMode = "konten";
let c = drafts.konten;
let isAdmin = false;

const COLORS = ["#27e0a0","#ff3b30","#ff9500","#ffcc00","#007aff","#af52de","#ffffff","#8e8e93","#000000","#d7b46a","#00c7be","#ff2d92"];
let sel = null;
let sc = 1;
let uid = Date.now();

const host = $("#host");
const st = $("#st");
const blk = (id) => c.blocks.find((b) => b.id === id);
const nodeOf = (b) => st.querySelector(`[data-id="${b.id}"]`);
const cur = () => blk(sel);
const esc = (s) => String(s || "").replace(/[&<>"']/g, (m) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[m]));

// =========================================================
// AUTH ADMIN
// =========================================================
watchAdminAuth((admin) => {
  isAdmin = admin;
});

async function ensureAdminAccess() {
  if (isAdmin) return true;
  const email = prompt("Login Admin - Masukkan Email:");
  if (!email) return false;
  const pass = prompt("Masukkan Kata Sandi:");
  if (!pass) return false;
  try {
    await loginAdmin(email.trim(), pass);
    isAdmin = true;
    return true;
  } catch (err) {
    alert("Login gagal: " + err.message);
    return false;
  }
}

// =========================================================
// PILIHAN UKURAN KANVAS (1:1, 16:9, 9:16, 4:3, 3:4 & KUSTOM)
// =========================================================
function syncCanvasSizeControls() {
  if ($("#customCanvasW")) $("#customCanvasW").value = c.cw;
  if ($("#customCanvasH")) $("#customCanvasH").value = c.ch;
  if ($("#canvasSizeBadge")) $("#canvasSizeBadge").textContent = `${c.cw} × ${c.ch}`;

  document.querySelectorAll(".ratio-btn").forEach((btn) => {
    const preset = RATIO_PRESETS[btn.dataset.ratio];
    const match = preset && preset.cw === c.cw && preset.ch === c.ch;
    btn.classList.toggle("active", Boolean(match));
  });
}

function setCanvasDimensions(nextW, nextH) {
  c.cw = Math.max(120, Math.min(1600, Math.round(Number(nextW) || 360)));
  c.ch = Math.max(120, Math.min(2000, Math.round(Number(nextH) || 360)));
  syncCanvasSizeControls();
  redraw();
}

document.querySelectorAll(".ratio-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = RATIO_PRESETS[btn.dataset.ratio];
    if (preset) setCanvasDimensions(preset.cw, preset.ch);
  });
});

$("#customCanvasW")?.addEventListener("input", (e) => {
  setCanvasDimensions(e.target.value, c.ch);
});

$("#customCanvasH")?.addEventListener("input", (e) => {
  setCanvasDimensions(c.cw, e.target.value);
});

// =========================================================
// GANTI TUJUAN: 1. KONTEN vs 2. BERANDA
// =========================================================
function saveCurrentMeta() {
  c.title = $("#title").value;
  c.link = $("#link").value;
  c.cat = $("#cat").value;
  c.desc = $("#desc").value;
}

function loadDraftMeta() {
  $("#title").value = c.title || "";
  $("#link").value = c.link || "";
  $("#cat").value = c.cat || (destMode === "beranda" ? "Pengumuman" : "");
  $("#desc").value = c.desc || "";
  resizeDesc();
}

function applyDestinationVisibility() {
  const isBeranda = destMode === "beranda";
  if ($("#canvasPresetBox")) $("#canvasPresetBox").style.display = isBeranda ? "none" : "";
  if ($("#kontenCanvasWrap")) $("#kontenCanvasWrap").style.display = isBeranda ? "none" : "";
  if ($("#kontenToolsBar")) $("#kontenToolsBar").style.display = isBeranda ? "none" : "";
  if ($("#openAddSheetBtn")) $("#openAddSheetBtn").style.display = isBeranda ? "none" : "";
}

function setDestMode(nextMode) {
  saveCurrentMeta();
  destMode = nextMode === "beranda" ? "beranda" : "konten";
  c = drafts[destMode];
  sel = null;
  closeSheet();
  $("#modeKonten").classList.toggle("active", destMode === "konten");
  $("#modeBeranda").classList.toggle("active", destMode === "beranda");
  $("#pageModeTitle").textContent = destMode === "beranda" ? "Postingan Beranda Baru" : "Konten Baru";
  applyDestinationVisibility();
  syncCanvasSizeControls();
  loadDraftMeta();
  renderAllSeparatedLists();
  redraw();
}

$("#modeKonten").addEventListener("click", () => setDestMode("konten"));
$("#modeBeranda").addEventListener("click", () => setDestMode("beranda"));

function resizeDesc() {
  const d = $("#desc");
  if (!d) return;
  d.style.height = "auto";
  d.style.height = Math.max(84, d.scrollHeight) + "px";
}
$("#desc").addEventListener("input", resizeDesc);

// =========================================================
// UPLOAD TERPISAH: MEDIA / DOKUMEN / UNGGAHAN LAIN
// =========================================================
function renderSeparatedBucket(containerId, list, bucketName) {
  const box = $(containerId);
  if (!box) return;
  if (!list.length) {
    box.innerHTML = `<div class="f-cnt">Belum ada file di ${bucketName}/.</div>`;
    return;
  }
  box.innerHTML = list.map((item, idx) => `
    <div class="sep-file-chip">
      <span>${esc(item.name)} (${Math.max(1, Math.round((item.size || 0) / 1024))} KB)</span>
      <button type="button" class="sep-file-rm" data-bucket="${bucketName}" data-idx="${idx}">✕</button>
    </div>
  `).join("");

  box.querySelectorAll(".sep-file-rm").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bkt = btn.getAttribute("data-bucket");
      const idx = Number(btn.getAttribute("data-idx"));
      if (bkt === "media") c.mediaFiles.splice(idx, 1);
      else if (bkt === "dokumen") c.docFiles.splice(idx, 1);
      else c.otherFiles.splice(idx, 1);
      renderAllSeparatedLists();
    });
  });
}

function renderAllSeparatedLists() {
  renderSeparatedBucket("#sepMediaList", c.mediaFiles, "media");
  renderSeparatedBucket("#sepDocList", c.docFiles, "dokumen");
  renderSeparatedBucket("#sepOtherList", c.otherFiles, "unggahan");
}

function bindSeparatedUploader(triggerId, inputId, kind, targetArray) {
  $(triggerId).addEventListener("click", async () => {
    const ok = await ensureAdminAccess();
    if (!ok) return;
    $(inputId).value = "";
    $(inputId).click();
  });

  $(inputId).addEventListener("change", async () => {
    const file = $(inputId).files[0];
    if (!file) return;
    try {
      const uploaded = await uploadSeparatedFile(file, kind);
      targetArray.push(uploaded);
      renderAllSeparatedLists();
      alert(`Berhasil diunggah ke ${kind}/: ${uploaded.name}`);
    } catch (err) {
      alert("Gagal upload: " + err.message);
    } finally {
      $(inputId).value = "";
    }
  });
}

bindSeparatedUploader("#pickSepMediaBtn", "#sepMediaInput", "media", c.mediaFiles);
bindSeparatedUploader("#pickSepDocBtn", "#sepDocInput", "dokumen", c.docFiles);
bindSeparatedUploader("#pickSepOtherBtn", "#sepOtherInput", "unggahan", c.otherFiles);

// =========================================================
// KANVAS & ELEMEN (KHUSUS KONTEN)
// =========================================================
function layout() {
  if (!host || !st) return;
  host.style.paddingBottom = (c.ch / c.cw * 100) + "%";
  host.style.background = c.bg;
  st.style.width = c.cw + "px";
  st.style.height = c.ch + "px";
  const w = host.clientWidth || Math.min(innerWidth - 24, 536);
  sc = w / c.cw;
  st.style.transform = `scale(${sc})`;
}

function redraw() {
  if (destMode === "beranda") return;
  layout();
  st.innerHTML = "";
  c.blocks.forEach((b) => {
    const e = window.kbNode(b);
    window.kbPaint(e, b);
    st.appendChild(e);
  });
  mark();
}

function mark() {
  st.querySelectorAll(".rh").forEach((x) => x.remove());
  st.querySelectorAll(".kb").forEach((e) => {
    const on = e.dataset.id === sel;
    e.classList.toggle("sel", on);
    if (on) {
      const h = document.createElement("i");
      h.className = "rh";
      e.appendChild(h);
    }
  });
}

addEventListener("resize", layout);

st.addEventListener("pointerdown", (ev) => {
  const rh = ev.target.closest(".rh");
  const n = ev.target.closest(".kb");
  if (!n) {
    sel = null;
    mark();
    return;
  }
  const b = blk(n.dataset.id);
  sel = b.id;
  mark();
  const sx = ev.clientX;
  const sy = ev.clientY;
  const o = { x: b.x, y: b.y, w: b.w, h: b.h };
  const ar = b.w / b.h;
  st.setPointerCapture(ev.pointerId);

  const mv = (m) => {
    const dx = (m.clientX - sx) / sc;
    const dy = (m.clientY - sy) / sc;
    if (rh) {
      b.w = Math.max(16, Math.round(o.w + dx));
      b.h = b.t === "image" ? Math.max(16, Math.round(b.w / ar)) : Math.max(16, Math.round(o.h + dy));
    } else {
      b.x = Math.round(o.x + dx);
      b.y = Math.round(o.y + dy);
    }
    window.kbPaint(n, b);
  };

  const up = () => {
    st.removeEventListener("pointermove", mv);
    st.removeEventListener("pointerup", up);
  };

  st.addEventListener("pointermove", mv);
  st.addEventListener("pointerup", up);
});

function addBlock(o) {
  const b = {
    id: "b" + (++uid),
    x: 0,
    y: 0,
    w: 120,
    h: 120,
    rot: 0,
    fill: "#27e0a0",
    r: 0,
    bw: 0,
    bc: "#ffffff",
    sh: 0,
    txt: "",
    tc: "#04140d",
    ts: 18,
    tw: 600,
    tk: 0,
    tsh: 0,
    tbw: 0,
    tbc: "#000000",
    ...o
  };
  b.id = "b" + (++uid);
  if (o.x === undefined) b.x = Math.round((c.cw - b.w) / 2);
  if (o.y === undefined) b.y = Math.round(30 + (c.blocks.length % 6) * 30);
  c.blocks.push(b);
  sel = b.id;
  closeSheet();
  redraw();
}

function addShape(k) {
  addBlock({
    t: "shape",
    k,
    w: k === "rectw" ? 200 : k === "ellipse" ? 160 : 120,
    h: k === "rectw" ? 80 : k === "ellipse" ? 100 : 120,
    r: k === "round" ? 20 : 0
  });
}

function addText(inside) {
  const b = cur();
  if (inside && b && b.t === "shape") {
    b.txt = b.txt || "Teks";
    window.kbPaint(nodeOf(b), b);
    sheet("text");
    return;
  }
  addBlock({ t: "text", w: 220, h: 60, txt: "Teks baru", tc: "#ffffff", ts: 24 });
}

function pickCanvasImageUpload() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    const ok = await ensureAdminAccess();
    if (!ok) return;
    try {
      const uploaded = await uploadSeparatedFile(file, "media");
      c.mediaFiles.push(uploaded);
      renderAllSeparatedLists();
      const im = new Image();
      im.onload = () => {
        const w = Math.min(240, c.cw - 40);
        addBlock({ t: "image", src: uploaded.url, w, h: Math.round(w * im.height / im.width) });
      };
      im.src = uploaded.url;
    } catch (err) {
      alert("Gagal upload gambar kanvas: " + err.message);
    }
  };
  inp.click();
}

function dup() {
  const b = cur();
  if (!b) return alert("Pilih elemen dulu.");
  addBlock({ ...b, id: undefined, x: b.x + 20, y: b.y + 20 });
}

function del() {
  const b = cur();
  if (!b) return alert("Pilih elemen dulu.");
  c.blocks = c.blocks.filter((x) => x !== b);
  sel = null;
  redraw();
}

const SLD = {
  size: ["Ukuran & Posisi", [["x","Posisi X",-100,800,"px"],["y","Posisi Y",-100,1200,"px"],["w","Lebar",16,800,"px"],["h","Tinggi",16,1000,"px"],["rot","Rotasi",-180,180,"°"]]],
  border: ["Border & Bayangan", [["bw","Tebal border",0,12,"px"],["sh","Bayangan",0,40,"px"]]],
  text: ["Teks", [["ts","Ukuran teks",8,96,"px"],["tw","Ketebalan",100,900,""],["tk","Kemiringan",-30,30,"°"],["tsh","Bayangan teks",0,20,"px"],["tbw","Border teks",0,6,"px"]]]
};

const head = (t) => `<div class="sh-h"><span>${t}</span><button type="button" id="closeSheetBtn">✕</button></div>`;
const sliders = (k, b) => SLD[k][1].map(([p, n, a, z, u]) => `
  <label>${n}<span id="v_${p}">${b[p]}${u}</span></label>
  <input type="range" min="${a}" max="${z}" step="${p === "tw" ? 100 : 1}" value="${b[p]}" data-prop="${p}" data-unit="${u}">
`).join("");

function sheet(k) {
  const s = $("#sheet");
  const b = cur();
  let h = "";

  if (k === "add") {
    const shapes = (window.KB_SHAPES || []).map(([id, n, i]) =>
      `<button type="button" data-add-shape="${id}"><span>${i}</span>${n}</button>`
    ).join("");
    h = head("Tambah Elemen") +
      `<div class="grid">${shapes}</div>` +
      (b && b.t === "shape"
        ? `<button type="button" class="wide" id="addTextInsideBtn">✍️ Teks di dalam elemen terpilih</button><button type="button" class="wide" id="addTextFreeBtn">Aa Teks terpisah</button>`
        : `<button type="button" class="wide" id="addTextFreeBtn">Aa Tambah Teks</button>`) +
      `<button type="button" class="wide" id="addCanvasImgBtn">🖼 Gambar (unggah ke media/)</button>`;
  } else if (k === "canvas") {
    h = head("Kanvas") +
      `<label>Lebar kanvas<span id="v_cw">${c.cw}px</span></label><input type="range" min="160" max="1200" value="${c.cw}" id="canvasWidthRange">` +
      `<label>Tinggi kanvas<span id="v_ch">${c.ch}px</span></label><input type="range" min="160" max="1400" value="${c.ch}" id="canvasHeightRange">` +
      `<label>Warna latar</label><input type="color" value="${c.bg}" id="canvasBgColor">`;
  } else if (!b) {
    return alert("Pilih elemen dulu (ketuk elemen di kanvas, atau tambah dengan tombol ＋).");
  } else if (k === "size" || k === "border") {
    h = head(SLD[k][0]) + sliders(k, b) + (k === "border"
      ? `<label>Warna border</label><input type="color" value="${b.bc}" id="borderColorPick"><p class="note">Border terlihat jelas pada persegi, lingkaran, dan gambar.</p>`
      : "");
  } else if (k === "color") {
    if (b.t === "text") {
      h = head("Warna & Bentuk") + `<p class="note">Warna teks diatur di menu Teks.</p>`;
    } else {
      const rad = b.t === "image" || ["rect", "rectw", "round"].includes(b.k);
      h = head("Warna & Bentuk") +
        (b.t === "shape"
          ? `<div class="sw">${COLORS.map((x) => `<div style="background:${x}" data-swatch="${x}"></div>`).join("")}</div><label>Warna kustom</label><input type="color" value="${/^#/.test(b.fill) ? b.fill : "#27e0a0"}" id="customFillPick">`
          : "") +
        (rad ? `<label>Radius sudut (misal 20px)</label><input type="text" value="${b.r}px" id="radiusPick">` : `<p class="note">Bentuk ini tidak punya radius.</p>`);
    }
  } else if (k === "text") {
    if (b.t === "image") {
      h = head("Teks") + `<p class="note">Gambar tidak punya teks. Tambahkan teks terpisah lewat tombol ＋.</p>`;
    } else {
      h = head("Teks") +
        `<label>Isi teks</label><textarea rows="2" id="blockTextInput">${esc(b.txt)}</textarea>` +
        sliders("text", b) +
        `<label>Warna teks</label><input type="color" value="${b.tc}" id="textColorPick">` +
        `<label>Warna border teks</label><input type="color" value="${b.tbc}" id="textBorderColorPick">`;
    }
  }

  s.innerHTML = h;
  s.classList.add("on");
  bindSheetEvents();
}

function bindSheetEvents() {
  const s = $("#sheet");
  $("#closeSheetBtn")?.addEventListener("click", closeSheet);

  s.querySelectorAll("[data-add-shape]").forEach((btn) => {
    btn.addEventListener("click", () => addShape(btn.getAttribute("data-add-shape")));
  });
  $("#addTextInsideBtn")?.addEventListener("click", () => addText(true));
  $("#addTextFreeBtn")?.addEventListener("click", () => addText(false));
  $("#addCanvasImgBtn")?.addEventListener("click", pickCanvasImageUpload);

  $("#canvasWidthRange")?.addEventListener("input", (e) => {
    c.cw = +e.target.value;
    $("#v_cw").textContent = e.target.value + "px";
    syncCanvasSizeControls();
    layout();
  });
  $("#canvasHeightRange")?.addEventListener("input", (e) => {
    c.ch = +e.target.value;
    $("#v_ch").textContent = e.target.value + "px";
    syncCanvasSizeControls();
    layout();
  });
  $("#canvasBgColor")?.addEventListener("input", (e) => {
    c.bg = e.target.value;
    layout();
  });

  s.querySelectorAll("input[type=range][data-prop]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const p = inp.getAttribute("data-prop");
      const u = inp.getAttribute("data-unit") || "";
      const b = cur();
      if (!b) return;
      b[p] = +inp.value;
      const vEl = $("#v_" + p);
      if (vEl) vEl.textContent = inp.value + u;
      window.kbPaint(nodeOf(b), b);
    });
  });

  $("#borderColorPick")?.addEventListener("input", (e) => {
    const b = cur();
    if (!b) return;
    b.bc = e.target.value;
    window.kbPaint(nodeOf(b), b);
  });

  s.querySelectorAll("[data-swatch]").forEach((sw) => {
    sw.addEventListener("click", () => {
      const b = cur();
      if (!b) return;
      b.fill = sw.getAttribute("data-swatch");
      window.kbPaint(nodeOf(b), b);
    });
  });

  $("#customFillPick")?.addEventListener("input", (e) => {
    const b = cur();
    if (!b) return;
    b.fill = e.target.value;
    window.kbPaint(nodeOf(b), b);
  });

  $("#radiusPick")?.addEventListener("change", (e) => {
    const b = cur();
    if (!b) return;
    b.r = parseFloat(e.target.value) || 0;
    window.kbPaint(nodeOf(b), b);
  });

  $("#blockTextInput")?.addEventListener("input", (e) => {
    const b = cur();
    if (!b) return;
    b.txt = e.target.value;
    window.kbPaint(nodeOf(b), b);
  });

  $("#textColorPick")?.addEventListener("input", (e) => {
    const b = cur();
    if (!b) return;
    b.tc = e.target.value;
    window.kbPaint(nodeOf(b), b);
  });

  $("#textBorderColorPick")?.addEventListener("input", (e) => {
    const b = cur();
    if (!b) return;
    b.tbc = e.target.value;
    window.kbPaint(nodeOf(b), b);
  });
}

function closeSheet() {
  $("#sheet").classList.remove("on");
}

$("#toolSizeBtn").addEventListener("click", () => sheet("size"));
$("#toolColorBtn").addEventListener("click", () => sheet("color"));
$("#toolTextBtn").addEventListener("click", () => sheet("text"));
$("#toolBorderBtn").addEventListener("click", () => sheet("border"));
$("#toolCanvasBtn").addEventListener("click", () => sheet("canvas"));
$("#toolDupBtn").addEventListener("click", dup);
$("#toolDelBtn").addEventListener("click", del);
$("#openAddSheetBtn").addEventListener("click", () => sheet("add"));

// =========================================================
// TERBITKAN TERPISAH: KONTEN vs BERANDA
// =========================================================
$("#pub").addEventListener("click", async () => {
  const title = $("#title").value.trim();
  if (!title) {
    alert("Judul wajib diisi.");
    return;
  }

  const ok = await ensureAdminAccess();
  if (!ok) return;

  const btn = $("#pub");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    const rawCat = $("#cat").value.trim();
    const category = destMode === "beranda" ? (rawCat || "Pengumuman") : (rawCat || "Umum");
    const linkVal = $("#link").value.trim();
    const descVal = $("#desc").value.trim();
    const combinedText = [descVal, linkVal].filter(Boolean).join("\n");

        await saveSeparatedEntry(destMode, {
      title,
      link: linkVal,
      category,
      desc: descVal,
      textBody: descVal,
      cw: c.cw,
      ch: c.ch,
      bg: c.bg,
      blocks: destMode === "beranda" ? [] : c.blocks,
      mediaFiles: c.mediaFiles,
      docFiles: c.docFiles,
      otherFiles: c.otherFiles
    });

    alert(destMode === "beranda" ? "Postingan Beranda berhasil diterbitkan!" : "Konten berhasil diterbitkan!");
    location.href = "index.html";
  } catch (err) {
    alert("Gagal menerbitkan: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Terbitkan";
  }
});

applyDestinationVisibility();
syncCanvasSizeControls();
renderAllSeparatedLists();
redraw();
