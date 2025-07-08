import {User} from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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


export {verifyCredentials}