import express from 'express';
import {
  addAdjustment,
  getAllAdjustments,
  getAdjustmentsByEmployee,
  getAdjustmentById,
  updateAdjustment,
  deleteAdjustment
} from '../controllers/employeeAdjustmentsController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
// import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// 🟢 إنشاء تعديل جديد (زيادة / خصم)
router.post('/createAdjustment', addAdjustment);

// 🔹 عرض جميع التعديلات
router.get('/getAllAdjustments', getAllAdjustments);

// 🔹 عرض تعديلات موظف معين
router.get('/adjustments/:employee_id', getAdjustmentsByEmployee);

// 🔹 جلب تعديل واحد حسب ID
router.get('/adjustment/:id', getAdjustmentById);


// 🟡 تعديل تعديل سابق
router.put('/updateAdjustment/:id', updateAdjustment);

// 🔴 حذف تعديل
router.delete('/deleteAdjustment/:id', deleteAdjustment);

export default router;
