const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const path = require("path");

const { loadSites, getSiteForHost } = require("./handlers/sites");
const { createAccessLogger } = require("./handlers/logger");
const { startConsole } = require("./handlers/console");
const { createAdminApp } = require("./handlers/admin");
const { createRequestHandler } = require("./handlers/request-handler");
const { createHttpsOptions } = require("./handlers/tls");

function createApp(requestHandler, { logger }) {
  const app = express();
  if (logger) {
    app.use(logger);
  }
  app.use((req, res) => requestHandler(req, res));
  return app;
}

function startServers() {
  const rootDir = __dirname;
  const certificatesDir = path.join(rootDir, "certificates");
  const configPath = path.join(rootDir, "websites.json");
  const serverConfigPath = path.join(rootDir, "config.json");
  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
  }
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      sites: [],
    };
    fs.writeFileSync(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`);
  }
  let serverConfig = { http: 80, https: 443, lang: "pt-BR" };
  if (fs.existsSync(serverConfigPath)) {
    try {
      const raw = fs.readFileSync(serverConfigPath, "utf8");
      const parsed = JSON.parse(raw);
      serverConfig = {
        http: Number.isInteger(parsed.http) ? parsed.http : serverConfig.http,
        https: Number.isInteger(parsed.https) ? parsed.https : serverConfig.https,
        lang: typeof parsed.lang === "string" ? parsed.lang : serverConfig.lang,
      };
    } catch (error) {
      console.error(`Falha ao ler config.json: ${error.message}`);
      console.error("Usando portas padrao 80/443.");
    }
  }
  const logPath = path.join(rootDir, "access.log");
  const logger = createAccessLogger({ logPath });
  let sites = [];
  const getSites = () => sites;
  const setSites = (nextSites) => {
    sites = nextSites;
  };
  const safeLoadSites = () => {
    try {
      const nextSites = loadSites(rootDir);
      setSites(nextSites);
      return true;
    } catch (error) {
      console.error(`Falha ao carregar websites.json: ${error.message}`);
      console.error("Sugestao: execute o comando fix-config no console.");
      return false;
    }
  };
  const scheduleReload = () => {
    setTimeout(() => {
      if (safeLoadSites()) {
        console.log("Sites recarregados apos correcao.");
      }
    }, 2000);
  };
  if (!safeLoadSites()) {
    scheduleReload();
  }
  const httpRequestHandler = createRequestHandler(getSites, { allowIpAccess: true });
  const httpsRequestHandler = createRequestHandler(getSites, { allowIpAccess: false });
  const httpApp = createApp(httpRequestHandler, { logger });
  const httpsApp = createApp(httpsRequestHandler, { logger });

  const httpServer = http.createServer(httpApp);
  httpServer.listen(serverConfig.http, () => {
    console.log(`Servidor HTTP rodando na porta ${serverConfig.http}`);
  });

  const { httpsOptions, clearCertCache } = createHttpsOptions({
    rootDir,
    getSites,
    getSiteForHost,
  });
  const httpsServer = https.createServer(httpsOptions, httpsApp);
  httpsServer.listen(serverConfig.https, () => {
    console.log(`Servidor HTTPS rodando na porta ${serverConfig.https}`);
  });

  const adminApp = createAdminApp({
    rootDir,
    getSites,
    setSites,
    clearCertCache,
    logPath,
  });
  const adminServer = http.createServer(adminApp);
  adminServer.listen(8888, () => {
    console.log("Painel admin rodando na porta 8888");
  });

  startConsole({ rootDir, getSites, setSites, clearCertCache });
}

startServers();
