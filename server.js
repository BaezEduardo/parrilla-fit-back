// server.js (minimal para Passenger)
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { getBase } from "./airtable.js";
import authRoutes from "./routes/auth.js";
import prefRoutes from "./routes/preferences.js";
import dishesRoutes from "./routes/dishes.js";

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === "production";
const PORT = isProd ? Number(process.env.PORT || 0) : Number(process.env.PORT || 3000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS muy simple (puedes ajustar luego)
const allowed = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/preferences", prefRoutes);
app.use("/api/dishes", dishesRoutes);
app.get("/", (_req, res) => res.send("API Parrilla Fit funcionando ✅"));
// evita 500 del favicon
app.get("/favicon.ico", (_req,res) => res.status(204).end());

// salud
app.get("/health", (_req, res) => res.send("ok"));
app.get("/__ver", (_req, res) => {
  res.json({
    msg: "backend vivo",
    cwd: process.cwd(),
    time: new Date().toISOString(),
    allowedOrigins: allowed,
  });
});

// muestra menú desde archivo
app.get("/api/menu", (_req, res) => {
  try {
    const filePath = path.join(__dirname, "data", "menu.json");
    const text = fs.readFileSync(filePath, "utf-8");
    res.json(JSON.parse(text));
  } catch (e) {
    console.error("[/api/menu] error:", e);
    res.status(500).json({ error: "No se pudo leer el menú" });
  }
});

app.get("/data", async (_req, res) => {
  try {
    const b = typeof getBase === "function" ? getBase() : base;
    if (!b) return res.status(503).json({ error: "Airtable no inicializado" });

    const tableName = process.env.AIRTABLE_TABLE_USERS || "Users";
    const recs = await b(tableName).select({}).all();
    res.json(recs.map(r => r.fields));
  } catch (err) {
    console.error("[/data] Airtable error:", err);
    if (process.env.NODE_ENV !== "production") {
      return res.status(500).json({ error: err?.message || String(err) });
    }
    res.status(500).json({ error: "Error consultando Airtable" });
  }
});

app.get("/__air", async (_req, res) => {
  try {
    // usa getBase() si tu inicialización está en airtable.js
    const b = typeof getBase === "function" ? getBase() : base;
    if (!b) throw new Error("Airtable no inicializado (revisa AIRTABLE_API_KEY y AIRTABLE_BASE_ID)");

    const tableName = process.env.AIRTABLE_TABLE_USERS || "Users"; // ajusta si tu tabla se llama distinto
    const records = await b(tableName).select({ maxRecords: 3 /*, view: "Grid view"*/ }).firstPage();

    res.json({
      ok: true,
      table: tableName,
      count: records.length,
      sample: records.map(r => ({ id: r.id, fields: r.fields }))
    });
  } catch (e) {
    console.error("[__air] error:", e);
    res.status(500).json({
      ok: false,
      message: e?.message || String(e),
      code: e?.statusCode,
    });
  }
});

app.post("/api/chat", (req, res) => {
  const { message } = req.body || {};
  if (!message) {
    return res.json({
      reply: "Cuéntame qué te gusta: carnes, pescados, vegetariano o sin gluten.",
    });
  }
  res.json({
    reply:
      "Gracias. Puedo recomendarte entradas sin lácteos o platos principales sin gluten. ¿Prefieres carnes o marinos?",
  });
});

app.use((err, _req, res, _next) => {
  console.error("[Unhandled]", err?.stack || err);
  res.status(500).json({ error: "Internal error" });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT} (${isProd ? "prod" : "dev"})`);
});
