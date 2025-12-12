import express from 'express';
import { createFund, getAllFunds, getFundById, updateFund, deleteFund } from '../controllers/fundController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔹 إنشاء صندوق جديد (خاص بالمدير)
router.post('/createFund', createFund);

// 🔹 عرض كل الصناديق
router.get('/getAllFunds', getAllFunds);

// 🔹 عرض صندوق واحد حسب ID
router.get('/getFund/:id', getFundById);

// 🔹 تعديل صندوق
router.put('/updateFund/:id', updateFund);

// 🔹 حذف صندوق
router.delete('/deleteFund/:id', deleteFund);

export default router;
