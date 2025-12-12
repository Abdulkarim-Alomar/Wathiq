import express from 'express';
import {
  createRevenue,
  getAllRevenues,
  getRevenueById,
  updateRevenue,
  deleteRevenue
} from '../controllers/revenueController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
// import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// 🟢 إنشاء إيراد جديد
router.post('/createRevenue', createRevenue);

// 🔹 عرض جميع الإيرادات
router.get('/getAllRevenues', getAllRevenues);

// 🔹 عرض إيراد معين
router.get('/revenue/:id', getRevenueById);

// 🟡 تعديل إيراد
router.put('/updateRevenue/:id', updateRevenue);

// 🔴 حذف إيراد
router.delete('/deleteRevenue/:id', deleteRevenue);

export default router;
