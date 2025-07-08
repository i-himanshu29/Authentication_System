import mongoose, { Schema } from "mongoose";

const blacklistedTokenSchema = new mongoose.Schema(
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
      expiresAt: {
         type: Date,
         required: true,
      },
   },
   { timestamps: true },
);

blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Set the token to expires after the expires date has passed (0 sec)

export const BlacklistedToken = mongoose.model(
   "BlacklistedToken",
   blacklistedTokenSchema,
);
