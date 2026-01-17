const fs = require("fs");
const path = require("path");
const Greenlock = require("greenlock");

const { readConfig, writeConfig } = require("./site-manager");

const RETRY_DELAY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RENEW_AFTER_DAYS = 60;

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function getChallengeDir(rootDir) {
  return path.join(rootDir, ".acme-challenges");
}

function createGreenlock({ rootDir, acmeEmail }) {
  const configDir = path.join(rootDir, "greenlock.d");
  const storeDir = path.join(rootDir, "greenlock-store");
  const webroot = getChallengeDir(rootDir);

  ensureDir(configDir);
  ensureDir(storeDir);
  ensureDir(webroot);

  const greenlock = Greenlock.create({
    packageRoot: rootDir,
    configDir,
    maintainerEmail: acmeEmail,
    cluster: false,
    store: {
      module: "greenlock-store-fs",
      basePath: storeDir,
    },
    challenges: {
      "http-01": {
        module: "acme-http-01-webroot",
        webroot,
      },
    },
  });

  if (greenlock.manager && greenlock.manager.defaults) {
    greenlock.manager.defaults({
      subscriberEmail: acmeEmail,
      agreeToTerms: true,
    });
  }

  return greenlock;
}

function getNextRenewalDate() {
  const next = new Date();
  next.setDate(next.getDate() + RENEW_AFTER_DAYS);
  return next.toISOString();
}

function updateNextRenewal(rootDir, siteName, nextRenewal) {
  const { configPath, parsed } = readConfig(rootDir);
  if (!Array.isArray(parsed.sites)) {
    parsed.sites = [];
  }
  const site = parsed.sites.find(
    (item) => item && item.name && item.name.toLowerCase() === siteName.toLowerCase()
  );
  if (!site) {
    return;
  }
  site.letsencryptNextRenewal = nextRenewal;
  writeConfig(configPath, parsed);
}

async function writeCertificateFiles(certDir, certs) {
  ensureDir(certDir);
  const keyPath = path.join(certDir, "cert.key");
  const certPath = path.join(certDir, "cert.crt");
  const certBundle = certs.chain ? `${certs.cert}\n${certs.chain}` : certs.cert;
  fs.writeFileSync(keyPath, certs.privkey);
  fs.writeFileSync(certPath, certBundle);
}

async function issueCertificate({ greenlock, site }) {
  const domains = site.domains || [];
  if (!domains.length) {
    throw new Error("no domains");
  }
  const subject = domains[0];
  await greenlock.add({ subject, altnames: domains });
  const certs = await greenlock.get({ servername: subject });
  if (!certs || !certs.privkey || !certs.cert) {
    throw new Error("no certs");
  }
  return certs;
}

function createLetsEncryptScheduler({ rootDir, getSites, getI18n, acmeEmail }) {
  const attempts = new Map();
  const greenlock = acmeEmail ? createGreenlock({ rootDir, acmeEmail }) : null;
  const challengeDir = getChallengeDir(rootDir);
  let timer = null;

  const log = (id, params) => {
    console.log(getI18n().t(id, params));
  };

  const handleFailure = (site, error) => {
    const current = attempts.get(site.name) || 0;
    const nextAttempt = current + 1;
    attempts.set(site.name, nextAttempt);
    log(7003, { site: site.name, error: error.message });
    if (nextAttempt >= MAX_ATTEMPTS) {
      log(7005, { site: site.name });
      attempts.set(site.name, 0);
      const next = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      site.letsencryptNextRenewal = next;
      updateNextRenewal(rootDir, site.name, next);
      return;
    }
    const next = new Date(Date.now() + RETRY_DELAY_MS).toISOString();
    site.letsencryptNextRenewal = next;
    updateNextRenewal(rootDir, site.name, next);
    log(7004, { site: site.name, minutes: 5 });
  };

  const checkSite = async (site) => {
    if (!site.letsencrypt) {
      return;
    }
    if (!acmeEmail) {
      log(7000);
      return;
    }
    if (!greenlock) {
      return;
    }
    const nextRenewal = site.letsencryptNextRenewal
      ? new Date(site.letsencryptNextRenewal)
      : null;
    if (nextRenewal && Number.isFinite(nextRenewal.getTime()) && nextRenewal > new Date()) {
      return;
    }

    try {
      log(7001, { site: site.name });
      const certs = await issueCertificate({ greenlock, site });
      const certDir = path.join(rootDir, "certificates", site.name);
      await writeCertificateFiles(certDir, certs);
      const next = getNextRenewalDate();
      site.letsencryptNextRenewal = next;
      updateNextRenewal(rootDir, site.name, next);
      attempts.set(site.name, 0);
      log(7002, { site: site.name });
    } catch (error) {
      handleFailure(site, error);
    }
  };

  const runOnce = async () => {
    const sites = getSites();
    for (const site of sites) {
      await checkSite(site);
    }
  };

  const start = () => {
    if (!timer) {
      runOnce();
      timer = setInterval(runOnce, RETRY_DELAY_MS);
    }
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    start,
    stop,
    challengeDir,
  };
}

module.exports = {
  createLetsEncryptScheduler,
  getChallengeDir,
};
