const readline = require("readline");

const { loadSites } = require("./sites");
const { createSiteInConfig, readConfig, writeConfig } = require("./site-manager");

function formatDomains(domain) {
  if (Array.isArray(domain)) {
    return domain.join(", ");
  }
  return domain;
}

function startConsole({
  rootDir,
  getSites,
  setSites,
  getClearCertCache,
  getI18n,
  restartServer,
}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "web-server> ",
  });
  const t = (id, params) => getI18n().t(id, params);

  const printHelp = () => {
    console.log(t(1000));
    console.log(t(1001));
    console.log(t(1002));
    console.log(t(1003));
    console.log(t(1004));
    console.log(t(1005));
    console.log(t(1006));
    console.log(t(1007));
    console.log(t(1008));
    console.log(t(1051));
  };

  let pendingExit = false;

  const maybeClearCertCache = () => {
    const clear = getClearCertCache();
    if (clear) {
      clear();
    }
  };

  const reloadAll = () => {
    try {
      const sites = loadSites(rootDir, getI18n());
      setSites(sites);
      maybeClearCertCache();
      console.log(t(1010, { count: sites.length }));
    } catch (error) {
      console.error(t(1011, { error: error.message }));
    }
  };

  const reloadSite = (name) => {
    if (!name) {
      console.log(t(1012));
      return;
    }
    try {
      const sites = loadSites(rootDir, getI18n());
      setSites(sites);
      maybeClearCertCache();
      const site = sites.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (!site) {
        console.log(t(1013, { name }));
        return;
      }
      console.log(t(1014, { name: site.name }));
    } catch (error) {
      console.error(t(1011, { error: error.message }));
    }
  };

  const listSites = () => {
    const sites = getSites();
    if (!sites.length) {
      console.log(t(1015));
      return;
    }
    sites.forEach((site) => {
      const devFlag = site.isDevelop ? t(1050) : "";
      console.log(
        t(1016, {
          name: site.name,
          domains: formatDomains(site.domains),
          root: site.root,
          dev: devFlag,
        })
      );
    });
  };

  const createSite = (name, domain, flags) => {
    try {
      const result = createSiteInConfig({
        rootDir,
        name,
        domain,
        isDevelop: flags.dev,
        i18n: getI18n(),
      });
      if (!result.ok) {
        console.log(t(result.errorId, result.errorData));
        return;
      }
      console.log(t(1017, { name: result.site.name }));
      if (result.indexCreated) {
        console.log(t(1018));
      }
      if (result.certResult.copied) {
        console.log(t(1019));
      } else {
        console.log(t(1020, { reason: result.certResult.reason }));
      }
    } catch (error) {
      console.error(t(1049, { error: error.message }));
    }
  };

  const ask = (question) =>
    new Promise((resolve) => {
      rl.question(question, (answer) => resolve(answer.trim()));
    });

  const normalizeDomains = (domainInput) => {
    if (!domainInput) {
      return [];
    }
    if (Array.isArray(domainInput)) {
      return domainInput;
    }
    if (typeof domainInput === "string" && domainInput.includes(",")) {
      return domainInput.split(",").map((item) => item.trim()).filter(Boolean);
    }
    return [domainInput];
  };

  const isYes = (value) => {
    const normalized = value.toLowerCase();
    return normalized === "s" || normalized === "sim" || normalized === "y" || normalized === "yes";
  };

  const fixConfig = async () => {
    try {
      const { configPath, parsed, rawEmpty } = readConfig(rootDir, getI18n());
      if (!Array.isArray(parsed.sites)) {
        parsed.sites = [];
      }

      if (rawEmpty && parsed.sites.length === 0) {
        const choice = await ask(t(1039));
        if (isYes(choice)) {
          writeConfig(configPath, parsed);
          console.log(t(1040));
          reloadAll();
          return;
        }

        const name = await ask(t(1041));
        const domain = await ask(t(1042));
        if (!name || !domain) {
          console.log(t(1043));
          return;
        }
        const devInput = await ask(t(1044));
        const isDevelop = isYes(devInput);

        const domainValue = normalizeDomains(domain);
        const site = {
          name,
          root: `websites/${name}`,
          domain: domainValue.length === 1 ? domainValue[0] : domainValue,
          index: "index.html",
          isDevelop,
          certificates: `certificates/${name}`,
          letsencrypt: false,
          letsencryptNextRenewal: null,
        };
        parsed.sites.push(site);
        writeConfig(configPath, parsed);
        console.log(t(1045, { name }));
        reloadAll();
        return;
      }

      const nextSites = [];
      let changed = false;

      for (let index = 0; index < parsed.sites.length; index += 1) {
        const site = parsed.sites[index];
        if (!site || typeof site !== "object") {
          console.log(t(1028, { index }));
          changed = true;
          continue;
        }

        let name = typeof site.name === "string" ? site.name.trim() : "";
        if (!name) {
          name = await ask(t(1029, { index }));
          if (!name) {
            console.log(t(1030, { index }));
            changed = true;
            continue;
          }
          changed = true;
        }

        let domains = normalizeDomains(site.domain);
        if (!domains.length) {
          const input = await ask(t(1031, { name }));
          if (!input) {
            console.log(t(1032, { name }));
            changed = true;
            continue;
          }
          domains = normalizeDomains(input);
          changed = true;
        }
        const domainValue = domains.length === 1 ? domains[0] : domains;

        let root = site.root;
        if (!root) {
          root = `websites/${name}`;
          console.log(t(1033, { name }));
          changed = true;
        }

        let indexFile = site.index;
        if (!indexFile) {
          indexFile = "index.html";
          console.log(t(1034, { name }));
          changed = true;
        }

        let certificates = site.certificates;
        if (!certificates) {
          certificates = `certificates/${name}`;
          console.log(t(1035, { name }));
          changed = true;
        }

        let letsencrypt = site.letsencrypt;
        if (typeof letsencrypt !== "boolean") {
          letsencrypt = false;
          changed = true;
        }

        let letsencryptNextRenewal = site.letsencryptNextRenewal;
        if (
          letsencryptNextRenewal !== null &&
          letsencryptNextRenewal !== undefined &&
          typeof letsencryptNextRenewal !== "string"
        ) {
          letsencryptNextRenewal = null;
          changed = true;
        }

        let isDevelop = site.isDevelop;
        if (typeof isDevelop !== "boolean") {
          isDevelop = false;
          console.log(t(1036, { name }));
          changed = true;
        }

        nextSites.push({
          name,
          root,
          domain: domainValue,
          index: indexFile,
          isDevelop,
          certificates,
          letsencrypt,
          letsencryptNextRenewal,
        });
      }

      if (!changed) {
        console.log(t(1037));
        return;
      }

      parsed.sites = nextSites;
      writeConfig(configPath, parsed);
      reloadAll();
    } catch (error) {
      console.error(t(1038, { error: error.message }));
    }
  };

  rl.on("line", (input) => {
    const trimmed = input.trim();
    if (pendingExit) {
      pendingExit = false;
      if (!trimmed) {
        console.log(t(1026));
        rl.prompt();
        return;
      }
    }
    if (!trimmed) {
      rl.prompt();
      return;
    }

    const parts = trimmed.split(/\s+/);
    const command = parts.shift().toLowerCase();
    const flags = { dev: parts.includes("--dev") || parts.includes("--develop") };
    const args = parts.filter((part) => !part.startsWith("--"));

    switch (command) {
      case "help":
        printHelp();
        break;
      case "list":
        listSites();
        break;
      case "reload":
        reloadAll();
        break;
      case "reload-site":
        reloadSite(args[0]);
        break;
      case "fix-config":
        fixConfig().then(() => rl.prompt());
        return;
      case "restart":
        console.log(t(1052));
        restartServer()
          .then(() => {
            console.log(t(1053));
            rl.prompt();
          })
          .catch((error) => {
            console.error(t(1054, { error: error.message }));
            rl.prompt();
          });
        return;
      case "create-site":
        createSite(args[0], args[1], flags);
        reloadAll();
        break;
      case "exit":
      case "quit":
        rl.close();
        process.exit(0);
        break;
      default:
        console.log(t(1021, { command }));
        printHelp();
        break;
    }

    rl.prompt();
  });

  rl.on("SIGINT", () => {
    if (pendingExit) {
      console.log(t(1027));
      process.exit(0);
      return;
    }
    pendingExit = true;
    console.log(t(1025));
    rl.prompt();
  });

  rl.on("close", () => {
    console.log(t(1022));
  });

  const banner = `
 __        __  _       ____                           
 \\ \\      / /_| |__   / ___|  ___ _ ____   _____ _ __ 
  \\ \\ /\\ / / _ \\ '_ \\  \\___ \\ / _ \\ '__\\ \\ / / _ \\ '__|
   \\ V  V /  __/ |_) |  ___) |  __/ |   \\ V /  __/ |   
    \\_/\\_/ \\___|_.__/  |____/ \\___|_|    \\_/ \\___|_|   
`;
  console.log(banner);
  console.log(t(1023));
  console.log(t(1024));
  rl.prompt();
}

module.exports = {
  startConsole,
};
