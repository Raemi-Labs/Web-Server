const fs = require("fs");
const path = require("path");
const readline = require("readline");

const { loadSites } = require("./sites");

function readConfig(rootDir) {
  const configPath = path.join(rootDir, "websites.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Formato invalido em websites.json.");
  }
  if (!Array.isArray(parsed.sites)) {
    parsed.sites = [];
  }
  return { configPath, parsed };
}

function writeConfig(configPath, config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function copyFallbackCertificates(rootDir, destDir) {
  const fallbackDir = path.join(rootDir, "certs");
  const srcKey = path.join(fallbackDir, "cert.key");
  const srcCert = path.join(fallbackDir, "cert.crt");
  const destKey = path.join(destDir, "cert.key");
  const destCert = path.join(destDir, "cert.crt");

  if (!fs.existsSync(srcKey) || !fs.existsSync(srcCert)) {
    return { copied: false, reason: "Certificados padrao ausentes em certs/." };
  }

  fs.copyFileSync(srcKey, destKey);
  fs.copyFileSync(srcCert, destCert);
  return { copied: true };
}

function createDefaultIndex(rootDir, siteRoot, siteName) {
  const indexPath = path.join(rootDir, siteRoot, "index.html");
  if (fs.existsSync(indexPath)) {
    return false;
  }
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${siteName} - An Raemi Labs</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: "Space Grotesk", "Trebuchet MS", "Segoe UI", sans-serif;
        background: linear-gradient(120deg, #eef7f5, #f7efe4);
        color: #1c1f26;
      }
      .card {
        padding: 36px 40px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 25px 60px rgba(15, 16, 26, 0.12);
        text-align: center;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 32px;
      }
      p {
        margin: 0;
        color: #3d4452;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${siteName}</h1>
      <p>Site criado com o console do An Raemi Labs Web Server.</p>
    </div>
  </body>
</html>`;
  fs.writeFileSync(indexPath, html);
  return true;
}

function formatDomains(domain) {
  if (Array.isArray(domain)) {
    return domain.join(", ");
  }
  return domain;
}

function startConsole({ rootDir, getSites, setSites, clearCertCache }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "web-server> ",
  });

  const printHelp = () => {
    console.log("Comandos disponiveis:");
    console.log("  help                     - Mostra esta ajuda");
    console.log("  list                     - Lista os sites configurados");
    console.log("  reload                   - Recarrega todos os sites");
    console.log("  reload-site <nome>       - Recarrega e valida um site especifico");
    console.log("  create-site <nome> <dominio> [--dev]");
    console.log("                           - Cria site com root e certificados");
    console.log("  exit | quit              - Encerra o servidor");
  };

  const reloadAll = () => {
    try {
      const sites = loadSites(rootDir);
      setSites(sites);
      if (clearCertCache) {
        clearCertCache();
      }
      console.log(`Sites recarregados (${sites.length}).`);
    } catch (error) {
      console.error(`Falha ao recarregar: ${error.message}`);
    }
  };

  const reloadSite = (name) => {
    if (!name) {
      console.log("Uso: reload-site <nome>");
      return;
    }
    try {
      const sites = loadSites(rootDir);
      setSites(sites);
      if (clearCertCache) {
        clearCertCache();
      }
      const site = sites.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (!site) {
        console.log(`Site '${name}' nao encontrado no websites.json.`);
        return;
      }
      console.log(`Site '${site.name}' recarregado.`);
    } catch (error) {
      console.error(`Falha ao recarregar: ${error.message}`);
    }
  };

  const listSites = () => {
    const sites = getSites();
    if (!sites.length) {
      console.log("Nenhum site configurado.");
      return;
    }
    sites.forEach((site) => {
      console.log(
        `- ${site.name} | ${formatDomains(site.domains)} | root=${site.root}` +
          (site.isDevelop ? " | dev" : "")
      );
    });
  };

  const createSite = (name, domain, flags) => {
    if (!name || !domain) {
      console.log("Uso: create-site <nome> <dominio> [--dev]");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      console.log("Nome invalido. Use letras, numeros, - ou _.");
      return;
    }

    try {
      const { configPath, parsed } = readConfig(rootDir);
      const existing = parsed.sites.find(
        (site) => site.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        console.log(`Ja existe um site com o nome '${name}'.`);
        return;
      }

      const domainValue = domain.includes(",")
        ? domain.split(",").map((item) => item.trim()).filter(Boolean)
        : domain;
      const rootPath = `websites/${name}`;
      const certPath = `certificates/${name}`;
      const newSite = {
        name,
        root: rootPath,
        domain: domainValue,
        index: "index.html",
        isDevelop: Boolean(flags.dev),
        certificates: certPath,
      };

      parsed.sites.push(newSite);
      writeConfig(configPath, parsed);

      ensureDir(path.join(rootDir, rootPath));
      ensureDir(path.join(rootDir, certPath));
      const indexCreated = createDefaultIndex(rootDir, rootPath, name);
      const certResult = copyFallbackCertificates(rootDir, path.join(rootDir, certPath));

      console.log(`Site '${name}' criado e adicionado ao websites.json.`);
      if (indexCreated) {
        console.log("Arquivo index.html inicial criado.");
      }
      if (certResult.copied) {
        console.log("Certificados copiados para o diretorio do site.");
      } else {
        console.log(`Aviso: ${certResult.reason}`);
      }
    } catch (error) {
      console.error(`Falha ao criar site: ${error.message}`);
    }
  };

  rl.on("line", (input) => {
    const trimmed = input.trim();
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
        console.log(`Comando desconhecido: ${command}`);
        printHelp();
        break;
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Console encerrado.");
  });

  printHelp();
  rl.prompt();
}

module.exports = {
  startConsole,
};
