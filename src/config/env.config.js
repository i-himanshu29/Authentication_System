import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
   "MONGODB_URI",

   "EMAIL_HOST",
   "EMAIL_PORT",
   "SMTP_USER",
   "SMTP_PASS",
   "MAILTRAP_SENDEREMAIL",
];

const optionalEnvVars = {
   PORT: 8000,
   NODE_ENV: "development",
   BASE_URL: "http://localhost:8000",
   FRONTEND_URL: "http://localhost:3000",
   EMAIL_SECURE: false,
};

// Validate environment variables
for (const key of requiredEnvVars) {
   if (!process.env[key]) {
      console.error(`Environment variables ${key} is missing.`);
      process.exit(1);
   }
}

// Set default value for optional environment variables
for (const [key, defaultValue] of Object.entries(optionalEnvVars)) {
   if (!process.env[key]) {
      process.env[key] = String(defaultValue);
   }
}

//parse time string like 10m , 1h , 5d to millisecond
const parseTimeString = (timeString) => {
   if (!timeString) return 0;
   if (typeof timeString === "number") return timeString;

   const match = String(timeString).match(/^(\d+)([smhd])$/);
   if (!match) return 0;

   const time = parseInt(match[1]);
   const unit = match[2];

   switch (unit) {
      case "s":
         return time * 1000;
      case "m":
         return time * 60 * 1000;
      case "h":
         return time * 60 * 60 * 1000;
      case "d":
         return time * 24 * 60 * 60 * 1000;
      default:
         return 0;
   }
};

const config = {
   env: process.env.MODE_ENV || "development",
   port: parseInt(process.env.PORT || "8000", 10),
   isProduction: process.env.NODE_ENV === "production",

   //MongoDB
   mongodb: {
      uri: process.env.MONGODB_URI,
   },

   // Email
   email: {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587", 10),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
         user: process.env.SMTP_USER,
         pass: process.env.SMTP_PASS,
      },
      senderEmail: process.env.MAILTRAP_SENDEREMAIL,
   },

   urls: {
      base: process.env.BASE_URL,
      frontend: process.env.FRONTEND_URL,
   },
};

export { config ,parseTimeString};
