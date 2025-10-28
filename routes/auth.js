// routes/auth.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { dbCreateUser, dbGetUserByPhone } from "../db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signJwt } from "../utils/jwt.js";

const r = Router();

// POST /auth/register
r.post("/register", asyncHandler(async (req, res) => {
  // TODO: validar body
  const { name, phone, password } = req.body || {};
  if (!name || !phone || !password) return res.status(400).json({ error: "Campos incompletos" });

  const exists = await dbGetUserByPhone(phone);
  if (exists) return res.status(409).json({ error: "Teléfono ya registrado" });

  const passwordHash = await hashPassword(password);
  const user = await dbCreateUser({ name, phone, passwordHash, role: "user" });

  res.status(201).json({ id: user.id, name: user.name, phone: user.phone, role: user.role });
}));

// POST /auth/login
r.post("/login", asyncHandler(async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: "Campos incompletos" });

  const user = await dbGetUserByPhone(phone);
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const token = signJwt({ id: user.id, role: user.role, name: user.name, phone: user.phone });

  // No establecemos cookie aquí aún; el wiring se hace en server.js
  res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
}));

// GET /auth/me
r.get("/me", asyncHandler(async (req, res) => {
  // Este endpoint necesitará requireAuth cuando lo conectemos
  res.status(501).json({ error: "Not implemented (wire en server.js pendiente)" });
}));

// POST /auth/logout
r.post("/logout", (_req, res) => {
  // Implementación final se hará en el wiring (borrar cookie)
  res.status(204).end();
});

export default r;
