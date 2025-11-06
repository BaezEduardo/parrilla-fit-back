// db.js
import Airtable from "airtable";
import { ENV } from "./config/env.js";

/**
 * Airtable setup
 */
const base = new Airtable({ apiKey: ENV.AIRTABLE_API_KEY }).base(ENV.AIRTABLE_BASE_ID);
const usersTable = () => base(ENV.T_USERS || "Users");
const dishesTable = () => base(ENV.T_DISHES || "Platillos");

/**
 * Helpers
 */
const escapeFormulaString = (s = "") => String(s).replace(/'/g, "\\'"); // para filterByFormula

// ---- Users mappers (Airtable -> App)
function mapUserRecord(r) {
  const f = r?.fields || {};
  return {
    id: r.id,
    name: f.Name ?? null,
    phone: f.Phone ?? null,
    passwordHash: f.PasswordHash ?? null,
    role: f.Role ?? "user",
    // 👇 Preferencias (asume que en Airtable son campos de tipo multi-select o array)
    likes: Array.isArray(f.Likes) ? f.Likes : [],
    dislikes: Array.isArray(f.Dislikes) ? f.Dislikes : [],
    allergies: Array.isArray(f.Allergies) ? f.Allergies : [],
  };
}

// ---- Users mappers (App -> Airtable)
function toUserAirtableFields({ name, phone, passwordHash, role, Likes, Dislikes, Allergies, likes, dislikes, allergies }) {
  const out = {};
  if (name !== undefined) out.Name = name;
  if (phone !== undefined) out.Phone = phone;
  if (passwordHash !== undefined) out.PasswordHash = passwordHash;
  if (role !== undefined) out.Role = role;

  // 👇 Permite pasar con mayúscula o minúscula desde el código
  if (Likes !== undefined) out.Likes = Likes;
  if (Dislikes !== undefined) out.Dislikes = Dislikes;
  if (Allergies !== undefined) out.Allergies = Allergies;
  if (likes !== undefined) out.Likes = likes;
  if (dislikes !== undefined) out.Dislikes = dislikes;
  if (allergies !== undefined) out.Allergies = allergies;

  return out;
}


// ---- Dishes mappers (Airtable -> App)
// Campos sugeridos en Airtable: Name, Description, Price, Calories, ImageUrl, Available, Category
// ---- Dishes mappers (Airtable -> App)
// Campos en Airtable: Name, Description, Price, Calories, Image (attachments), Available, Category
function mapDishRecord(r) {
  const f = r?.fields || {};
  const atts = Array.isArray(f.Image) ? f.Image : [];
  const first = atts[0] || null;

  const imageUrl = first?.thumbnails?.large?.url || first?.url || null;

  return {
    id: r.id,
    name: f.Name ?? null,
    description: f.Description ?? null,
    price: f.Price ?? null,
    available: !!f.Available,
    category: f.Category ?? null,
    image: atts,     // arreglo original (por si lo necesitas)
    imageUrl,        // ← string listo para <img src=...>
  };
}

// ---- Dishes mappers (App -> Airtable)
function toDishAirtableFields(fields = {}) {
  const out = {};
  if (fields.name !== undefined) out.Name = fields.name;
  if (fields.description !== undefined) out.Description = fields.description;
  if (fields.price !== undefined) out.Price = fields.price;
  if (fields.available !== undefined) out.Available = fields.available;
  if (fields.category !== undefined) out.Category = fields.category;

  // 👇 Soporta dos formas de setear imagen:
  // a) arreglo de attachments completo
  if (fields.image !== undefined) out.Image = fields.image;
  // b) URL directa (Airtable acepta [{ url }])
  if (fields.imageUrl) out.Image = [{ url: fields.imageUrl }];

  return out;
}

/* ===========================
   USERS
=========================== */

export async function dbGetUserById(id) {
  const r = await usersTable().find(id);
  return mapUserRecord(r);
}

export async function dbGetUserByPhone(phone) {
  // OJO: usar el nombre capitalizado del campo en Airtable => {Phone}
  const phoneSafe = escapeFormulaString(phone);
  const rs = await usersTable()
    .select({ filterByFormula: `{Phone} = '${phoneSafe}'`, maxRecords: 1 })
    .firstPage();
  return rs[0] ? mapUserRecord(rs[0]) : null;
}

export async function dbCreateUser({ name, phone, passwordHash, role = "user" }) {
  const r = await usersTable().create(toUserAirtableFields({ name, phone, passwordHash, role }));
  return mapUserRecord(r);
}

export async function dbUpdateUser(id, fields) {
  const r = await usersTable().update(id, toUserAirtableFields(fields));
  return mapUserRecord(r);
}

export async function dbDeleteUser(id) {
  await usersTable().destroy(id);
  return true;
}

export async function dbListUsers() {
  const rs = await usersTable().select().all();
  return rs.map(mapUserRecord);
}

/* ===========================
   DISHES (Platillos)
=========================== */

export async function dbListDishes() {
  const rs = await dishesTable()
    .select({
      fields: ["Name", "Description", "Price", "Available", "Category", "Image"], // 👈 incluye Image
    })
    .all();
  return rs.map(mapDishRecord);
}

export async function dbGetDishById(id) {
  const r = await dishesTable().find(id);
  return mapDishRecord(r);
}

export async function dbCreateDish(fields) {
  const r = await dishesTable().create(toDishAirtableFields(fields));
  return mapDishRecord(r);
}

export async function dbUpdateDish(id, fields) {
  const r = await dishesTable().update(id, toDishAirtableFields(fields));
  return mapDishRecord(r);
}

export async function dbDeleteDish(id) {
  await dishesTable().destroy(id);
  return true;
}
