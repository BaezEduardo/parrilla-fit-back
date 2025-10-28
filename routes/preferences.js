// routes/preferences.js
import { Router } from "express";
import { updatePreferences, usersTable, findUserById } from "../airtable.js";
import { requireAuth } from "./authz.js";

const r = Router();

function normalizeList(arr) {
  return Array.isArray(arr)
    ? [...new Set(arr.map(v => String(v).trim()).filter(Boolean))]
    : [];
}

async function ensureAirtableReady(res) {
  const t = usersTable();
  if (!t) {
    res.status(503).json({ error: "Airtable no inicializado" });
    return null;
  }
  return t;
}

/* =========================
 * Endpoints centrados en el propio usuario (recomendado)
 * ========================= */

// GET /api/preferences/me
r.get("/me", requireAuth, async (req, res) => {
  try {
    const t = await ensureAirtableReady(res);
    if (!t) return;

    const rec = await findUserById(req.user.id);
    if (!rec) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      likes: rec.get("Likes") || [],
      dislikes: rec.get("Dislikes") || [],
      allergies: rec.get("Allergies") || [],
    });
  } catch (e) {
    console.error("[preferences:get:me]", e?.message || e);
    res.status(500).json({ error: "No se pudieron obtener preferencias" });
  }
});

// PUT /api/preferences/me  { likes[], dislikes[], allergies[] }
r.put("/me", requireAuth, async (req, res) => {
  try {
    const t = await ensureAirtableReady(res);
    if (!t) return;

    const likes = normalizeList(req.body?.likes);
    const dislikes = normalizeList(req.body?.dislikes);
    const allergies = normalizeList(req.body?.allergies);

    const rec = await updatePreferences(req.user.id, { likes, dislikes, allergies });

    res.json({
      likes: rec.get("Likes") || [],
      dislikes: rec.get("Dislikes") || [],
      allergies: rec.get("Allergies") || [],
    });
  } catch (e) {
    const msg = e?.error?.message || e?.message || "No se pudieron guardar preferencias";
    console.error("[preferences:put:me]", msg);
    res.status(500).json({ error: msg });
  }
});

/* =========================
 * Endpoints legacy por :recordId (compatibilidad)
 * - Permitidos sólo si es el propio usuario.
 * ========================= */

r.get("/:recordId", requireAuth, async (req, res) => {
  try {
    const t = await ensureAirtableReady(res);
    if (!t) return;

    const { recordId } = req.params;
    const isSelf = recordId === req.user.id;
    if (!isSelf) return res.status(403).json({ error: "Prohibido" });

    const rec = await findUserById(recordId);
    if (!rec) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      likes: rec.get("Likes") || [],
      dislikes: rec.get("Dislikes") || [],
      allergies: rec.get("Allergies") || [],
    });
  } catch (e) {
    console.error("[preferences:get:recordId]", e?.message || e);
    res.status(500).json({ error: "No se pudieron obtener preferencias" });
  }
});

r.put("/:recordId", requireAuth, async (req, res) => {
  try {
    const t = await ensureAirtableReady(res);
    if (!t) return;

    const { recordId } = req.params;
    const isSelf = recordId === req.user.id;
    if (!isSelf) return res.status(403).json({ error: "Prohibido" });

    const likes = normalizeList(req.body?.likes);
    const dislikes = normalizeList(req.body?.dislikes);
    const allergies = normalizeList(req.body?.allergies);

    const rec = await updatePreferences(recordId, { likes, dislikes, allergies });

    res.json({
      likes: rec.get("Likes") || [],
      dislikes: rec.get("Dislikes") || [],
      allergies: rec.get("Allergies") || [],
    });
  } catch (e) {
    const msg = e?.error?.message || e?.message || "No se pudieron guardar preferencias";
    console.error("[preferences:put:recordId]", msg);
    res.status(500).json({ error: msg });
  }
});

export default r;
