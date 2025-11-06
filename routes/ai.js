// routes/ai.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/authz.js"; // <- usaremos opcionalmente
import OpenAI from "openai";
import { ENV } from "../config/env.js";
import { dbGetUserById } from "../db.js";

const r = Router();
const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

// Utilidad: compone el prompt con o sin usuario
function buildSystemPrompt({ me, menu }) {
  const base = [
    "Eres un asistente para un restaurante llamado 'La Parrilla Fit'.",
    "Tu nombre es 'Chefin'.",
    "Responde en español, breve y claro. Usa viñetas cuando listes opciones.",
    "Si el usuario tiene preferencias, evita recomendar lo que esté en 'dislikes' o 'allergies'.",
    "Si el usuario no tiene sesión, puedes sugerir crear cuenta, pero de todos modos recomienda por ingredientes o restricciones solicitadas.",
    "Siempre que puedas, sugiere 2-4 platillos con nombre y una razón breve.",
  ];

  if (me) {
    base.push(
      `Preferencias del usuario:`,
      `- Likes: ${me.likes?.join(", ") || "—"}`,
      `- Dislikes: ${me.dislikes?.join(", ") || "—"}`,
      `- Alergias: ${me.allergies?.join(", ") || "—"}`
    );
  } else {
    base.push("El usuario no tiene sesión. No asumas preferencias personales.");
  }

  if (Array.isArray(menu) && menu.length) {
    base.push("Menú (resumen):");
    menu.slice(0, 30).forEach((d, i) => {
      const line = [
        `• ${d.name || "Platillo"}`
      ];
      if (d.price != null) line.push(`$${Number(d.price).toFixed(2)}`);
      if (d.cat) line.push(`(${d.cat})`);
      if (d.desc) line.push(`– ${String(d.desc).slice(0, 80)}`);
      base.push(line.join(" "));
    });
  }

  return base.join("\n");
}

// POST /ai/chat
r.post("/chat", asyncHandler(async (req, res) => {
  const { query, user, menu } = req.body || {};

  // Si viene cookie de sesión, prioriza datos frescos del usuario
  let me = null;
  if (req.user?.id) {
    const u = await dbGetUserById(req.user.id);
    me = {
      name: u.name,
      likes: u.likes || [],
      dislikes: u.dislikes || [],
      allergies: u.allergies || [],
    };
  } else if (user) {
    // fallback si lo manda el cliente (no confiable pero útil para el prompt)
    me = {
      name: user.name,
      likes: user.likes || [],
      dislikes: user.dislikes || [],
      allergies: user.allergies || [],
    };
  }

  const system = buildSystemPrompt({ me, menu });
  const messages = [
    { role: "system", content: system },
    { role: "user", content: String(query || "").slice(0, 2000) || "Recomiéndame algo" },
  ];

  // Llama a OpenAI (modelo a elección)
  const resp = await openai.chat.completions.create({
    model: "gpt-5-nano",
    messages,
    temperature: 0.7,
  });

  const answer = resp.choices?.[0]?.message?.content?.trim() || "No tengo respuesta ahora.";
  res.json({ answer });
}));

export default r;
