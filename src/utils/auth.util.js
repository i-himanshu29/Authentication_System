import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { BlacklistedToken } from "../models/blacklistedTokens.model.js";
import { config } from "../config/env.config.js";

const verifyCredentials = async (email, password) => {
   try {
      //validate input
      if (!email || !password) {
         return { success: false, message: "Email and password are required." };
      }

      //Find the user
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
         return { success: false, message: "Invalid credentials." };
      }

      // check password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
         return { success: false, message: "Invalid Credentials" };
      }

      // check account status
      if (!user.isVerified) {
         return {
            success: false,
            notVerified: true,
            message: "Email not verified",
         };
      }

      return { success: true, user };
   } catch (error) {
      console.error("Error verifying credentials:", error);
      return { success: false, message: "Email and password are required" };
   }
};

const blacklistAccessToken = async (accessToken) => {
   try {
      const decoded = jwt.verify(accessToken, config.jwt.accessToken.secret);

      //Add token to blacklist
      await BlacklistedToken.create({
         token: accessToken,
         user: decoded.id,
         expiresAt: decoded ? new Date(decoded.exp * 1000) : null,
      });
      return true;
   } catch (error) {
      console.error("Error blacklisting access token:", error);
      return false;
   }
};

export { verifyCredentials, blacklistAccessToken };
