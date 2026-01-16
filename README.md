# Web-Server

Servidor web simples em Node.js com Express, que inicia nas portas 80 (HTTP) e 443 (HTTPS) e serve múltiplos sites configurados via `websites.json`.

## Estrutura

- `server.js`: servidor principal.
- `handlers/`: funções de configuração, roteamento e certificados.
- `websites.json`: configura os sites, domínios e arquivos iniciais.
- `websites/`: diretórios raiz de cada site.
- `certs/`: certificados padrão (fallback) usados pelo HTTPS.
- `certificates/`: certificados por site (opcional).

## Como usar

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

## Console

Com o servidor rodando, use o console no terminal para administrar os sites:

- `help`: mostra os comandos disponiveis.
- `list`: lista sites configurados.
- `reload`: recarrega todos os sites do `websites.json`.
- `reload-site <nome>`: recarrega e valida um site especifico.
- `create-site <nome> <dominio> [--dev]`: cria o site, pastas e certificados.
