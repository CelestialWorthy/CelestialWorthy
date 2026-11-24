// home.js
alert("home.js jalan!");
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
// KOMPONEN ALUR: JUDUL -> LINK -> MEDIA -> DESKRIPSI -> FILE
// =========================================================
function extractLink(item) {
  if (!item || typeof item !== "object") return "";
  const direct = item.link || item.url || item.href || item.externalLink || "";
  if (String(direct).trim()) return String(direct).trim();

  const textPool = [item.desc, item.textBody, item.content, item.body]
    .filter(Boolean)
    .join(" ");
  const match = textPool.match(/https?:\/\/[^\s<]+/i);
  return match ? match[0] : "";
}

function parseYouTubeId(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      return u.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (host.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/shorts/")[1]?.split("/")[0] || "";
      }
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/embed/")[1]?.split("/")[0] || "";
      }
      if (u.searchParams.get("v")) {
        return u.searchParams.get("v") || "";
      }
    }
  } catch {}
  return "";
}

function getDomainLabel(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

function renderLinkBlock(item) {
  const url = extractLink(item);
  if (!url) return "";

  const safeHref = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const domain = getDomainLabel(safeHref);
  const ytId = parseYouTubeId(safeHref);
  const ytThumb = ytId ? `https://img.youtube.com/vi/${esc(ytId)}/hqdefault.jpg` : "";

  const thumbHtml = ytThumb
    ? `<div style="position:relative;aspect-ratio:16/9;width:100%;min-width:0;background:#090b10;overflow:hidden;border-bottom:1px solid var(--line);">
        <img src="${ytThumb}" alt="${esc(domain)}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.parentElement.style.display='none'">
        <span style="position:absolute;right:10px;bottom:10px;background:rgba(9,11,16,.82);color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;">▶ Video</span>
      </div>`
    : "";

  return `
    <a href="${esc(safeHref)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"
       style="display:block;width:100%;min-width:0;max-width:100%;margin-top:10px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--panel2);text-decoration:none;color:var(--text);">
      ${thumbHtml}
      <div style="padding:10px 12px;display:grid;grid-template-columns:minmax(0,1fr);gap:4px;min-width:0;">
        <div style="min-width:0;font-size:13px;font-weight:700;color:var(--text);line-height:1.35;overflow-wrap:anywhere;">
          ${esc(item.title || domain)}
        </div>
        <div style="min-width:0;font-size:12px;color:var(--muted);line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${esc(safeHref)}
        </div>
        <div style="min-width:0;margin-top:2px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--green);font-weight:600;">
          <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🔗 ${esc(domain)}</span>
          <span style="flex-shrink:0;">Buka ↗</span>
        </div>
      </div>
    </a>
  `;
}

function collectMediaEntries(item) {
  if (!item || typeof item !== "object") return [];
  const rawList = [];

  if (Array.isArray(item.mediaFiles)) rawList.push(...item.mediaFiles);
  if (Array.isArray(item.media)) rawList.push(...item.media);
  if (Array.isArray(item.images)) rawList.push(...item.images);

  if (typeof item.media === "string" && item.media.trim()) {
    rawList.push({ url: item.media.trim(), name: "Media" });
  }
  if (typeof item.image === "string" && item.image.trim()) {
    rawList.push({ url: item.image.trim(), name: "Media" });
  }
  if (typeof item.mediaUrl === "string" && item.mediaUrl.trim()) {
    rawList.push({ url: item.mediaUrl.trim(), name: "Media" });
  }

  return rawList
    .map((m) => (typeof m === "string" ? { url: m, name: "Media" } : m))
    .filter((m) => m && (m.url || m.downloadUrl || m.src || m.data || m.path))
    .map((m) => ({
      url: m.url || m.downloadUrl || m.src || m.data || m.path,
      name: m.name || "Media",
      type: m.type || ""
    }));
}

function renderMediaBlock(item, force16by9 = false) {
  const mediaList = collectMediaEntries(item);
  if (!mediaList.length) return "";

  const ratioCss = force16by9
    ? "aspect-ratio:16/9;width:100%;object-fit:cover;display:block;"
    : "width:100%;max-height:280px;object-fit:cover;display:block;";

  const itemsHtml = mediaList.map((m) => {
    const isVideo = /^video\//i.test(m.type || "") || /\.(mp4|webm|mov|ogg)$/i.test(m.name || m.url || "");
    if (isVideo) {
      return `<div style="border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#090b10;">
        <video src="${esc(m.url)}" controls playsinline style="${ratioCss}"></video>
      </div>`;
    }
    return `<a href="${esc(m.url)}" target="_blank" rel="noopener" style="display:block;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#090b10;">
      <img src="${esc(m.url)}" alt="${esc(m.name)}" style="${ratioCss}" onerror="this.style.display='none'">
    </a>`;
  }).join("");

  return `<div style="margin-top:10px;display:grid;gap:8px;">${itemsHtml}</div>`;
}

function renderDescriptionBlock(item) {
  const text = item.desc || item.textBody || "";
  if (!text) return "";
  return `<p class="post-text" style="margin-top:10px;">${formatText(text)}</p>`;
}

function renderFilesBlock(item) {
  const docList = Array.isArray(item.docFiles) ? item.docFiles : [];
  const otherList = Array.isArray(item.otherFiles) ? item.otherFiles : [];
  const allFiles = [...docList, ...otherList];
  if (!allFiles.length) return "";

  const links = allFiles.map((f) => `
    <a href="${esc(f.url)}" target="_blank" rel="noopener" download="${esc(f.name)}" style="display:block;padding:10px 12px;background:var(--panel2);border:1px solid var(--line);border-radius:10px;color:var(--text);text-decoration:none;font-size:13px;">
      📎 ${esc(f.name)} <span style="color:var(--muted);font-size:11px;">(${Math.max(1, Math.round((f.size || 0) / 1024))} KB)</span>
    </a>
  `).join("");

  return `<div style="margin-top:10px;display:grid;gap:8px;">${links}</div>`;
}

function createAdminDeleteButton(target, item, onAfterDelete) {
  if (!isAdmin) return null;
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.textContent = "🗑 Hapus";
  delBtn.style.cssText = "margin-top:10px;padding:7px 12px;background:#2a1517;color:#ef4444;border:1px solid #5a2222;border-radius:8px;font:600 12px 'DM Sans',sans-serif;cursor:pointer;";
  delBtn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    if (!confirm(`Hapus "${item.title}"?`)) return;
    try {
      if (target === "beranda") {
        berandaPosts = await deleteSeparatedEntry("beranda", item.id);
      } else {
        kontenItems = await deleteSeparatedEntry("konten", item.id);
      }
      onAfterDelete();
      renderGaleriMedia();
      showToast("Item berhasil dihapus.");
    } catch (err) {
      showToast("Gagal hapus: " + err.message);
    }
  });
  return delBtn;
}

