const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true
        },
        description: {
            type: String,
            required: true,
        },
        module: {
            type: String,
            required: true,
            uppercase: true,
        },
        isSystem: {
            type: Boolean,
            default: false,
            immutable: true, // Cannot be changed once set
        },
    },
    { timestamps: true }
);

const getPermissionModel = (connection) => {
    return connection.model("Permission", permissionSchema);
};

module.exports = getPermissionModel;
