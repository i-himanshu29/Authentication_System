import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "./config/env.config.js";


// import routes
// import authRouter from "./routes";

const app = express();

app.use(cookieParser());
app.use(express.static("public"));
app.use(express.json());
app.use(
   express.urlencoded({
      extended: true,
   }),
);

app.use(
   cors({
      origin: config.urls.frontend,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
   }),
);

// app.use("/api/v1/auth", authRouter);

export default app;
