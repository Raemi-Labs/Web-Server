const fs = require("fs");
const path = require("path");

const DEFAULT_LANG = "pt";

const defaultMessages = {
  1000: "Comandos disponiveis:",
  1001: "  help                     - Mostra esta ajuda",
  1002: "  list                     - Lista os sites configurados",
  1003: "  reload                   - Recarrega todos os sites",
  1004: "  reload-site <nome>       - Recarrega e valida um site especifico",
  1005: "  fix-config               - Corrige problemas no websites.json (interativo)",
  1006: "  create-site <nome> <dominio> [--dev]",
  1007: "                           - Cria site com root e certificados",
  1008: "  exit | quit              - Encerra o servidor",
  1010: "Sites recarregados ({count}).",
  1011: "Falha ao recarregar: {error}",
  1012: "Uso: reload-site <nome>",
  1013: "Site '{name}' nao encontrado no websites.json.",
  1014: "Site '{name}' recarregado.",
  1015: "Nenhum site configurado.",
  1016: "- {name} | {domains} | root={root}{dev}",
  1017: "Site '{name}' criado e adicionado ao websites.json.",
  1018: "Arquivo index.html inicial criado.",
  1019: "Certificados copiados para o diretorio do site.",
  1020: "Aviso: {reason}",
  1021: "Comando desconhecido: {command}",
  1022: "Console encerrado.",
  1023: "Bem-vindo, servidor iniciado.",
  1024: "Para ver todos os comandos, digite \"help\".",
  1025:
    "Deseja mesmo encerrar o Web Server? Aperte Ctrl + C novamente para confirmar, se quer CANCELAR o encerramento, aperte Enter.",
  1026: "Encerramento cancelado.",
  1027: "Encerrando servidor.",
  1028: "Removido: entrada invalida na posicao {index}.",
  1029: "Site na posicao {index} sem name. Digite o name (ENTER remove): ",
  1030: "Removido: site sem name na posicao {index}.",
  1031: "Site '{name}' sem domain. Digite o dominio (ENTER remove): ",
  1032: "Removido: site '{name}' sem domain.",
  1033: "OK: root preenchido para '{name}'.",
  1034: "OK: index preenchido para '{name}'.",
  1035: "OK: certificates preenchido para '{name}'.",
  1036: "OK: isDevelop ajustado para '{name}'.",
  1037: "Nenhuma correcao necessaria.",
  1038: "Falha ao corrigir: {error}",
  1039: "websites.json vazio. Deseja apenas criar a base? (s/n): ",
  1040: "Base criada com sites vazio.",
  1041: "Nome do site: ",
  1042: "Dominio (ex: exemplo.local): ",
  1043: "Nome e dominio sao obrigatorios. Nenhuma alteracao feita.",
  1044: "Modo desenvolvimento? (s/n): ",
  1045: "Site '{name}' criado no websites.json.",
  1046: "Uso: create-site <nome> <dominio> [--dev]",
  1047: "Nome invalido. Use letras, numeros, - ou _.",
  1048: "Ja existe um site com o nome '{name}'.",
  1049: "Falha ao criar site: {error}",
  1050: " | dev",
  1051: "  restart                  - Reinicia o servidor e recarrega configuracoes",
  1052: "Reiniciando servidor...",
  1053: "Servidor reiniciado.",
  1054: "Falha ao reiniciar: {error}",

  2000: "Servidor HTTP rodando na porta {port}",
  2001: "Servidor HTTPS rodando na porta {port}",
  2002: "Painel admin rodando na porta {port}",
  2003: "Falha ao carregar websites.json: {error}",
  2004: "Sugestao: execute o comando fix-config no console.",
  2005: "Sites recarregados apos correcao.",
  2006: "Falha ao ler config.json: {error}",
  2007: "Usando portas padrao 80/443.",

  3000: "Algo deu errado",
  3001: "Nao foi possivel concluir sua solicitacao.",
  3002: "Tente novamente ou volte para a pagina inicial.",
  3003: "Um Web Server da Raemi Labs",
  3004: "Pagina nao encontrada",
  3005: "O recurso solicitado nao esta disponivel neste endereco.",
  3006: "Verifique o endereco, o dominio e tente novamente.",
  3007: "Acesso negado",
  3008: "Este caminho nao pode ser acessado pelo servidor.",
  3009: "Se necessario, ajuste o diretorio configurado em websites.json.",
  3010: "Dominio nao configurado",
  3011: "Este dominio nao esta registrado neste servidor.",
  3012: "Confira o endereco e tente novamente.",

  4000: "Painel Admin - An Raemi Labs Web Server",
  4001: "Admin Console",
  4002: "An Raemi Labs Web Server",
  4003: "Recarregar tudo",
  4004: "Atualizar lista",
  4005: "Atualizar logs",
  4006: "Sites configurados",
  4007: "Nenhum site configurado.",
  4008: "Criar novo site",
  4009: "Nome do site",
  4010: "Dominio (ou separados por virgula)",
  4011: "Modo desenvolvimento",
  4012: "Nao",
  4013: "Sim",
  4014: "Criar site",
  4015: "Recarregar site especifico",
  4016: "Nome do site",
  4017: "Recarregar site",
  4018: "Logs de acesso",
  4019: "Carregando...",
  4020: "Dominios: {domains}",
  4021: "Root: {root}{dev}",
  4022: " | dev",
  4023: "meu-site",
  4024: "exemplo.local",

  5000: "Erro ao ler admin.json: {error}",
  5001: "Autenticacao necessaria.",
  5002: "Sites recarregados ({count}).",
  5003: "Informe o nome do site.",
  5004: "Site '{name}' nao encontrado.",
  5005: "Site '{name}' recarregado.",
  5006: "Site '{name}' criado.",
  5007: "Falha na requisicao.",
  5008: "Sem logs.",
  5009: "Preencha nome e dominio.",
  5010: "Formato invalido em websites.json.",
  5011: "Formato invalido em admin.json.",
  5012: "Painel Admin",

  6000: "O arquivo websites.json precisa de uma lista 'sites'.",
  6001: "Cada site precisa de name, root, domain e index.",
  6002: "O campo isDevelop precisa ser booleano quando informado.",
  6003: "O campo certificates precisa ser string quando informado.",
  6004: "Certificados padrao nao encontrados em certs/ (cert.key e cert.crt).",
  6010: "Certificados padrao ausentes em certs/.",
};

