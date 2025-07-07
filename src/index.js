import express from "express";
import dotenv from "dotenv";



const app = express();
const port = process.env.PORT || 8000

dotenv.config({
   path: "./.env",
});
app.get("/", (req, res) => {
   res.send("Welcome to Authentication System");
});

app.listen(port, () => {
   console.log(`server is running on port ${port}`);
});
