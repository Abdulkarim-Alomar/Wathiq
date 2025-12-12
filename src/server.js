import express from 'express';
import dotenv from 'dotenv';
import { testConnection } from '../libraries/Database.js';
import clientRoutes from '../routes/clientRoutes.js';
// import { cookieParserMiddleware, csrfProtection, csrfErrorHandler } from '../middleware/csrfMiddleware.js';
import fundRoutes from '../routes/fundRoutes.js';
import partnerRoutes from '../routes/partnerRoutes.js';
import employeeRoutes from '../routes/employeeRoutes.js';
import employeeAdjustmentsRoutes from '../routes/employeeAdjustmentsRoutes.js';
import revenueRoutes from '../routes/revenueRoutes.js';
import expenseRoutes from '../routes/expenseRoutes.js';
import productRoutes from '../routes/productRoutes.js';
import salesRoutes from '../routes/salesRoutes.js';
import buyInvoiceRoutes from '../routes/buyInvoiceRoutes.js';
import publicRoutes from '../routes/publicRoutes.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/public', publicRoutes);

app.use('/api/funds', fundRoutes);

app.use('/api/partners', partnerRoutes);

app.use('/api/employees', employeeRoutes);

app.use('/api/employee-adjustments', employeeAdjustmentsRoutes);

app.use('/api/revenues', revenueRoutes);

app.use('/api/expenses', expenseRoutes);

app.use('/api/products', productRoutes);

app.use('/api/sales', salesRoutes);

app.use('/api/buyInvoices', buyInvoiceRoutes);

// 1️⃣ كوكيز middleware يجب أن يكون أولاً
// app.use(cookieParserMiddleware);

// 2️⃣ مسار CSRF token (GET فقط) - يجب أن يكون قبل حماية كل المسارات الأخرى
// app.get('/api/csrf-token', csrfProtection, (req, res) => {
//   res.json({ csrfToken: req.csrfToken() });
// });

// 3️⃣ حماية كل POST/PUT/DELETE في مسارات العملاء
app.use('/api/client', clientRoutes);

// 4️⃣ Middleware لمعالجة أخطاء CSRF
// app.use(csrfErrorHandler);

// 5️⃣ تحقق من اتصال قاعدة البيانات قبل تشغيل السيرفر
(async () => {
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Cannot start server: Database connection failed.');
    process.exit(1);
  }

  // تشغيل السيرفر بعد التأكد من الاتصال
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
})();
