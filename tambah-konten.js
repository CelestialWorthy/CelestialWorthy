const $ = s => document.querySelector(s);
const def = [
  { id: 1, title: "Pengumuman Resmi #1", category: "Pengumuman", desc: "Selamat datang di ruang komunitas kita. Silakan buat konten baru dan jelajahi galeri!", media: "" },
  { id: 2, title: "Panduan Komunitas", category: "Panduan", desc: "Aturan dasar dan tata cara berdiskusi yang sehat di Alcrazhy Community.", media: "" }
];

let savedDB = {};
try {
  savedDB = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
} catch (e) {}

const sharedFolders = Array.isArray(savedDB.folders) ? savedDB.folders.slice() : [];
const drafts = {
  konten: { cw: 360, ch: 420, bg: "#0d0f14", blocks: [], files: [], folders: sharedFolders, title: "", cat: "", desc: "" },
  beranda: { cw: 360, ch: 320, bg: "#111622", blocks: [], files: [], folders: sharedFolders, title: "", cat: "Pengumuman", desc: "" }
};

let destMode = "konten";
let c = drafts.konten;
const COLORS = ["#27e0a0", "#ff3b30", "#ff9500", "#ffcc00", "#007aff", "#af52de", "#ffffff", "#8e8e93", "#000000", "#d7b46a", "#00c7be", "#ff2d92"];
let sel = null, sc = 1, uid = Date.now();
const openFld = new Set(sharedFolders.map(f => f.id));
const host = $("#host"), st = $("#st");
const blk = id => c.blocks.find(b => b.id === id);
const nodeOf = b => st.querySelector(`[data-id="${b.id}"]`);
const cur = () => blk(sel);
const esc = s => String(s || "").replace(/[&<>"']/g, m => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[m]));

function saveCurrentMetaToDraft() {
  c.title = $("#title").value;
  c.cat = $("#cat").value;
  if ($("#desc")) c.desc = $("#desc").value;
}

function loadDraftMetaToInputs() {
  $("#title").value = c.title || "";
  $("#cat").value = c.cat || (destMode === "beranda" ? "Pengumuman" : "");
  if ($("#desc")) $("#desc").value = c.desc || "";
}

function setDestMode(nextMode) {
  saveCurrentMetaToDraft();
  destMode = nextMode === "beranda" ? "beranda" : "konten";
  c = drafts[destMode];
  sel = null;
  closeSheet();
  $("#modeKonten").classList.toggle("active", destMode === "konten");
  $("#modeBeranda").classList.toggle("active", destMode === "beranda");
  $("#pageModeTitle").textContent = destMode === "beranda" ? "Postingan Beranda Baru" : "Konten Baru";
  loadDraftMetaToInputs();
  renderFolderSelect();
  drawFiles();
  redraw();
}

function syncFoldersStorage() {
  drafts.konten.folders = c.folders;
  drafts.beranda.folders = c.folders;
  try {
    const curDB = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
    curDB.folders = c.folders;
    localStorage.setItem("alcrazhyCommunity", JSON.stringify(curDB));
  } catch (e) {}
}

function toggleFolderBox(show) {
  $("#folderCreate").style.display = show ? "flex" : "none";
  if (show) $("#newFolderInp").focus();
}

function addFolder() {
  const name = $("#newFolderInp").value.trim();
  if (!name) return;
  const f = { id: "fld_" + (++uid), name };
  c.folders.push(f);
  openFld.add(f.id);
  $("#newFolderInp").value = "";
  toggleFolderBox(false);
  syncFoldersStorage();
  renderFolderSelect(f.id);
  drawFiles();
}

function renderFolderSelect(pickId) {
  const selEl = $("#targetFolderSel");
  if (!selEl) return;
  const curVal = pickId !== undefined ? pickId : selEl.value;
  selEl.innerHTML = `<option value="">— Tanpa Folder (Luar Folder) —</option>` +
    c.folders.map(f => `<option value="${esc(f.id)}">Folder: ${esc(f.name)}</option>`).join("");
  selEl.value = c.folders.some(f => f.id === curVal) ? curVal : "";
}

function moveFile(idx, folderId) {
  if (!c.files[idx]) return;
  c.files[idx].folderId = folderId || "";
  if (folderId) openFld.add(folderId);
  drawFiles();
}

function removeFile(idx) {
  c.files.splice(idx, 1);
  drawFiles();
}

function toggleFolderOpen(id) {
  if (openFld.has(id)) openFld.delete(id);
  else openFld.add(id);
  drawFiles();
}

function fileItemHtml(x, i) {
  const opts = `<option value="">Luar Folder</option>` +
    c.folders.map(f => `<option value="${esc(f.id)}" ${x.folderId === f.id ? "selected" : ""}>${esc(f.name)}</option>`).join("");
  return `<div class="file-row"><span class="file-meta">📎 ${esc(x.name)} · ${Math.max(1, Math.round(x.size / 1024))} KB</span><div class="file-act"><select onchange="moveFile(${i},this.value)">${opts}</select><button type="button" class="rm" onclick="removeFile(${i})">✕</button></div></div>`;
}

function layout() {
  host.style.paddingBottom = (c.ch / c.cw * 100) + "%";
  host.style.background = c.bg;
  st.style.width = c.cw + "px";
  st.style.height = c.ch + "px";
  const w = host.clientWidth || Math.min(innerWidth - 24, 536);
  sc = w / c.cw;
  st.style.transform = `scale(${sc})`;
}

function redraw() {
  layout();
  st.innerHTML = "";
  c.blocks.forEach(b => {
    const e = kbNode(b);
    kbPaint(e, b);
    st.appendChild(e);
  });
  mark();
  st.querySelectorAll(".kb").forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transitionDelay = `${Math.min(i, 8) * 35}ms`;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
  });
}

