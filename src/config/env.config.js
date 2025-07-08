import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["MONGODB_URI"];

const optionalEnvVars = {
   PORT: 8000,
   NODE_ENV: "development",
   BASE_URL: "http://localhost:8000",
   FRONTEND_URL:"http://localhost:3000",
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

const config = {
    env:process.env.MODE_ENV || "development",
    port:parseInt(process.env.PORT || "8000",10),
    isProduction:process.env.NODE_ENV === "production",

    //MongoDB
    mongodb:{
        uri:process.env.MONGODB_URI,
    },

    urls:{
        base:process.env.BASE_URL,
        frontend:process.env.FRONTEND_URL,
    }
}

export {config}