// =========================================================
// RENDER BERANDA: JUDUL -> LINK -> MEDIA (16:9) -> DESKRIPSI -> FILE
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

    card.innerHTML = `
      <div class="post-author">
        <div class="mini-avatar">${esc((item.category || "B").charAt(0).toUpperCase())}</div>
        <div>
          <strong>${esc(item.title || "Tanpa Judul")}</strong>
          <small>${esc(item.category || "Beranda")}</small>
        </div>
      </div>
      ${renderLinkBlock(item)}
      ${renderMediaBlock(item, true)}
      ${renderDescriptionBlock(item)}
      ${renderFilesBlock(item)}
    `;

    const delBtn = createAdminDeleteButton("beranda", item, renderBerandaFeed);
    if (delBtn) card.appendChild(delBtn);
    feed.appendChild(card);
  });
}

// =========================================================
// RENDER LIST KONTEN: JUDUL -> LINK -> MEDIA -> DESKRIPSI -> FILE (+ KANVAS)
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
    String(item.link || "").toLowerCase().includes(q) ||
    String(item.textBody || "").toLowerCase().includes(q)
  );

  const label = $("#contentCountLabel");
  if (label) label.textContent = `${filtered.length} konten`;

  if (!filtered.length) {
    listEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted);">Belum ada konten ditemukan.</div>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const card = document.createElement("article");
    card.className = "post-card ac-show";
    card.style.setProperty("--ac-delay", `${Math.min(idx, 8) * 45}ms`);

    const hasBlocks = Array.isArray(item.blocks) && item.blocks.length > 0 && typeof window.renderKonten === "function";

    card.innerHTML = `
      <div class="post-author">
        <div class="mini-avatar">${esc((item.title || "K").charAt(0).toUpperCase())}</div>
        <div>
          <strong>${esc(item.title || "Tanpa Judul")}</strong>
          <small>${esc(item.category || "Konten")}</small>
        </div>
      </div>
      ${renderLinkBlock(item)}
      ${renderMediaBlock(item, false)}
      ${hasBlocks ? `<div class="konten-canvas-host" style="margin-top:10px;"></div>` : ""}
      ${renderDescriptionBlock(item)}
      ${renderFilesBlock(item)}
    `;

    if (hasBlocks) {
      window.renderKonten(card.querySelector(".konten-canvas-host"), { ...item, files: [] });
    }

    const delBtn = createAdminDeleteButton("konten", item, () => renderKontenList($("#contentSearch")?.value || ""));
    if (delBtn) card.appendChild(delBtn);
    listEl.appendChild(card);
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
  initThemeToggle();

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
    renderBerandaFeed();
    renderKontenList($("#contentSearch")?.value || "");
  });
}

const THEME_STORAGE_KEY = "alcrazhy_site_theme";

function applySiteTheme(themeName) {
  const active = themeName === "sefirah" ? "sefirah" : "default";
  if (active === "sefirah") {
    document.documentElement.setAttribute("data-theme", "sefirah");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, active);
  } catch {}

  const btn = $("#themeToggleBtn");
  if (btn) {
    btn.classList.toggle("theme-on", active === "sefirah");
    btn.title = active === "sefirah"
      ? "Tema: Sefirah (Klik untuk Default)"
      : "Tema: Default (Klik untuk Sefirah)";
  }
}

function initThemeToggle() {
  let saved = "default";
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY) || "default";
  } catch {}
  applySiteTheme(saved);

  const btn = $("#themeToggleBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "sefirah" ? "default" : "sefirah";
    applySiteTheme(next);
    showToast(next === "sefirah" ? "Tema Sefirah aktif" : "Tema Default aktif");
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
