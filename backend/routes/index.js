import Router from 'express';
import UserRoutes from './userRoutes.js';
import AdminRoutes from './adminRoutes.js';
import ResturantRoutes from './resturantRoutes.js';

const router = Router();

router.use('/admin', AdminRoutes);
router.use('/user', UserRoutes);
router.use('/resturant', ResturantRoutes);

export default router;
