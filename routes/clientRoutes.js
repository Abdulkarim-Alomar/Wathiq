import express from 'express';
import { registerClient, loginClient, logoutClient } from '../controllers/clientController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { uploadClientImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/register', uploadClientImage.single('profile'), registerClient);
router.post('/login', loginClient);
router.post('/logout', verifyToken, logoutClient); // تسجيل الخروج يتطلب توكن صالح

export default router;
