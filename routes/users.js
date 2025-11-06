// routes/users.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  dbListUsers,
  dbGetUserById,
  dbUpdateUser,
  dbDeleteUser,
} from "../db.js";
import { requireAuth, requireAdmin } from "../middlewares/authz.js";
import { verifyPassword, hashPassword } from "../utils/password.js";

const r = Router();

/* =========================
   SELF routes (perfil propio)
   Solo requieren estar autenticado
========================= */
r.use(requireAuth);

/** GET /users/me -> datos del usuario actual (seguros) */
r.get("/me", asyncHandler(async (req, res) => {
  const me = await dbGetUserById(req.user.id);
  if (!me) return res.status(404).json({ error: "Usuario no encontrado" });
  // devuelve solo campos seguros
  res.json({
    id: me.id,
    name: me.name,
    phone: me.phone,
    role: me.role,
    // si ya guardas preferencias en Airtable y tu mapper las saca:
    likes: me.likes ?? me.Likes ?? [],
    dislikes: me.dislikes ?? me.Dislikes ?? [],
    allergies: me.allergies ?? me.Allergies ?? [],
  });
}));

/** PUT /users/me/password -> cambiar contraseña */
r.put("/me/password", asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Campos incompletos" });
  }
  const me = await dbGetUserById(req.user.id);
  if (!me) return res.status(404).json({ error: "Usuario no encontrado" });

  const ok = await verifyPassword(currentPassword, me.passwordHash);
  if (!ok) return res.status(401).json({ error: "Contraseña actual incorrecta" });

  const passwordHash = await hashPassword(newPassword);
  await dbUpdateUser(req.user.id, { passwordHash });
  res.status(204).end();
}));

/** PUT /users/me/preferences -> actualizar preferencias */
r.put("/me/preferences", asyncHandler(async (req, res) => {
  const { likes = [], dislikes = [], allergies = [] } = req.body || {};
  // En tu db.js asegúrate de que toUserAirtableFields soporte Likes/Dislikes/Allergies
  await dbUpdateUser(req.user.id, {
    Likes: likes,
    Dislikes: dislikes,
    Allergies: allergies,
  });
  res.status(204).end();
}));

/** DELETE /users/me -> borrar mi cuenta */
r.delete("/me", asyncHandler(async (req, res) => {
  await dbDeleteUser(req.user.id);
  res.status(204).end();
}));


/* =========================
   ADMIN routes
   Requieren autenticado + admin
========================= */
r.use(requireAdmin);

// GET /users
r.get("/", asyncHandler(async (_req, res) => {
  const users = await dbListUsers();
  res.json(users);
}));

// GET /users/:id
r.get("/:id", asyncHandler(async (req, res) => {
  const u = await dbGetUserById(req.params.id);
  res.json(u);
}));

// PATCH /users/:id (actualiza campos del usuario)
r.patch("/:id", asyncHandler(async (req, res) => {
  const allowed = ["name", "phone", "passwordHash", "role"]; // admin puede tocar role
  const patch = {};
  for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];

  if (patch.role && !["admin", "user"].includes(patch.role)) {
    return res.status(400).json({ error: "Role inválido (admin|user)" });
  }

  const u = await dbUpdateUser(req.params.id, patch);
  res.json(u);
}));

// DELETE /users/:id
r.delete("/:id", asyncHandler(async (req, res) => {
  await dbDeleteUser(req.params.id);
  res.status(204).end();
}));

// PATCH /users/:id/role  { "role": "admin" | "user" }
r.patch("/:id/role", asyncHandler(async (req, res) => {
  const { role } = req.body || {};
  if (!role || !["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "Role inválido (admin|user)" });
  }
  const u = await dbUpdateUser(req.params.id, { role });
  res.json(u);
}));

export default r;
