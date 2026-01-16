const fs = require("fs");
const path = require("path");

function detectDevice(userAgent) {
  if (!userAgent) {
    return "desconhecido";
  }
  const ua = userAgent.toLowerCase();
  if (ua.includes("tablet") || ua.includes("ipad")) {
    return "tablet";
  }
  if (
    ua.includes("mobile") ||
    ua.includes("android") ||
    ua.includes("iphone") ||
    ua.includes("ipod")
  ) {
    return "mobile";
  }
  return "desktop";
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "desconhecido";
}

function createAccessLogger({ logPath }) {
  const resolvedPath = path.resolve(logPath);
  return (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const entry = {
        time: new Date().toISOString(),
        ip: getClientIp(req),
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        host: req.headers.host || "",
        userAgent: req.headers["user-agent"] || "",
        device: detectDevice(req.headers["user-agent"] || ""),
        durationMs,
      };
      fs.appendFile(resolvedPath, `${JSON.stringify(entry)}\n`, () => {});
    });
    next();
  };
}

function readLogTail({ logPath, lines = 200 }) {
  const resolvedPath = path.resolve(logPath);
  if (!fs.existsSync(resolvedPath)) {
    return [];
  }
  const raw = fs.readFileSync(resolvedPath, "utf8");
  const allLines = raw.split(/\r?\n/).filter(Boolean);
  return allLines.slice(-lines);
}

module.exports = {
  createAccessLogger,
  readLogTail,
};
