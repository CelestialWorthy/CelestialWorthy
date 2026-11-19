const defaults = {
  name: "Alcrazhy Community",
  handle: "@alcrazhy.community",
  bio: "Tempat berkumpul, berbagi cerita, dan membangun sesuatu bersama.",
  banner: "",
  avatar: "",
  contents: [
    { id: 1, title: "Pengumuman Resmi #1", category: "Pengumuman", desc: "Selamat datang di ruang komunitas kita. Silakan buat konten baru dan jelajahi galeri!", media: "" },
    { id: 2, title: "Panduan Komunitas", category: "Panduan", desc: "Aturan dasar dan tata cara berdiskusi yang sehat di Alcrazhy Community.", media: "" }
  ],
  announcements: [],
  mediaList: [
    { id: 1, text: "AETHER\nNOX", bg: "linear-gradient(140deg,#121b32,#8c405e)" },
    { id: 2, text: "✦", bg: "radial-gradient(circle,#a95b84,#29213e)" },
    { id: 3, text: "COMMUNITY", bg: "linear-gradient(135deg,#2a3451,#141820)" },
    { id: 4, text: "✧", bg: "linear-gradient(140deg,#9a7650,#292039)" }
  ]
};

function getCommunity() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}") };
  } catch (e) {
    return defaults;
  }
}

const data = getCommunity();

function escText(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function formatClickableText(raw) {
  if (typeof window.linkifyText === "function") return window.linkifyText(raw);
  const str = String(raw || "");
  const re = /(https?:\/\/[^\s<]+)/gi;
  let out = "", last = 0, m;
  while ((m = re.exec(str)) !== null) {
    out += escText(str.slice(last, m.index));
    let href = m[0], trail = "";
    while (/[.,!?;:)\]]$/.test(href)) {
      trail = href.slice(-1) + trail;
      href = href.slice(0, -1);
    }
    if (href) {
      out += `<a href="${escText(href)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:#27e0a0;text-decoration:underline;word-break:break-all">${escText(href)}</a>`;
    }
    out += escText(trail);
    last = re.lastIndex;
  }
  out += escText(str.slice(last));
  return out.replace(/\n/g, "<br>");
}

// Terapkan profil utama
document.getElementById("communityName").textContent = data.name;
document.getElementById("communityHandle").textContent = data.handle;
document.getElementById("communityBio").innerHTML = formatClickableText(data.bio);
document.getElementById("aboutName").textContent = data.name;
document.getElementById("aboutBio").innerHTML = formatClickableText(data.bio);

if (data.avatar) document.getElementById("avatarImage").src = data.avatar;
if (data.banner) document.getElementById("coverImage").style.backgroundImage = `url("${data.banner}")`;

// Render Feed Pengumuman di Tab Beranda
function renderAnnouncementFeed() {
  const feed = document.getElementById("announcementFeed");
  if (!feed) return;
  feed.innerHTML = "";

  const directAnnouncements = Array.isArray(data.announcements) ? data.announcements : [];
  const fromContents = (data.contents || defaults.contents).filter(c => /pengumuman/i.test(String(c.category || "")));
  const announcements = [...directAnnouncements, ...fromContents];

  const countLabel = document.getElementById("announcementCountLabel");
  if (countLabel) countLabel.textContent = `${announcements.length} pengumuman`;

  if (announcements.length === 0) {
    feed.innerHTML = `<article class="post-card"><p class="post-text" style="margin:0;color:var(--muted)">Belum ada pengumuman. Buat konten dengan kategori <b>Pengumuman</b> atau pilih opsi <b>2. Beranda</b> di halaman Tambah Konten.</p></article>`;
    return;
  }

  announcements.forEach(item => {
    const card = document.createElement("article");
    card.className = "post-card";
    card.style.cursor = "pointer";

    const hasBlocks = Array.isArray(item.blocks) && item.blocks.length > 0 && window.renderKonten;
    const hasMedia = !hasBlocks && Boolean(item.media);

    card.innerHTML = `
      <div class="post-author">
        <div class="mini-avatar">${escText((data.name || "A").charAt(0).toUpperCase())}</div>
        <div><strong>${escText(data.name || "Alcrazhy Community")}</strong><small>${escText(item.category || "Pengumuman")}</small></div>
        <span class="more">Buka</span>
      </div>
      <h3 style="margin:14px 0 6px;font:700 17px 'Space Grotesk',sans-serif">${escText(item.title || "Tanpa Judul")}</h3>
      <p class="post-text" style="margin-top:6px">${formatClickableText(item.desc || "")}</p>
      ${hasBlocks ? `<div class="ann-preview" style="margin-top:10px"></div>` : ""}
      ${hasMedia ? `<div class="post-visual" style="background:url('${escText(item.media)}') center/cover no-repeat"></div>` : ""}
    `;

    if (hasBlocks) {
      const prev = card.querySelector(".ann-preview");
      renderKonten(prev, { ...item, files: [] });
    }

    card.addEventListener("click", () => openContentFullscreen(item));
    feed.appendChild(card);
  });
}

