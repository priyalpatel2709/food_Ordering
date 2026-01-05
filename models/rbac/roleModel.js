const mongoose = require("mongoose");
const { Schema } = mongoose;

const roleSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        // Null for Global Roles (Super Admin), Set for Tenant Roles
        restaurantId: {
            type: String, // String to match existing userModel, ideally ObjectId
            index: true,
            default: null
        },
        permissions: [
            {
                type: Schema.Types.ObjectId,
                ref: "Permission",
            },
        ],
        isSystem: {
            type: Boolean,
            default: false,
            // System roles cannot be deleted
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// Compound index to ensure Role Name is unique PER Restaurant, but allows duplicates across restaurants
// System roles (restaurantId: null) should also be unique among themselves
roleSchema.index({ name: 1, restaurantId: 1 }, { unique: true });

const getRoleModel = (connection) => {
    return connection.model("Role", roleSchema);
};

module.exports = getRoleModel;
