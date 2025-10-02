import nodemailer from "nodemailer";
import dotenv from 'dotenv'
dotenv.config()

// Setup mail transporter (example: Gmail, ideally use SendGrid/Mailgun in prod)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.APP_PASSWORD,
  },
});

export default transporter;
