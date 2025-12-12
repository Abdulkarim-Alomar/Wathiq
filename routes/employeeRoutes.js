import express from 'express';
import { createEmployee, getAllEmployees, getEmployeeById, updateEmployee, deleteEmployee } from '../controllers/employeeController.js';
// import { verifyToken } from '../middleware/authMiddleware.js';
// import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// 🔒 إنشاء موظف جديد
router.post('/createEmployee', createEmployee);

// 🔹 عرض جميع الموظفين
router.get('/getEmployee', getAllEmployees);

// 🔹 عرض موظف محدد
router.get('/getEmployee/:id', getEmployeeById);

// 🔒 تعديل بيانات موظف
router.put('/editEmployee/:id', updateEmployee);

// 🔒 حذف موظف
router.delete('/deleteEmployee/:id', deleteEmployee);

export default router;
