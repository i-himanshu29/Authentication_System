import { Router } from "express";
import {
   registerUser,
   verifyUser,
   loginUser,
   refreshToken,
   getUserProfile,
   forgotPassword,
   resetPassword,
} from "../controllers/user.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
   forgotPasswordValidation,
   loginValidation,
   registerValidation,
   resetPasswordValidation,
} from "../middlewares/validation.middleware.js";

const router = Router();

/**
 * @Publicroutes - No authentication required
 */

router.post("/register", registerValidation, registerUser);
router.get("/verify/:token", verifyUser);
router.post("/login", loginValidation, loginUser);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password",forgotPasswordValidation,forgotPassword);
router.put("/reset-password/:token",resetPasswordValidation,resetPassword);

/**
 * @Protectedroutes - Authentication required
 */

router.get("/profile", protect, getUserProfile);
export default router;
