import express from 'express';
import { getAllAvailableProducts } from '../controllers/publicController.js';

const router = express.Router();

// عرض كل المواد المتاحة في المخزن (بدون تسجيل دخول)
router.get('/products', getAllAvailableProducts);

export default router;
