import { User } from "../models/user.model.js";

import { successResponse, errorResponse } from "../utils/apiResponse.util.js";
import {verifyCredentials} from "../utils/auth.util.js"
import { config, parseTimeString } from "../config/env.config.js";
import {
   generateAccessToken,
   generateRefreshToken,
   generateSecureToken,
} from "../utils/token.util.js";
import { sendVerifcationEmail } from "../utils/mail.util.js";
import {
   enforceDeviceLimit,
   getDeviceInfo,
   updateExistingSession,
} from "../utils/session.util.js";
import { RefreshToken } from "../models/refreshToken.model.js";
import {
   getAccessTokenCookieOptions,
   getRefreshTokenCookieOptions,
} from "../utils/cookie.util.js";

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

const verifyUser = async (req, res) => {
   try {
      // 1.Get Verification token from the request params means from the url

      const { token } = req.params;

      if (!token) {
         return res.status(400).json({
            success: false,
            message: "Verification token is required",
         });
      }

      // 2.Find user based on token
      const user = await User.findOne({ verificationToken: token });
      if (!user) {
         return res.status(400).json({
            message: "Invalid verification token",
         });
      }

      // 3.Check if token has expired
      const currentTime = new Date();
      if (currentTime > user.verificationTokenExpiry) {
         return res.status(400).json({
            success: false,
            message: "Verification token has expired",
         });
      }

      // 4.Set isVerified field true if verified
      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpiry = undefined;
      await user.save();

      // 5. return res
      return res.status(200).json({
         success: true,
         message: "Account verified successfully, you can now login",
      });
   } catch (error) {
      console.error("Verification failed", error);
      return res.stauts(500).json({
         success: false,
         message: "Verification failed. Please try again later",
      });
   }
};

const loginUser = async (req, res) => {
   try {
      // 1.get the data from the req body
      const { email, password } = req.body;

      // 2. verify credentials using auth utils
      const authResult = await verifyCredentials(email, password);
      if (!authResult.success) {
         return errorResponse(
            res,
            401,
            "Invalid credentials",
            authResult.message,
         );
      }

      if (authResult.notVerified) {
         return errorResponse(
            res,
            401,
            "Please verify your email before logging in",
         );
      }

      const { user } = authResult;

      // 3.Using token utils to generate tokens
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      //4.Using session utils to get device info
      const { deviceInfo, ipAddress } = getDeviceInfo(req);

      const refreshExpiry = new Date(
         Date.now() + config.jwt.refreshToken.expiresIn
       );

      const sessionUpdated= await updateExistingSession(
         user._id,
         deviceInfo,
         refreshToken,
         ipAddress,
         refreshExpiry,
      );

      if (!sessionUpdated) {
         await enforceDeviceLimit(user._id, 2);
         await RefreshToken.create({
            token: refreshToken,
            user: user._id,
            deviceInfo,
            ipAddress,
            issuedAt: new Date(),
            lastUsed: new Date(),
            expiresAt: refreshExpiry,
         });
      }
      // 5.using cookie utils to set cookies
      res.cookie("accessToken", accessToken, getAccessTokenCookieOptions());
      res.cookie(
         "refreshToken",
         refreshToken,
         getRefreshTokenCookieOptions(refreshExpiry),
      );
      // 6.return the user data in response
      return successResponse(res, 200, "User logged in successfully", {
         user: user.toPublicJSON(),
      });
   } catch (error) {
      return errorResponse(res, 500, "Login failed.", error.message);
   }
};
export { registerUser, verifyUser ,loginUser };
