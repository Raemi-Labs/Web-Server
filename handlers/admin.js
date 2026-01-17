const express = require("express");
const fs = require("fs");
const path = require("path");

const { loadSites } = require("./sites");
const { createSiteInConfig } = require("./site-manager");
const { readLogTail } = require("./logger");

function readAdminConfig(rootDir, i18n) {
  const configPath = path.join(rootDir, "admin.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    const message = i18n ? i18n.t(5011) : "Formato invalido em admin.json.";
    throw new Error(message);
  }
  return parsed;
}

function parseBasicAuth(headerValue) {
  if (!headerValue || !headerValue.startsWith("Basic ")) {
    return null;
  }
  const base64 = headerValue.slice(6);
  const decoded = Buffer.from(base64, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) {
    return null;
  }
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function authMiddleware(rootDir, i18n) {
  const t = i18n.t;
  return (req, res, next) => {
    let config;
    try {
      config = readAdminConfig(rootDir, i18n);
    } catch (error) {
      res.status(500).send(t(5000, { error: error.message }));
      return;
    }
    const credentials = parseBasicAuth(req.headers.authorization || "");
    const usernameOk = config.username ? credentials?.username === config.username : true;
    const passwordOk = credentials?.password === config.password;

    if (!credentials || !usernameOk || !passwordOk) {
      res.setHeader("WWW-Authenticate", `Basic realm="${t(5012)}"`);
      res.status(401).send(t(5001));
      return;
    }
    next();
  };
}

function adminPage(i18n) {
  const t = i18n.t;
  const labels = {
    requestFail: t(5007),
    fillNameDomain: t(5009),
    nameRequired: t(5003),
    noSites: t(4007),
    noLogs: t(5008),
    devFlag: t(4022),
    domainsLabel: t(4020),
    rootLabel: t(4021),
  };
  const labelsJson = JSON.stringify(labels);
  return `<!doctype html>
<html lang="${i18n.htmlLang || "pt-BR"}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t(4000)}</title>
    <style>
      :root {
        --ink: #1a1d24;
        --ink-soft: #3f4655;
        --accent: #0ea5a4;
        --accent-2: #f59e0b;
        --bg: #f2f6f4;
        --card: #ffffff;
        --border: rgba(26, 29, 36, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Space Grotesk", "Trebuchet MS", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at 8% 10%, rgba(14, 165, 164, 0.18), transparent 40%),
          radial-gradient(circle at 90% 0%, rgba(245, 158, 11, 0.18), transparent 40%),
          var(--bg);
      }
      header {
        padding: 32px clamp(24px, 4vw, 60px);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .brand {
        display: grid;
        gap: 6px;
      }
      .brand h1 {
        margin: 0;
        font-size: clamp(22px, 3vw, 30px);
        letter-spacing: -0.02em;
      }
      .brand span {
        color: var(--ink-soft);
        font-size: 14px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      main {
        padding: 0 clamp(24px, 4vw, 60px) 48px;
        display: grid;
        gap: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
      }
      .card {
        background: var(--card);
        border-radius: 20px;
        padding: 22px 24px;
        border: 1px solid var(--border);
        box-shadow: 0 16px 36px rgba(15, 18, 28, 0.08);
      }
      .card h2 {
        margin: 0 0 12px;
        font-size: 18px;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      button, input, select {
        font-family: inherit;
        font-size: 14px;
      }
      button {
        border: none;
        padding: 10px 16px;
        border-radius: 12px;
        background: var(--accent);
        color: white;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      button.secondary {
        background: #e9f0ef;
        color: var(--ink);
      }
      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(14, 165, 164, 0.2);
      }
      input[type="text"] {
        width: 100%;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--border);
      }
      .site-list {
        display: grid;
        gap: 12px;
      }
      .site-item {
        padding: 12px 14px;
        border-radius: 12px;
        background: #f8faf9;
        border: 1px solid var(--border);
        display: grid;
        gap: 4px;
      }
      .site-item strong {
        font-size: 15px;
      }
      .muted {
        color: var(--ink-soft);
        font-size: 13px;
      }
      .logs {
        font-family: "JetBrains Mono", "Courier New", monospace;
        font-size: 12px;
        background: #0f1720;
        color: #e5e7eb;
        border-radius: 16px;
        padding: 16px;
        max-height: 320px;
        overflow: auto;
        white-space: pre-wrap;
      }
      .status {
        margin-top: 10px;
        font-size: 13px;
        color: var(--ink-soft);
      }
      @media (max-width: 640px) {
        header {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">
        <span>${t(4001)}</span>
        <h1>${t(4002)}</h1>
      </div>
      <div class="controls">
        <button id="reloadAll">${t(4003)}</button>
        <button class="secondary" id="refreshSites">${t(4004)}</button>
        <button class="secondary" id="refreshLogs">${t(4005)}</button>
      </div>
    </header>
    <main>
      <section class="grid">
        <div class="card">
          <h2>${t(4006)}</h2>
          <div id="siteList" class="site-list"></div>
        </div>
        <div class="card">
          <h2>${t(4008)}</h2>
          <label class="muted">${t(4009)}</label>
          <input id="siteName" type="text" placeholder="${t(4023)}" />
          <label class="muted" style="margin-top:10px;">${t(4010)}</label>
          <input id="siteDomain" type="text" placeholder="${t(4024)}" />
          <label class="muted" style="margin-top:10px;">${t(4011)}</label>
          <select id="siteDev">
            <option value="false">${t(4012)}</option>
            <option value="true">${t(4013)}</option>
          </select>
          <div class="controls" style="margin-top:14px;">
            <button id="createSite">${t(4014)}</button>
          </div>
          <div id="createStatus" class="status"></div>
        </div>
        <div class="card">
          <h2>${t(4015)}</h2>
          <label class="muted">${t(4016)}</label>
          <input id="reloadSiteName" type="text" placeholder="${t(4023)}" />
          <div class="controls" style="margin-top:14px;">
            <button id="reloadSite">${t(4017)}</button>
          </div>
          <div id="reloadStatus" class="status"></div>
        </div>
      </section>
      <section class="card">
        <h2>${t(4018)}</h2>
        <div id="logs" class="logs">${t(4019)}</div>
      </section>
    </main>
    <script>
      const labels = ${labelsJson};
      const byId = (id) => document.getElementById(id);
      const format = (template, params) =>
        template.replace(/\\{(\\w+)\\}/g, (match, key) =>
          Object.prototype.hasOwnProperty.call(params, key) ? params[key] : match
        );
      const siteList = byId("siteList");
      const logsBox = byId("logs");
      const createStatus = byId("createStatus");
      const reloadStatus = byId("reloadStatus");

      async function fetchJson(url, options) {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || labels.requestFail);
        }
        return data;
      }

      function renderSites(sites) {
        siteList.innerHTML = "";
        if (!sites.length) {
          siteList.innerHTML = "<div class='muted'>" + labels.noSites + "</div>";
          return;
        }
        sites.forEach((site) => {
          const item = document.createElement("div");
          item.className = "site-item";
          item.innerHTML =
            "<strong>" + site.name + "</strong>" +
            "<span class='muted'>" + format(labels.domainsLabel, { domains: site.domains.join(", ") }) + "</span>" +
            "<span class='muted'>" + format(labels.rootLabel, { root: site.root, dev: site.isDevelop ? labels.devFlag : "" }) + "</span>";
          siteList.appendChild(item);
        });
      }

      async function loadSites() {
        const data = await fetchJson("/api/sites");
        renderSites(data.sites || []);
      }

      async function reloadAll() {
        await fetchJson("/api/reload", { method: "POST" });
        await loadSites();
      }

      async function reloadSite() {
        const name = byId("reloadSiteName").value.trim();
        if (!name) {
          reloadStatus.textContent = labels.nameRequired;
          return;
        }
        const data = await fetchJson("/api/reload-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        reloadStatus.textContent = data.message;
        await loadSites();
      }

      async function createSite() {
        const name = byId("siteName").value.trim();
        const domain = byId("siteDomain").value.trim();
        const isDevelop = byId("siteDev").value === "true";
        if (!name || !domain) {
          createStatus.textContent = labels.fillNameDomain;
          return;
        }
        const data = await fetchJson("/api/create-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, domain, isDevelop }),
        });
        createStatus.textContent = data.message;
        byId("siteName").value = "";
        byId("siteDomain").value = "";
        await loadSites();
      }

      async function loadLogs() {
        const data = await fetchJson("/api/logs?lines=200");
        logsBox.textContent = (data.lines || []).join("\\n") || labels.noLogs;
      }

      byId("reloadAll").addEventListener("click", () => reloadAll().catch(alert));
      byId("refreshSites").addEventListener("click", () => loadSites().catch(alert));
      byId("refreshLogs").addEventListener("click", () => loadLogs().catch(alert));
      byId("reloadSite").addEventListener("click", () => reloadSite().catch(alert));
      byId("createSite").addEventListener("click", () => createSite().catch(alert));

      loadSites().catch(() => {});
      loadLogs().catch(() => {});
    </script>
  </body>
</html>`;
}

function createAdminApp({ rootDir, getSites, setSites, clearCertCache, logPath, i18n }) {
  const t = i18n.t;
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(authMiddleware(rootDir, i18n));

  app.get("/", (req, res) => {
    res.send(adminPage(i18n));
  });

  app.get("/api/sites", (req, res) => {
    res.json({ sites: getSites() });
  });

  app.post("/api/reload", (req, res) => {
    try {
      const sites = loadSites(rootDir, i18n);
      setSites(sites);
      if (clearCertCache) {
        clearCertCache();
      }
      res.json({ ok: true, message: t(5002, { count: sites.length }) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.post("/api/reload-site", (req, res) => {
    const name = req.body?.name;
    if (!name) {
      res.status(400).json({ ok: false, message: t(5003) });
      return;
    }
    try {
      const sites = loadSites(rootDir, i18n);
      setSites(sites);
      if (clearCertCache) {
        clearCertCache();
      }
      const site = sites.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (!site) {
        res.status(404).json({ ok: false, message: t(5004, { name }) });
        return;
      }
      res.json({ ok: true, message: t(5005, { name: site.name }) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.post("/api/create-site", (req, res) => {
    try {
      const { name, domain, isDevelop } = req.body || {};
      const result = createSiteInConfig({ rootDir, name, domain, isDevelop, i18n });
      if (!result.ok) {
        res.status(400).json({ ok: false, message: t(result.errorId, result.errorData) });
        return;
      }
      const sites = loadSites(rootDir, i18n);
      setSites(sites);
      if (clearCertCache) {
        clearCertCache();
      }
      res.json({ ok: true, message: t(5006, { name: result.site.name }) });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.get("/api/logs", (req, res) => {
    const lines = Number.parseInt(req.query.lines, 10) || 200;
    const entries = readLogTail({ logPath, lines: Math.min(lines, 1000) });
    res.json({ lines: entries });
  });

  return app;
}

module.exports = {
  createAdminApp,
};
