const readline = require("readline");

const { loadSites } = require("./sites");
const { createSiteInConfig, readConfig, writeConfig } = require("./site-manager");

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
    console.log("  fix-config               - Corrige problemas no websites.json (interativo)");
    console.log("  create-site <nome> <dominio> [--dev]");
    console.log("                           - Cria site com root e certificados");
    console.log("  exit | quit              - Encerra o servidor");
  };

  let pendingExit = false;
  const exitMessage =
    "Deseja mesmo encerrar o Web Server? Aperte Ctrl + C novamente para confirmar, se quer CANCELAR o encerramento, aperte Enter.";

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

  const fixConfig = async () => {
    try {
      const { configPath, parsed, rawEmpty } = readConfig(rootDir);
      if (!Array.isArray(parsed.sites)) {
        parsed.sites = [];
      }

      if (rawEmpty && parsed.sites.length === 0) {
        const choice = await ask(
          "websites.json vazio. Deseja apenas criar a base? (s/n): "
        );
        if (choice.toLowerCase() === "s" || choice.toLowerCase() === "sim") {
          writeConfig(configPath, parsed);
          console.log("Base criada com sites vazio.");
          reloadAll();
          return;
        }

        const name = await ask("Nome do site: ");
        const domain = await ask("Dominio (ex: exemplo.local): ");
        if (!name || !domain) {
          console.log("Nome e dominio sao obrigatorios. Nenhuma alteracao feita.");
          return;
        }
        const devInput = await ask("Modo desenvolvimento? (s/n): ");
        const isDevelop = devInput.toLowerCase().startsWith("s");

        const domainValue = normalizeDomains(domain);
        const site = {
          name,
          root: `websites/${name}`,
          domain: domainValue.length === 1 ? domainValue[0] : domainValue,
          index: "index.html",
          isDevelop,
          certificates: `certificates/${name}`,
        };
        parsed.sites.push(site);
        writeConfig(configPath, parsed);
        console.log(`Site '${name}' criado no websites.json.`);
        reloadAll();
        return;
      }

      const nextSites = [];
      let changed = false;

      for (let index = 0; index < parsed.sites.length; index += 1) {
        const site = parsed.sites[index];
        if (!site || typeof site !== "object") {
          console.log(`Removido: entrada invalida na posicao ${index}.`);
          changed = true;
          continue;
        }

        let name = typeof site.name === "string" ? site.name.trim() : "";
        if (!name) {
          name = await ask(`Site na posicao ${index} sem name. Digite o name (ENTER remove): `);
          if (!name) {
            console.log(`Removido: site sem name na posicao ${index}.`);
            changed = true;
            continue;
          }
          changed = true;
        }

        let domains = normalizeDomains(site.domain);
        if (!domains.length) {
          const input = await ask(`Site '${name}' sem domain. Digite o dominio (ENTER remove): `);
          if (!input) {
            console.log(`Removido: site '${name}' sem domain.`);
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
          console.log(`OK: root preenchido para '${name}'.`);
          changed = true;
        }

        let indexFile = site.index;
        if (!indexFile) {
          indexFile = "index.html";
          console.log(`OK: index preenchido para '${name}'.`);
          changed = true;
        }

        let certificates = site.certificates;
        if (!certificates) {
          certificates = `certificates/${name}`;
          console.log(`OK: certificates preenchido para '${name}'.`);
          changed = true;
        }

        let isDevelop = site.isDevelop;
        if (typeof isDevelop !== "boolean") {
          isDevelop = false;
          console.log(`OK: isDevelop ajustado para '${name}'.`);
          changed = true;
        }

        nextSites.push({
          name,
          root,
          domain: domainValue,
          index: indexFile,
          isDevelop,
          certificates,
        });
      }

      if (!changed) {
        console.log("Nenhuma correcao necessaria.");
        return;
      }

      parsed.sites = nextSites;
      writeConfig(configPath, parsed);
      reloadAll();
    } catch (error) {
      console.error(`Falha ao corrigir: ${error.message}`);
    }
  };

  rl.on("line", (input) => {
    const trimmed = input.trim();
    if (pendingExit) {
      pendingExit = false;
      if (!trimmed) {
        console.log("Encerramento cancelado.");
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

  rl.on("SIGINT", () => {
    if (pendingExit) {
      console.log("Encerrando servidor.");
      process.exit(0);
      return;
    }
    pendingExit = true;
    console.log(exitMessage);
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Console encerrado.");
  });

  const banner = `
 __        __  _       ____                           
 \\ \\      / /_| |__   / ___|  ___ _ ____   _____ _ __ 
  \\ \\ /\\ / / _ \\ '_ \\  \\___ \\ / _ \\ '__\\ \\ / / _ \\ '__|
   \\ V  V /  __/ |_) |  ___) |  __/ |   \\ V /  __/ |   
    \\_/\\_/ \\___|_.__/  |____/ \\___|_|    \\_/ \\___|_|   
`;
  console.log(banner);
  console.log("Bem-vindo, servidor iniciado.");
  console.log('Para ver todos os comandos, digite "help".');
  rl.prompt();
}

module.exports = {
  startConsole,
};
