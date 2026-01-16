const readline = require("readline");

const { loadSites } = require("./sites");
const { createSiteInConfig } = require("./site-manager");

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
    try {
      const result = createSiteInConfig({
        rootDir,
        name,
        domain,
        isDevelop: flags.dev,
      });
      if (!result.ok) {
        console.log(result.message);
        return;
      }
      console.log(`Site '${result.site.name}' criado e adicionado ao websites.json.`);
      if (result.indexCreated) {
        console.log("Arquivo index.html inicial criado.");
      }
      if (result.certResult.copied) {
        console.log("Certificados copiados para o diretorio do site.");
      } else {
        console.log(`Aviso: ${result.certResult.reason}`);
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
