const port = process.env.PORT || 4000;
const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/farmdb";

const server = await import("node:http").then((mod) => mod.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", databaseUrl }));
    return;
  }

  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Agro Gerenciamento API", endpoints: ["/health"] }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
}));

server.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
