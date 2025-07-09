import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { BlacklistedToken } from "../models/blacklistedTokens.model.js";
import { extractTokenFromRequest } from "../utils/token.util.js";
import { config } from "../config/env.config.js";

const protect = async (req, res, next) => {
   try {
      // 1.Extract the data from cookie , then fallback to headers
      const token = req.cookies.accessToken || extractTokenFromRequest(req);

      if (!token) {
         return res.status(401).json({
            success: false,
            message: "Not authorized to access this route",
         });
      }

      // check if the token is blacklisted
      const isBlacklisted = await BlacklistedToken.fndOne({ token });
      if (isBlacklisted) {
         return res.status(401).json({
            success: false,
            message: "Session expired, Please login again",
         });
      }

      try {
         // 2.verify the token
         const decoded = jwt.verify(token, config.jwt.accessToken.secret);

         // Step 3: Check if the user exists in the database
         const user = await User.findById(decoded.id);

         if (!user) {
            return res.status(404).json({
               success: false,
               message: "No user found with this id",
            });
         }

         req.user = user;
         next();
      } catch (error) {
         return res.status(401).json({
            success: false,
            message: "Not authorized to access this route",
         });
      }
   } catch (error) {
      return res.status(500).json({
         success: false,
         message: "Internal server error",
      });
   }
};

// middleware to restrict access to certain routes based on user roles

const authorize = (...roles) => {
   return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
         return res.status(403).json({
            success: false,
            message: `User role ${req.user.role} is not authorized to access this route`,
         });
      }
      next();
   };
};

export { protect, authorize };
