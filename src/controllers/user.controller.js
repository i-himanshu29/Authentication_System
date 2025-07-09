import { User } from "../models/user.model.js";

import { successResponse, errorResponse } from "../utils/apiResponse.util.js";
import { blacklistAccessToken, verifyCredentials } from "../utils/auth.util.js";
import { config, parseTimeString } from "../config/env.config.js";
import {
   extractTokenFromRequest,
   generateAccessToken,
   generateRefreshToken,
   generateSecureToken,
} from "../utils/token.util.js";
import {
   sendForgotPasswordEmail,
   sendVerificationEmail,
} from "../utils/mail.util.js";
import {
   enforceDeviceLimit,
   formatSessionsData,
   getDeviceInfo,
   updateExistingSession,
} from "../utils/session.util.js";
import { RefreshToken } from "../models/refreshToken.model.js";
import {
   getAccessTokenCookieOptions,
   getCookieClearingOptionsV5,
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
      const emailSent = await sendVerificationEmail(user.email, token);

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
         Date.now() + config.jwt.refreshToken.expiresIn,
      );

      const sessionUpdated = await updateExistingSession(
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

const refreshToken = async (req, res) => {
   try {
      // 1.Get the refresh token from the req cookie
      const tokenFromCookie = req.cookies.refreshToken;
      if (!tokenFromCookie) {
         return errorResponse(res, 401, "No refresh token found");
      }

      // 2.Find the refresh token in DB
      const refreshTokenDoc = await RefreshToken.findOne({
         token: tokenFromCookie,
      });

      if (!refreshTokenDoc) {
         return errorResponse(res, 401, "Invalid refresh token");
      }

      // 3.Verify expiration time
      if (new Date() > refreshTokenDoc.expiresAt) {
         await RefreshToken.deleteOne({ _id: refreshTokenDoc._id });
         return errorResponse(res, 401, "Refresh token has expired");
      }

      // 4.Find the user based on the refresh token
      const user = await User.findById(refreshTokenDoc.user);
      if (!user) {
         return errorResponse(res, 404, "User not found");
      }

      // 5.Generate a new refresh token
      const newRefreshToken = generateRefreshToken(user._id);

      // 6.update refresh token in DB
      refreshTokenDoc.token = newRefreshToken;
      refreshTokenDoc.lastUsed = new Date();
      refreshTokenDoc.ipAddress = req.ip || req.connection.remoteAddress;

      // 7.token expiration time
      const refreshExpiry = new Date(
         Date.now() + config.jwt.refreshToken.expiresIn,
      );
      refreshTokenDoc.expiresAt = refreshExpiry;

      await refreshTokenDoc.save();

      // 8.Generate a new access token
      const accessToken = generateAccessToken(user._id);

      // 9.Set new tokens in the response cookies
      res.cookie("accessToken", accessToken, getAccessTokenCookieOptions());

      res.cookie(
         "refreshToken",
         newRefreshToken,
         getRefreshTokenCookieOptions(refreshExpiry),
      );

      return successResponse(res, 200, "Token refreshed successfully");
   } catch (error) {
      return errorResponse(
         res,
         500,
         "Error refreshing access token",
         error.message,
      );
   }
};

const getUserProfile = async (req, res) => {
   try {
      // 1.req.user is set in the protect middleware after verifying
      const user = await User.findById(req.user._id);

      // 2.return the user data in the res
      return successResponse(res, 200, "User profile", {
         user: user.toPublicJSON(),
      });
   } catch (error) {
      return errorResponse(
         res,
         500,
         "Error retrieving user profile",
         error.message,
      );
   }
};

const forgotPassword = async (req, res) => {
   try {
      // 1.Get user email from the req body
      const { email } = req.body;

      if (!email) {
         return errorResponse(res, 400, "Email is required");
      }

      // 2.Find user based on email
      const user = await User.findOne({ email });
      if (!user) {
         return errorResponse(res, 401, "No user found with this email");
      }

      //3. Create a reset token for the user
      const token = generateSecureToken();
      user.passwordResetToken = token;
      user.passwordResetTokenExpiry = Date.now() + parseTimeString("10");

      await user.save();

      // 4.send password reset email
      const emailSent = await sendForgotPasswordEmail(user.email, token);
      if (!emailSent) {
         console.log("Verification email cound not be sent");
      }

      return successResponse(
         res,
         200,
         emailSent
            ? "Password reset email sent and Please check your email"
            : "Password reset email could not be sent",
      );
   } catch (error) {
      return errorResponse(res, 500, "Error resetting password", error.message);
   }
};

const resetPassword = async (req, res) => {
   try {
      // 1.get reset token from the req param
      const { token } = req.params;
      if (!token) {
         return errorResponse(res, 400, "Reset token is required");
      }

      // 2.Find user based on the reset token
      const user = await User.findOne({
         passwordResetToken: token,
         passwordResetTokenExpiry: { $gt: Date.now() },
      });

      if (!user) {
         return errorResponse(res, 400, "Invalid or expired reset token");
      }

      // 3. Get new password from the req body
      const { password } = req.body;
      if (!password) {
         return errorResponse(res, 400, "New password is required");
      }

      //4.update the user password
      user.password = password;

      //5.clear the reset token fields
      user.passwordResetToken = undefined;
      user.passwordResetTokenExpiry = undefined;
      await user.save();

      return successResponse(
         res,
         200,
         "Password reset successful. Please login with your new password",
      );
   } catch (error) {
      return errorResponse(res, 500, "Error resetting password", error.message);
   }
};

const logoutUser = async (req, res) => {
   try {
      //1.Get tokens
      const accessToken =
         req.cookies.accessToken || extractTokenFromRequest(req);
      const refreshToken = req.cookies.refreshToken;

      //2.Handle refresh token - remove it from the DB
      if (refreshToken) {
         await RefreshToken.deleteOne({ token: refreshToken });
      }

      //3.Using auth utils to Blacklist the access token
      if (accessToken) {
         await blacklistAccessToken(accessToken);
      }

      //4.Clear the cookie regardless of the token verification status
      res.clearCookie("accessToken", getCookieClearingOptionsV5());

      res.clearCookie("refreshToken", getCookieClearingOptionsV5());
      return successResponse(res, 500, "Logout failed", error.message);
   } catch (error) {
      return errorResponse(res, 500, "Logout failed", error.message);
   }
};

const getActiveSessions = async (req, res) => {
   try {
      //Find all active sessions based on the user id
      const sessions = await RefreshToken.find({ user: req.user._id }).sort({
         lastUsed: -1,
      });

      // Use session utils to format the session data
      const currentToken = req.cookies.refreshToken;
      const formattedSessions = formatSessionsData(sessions, currentToken);

      return successResponse(res, 200, "Active sessions retrieved", {
         sessions: formattedSessions,
      });
   } catch (error) {
      return errorResponse(
         res,
         500,
         "Error retrieving active sessions",
         error.message,
      );
   }
};

const logoutAllOtherDevices = async (req, res) => {
   try {
      //1.get current device refresh token
      const currentToken = req.cookies.refreshToken;

      if (!currentToken) {
         return errorResponse(res, 400, "No refresh token found");
      }

      // Revoke all other sessions expect the current session
      const deletedSessions = await RefreshToken.deleteMany({
         user: req.user._id,
         token: { $ne: currentToken },
      });

      return successResponse(
         res,
         200,
         "Logout from all other devices successful",
         { deletedSessions: deletedSessions.deletedCount },
      );
   } catch (error) {
      return errorResponse(
         res,
         500,
         "Error logging out from other devices",
         error.message,
      );
   }
};

const terminateSession = async (req, res) => {
   try {
      //get session id from the request params
      const { sessionId } = req.params;

      if (!sessionId) {
         return errorResponse(res, 400, "Session id is required");
      }

      //Find the session based on the id
      const session = await RefreshToken.findOne({
         _id: sessionId,
         user: req.user._id,
      });

      if (!session) {
         return errorResponse(res, 404, "Session not found");
      }

      // Check if trying to teminate the current session
      if (session.token === req.cookies.refreshToken) {
         // logout current session
         return logoutUser(req, res);
      }

      // Terminate the session
      await RefreshToken.deleteOne({ _id: sessionId });

      return successResponse(res, 200, "Session terminated successfully");
   } catch (error) {
      return errorResponse(
         res,
         500,
         "Error terminating session",
         error.message,
      );
   }
};

export {
   registerUser,
   verifyUser,
   loginUser,
   refreshToken,
   getUserProfile,
   forgotPassword,
   resetPassword,
   logoutUser,
   getActiveSessions,
   logoutAllOtherDevices,
   terminateSession,
};
