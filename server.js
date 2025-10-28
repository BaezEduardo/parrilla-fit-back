// server.js
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import { fileURLToPath } from "url";

import { ENV } from "./config/env.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import dishesRouter from "./routes/dishes.js";
import { requireAuth } from "./middlewares/authz.js";
import { notFound, errorHandler } from "./middlewares/error.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = ENV.NODE_ENV === "production";

// --- Middlewares base
app.use(morgan(isProd ? "combined" : "dev"));
app.use(express.json());
app.use(cookieParser());

// --- CORS (dev permite localhost:5173; prod puedes fijar tu dominio)
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: isProd ? corsOrigin : corsOrigin,
    credentials: true,
  })
);

// --- Utilidad: opciones de cookie según entorno
function cookieOpts() {
  const weekMs = 1000 * 60 * 60 * 24 * 7;
  return {
    httpOnly: true,
    secure: isProd,            // requiere HTTPS en prod
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: weekMs,            // alinea con JWT_EXPIRES ~7d
  };
}

// --- “Login cookie wiring”
// Interceptamos res.json para poner cookie si el body tiene { token, user }
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    try {
      if (
        req.path === "/api/auth/login" &&
        req.method === "POST" &&
        body &&
        typeof body === "object" &&
        body.token
      ) {
        res.cookie("token", body.token, cookieOpts());
      }
    } catch {
      // no romper respuesta si algo falla al setear cookie
    }
    return originalJson(body);
  };
  next();
});

// --- API routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/dishes", dishesRouter);

// --- Endpoints de sesión basados en cookie (sobrescriben los placeholders del router)
app.get("/api/auth/me", requireAuth, (req, res) => {
  // req.user viene del JWT (middlewares/authz.js)
  const { id, role, name, phone } = req.user || {};
  res.json({ id, role, name, phone });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", { ...cookieOpts(), maxAge: 0 });
  res.status(204).end();
});

// --- Static (producción): sirve tu frontend si existe
// Ajusta STATIC_DIR si tu build vive en otro sitio (por ejemplo, "../client/dist")
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, "public");
if (isProd) {
  app.use(express.static(STATIC_DIR));
  // Para apps SPA: redirige todo lo no-API a index.html
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });
}

app.get("/api/health", (_req, res) => res.json({ ok: true, env: ENV.NODE_ENV }));

// --- 404 y manejador de errores
app.use(notFound);
app.use(errorHandler);

// --- Inicio
const port = ENV.PORT || 3000;
app.listen(port, () => {
  console.log(`[server] ${isProd ? "PROD" : "DEV"} listening on :${port}`);
});
