// home.js
import {
  watchAdminAuth,
  loginAdmin,
  logoutAdmin,
  getLocalItems,
  deleteSeparatedEntry,
  syncSeparatedFromCloud,
  loadSettingDoc
} from "./store.js";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=300&h=300&fit=crop";

let isAdmin = false;
let berandaPosts = getLocalItems("beranda");
let kontenItems = getLocalItems("konten");

const $ = (sel) => document.querySelector(sel);

function esc(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function formatText(raw) {
  if (typeof window.linkifyText === "function") return window.linkifyText(raw);
  return esc(raw).replace(/\n/g, "<br>");
}

function showToast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window._homeToastTimer);
  window._homeToastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

// =========================================================
// TERAPKAN PENGATURAN HALAMAN UTAMA & UI
// =========================================================
async function applySiteHeaderAndUI() {
  try {
    const siteCfg = await loadSettingDoc("home_profile", {
      name: "Alcrazhy Community",
      handle: "@alcrazhy.community",
      bio: "Tempat berkumpul, berbagi cerita, dan membangun sesuatu bersama.",
      avatar: "",
      banner: ""
    });

    if (siteCfg) {
      if ($("#communityName")) $("#communityName").textContent = siteCfg.name || "Alcrazhy Community";
      if ($("#communityHandle")) $("#communityHandle").textContent = siteCfg.handle || "@alcrazhy.community";
      if ($("#communityBio")) $("#communityBio").innerHTML = formatText(siteCfg.bio || "");
      if ($("#aboutName")) $("#aboutName").textContent = siteCfg.name || "Alcrazhy Community";
      if ($("#aboutBio")) $("#aboutBio").innerHTML = formatText(siteCfg.bio || "");

      if (siteCfg.avatar) {
        if ($("#avatarImage")) $("#avatarImage").src = siteCfg.avatar;
        if ($("#navProfileAvatar")) $("#navProfileAvatar").src = siteCfg.avatar;
      } else if ($("#avatarImage")) {
        $("#avatarImage").src = DEFAULT_AVATAR;
      }

      if (siteCfg.banner && $("#coverImage")) {
        $("#coverImage").style.backgroundImage = `url("${siteCfg.banner}")`;
      }
    }
  } catch (err) {
    console.warn("Gagal memuat profil beranda:", err);
  }

  try {
    const uiDoc = await loadSettingDoc("home_ui", null);
    if (uiDoc && typeof window.applyUI === "function") {
      window.applyUI(document, uiDoc);
    }
  } catch (err) {
    console.warn("Gagal memuat UI beranda:", err);
  }
}

// =========================================================
// RENDER FILE TERPISAH (MEDIA / DOKUMEN / UNGGAHAN LAIN)
// =========================================================
function renderSeparatedFileGroups(item) {
  const mediaList = Array.isArray(item.mediaFiles) ? item.mediaFiles : [];
  const docList = Array.isArray(item.docFiles) ? item.docFiles : [];
  const otherList = Array.isArray(item.otherFiles) ? item.otherFiles : [];

  const parts = [];

  if (mediaList.length) {
    const imgs = mediaList.map((m) => {
      const isImg = /^image\//i.test(m.type || "") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(m.name || m.url || "");
      if (isImg) {
        return `<a href="${esc(m.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="display:block;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#090b10;">
          <img src="${esc(m.url)}" alt="${esc(m.name)}" style="width:100%;max-height:280px;object-fit:cover;display:block;">
        </a>`;
      }
      return `<a href="${esc(m.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="display:block;padding:10px 12px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;color:var(--text);text-decoration:none;font-size:13px;">
        🎬 ${esc(m.name)}
      </a>`;
    }).join("");
    parts.push(`<div style="margin-top:12px;display:grid;gap:8px;">
      <div style="font-size:11px;color:var(--accent);font-weight:700;letter-spacing:1px;">MEDIA (${mediaList.length})</div>
      ${imgs}
    </div>`);
  }

  if (docList.length) {
    const docs = docList.map((d) => `
      <a href="${esc(d.url)}" target="_blank" rel="noopener" download="${esc(d.name)}" onclick="event.stopPropagation()" style="display:block;padding:10px 12px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;color:var(--text);text-decoration:none;font-size:13px;">
        📄 ${esc(d.name)} <span style="color:var(--muted);font-size:11px;">(${Math.max(1, Math.round((d.size || 0) / 1024))} KB)</span>
      </a>
    `).join("");
    parts.push(`<div style="margin-top:12px;display:grid;gap:8px;">
      <div style="font-size:11px;color:var(--green);font-weight:700;letter-spacing:1px;">DOKUMEN PDF / TXT / DOCS (${docList.length})</div>
      ${docs}
    </div>`);
  }

  if (otherList.length) {
    const others = otherList.map((o) => `
      <a href="${esc(o.url)}" target="_blank" rel="noopener" download="${esc(o.name)}" onclick="event.stopPropagation()" style="display:block;padding:10px 12px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;color:var(--text);text-decoration:none;font-size:13px;">
        📦 ${esc(o.name)} <span style="color:var(--muted);font-size:11px;">(${Math.max(1, Math.round((o.size || 0) / 1024))} KB)</span>
      </a>
    `).join("");
    parts.push(`<div style="margin-top:12px;display:grid;gap:8px;">
      <div style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:1px;">UNGGAHAN LAIN (${otherList.length})</div>
      ${others}
    </div>`);
  }

  return parts.join("");
}

