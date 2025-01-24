import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/Ordering"
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
