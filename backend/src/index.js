import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const port = Number(process.env.PORT || 4000);
const databaseUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/farmdb";
const jwtSecret = process.env.JWT_SECRET || "change_me_in_production";

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: "8h" });
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Token ausente" });
    return;
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    next();
  };
}

function isPrivileged(user) {
  return ["ADMIN", "MANAGER"].includes(user?.role);
}

async function canAccessFarm(farmId, user) {
  const farm = await prisma.farm.findUnique({ where: { id: farmId } });

  if (!farm) {
    return { allowed: false, reason: "not_found" };
  }

  if (isPrivileged(user) || farm.ownerId === user.sub) {
    return { allowed: true, farm };
  }

  return { allowed: false, reason: "forbidden" };
}

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", databaseUrl });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Agro Gerenciamento API",
    docs: "/docs",
    endpoints: [
      "POST /auth/register",
      "POST /auth/login",
      "GET /auth/me",
      "GET /users",
      "GET /farms",
      "POST /farms",
      "PUT /farms/:id",
      "DELETE /farms/:id",
      "GET /plots?farmId=...",
      "POST /plots",
      "PUT /plots/:id",
      "DELETE /plots/:id"
    ]
  });
});

app.get("/docs", (_req, res) => {
  res.status(200).json({
    auth: {
      register: {
        method: "POST",
        path: "/auth/register",
        body: { name: "Nome", email: "usuario@email.com", password: "123456", role: "OPERATOR" }
      },
      login: {
        method: "POST",
        path: "/auth/login",
        body: { email: "usuario@email.com", password: "123456" }
      },
      me: {
        method: "GET",
        path: "/auth/me",
        auth: "Bearer token"
      }
    },
    users: {
      list: {
        method: "GET",
        path: "/users",
        auth: "Bearer token (ADMIN ou MANAGER)"
      }
    },
    farms: {
      list: {
        method: "GET",
        path: "/farms",
        auth: "Bearer token (ADMIN/MANAGER veem todos; OPERATOR vê os próprios)"
      },
      create: {
        method: "POST",
        path: "/farms",
        auth: "Bearer token",
        body: { name: "Fazenda Santa Luzia", location: "Sorriso/MT", areaHectare: 120.5 }
      },
      update: { method: "PUT", path: "/farms/:id", auth: "Bearer token" },
      delete: { method: "DELETE", path: "/farms/:id", auth: "Bearer token" }
    },
    plots: {
      list: {
        method: "GET",
        path: "/plots?farmId=ID_DA_FAZENDA",
        auth: "Bearer token (com acesso à fazenda)"
      },
      create: {
        method: "POST",
        path: "/plots",
        auth: "Bearer token",
        body: { name: "Talhão A", areaHectare: 35, farmId: "ID_DA_FAZENDA" }
      },
      update: { method: "PUT", path: "/plots/:id", auth: "Bearer token" },
      delete: { method: "DELETE", path: "/plots/:id", auth: "Bearer token" }
    }
  });
});

app.post("/auth/register", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const role = String(req.body?.role || "OPERATOR").toUpperCase();

  if (!name || !email || password.length < 6) {
    res.status(400).json({ error: "Dados inválidos. Informe nome, email e senha com no mínimo 6 caracteres." });
    return;
  }

  if (!["ADMIN", "MANAGER", "OPERATOR"].includes(role)) {
    res.status(400).json({ error: "Role inválida. Use ADMIN, MANAGER ou OPERATOR." });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    res.status(409).json({ error: "Email já cadastrado" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });

  const token = createToken(user);
  res.status(201).json({ user, token });
});

app.post("/auth/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const token = createToken(user);

  res.status(200).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

app.get("/auth/me", authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
  });

  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  res.status(200).json({ user });
});

app.get("/users", authRequired, roleRequired("ADMIN", "MANAGER"), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });

  res.status(200).json({ items: users });
});

app.get("/farms", authRequired, async (req, res) => {
  const where = isPrivileged(req.user) ? {} : { ownerId: req.user.sub };

  const items = await prisma.farm.findMany({
    where,
    include: { owner: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });

  res.status(200).json({ items });
});

app.post("/farms", authRequired, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const location = req.body?.location ? String(req.body.location).trim() : null;
  const areaInput = req.body?.areaHectare;
  const areaHectare = areaInput === undefined || areaInput === null || areaInput === "" ? null : Number(areaInput);

  if (!name) {
    res.status(400).json({ error: "Nome da fazenda é obrigatório" });
    return;
  }

  if (areaHectare !== null && Number.isNaN(areaHectare)) {
    res.status(400).json({ error: "Área inválida" });
    return;
  }

  const farm = await prisma.farm.create({
    data: { name, location, areaHectare, ownerId: req.user.sub },
    include: { owner: { select: { id: true, name: true, email: true } } }
  });

  res.status(201).json({ item: farm });
});

app.put("/farms/:id", authRequired, async (req, res) => {
  const farmId = req.params.id;
  const existing = await prisma.farm.findUnique({ where: { id: farmId } });

  if (!existing) {
    res.status(404).json({ error: "Fazenda não encontrada" });
    return;
  }

  if (!isPrivileged(req.user) && existing.ownerId !== req.user.sub) {
    res.status(403).json({ error: "Você não pode alterar essa fazenda" });
    return;
  }

  const data = {};

  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim();

    if (!name) {
      res.status(400).json({ error: "Nome da fazenda é obrigatório" });
      return;
    }

    data.name = name;
  }

  if (req.body?.location !== undefined) {
    data.location = req.body.location ? String(req.body.location).trim() : null;
  }

  if (req.body?.areaHectare !== undefined) {
    const area = req.body.areaHectare === null || req.body.areaHectare === "" ? null : Number(req.body.areaHectare);

    if (area !== null && Number.isNaN(area)) {
      res.status(400).json({ error: "Área inválida" });
      return;
    }

    data.areaHectare = area;
  }

  const farm = await prisma.farm.update({
    where: { id: farmId },
    data,
    include: { owner: { select: { id: true, name: true, email: true } } }
  });

  res.status(200).json({ item: farm });
});