// Render List Konten
function renderContentList(filter = "") {
  const container = document.getElementById("contentListContainer");
  if (!container) return;
  container.innerHTML = "";
  
  const contents = data.contents || defaults.contents;
  const filtered = contents.filter(c => 
    (c.title || "").toLowerCase().includes(filter) || (c.desc || "").toLowerCase().includes(filter)
  );
  
  const countLabel = document.getElementById("contentCountLabel");
  if (countLabel) countLabel.textContent = `${filtered.length} konten`;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--muted);">Belum ada konten ditemukan.</div>`;
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement("div");
    row.className = "member-row";
    row.style.cursor = "pointer";
    
    row.innerHTML = `
      <div class="member-avatar" style="background:#3a3b52">${escText(item.title ? item.title.charAt(0).toUpperCase() : 'C')}</div>
      <div class="member-info">
        <strong>${escText(item.title)}</strong>
        <small>${escText(item.category || 'Konten')} · ${formatClickableText(item.desc ? item.desc.substring(0, 80) : '')}</small>
      </div>
      <span class="role">${escText(item.category ? item.category.toUpperCase() : 'BUKA')}</span>
    `;

    let pressTimer = null, longPressed = false;
    row.style.userSelect = "none";
    row.style.webkitTouchCallout = "none";
    row.addEventListener("pointerdown", () => {
      longPressed = false;
      pressTimer = setTimeout(() => {
        longPressed = true;
        if (navigator.vibrate) navigator.vibrate(30);
        deleteContent(item.id);
      }, 600);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev =>
      row.addEventListener(ev, () => clearTimeout(pressTimer))
    );
    row.addEventListener("contextmenu", e => e.preventDefault());
    row.addEventListener("click", () => {
      if (longPressed) { longPressed = false; return; }
      openContentFullscreen(item);
    });
    container.appendChild(row);
  });
}

