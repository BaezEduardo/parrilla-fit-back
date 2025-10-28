import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function requireAuth(req, res, next) {
  const token = req.cookies?.pf_auth;
  if (!token) return res.status(401).json({ error: "No autenticado" });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    const role = String(data.role || "user").trim().toLowerCase() === "admin" ? "admin" : "user";
    req.user = { id: data.sub, role };
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Requiere rol admin" });
    next();
  });
}
