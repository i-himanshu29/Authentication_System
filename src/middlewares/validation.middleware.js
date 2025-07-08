// Inout Validation Middleware (Prevent Injections Attacks)

// Validation middleware to check if the user input is valid before
// proceeding to the next step in the request processing pipeline.

import { body, param, validationResult } from "express-validator";

const validate = (req, res, next) => {
   const errors = validationResult(req);

   if (errors.isEmpty()) {
      return next();
   }

   const extractedErrors = [];
   errors.array().map((err) => extractedErrors.push({ [err.param]: err.msg }));

   return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: extractedErrors,
   });
};

//Registration validation rules
const registerValidation = [
   body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 3, max: 30 })
      .withMessage("Name must be between 3-30 characters")
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage("Name must contain only letters and spaces"),

   body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),

   body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/)
      .withMessage(
         "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
      ),

   validate,
];

// For login validation rules
const loginValidation = [
   body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email"),
   body("password").trim().notEmpty().withMessage("Password is required"),
   validate,
];

// Forgot password validation rules
const forgotPasswordValidation = [
   body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email"),
   validate,
];

//   For reset password validation rules
const resetPasswordValidation = [
   param("token").trim().notEmpty().withMessage("Reset token is required"),

   body("password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 character")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/)
      .withMessage(
         "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
      ),

   validate,
];

//For verification token validation
const verifyTokenValidation = [
   param("token")
      .trim()
      .notEmpty()
      .withMessage("Verification token is required"),

   validate,
];

// Session ID Validation
const sessionIdValidation = [
   param("sessionId")
      .trim()
      .notEmpty()
      .withMessage("Session ID is required")
      .isMongoId()
      .withMessage("Invalid session ID format"),

   validate,
];

export {
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    verifyTokenValidation,
    sessionIdValidation,
}