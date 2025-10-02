import User from "../models/user.js";
import crypto from "crypto";
import transporter from "../utils/transporter.js";
import Resturant from "../models/resturants.js"

class AuthController {
    async forgotPasswordUser(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: "Email is required" });

            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ error: "User not found" });

            // Generate a reset token
            const token = crypto.randomBytes(20).toString("hex");

            // Set token and expiry (1 hour)
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
            await user.save();

            const resetUrl = `http://localhost:41841/resetpassword?token=${token}&route=user`;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Password Reset",
                text: `Hello ${user.name || ""},\n\nYou requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nIf you did not request this, ignore this email. The link expires in 1 hour.`
            };

            await transporter.sendMail(mailOptions);

            res.status(200).json({ message: "Password reset link sent to your email." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Something went wrong." });
        }
    }

    async resetPasswordUser(req, res) {
        try {
            const { token, newPassword } = req.body;

            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!user) return res.status(400).json({ error: "Invalid or expired token" });

            user.password = newPassword; // Will be hashed by pre-save hook
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            res.status(200).json({ message: "Password has been reset successfully." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Something went wrong." });
        }
    }

    async forgotPasswordResturant(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: "Email is required" });

            const user = await Resturant.findOne({ resturantEmail: email });
            if (!user) return res.status(404).json({ error: "Resturant not found" });

            // Generate a reset token
            const token = crypto.randomBytes(20).toString("hex");

            // Set token and expiry (1 hour)
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
            await user.save();

            const resetUrl = `http://localhost:41841/resetpassword?token=${token}&route=resturant`;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.resturantEmail,
                subject: "Password Reset",
                text: `Hello ${user.resturantName || ""},\n\nYou requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nIf you did not request this, ignore this email. The link expires in 1 hour.`
            };

            await transporter.sendMail(mailOptions);

            res.status(200).json({ message: "Password reset link sent to your email." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Something went wrong." });
        }
    }

    async resetPasswordResturant(req, res) {
        try {
            const { token, newPassword } = req.body;

            const user = await Resturant.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() }
            });

            if (!user) return res.status(400).json({ error: "Invalid or expired token" });

            user.password = newPassword; // Will be hashed by pre-save hook
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            res.status(200).json({ message: "Password has been reset successfully." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Something went wrong." });
        }
    }
}

export default new AuthController();
