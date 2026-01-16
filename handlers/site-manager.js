const fs = require("fs");
const path = require("path");

const { loadSites } = require("./sites");

function readConfig(rootDir) {
  const configPath = path.join(rootDir, "websites.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Formato invalido em websites.json.");
  }
  if (!Array.isArray(parsed.sites)) {
    parsed.sites = [];
  }
  return { configPath, parsed };
}

function writeConfig(configPath, config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function copyFallbackCertificates(rootDir, destDir) {
  const fallbackDir = path.join(rootDir, "certs");
  const srcKey = path.join(fallbackDir, "cert.key");
  const srcCert = path.join(fallbackDir, "cert.crt");
  const destKey = path.join(destDir, "cert.key");
  const destCert = path.join(destDir, "cert.crt");

  if (!fs.existsSync(srcKey) || !fs.existsSync(srcCert)) {
    return { copied: false, reason: "Certificados padrao ausentes em certs/." };
  }

  fs.copyFileSync(srcKey, destKey);
  fs.copyFileSync(srcCert, destCert);
  return { copied: true };
}

function createDefaultIndex(rootDir, siteRoot, siteName) {
  const indexPath = path.join(rootDir, siteRoot, "index.html");
  if (fs.existsSync(indexPath)) {
    return false;
  }
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${siteName} - An Raemi Labs</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: "Space Grotesk", "Trebuchet MS", "Segoe UI", sans-serif;
        background: linear-gradient(120deg, #eef7f5, #f7efe4);
        color: #1c1f26;
      }
      .card {
        padding: 36px 40px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 25px 60px rgba(15, 16, 26, 0.12);
        text-align: center;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 32px;
      }
      p {
        margin: 0;
        color: #3d4452;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${siteName}</h1>
      <p>Site criado com o console do An Raemi Labs Web Server.</p>
    </div>
  </body>
</html>`;
  fs.writeFileSync(indexPath, html);
  return true;
}

function normalizeDomains(domainInput) {
  if (!domainInput) {
    return [];
  }
  if (Array.isArray(domainInput)) {
    return domainInput;
  }
  if (typeof domainInput === "string" && domainInput.includes(",")) {
    return domainInput.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [domainInput];
}

function createSiteInConfig({ rootDir, name, domain, isDevelop }) {
  if (!name || !domain) {
    return { ok: false, message: "Uso: create-site <nome> <dominio> [--dev]" };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return { ok: false, message: "Nome invalido. Use letras, numeros, - ou _." };
  }

  const { configPath, parsed } = readConfig(rootDir);
  const existing = parsed.sites.find(
    (site) => site.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return { ok: false, message: `Ja existe um site com o nome '${name}'.` };
  }

  const domainValue = normalizeDomains(domain);
  const rootPath = `websites/${name}`;
  const certPath = `certificates/${name}`;
  const newSite = {
    name,
    root: rootPath,
    domain: domainValue.length === 1 ? domainValue[0] : domainValue,
    index: "index.html",
    isDevelop: Boolean(isDevelop),
    certificates: certPath,
  };

  parsed.sites.push(newSite);
  writeConfig(configPath, parsed);

  ensureDir(path.join(rootDir, rootPath));
  ensureDir(path.join(rootDir, certPath));
  const indexCreated = createDefaultIndex(rootDir, rootPath, name);
  const certResult = copyFallbackCertificates(rootDir, path.join(rootDir, certPath));

  return {
    ok: true,
    site: newSite,
    indexCreated,
    certResult,
  };
}

function reloadSites(rootDir) {
  return loadSites(rootDir);
}

module.exports = {
  readConfig,
  writeConfig,
  ensureDir,
  copyFallbackCertificates,
  createDefaultIndex,
  createSiteInConfig,
  reloadSites,
};
