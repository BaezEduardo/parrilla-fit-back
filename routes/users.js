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

const r = Router();

// Protegemos TODO el router: autenticado + admin
r.use(requireAuth, requireAdmin);

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

  // normaliza role si viene
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
