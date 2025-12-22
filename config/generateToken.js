const jwt = require("jsonwebtoken");

const generateToken = (id, restaurantId) => {
  return jwt.sign({ id, restaurantId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

module.exports = generateToken;
