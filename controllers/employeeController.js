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

// 🟩 إنشاء موظف جديد
export async function createEmployee(req, res) {
  try {
    const {
      employee_name,
      employee_phone,
      employee_address,
      employee_email,
      employee_password,
      employee_salary_D,
      employee_salary_SP,
      employee_exchange_rate,
    } = req.body;

    // 1️⃣ التحقق من البريد
    if (!emailRegex.test(employee_email)) {
      return res.status(400).json({ message: 'البريد الإلكتروني غير صالح' });
    }

    if (!employee_name || !employee_email || !employee_password) {
      return res.status(400).json({ message: 'الحقول المطلوبة: الاسم، البريد الإلكتروني، كلمة المرور' });
    }

    // التحقق من وجود البريد مسبقًا
    const exists = await query('SELECT * FROM "employee" WHERE employee_email = $1', [employee_email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'هذا البريد مستخدم بالفعل!' });
    }

    // 3️⃣ التحقق من قوة كلمة المرور
    if (!validatePassword(employee_password)) {
      return res.status(400).json({
        message: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل وتشمل حرف كبير وصغير ورقم'
      });
    } 
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(employee_password, 10);

    const result = await query(
      `INSERT INTO "employee" 
      (employee_name, employee_phone, employee_address, employee_email, employee_password, "employee_salary_D", "employee_salary_SP", employee_exchange_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING employee_id, employee_name, employee_email, "employee_salary_D", "employee_salary_SP"`,
      [
        employee_name,
        employee_phone,
        employee_address,
        employee_email,
        hashedPassword,
        employee_salary_D,
        employee_salary_SP,
        employee_exchange_rate,
      ]
    );

    res.status(201).json({
      message: '✅ تم إضافة الموظف بنجاح',
      employee: result.rows[0],
    });
  } catch (err) {
    console.error('Error in createEmployee:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إضافة الموظف' });
  }
}

// 🟨 عرض جميع الموظفين
export async function getAllEmployees(req, res) {
  try {
    const result = await query('SELECT * FROM "employee" ORDER BY employee_id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getAllEmployees:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب قائمة الموظفين' });
  }
}

// 🟦 عرض موظف محدد
export async function getEmployeeById(req, res) {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM "employee" WHERE employee_id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على الموظف' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in getEmployeeById:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات الموظف' });
  }
}

// 🟧 تعديل بيانات موظف
export async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
    const {
      employee_name,
      employee_phone,
      employee_address,
      employee_email,
      employee_password,
      employee_salary_D,
      employee_salary_SP,
      employee_exchange_rate,
    } = req.body;

    // 1️⃣ التحقق من البريد
    if (!emailRegex.test(employee_email)) {
      return res.status(400).json({ message: 'البريد الإلكتروني غير صالح' });
    }

    // 3️⃣ التحقق من قوة كلمة المرور
    if (!validatePassword(employee_password)) {
      return res.status(400).json({
        message: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل وتشمل حرف كبير وصغير ورقم'
      });
    } 

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(employee_password, 10);

    const result = await query(
      `UPDATE "employee"
       SET employee_name=$1, employee_phone=$2, employee_address=$3, employee_email=$4,employee_password=$5,
           "employee_salary_D"=$6, "employee_salary_SP"=$7, employee_exchange_rate=$8
       WHERE employee_id=$9
       RETURNING *`,
      [
        employee_name,
        employee_phone,
        employee_address,
        employee_email,
        hashedPassword,
        employee_salary_D,
        employee_salary_SP,
        employee_exchange_rate,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على الموظف لتحديثه' });
    }

    res.json({
      message: 'تم تعديل بيانات الموظف بنجاح ✅',
      employee: result.rows[0],
    });
  } catch (err) {
    console.error('Error in updateEmployee:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء تعديل الموظف' });
  }
}

// 🟥 حذف موظف
export async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM "employee" WHERE employee_id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الموظف غير موجود للحذف' });
    }

    res.json({ message: 'تم حذف الموظف بنجاح 🗑️' });
  } catch (err) {
    console.error('Error in deleteEmployee:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الموظف' });
  }
}
