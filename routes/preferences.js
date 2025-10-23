import { Router } from "express";
import { updatePreferences, usersTable } from "../airtable.js";

const r = Router();

// GET /api/preferences/:recordId
r.get("/:recordId", async (req, res) => {
  try {
    const rec = await usersTable().find(req.params.recordId);
    if (!rec) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({
      likes: rec.get("Likes") || [],
      dislikes: rec.get("Dislikes") || [],
      allergies: rec.get("Allergies") || [],
    });
  } catch (e) {
    console.error("[preferences:get]", e?.message || e);
    res.status(404).json({ error: "Usuario no encontrado" });
  }
});

// PUT /api/preferences/:recordId  { likes[], dislikes[], allergies[] }
r.put("/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    if (!recordId) return res.status(400).json({ error: "recordId requerido" });

    const { likes = [], dislikes = [], allergies = [] } = req.body || {};

    const rec = await updatePreferences(recordId, { likes, dislikes, allergies });

    return res.json({
      likes: rec.get("Likes") || [],
      dislikes: rec.get("Dislikes") || [],
      allergies: rec.get("Allergies") || [],
    });
  } catch (e) {
    // Intenta exponer el mensaje real de Airtable si viene
    const msg =
      e?.error?.message ||
      e?.message ||
      "No se pudieron guardar preferencias";
    console.error("[preferences:put]", msg);
    res.status(500).json({ error: msg });
  }
});

export default r;
