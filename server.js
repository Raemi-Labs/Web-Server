const http = require("http");
const https = require("https");
const express = require("express");

const { loadSites, getSiteForHost } = require("./handlers/sites");
const { startConsole } = require("./handlers/console");
const { createRequestHandler } = require("./handlers/request-handler");
const { createHttpsOptions } = require("./handlers/tls");

function createApp(requestHandler) {
  const app = express();
  app.use((req, res) => requestHandler(req, res));
  return app;
}

function startServers() {
  const rootDir = __dirname;
  let sites = loadSites(rootDir);
  const getSites = () => sites;
  const setSites = (nextSites) => {
    sites = nextSites;
  };
  const httpRequestHandler = createRequestHandler(getSites, { allowIpAccess: true });
  const httpsRequestHandler = createRequestHandler(getSites, { allowIpAccess: false });
  const httpApp = createApp(httpRequestHandler);
  const httpsApp = createApp(httpsRequestHandler);

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

  startConsole({ rootDir, getSites, setSites, clearCertCache });
}

startServers();
