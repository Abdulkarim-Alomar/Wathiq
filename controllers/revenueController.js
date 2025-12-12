// 🟩 إنشاء بطاقة إيرادات جديدة
import { query } from '../libraries/Database.js';

//إنشاء بطاقة ايراد
export async function createRevenue(req, res) {
  const client = await query('BEGIN'); // بدء معاملة (Transaction)
  try {
    const {
      Revenue_name,
      Revenue_amount,
      D_SP,
      note,
      Revenue_date,
      money_type,
      Revenue_exchange_rate,
      income_id,
      // fund_id // الصندوق الذي سيدخل إليه الإيراد
    } = req.body;

    if (!Revenue_name || !Revenue_amount || !money_type || !income_id ) {
      await query('ROLLBACK');
      return res.status(400).json({ message: 'الحقول المطلوبة ناقصة!' });
    }

    // 🟢 1. إدخال الإيراد في جدول Revenue
    const revenueResult = await query(
      `INSERT INTO "Revenue" 
      ("Revenue_name", "Revenue_amount", "D/SP", note, "Revenue_date", money_type, "Revenue_exchange_rate", income_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        Revenue_name,
        Revenue_amount,
        D_SP,
        note,
        Revenue_date || new Date(),
        money_type,
        Revenue_exchange_rate,
        income_id
      ]
    );

    const newRevenue = revenueResult.rows[0];

    // // 🟣 2. إنشاء سجل في جدول Transaction
    // await query(
    //   `INSERT INTO "Transaction"
    //    (transaction_type, amount, money_type, exchange_rate, transaction_date, note, fund_id, related_table, related_id)
    //    VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8)`,
    //   [
    //     'Revenue',
    //     Revenue_amount,
    //     money_type,
    //     Revenue_exchange_rate,
    //     note || `ترحيل الإيراد: ${Revenue_name}`,
    //     fund_id,
    //     'Revenue',
    //     newRevenue.revenue_id
    //   ]
    // );

    // // 🔵 3. تحديث رصيد الصندوق حسب نوع العملة
    // if (money_type.toLowerCase() === 'dollar' || D_SP === 'D') {
    //   await query(
    //     `UPDATE "Funds"
    //      SET fund_account_D = COALESCE(fund_account_D, 0) + $1
    //      WHERE fund_id = $2`,
    //     [Revenue_amount, fund_id]
    //   );
    // } else if (money_type.toLowerCase() === 'sp' || D_SP === 'SP') {
    //   await query(
    //     `UPDATE "Funds"
    //      SET fund_account_SP = COALESCE(fund_account_SP, 0) + $1
    //      WHERE fund_id = $2`,
    //     [Revenue_amount, fund_id]
    //   );
    // }

    await query('COMMIT');

    res.status(201).json({
      message: '✅ تم إنشاء بطاقة الإيراد وترحيلها إلى الصندوق بنجاح',
      revenue: newRevenue
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('❌ Error in createRevenue with Auto Posting:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الإيراد أو ترحيله' });
  }
}

// 🟨 عرض جميع الإيرادات
export async function getAllRevenues(req, res) {
  try {
    const result = await query(`
      SELECT r.*, i.income_name
      FROM "Revenue" r
      JOIN "income" i ON r.income_id = i.income_id
      ORDER BY r."Revenue_date"
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getAllRevenues:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الإيرادات' });
  }
}

// 🟦 عرض بطاقة إيراد واحدة
export async function getRevenueById(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT r.*, i.income_name 
       FROM "Revenue" r
       JOIN "income" i ON r.income_id = i.income_id
       WHERE r."Revenue_id" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على بطاقة الإيراد' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in getRevenueById:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات الإيراد' });
  }
}

// 🟧 تعديل بطاقة الإيرادات
export async function updateRevenue(req, res) {
  try {
    const { id } = req.params;
    const {
      Revenue_name,
      Revenue_amount,
      D_SP,
      note,
      Revenue_date,
      money_type,
      Revenue_exchange_rate,
      income_id
    } = req.body;

    const result = await query(
      `UPDATE "Revenue"
       SET "Revenue_name"=$1, "Revenue_amount"=$2, "D/SP"=$3, note=$4, "Revenue_date"=$5, 
           money_type=$6, "Revenue_exchange_rate"=$7, income_id=$8
       WHERE "Revenue_id"=$9
       RETURNING *`,
      [
        Revenue_name,
        Revenue_amount,
        D_SP,
        note,
        Revenue_date,
        money_type,
        Revenue_exchange_rate,
        income_id,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على الإيراد لتحديثه' });
    }

    res.json({
      message: 'تم تحديث بطاقة الإيرادات بنجاح ✅',
      revenue: result.rows[0]
    });
  } catch (err) {
    console.error('Error in updateRevenue:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث الإيراد' });
  }
}

// 🟥 حذف بطاقة الإيرادات مع ترحيل عكسي تلقائي
export async function deleteRevenue(req, res) {
  const client = await query('BEGIN'); // نبدأ معاملة آمنة
  try {
    const { id } = req.params;

    // 1️⃣ جلب بيانات الإيراد قبل حذفه
    const revenueResult = await query('SELECT * FROM "Revenue" WHERE "Revenue_id" = $1', [id]);
    if (revenueResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'لم يتم العثور على بطاقة الإيراد لحذفها' });
    }

    const revenue = revenueResult.rows[0];

    // // 2️⃣ جلب العملية المالية المرتبطة (إن وجدت)
    // const transactionResult = await query(
    //   `SELECT * FROM "Transaction" 
    //    WHERE related_table = 'Revenue' AND related_id = $1`,
    //   [id]
    // );

    // const transaction = transactionResult.rows[0];

    // // 3️⃣ تحديث رصيد الصندوق (خصم المبلغ)
    // if (transaction && transaction.fund_id) {
    //   if (revenue.money_type.toLowerCase() === 'dollar' || revenue['D/SP'] === 'D') {
    //     await query(
    //       `UPDATE "Funds"
    //        SET fund_account_D = COALESCE(fund_account_D, 0) - $1
    //        WHERE fund_id = $2`,
    //       [revenue.revenue_amount, transaction.fund_id]
    //     );
    //   } else if (revenue.money_type.toLowerCase() === 'sp' || revenue['D/SP'] === 'SP') {
    //     await query(
    //       `UPDATE "Funds"
    //        SET fund_account_SP = COALESCE(fund_account_SP, 0) - $1
    //        WHERE fund_id = $2`,
    //       [revenue.revenue_amount, transaction.fund_id]
    //     );
    //   }
    // }

    // // 4️⃣ حذف العملية المالية المرتبطة (إن وجدت)
    // if (transaction) {
    //   await query(`DELETE FROM "Transaction" WHERE transaction_id = $1`, [transaction.transaction_id]);
    // }

    // 5️⃣ حذف الإيراد نفسه
    await query('DELETE FROM "Revenue" WHERE "Revenue_id" = $1', [id]);

    await query('COMMIT');
    res.json({ message: '🗑️ تم حذف بطاقة الإيراد بنجاح وتم تحديث الصندوق تلقائيًا ✅' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('❌ Error in deleteRevenue with Auto Rollback:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الإيراد أو ترحيله العكسي' });
  }
}

