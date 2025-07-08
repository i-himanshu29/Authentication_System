import { Router } from "express";
import { registerUser, verifyUser ,loginUser } from "../controllers/user.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { loginValidation, registerValidation } from "../middlewares/validation.middleware.js";

const router = Router();

/**
 * @Publicroutes - No authentication required
 */

router.post("/register",registerValidation, registerUser);
router.get("/verify/:token",verifyUser);
router.post("/login", loginValidation, loginUser);

export default router;