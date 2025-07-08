import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs"; // for hash the password

const userSchema = new Schema(
   {
      name: {
         type: String,
         required: [true, "Name is required"],
      },
      email: {
         type: String,
         required: [true, "Email is required"],
         unique: true,
         lowercase: true,
         trim: true,
         match: [
            /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
            "Please enter a valid email",
         ],
      },
      password: {
         type: String,
         required: [true, "Password is required"],
         minlength: [6, "Password must be atleast 6 character"],
         select: false,// to hide password from response output
      },
      passwordResetToken: {
         type: String,
      },
      passwordResetTokenExpiry: {
         type: Date,
      },
      role: {
         type: String,
         enum: ["admin", "user"],
         default: "user",
      },
      isVerified: {
         type: Boolean,
         default: false,
      },
      verificationToken: {
         type: String,
      },
      verificationTokenExpiry: {
         type: Date,
      },
   },
   { timestamps: true },
);

userSchema.methods.toPublicJSON = function () {
   return {
      id: this._id,
      name: this.name,
      email: this.email,
      role: this.role,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
   };
};

//Hash the user password before saving the user to the database like pre-save middleware
userSchema.pre("save", async function (next) {
   if (!this.isModified("password")) {
      return next();
   }

   try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
   } catch (error) {
      next(error);
   }
});

export const User = mongoose.model("User", userSchema);
