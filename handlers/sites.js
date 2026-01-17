const fs = require("fs");
const path = require("path");

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

function loadSites(rootDir, i18n) {
  const t = i18n ? i18n.t : null;
  const configPath = path.join(rootDir, "websites.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.sites || !Array.isArray(parsed.sites)) {
    throw new Error(t ? t(6000) : "O arquivo websites.json precisa de uma lista 'sites'.");
  }
  return parsed.sites.map((site) => {
    if (!site.name || !site.root || !site.domain || !site.index) {
      throw new Error(t ? t(6001) : "Cada site precisa de name, root, domain e index.");
    }
    if (site.isDevelop !== undefined && typeof site.isDevelop !== "boolean") {
      throw new Error(t ? t(6002) : "O campo isDevelop precisa ser booleano quando informado.");
    }
    if (site.certificates !== undefined && typeof site.certificates !== "string") {
      throw new Error(t ? t(6003) : "O campo certificates precisa ser string quando informado.");
    }
    const domains = Array.isArray(site.domain) ? site.domain : [site.domain];
    return {
      name: site.name,
      root: path.resolve(rootDir, site.root),
      domains: domains.map((domain) => domain.toLowerCase()),
      index: site.index,
      isDevelop: Boolean(site.isDevelop),
      certificates: site.certificates ? path.resolve(rootDir, site.certificates) : null,
    };
  });
}

function parseHostname(hostHeader) {
  if (!hostHeader) {
    return "";
  }
  if (hostHeader.startsWith("[")) {
    const end = hostHeader.indexOf("]");
    if (end !== -1) {
      return hostHeader.slice(1, end);
    }
  }
  return hostHeader.split(":")[0];
}

function matchesDomain(hostname, domain) {
  if (domain === hostname) {
    return true;
  }
  if (domain.startsWith("*.")) {
    const suffix = domain.slice(2);
    return hostname !== suffix && hostname.endsWith(`.${suffix}`);
  }
  return false;
}

function getSiteForHost(hostname, sites) {
  const normalized = hostname.toLowerCase();
  return sites.find((site) => site.domains.some((domain) => matchesDomain(normalized, domain))) || null;
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function resolveFilePath(site, urlPath) {
  let decodedPath = "";
  try {
    decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const safePath = path.normalize(decodedPath).replace(/^\.\.(\/|\\)/, "");
  const absolutePath = path.join(site.root, safePath);
  const resolved = path.resolve(absolutePath);
  if (!resolved.startsWith(site.root)) {
    return null;
  }
  return resolved;
}

function findDevSiteFromPath(urlPath, sites) {
  let decodedPath = "";
  try {
    decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const segments = decodedPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  const siteName = segments[0].toLowerCase();
  const site = sites.find((item) => item.isDevelop && item.name.toLowerCase() === siteName);
  if (!site) {
    return null;
  }
  return {
    site,
    urlPath: "/" + segments.slice(1).join("/"),
  };
}

module.exports = {
  loadSites,
  parseHostname,
  getSiteForHost,
  getContentType,
  resolveFilePath,
  findDevSiteFromPath,
};
