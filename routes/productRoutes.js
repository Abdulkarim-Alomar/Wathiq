import express from 'express';
import { addProduct, getAllProducts, getProductById ,updateProduct, deleteProduct } from '../controllers/productController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// إنشاء مادة جديدة
router.post('/addProduct', addProduct);

// عرض جميع المواد
router.get('/getAllProducts', getAllProducts);

router.get('/product/:id', getProductById);

// تعديل مادة
router.put('/updateProduct/:id', updateProduct);

// حذف مادة
router.delete('/deleteProduct/:id', deleteProduct);

export default router;