// Render Galeri Media (Arsip Gambar)
function renderMediaGallery() {
  const grid = document.getElementById("mediaGridContainer");
  if (!grid) return;
  grid.innerHTML = "";

  const archivedImages = [];
  const seenSrc = new Set();

  function pushImage(obj) {
    const key = obj.src ? `img:${obj.src}` : `tile:${obj.text || ""}:${obj.bg || ""}`;
    if (seenSrc.has(key)) return;
    seenSrc.add(key);
    archivedImages.push(obj);
  }

  // 1. Gambar dari mediaList bawaan / tersimpan
  (data.mediaList || defaults.mediaList).forEach(m => {
    pushImage({
      title: (m.text || "Arsip Media").replace(/\n+/g, " "),
      src: m.url || "",
      bg: m.bg || "linear-gradient(140deg,#121b32,#8c405e)",
      text: m.text || ""
    });
  });

  // 2. Kumpulkan gambar dari blok kanvas Konten & Pengumuman Beranda
  const allItems = [
    ...(Array.isArray(data.announcements) ? data.announcements : []),
    ...(Array.isArray(data.contents) ? data.contents : [])
  ];

  allItems.forEach(item => {
    if (item && item.media) {
      pushImage({
        title: item.title || "Arsip Gambar",
        category: item.category || "Arsip",
        src: item.media
      });
    }
    if (item && Array.isArray(item.blocks)) {
      item.blocks.forEach(b => {
        if (b && b.t === "image" && b.src) {
          pushImage({
            title: item.title || "Arsip Gambar",
            category: item.category || "Arsip",
            src: b.src
          });
        }
      });
    }
  });

  if (!archivedImages.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--muted);">Belum ada gambar di arsip.</div>`;
    return;
  }

  archivedImages.forEach(m => {
    const tile = document.createElement("div");
    tile.className = "media-tile";
    tile.style.cursor = "pointer";
    tile.style.overflow = "hidden";
    tile.style.position = "relative";

    if (m.src) {
      tile.style.backgroundImage = `url("${m.src}")`;
      tile.style.backgroundSize = "cover";
      tile.style.backgroundPosition = "center";
      tile.innerHTML = "";
    } else {
      tile.style.background = m.bg || "linear-gradient(140deg,#121b32,#8c405e)";
      tile.innerHTML = `<span>${escText(m.text || "")}</span>`;
    }

    tile.addEventListener("click", () => {
      if (!m.src) return;
      const modal = document.getElementById("contentDetailModal");
      const body = document.getElementById("detailContentBody");
      if (!modal || !body) return;
      body.innerHTML = `
        <span style="font-size:10px;letter-spacing:2px;color:var(--accent);font-weight:800;text-transform:uppercase;">${escText(m.category || "ARSIP GAMBAR")}</span>
        <h2 style="font:700 20px 'Space Grotesk',sans-serif;margin:8px 0 14px;color:var(--text);">${escText(m.title || "Arsip Gambar")}</h2>
        <div style="border-radius:12px;overflow:hidden;background:#090b10;">
          <img src="${escText(m.src)}" alt="${escText(m.title || "Gambar")}" style="width:100%;height:auto;display:block;">
        </div>
      `;
      modal.style.display = "block";
    });

    grid.appendChild(tile);
  });
}


// Modal Detail Konten
function openContentFullscreen(item) {
  const modal = document.getElementById("contentDetailModal");
  const body = document.getElementById("detailContentBody");
  
  body.innerHTML = `
    <span style="font-size: 10px; letter-spacing: 2px; color: var(--accent); font-weight: 800; text-transform: uppercase;">${escText(item.category || 'KONTEN')}</span>
    <h1 style="font: 700 24px 'Space Grotesk'; margin: 8px 0 14px; color: var(--text);">${escText(item.title)}</h1>
    ${item.media ? `<div style="margin: 15px 0; border-radius: 10px; overflow: hidden; max-height: 350px;"><img src="${escText(item.media)}" style="width:100%; object-fit:cover;"></div>` : ''}
    <p id="detailDescP" style="font-size: 14px; line-height: 1.7; color: #c3c9d3; margin-top: 10px;">${formatClickableText(item.desc || "")}</p>
  `;
  modal.style.display = "block";

  if (item.blocks && item.blocks.length && window.renderKonten) {
    const host = document.createElement("div");
    host.style.margin = "12px 0";
    const descEl = body.querySelector("#detailDescP");
    if (descEl) descEl.replaceWith(host);
    renderKonten(host, item);
  }

  const delBtn = document.createElement("button");
  delBtn.textContent = "🗑 Hapus konten";
  delBtn.style.cssText = "margin-top:20px;width:100%;padding:12px;background:#2a1517;color:#ef4444;border:1px solid #5a2222;border-radius:10px;font:600 14px 'DM Sans',sans-serif;cursor:pointer";
  delBtn.addEventListener("click", () => deleteContent(item.id));
  body.appendChild(delBtn);
}

