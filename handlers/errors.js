function sendErrorPage(response, statusCode, title, message, hint) {
  const safeTitle = title || "Algo deu errado";
  const safeMessage = message || "Não foi possível concluir sua solicitação.";
  const safeHint = hint || "Tente novamente ou volte para a página inicial.";
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${statusCode} - ${safeTitle}</title>
    <style>
      :root {
        --ink: #1c1f26;
        --ink-soft: #3d4452;
        --accent: #2cc9c3;
        --mist: rgba(255, 255, 255, 0.72);
        --card: rgba(255, 255, 255, 0.9);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: "Space Grotesk", "Trebuchet MS", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at 12% 20%, rgba(74, 214, 206, 0.55), transparent 40%),
          radial-gradient(circle at 85% 20%, rgba(255, 187, 122, 0.5), transparent 38%),
          radial-gradient(circle at 60% 90%, rgba(118, 144, 255, 0.18), transparent 40%),
          linear-gradient(135deg, #e9f6f4 0%, #f7f3ea 45%, #fbead9 100%);
      }
      body::before {
        content: "";
        position: fixed;
        inset: 0;
        background-image:
          linear-gradient(rgba(21, 22, 26, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(21, 22, 26, 0.05) 1px, transparent 1px);
        background-size: 40px 40px;
        pointer-events: none;
        opacity: 0.35;
      }
      .card {
        position: relative;
        width: min(92vw, 640px);
        padding: 44px 46px 36px;
        border-radius: 28px;
        background: var(--card);
        box-shadow:
          0 30px 80px rgba(15, 16, 26, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(6px);
        text-align: center;
        animation: rise 0.7s ease-out both;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 6px 14px;
        border-radius: 999px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 12px;
        color: var(--ink-soft);
        background: var(--mist);
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 12px rgba(63, 208, 201, 0.6);
      }
      h1 {
        margin: 18px 0 10px;
        font-size: clamp(28px, 4vw, 40px);
        line-height: 1.1;
        letter-spacing: -0.02em;
      }
      p {
        margin: 10px 0;
        color: var(--ink-soft);
        font-size: 16px;
        line-height: 1.6;
      }
      .status {
        font-family: "JetBrains Mono", "Courier New", monospace;
        font-size: 54px;
        letter-spacing: 0.12em;
        color: var(--ink);
        opacity: 0.88;
      }
      .hint {
        margin-top: 18px;
        padding: 14px 18px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(21, 22, 26, 0.08);
      }
      .glow {
        position: absolute;
        right: -40px;
        top: -40px;
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 187, 122, 0.6), transparent 65%);
        filter: blur(2px);
        animation: pulse 3.4s ease-in-out infinite;
      }
      @keyframes rise {
        from { transform: translateY(18px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.15); opacity: 1; }
      }
      @media (max-width: 520px) {
        .card {
          padding: 32px 28px;
        }
        .status { font-size: 44px; }
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="glow" aria-hidden="true"></div>
      <span class="badge"><span class="dot"></span> An Raemi Labs Web Server</span>
      <div class="status">${statusCode}</div>
      <h1>${safeTitle}</h1>
      <p>${safeMessage}</p>
      <div class="hint">${safeHint}</div>
    </main>
  </body>
</html>`;
  response.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
}

function sendNotFound(response) {
  sendErrorPage(
    response,
    404,
    "Página não encontrada",
    "O recurso solicitado não está disponível neste endereço.",
    "Verifique o endereço, o domínio e tente novamente."
  );
}

function sendForbidden(response) {
  sendErrorPage(
    response,
    403,
    "Acesso negado",
    "Este caminho não pode ser acessado pelo servidor.",
    "Se necessário, ajuste o diretório configurado em websites.json."
  );
}

module.exports = {
  sendErrorPage,
  sendNotFound,
  sendForbidden,
};
