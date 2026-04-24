const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const workspaceRoot = path.resolve(__dirname, "..");
const backendEntry = path.join(workspaceRoot, "server", "index.js");
const frontendPort = Number(process.env.FRONTEND_PORT || 5500);
const frontendHost = process.env.FRONTEND_HOST || "0.0.0.0";
const maxPortAttempts = Number(process.env.FRONTEND_PORT_ATTEMPTS || 20);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      res.end(error.code === "ENOENT" ? "Arquivo nao encontrado." : "Erro ao ler arquivo.");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

function resolveRequestPath(urlPathname) {
  const requestedPath = decodeURIComponent(urlPathname.split("?")[0]);
  const normalizedPath = requestedPath === "/" ? "/view/index.html" : requestedPath;
  const absolutePath = path.normalize(path.join(workspaceRoot, normalizedPath));

  if (!absolutePath.startsWith(workspaceRoot)) {
    return null;
  }

  return absolutePath;
}

const frontendServer = http.createServer((req, res) => {
  const resolvedPath = resolveRequestPath(req.url || "/");
  if (!resolvedPath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Acesso negado.");
    return;
  }

  fs.stat(resolvedPath, (error, stats) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Arquivo nao encontrado.");
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(resolvedPath, "index.html");
      sendFile(res, indexPath);
      return;
    }

    sendFile(res, resolvedPath);
  });
});

function listenFrontend(port, attemptsLeft = maxPortAttempts) {
  return new Promise((resolve, reject) => {
    const handleError = (error) => {
      frontendServer.off("listening", handleListening);

      if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
        console.warn(`Porta ${port} ocupada. Tentando ${port + 1}...`);
        resolve(listenFrontend(port + 1, attemptsLeft - 1));
        return;
      }

      reject(error);
    };

    const handleListening = () => {
      frontendServer.off("error", handleError);
      resolve(port);
    };

    frontendServer.once("error", handleError);
    frontendServer.once("listening", handleListening);
    frontendServer.listen(port, frontendHost);
  });
}

const backendProcess = spawn(process.execPath, [backendEntry], {
  cwd: workspaceRoot,
  stdio: "inherit",
  env: process.env
});

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  frontendServer.close(() => {
    if (!backendProcess.killed) {
      backendProcess.kill("SIGINT");
    }
    process.exit(exitCode);
  });

  setTimeout(() => {
    if (!backendProcess.killed) {
      backendProcess.kill("SIGTERM");
    }
    process.exit(exitCode);
  }, 1500).unref();
}

backendProcess.on("exit", (code) => {
  if (!shuttingDown) {
    console.log(`Backend finalizado com codigo ${code ?? 0}.`);
    shutdown(code ?? 0);
  }
});

backendProcess.on("error", (error) => {
  console.error("Nao foi possivel iniciar o backend:", error.message);
  shutdown(1);
});

listenFrontend(frontendPort)
  .then((activePort) => {
    console.log(`Front-end pronto em http://localhost:${activePort}/view/index.html`);
    console.log("Pressione CTRL+C para encerrar front-end e back-end.");
  })
  .catch((error) => {
    console.error("Nao foi possivel iniciar o front-end:", error.message);
    shutdown(1);
  });

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
