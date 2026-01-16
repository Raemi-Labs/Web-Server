const fs = require("fs");
const path = require("path");
const tls = require("tls");

function getCertificatePaths(baseDir) {
  return {
    keyPath: path.join(baseDir, "cert.key"),
    certPath: path.join(baseDir, "cert.crt"),
  };
}

function loadCertificateContextFromDir(baseDir) {
  const { keyPath, certPath } = getCertificatePaths(baseDir);
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    return null;
  }
  try {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);
    return {
      key,
      cert,
      context: tls.createSecureContext({ key, cert }),
    };
  } catch {
    return null;
  }
}

function createHttpsOptions({ rootDir, getSites, getSiteForHost }) {
  const defaultDir = path.join(rootDir, "certs");
  const defaultCertificate = loadCertificateContextFromDir(defaultDir);
  if (!defaultCertificate) {
    throw new Error("Certificados padrão não encontrados em certs/ (cert.key e cert.crt).");
  }

  const certCache = new Map();
  const clearCertCache = () => certCache.clear();
  const httpsOptions = {
    key: defaultCertificate.key,
    cert: defaultCertificate.cert,
    SNICallback: (servername, callback) => {
      const hostname = (servername || "").toLowerCase();
      if (certCache.has(hostname)) {
        return callback(null, certCache.get(hostname));
      }
      const site = getSiteForHost(hostname, getSites());
      if (site && site.certificates) {
        const certificate = loadCertificateContextFromDir(site.certificates);
        if (certificate) {
          certCache.set(hostname, certificate.context);
          return callback(null, certificate.context);
        }
      }
      certCache.set(hostname, defaultCertificate.context);
      return callback(null, defaultCertificate.context);
    },
  };
  return { httpsOptions, clearCertCache };
}

module.exports = {
  createHttpsOptions,
};
