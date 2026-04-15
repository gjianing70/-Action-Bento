/* ============================================
   Video2Action — Action Bento v3
   Active / History split, confetti, category accents
   ============================================ */

class ActionBento {
  constructor() {
    this.lang = getSavedLang();
    this.items = [];          // active (not-all-done groups)
    this.history = [];        // archived (all-done groups)
    this.provider = "openai";
    this.analyzing = false;
    this._archiving = false;
    this.view = "active";     // "active" | "history"

    this._cacheDom();

    try { this.items = this.buildMockItems(); } catch (e) { console.error("[Bento] mock err:", e); }
    this.init();
  }

  _cacheDom() {
    const $ = id => document.getElementById(id);
    this.list         = $("milestoneList");
    this.historyList  = $("historyList");
    this.toast        = $("actionToast");
    this.linkInput    = $("linkInput");
    this.analyzeBtn   = $("analyzeBtn");
    this.analyzeLabel = $("analyzeLabel");
    this.analyzeSpinner = $("analyzeSpinner");
    this.linkStatus   = $("linkStatus");
    this.progressSection = $("progressSection");
    this.progressLabel   = $("progressLabel");
    this.progressCount   = $("progressCount");
    this.progressFill    = $("progressFill");
    this.settingsBtn     = $("settingsBtn");
    this.settingsOverlay = $("settingsOverlay");
    this.settingsClose   = $("settingsClose");
    this.providerSwitcher = $("providerSwitcher");
    this.apiKeyInput  = $("apiKeyInput");
    this.keyToggle    = $("keyToggle");
    this.endpointInput = $("endpointInput");
    this.modelInput   = $("modelInput");
    this.customEndpointGroup = $("customEndpointGroup");
    this.saveSettingsBtn = $("saveSettingsBtn");
    this.connectionStatus = $("connectionStatus");
    this.activeView   = $("activeView");
    this.historyView  = $("historyView");
    this.historyStats = $("historyStats");
    this.tabActive    = $("tabActive");
    this.tabHistory   = $("tabHistory");
    this.confettiCanvas = $("confettiCanvas");
  }

  buildMockItems() {
    const locale = t(this.lang);
    if (!locale.mockMilestones) return [];
    return locale.mockMilestones.map(m => ({ ...m, completed: false, createdAt: Date.now() - 60000 }));
  }

  init() {
    this.applyLang();
    this.renderActive();
    this.bindTabs();
    this.bindLangSwitcher();
    this.bindLinkBar();
    this.bindSettings();
    this.loadSettingsFromServer();
  }

  /* ======== Tabs ======== */

  bindTabs() {
    const tabs = document.getElementById("viewTabs");
    if (!tabs) return;
    tabs.addEventListener("click", e => {
      const btn = e.target.closest(".view-tab");
      if (!btn) return;
      this.switchView(btn.dataset.view);
    });
  }

  switchView(view) {
    this.view = view;
    if (this.tabActive)  this.tabActive.classList.toggle("active", view === "active");
    if (this.tabHistory) this.tabHistory.classList.toggle("active", view === "history");
    if (this.activeView)  this.activeView.classList.toggle("hidden", view !== "active");
    if (this.historyView) this.historyView.classList.toggle("hidden", view !== "history");
    if (view === "active") this.renderActive();
    else this.renderHistory();
  }

  /* ======== Language ======== */

