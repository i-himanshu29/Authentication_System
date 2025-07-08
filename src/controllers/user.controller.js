import { User } from "../models/user.model.js";

import { successResponse, errorResponse } from "../utils/apiResponse.util.js";

import { config, parseTimeString } from "../config/env.config.js";
import { generateSecureToken } from "../utils/token.util.js";
import { sendVerifcationEmail } from "../utils/mail.util.js";

const registerUser = async (req, res) => {
   try {
      // Step-1: Get the user data from req body
      const { name, email, password } = req.body;

      //Step-2 Validate user input data - also there are librabies like zod , yup and express-validator
      if (!name || !email || !password) {
         return errorResponse(res, 400, "All Fields are required");
      }

      // Step-3 Check if the user already exists in the database
      const existingUser = await User.findOne({ email });
      if (existingUser) {
         return errorResponse(res, 409, "User already exists with this email");
      }

      //4.Create a new user in the DB
      const user = await User.create({
         name,
         email,
         password,
         isVerified: false,
      });

      if (!user) {
         return errorResponse(res, 500, "User registration failed");
      }

      // create a verification token for the user
      const token = generateSecureToken();
      console.log("Verification token:", token);
      user.verificationToken = token;

      // verification token expiry time
      user.verificationTokenExpiry = Date.now() + parseTimeString("10m");
      await user.save();

      //send Verification email
      const emailSent = await sendVerifcationEmail(user.email, token);

      if (!emailSent) {
         console.warn("Verification email could not be sent");
      }

      console.log("User created successfully: ", user);

      //5.Return the user data in the response
      return successResponse(
         res,
         201,
         emailSent
            ? "User registerd successfully , Please check your email to verify your account"
            : "User registered successfully, but verification email could not be sent",
         { user: user.toPublicJSON() },
      );
   } catch (error) {
      return errorResponse(res, 500, "Registration failed", error.message);
   }
};

export { registerUser };
