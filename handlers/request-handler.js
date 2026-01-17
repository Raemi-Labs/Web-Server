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

function serveSiteRequest(site, urlPath, response) {
  let filePath = resolveFilePath(site, urlPath);

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
}

function createRequestHandler(getSites, { allowIpAccess, i18n }) {
  const { sendErrorPage, sendNotFound, sendForbidden } = createErrorHandlers(i18n);
  const handler = (request, response) => {
    const urlPath = request.url || "/";
    if (handler.acmeChallengeDir && urlPath.startsWith("/.well-known/acme-challenge/")) {
      const token = decodeURIComponent(urlPath.split("/").pop() || "");
      const filePath = path.join(handler.acmeChallengeDir, token);
      fs.readFile(filePath, "utf8", (error, content) => {
        if (error) {
          sendNotFound(response);
          return;
        }
        response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(content);
      });
      return;
    }
    const sites = getSites();
    const hostHeader = request.headers.host || "";
    const hostname = parseHostname(hostHeader);
    const site = getSiteForHost(hostname, sites);

    if (!site) {
      const isLocalhost = hostname.toLowerCase() === "localhost";
      if (allowIpAccess && (net.isIP(hostname) || isLocalhost)) {
        const devMatch = findDevSiteFromPath(request.url || "/", sites);
        if (devMatch) {
          return serveSiteRequest(devMatch.site, devMatch.urlPath, response);
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

    return serveSiteRequest(site, urlPath, response);
  };
  handler.acmeChallengeDir = null;
  return handler;
}

module.exports = {
  createRequestHandler,
};
