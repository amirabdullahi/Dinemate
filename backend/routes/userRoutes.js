import { Router } from "express";
import userController from "../controllers/userController.js";
import authenticate from "../middleware/authenticate.js";
import authController from "../controllers/authController.js";

const router = Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/updateprofile", authenticate.verifyToken, userController.updateProfile);
router.delete("/logout", authenticate.verifyToken, userController.logout);

router.get("/resturants", authenticate.verifyToken, userController.getApprovedResturants);
router.post("/confirmpay", authenticate.verifyToken, userController.confirmAndPay);
router.get("/mpesanumbers", authenticate.verifyToken, userController.getMpesaNumbers);
router.post("/recommendations", authenticate.verifyToken, userController.getRecommendations);
router.post("/addfavorite", authenticate.verifyToken, userController.addToFavourites);

router.get("/reservations", authenticate.verifyToken, userController.getReservations);
router.get("/reservation/:id", authenticate.verifyToken, userController.getReservation);
router.get("/getmenu/:resturantId", authenticate.verifyToken, userController.getMenuItems);

router.post("/forgotpassword", authController.forgotPasswordUser);
router.post("/resetpassword", authController.resetPasswordUser);

router.get("/profile", authenticate.verifyToken, userController.getProfile);
router.get("/resturant/:id", authenticate.verifyToken, userController.getResturant);
router.get("/sittingareas/:resturantId", authenticate.verifyToken, userController.getSittingAreas);

export default router;
