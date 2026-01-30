import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const port = process.env.PORT || 3000;
const publicDir = new URL("./public/", import.meta.url);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

async function serveFile(res, path) {
  try {
    const data = await readFile(path);
    const type = contentTypes[extname(path)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(publicDir.pathname, pathname);
  await serveFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Frontend running on port ${port}`);
});
