import { Router } from "express";
import bcrypt from "bcrypt";
import { createUser, findUserByPhone } from "../airtable.js";
import { findUserById } from "../airtable.js";
import { updatePasswordHash } from "../airtable.js";

const r = Router();

// Registro: nombre, teléfono, contraseña
r.post("/register", async (req, res) => {
  try {
    const { name, phone, password } = req.body || {};
    if (!name || !phone || !password) return res.status(400).json({ error: "Campos incompletos" });
    const exists = await findUserByPhone(phone);
    if (exists) return res.status(409).json({ error: "Teléfono ya registrado" });

    const passwordHash = await bcrypt.hash(password, 10);
    const rec = await createUser({ name, phone, passwordHash });
    return res.json({
      id: rec.id,
      name: rec.get("Name"),
      phone: rec.get("Phone"),
      role: rec.get("Role") || "user"
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo registrar" });
  }
});

// Login: teléfono + contraseña
r.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    const rec = await findUserByPhone(phone);
    if (!rec) return res.status(401).json({ error: "Credenciales inválidas" });
    const ok = await bcrypt.compare(password, rec.get("PasswordHash"));
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    res.json({
      id: rec.id,
      name: rec.get("Name"),
      phone: rec.get("Phone"),
      role: rec.get("Role") || "user",
      likes: rec.get("Likes") || [],
      dislikes: rec.get("Dislikes") || [],
      allergies: rec.get("Allergies") || []
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// PUT /api/auth/password  { recordId, currentPassword, newPassword }
r.put("/password", async (req, res) => {
  try {
    const { recordId, currentPassword, newPassword } = req.body || {};
    if (!recordId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Datos incompletos" });
    }
    const rec = await findUserById(recordId);
    if (!rec) return res.status(404).json({ error: "Usuario no encontrado" });

    const ok = await bcrypt.compare(currentPassword, rec.get("PasswordHash"));
    if (!ok) return res.status(401).json({ error: "Contraseña actual incorrecta" });

    const hash = await bcrypt.hash(newPassword, 10);
    await updatePasswordHash(recordId, hash);
    res.json({ ok: true });
  } catch (e) {
    console.error("[password]", e);
    res.status(500).json({ error: "No se pudo actualizar la contraseña" });
  }
});

export default r;