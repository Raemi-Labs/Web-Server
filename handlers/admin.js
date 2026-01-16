const express = require("express");
const fs = require("fs");
const path = require("path");

const { loadSites } = require("./sites");
const { createSiteInConfig } = require("./site-manager");
const { readLogTail } = require("./logger");

function readAdminConfig(rootDir) {
  const configPath = path.join(rootDir, "admin.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Formato invalido em admin.json.");
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

function authMiddleware(rootDir) {
  return (req, res, next) => {
    let config;
    try {
      config = readAdminConfig(rootDir);
    } catch (error) {
      res.status(500).send(`Erro ao ler admin.json: ${error.message}`);
      return;
    }
    const credentials = parseBasicAuth(req.headers.authorization || "");
    const usernameOk = config.username ? credentials?.username === config.username : true;
    const passwordOk = credentials?.password === config.password;

    if (!credentials || !usernameOk || !passwordOk) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
      res.status(401).send("Autenticacao necessaria.");
      return;
    }
    next();
  };
}

function adminPage() {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Painel Admin - An Raemi Labs Web Server</title>
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
        <span>Admin Console</span>
        <h1>An Raemi Labs Web Server</h1>
      </div>
      <div class="controls">
        <button id="reloadAll">Recarregar tudo</button>
        <button class="secondary" id="refreshSites">Atualizar lista</button>
        <button class="secondary" id="refreshLogs">Atualizar logs</button>
      </div>
    </header>
    <main>
      <section class="grid">
        <div class="card">
          <h2>Sites configurados</h2>
          <div id="siteList" class="site-list"></div>
        </div>
        <div class="card">
          <h2>Criar novo site</h2>
          <label class="muted">Nome do site</label>
          <input id="siteName" type="text" placeholder="meu-site" />
          <label class="muted" style="margin-top:10px;">Domínio (ou separados por vírgula)</label>
          <input id="siteDomain" type="text" placeholder="exemplo.local" />
          <label class="muted" style="margin-top:10px;">Modo desenvolvimento</label>
          <select id="siteDev">
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </select>
          <div class="controls" style="margin-top:14px;">
            <button id="createSite">Criar site</button>
          </div>
          <div id="createStatus" class="status"></div>
        </div>
        <div class="card">
          <h2>Recarregar site específico</h2>
          <label class="muted">Nome do site</label>
          <input id="reloadSiteName" type="text" placeholder="meu-site" />
          <div class="controls" style="margin-top:14px;">
            <button id="reloadSite">Recarregar site</button>
          </div>
          <div id="reloadStatus" class="status"></div>
        </div>
      </section>
      <section class="card">
        <h2>Logs de acesso</h2>
        <div id="logs" class="logs">Carregando...</div>
      </section>
    </main>
    <script>
      const byId = (id) => document.getElementById(id);
      const siteList = byId("siteList");
      const logsBox = byId("logs");
      const createStatus = byId("createStatus");
      const reloadStatus = byId("reloadStatus");

      async function fetchJson(url, options) {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Falha na requisicao.");
        }
        return data;
      }

      function renderSites(sites) {
        siteList.innerHTML = "";
        if (!sites.length) {
          siteList.innerHTML = "<div class='muted'>Nenhum site configurado.</div>";
          return;
        }
        sites.forEach((site) => {
          const item = document.createElement("div");
          item.className = "site-item";
          item.innerHTML =
            "<strong>" + site.name + "</strong>" +
            "<span class='muted'>Domínios: " + site.domains.join(", ") + "</span>" +
            "<span class='muted'>Root: " + site.root + (site.isDevelop ? " | dev" : "") + "</span>";
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
          reloadStatus.textContent = "Informe o nome do site.";
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
          createStatus.textContent = "Preencha nome e domínio.";
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
        logsBox.textContent = (data.lines || []).join("\\n") || "Sem logs.";
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

function createAdminApp({ rootDir, getSites, setSites, clearCertCache, logPath }) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(authMiddleware(rootDir));

  app.get("/", (req, res) => {
    res.send(adminPage());
  });

  app.get("/api/sites", (req, res) => {
    res.json({ sites: getSites() });
  });

  app.post("/api/reload", (req, res) => {
    try {
      const sites = loadSites(rootDir);
      setSites(sites);
      if (clearCertCache) {
        clearCertCache();
      }
      res.json({ ok: true, message: `Sites recarregados (${sites.length}).` });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.post("/api/reload-site", (req, res) => {
    const name = req.body?.name;
    if (!name) {
      res.status(400).json({ ok: false, message: "Informe o nome do site." });
      return;
    }
    try {
      const sites = loadSites(rootDir);
      setSites(sites);
      if (clearCertCache) {
        clearCertCache();
      }
      const site = sites.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (!site) {
        res.status(404).json({ ok: false, message: `Site '${name}' nao encontrado.` });
        return;
      }
      res.json({ ok: true, message: `Site '${site.name}' recarregado.` });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.post("/api/create-site", (req, res) => {
    try {
      const { name, domain, isDevelop } = req.body || {};
      const result = createSiteInConfig({ rootDir, name, domain, isDevelop });
      if (!result.ok) {
        res.status(400).json({ ok: false, message: result.message });
        return;
      }
      const sites = loadSites(rootDir);
      setSites(sites);
      if (clearCertCache) {
        clearCertCache();
      }
      res.json({ ok: true, message: `Site '${result.site.name}' criado.` });
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
