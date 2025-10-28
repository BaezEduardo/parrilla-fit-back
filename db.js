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
  };
}

// ---- Users mappers (App -> Airtable)
function toUserAirtableFields({ name, phone, passwordHash, role }) {
  const out = {};
  if (name !== undefined) out.Name = name;
  if (phone !== undefined) out.Phone = phone;
  if (passwordHash !== undefined) out.PasswordHash = passwordHash;
  if (role !== undefined) out.Role = role;
  return out;
}

// ---- Dishes mappers (Airtable -> App)
// Campos sugeridos en Airtable: Name, Description, Price, Calories, ImageUrl, Available, Category
function mapDishRecord(r) {
  const f = r?.fields || {};
  return {
    id: r.id,
    name: f.Name ?? null,
    description: f.Description ?? null,
    price: f.Price ?? null,
    calories: f.Calories ?? null,
    imageUrl: f.ImageUrl ?? null,
    available: f.Available ?? false,
    category: f.Category ?? null,
  };
}

// ---- Dishes mappers (App -> Airtable)
function toDishAirtableFields(fields = {}) {
  const out = {};
  if (fields.name !== undefined) out.Name = fields.name;
  if (fields.description !== undefined) out.Description = fields.description;
  if (fields.price !== undefined) out.Price = fields.price;
  if (fields.calories !== undefined) out.Calories = fields.calories;
  if (fields.imageUrl !== undefined) out.ImageUrl = fields.imageUrl;
  if (fields.available !== undefined) out.Available = fields.available;
  if (fields.category !== undefined) out.Category = fields.category;
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
  const rs = await dishesTable().select().all();
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
