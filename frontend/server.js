import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = process.env.PORT || 3000;
const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
const publicDir = new URL("./public/", import.meta.url);
const publicPath = publicDir.pathname;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function getSafeFilePath(pathname) {
  const normalized = normalize(pathname).replace(/^([.][.][/\\])+/, "");
  return join(publicPath, normalized);
}

async function proxyApi(req, res, pathname, search) {
  const target = `${backendUrl}${pathname.replace(/^\/api/, "")}${search}`;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        accept: req.headers.accept || "application/json"
      }
    });

    const body = await upstream.arrayBuffer();
    const headers = { "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8" };
    res.writeHead(upstream.status, headers);
    res.end(Buffer.from(body));
  } catch (error) {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Backend indisponível", details: error.message }));
  }
}

async function serveFile(res, path) {
  try {
    const data = await readFile(path);
    const type = contentTypes[extname(path)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    await proxyApi(req, res, url.pathname, url.search);
    return;
  }

  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = getSafeFilePath(pathname);
  await serveFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Frontend running on port ${port}`);
});