function deleteContent(id) {
  if (!confirm("Hapus konten ini? Tindakan ini tidak bisa dibatalkan.")) return;
  data.contents = (data.contents || defaults.contents).filter(c => c.id !== id);
  data.announcements = (data.announcements || []).filter(c => c.id !== id);
  const saved = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
  saved.contents = data.contents;
  saved.announcements = data.announcements;
  localStorage.setItem("alcrazhyCommunity", JSON.stringify(saved));
  document.getElementById("contentDetailModal").style.display = "none";
  renderAnnouncementFeed();
  const s = document.getElementById("contentSearch");
  renderContentList(s ? s.value.toLowerCase() : "");
}

document.getElementById("closeDetailBtn").addEventListener("click", () => {
  document.getElementById("contentDetailModal").style.display = "none";
});

// Navigasi Tab
const tabs = document.querySelectorAll(".tab");
tabs.forEach(tab => tab.addEventListener("click", () => {
  tabs.forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
  document.getElementById(tab.dataset.tab).classList.add("active");
}));

// Navigasi Bottom Menu
document.querySelectorAll(".bottom-item").forEach(link => link.addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelectorAll(".bottom-item").forEach(x => x.classList.remove("active"));
  link.classList.add("active");
  const id = link.getAttribute("href").slice(1);
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === id));
  document.querySelectorAll(".content-section").forEach(s => s.classList.toggle("active", s.id === id));
}));

const search = document.getElementById("contentSearch");
if (search) {
  search.addEventListener("input", (e) => renderContentList(e.target.value.toLowerCase()));
}

document.getElementById("shareButton").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showToast("Tautan komunitas disalin!");
  } catch (e) {
    showToast("Bagikan tautan halaman ini dari browser.");
  }
});

document.getElementById("searchToggle").addEventListener("click", () => {
  document.querySelector(".tabs").scrollIntoView({ behavior: "smooth" });
  showToast("Gunakan tab List Konten untuk mencari.");
});

function showToast(message) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

// Animasi bertahap untuk kartu pengumuman, list konten, media & about
function animateCommunityItems() {
  const targets = document.querySelectorAll(
    "#announcementFeed .post-card, #contentListContainer .member-row, #mediaGridContainer .media-tile, #tentang .about-card"
  );
  targets.forEach((el, i) => {
    el.classList.remove("ac-show");
    el.style.setProperty("--ac-delay", `${Math.min(i, 8) * 55}ms`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add("ac-show");
      });
    });
  });
}

const _renderAnnouncementFeed = renderAnnouncementFeed;
renderAnnouncementFeed = function () {
  _renderAnnouncementFeed();
  animateCommunityItems();
};

const _renderContentList = renderContentList;
renderContentList = function (filter = "") {
  _renderContentList(filter);
  animateCommunityItems();
};

const _renderMediaGallery = renderMediaGallery;
renderMediaGallery = function () {
  _renderMediaGallery();
  animateCommunityItems();
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setTimeout(animateCommunityItems, 20));
});

document.querySelectorAll(".bottom-item").forEach((link) => {
  link.addEventListener("click", () => setTimeout(animateCommunityItems, 20));
});

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
    const p = layers.find(x => x.type === "profile") || layers[0], fx = {};
    Object.keys(B).forEach(k => fx[k] = p[k]);
    fx.fill = p.fill;
    D.profileFx = fx;
    D.layers = layers.filter(x => x.id !== p.id);
    D.ui = {};
    Object.values(ui).forEach(l => {
      if (uiDirty(l)) {
        const { orig, ...o } = l;
        D.ui[l.id] = o;
      }
    });
    if (window.AlcrazhyGitHub) {
      await window.AlcrazhyGitHub.saveCommunityData(D, "Update editor & tampilan komunitas");
    } else {
      localStorage.setItem("alcrazhyCommunity", JSON.stringify(D));
    }
    alert("Perubahan berhasil disimpan!");
    location.href = "index.html";
  });
}

animateCommunityItems();
renderAnnouncementFeed();
renderContentList();
renderMediaGallery();
