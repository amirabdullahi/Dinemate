import { Router } from "express";
import adminController from "../controllers/adminController.js";
import authenticate from "../middleware/adminauthenticate.js";
import adminAnalyticsController from "../controllers/adminAnalyticsController.js";

const router = Router();

router.post("/login", adminController.login);
router.delete("/logout", adminController.logout);
router.get("/resturants", authenticate.verifyToken, adminController.getResturants);
router.get("/resturant/:resturantId", authenticate.verifyToken, adminController.getResturant);
router.post("/approve/:resturantId", authenticate.verifyToken, adminController.approveResturant);
router.get("/activities", authenticate.verifyToken, adminController.getActivities);

router.get("/users", authenticate.verifyToken, adminController.getAllUsers);
router.delete("/deleteuser/:userId", authenticate.verifyToken, adminController.deleteUser);
router.get("/user/:userId", authenticate.verifyToken, adminController.getUser);
router.post("/edituser/:userId", authenticate.verifyToken, adminController.editUserDetails);

router.get("/activeusers", authenticate.verifyToken, adminAnalyticsController.totalActiveUsers);
router.get("/registeredresturants", authenticate.verifyToken, adminAnalyticsController.registeredResturants);
router.get("/bookings", authenticate.verifyToken, adminAnalyticsController.totalReservations);
router.get("/revenuegenerated", authenticate.verifyToken, adminAnalyticsController.totalRevenueFromBookings);
router.get("/revenueprocessed", authenticate.verifyToken, adminAnalyticsController.totalRevenueFromPreOrders);
router.get("/usergrowth", authenticate.verifyToken, adminAnalyticsController.userGrowth);
router.get("/bookingsbyresturant", authenticate.verifyToken, adminAnalyticsController.totalReservationsByResturant);
router.get("/bookingsovertime", authenticate.verifyToken, adminAnalyticsController.bookingsOverTime);
router.get("/revenueovertime", authenticate.verifyToken, adminAnalyticsController.revenueOverTime);
router.get("/userdemographics", authenticate.verifyToken, adminAnalyticsController.userDemographics);

export default router;
