// routes/auth.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { dbCreateUser, dbGetUserByPhone } from "../db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signJwt, verifyJwt } from "../utils/jwt.js";

const r = Router();
const isProd = process.env.NODE_ENV === "production";
const COOKIE_NAME = "pf_auth";

// helper para setear cookie JWT
function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,        // true en prod (HTTPS)
    sameSite: isProd ? "lax" : "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
  });
}

// helper para limpiar cookie
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

// POST /auth/register
r.post("/register", asyncHandler(async (req, res) => {
  const { name, phone, password } = req.body || {}; // 👈 ignoramos cualquier "role" recibido
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Campos incompletos" });
  }

  const exists = await dbGetUserByPhone(phone);
  if (exists) return res.status(409).json({ error: "Teléfono ya registrado" });

  const passwordHash = await hashPassword(password);

  // 👇 forzamos role = "user"
  const user = await dbCreateUser({ name, phone, passwordHash, role: "user" });

  // opcional: si usas cookie JWT al registrarse también
  const token = signJwt({ id: user.id, role: user.role, name: user.name, phone: user.phone });
  setAuthCookie(res, token); // si ya tienes esta helper en este archivo

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
  setAuthCookie(res, token);

  res.json({ id: user.id, name: user.name, phone: user.phone, role: user.role });
}));

// GET /auth/me
r.get("/me", asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "No autenticado" });

  const payload = verifyJwt(token); // lanza si es inválido
  res.json({ id: payload.id, name: payload.name, phone: payload.phone, role: payload.role });
}));

// POST /auth/logout
r.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

export default r;