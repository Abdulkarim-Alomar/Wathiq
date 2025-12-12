import { query } from '../libraries/Database.js';
import bcrypt from 'bcrypt';

// Regex للتحقق من البريد
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// التحقق من قوة كلمة المرور
function validatePassword(password) {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; 
  return regex.test(password);
}
// 🟩 إنشاء شريك جديد
export async function createPartner(req, res) {
  try {
    const {
      Partner_name,
      Partner_email,
      Partner_password,
      Partner_address,
      Partner_phone,
      share_percentage,
      Partner_account_D,
      Partner_account_SP,
      Partner_exchange_rate,
    } = req.body;

    // 1️⃣ التحقق من البريد
    if (!emailRegex.test(Partner_email)) {
      return res.status(400).json({ message: 'البريد الإلكتروني غير صالح' });
    }

    // 2️⃣ التأكد ان البريد غير مسجل
    const existing = await query('SELECT * FROM "Partner" WHERE "Partner_email"=$1', [Partner_email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // 3️⃣ التحقق من قوة كلمة المرور
    if (!validatePassword(Partner_password)) {
      return res.status(400).json({
        message: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل وتشمل حرف كبير وصغير ورقم'
      });
    }

    if (!Partner_name || !Partner_email || !Partner_password) {
      return res.status(400).json({ message: 'الحقول المطلوبة: الاسم، البريد الإلكتروني، كلمة المرور' });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(Partner_password, 10);

    const result = await query(
      `INSERT INTO "Partner" 
      ("Partner_name", "Partner_email", "Partner_password", "Partner_address", "Partner_phone", share_percentage, "Partner_account_D", "Partner_account_SP", "Partner_exchange_rate")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING "Partner_id", "Partner_name", "Partner_email", share_percentage`,
      [
        Partner_name,
        Partner_email,
        hashedPassword,
        Partner_address,
        Partner_phone,
        share_percentage,
        Partner_account_D,
        Partner_account_SP,
        Partner_exchange_rate,
      ]
    );

    res.status(201).json({
      message: '✅ تم إضافة الشريك بنجاح',
      partner: result.rows[0],
    });
  } catch (err) {
    console.error('Error in createPartner:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إضافة الشريك' });
  }
}

// 🟨 عرض جميع الشركاء
export async function getAllPartners(req, res) {
  try {
    const result = await query('SELECT * FROM "Partner" ORDER BY "Partner_id" ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getAllPartners:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب قائمة الشركاء' });
  }
}

// 🟦 عرض شريك واحد
export async function getPartnerById(req, res) {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM "Partner" WHERE "Partner_id" = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الشريك غير موجود' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in getPartnerById:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات الشريك' });
  }
}

// 🟧 تعديل بيانات شريك
export async function updatePartner(req, res) {
  try {
    const { id } = req.params;
    const {
      Partner_name,
      Partner_email,
      Partner_password,
      Partner_address,
      Partner_phone,
      share_percentage,
      Partner_account_D,
      Partner_account_SP,
      Partner_exchange_rate,
    } = req.body;

     // 1️⃣ التحقق من البريد
    if (!emailRegex.test(Partner_email)) {
      return res.status(400).json({ message: 'البريد الإلكتروني غير صالح' });
    }

    // 3️⃣ التحقق من قوة كلمة المرور
    if (!validatePassword(Partner_password)) {
      return res.status(400).json({
        message: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل وتشمل حرف كبير وصغير ورقم'
      });
    }
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(Partner_password, 10);

    const result = await query(
      `UPDATE "Partner"
       SET "Partner_name"=$1, "Partner_email"=$2, "Partner_password"=$3, "Partner_address"=$4, "Partner_phone"=$5,
           share_percentage=$6, "Partner_account_D"=$7, "Partner_account_SP"=$8, "Partner_exchange_rate"=$9
       WHERE "Partner_id"=$10
       RETURNING *`,
      [
        Partner_name,
        Partner_email,
        hashedPassword,
        Partner_address,
        Partner_phone,
        share_percentage,
        Partner_account_D,
        Partner_account_SP,
        Partner_exchange_rate,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على الشريك لتحديثه' });
    }

    res.json({
      message: 'تم تعديل بيانات الشريك بنجاح ✅',
      partner: result.rows[0],
    });
  } catch (err) {
    console.error('Error in updatePartner:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء تعديل الشريك' });
  }
}

// 🟥 حذف شريك
export async function deletePartner(req, res) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM "Partner" WHERE "Partner_id" = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الشريك غير موجود للحذف' });
    }

    res.json({ message: 'تم حذف الشريك بنجاح 🗑️' });
  } catch (err) {
    console.error('Error in deletePartner:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الشريك' });
  }
}
