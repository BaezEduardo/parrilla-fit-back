// routes/dishes.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  dbListDishes,
  dbGetDishById,
  dbCreateDish,
  dbUpdateDish,
  dbDeleteDish,
} from "../db.js";
import { requireAuth, requireAdmin } from "../middlewares/authz.js";

const r = Router();

// --- Públicos
r.get("/", asyncHandler(async (_req, res) => {
  const items = await dbListDishes();
  res.json(items);
}));

r.get("/:id", asyncHandler(async (req, res) => {
  const item = await dbGetDishById(req.params.id);
  res.json(item);
}));

// --- Protegidos (admin)
r.post("/", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const created = await dbCreateDish(req.body || {});
  res.status(201).json(created);
}));

r.patch("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const updated = await dbUpdateDish(req.params.id, req.body || {});
  res.json(updated);
}));

r.delete("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await dbDeleteDish(req.params.id);
  res.status(204).end();
}));

export default r;
