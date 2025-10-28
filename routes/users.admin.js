// routes/users.admin.js
import { Router } from "express";
import { requireAdmin } from "./authz.js";
import { listUsers, deleteUser, userAdminViewJSON } from "../airtable.js";

const r = Router();

// ✅ todas las rutas de este router requieren admin
r.use(requireAdmin);

r.get("/", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 100));
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const role = typeof req.query.role === "string" ? req.query.role.trim() : undefined;

    const recs = await listUsers({ q, role, limit });
    const items = recs.map(userAdminViewJSON);
    res.json({ items, count: items.length });
  } catch (e) {
    console.error("[users.admin:list]", e);
    res.status(500).json({ error: "Error listando usuarios" });
  }
});

r.delete("/:id", async (req, res) => {
  try {
    if (req.user?.id === req.params.id) {
      return res.status(400).json({ error: "No puedes eliminar tu propia cuenta desde admin" });
    }
    await deleteUser(req.params.id);
    res.status(204).end();
  } catch (e) {
    console.error("[users.admin:delete]", e);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
});

export default r;
