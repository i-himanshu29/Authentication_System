import express from "express";
import dbConnect from "./config/dbConnect.config.js";
import { config } from "./config/env.config.js";
import app from "./app.js";

const port = config.port;

//default route
app.get("/", (req, res) => {
   res.send("Welcome to Authentication System");
});

// connect to db
dbConnect();

//Healthcheck endpoint
app.get("/healthcheck", (req, res) => {
   res.status(200).json({
      status: "ok",
      message: "Server is running",
      environment: config.env,
      uptime: process.uptime(),
      timestamp: new Data(),
   });
});

//Global error handler
app.use((err, req, res, next) => {
   console.error(err);
   res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: config.env === "development" ? err.message : null,
   });
});

// 404 handler
app.use("*", (req, res) => {
   res.status(404).json({
      success: false,
      message: "Route not found",
   });
});

// start server
app.listen(port, () => {
   console.log(`Server is running on port ${port} in ${config.env} mode`);
});
