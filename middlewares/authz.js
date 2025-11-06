// middlewares/authz.js
import { verifyJwt } from "../utils/jwt.js";

const COOKIE = "pf_auth";

export function requireAuth(req, res, next) {
  // 1) Token desde cookie (preferido)
  let token = req.cookies?.[COOKIE] || null;

  // 2) o desde Authorization: Bearer xxx
  if (!token) {
    const hdr = req.headers?.authorization || "";
    if (hdr.startsWith("Bearer ")) token = hdr.slice(7);
  }

  if (!token) return res.status(401).json({ error: "No autenticado" });

  try {
    const p = verifyJwt(token); // lanza si es inválido
    req.user = { id: p.id, role: p.role, name: p.name, phone: p.phone };
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Solo admin" });
  next();
}
