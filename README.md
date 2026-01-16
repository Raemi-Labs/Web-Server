# Web-Server

Servidor web simples em Node.js que inicia nas portas 80 (HTTP) e 443 (HTTPS) e serve múltiplos sites configurados via `websites.json`.

## Estrutura

- `server.js`: servidor principal.
- `websites.json`: configura os sites, domínios e arquivos iniciais.
- `websites/`: diretórios raiz de cada site.
- `certs/`: certificados autoassinados usados pelo HTTPS.

## Como usar

1. Edite o arquivo `websites.json` para apontar os sites.
2. Adicione o conteúdo do site dentro de `websites/<nome>`.
3. Inicie o servidor:

```bash
npm start
```

> Observação: o HTTPS usa certificados autoassinados em `certs/`.
