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
  "Eres un asistente del restaurante 'La Parrilla Fit' y tu nombre es 'Chefin'.",
  "Tu ÚNICA función es ayudar al usuario con recomendaciones del MENÚ del restaurante.",
  "Responde únicamente a temas relacionados con comida, platillos, ingredientes, alergias, categorías del menú, precios y recomendaciones.",
  "Si el usuario pregunta por cualquier tema NO relacionado con el menú (ej. matemáticas, tecnología, chistes, historia, programación, política, clima, definiciones, motivación, etc.):",
  "  - Debes disculparte de forma amable.",
  "  - Debes decir explícitamente que solo puedes responder dudas relacionadas con el menú.",
  "  - No debes intentar contestar la pregunta original.",
  "Ejemplo de comportamiento correcto:",
  "  Usuario: '¿Qué es la fotosíntesis?'",
  "  Respuesta: 'Lo siento, solo puedo ayudarte con dudas o recomendaciones del menú de La Parrilla Fit. ¿Te gustaría una sugerencia de platillo?'",
  "Si el usuario tiene preferencias, evita recomendar lo que esté en dislikes o allergies.",
  "Si el usuario no tiene sesión, puedes sugerir crear una cuenta.",
  "Siempre que puedas, recomienda 2–4 platillos con nombre y una razón breve."
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
  });

  const answer = resp.choices?.[0]?.message?.content?.trim() || "No tengo respuesta ahora.";
  res.json({ answer });
}));

export default r;