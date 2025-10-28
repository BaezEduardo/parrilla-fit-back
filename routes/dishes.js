// routes/dishes.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { dbListDishes, dbGetDishById, dbCreateDish, dbUpdateDish, dbDeleteDish } from "../db.js";

const r = Router();

// GET /dishes
r.get("/", asyncHandler(async (_req, res) => {
  const items = await dbListDishes();
  res.json(items);
}));

// GET /dishes/:id
r.get("/:id", asyncHandler(async (req, res) => {
  const item = await dbGetDishById(req.params.id);
  res.json(item);
}));

// POST /dishes
r.post("/", asyncHandler(async (req, res) => {
  const created = await dbCreateDish(req.body || {});
  res.status(201).json(created);
}));

// PATCH /dishes/:id
r.patch("/:id", asyncHandler(async (req, res) => {
  const updated = await dbUpdateDish(req.params.id, req.body || {});
  res.json(updated);
}));

// DELETE /dishes/:id
r.delete("/:id", asyncHandler(async (req, res) => {
  await dbDeleteDish(req.params.id);
  res.status(204).end();
}));

export default r;
