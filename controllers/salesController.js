import { query } from '../libraries/Database.js';

// ✅ إنشاء فاتورة مبيع جديدة مع الترحيل المالي
export async function addSalesInvoice(req, res) {
  const client = await query('BEGIN');
  try {
    const {
      invoice_code,
      invoice_client_id,
      invoice_client_name,
      invoice_price_total_numeric,
      invoice_paid_amount_d,
      invoice_paid_amount_sp,
      invoice_exchange_rate,
      discount,
      note,
      invoice_date,
      money_type,
      invoice_tax,
      fund_id
    } = req.body;

    // 1️⃣ إدخال الفاتورة في جدول sales_invoice
    const result = await query(
      `INSERT INTO "sales_invoice" (
        invoice_code, invoce_clinet_id, invoice_client_name,
        invoice_price_total_numeric, invoice_paid_amount_d,
        invoice_paid_amount_sp, invoice_exchange_rate,
        discount, note, invoice_date, money_type, invoice_tax
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING sales_invoice_id`,
      [
        invoice_code,
        invoice_client_id,
        invoice_client_name,
        invoice_price_total_numeric,
        invoice_paid_amount_d,
        invoice_paid_amount_sp,
        invoice_exchange_rate,
        discount,
        note,
        invoice_date,
        money_type,
        invoice_tax
      ]
    );

    const invoiceId = result.rows[0].sales_invoice_id;

    // 2️⃣ جلب بيانات العميل قبل العملية
    const clientData = await query(`SELECT * FROM "Client" WHERE client_id = $1`, [invoice_client_id]);
    if (clientData.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: '❌ لم يتم العثور على العميل المحدد' });
    }

    const clientInfo = clientData.rows[0];
    const beforeAccount =
      money_type.toLowerCase() === 'dollar'
        ? clientInfo.client_account_d
        : clientInfo.client_account_sp;

    // 3️⃣ تحديث رصيد العميل بعد البيع (العميل أصبح مدين)
    if (money_type.toLowerCase() === 'dollar') {
      await query(
        `UPDATE "Client" 
         SET client_account_d = COALESCE(client_account_d, 0) - $1
         WHERE client_id = $2`,
        [invoice_price_total_numeric - (invoice_paid_amount_d || 0), invoice_client_id]
      );
    } else {
      await query(
        `UPDATE "Client" 
         SET client_account_sp = COALESCE(client_account_sp, 0) - $1
         WHERE client_id = $2`,
        [invoice_price_total_numeric - (invoice_paid_amount_sp || 0), invoice_client_id]
      );
    }

    // 4️⃣ تسجيل العملية في جدول client_arrangement
    const afterAccountResult = await query(`SELECT * FROM "Client" WHERE client_id = $1`, [invoice_client_id]);
    const afterInfo = afterAccountResult.rows[0];
    const afterAccount =
      money_type.toLowerCase() === 'dollar'
        ? afterInfo.client_account_d
        : afterInfo.client_account_sp;

    await query(
      `INSERT INTO "Client_arragement" (
        Client_arranged_name, account_before_arrangement, account_difference,
        account_after_arrangement, Creditor_and_debtor, Client_arragement_date,
        note, money_type, client_id
      ) VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8)`,
      [
        invoice_client_name,
        beforeAccount,
        invoice_price_total_numeric,
        afterAccount,
        'Debtor', // العميل مدين للشركة
        note,
        money_type,
        invoice_client_id
      ]
    );

    // 5️⃣ ترحيل العملية إلى جدول Transaction
    await query(
      `INSERT INTO "Transaction" (
        transaction_type, amount, transaction_date, fund_id, related_table, related_id, note
      ) VALUES ('Sales Invoice', $1, NOW(), $2, 'sales_invoice', $3, $4)`,
      [invoice_paid_amount_d || invoice_paid_amount_sp, fund_id, invoiceId, note || 'عملية بيع']
    );

    // 6️⃣ تحديث الصندوق (إضافة المبلغ المدفوع)
    if (money_type.toLowerCase() === 'dollar') {
      await query(
        `UPDATE "Funds"
         SET fund_account_D = COALESCE(fund_account_D, 0) + $1
         WHERE fund_id = $2`,
        [invoice_paid_amount_d, fund_id]
      );
    } else {
      await query(
        `UPDATE "Funds"
         SET fund_account_SP = COALESCE(fund_account_SP, 0) + $1
         WHERE fund_id = $2`,
        [invoice_paid_amount_sp, fund_id]
      );
    }

    await query('COMMIT');
    res.status(201).json({
      message: '✅ تم إنشاء فاتورة المبيع وترحيلها ماليًا بنجاح',
      invoiceId
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('❌ Error in addSalesInvoice:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الفاتورة أو الترحيل المالي' });
  }
}

