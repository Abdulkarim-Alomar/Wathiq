import { query } from '../libraries/Database.js';

// 🟩 إضافة تعديل جديد (زيادة أو خصم)
export async function addAdjustment(req, res) {
  try {
    const {
      employee_id,
      adjustments_type, // "increase" أو "deduction"
      category, // مثل "علاوة إنتاج" أو "تأخير"
      adjustment_amount_D,
      adjustment_amount_SP,
      adjustment_exchange_rate,
      note
    } = req.body;

    if (!employee_id || !adjustments_type || (!adjustment_amount_D && !adjustment_amount_SP)) {
      return res.status(400).json({ message: 'البيانات المطلوبة ناقصة!' });
    }

    // ✅ إضافة التعديل في جدول employee_adjustments
    const result = await query(
      `INSERT INTO "employee_adjustments"
      (employee_id, adjustments_type, category, "adjustment_amount_D", "adjustment_amount_SP", adjustment_exchange_rate, adjustment_date, note)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7)
      RETURNING *`,
      [employee_id, adjustments_type, category, adjustment_amount_D, adjustment_amount_SP, adjustment_exchange_rate, note]
    );

    // ✅ تحديث راتب الموظف بناءً على نوع التعديل
    const adjustment = result.rows[0];

    if (adjustment) {
      if (adjustments_type === 'increase') {
        await query(
          `UPDATE "employee"
           SET "employee_salary_D" = COALESCE("employee_salary_D", 0) + COALESCE($1, 0),
               "employee_salary_SP" = COALESCE("employee_salary_SP", 0) + COALESCE($2, 0)
           WHERE employee_id = $3`,
          [adjustment_amount_D, adjustment_amount_SP, employee_id]
        );
      } else if (adjustments_type === 'deduction') {
        await query(
          `UPDATE "employee"
           SET "employee_salary_D" = COALESCE("employee_salary_D", 0) - COALESCE($1, 0),
               "employee_salary_SP" = COALESCE("employee_salary_SP", 0) - COALESCE($2, 0)
           WHERE employee_id = $3`,
          [adjustment_amount_D, adjustment_amount_SP, employee_id]
        );
      }
    }

    res.status(201).json({
      message: '✅ تم تسجيل التعديل بنجاح',
      adjustment: result.rows[0]
    });
  } catch (err) {
    console.error('Error in addAdjustment:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إضافة التعديل' });
  }
}

// 🟨 عرض جميع التعديلات
export async function getAllAdjustments(req, res) {
  try {
    const result = await query(`
      SELECT a.*, e.employee_name
      FROM "employee_adjustments" a
      JOIN "employee" e ON a.employee_id = e.employee_id
      ORDER BY a.employee_adjustment_id 
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getAllAdjustments:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب التعديلات' });
  }
}

// 🟦 عرض تعديلات موظف معين
export async function getAdjustmentsByEmployee(req, res) {
  try {
    const { employee_id } = req.params;
    const result = await query(
      `SELECT * FROM "employee_adjustments" WHERE employee_id = $1 ORDER BY adjustment_date DESC`,
      [employee_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getAdjustmentsByEmployee:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب التعديلات الخاصة بالموظف' });
  }
}

// 🟦 جلب تعديل معين حسب ID
export async function getAdjustmentById(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      `
      SELECT a.*, e.employee_name, e.employee_email
      FROM "employee_adjustments" a
      JOIN "employee" e ON a.employee_id = e.employee_id
      WHERE a.employee_adjustment_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على التعديل المطلوب' });
    }

    res.json({
      message: 'تم جلب بيانات التعديل بنجاح',
      adjustment: result.rows[0]
    });

  } catch (err) {
    console.error('Error in getAdjustmentById:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات التعديل' });
  }
}

// 🟧 تعديل تعديل سابق
export async function updateAdjustment(req, res) {
  try {
    const { id } = req.params;
    const { category, adjustment_amount_D, adjustment_amount_SP, note } = req.body;
    const result = await query(
      `UPDATE "employee_adjustments"
       SET category=$1, "adjustment_amount_D"=$2, "adjustment_amount_SP"=$3, note=$4
       WHERE employee_adjustment_id=$5
       RETURNING *`,
      [category, adjustment_amount_D, adjustment_amount_SP, note, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على التعديل لتحديثه' });
    }

    res.json({ message: 'تم تعديل التعديل بنجاح ✅', adjustment: result.rows[0] });
  } catch (err) {
    console.error('Error in updateAdjustment:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء تعديل التعديل' });
  }
}

// 🟥 حذف تعديل مع تحديث الراتب تلقائيًا
export async function deleteAdjustment(req, res) {
  const client = await query('BEGIN'); // نبدأ معاملة آمنة (Transaction)
  try {
    const { id } = req.params;

    // 1️⃣ جلب التعديل قبل حذفه
    const getAdjustment = await query(
      'SELECT * FROM "employee_adjustments" WHERE employee_adjustment_id = $1',
      [id]
    );

    if (getAdjustment.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'لم يتم العثور على التعديل لحذفه' });
    }

    const adj = getAdjustment.rows[0];

    // 2️⃣ حذف التعديل فعليًا
    await query('DELETE FROM "employee_adjustments" WHERE employee_adjustment_id = $1', [id]);

    // 3️⃣ تحديث راتب الموظف بناءً على نوع التعديل
    if (adj.adjustments_type === 'increase') {
      // إذا كانت زيادة وتم حذفها → نطرحها من الراتب
      await query(
        `UPDATE "employee"
         SET employee_salary_D = COALESCE(employee_salary_D, 0) - COALESCE($1, 0),
             employee_salary_SP = COALESCE(employee_salary_SP, 0) - COALESCE($2, 0)
         WHERE employee_id = $3`,
        [adj.adjustment_amount_D, adj.adjustment_amount_SP, adj.employee_id]
      );
    } else if (adj.adjustments_type === 'deduction') {
      // إذا كانت خصم وتم حذفها → نعيدها للراتب
      await query(
        `UPDATE "employee"
         SET employee_salary_D = COALESCE(employee_salary_D, 0) + COALESCE($1, 0),
             employee_salary_SP = COALESCE(employee_salary_SP, 0) + COALESCE($2, 0)
         WHERE employee_id = $3`,
        [adj.adjustment_amount_D, adj.adjustment_amount_SP, adj.employee_id]
      );
    }

    await query('COMMIT'); // حفظ التغييرات

    res.json({
      message: '🗑️ تم حذف التعديل بنجاح وتم تحديث راتب الموظف تلقائيًا ✅',
      deleted_adjustment: adj
    });
  } catch (err) {
    await query('ROLLBACK'); // في حال حدوث خطأ، نلغي العملية
    console.error('Error in deleteAdjustment with rollback:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف التعديل وتحديث الراتب' });
  }
}

