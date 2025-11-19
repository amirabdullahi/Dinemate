import User from "../models/user.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import activity from "../models/activity.js";
import Resturant from "../models/resturants.js";
import Reservation from "../models/reservations.js";
import Recommendations from "../models/recommendations.js";
import Payment from "../models/payment.js";
import SittingArea from "../models/sittingArea.js";
import dotenv from 'dotenv';
import axios from "axios";
import generateConfirmationNumber from "../utils/confirmno.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from "mongoose";
import Menu from "../models/menu.js";
import transporter from '../utils/transporter.js';


dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- DARAJA API CONFIG ---
const DARAJA_BASE_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"; // sandbox for testing
const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY;
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET;
const DARAJA_PASSKEY = process.env.DARAJA_PASSKEY;
const DARAJA_SHORTCODE = process.env.DARAJA_SHORTCODE;

async function getDarajaToken() {
  try {
    if (!DARAJA_CONSUMER_KEY || !DARAJA_CONSUMER_SECRET) {
      throw new Error("M-Pesa credentials not configured");
    }
    
    const auth = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString("base64");

    const res = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );

    return res.data.access_token;
  } catch (err) {
    console.error("[getDarajaToken] Error:", err.response?.data || err.message);
    throw new Error("Failed to get M-Pesa access token");
  }
}

