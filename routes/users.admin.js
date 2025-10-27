// routes/users.admin.js
import { Router } from "express";
import { listUsers, deleteUser, findUserById, userAdminViewJSON } from "../airtable.js";

const r = Router();

// Guard simple con x-admin-key (igual que en dishes)
function requireAdmin(req, res, next) {
  const key = req.get("x-admin-key");
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "Admin key inválida" });
  }
  next();
}

/**
 * GET /api/users  (admin)
 * Query params opcionales:
 *  - role: "user" | "admin"
 *  - q: texto (busca en Name/Phone)
 *  - limit: número (por defecto 50, máx 100)
 */
r.get("/", requireAdmin, async (req, res) => {
  try {
    const { role, q, limit } = req.query;
    const recs = await listUsers({ role, q, limit });
    res.json(recs.map(userAdminViewJSON));
  } catch (e) {
    console.error("[admin:users:list]", e);
    res.status(500).json({ error: "No se pudo listar usuarios" });
  }
});

/**
 * GET /api/users/:id  (admin)
 */
r.get("/:id", requireAdmin, async (req, res) => {
  try {
    const rec = await findUserById(req.params.id);
    if (!rec) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(userAdminViewJSON(rec));
  } catch (e) {
    console.error("[admin:users:get]", e);
    res.status(404).json({ error: "Usuario no encontrado" });
  }
});

/**
 * DELETE /api/users/:id  (admin)
 * Hard-delete. Si prefieres soft-delete, dime y lo cambiamos.
 */
r.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error("[admin:users:delete]", e);
    res.status(500).json({ error: "No se pudo eliminar el usuario" });
  }
});

export default r;
