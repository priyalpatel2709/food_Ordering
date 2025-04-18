const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userModel = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    userImage: { type: String },
    email: { type: String, unique: true, required: true },

    password: { type: String },
    deviceToken: { type: String, default: "" },
    restaurantsId: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    age: { type: Number },
    address: [
      {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        zip: { type: String },
        country: { type: String },
        addressType: { type: String },
        coordinates: {
          lat: { type: Number },
          lng: { type: Number },
        },
      },
    ],
    roleName: { type: String },
    access: [{ type: String }],
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

userModel.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userModel.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next(); // Ensure next() is called after hashing
});

userModel.methods.matchDeviceToken = async function (deviceToken) {
  if (deviceToken === this.deviceToken) {
    return true;
  } else {
    this.deviceToken = deviceToken;
    await this.save();
    return false;
  }
};

userModel.methods.assignRole = async function (roleId) {
  try {
    this.role = roleId;
    await this.save();
    return true;
  } catch (error) {
    console.error("Error assigning role:", error.message);
    return false;
  }
};

const getUserModel = (connection) => {
  return connection.model("User", userModel);
};

module.exports = getUserModel;
