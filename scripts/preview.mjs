// Local preview server for the Nitro (Cloudflare Worker) production build.
//
// `npm run build` emits a cloudflare-module worker bundle into `.output/` whose
// SSR handler only runs in Node when called with a Cloudflare-style signature
// (fetch(request, env, context)). Cloudflare public assets are NOT served by
// that handler in Node (they are meant to be served via env.ASSETS), so this
// script serves the built static files from `.output/public` and delegates
// everything else to the SSR handler.
//
// Node builtins only — no new dependencies.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(process.cwd());
const PUBLIC_DIR = join(ROOT, ".output", "public");
const SERVER_ENTRY = join(ROOT, ".output", "server", "index.mjs");
const PORT = Number(process.env.PORT || process.argv[2] || 4173);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

let ssrHandler;

async function getSsrHandler() {
  if (!ssrHandler) {
    const mod = await import(pathToFileURL(SERVER_ENTRY).toString());
    ssrHandler = mod.default;
  }
  return ssrHandler;
}

function isInside(root, target) {
  const rel = resolve(target).slice(0, root.length);
  return rel === root;
}

async function serveStatic(req, res, pathname) {
  const filePath = normalize(join(PUBLIC_DIR, pathname));
  if (!isInside(PUBLIC_DIR, filePath)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return true;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    const data = await readFile(filePath);
    const mime = MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, {
      "content-type": mime,
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": data.length,
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function readRequestBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolveBody(Buffer.concat(chunks)));
    req.on("error", rejectBody);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    if (await serveStatic(req, res, pathname)) return;

    const handler = await getSsrHandler();
    const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readRequestBody(req);

    const webReq = new Request(url, {
      method: req.method ?? "GET",
      headers: req.headers,
      body,
      ...(body ? { duplex: "half" } : {}),
    });

    const webRes = await handler.fetch(webReq, {}, { waitUntil: () => {} });

    const headers = Object.fromEntries(webRes.headers.entries());
    if (webRes.status === 200 && headers["content-type"]?.startsWith("text/html")) {
      headers["content-encoding"] = "identity";
    }
    res.writeHead(webRes.status, webRes.statusText, headers);

    const buf = Buffer.from(await webRes.arrayBuffer());
    res.end(buf);
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Preview server error: ${error && error.stack ? error.stack : String(error)}`);
  }
});

server.listen(PORT, "::", () => {
  console.log(`ProctorPal production preview running at http://localhost:${PORT}`);
  console.log(`Serving SSR from ${SERVER_ENTRY}`);
  console.log(`Serving static assets from ${PUBLIC_DIR}`);
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));