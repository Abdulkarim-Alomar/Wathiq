import { query } from '../libraries/Database.js';

// 🟢 إنشاء صندوق جديد
export async function createFund(req, res) {
  try {
    const { fund_name, fund_account_number, fund_account_D, fund_account_SP, F_exchange_rate } = req.body;

    if (!fund_name) return res.status(400).json({ message: 'fund_name مطلوب' });

    const result = await query(
      `INSERT INTO "Funds" (fund_name, fund_account_number, "fund_account_D", "fund_account_SP", "F_exchange_rate")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING fund_id, fund_name, "fund_account_D", "fund_account_SP", "F_exchange_rate"`,
      [fund_name, fund_account_number, fund_account_D, fund_account_SP, F_exchange_rate]
    );

    res.status(201).json({
      message: 'تم إنشاء الصندوق المالي بنجاح ✅',
      fund: result.rows[0],
    });
  } catch (err) {
    console.error('Error in createFund:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الصندوق المالي' });
  }
}

// 🟢 عرض جميع الصناديق
export async function getAllFunds(req, res) {
  try {
    const result = await query('SELECT * FROM "Funds" ORDER BY fund_id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getAllFunds:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الصناديق' });
  }
}

// 🟢 عرض صندوق واحد حسب ID
export async function getFundById(req, res) {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM "Funds" WHERE fund_id = $1', [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'لم يتم العثور على الصندوق' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in getFundById:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الصندوق' });
  }
}

// 🟢 تعديل صندوق
export async function updateFund(req, res) {
  try {
    const { id } = req.params;
    const { fund_name, fund_account_number, fund_account_D, fund_account_SP, F_exchange_rate } = req.body;

    const result = await query(
      `UPDATE "Funds"
       SET fund_name=$1, fund_account_number=$2, "fund_account_D"=$3, "fund_account_SP"=$4, "F_exchange_rate"=$5
       WHERE fund_id=$6
       RETURNING *`,
      [fund_name, fund_account_number, fund_account_D, fund_account_SP, F_exchange_rate, id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'لم يتم العثور على الصندوق لتحديثه' });

    res.json({ message: 'تم تحديث الصندوق بنجاح ✅', fund: result.rows[0] });
  } catch (err) {
    console.error('Error in updateFund:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء التحديث' });
  }
}

// 🟢 حذف صندوق
export async function deleteFund(req, res) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM "Funds" WHERE fund_id = $1 RETURNING *', [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'لم يتم العثور على الصندوق لحذفه' });

    res.json({ message: 'تم حذف الصندوق بنجاح 🗑️' });
  } catch (err) {
    console.error('Error in deleteFund:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الصندوق' });
  }
}
