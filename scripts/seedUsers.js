const dotenv = require("dotenv");
dotenv.config();

const { connectToDatabase } = require("../config/db");
const {
    getPermissionModel,
    getRoleModel,
    getUserModel,
} = require("../models/index"); // Assuming index.js exports these
const { PERMISSIONS, MODULES } = require("../utils/permissions");

let userDB;

const connectDB = async () => {
    try {
        userDB = await connectToDatabase("Users");
        console.log("Connected to Users database successfully");
    } catch (error) {
        console.error("Failed to connect to databases:", error);
        process.exit(1);
    }
};

const seedUsers = async () => {
    try {
        const Permission = getPermissionModel(userDB);
        const Role = getRoleModel(userDB);
        const User = getUserModel(userDB);

        console.log("Seeding Permissions...");

        // 1. Seed Permissions (Global/System Level)
        const permissionDocs = [];

        // Iterate over all keys in PERMISSIONS object
        for (const [key, value] of Object.entries(PERMISSIONS)) {
            // Determine module from the permission string (e.g., "USER.CREATE" -> "USER")
            const module = value.split('.')[0];

            const perm = await Permission.findOneAndUpdate(
                { name: value },
                {
                    name: value,
                    description: `Permission to ${key.toLowerCase().replace('_', ' ')}`,
                    module: module,
                    restaurantId: "SYSTEM", // Required field, marked as SYSTEM
                    isSystem: true
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            permissionDocs.push(perm);
        }
        console.log(`Synced ${permissionDocs.length} permissions.`);

        const allPermissionIds = permissionDocs.map(p => p._id);

        // 2. Create Super Admin Role (Global)
        console.log("Seeding Super Admin Role...");
        const superAdminRole = await Role.findOneAndUpdate(
            { name: "Super Admin", restaurantId: "SYSTEM" }, // Using "SYSTEM" to be explicit, though null is default. consistent with permissions.
            {
                name: "Super Admin",
                description: "Global System Administrator with full access",
                restaurantId: "SYSTEM",
                permissions: allPermissionIds,
                isSystem: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 3. Create Super Admin User
        console.log("Seeding Super Admin User...");
        const superAdminEmail = "superadmin@admin.com";
        let superAdminUser = await User.findOne({ email: superAdminEmail });

        if (!superAdminUser) {
            superAdminUser = await User.create({
                name: "Global Super Admin",
                email: superAdminEmail,
                password: "password123", // Will be hashed by pre-save hook
                roleName: "Super Admin", // Legacy
                roles: [superAdminRole._id],
                restaurantId: "SYSTEM",
                isActive: true,
                isSystem: true,
                access: ["*"] // Full access wildcard if used
            });
            console.log(`Super Admin created: ${superAdminEmail} / password123`);
        } else {
            // Update existing if needed
            superAdminUser.roles = [superAdminRole._id];
            await superAdminUser.save();
            console.log(`Super Admin updated.`);
        }

        // 4. Create Restaurant Admin Role (for restaurant_123)
        console.log("Seeding Restaurant Admin Role...");
        const restaurantId = "restaurant_123";
        const restaurantAdminRole = await Role.findOneAndUpdate(
            { name: "Admin", restaurantId: restaurantId },
            {
                name: "Admin",
                description: "Restaurant Administrator with full access to this restaurant",
                restaurantId: restaurantId,
                permissions: allPermissionIds, // Giving all permissions as requested
                isSystem: false
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 5. Create Restaurant Admin User
        console.log("Seeding Restaurant Admin User...");
        const restaurantAdminEmail = "admin@tastybytes.com";
        let restaurantAdminUser = await User.findOne({ email: restaurantAdminEmail });

        if (!restaurantAdminUser) {
            restaurantAdminUser = await User.create({
                name: "Tasty Bytes Owner",
                email: restaurantAdminEmail,
                password: "password123",
                roleName: "Admin", // Legacy
                roles: [restaurantAdminRole._id],
                restaurantId: restaurantId,
                isActive: true,
                isSystem: false
            });
            console.log(`Restaurant Admin created: ${restaurantAdminEmail} / password123`);
        } else {
            restaurantAdminUser.roles = [restaurantAdminRole._id];
            await restaurantAdminUser.save();
            console.log(`Restaurant Admin updated.`);
        }

        console.log("User seeding completed successfully!");

    } catch (error) {
        console.error("Error seeding users:", error);
    } finally {
        if (userDB) {
            await userDB.close();
            console.log("Connection closed.");
        }
    }
};

const run = async () => {
    await connectDB();
    await seedUsers();
    process.exit(0);
};

run();