function mark() {
  st.querySelectorAll(".rh").forEach(x => x.remove());
  st.querySelectorAll(".kb").forEach(e => {
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

/* ----- geser & ubah ukuran ----- */
st.addEventListener("pointerdown", ev => {
  const rh = ev.target.closest(".rh"), n = ev.target.closest(".kb");
  if (!n) { sel = null; mark(); return; }
  const b = blk(n.dataset.id); sel = b.id; mark();
  const sx = ev.clientX, sy = ev.clientY, o = { x: b.x, y: b.y, w: b.w, h: b.h }, ar = b.w / b.h;
  st.setPointerCapture(ev.pointerId);
  const mv = m => {
    const dx = (m.clientX - sx) / sc, dy = (m.clientY - sy) / sc;
    if (rh) {
      b.w = Math.max(16, Math.round(o.w + dx));
      b.h = b.t === "image" ? Math.max(16, Math.round(b.w / ar)) : Math.max(16, Math.round(o.h + dy));
    } else {
      b.x = Math.round(o.x + dx);
      b.y = Math.round(o.y + dy);
    }
    kbPaint(n, b);
  };
  const up = () => {
    st.removeEventListener("pointermove", mv);
    st.removeEventListener("pointerup", up);
  };
  st.addEventListener("pointermove", mv);
  st.addEventListener("pointerup", up);
});

/* ----- tambah elemen ----- */
function addBlock(o) {
  const b = { id: "b" + (++uid), x: 0, y: 0, w: 120, h: 120, rot: 0, fill: "#27e0a0", r: 0, bw: 0, bc: "#ffffff", sh: 0, txt: "", tc: "#04140d", ts: 18, tw: 600, tk: 0, tsh: 0, tbw: 0, tbc: "#000000", ...o };
  b.id = "b" + (++uid);
  if (o.x === undefined) b.x = Math.round((c.cw - b.w) / 2);
  if (o.y === undefined) b.y = Math.round(30 + (c.blocks.length % 6) * 30);
  c.blocks.push(b); sel = b.id; closeSheet(); redraw();
}

function addShape(k) {
  addBlock({ t: "shape", k, w: k === "rectw" ? 200 : k === "ellipse" ? 160 : 120, h: k === "rectw" ? 80 : k === "ellipse" ? 100 : 120, r: k === "round" ? 20 : 0 });
}

function addText(inside) {
  const b = cur();
  if (inside && b && b.t === "shape") {
    b.txt = b.txt || "Teks";
    kbPaint(nodeOf(b), b);
    sheet("text");
    return;
  }
  addBlock({ t: "text", w: 220, h: 60, txt: "Teks baru", tc: "#ffffff", ts: 24 });
}

function pickImg() {
  const f = $("#fi"); f.accept = "image/png,image/jpeg";
  f.onchange = () => {
    const file = f.files[0]; if (!file) return;
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => {
      const s = Math.min(1, 700 / Math.max(im.width, im.height)), cv = document.createElement("canvas");
      cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      const src = cv.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", .8);
      URL.revokeObjectURL(u);
      const w = Math.min(240, c.cw - 40);
      addBlock({ t: "image", src, w, h: Math.round(w * im.height / im.width) });
    };
    im.src = u; f.value = "";
  };
  f.click();
}

function pickDoc() {
  const f = $("#fi"); f.accept = "";
  f.onchange = () => {
    const file = f.files[0]; if (!file) return;
    if (file.size > 1048576) { alert("Ukuran file maksimal 1 MB."); f.value = ""; return; }
    const chosenFolder = $("#targetFolderSel") ? $("#targetFolderSel").value : "";
    const r = new FileReader();
    r.onload = () => {
      c.files.push({ name: file.name, size: file.size, data: r.result, folderId: chosenFolder });
      if (chosenFolder) openFld.add(chosenFolder);
      drawFiles(); closeSheet();
    };
    r.readAsDataURL(file); f.value = "";
  };
  f.click();
}

function drawFiles() {
  const gEl = $("#folderGroups");
  if (gEl) {
    if (!c.folders.length) {
      gEl.innerHTML = `<div class="f-card"><span class="f-cnt">Belum ada folder. Klik "+ Buat Folder" untuk membuat folder.</span></div>`;
    } else {
      gEl.innerHTML = c.folders.map(fld => {
        const items = c.files.map((x, i) => ({ x, i })).filter(it => it.x.folderId === fld.id);
        const isOpen = openFld.has(fld.id);
        return `<div class="f-card"><div class="f-head" onclick="toggleFolderOpen('${esc(fld.id)}')"><span>📁 ${esc(fld.name)}</span><span class="f-cnt">${items.length} file · ${isOpen ? "▲" : "▼"}</span></div>${isOpen ? `<div class="f-body">${items.length ? items.map(it => fileItemHtml(it.x, it.i)).join("") : `<span class="f-cnt">Folder kosong. Pilih folder ini pada file untuk memasukkannya.</span>`}</div>` : ""}</div>`;
      }).join("");
    }
  }
  const loose = c.files.map((x, i) => ({ x, i })).filter(it => !it.x.folderId);
  $("#files").innerHTML = loose.length ? loose.map(it => fileItemHtml(it.x, it.i)).join("") : `<div class="f-cnt">Tidak ada file di luar folder.</div>`;
  document.querySelectorAll("#folderGroups .f-card, #files .file-row").forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transitionDelay = `${Math.min(i, 8) * 35}ms`;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  });
}

function dup() { const b = cur(); if (!b) return alert("Pilih elemen dulu."); addBlock({ ...b, id: undefined, x: b.x + 20, y: b.y + 20 }); }
function del() { const b = cur(); if (!b) return alert("Pilih elemen dulu."); c.blocks = c.blocks.filter(x => x !== b); sel = null; redraw(); }

/* ----- panel ----- */
const SLD = {
  size: ["Ukuran & Posisi", [["x", "Posisi X", -100, 460, "px"], ["y", "Posisi Y", -100, 1000, "px"], ["w", "Lebar", 16, 500, "px"], ["h", "Tinggi", 16, 700, "px"], ["rot", "Rotasi", -180, 180, "°"]]],
  border: ["Border & Bayangan", [["bw", "Tebal border", 0, 12, "px"], ["sh", "Bayangan", 0, 40, "px"]]],
  text: ["Teks", [["ts", "Ukuran teks", 8, 96, "px"], ["tw", "Ketebalan", 100, 900, ""], ["tk", "Kemiringan", -30, 30, "°"], ["tsh", "Bayangan teks", 0, 20, "px"], ["tbw", "Border teks", 0, 6, "px"]]]
};

const head = t => `<div class="sh-h"><span>${t}</span><button onclick="closeSheet()">✕</button></div>`;
const sliders = (k, b) => SLD[k][1].map(([p, n, a, z, u]) => `<label>${n}<span id="v_${p}">${b[p]}${u}</span></label><input type="range" min="${a}" max="${z}" step="${p === "tw" ? 100 : 1}" value="${b[p]}" oninput="setP('${p}',this.value,'${u}')">`).join("");

function sheet(k) {
  const s = $("#sheet"), b = cur(); let h = "";
  if (k === "add") {
    h = head("Tambah Elemen") + `<div class="grid">${KB_SHAPES.map(([id, n, i]) => `<button onclick="addShape('${id}')"><span>${i}</span>${n}</button>`).join("")}</div>` +
      (b && b.t === "shape" ? `<button class="wide" onclick="addText(1)">✍️ Teks di dalam elemen terpilih</button><button class="wide" onclick="addText(0)">Aa Teks terpisah</button>` : `<button class="wide" onclick="addText(0)">Aa Tambah Teks</button>`) +
      `<button class="wide" onclick="pickImg()">🖼 Gambar (PNG/JPG)</button><button class="wide" onclick="pickDoc()">📄 Lampirkan dokumen (PDF, DOCX, TXT, PPT...)</button>`;
  } else if (k === "canvas") {
    h = head("Kanvas") + `<label>Tinggi kanvas<span id="v_ch">${c.ch}px</span></label><input type="range" min="200" max="1400" value="${c.ch}" oninput="c.ch=+this.value;$('#v_ch').textContent=this.value+'px';layout()"><label>Warna latar</label><input type="color" value="${c.bg}" oninput="c.bg=this.value;layout()">`;
  } else if (!b) {
    return alert("Pilih elemen dulu (ketuk elemen di kanvas, atau tambah dengan tombol ＋).");
  } else if (k === "size" || k === "border") {
    h = head(SLD[k][0]) + sliders(k, b) + (k === "border" ? `<label>Warna border</label><input type="color" value="${b.bc}" oninput="setP('bc',this.value,'',1)"><p class="note">Border terlihat jelas pada persegi, lingkaran, dan gambar.</p>` : "");
  } else if (k === "color") {
    if (b.t === "text") h = head("Warna & Bentuk") + `<p class="note">Warna teks diatur di menu Teks.</p>`;
    else {
      const rad = b.t === "image" || ["rect", "rectw", "round"].includes(b.k);
      h = head("Warna & Bentuk") + (b.t === "shape" ? `<div class="sw">${COLORS.map(x => `<div style="background:${x}" onclick="setP('fill','${x}','',1)"></div>`).join("")}</div><label>Warna kustom</label><input type="color" value="${/^#/.test(b.fill) ? b.fill : "#27e0a0"}" oninput="setP('fill',this.value,'',1)">` : "") +
        (rad ? `<label>Radius sudut (ketik, misal 20px)</label><input type="text" value="${b.r}px" onchange="setP('r',parseFloat(this.value)||0,'',1)">` : `<p class="note">Bentuk ini tidak punya radius.</p>`);
    }
  } else if (k === "text") {
    if (b.t === "image") h = head("Teks") + `<p class="note">Gambar tidak punya teks. Tambahkan teks terpisah lewat tombol ＋.</p>`;
    else h = head("Teks") + `<label>Isi teks</label><textarea rows="2" oninput="cur().txt=this.value;kbPaint(nodeOf(cur()),cur())">${esc(b.txt)}</textarea>` + sliders("text", b) + `<label>Warna teks</label><input type="color" value="${b.tc}" oninput="setP('tc',this.value,'',1)"><label>Warna border teks</label><input type="color" value="${b.tbc}" oninput="setP('tbc',this.value,'',1)">`;
  }
  s.innerHTML = h; s.classList.add("on");
}

function closeSheet() { $("#sheet").classList.remove("on"); }
function setP(p, v, u, raw) { const b = cur(); b[p] = raw ? v : +v; const o = $("#v_" + p); if (o) o.textContent = v + u; kbPaint(nodeOf(b), b); }

$("#modeKonten").onclick = () => setDestMode("konten");
$("#modeBeranda").onclick = () => setDestMode("beranda");
$("#btnNewFolder").onclick = () => toggleFolderBox(true);
$("#saveFolderBtn").onclick = addFolder;
$("#cancelFolderBtn").onclick = () => toggleFolderBox(false);
$("#newFolderInp").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addFolder(); } };

