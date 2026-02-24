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

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", databaseUrl });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Agro Gerenciamento API",
    docs: "/docs",
    endpoints: ["POST /auth/register", "POST /auth/login", "GET /auth/me", "GET /users"]
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
