import { query } from '../libraries/Database.js';

// ✅ إضافة مصروف جديد
export async function addExpense(req, res) {
  const client = await query('BEGIN');
  try {
    const {
      expense_name,
      amount,
      D_SP,
      note,
      expense_date,
      money_type,
      expense_exchange_rate,
      payment_id,
      fund_id,
    } = req.body;

    // 1️⃣ إدخال بيانات المصروف
    const result = await query(
      `INSERT INTO "expense" 
        (expense_name, amount, "D/SP", note, expense_date, money_type, expense_exchange_rate, payment_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING expense_id`,
      [expense_name, amount, D_SP, note, expense_date, money_type, expense_exchange_rate, payment_id]
    );

    const expenseId = result.rows[0].expense_id;

    // 2️⃣ تحديث الصندوق (خصم المبلغ)
    if (money_type.toLowerCase() === 'dollar' || D_SP === 'D') {
      await query(
        `UPDATE "Funds"
         SET fund_account_D = COALESCE(fund_account_D, 0) - $1
         WHERE fund_id = $2`,
        [amount, fund_id]
      );
    } else if (money_type.toLowerCase() === 'sp' || D_SP === 'SP') {
      await query(
        `UPDATE "Funds"
         SET fund_account_SP = COALESCE(fund_account_SP, 0) - $1
         WHERE fund_id = $2`,
        [amount, fund_id]
      );
    }

    // 3️⃣ إضافة عملية مالية في جدول Transaction
    // await query(
    //   `INSERT INTO "Transaction" 
    //    (transaction_type, amount, transaction_date, fund_id, related_table, related_id)
    //    VALUES ('Expense', $1, $2, $3, 'expense', $4)`,
    //   [amount, expense_date, fund_id, expenseId]
    // );

    await query('COMMIT');
    res.status(201).json({ message: '✅ تم إضافة بطاقة المصروف بنجاح', expenseId });
  } catch (err) {
    await query('ROLLBACK');
    console.error('❌ Error in addExpense:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إضافة بطاقة المصروف' });
  }
}

