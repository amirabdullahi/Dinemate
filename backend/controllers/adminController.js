import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Resturant from "../models/resturants.js";
import Activity from "../models/activity.js";
import generatePassword from "../utils/password.js";
import transporter from '../utils/transporter.js';
import User from "../models/user.js";

dotenv.config();

class AdminController  {
    // Admin login
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(404).json({ message: "Email and password required to login" });
            }

            const isValid = (email === process.env.ADMIN_EMAIL) && (password === process.env.ADMIN_PASSWORD);

            if (!isValid) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            const token = jwt.sign({ admin: process.env.ADMIN_PASSWORD }, process.env.JWT_SECRET, { expiresIn: "1d" });

            res.json({ message: "Login successful", token});
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }

    async logout(_, res) {
        try {
            res.clearCookie("token");
    
            // log activity
            const activityLog = new Activity({
                user: "admin",
                activity: "Logout",
            });
            await activityLog.save();
    
            res.status(200).json({ message: "Logout successful" });
        } catch (error) {
            res.status(500).json({ message: "An error occurred during logout" });
        }
    }

    async getResturants(_, res) {
        try {
            const resturants = await Resturant.find();

            const newActivity = new Activity({ 
                user: "admin", activity: "Get Resturants for approval" 
            });
            await newActivity.save();

            res.json(resturants);
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }

    async approveResturant(req, res) {
        try {
            const { resturantId } = req.params;
            const { status } = req.body;

            const newPassword = generatePassword();

            const resturant = await Resturant.findById(resturantId);
            if (!resturant) {
            return res.status(404).json({ message: "Restaurant not found" });
            }

            resturant.password = newPassword;
            resturant.approvalStatus = status;

            // Send email notification
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: resturant.resturantEmail,
                subject: `Restaurant ${status === 'accepted' ? 'Approval' : 'Status Update'} - ${resturant.resturantName}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Restaurant Status Update</title>
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h2 style="color: ${status === 'accepted' ? '#28a745' : '#dc3545'}; margin-top: 0;">
                                Restaurant ${status === 'accepted' ? 'Approved!' : 'Status Update'}
                            </h2>
                        </div>
                        
                        <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                            <p>Dear <strong>${resturant.resturantName}</strong> Team,</p>
                            
                            ${status === 'accepted' ? `
                                <p>🎉 Congratulations! We're excited to inform you that your restaurant has been <strong style="color: #28a745;">approved</strong> to join our reservation platform.</p>
                                
                                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                                    <h3 style="color: #155724; margin-top: 0;">Your Login Credentials:</h3>
                                    <p style="margin: 5px 0;"><strong>Email:</strong> ${resturant.resturantEmail}</p>
                                    <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #f8f9fa; padding: 2px 6px; border-radius: 3px; color: #e83e8c;">${newPassword}</code></p>
                                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #856404;">
                                        ⚠ <strong>Important:</strong> Please change this password after your first login for security purposes.
                                    </p>
                                </div>
                                
                                <h3 style="color: #007bff;">Next Steps:</h3>
                                <ol style="padding-left: 20px;">
                                    <li>Log into your restaurant dashboard using the credentials above</li>
                                    <li>Complete your restaurant profile and upload menu items</li>
                                    <li>Set your availability and reservation preferences</li>
                                    <li>Start accepting reservations!</li>
                                </ol>
                                
                                <div style="background-color: #cce7ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
                                    <p style="margin: 0;"><strong>Need Help?</strong> Our support team is here to assist you with the onboarding process. Contact us at <a href="mailto:support@yourplatform.com">support@yourplatform.com</a></p>
                                </div>
                            ` : `
                                <p>We want to inform you that your restaurant application status has been updated to: <strong style="color: #dc3545;">${status}</strong>.</p>
                                
                                ${status === 'declined' ? `
                                    <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                                        <p style="margin: 0;">We appreciate your interest in joining our platform. If you have any questions about this decision or would like to reapply in the future, please don't hesitate to contact our support team.</p>
                                    </div>
                                ` : ''}
                            `}
                            
                            <p>Thank you for your interest in partnering with us.</p>
                            
                            <p>Best regards,<br>
                            <strong>The [Your Platform Name] Team</strong></p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>© 2024 Dinemate. All rights reserved.</p>
                        </div>
                    </body>
                    </html>
                `,
                text: `
                    Hello ${resturant.resturantName},

                    ${status === 'accepted' ? 
                        `Your restaurant has been APPROVED! 🎉

                        Login Credentials:
                        Email: ${resturant.resturantEmail}
                        Password: ${newPassword}
                        
                        Please change this password after login.
                        Next: Log in and complete your profile.` :
                        
                        `Your resturant status: ${status.toUpperCase()}`
                    }

                    Questions? Contact support@dinemate.com

                    Best regards,
                    Dinemate
                `
            });

            await resturant.save();

            const newActivity = new Activity({
                user: "Admin", 
                activity: `Restaurant ${resturant.resturantName} was ${status}`
            });
            await newActivity.save();

            res.json({ message: `Restaurant ${status}`, resturant });
        } catch (error) {
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }

    async getActivities(_, res) {
        try {
            const activities = await Activity.find()
                .sort({ date: -1 }) // -1 = descending order (most recent first)
                .limit(10); 

            return res.status(200).json({
                success: true,
                count: activities.length,
                data: activities
            });
        } catch (error) {
            console.error("Error fetching activities:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch activities",
                error: error.message
            });
        }
    }

    async getAllUsers(_, res) {
        try {
            const users = await User.find().select("-password"); // don’t send password

            res.status(200).json({
                success: true,
                count: users.length,
                data: users
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch users",
                error: error.message
            });
        }
    }

    async deleteUser(req, res) {
        try {
            const { userId } = req.params;

            const user = await User.findByIdAndDelete(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // Log activity
            const activityLog = new Activity({
                user: "Admin",
                activity: `Deleted user ${user.firstname} ${user.lastname}`
            });
            await activityLog.save();

            res.status(200).json({ success: true, message: "User deleted successfully" });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to delete user",
                error: error.message
            });
        }
    }

    async getUser(req, res) {
        try {
            const { userId } = req.params;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            res.status(200).json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error fetching user", error: error.message });
        }
    }

    async editUserDetails(req, res) {
        try {
            const { userId } = req.params;
            const updates = req.body;

            const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const activityLog = new Activity({
                user: "Admin",
                activity: `Edited user details for ${user.firstname} ${user.lastname}`
            });
            await activityLog.save();

            res.status(200).json({
                success: true,
                message: "User details updated successfully",
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to update user details",
                error: error.message
            });
        }
    }
}

export default new AdminController();
