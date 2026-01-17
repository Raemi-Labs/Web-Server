# Web-Server

Idiomas / Languages: [PT-BR](#pt-br) | [EN](#en) | [KO](#ko) | [JA](#ja)

Nota: o `config.json` vem com `lang` padrão em **inglês (`en`)**, mas o sistema possui fallback interno em **português (`pt`)** caso o arquivo de idioma não exista ou esteja incompleto.

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
- `config.json`: configurações de portas e idioma.
- `languages/`: arquivos de idioma adicionais (ex: `en.json`, `ko.json`, `ja.json`).

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

### Configuração do servidor

O arquivo `config.json` define as portas e o idioma do servidor:

```json
{
  "http": 80,
  "https": 443,
  "lang": "en"
}
```

Idiomas disponíveis: `pt`, `en`, `ko`, `ja`.

Se o idioma configurado não existir em `languages/`, o servidor usa `pt` como padrão interno.

Para usar PT-BR:
- `lang`: `pt`

Para usar EN:
- `lang`: `en`

Para usar KO:
- `lang`: `ko`

Para usar JA:
- `lang`: `ja`

### Console

Com o servidor rodando, use o console no terminal para administrar os sites:

- `help`: mostra os comandos disponíveis.
- `list`: lista sites configurados.
- `reload`: recarrega todos os sites do `websites.json`.
- `reload-site <nome>`: recarrega e valida um site específico.
- `fix-config`: corrige problemas no `websites.json` (interativo).
- `create-site <nome> <dominio> [--dev]`: cria o site, pastas e certificados.
- `restart`: reinicia o servidor e recarrega configurações.

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
- `config.json`: ports and language configuration.
- `languages/`: additional language files (e.g. `en.json`, `ko.json`, `ja.json`).

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

### Server configuration

The `config.json` file defines server ports and language:

```json
{
  "http": 80,
  "https": 443,
  "lang": "en"
}
```

Available languages: `pt`, `en`, `ko`, `ja`.

If the configured language does not exist in `languages/`, the server falls back to internal `pt`.

To use PT-BR:
- `lang`: `pt`

To use EN:
- `lang`: `en`

To use KO:
- `lang`: `ko`

To use JA:
- `lang`: `ja`

### Console

With the server running, use the terminal console to manage sites:

- `help`: shows available commands.
- `list`: lists configured sites.
- `reload`: reloads all sites from `websites.json`.
- `reload-site <name>`: reloads and validates a specific site.
- `fix-config`: fixes issues in `websites.json` (interactive).
- `create-site <name> <domain> [--dev]`: creates the site, folders, and certificates.
- `restart`: restarts the server and reloads configuration.

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

---

## KO

Node.js와 Express로 구성된 간단한 웹 서버로, 80(HTTP)과 443(HTTPS) 포트에서 시작되며 `websites.json`으로 여러 사이트를 제공합니다.

### 구조

- `server.js`: 메인 서버.
- `handlers/`: 설정, 라우팅, 인증서 처리.
- `websites.json`: 사이트, 도메인, 진입 파일 설정.
- `websites/`: 각 사이트의 루트 디렉터리.
- `certs/`: 기본(대체) HTTPS 인증서.
- `certificates/`: 사이트별 인증서(선택).
- `admin.json`: 관리자 패널 자격 증명.
- `access.log`: 서버 접근 로그.
- `config.json`: 포트 및 언어 설정.
- `languages/`: 추가 언어 파일(예: `en.json`, `ko.json`, `ja.json`).

### 사용 방법

1. `websites.json`을 편집해 사이트와 (선택) 인증서 폴더를 설정합니다.
2. 사이트 콘텐츠를 `websites/<name>` 아래에 추가합니다.
3. (선택) `certificates/<name>/`에 `cert.key`와 `cert.crt`로 사이트별 인증서를 만듭니다.
4. 의존성을 설치합니다:

```bash
npm install
```

5. 서버를 시작합니다:

```bash
npm start
```

> 참고: 사이트에 유효한 인증서가 없으면 HTTPS는 `certs/`(`cert.key`, `cert.crt`)를 사용합니다.

### 서버 설정

`config.json`에서 포트와 언어를 설정합니다:

```json
{
  "http": 80,
  "https": 443,
  "lang": "en"
}
```

사용 가능한 언어: `pt`, `en`, `ko`, `ja`.

설정된 언어 파일이 `languages/`에 없으면 내부 기본값인 `pt`로 동작합니다.

PT-BR 사용:
- `lang`: `pt`

EN 사용:
- `lang`: `en`

KO 사용:
- `lang`: `ko`

JA 사용:
- `lang`: `ja`

### 콘솔

서버 실행 중 터미널 콘솔에서 사이트를 관리할 수 있습니다:

- `help`: 명령 목록 표시.
- `list`: 설정된 사이트 목록.
- `reload`: `websites.json`의 모든 사이트 다시 로드.
- `reload-site <name>`: 특정 사이트 다시 로드 및 검증.
- `fix-config`: `websites.json` 문제 수정(대화형).
- `create-site <name> <domain> [--dev]`: 사이트, 폴더, 인증서 생성.
- `restart`: 서버 재시작 및 설정 다시 로드.

### 관리자 패널

관리자 패널은 `8888` 포트에서 동작하며 기본 인증을 사용합니다.

- 자격 증명은 `admin.json`에 저장됩니다(배포 전 변경).
- `http://localhost:8888`에서 접속합니다.

기능:
- 설정된 사이트 목록.
- 사이트 생성(폴더 및 인증서 포함).
- 모든 사이트 또는 특정 사이트 다시 로드.
- 접근 로그 보기.

### 라이선스

이 프로젝트는 `LICENSE` 파일의 조건에 따라 사용됩니다.

---

## JA

Node.js と Express で構成されたシンプルな Web サーバーで、80(HTTP) と 443(HTTPS) のポートで起動し、`websites.json` で複数サイトを提供します。

### 構成

- `server.js`: メインサーバー。
- `handlers/`: 設定、ルーティング、証明書処理。
- `websites.json`: サイト、ドメイン、エントリーファイルの設定。
- `websites/`: 各サイトのルートディレクトリ。
- `certs/`: 既定(フォールバック)の HTTPS 証明書。
- `certificates/`: サイト別の証明書(任意)。
- `admin.json`: 管理パネルの認証情報。
- `access.log`: サーバーアクセスログ。
- `config.json`: ポートと言語の設定。
- `languages/`: 追加言語ファイル(例: `en.json`, `ko.json`, `ja.json`)。

### 使い方

1. `websites.json` を編集してサイトと(任意で)証明書フォルダを設定します。
2. `websites/<name>` にサイト内容を追加します。
3. (任意) `certificates/<name>/` に `cert.key` と `cert.crt` でサイト別証明書を作成します。
4. 依存関係をインストールします:

```bash
npm install
```

5. サーバーを起動します:

```bash
npm start
```

> 注: サイトに有効な証明書がない場合、HTTPS は `certs/`(`cert.key`, `cert.crt`)にフォールバックします。

### サーバー設定

`config.json` でポートと言語を設定します:

```json
{
  "http": 80,
  "https": 443,
  "lang": "en"
}
```

利用可能な言語: `pt`, `en`, `ko`, `ja`。

設定された言語ファイルが `languages/` に存在しない場合、内部の `pt` にフォールバックします。

PT-BR を使う場合:
- `lang`: `pt`

EN を使う場合:
- `lang`: `en`

KO を使う場合:
- `lang`: `ko`

JA を使う場合:
- `lang`: `ja`

### コンソール

サーバー起動中はターミナルのコンソールでサイトを管理できます:

- `help`: コマンド一覧を表示。
- `list`: 設定済みサイトを一覧表示。
- `reload`: `websites.json` の全サイトを再読み込み。
- `reload-site <name>`: 特定サイトを再読み込みして検証。
- `fix-config`: `websites.json` の問題を修正(対話式)。
- `create-site <name> <domain> [--dev]`: サイト、フォルダ、証明書を作成。
- `restart`: サーバー再起動と設定再読み込み。

### 管理パネル

管理パネルは `8888` ポートで動作し、ベーシック認証を使用します。

- 認証情報は `admin.json` に保存されています(公開前に変更してください)。
- `http://localhost:8888` でアクセスします。

機能:
- 設定済みサイトの一覧。
- サイト作成(フォルダと証明書を含む)。
- 全サイトまたは特定サイトの再読み込み。
- アクセスログの表示。

### ライセンス

このプロジェクトは `LICENSE` ファイルの条件のもとで提供されます。
