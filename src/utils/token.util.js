import crypto from "crypto";
// import jwt from "jsonwebtoken";
// import { config } from "../config/env.config.js";

const generateSecureToken = (bytes = 32) => {
   return crypto.randomBytes(bytes).toString("hex");
};

const extractTokenFromRequest = (req) => {
   if (req.headers.authorization?.startsWith("Bearer")) {
      return req.headers.authorization.split(" ")[1];
   } else if (req.cookies?.accessToken) {
      return req.cookies.accessToken;
   } else if (req.cookies?.token) {
      // Legacy support
      return req.cookies.token;
   }
   return null;
};

export { generateSecureToken,extractTokenFromRequest };
