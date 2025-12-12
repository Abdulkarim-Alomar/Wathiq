import express from 'express';
import { createPartner, getAllPartners, getPartnerById, updatePartner, deletePartner } from '../controllers/partnerController.js';
// import { verifyToken } from '../middleware/authMiddleware.js';
// import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// 🟢 عرض جميع الشركاء (مسموح للمدير فقط)
router.get('/getAllPartners', getAllPartners);

// 🟢 عرض شريك واحد
router.get('/getPartner/:id', getPartnerById);

// 🔒 إنشاء شريك جديد
router.post('/createPartner', createPartner);

// 🔒 تعديل بيانات شريك
router.put('/updatePartner/:id', updatePartner);

// 🔒 حذف شريك
router.delete('/deletePartner/:id', deletePartner);

export default router;