async function makePayment(reservation, phoneNumber) {
  try {
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (!DARAJA_SHORTCODE || !DARAJA_PASSKEY) {
      throw new Error("M-Pesa configuration incomplete");
    }

    // Validate and format phone number
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('+254')) {
      formattedPhone = '254' + phoneNumber.slice(4);
    } else if (phoneNumber.startsWith('0')) {
      formattedPhone = '254' + phoneNumber.slice(1);
    } else if (!phoneNumber.startsWith('254')) {
      formattedPhone = '254' + phoneNumber;
    }

    const token = await getDarajaToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const password = Buffer.from(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`).toString("base64");

    const payload = {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: 1,
      PartyA: formattedPhone,
      PartyB: DARAJA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: "https://mockbin.io/bin/create",
      AccountReference: reservation._id.toString(),
      TransactionDesc: "DineMate Reservation",
    };

    const stkResponse = await axios.post(DARAJA_BASE_URL, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payment = new Payment({
      user: reservation.user,
      reservation: reservation._id,
      paymentMethod: "Mpesa",
      payementStatus: "pending",
    });
    await payment.save();

    return {
      stkResponse: stkResponse.data,
      payment: payment
    }
  } catch (error) {
    console.error("[makePayment] Error:", error.response?.data || error.message);
    throw new Error("Payment processing failed");
  }
}

async function makeReservation(user, resturant, reqbody) {
  try {
    const now = new Date();

    // ✅ Reset restaurant capacity every 2 hours
    if ((now - resturant.lastReset) >= 2 * 60 * 60 * 1000) {
      await Resturant.findByIdAndUpdate(resturant._id, {
        resturantCapacity: resturant.initialCapacity,
        lastReset: now
      });
      // also update our in-memory object
      resturant.resturantCapacity = resturant.initialCapacity;
      resturant.lastReset = now;
    }

    // ✅ Check capacity before allowing booking
    if ((resturant.resturantCapacity === 0) || (resturant.resturantCapacity < reqbody.partySize)) {
      throw new Error("This restaurant is currently full. Try again in 2 hours");
    }

    // ✅ Create reservation
    const reservation = new Reservation({
      user: user._id,
      resturant: resturant._id,
      reservationDate: reqbody.reservationDate,
      reservationTime: reqbody.reservationTime,
      partySize: reqbody.partySize,
      sittingArea: reqbody.sittingArea || { areaKey: "main-area", name: "Main Area", price: 0 },
      preOrderedItems: reqbody.preOrderedItems || [],
      confirmationNumber: generateConfirmationNumber(),
      reservationStatus: "pending",
    });

    await reservation.save();

    // ✅ Log activity
    const activityLog = new activity({
      user: `${user.firstname} ${user.lastname}`,
      activity: `Made reservation at ${resturant.resturantName}`,
    });
    await activityLog.save();

    return reservation; // return to controller
  } catch (error) {
    throw error; // let controller handle the response
  }
}


class UserController {
  async register(req, res) {
    try {
        const { firstname, lastname, email, password, age, phoneNumber } = req.body;
        
        if (!firstname || !lastname || !email || !password || !age || !phoneNumber) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        const userExists = await User.find({ email });
        console.log(userExists);
        if (userExists && userExists.length > 0) {
          return res.status(400).json({ message: 'Please log in you already have an account' });
        }

        const user = new User({ firstname, lastname, email, password, age, phoneNumber });
        await user.save();

        const activitylog = new activity({
            user: firstname + lastname,
            activity: 'Registration'
        });
        await activitylog.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch(error) {
        res.status(500).json({ message: error.message });
    }
  }

  async login(req, res) {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        user.onlineStatus = true;
        await user.save();

        const activitylog = new activity({
            user: user.firstname + user.lastname,
            activity: 'Registration'
        });
        await activitylog.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

        res.status(201).json({ message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
  }

  async logout(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.onlineStatus = false;
      await user.save();

      // log activity
      const activityLog = new activity({
        user: `${user.firstname} ${user.lastname}`,
        activity: "Logout",
      });
      await activityLog.save();

      res.clearCookie("token");
      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      res.status(500).json({ message: "An error occurred during logout" });
    }
  }

  async updateProfile(req, res) {
    try {
      const { firstname, lastname, email, password } = req.body;
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.firstname = firstname || user.firstname;
      user.lastname = lastname || user.lastname;
      user.email = email || user.email;
      if (password) {
        user.password = password; // ensure bcrypt middleware in schema hashes this
      }
      await user.save();

      // log activity
      const activityLog = new activity({
        user: `${user.firstname} ${user.lastname}`,
        activity: "Profile Updated",
      });
      await activityLog.save();

      res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getApprovedResturants(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = "", 
        cuisine = "", 
        location = "" 
      } = req.query;

      // Convert to numbers
      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);

      // Build filter query
      const filter = { approvalStatus: "accepted" };

      // 🔍 Search (name, address, email)
      if (search) {
        filter.$or = [
          { resturantName: { $regex: search, $options: "i" } },
          { resturantAddress: { $regex: search, $options: "i" } },
          { resturantEmail: { $regex: search, $options: "i" } }
        ];
      }

      // 🍽️ Cuisine filter
      if (cuisine) {
        filter.cuisineType = { $regex: cuisine, $options: "i" };
      }

      // 📍 Location filter
      if (location) {
        filter.resturantAddress = { $regex: location, $options: "i" };
      }

      // Count total docs
      const total = await Resturant.countDocuments(filter);

      // Get paginated results
      const approvedResturants = await Resturant.find(filter)
        .select("resturantName cuisineType resturantAddress resturantEmail resturantImage")
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize);

      if (!approvedResturants.length) {
        return res.status(404).json({ message: "No approved restaurants available" });
      }

      // Save activity log
      const activitylog = new activity({
        user: "System",
        activity: "Fetched approved restaurants"
      });
      await activitylog.save();

      res.json({
        resturants: approvedResturants,
        currentPage: pageNumber,
        totalPages: Math.ceil(total / pageSize),
        totalResults: total
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  async getResturant(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const resturant = await Resturant.findById(req.params.id);
      if (!resturant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const menu = await Menu.find({resturant});
      res.json({
        resturant,
        menu,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  async confirmAndPay(req, res) {
    try {
      const { resturantId, reservationDate, reservationTime, phoneNumber, partySize } = req.body;
      
      if (!resturantId || !reservationDate || !reservationTime || !phoneNumber || !partySize) {
        return res.status(400).json({ 
          message: "Missing required fields" 
        });
      }
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const resturant = await Resturant.findById(req.body.resturantId);
      if (!resturant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      console.log("[confirmAndPay] Creating reservation for user:", user._id);
      const reservation = await makeReservation(user, resturant, req.body);
      console.log("[confirmAndPay] Reservation created:", reservation._id);
      
      const { stkResponse, payment } = await makePayment(reservation, req.body.phoneNumber);

      if (!user.mpesaNumbers.includes(req.body.phoneNumber)) {
        user.mpesaNumbers.push(req.body.phoneNumber);
        await user.save();
      }

      if (stkResponse && stkResponse.ResponseCode === "0") {
        reservation.reservationStatus = 'payed';
        await reservation.save();
        payment.payementStatus = 'confirmed';
        await payment.save();
      } else {
        payment.payementStatus = 'failed';
        await payment.save();
      }

      res.status(200).json({
        message: "Successfully processed reservation",
        reservation
      });
    } catch (error) {
      console.error("[confirmAndPay] Error occurred:", error.message);
      res.status(500).json({ 
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { 
          error: error.name,
          stack: error.stack 
        })
      });
    }
  }

  async getMpesaNumbers(req, res) {
    try {
      const userId = req.user.userId;
      
      // Find user by ID and select only mpesaNumbers field
      const user = await User.findById(userId).select('mpesaNumbers');
      
      if (!user) {
        return res.status(404).json({ 
          message: "User not found",
          success: false 
        });
      }

      // Return the M-Pesa numbers (empty array if none exist)
      res.status(200).json({
        message: "M-Pesa numbers retrieved successfully",
        success: true,
        mpesaNumbers: user.mpesaNumbers || [],
        count: user.mpesaNumbers?.length || 0
      });

    } catch (error) {
      console.error("[getMpesaNumbers] ERROR:", error);
      res.status(500).json({ 
        message: "Failed to retrieve M-Pesa numbers",
        success: false,
        error: error.message 
      });
    }
  }

  async getRecommendations(req, res) {
    try {
      const userId = req.user.userId;
      const { condition } = req.body; // condition = "basedOnFavourites" or "newToYou"
      console.log("➡️ Incoming request from user:", userId, "with condition:", condition);

      // Check if recommendation exists and is < 1 day old
      const existing = await Recommendations.findOne({ user: userId });
      console.log("🔍 Found existing recommendations:", existing ? existing._id : "None");

      if (existing) {
        const createdAt = new mongoose.Types.ObjectId(existing._id).getTimestamp();
        const now = new Date();
        const ageInHours = (now - createdAt) / (1000 * 60 * 60);
        console.log("⏳ Recommendation age (hours):", ageInHours);

        if (ageInHours < 24) {
          console.log("✅ Returning cached recommendations");
          return res.status(200).json({
            message: "Returning cached recommendations",
            recommendations: existing,
          });
        }

        console.log("🗑️ Cached recommendations expired, deleting...");
        await Recommendations.findByIdAndDelete(existing._id);
      }

      // Fetch all restaurants
      console.log("📡 Fetching approved restaurants...");
      const resturants = await Resturant.find({ approvalStatus: "accepted" });
      console.log("🍴 Restaurants fetched:", resturants.length);

       // Load user
      console.log('Loading user with ID:', userId);
      const user = await User.findById(userId).populate("favouriteResturants");
      console.log('User loaded:', user ? 'Found' : 'Not found');
      console.log('User favouriteResturants:', user?.favouriteResturants?.length || 0, 'items');

      // Step 1: Try direct favourites
      let favourites = user?.favouriteResturants || [];
      console.log('Step 1 - Direct favourites count:', favourites.length);

      // Step 2: If no favourites, fetch confirmed reservations
      if (!favourites.length) {
        console.log('Step 2 - No direct favourites found, fetching confirmed reservations...');
        
        const reservations = await Reservation.find({
          user: userId,
          reservationStatus: "payed" || "confirmed",
        }).populate("resturant");
        
        console.log('Found confirmed reservations:', reservations.length);
        
        favourites = reservations.map(r => r.resturant).filter(r => r); // get restaurant objects
        console.log('Restaurants from reservations:', favourites.length);
      } else {
        console.log('Step 2 - Skipped (using direct favourites)');
      }

      // Final fallback → empty array
      if (!favourites.length) {
        console.log('Final fallback - No favourites found, using empty array');
        favourites = [];
      } else {
        console.log('Final result - Total favourites:', favourites.length);
      }
      // Prepare prompt for Gemini
      const prompt = `
        You are a restaurant recommendation engine.
        The user has condition: ${condition}.
        Here is the full list of restaurants:
        ${JSON.stringify(resturants)}

        Here are the user's favourites (direct or from past reservations):
        ${JSON.stringify(favourites)}
        Instructions:
        - Return ONLY restaurant IDs in JSON.
        - Group them into "basedOnFavourites" and "newToYou".
        - "basedOnFavourites" must include restaurants with same cuisine type as user's favourites.
        - "newToYou" must include restaurants NOT in the user's favourites.
        - Ensure no restaurant appears in both arrays.

        Return only restaurant IDs in JSON grouped into "basedOnFavourites" and "newToYou".
      `;
      console.log("📝 Prompt prepared for Gemini:", prompt.substring(0, 500) + "...");

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);

      // Debug Gemini raw response
      const rawResponse = result.response.text();
      console.log("🤖 Gemini raw response:", rawResponse);

      // Clean response by stripping ```json or ``` wrappers
      const cleanedResponse = rawResponse.replace(/```json|```/g, "").trim();
      console.log("🧹 Cleaned response for parsing:", cleanedResponse);

      let parsed;
      try {
        parsed = JSON.parse(cleanedResponse);
        console.log("✅ Parsed Gemini response:", parsed);
      } catch (err) {
        console.error("❌ Failed to parse Gemini output", err);
        return res.status(500).json({ error: "Invalid AI response" });
      }

      // Save to MongoDB
      const recommendations = new Recommendations({
        user: userId,
        basedOnFavourites: parsed.basedOnFavourites || [],
        newToYou: parsed.newToYou || [],
      });

      await recommendations.save();
      console.log("💾 Recommendations saved with ID:", recommendations._id);

      res.status(201).json({
        message: "New recommendations generated",
        recommendations,
      });
    } catch (error) {
      console.error("🔥 Error generating recommendations:", error);
      res.status(500).json({ error: "Server error" });
    }
  }

  async addToFavourites(req, res) {
    try {
      const userId = req.user.userId; // Assumes you have auth middleware setting req.user
      const { resturantId } = req.body;

      // Validate restaurant ID
      if (!mongoose.Types.ObjectId.isValid(resturantId)) {
        return res.status(400).json({ error: "Invalid restaurant ID" });
      }

      // Check if restaurant exists
      const restaurant = await Resturant.findById(resturantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Fetch user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if already in favourites
      if (user.favouriteResturants.includes(resturantId)) {
        return res.status(400).json({ message: "Restaurant already in favourites" });
      }

      // Add to favourites
      user.favouriteResturants.push(resturantId);
      await user.save();

      // Return updated favourites
      const updatedUser = await User.findById(userId).populate("favouriteResturants");
      res.status(200).json({
        message: "Restaurant added to favourites",
        favouriteResturants: updatedUser.favouriteResturants,
      });
    } catch (error) {
      console.error("Error adding to favourites:", error);
      res.status(500).json({ error: "Server error" });
    }
  }

  async getReservations(req, res) {
      try {
        const userId = req.user.userId;
        const reservations = await Reservation.find({ user: userId })
          .populate("resturant", "resturantName resturantImage");
  
        if (!reservations.length) {
          return res
            .status(404)
            .json({ message: "No reservations found for this user" });
        }
  
        res.json(reservations);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
  }

  async getReservation(req, res) {
    try {
      const reservationId = req.params.id;
      const reservation = await Reservation.findById(reservationId)
        .populate("preOrderedItems", "itemName itemPrice")
        .populate("resturant", "resturantName resturantPhone");
  
      if (!reservation) {
        return res
            .status(404)
            .json({ message: "No reservations found for this user" });
      }

      res.json(reservation);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  async getMenuItems(req, res) {
    try {
      const resturantId = req.params.resturantId;
      const items = await Menu.find({ resturant: resturantId }).sort({ itemType: 1 });
      
      return res.status(200).json({
          message: "Menu items fetched successfully",
          items
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId).populate("favouriteResturants");
      res.status(200).json({
        message: "User profile fetched successfully",
        user
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }

  async getSittingAreas(req, res) {
    try {
        const { resturantId } = req.params;

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
}

export default new UserController();
