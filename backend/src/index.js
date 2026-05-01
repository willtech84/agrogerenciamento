import { createServer } from "node:http";

const port = process.env.PORT || 4000;
const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/farmdb";

let fieldId = 1;
let taskId = 1;
const fields = [];
const tasks = [];

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  return raw ? JSON.parse(raw) : {};
}

createServer(async (req, res) => {
  cors(res);
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") return res.writeHead(204).end();

  try {
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { status: "ok", databaseUrl });

    if (req.method === "GET" && url.pathname === "/api/fields") return json(res, 200, fields);

    if (req.method === "POST" && url.pathname === "/api/fields") {
      const b = await body(req);
      if (!b.name) return json(res, 400, { error: "Campo 'name' é obrigatório." });
      const item = { id: fieldId++, name: String(b.name), area: Number(b.area || 0) };
      fields.push(item);
      return json(res, 201, item);
    }

    if (req.method === "GET" && url.pathname === "/api/tasks") return json(res, 200, tasks);

    if (req.method === "POST" && url.pathname === "/api/tasks") {
      const b = await body(req);
      if (!b.title || !b.fieldId) return json(res, 400, { error: "Campos 'title' e 'fieldId' são obrigatórios." });
      if (!fields.find((f) => f.id === Number(b.fieldId))) return json(res, 400, { error: "Talhão informado não existe." });
      const item = { id: taskId++, title: String(b.title), fieldId: Number(b.fieldId), status: "todo" };
      tasks.push(item);
      return json(res, 201, item);
    } 
if (req.method === "GET" && url.pathname === "/api/export") {
  return json(res, 200, {
    exportedAt: new Date().toISOString(),
    fields,
    tasks
  });
}
    return json(res, 404, { error: "Not Found" });
  } catch {
    return json(res, 400, { error: "JSON inválido." });
  }
}).listen(port, () => console.log(`Backend running on port ${port}`));