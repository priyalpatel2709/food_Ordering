const mongoose = require("mongoose");
const colors = require("colors");
const { logger } = require("../helper/logger");

const connections = {};

const getDatabaseUri = (restaurantsId) => {
  const template = process.env.MONGO_URI;
  return template.replace("{restaurantsId}", restaurantsId);
};
// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     //   useCreateIndex: true,
//     });

//     console.log(`MongoDB Connected:`.underline.bgGreen);
//   } catch (error) {
//     logger.error(`Error Connect To MongoDb: ${error.message}`);
//     process.exit();
//   }
// };

const connectToDatabase = async (restaurantsId) => {
  if (connections[restaurantsId]) {
    return connections[restaurantsId];
  }

  const uri = `mongodb://localhost:27017/restaurant__${restaurantsId}`;
  // const connection = mongoose.createConnection(uri);

  const connection = mongoose.createConnection(getDatabaseUri(restaurantsId));
  
  console.log(`Connected to DB for restaurant ${restaurantsId}`.underline.bgGreen);
  connections[restaurantsId] = connection;
  return connection;
};

module.exports = connectToDatabase;