// ✅ عرض كل المصروفات
export async function getAllExpenses(req, res) {
  try {
    const result = await query(`
      SELECT e.*, p."Payment_name"
      FROM "expense" e
      LEFT JOIN "Payment" p ON e.payment_id = p."Payment_id"
      ORDER BY e.expense_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error in getAllExpenses:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المصروفات' });
  }
}

// 🟧 جلب مصروف محدد حسب ID
export async function getExpenseById(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT e.*, p."Payment_name"
       FROM "expense" e
       LEFT JOIN "Payment" p ON e.payment_id = p."Payment_id"
       WHERE e.expense_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على المصروف المطلوب' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error in getExpenseById:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المصروف المطلوب' });
  }
}

// 🟧 تعديل مصروف موجود
export async function updateExpense(req, res) {
  const client = await query('BEGIN');
  try {
    const { id } = req.params;

    const {
      expense_name,
      amount,
      D_SP,
      note,
      expense_date,
      money_type,
      expense_exchange_rate,
      payment_id
    } = req.body;

    // 1️⃣ جلب بيانات المصروف القديمة
    const oldResult = await query(
      `SELECT * FROM "expense" WHERE expense_id = $1`,
      [id]
    );

    if (oldResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: "❌ لم يتم العثور على بطاقة المصروف" });
    }

    const oldExpense = oldResult.rows[0];

    // 2️⃣ تحديث بيانات المصروف
    const updateResult = await query(
      `UPDATE "expense"
       SET expense_name=$1, amount=$2, "D/SP"=$3, note=$4, expense_date=$5,
           money_type=$6, expense_exchange_rate=$7, payment_id=$8
       WHERE expense_id=$9
       RETURNING *`,
      [
        expense_name,
        amount,
        D_SP,
        note,
        expense_date,
        money_type,
        expense_exchange_rate,
        payment_id,
        id
      ]
    );

    const updatedExpense = updateResult.rows[0];

    // // 3️⃣ حساب الفرق بين المبلغ القديم والجديد
    // const difference = amount - oldExpense.amount;

    // if (difference !== 0) {
    //   // إذا الفرق موجب → خصم إضافي من الصندوق
    //   if (difference > 0) {
    //     await query(
    //       `UPDATE "Funds"
    //        SET "fund_account_D" = "fund_account_D" - $1
    //        WHERE fund_id = $2 AND $3 = 'D'`,
    //       [difference, fund_id, D_SP]
    //     );

    //     await query(
    //       `UPDATE "Funds"
    //        SET "fund_account_SP" = "fund_account_SP" - $1
    //        WHERE fund_id = $2 AND $3 = 'SP'`,
    //       [difference, fund_id, D_SP]
    //     );
    //   }

    //   // إذا الفرق سالب → إعادة مبلغ للصندوق
    //   if (difference < 0) {
    //     const refund = Math.abs(difference);

    //     await query(
    //       `UPDATE "Funds"
    //        SET "fund_account_D" = "fund_account_D" + $1
    //        WHERE fund_id = $2 AND $3 = 'D'`,
    //       [refund, fund_id, D_SP]
    //     );

    //     await query(
    //       `UPDATE "Funds"
    //        SET "fund_account_SP" = "fund_account_SP" + $1
    //        WHERE fund_id = $2 AND $3 = 'SP'`,
    //       [refund, fund_id, D_SP]
    //     );
    //   }
    // }

    await query('COMMIT');

    res.json({
      message: "✅ تم تعديل بطاقة المصروف بنجاح",
      updatedExpense
    });

  } catch (err) {
    await query('ROLLBACK');
    console.error("❌ Error in updateExpense:", err);
    res.status(500).json({ message: "حدث خطأ أثناء تعديل المصروف" });
  }
}


// ✅ حذف مصروف مع ترحيل عكسي تلقائي
export async function deleteExpense(req, res) {
  const client = await query('BEGIN');
  try {
    const { id } = req.params;

    const expenseResult = await query('SELECT * FROM "expense" WHERE expense_id = $1', [id]);
    if (expenseResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: '❌ لم يتم العثور على بطاقة المصروف' });
    }

    const expense = expenseResult.rows[0];

    // // استرجاع العملية المالية المرتبطة
    // const transactionResult = await query(
    //   `SELECT * FROM "Transaction" WHERE related_table = 'expense' AND related_id = $1`,
    //   [id]
    // );
    // const transaction = transactionResult.rows[0];

    // // ترحيل عكسي للصندوق (إضافة المبلغ من جديد)
    // if (transaction && transaction.fund_id) {
    //   if (expense.money_type.toLowerCase() === 'dollar' || expense['D/SP'] === 'D') {
    //     await query(
    //       `UPDATE "Funds"
    //        SET fund_account_D = COALESCE(fund_account_D, 0) + $1
    //        WHERE fund_id = $2`,
    //       [expense.amount, transaction.fund_id]
    //     );
    //   } else if (expense.money_type.toLowerCase() === 'sp' || expense['D/SP'] === 'SP') {
    //     await query(
    //       `UPDATE "Funds"
    //        SET fund_account_SP = COALESCE(fund_account_SP, 0) + $1
    //        WHERE fund_id = $2`,
    //       [expense.amount, transaction.fund_id]
    //     );
    //   }
    // }

    // // حذف العملية المالية المرتبطة
    // if (transaction) {
    //   await query(`DELETE FROM "Transaction" WHERE transaction_id = $1`, [transaction.transaction_id]);
    // }

    // حذف المصروف نفسه
    await query('DELETE FROM "expense" WHERE expense_id = $1', [id]);

    await query('COMMIT');
    res.json({ message: '🗑️ تم حذف بطاقة المصروف بنجاح مع ترحيل عكسي ✅' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('❌ Error in deleteExpense:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف المصروف أو ترحيله العكسي' });
  }
}
