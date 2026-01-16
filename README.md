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

## Abrir no VS Code e fazer commit no GitHub

1. Clone o repositório no seu PC:

```bash
git clone <URL_DO_REPO>
cd Web-Server
```

2. Abra no VS Code:

```bash
code .
```

3. Faça suas alterações, salve os arquivos e crie o commit:

```bash
git status
git add .
git commit -m "Descreva sua alteração"
```

4. Envie para o GitHub:

```bash
git push origin <sua-branch>
```
