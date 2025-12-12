import express from 'express';
import { addExpense, getAllExpenses, getExpenseById, updateExpense,deleteExpense } from '../controllers/expenseController.js';
// import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// إضافة مصروف جديد
router.post('/addExpense', addExpense);

// عرض كل المصروفات
router.get('/getAllExpenses', getAllExpenses);

//عرض مصروف محدد
router.get('/expense/:id', getExpenseById);

// تعديل مصروف محدد
router.put('/updateExpense/:id', updateExpense);

// حذف مصروف مع ترحيل عكسي
router.delete('/deleteExpense/:id', deleteExpense);

export default router;