// ✅ عرض كل الفواتير
export async function getAllInvoices(req, res) {
  try {
    const result = await query(`
      SELECT s.*, c.client_name, c.client_email
      FROM "sales_invoice" s
      LEFT JOIN "Client" c ON s.invoce_clinet_id = c.client_id
      ORDER BY s.sales_invoice_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error in getAllInvoices:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الفواتير' });
  }
}

// 🗑️ حذف فاتورة مبيع مع ترحيل عكسي مالي
export async function deleteSalesInvoice(req, res) {
  const client = await query('BEGIN');
  try {
    const { id } = req.params;

    // 1️⃣ جلب بيانات الفاتورة قبل الحذف
    const invoiceResult = await query(`SELECT * FROM "sales_invoice" WHERE sales_invoice_id = $1`, [id]);
    if (invoiceResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: '❌ لم يتم العثور على الفاتورة المطلوبة' });
    }

    const invoice = invoiceResult.rows[0];
    const {
      invoce_clinet_id,
      invoice_client_name,
      invoice_price_total_numeric,
      invoice_paid_amount_d,
      invoice_paid_amount_sp,
      money_type
    } = invoice;

    // 2️⃣ جلب العملية المالية المرتبطة (Transaction)
    const transactionResult = await query(
      `SELECT * FROM "Transaction" WHERE related_table = 'sales_invoice' AND related_id = $1`,
      [id]
    );
    const transaction = transactionResult.rows[0];

    // 3️⃣ جلب بيانات العميل قبل التعديل
    const clientResult = await query(`SELECT * FROM "Client" WHERE client_id = $1`, [invoce_clinet_id]);
    if (clientResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: '❌ لم يتم العثور على العميل المرتبط بالفاتورة' });
    }
    const clientData = clientResult.rows[0];

    const accountBefore =
      money_type.toLowerCase() === 'dollar'
        ? clientData.client_account_d
        : clientData.client_account_sp;

    // 4️⃣ إعادة توازن حساب العميل (عكس العملية السابقة)
    if (money_type.toLowerCase() === 'dollar') {
      await query(
        `UPDATE "Client" 
         SET client_account_d = COALESCE(client_account_d, 0) + $1
         WHERE client_id = $2`,
        [invoice_price_total_numeric - (invoice_paid_amount_d || 0), invoce_clinet_id]
      );
    } else {
      await query(
        `UPDATE "Client" 
         SET client_account_sp = COALESCE(client_account_sp, 0) + $1
         WHERE client_id = $2`,
        [invoice_price_total_numeric - (invoice_paid_amount_sp || 0), invoce_clinet_id]
      );
    }

    // 5️⃣ جلب رصيد العميل بعد التعديل
    const afterResult = await query(`SELECT * FROM "Client" WHERE client_id = $1`, [invoce_clinet_id]);
    const afterClient = afterResult.rows[0];
    const accountAfter =
      money_type.toLowerCase() === 'dollar'
        ? afterClient.client_account_d
        : afterClient.client_account_sp;

    // 6️⃣ تسجيل العملية في client_arrangement
    await query(
      `INSERT INTO "Client_arragement" (
        Client_arranged_name, account_before_arrangement, account_difference,
        account_after_arrangement, Creditor_and_debtor, Client_arragement_date,
        note, money_type, client_id
      ) VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8)`,
      [
        invoice_client_name,
        accountBefore,
        invoice_price_total_numeric,
        accountAfter,
        'Correction', // عملية تصحيح / حذف
        'حذف فاتورة مبيع - ترحيل عكسي',
        money_type,
        invoce_clinet_id
      ]
    );

    // 7️⃣ تعديل الصندوق (خصم المبلغ المستلم)
    if (transaction && transaction.fund_id) {
      if (money_type.toLowerCase() === 'dollar') {
        await query(
          `UPDATE "Funds"
           SET fund_account_D = COALESCE(fund_account_D, 0) - $1
           WHERE fund_id = $2`,
          [invoice_paid_amount_d, transaction.fund_id]
        );
      } else {
        await query(
          `UPDATE "Funds"
           SET fund_account_SP = COALESCE(fund_account_SP, 0) - $1
           WHERE fund_id = $2`,
          [invoice_paid_amount_sp, transaction.fund_id]
        );
      }
    }

    // 8️⃣ حذف العملية المالية من Transaction
    if (transaction) {
      await query(`DELETE FROM "Transaction" WHERE transaction_id = $1`, [transaction.transaction_id]);
    }

    // 9️⃣ حذف الفاتورة نفسها
    await query(`DELETE FROM "sales_invoice" WHERE sales_invoice_id = $1`, [id]);

    await query('COMMIT');
    res.json({ message: '🗑️ تم حذف فاتورة المبيع بنجاح وتم ترحيل العملية العكسية ✅' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('❌ Error in deleteSalesInvoice with rollback:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الفاتورة أو الترحيل العكسي' });
  }
}
