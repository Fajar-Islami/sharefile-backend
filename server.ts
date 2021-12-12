import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";
import { v2 as cloudinary } from "cloudinary";
import morgan from "morgan";

import fileRoutes from "./routes/file";

const app = express();
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_API_CLOUD,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

connectDB();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get(
  "/",
  (req: Request, res: Response): Response =>
    res.status(200).json({ message: "Helo there" })
);
app.use("/api/files", fileRoutes);

const PORT = process.env.PORT;

app.listen(PORT, () => console.log(`Server is listening on PORT ${PORT}`));
