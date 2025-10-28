// config/env.js
import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),

  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
  T_USERS: process.env.AIRTABLE_TABLE_USERS ?? "Users",
  T_DISHES: process.env.AIRTABLE_TABLE_DISHES ?? "Platillos",

  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret",
  JWT_EXPIRES: process.env.JWT_EXPIRES ?? "7d",
};