function normalizeLang(lang) {
  if (!lang || typeof lang !== "string") {
    return DEFAULT_LANG;
  }
  const lower = lang.toLowerCase();
  if (lower.startsWith("pt")) {
    return "pt";
  }
  if (lower.startsWith("en")) {
    return "en";
  }
  if (lower.startsWith("ko")) {
    return "ko";
  }
  if (lower.startsWith("ja")) {
    return "ja";
  }
  return lower;
}

function createI18n({ rootDir, lang }) {
  const normalized = normalizeLang(lang);
  let translations = {};
  if (normalized !== DEFAULT_LANG) {
    const filePath = path.join(rootDir, "languages", `${normalized}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          translations = parsed;
        }
      } catch {
        translations = {};
      }
    }
  }

  return {
    lang: normalized,
    htmlLang: normalized === "pt" ? "pt-BR" : normalized,
    t: (id, params = {}) => {
      const key = String(id);
      const template = translations[key] || defaultMessages[key];
      if (!template) {
        return `[${key}]`;
      }
      return template.replace(/\{(\w+)\}/g, (match, name) => {
        const value = params[name];
        return value === undefined || value === null ? match : String(value);
      });
    },
  };
}

module.exports = {
  createI18n,
  defaultMessages,
  DEFAULT_LANG,
};
