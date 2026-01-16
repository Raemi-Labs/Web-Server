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
const { sendErrorPage, sendNotFound, sendForbidden } = require("./errors");

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

function createRequestHandler(getSites, { allowIpAccess }) {
  return (request, response) => {
    const sites = getSites();
    const hostHeader = request.headers.host || "";
    const hostname = parseHostname(hostHeader);
    const site = getSiteForHost(hostname, sites);

    if (!site) {
      if (allowIpAccess && net.isIP(hostname)) {
        const devMatch = findDevSiteFromPath(request.url || "/", sites);
        if (devMatch) {
          return serveSiteRequest(devMatch.site, devMatch.urlPath, response);
        }
      }
      sendErrorPage(
        response,
        404,
        "Domínio não configurado",
        "Este domínio não está registrado neste servidor.",
        "Confira o endereço e tente novamente."
      );
      return;
    }

    return serveSiteRequest(site, request.url || "/", response);
  };
}

module.exports = {
  createRequestHandler,
};
