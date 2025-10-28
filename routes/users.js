// routes/users.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { dbListUsers, dbGetUserById, dbUpdateUser, dbDeleteUser } from "../db.js";
// requireAuth/requireAdmin se conectarán en server.js

const r = Router();

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

// PATCH /users/:id
r.patch("/:id", asyncHandler(async (req, res) => {
  const u = await dbUpdateUser(req.params.id, req.body || {});
  res.json(u);
}));

// DELETE /users/:id
r.delete("/:id", asyncHandler(async (req, res) => {
  await dbDeleteUser(req.params.id);
  res.status(204).end();
}));

export default r;
