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
  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
  }
  const logPath = path.join(rootDir, "access.log");
  const logger = createAccessLogger({ logPath });
  let sites = loadSites(rootDir);
  const getSites = () => sites;
  const setSites = (nextSites) => {
    sites = nextSites;
  };
  const httpRequestHandler = createRequestHandler(getSites, { allowIpAccess: true });
  const httpsRequestHandler = createRequestHandler(getSites, { allowIpAccess: false });
  const httpApp = createApp(httpRequestHandler, { logger });
  const httpsApp = createApp(httpsRequestHandler, { logger });

  const httpServer = http.createServer(httpApp);
  httpServer.listen(80, () => {
    console.log("Servidor HTTP rodando na porta 80");
  });

  const { httpsOptions, clearCertCache } = createHttpsOptions({
    rootDir,
    getSites,
    getSiteForHost,
  });
  const httpsServer = https.createServer(httpsOptions, httpsApp);
  httpsServer.listen(443, () => {
    console.log("Servidor HTTPS rodando na porta 443");
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
