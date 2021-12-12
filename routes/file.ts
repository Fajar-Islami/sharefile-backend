import express from "express";
import multer from "multer";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import File from "../models/file";
import nodemailer from "nodemailer";

import https from "https";
import createEmailTemplate from "../utils/createEmailTemplate";

const router = express.Router();

const storage = multer.diskStorage({});
let upload = multer({
  storage,
});

router.post("/upload", upload.single("myFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ messgae: "No file uploaded" });

    let uploadedFile: UploadApiResponse;

    try {
      uploadedFile = await cloudinary.uploader.upload(req.file.path, {
        folder: "sharemeFJR",
        resource_type: "auto", // bisa terima semua file
      });
    } catch (error) {
      return res.status(400).json({ message: "Cloudinary errror !!" });
    }
    const { originalname } = req.file;
    const { secure_url, bytes, format } = uploadedFile;

    const file = await File.create({
      filename: originalname,
      sizeInBytes: bytes,
      secure_url,
      format,
    });

    return res.status(201).json({
      id: file._id,
      downloadedPageLink: `${process.env.API_BASE_ENDPOINT_CLIENT}download/${file._id}`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server errror !!" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const file = await File.findById(id);

    if (!file) {
      return res.status(404).json({ message: "File does not exit" });
    }

    const { filename, format, sizeInBytes } = file;

    return res.status(200).json({
      name: filename,
      sizeInBytes,
      format,
      id,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

router.get("/:id/download", async (req, res) => {
  try {
    const id = req.params.id;
    const file = await File.findById(id);

    if (!file) {
      return res.status(404).json({ message: "File does not exit" });
    }

    // Get file from cloudinary
    https.get(file.secure_url, (fileStream) => {
      fileStream.pipe(res);
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

router.post("/email", async (req, res) => {
  // 1. Validate Request
  const { id, emailFrom, emailTo } = req.body;

  if (!id || !emailFrom || !emailTo)
    return res.status(400).json({ message: "Invalid data" });

  // 2. Check if the file exists
  const file = await File.findById(id);

  if (!file) {
    return res.status(404).json({ message: "File does not exit" });
  }

  // 3. create tranporter
  let transporter = nodemailer.createTransport({
    // @ts-ignore
    host: process.env.SENDINBLUE_SMTP_HOST!, // error gk jelas
    port: process.env.SENDINBLUE_SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SENDINBLUE_SMTP_USER, // generated ethereal user
      pass: process.env.SENDINBLUE_SMTP_PASSWORD, // generated ethereal password
    },
  });

  // 4. prepare the email data
  const { filename, sizeInBytes } = file;
  const fileSize = `${(Number(sizeInBytes) / (1024 * 1024)).toFixed(2)} MB`;
  const downloadedPageLink = `${process.env.API_BASE_ENDPOINT_CLIENT}download/${file._id}`;

  const mailOptions = {
    from: emailFrom, // sender address
    to: emailTo, // list of receivers
    subject: "HFile shared with you", // Subject line
    text: `${emailFrom} shared a file with you`, // plain text body
    html: createEmailTemplate(
      emailFrom,
      downloadedPageLink,
      filename,
      fileSize
    ), // html body
  };

  // 5. Send email using transporter
  transporter.sendMail(mailOptions, async (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).json({ message: "server error" });
    }

    file.sender = emailFrom;
    file.receiver = emailTo;

    await file.save();
    return res.status(200).json({
      message: "Email sent",
    });
  });

  // 6. save the data and send the response
});

export default router;