// =========================================================
// RENDER BERANDA (TERPISAH DARI KONTEN)
// =========================================================
function renderBerandaFeed() {
  const feed = $("#announcementFeed");
  if (!feed) return;
  feed.innerHTML = "";

  const label = $("#announcementCountLabel");
  if (label) label.textContent = `${berandaPosts.length} postingan`;

  if (!berandaPosts.length) {
    feed.innerHTML = `<article class="post-card ac-show"><p class="post-text" style="margin:0;color:var(--muted)">Belum ada postingan beranda.</p></article>`;
    return;
  }

  berandaPosts.forEach((item, idx) => {
    const card = document.createElement("article");
    card.className = "post-card ac-show";
    card.style.setProperty("--ac-delay", `${Math.min(idx, 8) * 50}ms`);
    card.style.cursor = "pointer";

    const hasBlocks = Array.isArray(item.blocks) && item.blocks.length > 0 && typeof window.renderKonten === "function";
    const bodyText = item.textBody || item.desc || "";

    card.innerHTML = `
      <div class="post-author">
        <div class="mini-avatar">${esc((item.category || "B").charAt(0).toUpperCase())}</div>
        <div>
          <strong>${esc(item.title || "Tanpa Judul")}</strong>
          <small>${esc(item.category || "Beranda")}</small>
        </div>
        <span class="more">Buka</span>
      </div>
      ${bodyText ? `<p class="post-text">${formatText(bodyText)}</p>` : ""}
      ${hasBlocks ? `<div class="beranda-canvas-host" style="margin-top:10px;"></div>` : ""}
      ${renderSeparatedFileGroups(item)}
    `;

    if (hasBlocks) {
      window.renderKonten(card.querySelector(".beranda-canvas-host"), { ...item, files: [] });
    }

    card.addEventListener("click", () => openItemModal("beranda", item));
    feed.appendChild(card);
  });
}

