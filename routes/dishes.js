// routes/dishes.js
import { Router } from "express";
import {
  listDishes, getDishById, createDish, updateDish, deleteDish
} from "../airtable.js";
import { requireAdmin } from "./authz.js";

const r = Router();

// Catálogos EXACTOS según tu definición
const DISH_CATEGORIES = [
  "Entrada", "Plato principal", "Postre", "Bebida",
];

const DISH_TAGS = [
  "Light", "Sin gluten", "Sin lactosa", "Picante", "Vegetariano",
];

function validateDishInput(payload, partial = false) {
  const out = {};
  // Campos permitidos en Airtable (según tu tabla)
  const allow = ["Name","Category","Price","Available","Description","Image","Tags"];
  for (const k of allow) if (k in payload) out[k] = payload[k];

  // Validaciones de catálogo
  if ("Category" in out && out.Category && !DISH_CATEGORIES.includes(out.Category)) {
    throw new Error(`Category inválida. Usa: ${DISH_CATEGORIES.join(" | ")}`);
  }
  if ("Tags" in out) {
    if (!Array.isArray(out.Tags)) throw new Error("Tags debe ser arreglo");
    const bad = out.Tags.filter(t => !DISH_TAGS.includes(t));
    if (bad.length) throw new Error(`Tags inválidas: ${bad.join(", ")}`);
  }

  // Tipos básicos
  if ("Price" in out && out.Price !== undefined) {
    const n = Number(out.Price);
    if (Number.isNaN(n) || n < 0) throw new Error("Price debe ser número >= 0");
    out.Price = n;
  }
  if ("Available" in out && out.Available !== undefined) {
    out.Available = !!out.Available; // checkbox
  }

  // Image: Airtable espera attachments como [{url, filename?}] si se envía
  if ("Image" in out && out.Image !== undefined) {
    if (out.Image != null && !Array.isArray(out.Image)) {
      throw new Error("Image debe ser un arreglo de attachments o omitirse");
    }
  }

  if (!partial) {
    const required = ["Name","Category","Price"];
    const missing = required.filter(f => out[f] === undefined || out[f] === null || out[f] === "");
    if (missing.length) throw new Error("Faltan campos: " + missing.join(", "));
  }
  return out;
}

function mapDishRecord(rec) {
  const image = rec.get("Image");
  const imageUrl = Array.isArray(image) && image[0]?.url ? image[0].url : "";
  return {
    id: rec.id,
    Name: rec.get("Name") || "",
    Category: rec.get("Category") || null,
    Price: rec.get("Price") ?? null,
    Available: !!rec.get("Available"),
    Description: rec.get("Description") || "",
    Image: image || [],           // devolvemos el attachment completo por si lo quieres
    imageUrl,                     // y un campo directo para el front
    Tags: rec.get("Tags") || [],
  };
}

// --- Público ---
r.get("/", async (req, res) => {
  try {
    const { category, tag, available, q, limit } = req.query;
    const recs = await listDishes({ category, tag, available, q, limit });
    res.json(recs.map(mapDishRecord));
  } catch (e) {
    console.error("[dishes:list]", e);
    res.status(500).json({ error: "No se pudo listar platillos" });
  }
});

r.get("/:id", async (req, res) => {
  try {
    const rec = await getDishById(req.params.id);
    if (!rec) return res.status(404).json({ error: "No encontrado" });
    res.json(mapDishRecord(rec));
  } catch (e) {
    if (e?.statusCode === 404) {
      return res.status(404).json({ error: "No encontrado" });
    }
    console.error("[dishes:get]", e);
    res.status(500).json({ error: "Error obteniendo platillo" });
  }
});

// --- Admin (JWT) ---
r.post("/", requireAdmin, async (req, res) => {
  try {
    const fields = validateDishInput(req.body, false);
    const rec = await createDish(fields);
    res.status(201).json(mapDishRecord(rec));
  } catch (e) {
    res.status(400).json({ error: e.message || "Datos inválidos" });
  }
});

r.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const fields = validateDishInput(req.body, true);
    const rec = await updateDish(req.params.id, fields);
    res.json(mapDishRecord(rec));
  } catch (e) {
    res.status(400).json({ error: e.message || "Datos inválidos" });
  }
});

r.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await deleteDish(req.params.id);
    res.status(204).end();
  } catch (e) {
    console.error("[dishes:delete]", e);
    res.status(500).json({ error: "No se pudo eliminar" });
  }
});

export default r;
