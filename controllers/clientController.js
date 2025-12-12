import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../libraries/Database.js';
import dotenv from 'dotenv';
dotenv.config();

// Regex للتحقق من البريد
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// التحقق من قوة كلمة المرور
function validatePassword(password) {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/; 
  return regex.test(password);
}

export async function registerClient(req, res) {
  try {
    const { name, phone, address, email, password, account_D, account_SP, exchange_rate } = req.body;

    // 1️⃣ التحقق من البريد
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'البريد الإلكتروني غير صالح' });
    }

    // 2️⃣ التأكد ان البريد غير مسجل
    const existing = await query('SELECT * FROM "Client" WHERE client_email=$1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // 3️⃣ التحقق من قوة كلمة المرور
    if (!validatePassword(password)) {
      return res.status(400).json({
        message: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل وتشمل حرف كبير وصغير ورقم'
      });
    }

    // 4️⃣ رفع الصورة
    let profile_img = null;
    if (req.file) {
      profile_img = req.file.filename; // اسم الصورة فقط
    }

    // 5️⃣ تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6️⃣ إدخال العميل في قاعدة البيانات
    const result = await query(
      `INSERT INTO "Client" (
        client_name, client_phone, client_address, client_email,
        client_password, profile_img, "client_account_D", "client_account_SP", exchange_rate
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING client_id, client_name, client_email, profile_img`,
      [
        name,
        phone,
        address,
        email,
        hashedPassword,
        profile_img,
        account_D,
        account_SP,
        exchange_rate
      ]
    );

    res.status(201).json({
      message: 'تم تسجيل العميل بنجاح',
      client: result.rows[0]
    });

  } catch (err) {
    console.error('Error in registerClient:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر' });
  }
}

// 🟢 تسجيل الدخول
export async function loginClient(req, res) {
  console.log(req.body);

  try {
    const { email, password } = req.body;

    const result = await query('SELECT * FROM "Client" WHERE client_email=$1', [email]);
    if (result.rows.length === 0)
      return res.status(400).json({ message: 'Invalid email or password' });

    const client = result.rows[0];
    const valid = await bcrypt.compare(password, client.client_password);
    if (!valid)
      return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { id: client.client_id, email: client.client_email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRES_IN || '1d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false, // غيّرها إلى true عند استخدام HTTPS
      sameSite: 'strict'
    });

    res.json({
      message: 'Login successful',
      client: {
        id: client.client_id,
        name: client.client_name,
        email: client.client_email,
      },
    });
  } catch (err) {
    console.error('Error in loginClient:', err);
    res.status(500).json({ message: 'Server Error' });
  }
}

// 🟢 تسجيل الخروج
export async function logoutClient(req, res) {
  try {
    res.clearCookie('auth_token');
    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Error in logoutClient:', err);
    res.status(500).json({ message: 'Server Error' });
  }
}
