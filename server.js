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
import { notFound, errorHandler } from "./middlewares/error.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = ENV.NODE_ENV === "production";

// Si estás detrás de proxy (Plesk/Passenger) para que secure cookies funcionen correctamente
app.set("trust proxy", 1);

// --- Middlewares base
app.use(morgan(isProd ? "combined" : "dev"));
app.use(express.json());
app.use(cookieParser());

// --- CORS (dev permite localhost:5173; prod usa ENV.CORS_ORIGIN)
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// --- API routes (sin hacks extra; auth.js ya setea cookie `pf_auth`)
app.use("/api/auth", authRouter);   // /api/auth/login, /api/auth/register, /api/auth/me, /api/auth/logout
app.use("/api/users", usersRouter); // /api/users/... (incluye /me/*)
app.use("/api/dishes", dishesRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true, env: ENV.NODE_ENV }));

// --- Static (producción): sirve tu frontend si existe
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, "public");
if (isProd) {
  app.use(express.static(STATIC_DIR));
  // Para apps SPA: redirige todo lo no-API a index.html
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });
}

// --- 404 y manejador de errores
app.use(notFound);
app.use(errorHandler);

// --- Inicio
const port = ENV.PORT || 3000;
app.listen(port, () => {
  console.log(`[server] ${isProd ? "PROD" : "DEV"} listening on :${port}`);
});
