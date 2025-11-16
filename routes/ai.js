// routes/ai.js
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import fetch from "node-fetch";
import { ENV } from "../config/env.js";

const r = Router();
const N8N_CHAT_URL = ENV.N8N_CHAT_URL;

r.post(
  "/chat",
  asyncHandler(async (req, res) => {
    if (!N8N_CHAT_URL) {
      console.error("[AI] N8N_CHAT_URL no configurada");
      return res.status(500).json({ error: "N8N_CHAT_URL no configurada" });
    }

    // 🔹 Payload que mandas a n8n (puedes ajustarlo según lo que use tu workflow)
    const payload = {
      // mensaje del usuario (antes lo llamabas query)
      query: req.body?.query || "",

      // info del usuario (teléfono, id de airtable, preferencias, etc. si la tienes)
      user: req.body?.user || null,

      // menú o lista de platillos que quieras mandar al workflow
      menu: req.body?.menu || [],
    };

    try {
      const resp = await fetch(N8N_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await resp.text(); // leemos texto primero
      console.log("[AI] Respuesta n8n status:", resp.status);
      console.log("[AI] Respuesta n8n raw:", raw);

      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.error("[AI] No se pudo parsear JSON desde n8n:", e);
      }

      if (!resp.ok || !data) {
        console.error("[AI] n8n devolvió error o respuesta inválida:", resp.status, data || raw);
        return res
          .status(500)
          .json({ error: "Error en el bot (n8n) al procesar la solicitud" });
      }

      // 🔹 Normalizamos la respuesta al esquema BotResponse
      const bot = typeof data === "object" && data !== null ? data : {};

      const botResponse = {
        status: bot.status || "ok",
        message: bot.message || "No tengo respuesta ahora.",
        recommendations: Array.isArray(bot.recommendations)
          ? bot.recommendations
          : [],
        excludedDishes: Array.isArray(bot.excludedDishes)
          ? bot.excludedDishes
          : [],
        followUpQuestion:
          bot.followUpQuestion === undefined ? null : bot.followUpQuestion,
        endConversation:
          typeof bot.endConversation === "boolean"
            ? bot.endConversation
            : false,
      };

      return res.json({
        answer: botResponse.message, // para el chat actual
        ...botResponse,              // nuevo esquema completo
      });
    } catch (e) {
      console.error("[AI] Error llamando a n8n:", e);
      return res
        .status(500)
        .json({ error: "No se pudo contactar al bot (n8n)" });
    }
  })
);

export default r;
