# Web-Server

Idiomas / Languages: [PT-BR](#pt-br) | [EN](#en)

---

## PT-BR

Servidor web simples em Node.js com Express, que inicia nas portas 80 (HTTP) e 443 (HTTPS) e serve múltiplos sites configurados via `websites.json`.

### Estrutura

- `server.js`: servidor principal.
- `handlers/`: funções de configuração, roteamento e certificados.
- `websites.json`: configura os sites, domínios e arquivos iniciais.
- `websites/`: diretórios raiz de cada site.
- `certs/`: certificados padrão (fallback) usados pelo HTTPS.
- `certificates/`: certificados por site (opcional).
- `admin.json`: credenciais do painel admin.
- `access.log`: logs de acesso do servidor.
- `config.json`: configuracoes de portas e idioma.

### Como usar

1. Edite o arquivo `websites.json` para apontar os sites e, se quiser, o diretório de certificados.
2. Adicione o conteúdo do site dentro de `websites/<nome>`.
3. (Opcional) Crie certificados por site em `certificates/<nome>/` com `cert.key` e `cert.crt`.
4. Instale as dependências:

```bash
npm install
```

5. Inicie o servidor:

```bash
npm start
```

> Observação: se um site não tiver certificados válidos em `certificates/`, o HTTPS usa o fallback de `certs/` (`cert.key` e `cert.crt`).

### Configuracao do servidor

O arquivo `config.json` define as portas e o idioma do servidor:

```json
{
  "http": 80,
  "https": 443,
  "lang": "pt-BR"
}
```

### Console

Com o servidor rodando, use o console no terminal para administrar os sites:

- `help`: mostra os comandos disponiveis.
- `list`: lista sites configurados.
- `reload`: recarrega todos os sites do `websites.json`.
- `reload-site <nome>`: recarrega e valida um site especifico.
- `create-site <nome> <dominio> [--dev]`: cria o site, pastas e certificados.

### Painel admin

O painel admin roda na porta `8888` e exige autenticação básica.

- Credenciais em `admin.json` (altere a senha antes de publicar).
- Acesse em `http://localhost:8888`.

Funções disponíveis:
- Lista de sites configurados.
- Criar site (com pastas e certificados).
- Recarregar todos os sites ou um site específico.
- Visualizar logs de acesso.

### Licença

Este projeto está licenciado sob os termos do arquivo `LICENSE`.

---

## EN

Simple Node.js web server with Express that starts on ports 80 (HTTP) and 443 (HTTPS) and serves multiple sites configured via `websites.json`.

### Structure

- `server.js`: main server.
- `handlers/`: configuration, routing, and certificate handlers.
- `websites.json`: site, domain, and entry file configuration.
- `websites/`: root directories for each site.
- `certs/`: default (fallback) HTTPS certificates.
- `certificates/`: per-site certificates (optional).
- `admin.json`: admin panel credentials.
- `access.log`: server access logs.

### Usage

1. Edit `websites.json` to configure sites and (optionally) certificate folders.
2. Add site content under `websites/<name>`.
3. (Optional) Create per-site certificates in `certificates/<name>/` with `cert.key` and `cert.crt`.
4. Install dependencies:

```bash
npm install
```

5. Start the server:

```bash
npm start
```

> Note: if a site does not have valid certificates in `certificates/`, HTTPS falls back to `certs/` (`cert.key` and `cert.crt`).

### Console

With the server running, use the terminal console to manage sites:

- `help`: shows available commands.
- `list`: lists configured sites.
- `reload`: reloads all sites from `websites.json`.
- `reload-site <name>`: reloads and validates a specific site.
- `create-site <name> <domain> [--dev]`: creates the site, folders, and certificates.

### Admin panel

The admin panel listens on port `8888` and uses basic authentication.

- Credentials are stored in `admin.json` (change the password before publishing).
- Access at `http://localhost:8888`.

Available features:
- List configured sites.
- Create site (folders and certificates).
- Reload all sites or a specific site.
- View access logs.

### License

This project is licensed under the terms of the `LICENSE` file.
