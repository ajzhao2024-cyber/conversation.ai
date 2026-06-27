import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import handler from "../api/generate.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT || 4173);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function attachResponseHelpers(response) {
  response.status = (status) => { response.statusCode = status; return response; };
  response.json = (value) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(value === null ? "" : JSON.stringify(value));
    return response;
  };
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2048) return "x".repeat(2049);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(request, response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root)) { response.statusCode = 403; response.end("Forbidden"); return; }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    response.statusCode = 200;
    response.setHeader("Content-Type", contentTypes[extname(filePath)] || "application/octet-stream");
    response.setHeader("Cache-Control", requested.startsWith("/assets/") ? "public, max-age=0" : "no-store");
    response.end(await readFile(filePath));
  } catch {
    response.statusCode = 404;
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/api/generate") {
    request.body = await readRequestBody(request);
    attachResponseHelpers(response);
    await handler(request, response);
    return;
  }
  await serveStatic(request, response, decodeURIComponent(url.pathname));
});

server.listen(port, () => {
  console.log(`conversation.ai local server running at http://localhost:${port}`);
});
