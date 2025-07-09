import { Router } from "express";
import {
   registerUser,
   verifyUser,
   loginUser,
   refreshToken,
   getUserProfile,
   forgotPassword,
   resetPassword,
   logoutUser,
   getActiveSessions,
   terminateSession,
   logoutAllOtherDevices,
} from "../controllers/user.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
   forgotPasswordValidation,
   loginValidation,
   registerValidation,
   resetPasswordValidation,
} from "../middlewares/validation.middleware.js";
import {
   apiLimiter,
   loginLimiter,
} from "../middlewares/rateLimiter.middleware.js";

const router = Router();

/**
 * @Publicroutes - No authentication required
 */

router.post("/register", registerValidation, apiLimiter, registerUser);
router.get("/verify/:token", verifyUser);
router.post("/login", loginValidation, loginLimiter, loginUser);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPasswordValidation, forgotPassword);
router.put("/reset-password/:token", resetPasswordValidation, resetPassword);

/**
 * @Protectedroutes - Authentication required
 */

router.get("/profile", protect, getUserProfile);
router.post("/logout", protect, logoutUser);
router.get("/sessions", protect, getActiveSessions);
router.post("/logout-all-devices", protect, logoutAllOtherDevices);
router.delete("/sessions/:sessionId", protect, terminateSession);
router.get("/admin", protect, authorize("admin"), (req, res) => {
   res.status(200).json({
      success: true,
      message: "Admin access granted",
      data: {
         user: req.user.toPublicJSON(),
      },
   });
});
export default router;
