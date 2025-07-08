import mongoose from "mongoose";
import { config } from "./env.config.js";

const dbConnect = async () => {
   try {
      await mongoose.connect(config.mongodb.uri);
      console.log(`✅MongoDB connected successfully`);
   } catch (error) {
      console.log("❌Error connecting to MongoDB:", error.message);
      process.exit(1);
   }
};

export default dbConnect;
