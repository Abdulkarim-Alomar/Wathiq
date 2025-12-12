// libraries/Database.js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'asd789123',
  database: process.env.DB_NAME || 'Wathiq_bd',
  port: process.env.DB_PORT || 5432,
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

// ✅ دالة لاختبار الاتصال عند بدء التشغيل
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()'); // اختبار بسيط
    client.release();
    console.log('✅ Database connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

// يعيد الاتصال الكامل لاستخدام BEGIN / COMMIT
export async function getClient() {
  return pool.connect();
}
