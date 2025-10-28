import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import { getBase } from "./airtable.js";
import authRoutes from "./routes/auth.js";
import prefRoutes from "./routes/preferences.js";
import dishesRoutes from "./routes/dishes.js";
import adminUsersRoutes from "./routes/users.admin.js";

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || 3000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("trust proxy", 1);

const allowed = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(new Error("Origen no permitido por CORS"), false);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// Rutas API
app.use("/api/auth", authRoutes);
app.use("/api/preferences", prefRoutes);
app.use("/api/dishes", dishesRoutes);
app.use("/api/users", adminUsersRoutes);

// Diagnóstico
app.get("/", (_req, res) => res.send("API Parrilla Fit funcionando ✅"));
app.get("/health", (_req, res) => res.send("ok"));
app.get("/__ver", (_req, res) => {
  res.json({
    msg: "backend vivo",
    cwd: process.cwd(),
    time: new Date().toISOString(),
    allowedOrigins: allowed,
  });
});
app.get("/__air", async (_req, res) => {
  try {
    const b = typeof getBase === "function" ? getBase() : null;
    if (!b) throw new Error("Airtable no inicializado");
    const table = process.env.AIRTABLE_TABLE_USERS || "Users";
    const records = await b(table).select({ maxRecords: 3 }).firstPage();
    res.json({
      ok: true,
      table,
      count: records.length,
      sample: records.map(r => ({ id: r.id, fields: r.fields })),
    });
  } catch (e) {
    res.status(500).json({ ok: false, message: e?.message || String(e) });
  }
});

app.use((err, _req, res, _next) => {
  console.error("[Unhandled]", err?.stack || err);
  res.status(500).json({ error: "Internal error" });
});

app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT} (${isProd ? "prod" : "dev"})`);
});
