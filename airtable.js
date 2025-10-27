// airtable.js
import dotenv from "dotenv";
dotenv.config(); // por si alguien lo importa antes que server.js
import Airtable from "airtable";

let _base = null;

function initBase() {
  if (_base) return _base;
  const key = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!key || !baseId) {
    console.warn("[Airtable] Faltan AIRTABLE_API_KEY/TOKEN o AIRTABLE_BASE_ID");
    return null;
  }
  _base = new Airtable({ apiKey: key }).base(baseId);
  return _base;
}

export function getBase() {
  return initBase(); // null si falta config
}

/* ===========================
 * Users
 * =========================== */
export function usersTable() {
  const base = initBase();
  if (!base) return null;
  const tableName = process.env.AIRTABLE_TABLE_USERS || "Users";
  return base(tableName);
}

export async function findUserByPhone(phone) {
  const table = usersTable();
  if (!table) throw new Error("Airtable no inicializado");
  const res = await table
    .select({ filterByFormula: `{Phone} = '${phone}'`, maxRecords: 1 })
    .firstPage();
  return res[0] || null;
}

export async function findUserById(recordId) {
  const table = usersTable();
  if (!table) throw new Error("Airtable no inicializado");
  try {
    const rec = await table.find(recordId);
    return rec || null;
  } catch {
    return null;
  }
}

export async function createUser({ name, phone, passwordHash, role = "user" }) {
  const table = usersTable();
  if (!table) throw new Error("Airtable no inicializado");
  const recs = await table.create([
    { fields: { Name: name, Phone: phone, PasswordHash: passwordHash, Role: role } },
  ]);
  return recs[0];
}

export async function updatePreferences(recordId, { likes = [], dislikes = [], allergies = [] }) {
  const table = usersTable();
  if (!table) throw new Error("Airtable no inicializado");
  const norm = (arr) =>
    Array.isArray(arr) ? arr.filter(Boolean).map((v) => String(v).trim()).filter(Boolean) : [];
  const recs = await table.update([{
    id: recordId,
    fields: { Likes: norm(likes), Dislikes: norm(dislikes), Allergies: norm(allergies) },
  }]);
  return recs[0];
}

export async function updatePasswordHash(recordId, passwordHash) {
  const table = usersTable();
  if (!table) throw new Error("Airtable no inicializado");
  const recs = await table.update([{ id: recordId, fields: { PasswordHash: passwordHash } }]);
  return recs[0];
}

export function userRecordToJSON(rec) {
  if (!rec) return null;
  return {
    id: rec.id,
    name: rec.get("Name") || "",
    phone: rec.get("Phone") || "",
    role: rec.get("Role") || "user",
    likes: rec.get("Likes") || [],
    dislikes: rec.get("Dislikes") || [],
    allergies: rec.get("Allergies") || [],
  };
}

/* ===========================
 * Platillos
 * =========================== */
export function dishesTable() {
  const base = initBase();
  if (!base) return null;
  const tableName = process.env.AIRTABLE_TABLE_DISHES || "Platillos";
  return base(tableName);
}

export async function createDish(fields) {
  const table = dishesTable();
  if (!table) throw new Error("Airtable no inicializado");
  const [rec] = await table.create([{ fields }]); // Image (attachments) permitido
  return rec;
}

export async function updateDish(id, fields) {
  const table = dishesTable();
  if (!table) throw new Error("Airtable no inicializado");
  const [rec] = await table.update([{ id, fields }]);
  return rec;
}

export async function deleteDish(id) {
  const table = dishesTable();
  if (!table) throw new Error("Airtable no inicializado");
  const [rec] = await table.destroy([id]);
  return rec;
}

export async function getDishById(id) {
  const table = dishesTable();
  if (!table) throw new Error("Airtable no inicializado");
  return await table.find(id);
}

/**
 * Lista platillos con filtros:
 * - category: exacto (Entrada, Plato principal, Postre, Bebida)
 * - tag: exacto (Light, Sin gluten, Sin lactosa, Picante, Vegetariano)
 * - available: "true" | "false"
 * - q: búsqueda básica por Name/Description (case-insensitive)
 */
export async function listDishes({ category, tag, available, q, limit = 50 } = {}) {
  const table = dishesTable();
  if (!table) throw new Error("Airtable no inicializado");

  const parts = [];
  if (category) parts.push(`{Category} = '${category}'`);
  if (tag)      parts.push(`FIND('${tag}', ARRAYJOIN({Tags}, ','))`);
  if (available === "true")  parts.push(`{Available} = 1`);
  if (available === "false") parts.push(`{Available} = 0`);
  if (q) {
    const safe = String(q).replace(/'/g, "\\'");
    parts.push(`OR(FIND(LOWER('${safe}'), LOWER({Name}))>0, FIND(LOWER('${safe}'), LOWER({Description}))>0)`);
  }
  const filterByFormula = parts.length ? `AND(${parts.join(",")})` : undefined;

  const records = await table.select({
    filterByFormula,
    pageSize: Math.min(Number(limit) || 50, 100),
    // view: "Grid view"
  }).all();

  return records;
}
