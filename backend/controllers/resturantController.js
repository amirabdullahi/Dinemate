// controllers/resturantController.js
import Resturant from "../models/resturants.js";
import Activity from "../models/activity.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Reservation from "../models/reservations.js";
import Menu from "../models/menu.js";
import SittingArea from "../models/sittingArea.js";
import transporter from '../utils/transporter.js';
import mongoose from "mongoose";


class ResturantController {
  // Register a new restaurant
  async register(req, res) {
    try {
      const {
        resturantName,
        cuisineType,
        resturantAddress,
        resturantPhone,
        resturantEmail,
        businessOpenTime,
        businessCloseTime,
        mpesaNumber,
        resturantCapacity,
      } = req.body;

      const isExist = await Resturant.findOne({ resturantEmail });

      if (isExist) {
        return res.status(403).json({ message: "You have already registered. Please wait for approval" });
      }

      const resturant = new Resturant({
        resturantName,
        cuisineType,
        resturantAddress,
        resturantPhone,
        resturantEmail,
        businessOpenTime,
        businessCloseTime,
        mpesaNumber,
        resturantCapacity,
        initialCapacity: resturantCapacity
      });

      await resturant.save();

      const newActivity = new Activity({
        user: resturantName, 
        activity: "Resturant Registration"
      });
      await newActivity.save();

      res.status(201).json({ message: "Restaurant registered successfully", resturant });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Check if JWT_SECRET is configured
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ message: 'Server configuration error. Please contact administrator.' });
      }
      
      const resturant = await Resturant.findOne({ resturantEmail: email });

      if (!resturant) {
        return res.status(401).json({ message: "Invalid email" });
      }

      if (resturant.approvalStatus !== "accepted") {
        return res
          .status(403)
          .json({ message: "Restaurant not approved yet. Please wait for admin approval." });
      }

      const isPasswordValid = await bcrypt.compare(password, resturant.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      const token = jwt.sign(
        { resturantId: resturant._id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      const newActivity = new Activity({
        user: resturant.resturantName, 
        activity: "Resturant Logged In"
      });
      await newActivity.save();

      res.json({ message: "Login Successful", token });
    } catch (error) {
      console.error('Restaurant login error:', error);
      res.status(500).json({ message: "An error occurred during login. Please try again." });
    }
  }

  async logout(req, res) {
    try {
      const restaurant = await Resturant.findById(req.user.resturantId);

      if (!restaurant) {
        return res.status(404).json({ message: "Resturant not found" });
      }

      res.clearCookie("token");

      // log activity
      const activityLog = new Activity({
        user: `${restaurant.resturantName}`,
        activity: "Logout",
      });
      await activityLog.save();
      
      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      res.status(500).json({ message: "An error occurred during logout" });
    }
  }

  async updateProfile(req, res) {
    try {
      const { resturantId } = req.user; 
      const updates = req.body;

      const resturant = await Resturant.findByIdAndUpdate(
        resturantId,
        updates,
        { new: true, runValidators: true }
      );

      if (!resturant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const newActivity = new Activity({
        user: resturant.resturantName, 
        activity: "Updated profile"
      });
      await newActivity.save();

      res.json({ message: "Profile updated successfully", resturant });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  async getReservationsForResturant(req, res) {
      try {
        const { resturantId } = req.user;
        const { status } = req.query; // e.g. ?status=payed

        // Build query
        const query = { resturant: resturantId };
        if (status && status !== "all") {
          query.reservationStatus = status;
        }

        const reservations = await Reservation.find(query)
          .populate("user", "firstname lastname email phone phoneNumber")
          .populate("resturant", "resturantName");
  
        if (!reservations.length) {
          return res
            .status(404)
            .json({ message: "No reservations found for this restaurant" });
        }
  
        res.json(reservations);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
  }

  async updateReservationStatus(req, res) {
      try {
        const { newStatus, reservationId } = req.body;
        console.log(reservationId, newStatus);

        // Validate status
        const validStatuses = ["confirmed", "no-show"];
        if (!validStatuses.includes(newStatus)) {
          return res.status(400).json({ error: "Invalid status value" });
        }

        // Fetch reservation
        const reservation = await Reservation.findById(reservationId).populate('user');

        if (!reservation) {
          return res.status(404).json({ error: "Reservation not found" });
        }

        // Update status
        reservation.reservationStatus = newStatus;
        await reservation.save();

        res.status(200).json({
          message: "Reservation status updated successfully",
          reservation,
        });
      } catch (error) {
        console.error("Error updating reservation status:", error);
        res.status(500).json({ error: "Server error" });
      }
  }

  async addItem(req, res) {
    try {
        const { resturantId } = req.user;
        const { itemImage, itemDescription, itemPrice, itemType, ingredients } = req.body;

        // Validate restaurant
        const resturant = await Resturant.findById(resturantId);
        if (!resturant) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        const newItem = new Menu({
            resturant: resturantId,
            itemImage,
            itemDescription,
            itemPrice,
            itemType,
            ingredients
        });

        await newItem.save();

        return res.status(201).json({
            message: "Menu item added successfully",
            item: newItem
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error adding item",
            error: error.message
        });
    }
  }
  
  async editItem(req, res) {
    try {
        const { itemId } = req.params;
        const updates = req.body;

        const item = await Menu.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        Object.assign(item, updates); // apply updates dynamically
        await item.save();

        return res.status(200).json({
            message: "Menu item updated successfully",
            item
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error updating item",
            error: error.message
        });
    }
  }
  
  async viewMenu(req, res) {
    try {
        const { resturantId } = req.user;

        const items = await Menu.find({ resturant: resturantId }).sort({ itemType: 1 });

        return res.status(200).json({
            message: "Menu items fetched successfully",
            items
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching menu items",
            error: error.message
        });
    }
  }
  
  async viewItem(req, res) {
    try {
        const { itemId } = req.params;

        const item = await Menu.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        return res.status(200).json({
            message: "Menu item fetched successfully",
            item
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching item",
            error: error.message
        });
    }
  }

  async deleteItem(req, res) {
    try {
        const { itemId } = req.params;
        const item = await Menu.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }
        await Menu.findByIdAndDelete(itemId);
        return res.status(200).json({
            message: "Menu item deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching item",
            error: error.message
        });
    }
  }

  async getSittingAreas(req, res) {
    try {
        const { resturantId } = req.user;

        // Get both global sitting areas (restaurant: null) and restaurant-specific ones
        const sittingAreas = await SittingArea.find({
            $or: [
                { restaurant: null },  // Global sitting areas
                { restaurant: resturantId }  // Restaurant-specific sitting areas
            ],
            isActive: true
        }).sort({ price: 1 });

        return res.status(200).json({
            message: "Sitting areas fetched successfully",
            sittingAreas
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching sitting areas",
            error: error.message
        });
    }
  }

  async addSittingArea(req, res) {
    try {
        const { resturantId } = req.user;
        const { name, description, price, areaKey, iconType } = req.body;

        // Check if area key already exists for this restaurant
        const existingArea = await SittingArea.findOne({
            areaKey,
            $or: [
                { restaurant: resturantId },
                { restaurant: null }
            ]
        });

        if (existingArea) {
            return res.status(400).json({ message: "Sitting area with this key already exists" });
        }

        const newSittingArea = new SittingArea({
            name,
            description,
            price: price || 0,
            areaKey,
            iconType: iconType || 'table',
            restaurant: resturantId
        });

        await newSittingArea.save();

        return res.status(201).json({
            message: "Sitting area added successfully",
            sittingArea: newSittingArea
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error adding sitting area",
            error: error.message
        });
    }
  }

}

export default new ResturantController();