function resizeDesc() {
  const d = $("#desc");
  if (!d) return;
  d.style.height = "auto";
  d.style.height = Math.max(84, d.scrollHeight) + "px";
}

if ($("#desc")) {
  $("#desc").addEventListener("input", resizeDesc);
  resizeDesc();
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

$("#pub").onclick = async () => {
  const title = $("#title").value.trim();
  if (!title) { alert("Judul wajib diisi."); return; }

  await adminCommit(async () => {
    let D = {};
    try { D = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}"); } catch (e) {}
    if (!Array.isArray(D.contents)) D.contents = def.map(x => ({ ...x }));
    if (!Array.isArray(D.announcements)) D.announcements = [];
    D.folders = c.folders;

    const rawCat = $("#cat").value.trim();
    const catVal = destMode === "beranda" ? (rawCat || "Pengumuman") : (rawCat || "Umum");
    const customDesc = $("#desc") ? $("#desc").value.trim() : "";
    const descVal = customDesc || (destMode === "beranda" ? "Pengumuman beranda" : "Konten visual");

    const payload = {
      id: Date.now(),
      target: destMode,
      title,
      category: catVal,
      desc: descVal,
      media: "",
      cw: c.cw,
      ch: c.ch,
      bg: c.bg,
      blocks: c.blocks,
      files: c.files,
      folders: c.folders
    };

    if (destMode === "beranda") {
      D.announcements.unshift(payload);
    } else {
      D.contents.unshift(payload);
    }

    try {
      localStorage.setItem("alcrazhyCommunity", JSON.stringify(D));
    } catch (e) {
      alert("Penyimpanan penuh. Kecilkan gambar atau hapus lampiran.");
      return;
    }

    if (window.AlcrazhyGitHub && typeof window.AlcrazhyGitHub.saveCommunityData === "function") {
      await window.AlcrazhyGitHub.saveCommunityData(D, "Publish konten / pengumuman komunitas");
    }

    alert(destMode === "beranda" ? "Pengumuman Beranda berhasil diterbitkan!" : "Konten berhasil diterbitkan!");
    location.href = "index.html";
  });
};

renderFolderSelect();
drawFiles();
redraw();
