// utils/jwt.js
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export function signJwt(payload, opts = {}) {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES, ...opts });
}

export function verifyJwt(token) {
  return jwt.verify(token, ENV.JWT_SECRET);
}