  applyLang() {
    const locale = t(this.lang);
    document.documentElement.lang = locale.htmlLang;
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    set("headerTitle", locale.header.title);
    set("headerSubtitle", locale.header.subtitle);
    set("settingsTitle", locale.settings.title);
    set("labelProvider", locale.settings.provider);
    set("labelApiKey", locale.settings.apiKey);
    set("labelEndpoint", locale.settings.endpoint);
    set("labelModel", locale.settings.model);
    set("saveLabel", locale.settings.save);
    if (this.linkInput)    this.linkInput.placeholder = locale.linkBar.placeholder;
    if (this.analyzeLabel) this.analyzeLabel.textContent = locale.linkBar.analyze;
    if (this.progressLabel) this.progressLabel.textContent = locale.progress.label;
    if (this.tabActive)  this.tabActive.textContent = locale.history.btnActive;
    if (this.tabHistory) this.tabHistory.textContent = locale.history.btnHistory;
    document.querySelectorAll(".lang-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.lang === this.lang));
    this.updateHistoryBadge();
  }

  bindLangSwitcher() {
    const el = document.getElementById("langSwitcher");
    if (!el) return;
    el.addEventListener("click", e => {
      const btn = e.target.closest(".lang-btn");
      if (!btn || btn.dataset.lang === this.lang) return;
      this.lang = btn.dataset.lang;
      saveLang(this.lang);
      const locale = t(this.lang);
      const relabel = arr => arr.forEach(item => {
        const mock = locale.mockMilestones && locale.mockMilestones.find(m => m.id === item.id);
        if (mock) { item.title = mock.title; item.action = mock.action; item.source = mock.source; item.categoryLabel = mock.categoryLabel; }
        if (item.category && locale.categories && locale.categories[item.category]) item.categoryLabel = locale.categories[item.category];
      });
      relabel(this.items);
      relabel(this.history);
      this.applyLang();
      if (this.view === "active") this.renderActive(); else this.renderHistory();
    });
  }

  /* ======== Active View Render ======== */

  renderActive() {
    try {
      const real = this.items.filter(i => !i.skeleton);
      const skeletons = this.items.filter(i => i.skeleton);

      if (real.length === 0 && skeletons.length === 0) {
        this.renderEmpty(this.list, "empty");
        this.updateProgress();
        this.updateFooter();
        return;
      }

      const groups = this._groupBy(real);
      let html = "";
      if (skeletons.length) html += this._skeletonHTML(skeletons);
      for (const [src, ms] of groups) html += this._groupHTML(src, ms, false);
      if (this.list) { this.list.innerHTML = html; this._bindCheckboxes(this.list); }
      this.updateProgress();
      this.updateFooter();
      this.updateHistoryBadge();
    } catch (e) { console.error("[Bento] renderActive err:", e); }
  }

  /* ======== History View Render ======== */

  renderHistory() {
    try {
      const locale = t(this.lang);
      const total = this.history.length;
      if (this.historyStats) {
        if (total === 0) {
          this.historyStats.innerHTML = "";
        } else {
          this.historyStats.innerHTML = `
            <div class="history-stats-number">${total}</div>
            <div class="history-stats-label">${locale.history.statsPrefix} ${total} ${locale.history.statsSuffix}</div>
            <div class="history-stats-motivation">${locale.history.statsMotivation}</div>
          `;
        }
      }
      if (this.history.length === 0) {
        this.renderEmpty(this.historyList, "emptyHistory");
        return;
      }
      const groups = this._groupBy(this.history);
      let html = "";
      for (const [src, ms] of groups) html += this._groupHTML(src, ms, true);
      if (this.historyList) { this.historyList.innerHTML = html; this._bindHistoryRows(this.historyList); }
    } catch (e) { console.error("[Bento] renderHistory err:", e); }
  }

  /* ======== Shared Render Helpers ======== */

  renderEmpty(container, key) {
    if (!container) return;
    const locale = t(this.lang);
    const d = locale[key] || locale.empty;
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">${d.icon}</div><div class="empty-text">${d.text}</div><div class="empty-hint">${d.hint}</div></div>`;
  }

  _groupBy(items) {
    const sorted = [...items].sort((a, b) => {
      if (a.groupId !== b.groupId) return (a.createdAt || 0) - (b.createdAt || 0);
      return (a.order || 0) - (b.order || 0);
    });
    const map = new Map();
    for (const it of sorted) {
      const k = it.groupId || it.source || "ungrouped";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    return map;
  }

  _groupHTML(source, milestones, isHistory) {
    const locale = t(this.lang);
    const label = (milestones[0] && milestones[0].source) || source;
    const short = label.length > 60 ? label.substring(0, 57) + "\u2026" : label;
    const done = milestones.filter(m => m.completed).length;
    const total = milestones.length;
    const isArticle = milestones[0] && milestones[0].contentType === "article";
    const icon = isArticle ? "\ud83d\udcdd" : "\ud83d\udcfa";

    let html = `<div class="group-section ${isHistory ? "history-group" : ""}"><div class="group-header"><span class="group-source" title="${this._esc(label)}">${icon} ${this._esc(short)}</span><span class="group-badge">${locale.groupBadge(total)}</span>`;
    if (!isHistory) html += `<span class="group-progress-mini">${done}/${total}</span>`;
    html += `</div>`;
    for (const ms of milestones) html += this._rowHTML(ms, isHistory);
    html += `</div>`;
    return html;
  }

  _rowHTML(ms, isHistory) {
    const completed = ms.completed ? "completed" : "";
    const checked = ms.completed ? "checked" : "";
    const cat = ms.category || "core";
    return `<div class="milestone-row ${completed}" data-id="${ms.id}" data-cat="${cat}"><div class="ms-checkbox ${checked}" data-id="${ms.id}">${ms.completed ? "\u2713" : ""}</div><span class="ms-time">${this._esc(ms.timestamp || "")}</span><div class="ms-content"><div class="ms-title">${this._esc(ms.title || "")}</div><div class="ms-action">${this._esc(ms.action || "")}</div></div><span class="ms-cat" data-cat="${cat}">${this._esc(ms.categoryLabel || "")}</span></div>`;
  }

  _skeletonHTML(skeletons) {
    const locale = t(this.lang);
    let h = `<div class="group-header"><span class="group-source">\ud83d\udd0d ${locale.linkBar.analyzing || "Analyzing..."}</span></div>`;
    for (const s of skeletons) h += `<div class="milestone-row skeleton" data-id="${s.id}"><div class="ms-checkbox"></div><span class="ms-time">--:--</span><div class="ms-content"><div class="ms-title">Loading</div><div class="ms-action">Analyzing</div></div><span class="ms-cat" data-cat="core">...</span></div>`;
    return h;
  }

  /* ======== Progress ======== */

  updateProgress() {
    const real = this.items.filter(i => !i.skeleton);
    const total = real.length;
    const done = real.filter(i => i.completed).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const locale = t(this.lang);
    if (this.progressCount) this.progressCount.textContent = locale.progress.count(done, total);
    if (this.progressFill) this.progressFill.style.width = pct + "%";
    if (this.progressSection) this.progressSection.classList.toggle("all-done", done === total && total > 0);
    const ac = document.getElementById("actionCount");
    if (ac) ac.textContent = total > 0 ? locale.counter(total - done) : "";
  }

  updateFooter() {
    const locale = t(this.lang);
    const real = this.items.filter(i => !i.skeleton);
    const total = real.length;
    const done = real.filter(i => i.completed).length;
    const footer = document.getElementById("footerText");
    if (!footer) return;
    if (total === 0) footer.textContent = locale.footer.hot;
    else if (total - done === 0) footer.textContent = locale.footer.cleared;
    else if (done > 0) footer.textContent = locale.footer.partial(total - done);
    else footer.textContent = locale.footer.hot;
  }

  updateHistoryBadge() {
    if (!this.tabHistory) return;
    if (this.history.length > 0) {
      this.tabHistory.classList.add("has-items");
      this.tabHistory.setAttribute("data-count", this.history.length);
    } else {
      this.tabHistory.classList.remove("has-items");
      this.tabHistory.removeAttribute("data-count");
    }
  }

  /* ======== Checkbox & Archive Logic ======== */

  _bindCheckboxes(container) {
    container.querySelectorAll(".milestone-row:not(.skeleton)").forEach(row => {
      row.addEventListener("click", e => {
        if (e.target.closest(".ms-time")) return;
        if (this._archiving) return;
        const id = row.dataset.id;
        const item = this.items.find(i => i.id === id);
        if (!item || item.skeleton) return;
        item.completed = !item.completed;
        if (item.completed) this.showToast();
        this._checkArchive(item);
      });
    });
  }

  _bindHistoryRows(container) {
    container.querySelectorAll(".milestone-row").forEach(row => {
      row.addEventListener("click", e => {
        if (e.target.closest(".ms-time")) return;
        const id = row.dataset.id;
        const item = this.history.find(i => i.id === id);
        if (!item) return;

        const gid = item.groupId || item.source || "ungrouped";
        const groupItems = this.history.filter(i => (i.groupId || i.source || "ungrouped") === gid);

        this.history = this.history.filter(i => !groupItems.includes(i));
        for (const it of groupItems) {
          it.completed = false;
          if (!this.items.some(x => x.id === it.id)) this.items.push(it);
        }

        this.renderHistory();
        this.updateHistoryBadge();
        this.updateProgress();
        this.updateFooter();
      });
    });
  }

  _checkArchive(changedItem) {
    const gid = changedItem.groupId || changedItem.source || "ungrouped";
    const groupItems = this.items.filter(i => (i.groupId || i.source || "ungrouped") === gid && !i.skeleton);
    const allDone = groupItems.length > 0 && groupItems.every(i => i.completed);

    this.renderActive();

    if (allDone) {
      this._archiving = true;
      this._playConfetti(() => {
        this.showToastAllDone();
        setTimeout(() => {
          const toMove = groupItems.filter(i => this.items.includes(i));
          for (const it of toMove) {
            if (!this.history.some(h => h.id === it.id)) this.history.push(it);
          }
          this.items = this.items.filter(i => !toMove.includes(i));
          this._archiving = false;
          this.renderActive();
          this.updateHistoryBadge();
        }, 1200);
      });
    }
  }

  /* ======== Confetti ======== */

  _playConfetti(onDone) {
    const canvas = this.confettiCanvas;
    if (!canvas) { if (onDone) onDone(); return; }
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#FF9A76","#7BC67E","#7E6BC4","#D4923A","#6BB8D6","#E08B8B","#FFBA92"];
    const particles = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rv: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }

    let raf;
    const gravity = 0.35;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rv;
        p.life -= 0.012;
        if (p.life <= 0) continue;
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(p.life, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) { raf = requestAnimationFrame(animate); }
      else { cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); if (onDone) onDone(); }
    };
    raf = requestAnimationFrame(animate);
  }

  /* ======== Link Bar ======== */

  bindLinkBar() {
    if (!this.analyzeBtn) return;
    this.analyzeBtn.addEventListener("click", () => this.handleAnalyze());
    if (this.linkInput) {
      this.linkInput.addEventListener("keydown", e => { if (e.key === "Enter") this.handleAnalyze(); });
      this.linkInput.addEventListener("paste", () => {
        setTimeout(() => {
          if (this.linkInput.value.trim()) {
            this.linkInput.parentElement.style.borderColor = "var(--accent-light)";
            setTimeout(() => { this.linkInput.parentElement.style.borderColor = ""; }, 800);
          }
        }, 50);
      });
    }
  }

  async handleAnalyze() {
    if (this.analyzing) return;
    if (this.view !== "active") this.switchView("active");
    const locale = t(this.lang);
    let url = this.linkInput ? this.linkInput.value.trim() : "";

    if (!url) {
      try {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.startsWith("http")) { url = clip; if (this.linkInput) this.linkInput.value = url; }
      } catch (_) {}
    }
    if (!url) { this.showLinkStatus(locale.linkBar.noLink, "info"); return; }

    this.setAnalyzing(true);
    const skelIds = [];
    for (let i = 0; i < 5; i++) {
      const sid = `skel-${Date.now()}-${i}`;
      skelIds.push(sid);
      this.items.push({ id: sid, skeleton: true, createdAt: Date.now() });
    }
    try { this.renderActive(); } catch (_) {}

    try {
      const resp = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await resp.json();
      this.items = this.items.filter(i => !skelIds.includes(i.id));

      if (!resp.ok) {
        this.showLinkStatus(data.error === "no_api_key" ? locale.linkBar.noKey : locale.linkBar.error + (data.detail ? ` (${data.detail.substring(0, 80)})` : ""), "error");
        this.renderActive();
        return;
      }

      const milestones = data.milestones || [];
      const catLabels = locale.categories;
      for (const ms of milestones) {
        this.items.push({ ...ms, categoryLabel: (catLabels && catLabels[ms.category]) || ms.categoryLabel || "", completed: false, createdAt: ms.createdAt || Date.now() });
      }
      this.renderActive();
      this.showToast();
      this.showLinkStatus(typeof locale.linkBar.success === "function" ? locale.linkBar.success(milestones.length) : locale.linkBar.success, "success");
      if (this.linkInput) this.linkInput.value = "";
    } catch (err) {
      console.error("[Bento] analyze err:", err);
      this.items = this.items.filter(i => !skelIds.includes(i.id));
      this.renderActive();
      this.showLinkStatus(locale.linkBar.error, "error");
    } finally {
      this.setAnalyzing(false);
    }
  }

  setAnalyzing(v) {
    this.analyzing = v;
    if (this.analyzeBtn) this.analyzeBtn.disabled = v;
    if (this.analyzeLabel) this.analyzeLabel.classList.toggle("hidden", v);
    if (this.analyzeSpinner) this.analyzeSpinner.classList.toggle("hidden", !v);
  }

  showLinkStatus(text, type) {
    if (!this.linkStatus) return;
    this.linkStatus.textContent = text;
    this.linkStatus.className = `link-status status-${type}`;
    setTimeout(() => { if (this.linkStatus) this.linkStatus.classList.add("hidden"); }, 6000);
  }

  /* ======== Settings ======== */

  bindSettings() {
    if (this.settingsBtn)   this.settingsBtn.addEventListener("click",  () => this.openSettings());
    if (this.settingsClose) this.settingsClose.addEventListener("click", () => this.closeSettings());
    if (this.settingsOverlay) this.settingsOverlay.addEventListener("click", e => { if (e.target === this.settingsOverlay) this.closeSettings(); });
    if (this.providerSwitcher) this.providerSwitcher.addEventListener("click", e => {
      const btn = e.target.closest(".provider-btn");
      if (!btn) return;
      this.provider = btn.dataset.provider;
      this.providerSwitcher.querySelectorAll(".provider-btn").forEach(b => b.classList.toggle("active", b.dataset.provider === this.provider));
      if (this.customEndpointGroup) this.customEndpointGroup.classList.toggle("hidden", this.provider !== "custom");
    });
    if (this.keyToggle) this.keyToggle.addEventListener("click", () => {
      if (!this.apiKeyInput) return;
      const isPw = this.apiKeyInput.type === "password";
      this.apiKeyInput.type = isPw ? "text" : "password";
      this.keyToggle.textContent = isPw ? "\ud83d\ude48" : "\ud83d\udc41";
    });
    if (this.saveSettingsBtn) this.saveSettingsBtn.addEventListener("click", () => this.saveSettings());
    document.addEventListener("keydown", e => { if (e.key === "Escape" && this.settingsOverlay && !this.settingsOverlay.classList.contains("hidden")) this.closeSettings(); });
  }

  openSettings() {
    if (this.settingsOverlay) this.settingsOverlay.classList.remove("hidden");
    if (this.connectionStatus) { this.connectionStatus.textContent = ""; this.connectionStatus.className = "connection-status"; }
  }
  closeSettings() { if (this.settingsOverlay) this.settingsOverlay.classList.add("hidden"); }

  async loadSettingsFromServer() {
    try {
      const resp = await fetch("/api/config");
      const data = await resp.json();
      this.provider = data.provider || "openai";
      if (this.modelInput) this.modelInput.value = data.model || "gpt-4o-mini";
      if (this.endpointInput) this.endpointInput.value = data.endpoint || "";
      if (this.providerSwitcher) this.providerSwitcher.querySelectorAll(".provider-btn").forEach(b => b.classList.toggle("active", b.dataset.provider === this.provider));
      if (this.customEndpointGroup) this.customEndpointGroup.classList.toggle("hidden", this.provider !== "custom");
      if (data.hasKey && this.apiKeyInput) this.apiKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\uff08\u5df2\u4fdd\u5b58\uff09";
    } catch (_) {}
  }

  async saveSettings() {
    const locale = t(this.lang);
    const payload = { provider: this.provider, model: (this.modelInput && this.modelInput.value.trim()) || "gpt-4o-mini", endpoint: (this.endpointInput && this.endpointInput.value.trim()) || "" };
    const key = this.apiKeyInput ? this.apiKeyInput.value.trim() : "";
    if (key) payload.apiKey = key;
    try {
      await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const label = document.getElementById("saveLabel");
      if (label) { label.textContent = locale.settings.saved; setTimeout(() => { label.textContent = locale.settings.save; }, 2000); }
      if (key && this.apiKeyInput) { this.apiKeyInput.value = ""; this.apiKeyInput.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\uff08\u5df2\u4fdd\u5b58\uff09"; }
      this.testConnection();
    } catch (err) {
      if (this.connectionStatus) { this.connectionStatus.textContent = locale.settings.testFail; this.connectionStatus.className = "connection-status fail"; }
    }
  }

  async testConnection() {
    const locale = t(this.lang);
    if (this.connectionStatus) { this.connectionStatus.textContent = "..."; this.connectionStatus.className = "connection-status"; }
    try {
      const resp = await fetch("/api/test-connection", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await resp.json();
      if (!this.connectionStatus) return;
      if (data.ok) { this.connectionStatus.textContent = locale.settings.testOk; this.connectionStatus.className = "connection-status ok"; }
      else { this.connectionStatus.textContent = `${locale.settings.testFail} \u2014 ${data.error || ""}`; this.connectionStatus.className = "connection-status fail"; }
    } catch (_) { if (this.connectionStatus) { this.connectionStatus.textContent = locale.settings.testFail; this.connectionStatus.className = "connection-status fail"; } }
  }

  /* ======== Utils ======== */

  _esc(s) { if (!s) return ""; return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  showToast() {
    if (!this.toast) return;
    const locale = t(this.lang);
    this.toast.textContent = locale.toast;
    this.toast.classList.remove("toast-done");
    this.toast.classList.add("show");
    setTimeout(() => this.toast.classList.remove("show"), 1500);
  }

  showToastAllDone() {
    if (!this.toast) return;
    const locale = t(this.lang);
    this.toast.textContent = locale.toastAllDone;
    this.toast.classList.add("show", "toast-done");
    setTimeout(() => this.toast.classList.remove("show", "toast-done"), 2400);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try { window._bento = new ActionBento(); }
  catch (e) { console.error("[Bento] init err:", e); }
});
