import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { addSalesInvoice, getAllInvoices, deleteSalesInvoice } from '../controllers/salesController.js';

const router = express.Router();

// إضافة فاتورة مبيع جديدة
router.post('/addSalesInvoice', verifyToken, addSalesInvoice);

// عرض جميع الفواتير
router.get('/getAllInvoices', verifyToken, getAllInvoices);

// حذف فاتورة مبيع مع ترحيل عكسي
router.delete('/deleteSalesInvoice/:id', verifyToken, deleteSalesInvoice);


export default router;
