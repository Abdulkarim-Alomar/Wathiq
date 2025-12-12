import express from "express";
import {
  addBuyInvoice,
  getAllBuyInvoices,
  getBuyInvoiceById,
  updateBuyInvoice,
  deleteBuyInvoice
} from "../controllers/buyInvoiceController.js";

const router = express.Router();

// 🟢 إنشاء فاتورة شراء جديدة
router.post("/create", addBuyInvoice);

router.get('/getAllBuyInvoices', getAllBuyInvoices);

// 🔵 جلب فاتورة محددة عبر ID
router.get("/invoice/:id", getBuyInvoiceById);

// 🟡 تعديل فاتورة شراء
router.put("/update/:id", updateBuyInvoice);

// 🔴 حذف فاتورة شراء وترحيل عكسي
router.delete("/delete/:id", deleteBuyInvoice);

export default router;
