const fs = require("fs");
const net = require("net");
const path = require("path");

const {
  parseHostname,
  getSiteForHost,
  findDevSiteFromPath,
  resolveFilePath,
  getContentType,
} = require("./sites");
const { createErrorHandlers } = require("./errors");

function serveSiteRequest(site, urlPath, response, { sendNotFound, sendForbidden }) {
  const rawPath = (urlPath || "/").split("?")[0];
  const lowerPath = rawPath.toLowerCase();
  if (site.prettyUrl) {
    if (lowerPath === "/index.html") {
      response.writeHead(301, { Location: "/" });
      response.end();
      return;
    }
    if (lowerPath.endsWith(".html")) {
      const prettyPath = rawPath.slice(0, -5) || "/";
      response.writeHead(301, { Location: prettyPath });
      response.end();
      return;
    }
  }

  let filePath = resolveFilePath(site, urlPath);

  if (!filePath) {
    sendForbidden(response);
    return;
  }

  const tryHtmlFallback = (basePath) => {
    if (!site.prettyUrl || path.extname(basePath)) {
      sendNotFound(response);
      return;
    }
    const htmlPath = `${basePath}.html`;
    fs.stat(htmlPath, (fallbackError, fallbackStats) => {
      if (fallbackError || fallbackStats.isDirectory()) {
        sendNotFound(response);
        return;
      }
      fs.readFile(htmlPath, (readError, content) => {
        if (readError) {
          sendNotFound(response);
          return;
        }
        response.writeHead(200, { "Content-Type": getContentType(htmlPath) });
        response.end(content);
      });
    });
  };

  fs.stat(filePath, (error, stats) => {
    if (error) {
      tryHtmlFallback(filePath);
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
}

function createRequestHandler(getSites, { allowIpAccess, i18n }) {
  const { sendErrorPage, sendNotFound, sendForbidden } = createErrorHandlers(i18n);
  const handler = (request, response) => {
    const urlPath = request.url || "/";
    const sites = getSites();
    const hostHeader = request.headers.host || "";
    const hostname = parseHostname(hostHeader);
    const site = getSiteForHost(hostname, sites);

    if (!site) {
      const isLocalhost = hostname.toLowerCase() === "localhost";
      if (allowIpAccess && (net.isIP(hostname) || isLocalhost)) {
        const devMatch = findDevSiteFromPath(request.url || "/", sites);
        if (devMatch) {
          return serveSiteRequest(devMatch.site, devMatch.urlPath, response, { sendNotFound, sendForbidden });
        }
      }
      sendErrorPage(
        response,
        404,
        i18n.t(3010),
        i18n.t(3011),
        i18n.t(3012)
      );
      return;
    }

    return serveSiteRequest(site, urlPath, response, { sendNotFound, sendForbidden });
  };
  return handler;
}

module.exports = {
  createRequestHandler,
};
