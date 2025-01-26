const connectToDatabase = require("../config/db");

const identifyTenant = async (req, res, next) => {
  let restaurantsId =
    req.body.restaurantsId ||
    req.header("X-Restaurant-Id") ||
    req.query.restaurantsId;

  // Default to "Users" database if no restaurantsId is provided and base URL is "/user"
  if (!restaurantsId && req.baseUrl === "/api/v1/user") {
    restaurantsId = "Users";
  }

  // Check if both "Users" and another database need to be connected
  if (!restaurantsId) {
    return res.status(400).json({ message: "Restaurant ID is required" });
  }

  try {
    // Connect to the "Users" database
    req.usersDb = await connectToDatabase("Users");

    // Connect to the specified school database if restaurantsId is not "Users"
    if (restaurantsId !== "Users") {
      req.restaurantDb = await connectToDatabase(restaurantsId);
    }

    next();
  } catch (err) {
    res
      .status(500)
      .json({ message: "Database connection error", error: err.message });
  }
};

module.exports = identifyTenant;
