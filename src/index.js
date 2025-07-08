import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import dbConnect from "./config/dbConnect.config.js";
import { config } from "./config/env.config.js";
import cookieParser from "cookie-parser";

const app = express();
const port = config.port;

app.use(cookieParser());
app.use(express.json());
app.use(
   express.urlencoded({
      extended: true,
   }),
);

app.use(
   cors({
      origin: config.urls.frontned,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
   }),
);

dbConnect();
dotenv.config({
   path: "./.env",
});
app.get("/", (req, res) => {
   res.send("Welcome to Authentication System");
});

app.listen(port, () => {
   console.log(`Server is running on port ${port} in ${config.env} mode`);
});
