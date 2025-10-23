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

export function usersTable() {
  const base = initBase();
  if (!base) return null;
  const tableName = process.env.AIRTABLE_TABLE_USERS || "Users";
  return base(tableName);
}

// ---------- helpers ----------
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
  const recs = await table.update([{ id: recordId, fields: {
    Likes: norm(likes), Dislikes: norm(dislikes), Allergies: norm(allergies),
  }}]);
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
