import express from "express";
import userRouter from "./routes/userRoute";
import dotenv from "dotenv";

import connectDB from "./config/db";

dotenv.config();
const app = express();

// Connect to MongoDB
connectDB();

// Default route
app.get("/", (req, res) => {
  res.send("hello");
});

// Middleware to use the userRouter
app.use("/api/users", userRouter);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
