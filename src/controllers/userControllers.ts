import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  res.send("hello form TS");
});
