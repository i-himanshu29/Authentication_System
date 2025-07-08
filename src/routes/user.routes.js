import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { registerValidation } from "../middlewares/validation.middleware.js";

const router = Router();

/**
 * @Publicroutes - No authentication required
 */

router.post("/register",registerValidation, registerUser);

export default router;