// =========================================================
// RENDER LIST KONTEN (TERPISAH DARI BERANDA)
// =========================================================
function renderKontenList(query = "") {
  const listEl = $("#contentListContainer");
  if (!listEl) return;
  listEl.innerHTML = "";

  const q = String(query || "").toLowerCase().trim();
  const filtered = kontenItems.filter((item) =>
    String(item.title || "").toLowerCase().includes(q) ||
    String(item.category || "").toLowerCase().includes(q) ||
    String(item.desc || "").toLowerCase().includes(q) ||
    String(item.textBody || "").toLowerCase().includes(q)
  );

  const label = $("#contentCountLabel");
  if (label) label.textContent = `${filtered.length} konten`;

  if (!filtered.length) {
    listEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted);">Belum ada konten ditemukan.</div>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "member-row ac-show";
    row.style.setProperty("--ac-delay", `${Math.min(idx, 8) * 45}ms`);
    row.style.cursor = "pointer";

    const mCnt = (item.mediaFiles || []).length;
    const dCnt = (item.docFiles || []).length;
    const oCnt = (item.otherFiles || []).length;
    const infoText = item.desc || item.textBody || "";

    row.innerHTML = `
      <div class="member-avatar">${esc((item.title || "K").charAt(0).toUpperCase())}</div>
      <div class="member-info">
        <strong>${esc(item.title || "Tanpa Judul")}</strong>
        <small>${esc(item.category || "Konten")} • Media:${mCnt} • Dok:${dCnt} • Lain:${oCnt}</small>
        ${infoText ? `<small style="color:#c3c9d3;">${esc(infoText.slice(0, 90))}</small>` : ""}
      </div>
      <span class="role">BUKA</span>
    `;

    row.addEventListener("click", () => openItemModal("konten", item));
    listEl.appendChild(row);
  });
}

// =========================================================
// RENDER GALERI MEDIA DARI DATA TERPISAH
// =========================================================
function renderGaleriMedia() {
  const grid = $("#mediaGridContainer");
  if (!grid) return;
  grid.innerHTML = "";

  const all = [...berandaPosts, ...kontenItems];
  const collected = [];

  all.forEach((item) => {
    (item.mediaFiles || []).forEach((m) => {
      if (m && m.url) {
        collected.push({
          title: item.title || m.name || "Media",
          category: item.category || item.target || "Media",
          url: m.url,
          name: m.name || "Media"
        });
      }
    });
  });

  if (!collected.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--muted);">Belum ada media terunggah.</div>`;
    return;
  }

  collected.forEach((m, idx) => {
    const tile = document.createElement("div");
    tile.className = "media-tile ac-show";
    tile.style.setProperty("--ac-delay", `${Math.min(idx, 8) * 40}ms`);
    tile.style.cssText += "height:150px;border-radius:12px;border:1px solid var(--line);cursor:pointer;overflow:hidden;background:center/cover no-repeat var(--panel2);";
    tile.style.backgroundImage = `url("${esc(m.url)}")`;

    tile.addEventListener("click", () => {
      const modal = $("#contentDetailModal");
      const body = $("#detailContentBody");
      if (!modal || !body) return;
      body.innerHTML = `
        <span style="font-size:10px;letter-spacing:2px;color:var(--accent);font-weight:800;text-transform:uppercase;">${esc(m.category)}</span>
        <h2 style="font:700 20px 'Space Grotesk',sans-serif;margin:8px 0 14px;color:var(--text);">${esc(m.title)}</h2>
        <div style="border-radius:12px;overflow:hidden;background:#090b10;">
          <img src="${esc(m.url)}" alt="${esc(m.name)}" style="width:100%;height:auto;display:block;">
        </div>
      `;
      modal.style.display = "block";
    });

    grid.appendChild(tile);
  });
}

// =========================================================
// MODAL DETAIL & HAPUS PER ITEM
// =========================================================
function openItemModal(target, item) {
  const modal = $("#contentDetailModal");
  const body = $("#detailContentBody");
  if (!modal || !body) return;

  const fullText = item.textBody || item.desc || "";
  const hasBlocks = Array.isArray(item.blocks) && item.blocks.length > 0 && typeof window.renderKonten === "function";

  body.innerHTML = `
    <span style="font-size:10px;letter-spacing:2px;color:var(--accent);font-weight:800;text-transform:uppercase;">${esc(target.toUpperCase())} • ${esc(item.category || "")}</span>
    <h1 style="font:700 24px 'Space Grotesk',sans-serif;margin:8px 0 14px;color:var(--text);">${esc(item.title || "Tanpa Judul")}</h1>
    ${fullText ? `<p id="modalFullText" style="font-size:14px;line-height:1.7;color:#c3c9d3;margin-top:10px;">${formatText(fullText)}</p>` : ""}
    <div id="modalCanvasHost" style="margin:14px 0;"></div>
    <div id="modalFilesHost">${renderSeparatedFileGroups(item)}</div>
  `;

  if (hasBlocks) {
    window.renderKonten(body.querySelector("#modalCanvasHost"), { ...item, files: [] });
  }

  if (isAdmin) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "🗑 Hapus Item Ini";
    delBtn.style.cssText = "margin-top:20px;width:100%;padding:12px;background:#2a1517;color:#ef4444;border:1px solid #5a2222;border-radius:10px;font:600 14px 'DM Sans',sans-serif;cursor:pointer;";
    delBtn.addEventListener("click", async () => {
      if (!confirm(`Hapus "${item.title}"?`)) return;
      try {
        if (target === "beranda") {
          berandaPosts = await deleteSeparatedEntry("beranda", item.id);
          renderBerandaFeed();
        } else {
          kontenItems = await deleteSeparatedEntry("konten", item.id);
          renderKontenList($("#contentSearch")?.value || "");
        }
        renderGaleriMedia();
        modal.style.display = "none";
        showToast("Item berhasil dihapus.");
      } catch (err) {
        showToast("Gagal hapus: " + err.message);
      }
    });
    body.appendChild(delBtn);
  }

  modal.style.display = "block";
}