app.delete("/farms/:id", authRequired, async (req, res) => {
  const farmId = req.params.id;
  const existing = await prisma.farm.findUnique({ where: { id: farmId } });

  if (!existing) {
    res.status(404).json({ error: "Fazenda não encontrada" });
    return;
  }

  if (!isPrivileged(req.user) && existing.ownerId !== req.user.sub) {
    res.status(403).json({ error: "Você não pode excluir essa fazenda" });
    return;
  }

  await prisma.farm.delete({ where: { id: farmId } });
  res.status(204).end();
});

app.get("/plots", authRequired, async (req, res) => {
  const farmId = String(req.query.farmId || "").trim();

  if (!farmId) {
    res.status(400).json({ error: "farmId é obrigatório" });
    return;
  }

  const access = await canAccessFarm(farmId, req.user);

  if (!access.allowed) {
    res.status(access.reason === "not_found" ? 404 : 403).json({ error: access.reason === "not_found" ? "Fazenda não encontrada" : "Acesso negado" });
    return;
  }

  const items = await prisma.plot.findMany({
    where: { farmId },
    orderBy: { createdAt: "desc" },
    include: { farm: { select: { id: true, name: true, ownerId: true } } }
  });

  res.status(200).json({ items });
});

app.post("/plots", authRequired, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const farmId = String(req.body?.farmId || "").trim();
  const areaInput = req.body?.areaHectare;
  const areaHectare = areaInput === undefined || areaInput === null || areaInput === "" ? null : Number(areaInput);

  if (!name || !farmId) {
    res.status(400).json({ error: "Nome e farmId são obrigatórios" });
    return;
  }

  if (areaHectare !== null && Number.isNaN(areaHectare)) {
    res.status(400).json({ error: "Área inválida" });
    return;
  }

  const access = await canAccessFarm(farmId, req.user);

  if (!access.allowed) {
    res.status(access.reason === "not_found" ? 404 : 403).json({ error: access.reason === "not_found" ? "Fazenda não encontrada" : "Acesso negado" });
    return;
  }

  const item = await prisma.plot.create({
    data: { name, farmId, areaHectare },
    include: { farm: { select: { id: true, name: true, ownerId: true } } }
  });

  res.status(201).json({ item });
});

app.put("/plots/:id", authRequired, async (req, res) => {
  const plotId = req.params.id;
  const existing = await prisma.plot.findUnique({ where: { id: plotId }, include: { farm: true } });

  if (!existing) {
    res.status(404).json({ error: "Talhão não encontrado" });
    return;
  }

  const access = await canAccessFarm(existing.farmId, req.user);

  if (!access.allowed) {
    res.status(access.reason === "not_found" ? 404 : 403).json({ error: access.reason === "not_found" ? "Fazenda não encontrada" : "Acesso negado" });
    return;
  }

  const data = {};

  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim();

    if (!name) {
      res.status(400).json({ error: "Nome do talhão é obrigatório" });
      return;
    }

    data.name = name;
  }

  if (req.body?.areaHectare !== undefined) {
    const area = req.body.areaHectare === null || req.body.areaHectare === "" ? null : Number(req.body.areaHectare);

    if (area !== null && Number.isNaN(area)) {
      res.status(400).json({ error: "Área inválida" });
      return;
    }

    data.areaHectare = area;
  }

  if (req.body?.farmId !== undefined) {
    const targetFarmId = String(req.body.farmId || "").trim();

    if (!targetFarmId) {
      res.status(400).json({ error: "farmId inválido" });
      return;
    }

    const targetAccess = await canAccessFarm(targetFarmId, req.user);

    if (!targetAccess.allowed) {
      res.status(targetAccess.reason === "not_found" ? 404 : 403).json({ error: targetAccess.reason === "not_found" ? "Fazenda não encontrada" : "Acesso negado" });
      return;
    }

    data.farmId = targetFarmId;
  }

  const item = await prisma.plot.update({
    where: { id: plotId },
    data,
    include: { farm: { select: { id: true, name: true, ownerId: true } } }
  });

  res.status(200).json({ item });
});

app.delete("/plots/:id", authRequired, async (req, res) => {
  const plotId = req.params.id;
  const existing = await prisma.plot.findUnique({ where: { id: plotId }, include: { farm: true } });

  if (!existing) {
    res.status(404).json({ error: "Talhão não encontrado" });
    return;
  }

  const access = await canAccessFarm(existing.farmId, req.user);

  if (!access.allowed) {
    res.status(access.reason === "not_found" ? 404 : 403).json({ error: access.reason === "not_found" ? "Fazenda não encontrada" : "Acesso negado" });
    return;
  }

  await prisma.plot.delete({ where: { id: plotId } });
  res.status(204).end();
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(port, async () => {
  try {
    await prisma.$connect();
  } catch (error) {
    console.warn("Falha ao conectar no banco na inicialização:", error.message);
  }

  console.log(`Backend running on port ${port}`);
});
