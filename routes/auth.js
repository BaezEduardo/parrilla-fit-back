import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  createUser,
  findUserByPhone,
  findUserById,
  updatePasswordHash,
  deleteUser,
  normalizeRole
} from "../airtable.js";
import { requireAuth } from "./authz.js";

const r = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const isProd    = process.env.NODE_ENV === "production";
const COOKIE_NAME = "pf_auth";

// Helper centralizado para setear la cookie de sesión
function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",        // MISMO ORIGEN con proxy /api
    secure: isProd,         // true en producción (HTTPS)
    path: "/",              // toda la app
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    // ⚠️ NO establecer "domain" para que se ate al dominio actual
  });
}

// Registro
r.post("/register", async (req, res) => {
  try {
    let { name, phone, password } = req.body || {};
    if (!name || !phone || !password) {
      return res.status(400).json({ error: "Campos incompletos" });
    }

    phone = String(phone).replace(/\D+/g, "");

    const exists = await findUserByPhone(phone);
    if (exists) return res.status(409).json({ error: "Teléfono ya registrado" });

    const passwordHash = await bcrypt.hash(password, 10);
    const rec = await createUser({ name, phone, passwordHash, role: "user" });
    const role = normalizeRole(rec.get("Role"));

    const token = jwt.sign({ sub: rec.id, role }, JWT_SECRET, { expiresIn: "7d" });
    setAuthCookie(res, token);

    res.json({ id: rec.id, name, phone, role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo registrar" });
  }
});

// Login
r.post("/login", async (req, res) => {
  try {
    let { phone, password } = req.body || {};
    phone = String(phone || "").replace(/\D+/g, "");

    const rec = await findUserByPhone(phone);
    if (!rec) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, rec.get("PasswordHash"));
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const role = normalizeRole(rec.get("Role"));
    const token = jwt.sign({ sub: rec.id, role }, JWT_SECRET, { expiresIn: "7d" });
    setAuthCookie(res, token);

    res.json({
      id: rec.id,
      name: rec.get("Name"),
      phone: rec.get("Phone"),
      role,
      likes: rec.get("Likes") || [],
      dislikes: rec.get("Dislikes") || [],
      allergies: rec.get("Allergies") || [],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// Logout
r.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
  });
  res.json({ ok: true });
});

// Cambiar contraseña
r.put("/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Datos incompletos" });

    const rec = await findUserById(req.user.id);
    if (!rec) return res.status(404).json({ error: "Usuario no encontrado" });

    const ok = await bcrypt.compare(currentPassword, rec.get("PasswordHash"));
    if (!ok) return res.status(401).json({ error: "Contraseña actual incorrecta" });

    const hash = await bcrypt.hash(newPassword, 10);
    await updatePasswordHash(req.user.id, hash);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo actualizar la contraseña" });
  }
});

// Borrar cuenta
r.delete("/me", requireAuth, async (req, res) => {
  try {
    const { currentPassword } = req.body || {};
    if (!currentPassword) return res.status(400).json({ error: "Falta contraseña" });

    const rec = await findUserById(req.user.id);
    if (!rec) return res.status(404).json({ error: "Usuario no encontrado" });

    const ok = await bcrypt.compare(currentPassword, rec.get("PasswordHash"));
    if (!ok) return res.status(401).json({ error: "Contraseña incorrecta" });

    await deleteUser(req.user.id);

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
    });

    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo eliminar la cuenta" });
  }
});

// Perfil actual
r.get("/me", requireAuth, async (req, res) => {
  try {
    const rec = await findUserById(req.user.id);
    if (!rec) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      id: rec.id,
      name: rec.get("Name"),
      phone: rec.get("Phone"),
      role: normalizeRole(rec.get("Role")),
      likes: rec.get("Likes") || [],
      dislikes: rec.get("Dislikes") || [],
      allergies: rec.get("Allergies") || [],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo obtener el usuario" });
  }
});

export default r;
