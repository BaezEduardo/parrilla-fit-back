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
import aiRouter from "./routes/ai.js";
import { notFound, errorHandler } from "./middlewares/error.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = ENV.NODE_ENV === "production";

// Detrás de proxy (Plesk/Passenger) para que cookies secure funcionen
app.set("trust proxy", 1);

// ---------------- Base middlewares ----------------
app.use(morgan(isProd ? "combined" : "dev"));
app.use(express.json());
app.use(cookieParser());

// CORS (dominios separados). ¡OJO!: sin "/" al final
const corsOrigin = process.env.CORS_ORIGIN || "https://parrillafit.castelancarpinteyro.com";
const corsCfg = {
  origin: corsOrigin,
  credentials: true,
};
app.use(cors(corsCfg));
// Opcional: habilita preflight explícito
app.options("*", cors(corsCfg));

// Opciones de cookie coherentes con cross-site HTTPS
function cookieOpts() {
  return {
    httpOnly: true,
    secure: true,      // HTTPS
    sameSite: "none",  // cross-site
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  };
}
// Si necesitas usarlas aquí en algún endpoint, están disponibles:
app.locals.cookieOpts = cookieOpts;

// ---------------- API routes ----------------
app.get("/api/health", (_req, res) => res.json({ ok: true, env: ENV.NODE_ENV }));

app.use("/api/auth", authRouter);     // /login, /register, /me, /logout (usar cookieOpts en auth.js)
app.use("/api/users", usersRouter);   // protegido en router
app.use("/api/dishes", dishesRouter);
app.use("/api/ai", aiRouter);

// ---------------- Static (producción) ----------------
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, "public");
if (isProd) {
  app.use(express.static(STATIC_DIR));
  // SPA: cualquier ruta NO-API envía index.html
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });
}

// ---------------- Errores ----------------
app.use(notFound);
app.use(errorHandler);

// ---------------- Start ----------------
const port = ENV.PORT || 3000;
app.listen(port, () => {
  console.log(`[server] ${isProd ? "PROD" : "DEV"} listening on :${port}`);
});