// =========================================================
// NAVIGASI TAB, TOMBOL, PENCARIAN & AUTH ADMIN
// =========================================================
function activateSection(tabName) {
  if (!tabName) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));
  document.querySelectorAll(".content-section").forEach((s) => s.classList.toggle("active", s.id === tabName));
  document.querySelectorAll(".bottom-item").forEach((b) => {
    const href = b.getAttribute("href") || "";
    b.classList.toggle("active", href === "#" + tabName);
  });
}

function initAllButtons() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      activateSection(tab.dataset.tab);
    });
  });

  document.querySelectorAll(".bottom-item").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();
      activateSection(href.slice(1));
    });
  });

  $("#viewKontenBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    activateSection("konten");
  });

  $("#closeDetailBtn")?.addEventListener("click", () => {
    const modal = $("#contentDetailModal");
    if (modal) modal.style.display = "none";
  });

  $("#contentSearch")?.addEventListener("input", (e) => {
    renderKontenList(e.target.value);
  });

  $("#shareButton")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast("Tautan disalin!");
    } catch {
      showToast("Salin tautan dari alamat browser.");
    }
  });

  $("#searchToggle")?.addEventListener("click", () => {
    activateSection("konten");
    $("#contentSearch")?.focus();
  });

  const loginModal = $("#homeLoginModal");
  $("#adminAuthBtn")?.addEventListener("click", async () => {
    if (isAdmin) {
      if (confirm("Keluar dari sesi Admin?")) {
        await logoutAdmin();
        showToast("Logout berhasil.");
      }
    } else {
      loginModal?.classList.add("open");
    }
  });

  $("#closeHomeLoginModal")?.addEventListener("click", () => {
    loginModal?.classList.remove("open");
  });

  $("#homeLoginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#homeLoginEmail")?.value.trim() || "";
    const pass = $("#homeLoginPassword")?.value || "";
    try {
      await loginAdmin(email, pass);
      loginModal?.classList.remove("open");
      $("#homeLoginForm")?.reset();
      showToast("Login Admin aktif!");
    } catch (err) {
      showToast("Login gagal: " + err.message);
    }
  });

  watchAdminAuth((admin) => {
    isAdmin = admin;
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
      el.style.display = admin ? "" : "none";
    });
    const btn = $("#adminAuthBtn");
    if (btn) {
      btn.textContent = admin ? "⎋" : "🔑";
      btn.title = admin ? "Logout Admin" : "Login Admin";
    }
  });
}

initAllButtons();
applySiteHeaderAndUI();
renderBerandaFeed();
renderKontenList();
renderGaleriMedia();

Promise.all([
  syncSeparatedFromCloud("beranda").catch(() => berandaPosts),
  syncSeparatedFromCloud("konten").catch(() => kontenItems)
]).then(([bList, kList]) => {
  if (Array.isArray(bList)) berandaPosts = bList;
  if (Array.isArray(kList)) kontenItems = kList;
  renderBerandaFeed();
  renderKontenList($("#contentSearch")?.value || "");
  renderGaleriMedia();
});
