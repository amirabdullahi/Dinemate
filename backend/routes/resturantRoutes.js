import { Router } from 'express';
import resturantController from '../controllers/resturantController.js';
import authenticate from '../middleware/resturantautenticate.js';
import authController from '../controllers/authController.js';
import resturantAnalyticsController from '../controllers/resturantAnalyticsController.js';

const router = Router();

router.post('/register', resturantController.register);
router.post('/login', resturantController.login);
router.delete('/logout', authenticate.verifyToken, resturantController.logout);

router.post('/updateprofile', authenticate.verifyToken, resturantController.updateProfile);
router.get('/reservations', authenticate.verifyToken, resturantController.getReservationsForResturant);
router.post('/reservationstatus', authenticate.verifyToken, resturantController.updateReservationStatus);

router.post('/additem', authenticate.verifyToken, resturantController.addItem);
router.post('/edititem/:itemId', authenticate.verifyToken, resturantController.editItem);
router.get('/viewMenu', authenticate.verifyToken, resturantController.viewMenu);
router.get('/viewMenu/:itemId', authenticate.verifyToken, resturantController.viewItem);
router.delete('/deleteitem/:itemId', authenticate.verifyToken, resturantController.deleteItem);

router.get('/sittingareas', authenticate.verifyToken, resturantController.getSittingAreas);
router.post('/sittingareas', authenticate.verifyToken, resturantController.addSittingArea);

router.post("/forgotpassword", authController.forgotPasswordResturant);
router.post("/resetpassword", authController.resetPasswordResturant);

router.get("/confirmedreservations", authenticate.verifyToken, resturantAnalyticsController.confirmedReservations);
router.get("/revenue", authenticate.verifyToken, resturantAnalyticsController.totalRevenue);
router.get("/averagespend", authenticate.verifyToken, resturantAnalyticsController.averageSpend );
router.get("/bookingfrequency", authenticate.verifyToken, resturantAnalyticsController.getBookingFrequency);
router.get("/peakhours", authenticate.verifyToken, resturantAnalyticsController.getPeakHours);
router.get("/no-show", authenticate.verifyToken, resturantAnalyticsController.noShowRate);
router.get("/peak-time", authenticate.verifyToken, resturantAnalyticsController.peakTimes);
router.get("/demographics", authenticate.verifyToken, resturantAnalyticsController.customerDemographics);
router.get("/popularitems", authenticate.verifyToken, resturantAnalyticsController.popularMenuItems);
router.get("/monthlyrevenue", authenticate.verifyToken, resturantAnalyticsController.getMonthlyRevenue);

export default router;
