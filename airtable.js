import dotenv from "dotenv";
dotenv.config();
import Airtable from "airtable";

let _base = null;

function initBase() {
  if (_base) return _base;
  const key = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!key || !baseId) {
    console.warn("[Airtable] Falta configuración");
    return null;
  }
  _base = new Airtable({ apiKey: key }).base(baseId);
  return _base;
}

export function getBase() {
  return initBase();
}

// Helpers
function normalizeRole(v) {
  const s = String(v || "user").trim().toLowerCase();
  return s === "admin" ? "admin" : "user";
}
function normalizePhone(p) {
  return String(p || "").replace(/\D+/g, "");
}

/* ==== Users ==== */
export function usersTable() {
  const b = initBase();
  if (!b) return null;
  const name = process.env.AIRTABLE_TABLE_USERS || "Users";
  return b(name);
}

export async function findUserByPhone(phone) {
  const t = usersTable();
  if (!t) throw new Error("Airtable no inicializado");
  const p = normalizePhone(phone);
  const res = await t.select({
    filterByFormula: `{Phone} = '${p}'`,
    maxRecords: 1,
  }).firstPage();
  return res[0] || null;
}

export async function findUserById(id) {
  const t = usersTable();
  if (!t) throw new Error("Airtable no inicializado");
  try {
    return await t.find(id);
  } catch {
    return null;
  }
}

export async function createUser({ name, phone, passwordHash, role = "user" }) {
  const t = usersTable();
  const recs = await t.create([{ fields: { Name: name, Phone: phone, PasswordHash: passwordHash, Role: role } }]);
  return recs[0];
}

export async function updatePasswordHash(id, hash) {
  const t = usersTable();
  const [rec] = await t.update([{ id, fields: { PasswordHash: hash } }]);
  return rec;
}

export async function updatePreferences(id, { likes = [], dislikes = [], allergies = [] }) {
  const t = usersTable();
  const norm = arr => Array.isArray(arr) ? arr.filter(Boolean).map(v => String(v).trim()) : [];
  const [rec] = await t.update([{ id, fields: { Likes: norm(likes), Dislikes: norm(dislikes), Allergies: norm(allergies) } }]);
  return rec;
}

export async function deleteUser(id) {
  const t = usersTable();
  await t.destroy([id]);
  return true;
}

export function userRecordToJSON(rec) {
  if (!rec) return null;
  return {
    id: rec.id,
    name: rec.get("Name") || "",
    phone: normalizePhone(rec.get("Phone")),
    role: normalizeRole(rec.get("Role")),
    likes: rec.get("Likes") || [],
    dislikes: rec.get("Dislikes") || [],
    allergies: rec.get("Allergies") || [],
  };
}

export function userAdminViewJSON(rec) {
  if (!rec) return null;
  return {
    id: rec.id,
    Name: rec.get("Name") || "",
    Phone: rec.get("Phone") || "",
    Role: normalizeRole(rec.get("Role")),
    Likes: rec.get("Likes") || [],
    Dislikes: rec.get("Dislikes") || [],
    Allergies: rec.get("Allergies") || [],
  };
}

export async function listUsers({ role, q, limit = 50 } = {}) {
  const t = usersTable();
  if (!t) throw new Error("Airtable no inicializado");
  const parts = [];
  if (role) parts.push(`{Role} = '${role}'`);
  if (q) {
    const safe = String(q).replace(/'/g, "\\'");
    parts.push(`OR(FIND(LOWER('${safe}'), LOWER({Name}))>0, FIND(LOWER('${safe}'), LOWER({Phone}))>0)`);
  }
  const filterByFormula = parts.length ? `AND(${parts.join(",")})` : undefined;
  return await t.select({ filterByFormula, pageSize: Math.min(Number(limit) || 50, 100) }).all();
}

/* ==== Dishes ==== */
export function dishesTable() {
  const b = initBase();
  if (!b) return null;
  const name = process.env.AIRTABLE_TABLE_DISHES || "Platillos";
  return b(name);
}

export async function createDish(fields) {
  const t = dishesTable();
  const [rec] = await t.create([{ fields }]);
  return rec;
}

export async function updateDish(id, fields) {
  const t = dishesTable();
  const [rec] = await t.update([{ id, fields }]);
  return rec;
}

export async function deleteDish(id) {
  const t = dishesTable();
  const [rec] = await t.destroy([id]);
  return rec;
}

export async function getDishById(id) {
  const t = dishesTable();
  return await t.find(id);
}

export async function listDishes({ category, tag, available, q, limit = 50 } = {}) {
  const t = dishesTable();
  const parts = [];
  if (category) parts.push(`{Category} = '${category}'`);
  if (tag) parts.push(`FIND('${tag}', ARRAYJOIN({Tags}, ','))`);
  if (available === "true") parts.push(`{Available} = 1`);
  if (available === "false") parts.push(`{Available} = 0`);
  if (q) {
    const safe = String(q).replace(/'/g, "\\'");
    parts.push(`OR(FIND(LOWER('${safe}'), LOWER({Name}))>0, FIND(LOWER('${safe}'), LOWER({Description}))>0)`);
  }
  const filterByFormula = parts.length ? `AND(${parts.join(",")})` : undefined;
  return await t.select({ filterByFormula, pageSize: Math.min(Number(limit) || 50, 100) }).all();
}

export { normalizeRole };
