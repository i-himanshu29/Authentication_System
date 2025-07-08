import mongoose, { Schema } from "mongoose";

const refreshTokenSchema = new Schema(
   {
      token: {
         type: String,
         required: true,
         unique: true,
      },
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      deviceInfo: {
         type: String,
         required: true,
      },
      isAddress: {
         type: String,
         default: "Unknown",
      },
      issuedAt: {
         type: Date,
         default: Date.now,
         required: true,
      },
      lastUsed: {
         type: Date,
         required: true,
      },
      expiresAt: {
         type: Date,
         required: true,
      },
   },
   { timestamps: true },
);

// Indexes for faster lookups and auto-deletion of expired tokens
refreshTokenSchema.index({ user: 1, deviceInfo: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); //0 sec to delete expires token
export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
