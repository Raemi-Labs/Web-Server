const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const path = require("path");

const { createI18n } = require("./handlers/i18n");
const { loadSites, getSiteForHost } = require("./handlers/sites");
const { createAccessLogger } = require("./handlers/logger");
const { startConsole } = require("./handlers/console");
const { createAdminApp } = require("./handlers/admin");
const { createRequestHandler } = require("./handlers/request-handler");
const { createHttpsOptions } = require("./handlers/tls");

const rootDir = __dirname;
const state = {
  serverConfig: { http: 80, https: 443, lang: "pt" },
  i18n: createI18n({ rootDir, lang: "pt" }),
  sites: [],
  httpServer: null,
  httpsServer: null,
  adminServer: null,
  clearCertCache: null,
  logger: null,
  logPath: null,
};

const getSites = () => state.sites;
const setSites = (nextSites) => {
  state.sites = nextSites;
};
const getI18n = () => state.i18n;
const getClearCertCache = () => state.clearCertCache;

function createApp(requestHandler, { logger }) {
  const app = express();
  if (logger) {
    app.use(logger);
  }
  app.use((req, res) => requestHandler(req, res));
  return app;
}

function ensureBaseFiles() {
  const certificatesDir = path.join(rootDir, "certificates");
  const configPath = path.join(rootDir, "websites.json");

  if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
  }
  if (!fs.existsSync(configPath)) {
    const defaultConfig = { sites: [] };
    fs.writeFileSync(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`);
  }
}

function loadServerConfig(baseI18n) {
  const serverConfigPath = path.join(rootDir, "config.json");
  let serverConfig = { http: 80, https: 443, lang: "pt" };
  if (!fs.existsSync(serverConfigPath)) {
    return serverConfig;
  }
  try {
    const raw = fs.readFileSync(serverConfigPath, "utf8");
    const parsed = JSON.parse(raw);
    serverConfig = {
      http: Number.isInteger(parsed.http) ? parsed.http : serverConfig.http,
      https: Number.isInteger(parsed.https) ? parsed.https : serverConfig.https,
      lang: typeof parsed.lang === "string" ? parsed.lang : serverConfig.lang,
    };
  } catch (error) {
    console.error(baseI18n.t(2006, { error: error.message }));
    console.error(baseI18n.t(2007));
  }
  return serverConfig;
}

function safeLoadSites() {
  try {
    const nextSites = loadSites(rootDir, getI18n());
    setSites(nextSites);
    return true;
  } catch (error) {
    console.error(getI18n().t(2003, { error: error.message }));
    console.error(getI18n().t(2004));
    return false;
  }
}

function scheduleReload() {
  setTimeout(() => {
    if (safeLoadSites()) {
      console.log(getI18n().t(2005));
    }
  }, 2000);
}

function startServers() {
  ensureBaseFiles();

  const baseI18n = createI18n({ rootDir, lang: "pt" });
  state.serverConfig = loadServerConfig(baseI18n);
  state.i18n = createI18n({ rootDir, lang: state.serverConfig.lang });

  state.logPath = path.join(rootDir, "access.log");
  state.logger = createAccessLogger({ logPath: state.logPath });

  if (!safeLoadSites()) {
    scheduleReload();
  }

  const httpRequestHandler = createRequestHandler(getSites, {
    allowIpAccess: true,
    i18n: getI18n(),
  });
  const httpsRequestHandler = createRequestHandler(getSites, {
    allowIpAccess: false,
    i18n: getI18n(),
  });
  const httpApp = createApp(httpRequestHandler, { logger: state.logger });
  const httpsApp = createApp(httpsRequestHandler, { logger: state.logger });

  state.httpServer = http.createServer(httpApp);
  state.httpServer.listen(state.serverConfig.http, () => {
    console.log(getI18n().t(2000, { port: state.serverConfig.http }));
  });

  const { httpsOptions, clearCertCache } = createHttpsOptions({
    rootDir,
    getSites,
    getSiteForHost,
    i18n: getI18n(),
  });
  state.clearCertCache = clearCertCache;
  state.httpsServer = https.createServer(httpsOptions, httpsApp);
  state.httpsServer.listen(state.serverConfig.https, () => {
    console.log(getI18n().t(2001, { port: state.serverConfig.https }));
  });

  const adminApp = createAdminApp({
    rootDir,
    getSites,
    setSites,
    clearCertCache: state.clearCertCache,
    logPath: state.logPath,
    i18n: getI18n(),
  });
  state.adminServer = http.createServer(adminApp);
  state.adminServer.listen(8888, () => {
    console.log(getI18n().t(2002, { port: 8888 }));
  });

}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
}

async function stopServers() {
  await Promise.all([
    closeServer(state.httpServer),
    closeServer(state.httpsServer),
    closeServer(state.adminServer),
  ]);
  state.httpServer = null;
  state.httpsServer = null;
  state.adminServer = null;
  state.clearCertCache = null;
}

async function restartServers() {
  await stopServers();
  startServers();
}

startServers();
startConsole({
  rootDir,
  getSites,
  setSites,
  getClearCertCache,
  getI18n,
  restartServer: restartServers,
});
