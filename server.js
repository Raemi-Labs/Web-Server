const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const ROOT_DIR = __dirname;
const CONFIG_PATH = path.join(ROOT_DIR, "websites.json");
const CERT_DIR = path.join(ROOT_DIR, "certs");
const HTTPS_KEY_PATH = path.join(CERT_DIR, "localhost.key");
const HTTPS_CERT_PATH = path.join(CERT_DIR, "localhost.crt");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.sites || !Array.isArray(parsed.sites)) {
    throw new Error("O arquivo websites.json precisa de uma lista 'sites'.");
  }
  return parsed.sites.map((site) => {
    if (!site.name || !site.root || !site.domain || !site.index) {
      throw new Error("Cada site precisa de name, root, domain e index.");
    }
    const domains = Array.isArray(site.domain) ? site.domain : [site.domain];
    return {
      name: site.name,
      root: path.resolve(ROOT_DIR, site.root),
      domains: domains.map((domain) => domain.toLowerCase()),
      index: site.index,
    };
  });
}

function getSiteForHost(hostname, sites) {
  const normalized = hostname.toLowerCase();
  return sites.find((site) => site.domains.includes(normalized)) || null;
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function resolveFilePath(site, urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = path.normalize(decodedPath).replace(/^\.\.(\/|\\)/, "");
  const absolutePath = path.join(site.root, safePath);
  const resolved = path.resolve(absolutePath);
  if (!resolved.startsWith(site.root)) {
    return null;
  }
  return resolved;
}

function sendNotFound(response) {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("404 - Página não encontrada");
}

function sendForbidden(response) {
  response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("403 - Acesso negado");
}

function handleRequest(sites) {
  return (request, response) => {
    const hostHeader = request.headers.host || "";
    const hostname = hostHeader.split(":")[0];
    const site = getSiteForHost(hostname, sites);

    if (!site) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Domínio não configurado.");
      return;
    }

    let filePath = resolveFilePath(site, request.url || "/");

    if (!filePath) {
      sendForbidden(response);
      return;
    }

    fs.stat(filePath, (error, stats) => {
      if (error) {
        sendNotFound(response);
        return;
      }

      if (stats.isDirectory()) {
        filePath = path.join(filePath, site.index);
      }

      fs.readFile(filePath, (readError, content) => {
        if (readError) {
          sendNotFound(response);
          return;
        }

        response.writeHead(200, { "Content-Type": getContentType(filePath) });
        response.end(content);
      });
    });
  };
}

function startServers() {
  const sites = loadConfig();
  const requestHandler = handleRequest(sites);

  const httpServer = http.createServer(requestHandler);
  httpServer.listen(80, () => {
    console.log("Servidor HTTP rodando na porta 80");
  });

  const httpsOptions = {
    key: fs.readFileSync(HTTPS_KEY_PATH),
    cert: fs.readFileSync(HTTPS_CERT_PATH),
  };

  const httpsServer = https.createServer(httpsOptions, requestHandler);
  httpsServer.listen(443, () => {
    console.log("Servidor HTTPS rodando na porta 443");
  });
}

startServers();
